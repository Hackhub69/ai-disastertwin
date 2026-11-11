"""Tests for resource and alert endpoints."""


# ─── Resources ────────────────────────────────────────────────────────────────
def test_list_resources_empty(client):
    r = client.get("/api/resources")
    assert r.status_code == 200
    data = r.json()
    assert "items" in data
    assert data["total"] == 0


def test_create_resource(client):
    r = client.post("/api/resources", json={
        "name": "Test Ambulance",
        "resource_type": "ambulance",
        "latitude": 19.07,
        "longitude": 72.87,
        "capacity": 2,
    })
    assert r.status_code == 201
    data = r.json()
    assert data["name"] == "Test Ambulance"
    assert data["status"] == "available"


def test_create_resource_missing_fields(client):
    r = client.post("/api/resources", json={"name": "No Location"})
    assert r.status_code == 422


def test_get_resource_not_found(client):
    r = client.get("/api/resources/nonexistent")
    assert r.status_code == 404


def test_update_resource_status(client):
    create_r = client.post("/api/resources", json={
        "name": "Update Test Resource",
        "resource_type": "shelter",
        "latitude": 19.07, "longitude": 72.87, "capacity": 100,
    })
    res_id = create_r.json()["id"]
    r = client.patch(f"/api/resources/{res_id}", json={"status": "maintenance"})
    assert r.status_code == 200
    assert r.json()["status"] == "maintenance"


# ─── Alerts ───────────────────────────────────────────────────────────────────
def test_list_alerts_empty(client):
    r = client.get("/api/alerts")
    assert r.status_code == 200
    assert r.json()["total"] == 0


def test_create_alert_draft(client):
    # First create an incident
    inc_r = client.post("/api/incidents", json={
        "title": "Alert Test Incident",
        "description": "Incident for alert draft testing purposes",
        "incident_type": "flood",
        "latitude": 19.07, "longitude": 72.87, "severity": 3,
    })
    assert inc_r.status_code == 201
    inc_id = inc_r.json()["id"]

    # Create draft
    r = client.post("/api/alerts/draft", json={"incident_id": inc_id, "created_by": "test_operator"})
    assert r.status_code == 201
    data = r.json()
    assert data["status"] == "draft"
    assert len(data["content_en"]) > 10
    assert len(data["content_hi"]) > 10
    assert len(data["content_mr"]) > 10


def test_approve_alert(client):
    inc_r = client.post("/api/incidents", json={
        "title": "Approval Test",
        "description": "Testing alert approval workflow here",
        "incident_type": "fire",
        "latitude": 13.0, "longitude": 77.5, "severity": 4,
    })
    inc_id = inc_r.json()["id"]
    draft_r = client.post("/api/alerts/draft", json={"incident_id": inc_id, "created_by": "op1"})
    alert_id = draft_r.json()["id"]

    approve_r = client.post(f"/api/alerts/{alert_id}/approve", json={
        "decision": "approved",
        "decided_by": "senior_operator",
        "note": "Verified and approved",
    })
    assert approve_r.status_code == 200
    assert approve_r.json()["status"] == "approved"


def test_reject_alert(client):
    inc_r = client.post("/api/incidents", json={
        "title": "Rejection Test",
        "description": "Testing alert rejection workflow here",
        "incident_type": "heatwave",
        "latitude": 28.6, "longitude": 77.2, "severity": 3,
    })
    inc_id = inc_r.json()["id"]
    draft_r = client.post("/api/alerts/draft", json={"incident_id": inc_id})
    alert_id = draft_r.json()["id"]

    r = client.post(f"/api/alerts/{alert_id}/approve", json={
        "decision": "rejected",
        "decided_by": "operator",
        "note": "Needs revision",
    })
    assert r.status_code == 200
    assert r.json()["status"] == "rejected"
