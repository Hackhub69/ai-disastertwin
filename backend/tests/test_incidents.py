"""Tests for incident API endpoints."""


def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "healthy"


def test_create_incident_valid(client):
    r = client.post("/api/incidents", json={
        "title": "Test Flood Alert",
        "description": "Test flood description long enough here",
        "incident_type": "flood",
        "latitude": 19.07,
        "longitude": 72.87,
        "severity": 3,
    })
    assert r.status_code == 201
    data = r.json()
    assert data["title"] == "Test Flood Alert"
    assert "priority_level" in data
    assert data["priority_level"] in ("critical", "high", "medium", "low")
    assert data["is_demo"] is True


def test_create_incident_invalid_coordinates(client):
    r = client.post("/api/incidents", json={
        "title": "Bad Incident",
        "description": "Description long enough",
        "incident_type": "flood",
        "latitude": 999,
        "longitude": 72.87,
        "severity": 3,
    })
    assert r.status_code == 422


def test_create_incident_short_description(client):
    r = client.post("/api/incidents", json={
        "title": "Short Desc",
        "description": "Too short",
        "incident_type": "flood",
        "latitude": 19.07,
        "longitude": 72.87,
        "severity": 3,
    })
    assert r.status_code == 422


def test_list_incidents_empty(client):
    r = client.get("/api/incidents")
    assert r.status_code == 200
    data = r.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] == 0


def test_list_incidents_after_create(client):
    client.post("/api/incidents", json={
        "title": "Flood Test Incident",
        "description": "Test description with enough length",
        "incident_type": "flood",
        "latitude": 19.07,
        "longitude": 72.87,
        "severity": 3,
    })
    r = client.get("/api/incidents")
    assert r.status_code == 200
    assert r.json()["total"] >= 1


def test_get_incident_not_found(client):
    r = client.get("/api/incidents/nonexistent-id")
    assert r.status_code == 404


def test_get_incident_by_id(client):
    create_r = client.post("/api/incidents", json={
        "title": "Retrieve Me",
        "description": "Description long enough for test",
        "incident_type": "fire",
        "latitude": 12.97,
        "longitude": 77.59,
        "severity": 4,
    })
    assert create_r.status_code == 201
    inc_id = create_r.json()["id"]
    r = client.get(f"/api/incidents/{inc_id}")
    assert r.status_code == 200
    assert r.json()["id"] == inc_id


def test_update_incident_status(client):
    create_r = client.post("/api/incidents", json={
        "title": "Status Update Test",
        "description": "Testing status update endpoint",
        "incident_type": "other",
        "latitude": 19.07,
        "longitude": 72.87,
        "severity": 2,
    })
    inc_id = create_r.json()["id"]
    r = client.patch(f"/api/incidents/{inc_id}", json={"status": "resolved"})
    assert r.status_code == 200
    assert r.json()["status"] == "resolved"


def test_retriage_incident(client):
    create_r = client.post("/api/incidents", json={
        "title": "Retriage Test",
        "description": "Test retriage endpoint behaviour",
        "incident_type": "heatwave",
        "latitude": 28.61,
        "longitude": 77.20,
        "severity": 3,
    })
    inc_id = create_r.json()["id"]
    r = client.post(f"/api/incidents/{inc_id}/triage")
    assert r.status_code == 200
    data = r.json()
    assert "score" in data
    assert "priority_level" in data


def test_filter_incidents_by_type(client):
    client.post("/api/incidents", json={
        "title": "Flood Incident",
        "description": "Flood description here long enough",
        "incident_type": "flood",
        "latitude": 19.07, "longitude": 72.87, "severity": 3,
    })
    r = client.get("/api/incidents?incident_type=flood")
    assert r.status_code == 200
    for item in r.json()["items"]:
        assert item["incident_type"] == "flood"
