"""Tests for AI Agents A, B, C, D — all deterministic (no LLM required)."""
from datetime import datetime


class MockSettings:
    OPENAI_API_KEY = None
    OPENAI_MODEL = "gpt-4o-mini"
    openai_configured = False


S = MockSettings()


# ─── Agent A ──────────────────────────────────────────────────────────────────
class TestAgentA:
    def test_validate_valid_report(self):
        from app.agents.agent_a_alert_monitoring import AlertMonitoringAgent
        agent = AlertMonitoringAgent(S)
        data = {
            "title": "Flood Alert", "description": "Severe flooding in the area near the river",
            "latitude": 19.07, "longitude": 72.87, "incident_type": "flood", "severity": 4,
        }
        result = agent.validate_report(data)
        assert result["valid"] is True
        assert len(result["errors"]) == 0

    def test_validate_bad_latitude(self):
        from app.agents.agent_a_alert_monitoring import AlertMonitoringAgent
        agent = AlertMonitoringAgent(S)
        data = {
            "title": "Test", "description": "Test description long enough",
            "latitude": 200, "longitude": 72.87, "incident_type": "flood",
        }
        result = agent.validate_report(data)
        assert result["valid"] is False
        assert any("latitude" in e.lower() for e in result["errors"])

    def test_validate_short_description(self):
        from app.agents.agent_a_alert_monitoring import AlertMonitoringAgent
        agent = AlertMonitoringAgent(S)
        data = {
            "title": "Test", "description": "Short",
            "latitude": 19.07, "longitude": 72.87, "incident_type": "flood",
        }
        result = agent.validate_report(data)
        assert result["valid"] is False

    def test_validate_short_title(self):
        from app.agents.agent_a_alert_monitoring import AlertMonitoringAgent
        agent = AlertMonitoringAgent(S)
        data = {
            "title": "X", "description": "Long enough description for test",
            "latitude": 19.07, "longitude": 72.87,
        }
        result = agent.validate_report(data)
        assert result["valid"] is False

    def test_detect_duplicates_nearby(self):
        from app.agents.agent_a_alert_monitoring import AlertMonitoringAgent
        agent = AlertMonitoringAgent(S)
        new = {"latitude": 19.07, "longitude": 72.87, "incident_type": "flood"}
        existing = [{
            "id": "abc", "latitude": 19.071, "longitude": 72.871,
            "incident_type": "flood", "created_at": datetime.utcnow().isoformat(),
        }]
        dups = agent.detect_duplicates(new, existing, distance_km=1.0)
        assert len(dups) > 0
        assert dups[0]["incident_id"] == "abc"

    def test_no_duplicates_far_apart(self):
        from app.agents.agent_a_alert_monitoring import AlertMonitoringAgent
        agent = AlertMonitoringAgent(S)
        new = {"latitude": 19.07, "longitude": 72.87, "incident_type": "flood"}
        existing = [{
            "id": "abc", "latitude": 28.61, "longitude": 77.20,
            "incident_type": "flood", "created_at": datetime.utcnow().isoformat(),
        }]
        dups = agent.detect_duplicates(new, existing, distance_km=1.0)
        assert len(dups) == 0

    def test_summary_without_llm(self):
        from app.agents.agent_a_alert_monitoring import AlertMonitoringAgent
        agent = AlertMonitoringAgent(S)
        incident = {
            "incident_type": "flood", "severity": 4,
            "address": "Mumbai", "description": "Heavy flooding near the coast",
        }
        summary = agent.generate_summary(incident)
        assert len(summary) > 10

    def test_process_report_pipeline(self):
        from app.agents.agent_a_alert_monitoring import AlertMonitoringAgent
        agent = AlertMonitoringAgent(S)
        data = {
            "title": "Test Incident", "description": "Test description long enough here",
            "latitude": 19.07, "longitude": 72.87, "incident_type": "flood", "severity": 3,
        }
        result = agent.process_report(data, [])
        assert result["success"] is True
        assert "normalized_data" in result
        assert "summary" in result


# ─── Agent B ──────────────────────────────────────────────────────────────────
class TestAgentB:
    def test_flood_severity5_is_high_or_critical(self):
        from app.agents.agent_b_triage_risk import TriageRiskAgent
        agent = TriageRiskAgent(S)
        score, components = agent.calculate_priority_score("flood", 5)
        level = agent.get_priority_level(score)
        # flood base=50, sev5 multiplier=1.3 → 65.0 (high). With population it becomes critical.
        assert level in ("critical", "high"), f"Expected critical or high, got {level} (score={score})"

    def test_earthquake_severity5_is_critical(self):
        from app.agents.agent_b_triage_risk import TriageRiskAgent
        agent = TriageRiskAgent(S)
        score, components = agent.calculate_priority_score("earthquake", 5)
        level = agent.get_priority_level(score)
        # earthquake base=60, sev5=1.3 → 78.0 → critical
        assert level == "critical", f"Expected critical, got {level} (score={score})"

    def test_other_severity1_low_or_medium(self):
        from app.agents.agent_b_triage_risk import TriageRiskAgent
        agent = TriageRiskAgent(S)
        score, _ = agent.calculate_priority_score("other", 1)
        level = agent.get_priority_level(score)
        assert level in ("low", "medium")

    def test_population_increases_score(self):
        from app.agents.agent_b_triage_risk import TriageRiskAgent
        agent = TriageRiskAgent(S)
        s1, _ = agent.calculate_priority_score("flood", 3)
        s2, _ = agent.calculate_priority_score("flood", 3, affected_population=50000)
        assert s2 > s1

    def test_low_confidence_reduces_score(self):
        from app.agents.agent_b_triage_risk import TriageRiskAgent
        agent = TriageRiskAgent(S)
        sh, _ = agent.calculate_priority_score("flood", 4, data_confidence=1.0)
        sl, _ = agent.calculate_priority_score("flood", 4, data_confidence=0.1)
        assert sh > sl

    def test_score_in_range(self):
        from app.agents.agent_b_triage_risk import TriageRiskAgent
        agent = TriageRiskAgent(S)
        for itype in ["flood", "fire", "heatwave", "earthquake", "other"]:
            for sev in [1, 2, 3, 4, 5]:
                score, _ = agent.calculate_priority_score(itype, sev)
                assert 0 <= score <= 100

    def test_triage_returns_required_fields(self):
        from app.agents.agent_b_triage_risk import TriageRiskAgent
        agent = TriageRiskAgent(S)
        result = agent.triage({"incident_type": "heatwave", "severity": 4, "data_confidence": 0.9})
        for field in ("score", "priority_level", "components", "explanation", "method"):
            assert field in result

    def test_components_transparency(self):
        from app.agents.agent_b_triage_risk import TriageRiskAgent
        agent = TriageRiskAgent(S)
        _, components = agent.calculate_priority_score("earthquake", 4, affected_population=1000)
        assert "base_score" in components
        assert "severity_multiplier" in components
        assert "confidence_factor" in components

    def test_earthquake_higher_than_other_same_severity(self):
        from app.agents.agent_b_triage_risk import TriageRiskAgent
        agent = TriageRiskAgent(S)
        se, _ = agent.calculate_priority_score("earthquake", 3)
        so, _ = agent.calculate_priority_score("other", 3)
        assert se > so


# ─── Agent C ──────────────────────────────────────────────────────────────────
class TestAgentC:
    def test_fire_engine_suitability_for_fire(self):
        from app.agents.agent_c_dispatch_resource import DispatchResourceAgent
        agent = DispatchResourceAgent(S)
        assert agent.calculate_suitability("fire_engine", "fire") == 1.0

    def test_ambulance_suitability_for_flood(self):
        from app.agents.agent_c_dispatch_resource import DispatchResourceAgent
        agent = DispatchResourceAgent(S)
        assert agent.calculate_suitability("ambulance", "flood") > 0

    def test_filter_unavailable_resources(self):
        from app.agents.agent_c_dispatch_resource import DispatchResourceAgent
        agent = DispatchResourceAgent(S)
        incident = {"incident_type": "flood", "latitude": 19.07, "longitude": 72.87}
        resources = [
            {"id": "r1", "resource_type": "rescue_team", "status": "available",
             "latitude": 19.08, "longitude": 72.88, "capacity": 10, "current_load": 0, "name": "Team A"},
            {"id": "r2", "resource_type": "ambulance", "status": "deployed",
             "latitude": 19.06, "longitude": 72.86, "capacity": 2, "current_load": 2, "name": "Amb B"},
        ]
        candidates = agent.rank_candidates(incident, resources)
        assert all(r["resource"]["status"] == "available" for r in candidates)
        assert len(candidates) == 1

    def test_closer_resource_ranked_higher(self):
        from app.agents.agent_c_dispatch_resource import DispatchResourceAgent
        agent = DispatchResourceAgent(S)
        incident = {"incident_type": "flood", "latitude": 19.07, "longitude": 72.87}
        resources = [
            {"id": "r1", "resource_type": "rescue_team", "status": "available",
             "latitude": 19.075, "longitude": 72.875, "capacity": 10, "current_load": 0, "name": "Near"},
            {"id": "r2", "resource_type": "rescue_team", "status": "available",
             "latitude": 22.0, "longitude": 78.0, "capacity": 10, "current_load": 0, "name": "Far"},
        ]
        candidates = agent.rank_candidates(incident, resources)
        assert candidates[0]["resource"]["id"] == "r1"

    def test_capacity_score_full(self):
        from app.agents.agent_c_dispatch_resource import DispatchResourceAgent
        agent = DispatchResourceAgent(S)
        assert agent.calculate_capacity_score(10, 10) == 0.0

    def test_capacity_score_empty(self):
        from app.agents.agent_c_dispatch_resource import DispatchResourceAgent
        agent = DispatchResourceAgent(S)
        assert agent.calculate_capacity_score(10, 0) == 1.0


# ─── Agent D ──────────────────────────────────────────────────────────────────
class TestAgentD:
    def setup_method(self):
        from app.agents.agent_d_communication import CommunicationAgent
        self.agent = CommunicationAgent(S)
        self.incident = {
            "incident_type": "flood", "severity": 4, "address": "Mumbai",
            "description": "Heavy flooding reported near the coast", "data_confidence": 0.8,
        }

    def test_draft_has_all_languages(self):
        result = self.agent.draft_alert(self.incident)
        assert "en" in result
        assert "hi" in result
        assert "mr" in result

    def test_draft_stays_in_draft_status(self):
        result = self.agent.draft_alert(self.incident)
        assert result["status"] == "draft"

    def test_english_content_not_empty(self):
        result = self.agent.draft_alert(self.incident)
        assert len(result["en"]) > 20

    def test_hindi_content_not_empty(self):
        result = self.agent.draft_alert(self.incident)
        assert len(result["hi"]) > 20

    def test_marathi_content_not_empty(self):
        result = self.agent.draft_alert(self.incident)
        assert len(result["mr"]) > 20

    def test_fire_incident_draft(self):
        inc = {**self.incident, "incident_type": "fire", "severity": 5, "address": "Delhi"}
        result = self.agent.draft_alert(inc)
        assert result["status"] == "draft"
        assert len(result["en"]) > 20

    def test_heatwave_incident_draft(self):
        inc = {**self.incident, "incident_type": "heatwave", "severity": 3}
        result = self.agent.draft_alert(inc)
        assert result["status"] == "draft"

    def test_draft_includes_disclaimer(self):
        result = self.agent.draft_alert(self.incident)
        combined = result["en"] + result["hi"] + result["mr"]
        # At least one language should mention approval/draft
        assert any(w in combined.lower() for w in ["draft", "approval", "operator", "approved", "अनुमोदन", "मंजुरी"])
