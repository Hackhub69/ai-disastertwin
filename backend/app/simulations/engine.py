import uuid
import json
import math
import random
from datetime import datetime
from typing import List, Dict, Optional

from app.simulations.scenarios import SCENARIOS


class SimulationEngine:

    def __init__(self, seed: Optional[int] = None):
        self.rng = random.Random(seed)

    def _random_offset(self, center_lat: float, center_lon: float, radius_km: float):
        """Generate random lat/lon within radius_km of center."""
        r = radius_km / 111.0  # approx degrees per km
        angle = self.rng.uniform(0, 2 * math.pi)
        dist = self.rng.uniform(0, r)
        return center_lat + dist * math.cos(angle), center_lon + dist * math.sin(angle)

    def generate_incidents(
        self,
        scenario_type: str,
        intensity: float,
        num_locations: int,
        session_id: str,
    ) -> List[Dict]:
        """Generate synthetic incidents for a simulation session."""
        scenario = SCENARIOS.get(scenario_type, SCENARIOS["urban_flooding"])
        incidents = []

        severity_min, severity_max = scenario["severity_range"]
        # Scale severity range by intensity
        effective_max = min(5, int(severity_min + (severity_max - severity_min) * intensity))

        location_names = [
            "Sector A",
            "Downtown Area",
            "Industrial Zone",
            "Residential Block",
            "Market District",
            "Highway Junction",
            "University Campus",
            "Old Town",
            "Waterfront Area",
            "Hill Station",
            "Airport Vicinity",
            "Harbor Area",
            "Northern District",
            "Southern Zone",
            "Eastern Block",
            "Western Suburb",
        ]

        for i in range(num_locations):
            lat, lon = self._random_offset(
                scenario["center_lat"], scenario["center_lon"], scenario["radius_km"]
            )
            severity = self.rng.randint(severity_min, max(severity_min, effective_max))
            loc_name = location_names[i % len(location_names)]

            incident = {
                "id": str(uuid.uuid4()),
                "title": f"[SYNTHETIC] {scenario['name']} - {loc_name}",
                "description": (
                    f"Simulation scenario: {scenario['description']}. "
                    f"Location {loc_name} affected. Intensity: {intensity:.1f}/1.0. "
                    f"THIS IS DEMO/SYNTHETIC DATA."
                ),
                "incident_type": scenario["incident_type"],
                "latitude": round(lat, 6),
                "longitude": round(lon, 6),
                "address": f"{loc_name}, Simulation Area",
                "severity": severity,
                "status": "reported",
                "source_type": "simulation",
                "is_demo": True,
                "is_synthetic": True,
                "data_confidence": round(self.rng.uniform(0.6, 0.9), 2),
                "affected_population": (
                    self.rng.randint(50, 5000) if severity >= 3 else self.rng.randint(10, 500)
                ),
                "session_id": session_id,
                "created_at": datetime.utcnow().isoformat(),
            }
            incidents.append(incident)

        return incidents

    def run_step(self, incidents: List[Dict], step: int, scenario_type: str) -> Dict:
        """Simulate one time step: some incidents escalate, some resolve."""
        scenario = SCENARIOS.get(scenario_type, SCENARIOS["urban_flooding"])
        escalation_rate = scenario["escalation_rate"]

        events = []
        updated = []

        for incident in incidents:
            updated_incident = incident.copy()
            roll = self.rng.random()

            if roll < escalation_rate * 0.3 and incident["severity"] < 5:
                updated_incident["severity"] = incident["severity"] + 1
                events.append(
                    {
                        "type": "escalation",
                        "incident_id": incident["id"],
                        "description": (
                            f"Incident at {incident.get('address', 'unknown')} "
                            f"escalated to severity {updated_incident['severity']}"
                        ),
                    }
                )
            elif roll > 0.85 and incident["severity"] > 1 and step > 2:
                updated_incident["severity"] = incident["severity"] - 1
                events.append(
                    {
                        "type": "de-escalation",
                        "incident_id": incident["id"],
                        "description": (
                            f"Incident at {incident.get('address', 'unknown')} "
                            f"improved to severity {updated_incident['severity']}"
                        ),
                    }
                )

            updated.append(updated_incident)

        return {"incidents": updated, "events": events, "step": step}

    def get_summary(self, incidents: List[Dict]) -> Dict:
        """Summarize current simulation state."""
        by_severity: Dict[str, int] = {}
        for inc in incidents:
            s = str(inc.get("severity", 0))
            by_severity[s] = by_severity.get(s, 0) + 1

        return {
            "total_incidents": len(incidents),
            "by_severity": by_severity,
            "critical_count": sum(1 for i in incidents if i.get("severity", 0) >= 4),
            "average_severity": round(
                sum(i.get("severity", 0) for i in incidents) / max(len(incidents), 1), 2
            ),
        }
