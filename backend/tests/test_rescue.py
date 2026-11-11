"""Tests for the Rescue Response system."""
import json
import uuid as _uuid
import pytest
from app.models.incidents import Incident
from app.models.rescue import (
    RescueTeam, RescueAssignment, ResponsePlan, ChecklistItem, TeamMessage,
)


# ─── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture()
def incident(db):
    """Create a demo flood incident for tests."""
    from app.agents.agent_b_triage_risk import TriageRiskAgent
    from app.core.config import settings
    from datetime import datetime
    agent_b = TriageRiskAgent(settings)
    inc_data = {
        "incident_type": "flood",
        "severity": 4,
        "affected_population": 5000,
        "data_confidence": 0.85,
    }
    triage = agent_b.triage(inc_data)
    inc = Incident(
        id=str(_uuid.uuid4()),
        title="[TEST] Flood Test Incident",
        description="Test flood incident for rescue tests.",
        incident_type="flood",
        latitude=19.1363,
        longitude=72.8296,
        address="Test Location, Mumbai",
        severity=4,
        priority_score=triage["score"],
        priority_level=triage["priority_level"],
        status="triaged",
        source_type="manual",
        is_demo=True,
        is_synthetic=True,
        data_confidence=0.85,
        affected_population=5000,
    )
    db.add(inc)
    db.commit()
    db.refresh(inc)
    yield inc
    db.delete(inc)
    db.commit()


@pytest.fixture(autouse=True)
def cleanup_rescue(db):
    """Clean rescue data before/after each test."""
    db.query(TeamMessage).delete()
    db.query(ChecklistItem).delete()
    db.query(RescueAssignment).delete()
    db.query(ResponsePlan).delete()
    db.query(RescueTeam).delete()
    db.commit()
    yield
    db.query(TeamMessage).delete()
    db.query(ChecklistItem).delete()
    db.query(RescueAssignment).delete()
    db.query(ResponsePlan).delete()
    db.query(RescueTeam).delete()
    db.commit()


def make_team(db, **kwargs) -> RescueTeam:
    team = RescueTeam(
        id=str(_uuid.uuid4()),
        name=kwargs.get("name", "Test Team"),
        team_code=kwargs.get("team_code", f"TST-{_uuid.uuid4().hex[:4].upper()}"),
        team_leader="Test Leader",
        responder_count=5,
        skills=json.dumps(["first_aid"]),
        equipment=json.dumps(["radio"]),
        specialty=kwargs.get("specialty", "general"),
        status=kwargs.get("status", "available"),
        is_demo=True,
    )
    db.add(team)
    db.commit()
    db.refresh(team)
    return team


# ─── Agent Unit Tests ─────────────────────────────────────────────────────────

class TestRescueResponseAgent:
    def test_flood_plan_generation(self):
        from app.agents.rescue_response_agent import RescueResponseAgent
        agent = RescueResponseAgent()
        plan = agent.generate_response_plan({
            "id": "t1", "incident_type": "flood", "severity": 4,
            "priority_level": "high", "address": "Mumbai", "description": "Flooding",
            "affected_population": 1000,
        })
        assert plan["recommended_team_type"] == "water_rescue"
        assert "water_rescue" in json.loads(plan["required_skills"])
        checklist = json.loads(plan["action_checklist"])
        assert len(checklist) > 0
        assert any(s.get("requires_approval") for s in checklist)

    def test_heatwave_plan_generation(self):
        from app.agents.rescue_response_agent import RescueResponseAgent
        agent = RescueResponseAgent()
        plan = agent.generate_response_plan({
            "id": "t2", "incident_type": "heatwave", "severity": 5,
            "priority_level": "critical", "address": "Delhi", "description": "Heat",
        })
        assert plan["recommended_team_type"] == "medical_first_response"

    def test_fire_plan_generation(self):
        from app.agents.rescue_response_agent import RescueResponseAgent
        agent = RescueResponseAgent()
        plan = agent.generate_response_plan({
            "id": "t3", "incident_type": "fire", "severity": 4,
            "priority_level": "high", "address": "Bangalore", "description": "Fire",
        })
        assert plan["recommended_team_type"] == "fire_thermal"
        assert "fire" in json.loads(plan["external_services_needed"])

    def test_earthquake_plan_generation(self):
        from app.agents.rescue_response_agent import RescueResponseAgent
        agent = RescueResponseAgent()
        plan = agent.generate_response_plan({
            "id": "t4", "incident_type": "earthquake", "severity": 4,
            "priority_level": "high", "address": "Ahmedabad", "description": "Tremors",
        })
        assert plan["recommended_team_type"] == "search_rescue"

    def test_unknown_type_uses_default(self):
        from app.agents.rescue_response_agent import RescueResponseAgent
        agent = RescueResponseAgent()
        plan = agent.generate_response_plan({
            "id": "t5", "incident_type": "unknown_xyz", "severity": 2,
            "priority_level": "low", "address": "X", "description": "Unknown",
        })
        assert plan["recommended_team_type"] == "general"

    def test_message_generation_multilingual(self):
        from app.agents.rescue_response_agent import RescueResponseAgent
        agent = RescueResponseAgent()
        msgs = agent.generate_message(
            "briefing",
            {"id": "m1", "incident_type": "flood", "severity": 3,
             "priority_level": "medium", "address": "Mumbai", "description": "Flooding"},
            team={"name": "Team A", "team_leader": "Leader A"},
        )
        assert "en" in msgs and "hi" in msgs and "mr" in msgs
        assert len(msgs["en"]) > 20
        assert "DEMO" in msgs["en"]

    def test_all_incident_types_have_approval_step(self):
        from app.agents.rescue_response_agent import RescueResponseAgent
        agent = RescueResponseAgent()
        for itype in ["flood", "heatwave", "fire", "medical", "missing_person", "earthquake"]:
            items = agent.get_checklist_items(itype)
            assert len(items) >= 5, f"{itype}: expected >= 5 checklist items"
            assert any(i.get("requires_approval") for i in items), \
                f"{itype}: must have an approval step"

    def test_flood_aliases(self):
        from app.agents.rescue_response_agent import RescueResponseAgent
        agent = RescueResponseAgent()
        for alias in ["urban_flooding", "coastal_flooding"]:
            tmpl = agent.get_template(alias)
            assert tmpl["recommended_team_type"] == "water_rescue"


# ─── Team API Tests ───────────────────────────────────────────────────────────

class TestTeamAPI:
    def test_create_team(self, client):
        resp = client.post("/api/rescue/teams", json={
            "name": "API Test Team", "team_code": "ATT-01",
            "team_leader": "Leader X", "responder_count": 4,
            "skills": ["first_aid"], "specialty": "general", "is_demo": True,
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "API Test Team"
        assert data["status"] == "available"
        assert data["skills"] == ["first_aid"]

    def test_list_teams(self, client, db):
        make_team(db, name="Team A")
        make_team(db, name="Team B")
        resp = client.get("/api/rescue/teams")
        assert resp.status_code == 200
        assert len(resp.json()) >= 2

    def test_list_teams_filter_by_status(self, client, db):
        make_team(db, name="Available", status="available")
        make_team(db, name="Deployed", status="deployed")
        resp = client.get("/api/rescue/teams?status=available")
        assert resp.status_code == 200
        assert all(t["status"] == "available" for t in resp.json())

    def test_update_team_status(self, client, db):
        team = make_team(db)
        resp = client.patch(f"/api/rescue/teams/{team.id}", json={"status": "standby", "notes": "On standby"})
        assert resp.status_code == 200
        assert resp.json()["status"] == "standby"

    def test_get_team_not_found(self, client):
        resp = client.get("/api/rescue/teams/nonexistent-id")
        assert resp.status_code == 404


# ─── Plan API Tests ───────────────────────────────────────────────────────────

class TestPlanAPI:
    def test_generate_plan(self, client, incident):
        resp = client.post("/api/rescue/plans", json={"incident_id": incident.id, "operator": "tester"})
        assert resp.status_code == 201
        data = resp.json()
        assert data["incident_id"] == incident.id
        assert data["approval_status"] == "draft"
        assert len(data["action_checklist"]) > 0

    def test_approve_plan(self, client, incident):
        plan_id = client.post("/api/rescue/plans", json={"incident_id": incident.id}).json()["id"]
        resp = client.patch(f"/api/rescue/plans/{plan_id}/approve", json={
            "action": "approve", "approved_by": "senior_op",
        })
        assert resp.status_code == 200
        assert resp.json()["approval_status"] == "approved"
        assert resp.json()["approved_by"] == "senior_op"

    def test_reject_plan(self, client, incident):
        plan_id = client.post("/api/rescue/plans", json={"incident_id": incident.id}).json()["id"]
        resp = client.patch(f"/api/rescue/plans/{plan_id}/approve", json={
            "action": "reject", "approved_by": "supervisor",
        })
        assert resp.status_code == 200
        assert resp.json()["approval_status"] == "rejected"

    def test_invalid_plan_action(self, client, incident):
        plan_id = client.post("/api/rescue/plans", json={"incident_id": incident.id}).json()["id"]
        resp = client.patch(f"/api/rescue/plans/{plan_id}/approve", json={
            "action": "deploy", "approved_by": "x",
        })
        assert resp.status_code == 400

    def test_plan_not_found(self, client):
        resp = client.get("/api/rescue/plans/nonexistent-plan")
        assert resp.status_code == 404

    def test_list_plans_by_incident(self, client, incident):
        client.post("/api/rescue/plans", json={"incident_id": incident.id})
        resp = client.get(f"/api/rescue/plans?incident_id={incident.id}")
        assert resp.status_code == 200
        assert len(resp.json()) >= 1


# ─── Assignment Workflow Tests ────────────────────────────────────────────────

class TestAssignmentWorkflow:
    def test_create_assignment_creates_checklist(self, client, incident, db):
        team = make_team(db)
        resp = client.post("/api/rescue/assignments", json={
            "incident_id": incident.id, "team_id": team.id, "recommended_by": "op",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["status"] == "recommended"
        assert len(data["checklist"]) > 0
        assert len(data["timeline"]) > 0

    def test_approve_assignment(self, client, incident, db):
        team = make_team(db)
        a_id = client.post("/api/rescue/assignments", json={
            "incident_id": incident.id, "team_id": team.id,
        }).json()["id"]
        resp = client.post(f"/api/rescue/assignments/{a_id}/approve", json={
            "action": "approve", "approved_by": "commander",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "assigned"
        assert data["approved_by"] == "commander"

    def test_cannot_respond_without_approval(self, client, incident, db):
        team = make_team(db)
        a_id = client.post("/api/rescue/assignments", json={
            "incident_id": incident.id, "team_id": team.id,
        }).json()["id"]
        resp = client.patch(f"/api/rescue/assignments/{a_id}/status", json={
            "new_status": "responding", "updated_by": "rogue",
        })
        assert resp.status_code in (400, 403)

    def test_full_happy_path_workflow(self, client, incident, db):
        team = make_team(db)
        a = client.post("/api/rescue/assignments", json={
            "incident_id": incident.id, "team_id": team.id,
        }).json()
        a_id = a["id"]
        assert a["status"] == "recommended"
        # Approve
        a = client.post(f"/api/rescue/assignments/{a_id}/approve", json={
            "action": "approve", "approved_by": "cmd",
        }).json()
        assert a["status"] == "assigned"
        # Responding
        a = client.patch(f"/api/rescue/assignments/{a_id}/status", json={
            "new_status": "responding", "updated_by": "leader",
        }).json()
        assert a["status"] == "responding"
        # On scene
        a = client.patch(f"/api/rescue/assignments/{a_id}/status", json={
            "new_status": "on_scene", "updated_by": "leader",
        }).json()
        assert a["status"] == "on_scene"
        # Complete
        a = client.post(f"/api/rescue/assignments/{a_id}/complete", json={
            "people_assisted": 12, "outstanding_risks": "None", "completed_by": "leader",
        }).json()
        assert a["status"] == "completed"
        assert a["people_assisted"] == 12

    def test_reject_assignment(self, client, incident, db):
        team = make_team(db)
        a_id = client.post("/api/rescue/assignments", json={
            "incident_id": incident.id, "team_id": team.id,
        }).json()["id"]
        resp = client.post(f"/api/rescue/assignments/{a_id}/approve", json={
            "action": "reject", "approved_by": "supervisor", "rejection_reason": "Unavailable",
        })
        assert resp.status_code == 200
        assert resp.json()["status"] == "cancelled"

    def test_invalid_status_transition(self, client, incident, db):
        team = make_team(db)
        a = client.post("/api/rescue/assignments", json={
            "incident_id": incident.id, "team_id": team.id,
        }).json()
        # Approve first
        client.post(f"/api/rescue/assignments/{a['id']}/approve", json={
            "action": "approve", "approved_by": "cmd",
        })
        # Try invalid: assigned -> completed (must go through responding)
        resp = client.patch(f"/api/rescue/assignments/{a['id']}/status", json={
            "new_status": "completed", "updated_by": "op",
        })
        assert resp.status_code == 400

    def test_assignment_not_found(self, client):
        resp = client.get("/api/rescue/assignments/nonexistent")
        assert resp.status_code == 404


# ─── Checklist Tests ──────────────────────────────────────────────────────────

class TestChecklist:
    def test_mark_checklist_item_complete(self, client, incident, db):
        team = make_team(db)
        a = client.post("/api/rescue/assignments", json={
            "incident_id": incident.id, "team_id": team.id,
        }).json()
        item_id = a["checklist"][0]["id"]
        resp = client.patch(f"/api/rescue/checklist/{item_id}", json={
            "completed": True, "completed_by": "op", "notes": "Confirmed",
        })
        assert resp.status_code == 200
        assert resp.json()["completed"] is True
        assert resp.json()["notes"] == "Confirmed"

    def test_unmark_checklist_item(self, client, incident, db):
        team = make_team(db)
        a = client.post("/api/rescue/assignments", json={
            "incident_id": incident.id, "team_id": team.id,
        }).json()
        item_id = a["checklist"][0]["id"]
        client.patch(f"/api/rescue/checklist/{item_id}", json={"completed": True, "completed_by": "op"})
        resp = client.patch(f"/api/rescue/checklist/{item_id}", json={"completed": False, "completed_by": "op"})
        assert resp.status_code == 200
        assert resp.json()["completed"] is False
        assert resp.json()["completed_at"] is None


# ─── Message Tests ────────────────────────────────────────────────────────────

class TestMessages:
    def test_generate_briefing_message(self, client, incident, db):
        team = make_team(db)
        a = client.post("/api/rescue/assignments", json={
            "incident_id": incident.id, "team_id": team.id,
        }).json()
        resp = client.post("/api/rescue/messages", json={
            "message_type": "briefing", "assignment_id": a["id"], "created_by": "op",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["content_en"] is not None
        assert data["content_hi"] is not None
        assert data["content_mr"] is not None
        assert data["status"] == "draft"

    def test_generate_all_message_types(self, client, incident, db):
        team = make_team(db)
        a = client.post("/api/rescue/assignments", json={
            "incident_id": incident.id, "team_id": team.id,
        }).json()
        for mtype in ["briefing", "situation_update", "resource_request", "completion"]:
            resp = client.post("/api/rescue/messages", json={
                "message_type": mtype, "assignment_id": a["id"],
            })
            assert resp.status_code == 201, f"Failed for: {mtype}"

    def test_approve_message(self, client, incident, db):
        team = make_team(db)
        a = client.post("/api/rescue/assignments", json={
            "incident_id": incident.id, "team_id": team.id,
        }).json()
        msg = client.post("/api/rescue/messages", json={
            "message_type": "briefing", "assignment_id": a["id"],
        }).json()
        resp = client.post(f"/api/rescue/messages/{msg['id']}/approve", json={
            "action": "approve", "approved_by": "supervisor",
        })
        assert resp.status_code == 200
        assert resp.json()["status"] == "approved"

    def test_list_assignment_messages(self, client, incident, db):
        team = make_team(db)
        a = client.post("/api/rescue/assignments", json={
            "incident_id": incident.id, "team_id": team.id,
        }).json()
        client.post("/api/rescue/messages", json={"message_type": "briefing", "assignment_id": a["id"]})
        client.post("/api/rescue/messages", json={"message_type": "situation_update", "assignment_id": a["id"]})
        resp = client.get(f"/api/rescue/assignments/{a['id']}/messages")
        assert resp.status_code == 200
        assert len(resp.json()) == 2

    def test_invalid_message_approve_action(self, client, incident, db):
        team = make_team(db)
        a = client.post("/api/rescue/assignments", json={
            "incident_id": incident.id, "team_id": team.id,
        }).json()
        msg = client.post("/api/rescue/messages", json={
            "message_type": "briefing", "assignment_id": a["id"],
        }).json()
        resp = client.post(f"/api/rescue/messages/{msg['id']}/approve", json={
            "action": "transmit", "approved_by": "op",
        })
        assert resp.status_code == 400


# ─── Dashboard Tests ──────────────────────────────────────────────────────────

class TestRescueDashboard:
    def test_dashboard_returns_all_keys(self, client):
        resp = client.get("/api/rescue/dashboard")
        assert resp.status_code == 200
        data = resp.json()
        for key in ["active_plans", "teams_available", "teams_deployed",
                    "pending_approvals", "active_assignments", "pending_messages"]:
            assert key in data, f"Missing key: {key}"
        for k, v in data.items():
            assert isinstance(v, int) and v >= 0, f"{k}: expected non-negative int"

    def test_dashboard_counts_available_teams(self, client, db):
        make_team(db, name="T1", status="available")
        make_team(db, name="T2", status="available")
        make_team(db, name="T3", status="deployed")
        resp = client.get("/api/rescue/dashboard")
        data = resp.json()
        assert data["teams_available"] >= 2
        assert data["teams_deployed"] >= 1
