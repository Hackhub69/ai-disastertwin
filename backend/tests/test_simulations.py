"""Tests for simulation engine."""
from app.simulations.engine import SimulationEngine


def test_generate_correct_count():
    engine = SimulationEngine(seed=42)
    incidents = engine.generate_incidents("urban_flooding", 0.7, 5, "test-session")
    assert len(incidents) == 5


def test_all_synthetic_marked():
    engine = SimulationEngine(seed=42)
    incidents = engine.generate_incidents("heatwave", 0.5, 3, "test-session")
    assert all(i["is_synthetic"] is True for i in incidents)
    assert all(i["is_demo"] is True for i in incidents)
    assert all("[SYNTHETIC]" in i["title"] for i in incidents)


def test_severity_within_range():
    engine = SimulationEngine(seed=42)
    incidents = engine.generate_incidents("wildfire", 0.8, 10, "test-session")
    for inc in incidents:
        assert 1 <= inc["severity"] <= 5


def test_simulation_step():
    engine = SimulationEngine(seed=42)
    incidents = engine.generate_incidents("urban_flooding", 0.7, 5, "test-session")
    result = engine.run_step(incidents, step=1, scenario_type="urban_flooding")
    assert "incidents" in result
    assert len(result["incidents"]) == len(incidents)


def test_all_scenario_types():
    engine = SimulationEngine(seed=42)
    for scenario in ["urban_flooding", "heavy_rainfall", "heatwave", "wildfire"]:
        incidents = engine.generate_incidents(scenario, 0.5, 3, "test-session")
        assert len(incidents) == 3


def test_simulation_api(client):
    r = client.post("/api/simulations", json={
        "scenario_type": "urban_flooding",
        "intensity": 0.6,
        "num_locations": 3,
        "num_resources": 2,
    })
    assert r.status_code == 201
    data = r.json()
    assert "session_id" in data
    assert len(data["incidents"]) == 3
    assert all(i["is_synthetic"] for i in data["incidents"])
    assert "warning" in data


def test_simulation_invalid_scenario(client):
    r = client.post("/api/simulations", json={
        "scenario_type": "invalid_scenario",
        "intensity": 0.5,
        "num_locations": 3,
    })
    assert r.status_code == 422
