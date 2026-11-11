SCENARIOS = {
    "urban_flooding": {
        "name": "Urban Flooding",
        "incident_type": "flood",
        "description": "Rapid onset urban flooding due to drainage overflow",
        "center_lat": 19.076,
        "center_lon": 72.877,  # Mumbai
        "radius_km": 15,
        "severity_range": [3, 5],
        "escalation_rate": 0.3,
        "resource_types_needed": ["rescue_team", "ambulance", "shelter"],
    },
    "heavy_rainfall": {
        "name": "Heavy Rainfall",
        "incident_type": "flood",
        "description": "Sustained heavy rainfall causing widespread flooding",
        "center_lat": 12.971,
        "center_lon": 77.594,  # Bangalore
        "radius_km": 20,
        "severity_range": [2, 4],
        "escalation_rate": 0.2,
        "resource_types_needed": ["rescue_team", "shelter", "ambulance"],
    },
    "heatwave": {
        "name": "Heatwave Emergency",
        "incident_type": "heatwave",
        "description": "Extreme heat emergency with multiple heat exhaustion cases",
        "center_lat": 28.613,
        "center_lon": 77.209,  # Delhi
        "radius_km": 25,
        "severity_range": [2, 5],
        "escalation_rate": 0.15,
        "resource_types_needed": ["ambulance", "shelter", "medical_supply", "water_tanker"],
    },
    "wildfire": {
        "name": "Wildfire / Thermal Incident",
        "incident_type": "fire",
        "description": "Rapidly spreading wildfire threatening populated areas",
        "center_lat": 23.022,
        "center_lon": 72.571,  # Ahmedabad outskirts
        "radius_km": 10,
        "severity_range": [3, 5],
        "escalation_rate": 0.4,
        "resource_types_needed": ["fire_engine", "ambulance", "water_tanker"],
    },
}
