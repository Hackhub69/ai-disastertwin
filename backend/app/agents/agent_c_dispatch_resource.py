import math
from app.agents.base_agent import BaseAgent
from typing import List, Dict


class DispatchResourceAgent(BaseAgent):
    name = "DispatchResourceAgent"

    SUITABILITY_MAP: Dict[str, List[str]] = {
        "ambulance": ["flood", "earthquake", "fire", "other"],
        "rescue_team": ["flood", "earthquake", "other"],
        "shelter": ["flood", "heatwave", "earthquake", "other"],
        "fire_engine": ["fire"],
        "water_tanker": ["fire", "heatwave"],
        "helicopter": ["flood", "earthquake", "fire", "other"],
        "medical_supply": ["all"],
    }

    def calculate_suitability(self, resource_type: str, incident_type: str) -> float:
        """Returns suitability score 0.0 to 1.0."""
        compatible = self.SUITABILITY_MAP.get(resource_type, [])
        if "all" in compatible:
            return 0.9  # universally useful but not perfect
        if incident_type in compatible:
            return 1.0
        return 0.1  # can still help, but not ideal

    def calculate_distance_score(self, distance_km: float) -> float:
        """Returns 1.0 for 0 km, decreasing to 0 at 100+ km."""
        score = 1.0 - (distance_km / 100.0)
        return round(max(0.0, min(1.0, score)), 4)

    def calculate_capacity_score(self, capacity: int, current_load: int) -> float:
        """Returns fraction of available capacity."""
        if capacity <= 0:
            return 0.0
        available = max(0, capacity - current_load)
        return round(min(1.0, available / capacity), 4)

    def haversine_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Returns distance in km between two coordinates."""
        R = 6371
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = (
            math.sin(dlat / 2) ** 2
            + math.cos(math.radians(lat1))
            * math.cos(math.radians(lat2))
            * math.sin(dlon / 2) ** 2
        )
        return R * 2 * math.asin(math.sqrt(a))

    def rank_candidates(
        self, incident: dict, resources: list, max_candidates: int = 5
    ) -> list:
        """
        Rank available resources for a given incident.
        Filters: status == 'available'.
        Score = suitability*0.4 + distance_score*0.4 + capacity_score*0.2
        """
        incident_type = incident.get("incident_type", "other")
        inc_lat = incident.get("latitude", 0.0)
        inc_lon = incident.get("longitude", 0.0)

        candidates = []
        for resource in resources:
            if resource.get("status") != "available":
                continue

            resource_type = resource.get("resource_type", "other")
            res_lat = resource.get("latitude", 0.0)
            res_lon = resource.get("longitude", 0.0)
            capacity = resource.get("capacity", 1)
            current_load = resource.get("current_load", 0)

            suitability = self.calculate_suitability(resource_type, incident_type)
            try:
                distance_km = self.haversine_distance(inc_lat, inc_lon, res_lat, res_lon)
            except Exception:
                distance_km = 999.0
            distance_score = self.calculate_distance_score(distance_km)
            capacity_score = self.calculate_capacity_score(capacity, current_load)

            total_score = round(
                suitability * 0.4 + distance_score * 0.4 + capacity_score * 0.2, 4
            )

            reasoning = (
                f"{resource_type} rated {suitability:.1f} suitability for {incident_type} incident. "
                f"Distance: {distance_km:.1f} km (score {distance_score:.2f}). "
                f"Capacity utilization: {current_load}/{capacity} (score {capacity_score:.2f}). "
                f"Overall composite score: {total_score:.3f}."
            )

            candidates.append(
                {
                    "resource": resource,
                    "recommendation_score": total_score,
                    "distance_km": round(distance_km, 3),
                    "suitability": suitability,
                    "distance_score": distance_score,
                    "capacity_score": capacity_score,
                    "reasoning": reasoning,
                }
            )

        candidates.sort(key=lambda x: x["recommendation_score"], reverse=True)
        return candidates[:max_candidates]

    def generate_recommendations(self, incident: dict, resources: list) -> dict:
        """
        Generate dispatch recommendations.
        Returns {candidates, total_available, conflicts, method}
        """
        available = [r for r in resources if r.get("status") == "available"]
        candidates = self.rank_candidates(incident, resources)

        return {
            "candidates": candidates,
            "total_available": len(available),
            "conflicts": [],
            "incident_id": incident.get("id"),
            "incident_type": incident.get("incident_type"),
            "method": "DispatchResourceAgent",
        }

    def check_conflicts(self, all_recommendations: list) -> list:
        """
        Detect cases where the same resource is recommended for multiple critical incidents.
        all_recommendations: list of recommendation dicts each with 'resource_id' and 'incident_priority_level'.
        """
        from collections import defaultdict

        resource_incidents: dict = defaultdict(list)
        for rec in all_recommendations:
            rid = rec.get("resource_id") or (
                rec.get("resource", {}).get("id") if isinstance(rec.get("resource"), dict) else None
            )
            if rid:
                resource_incidents[rid].append(rec)

        conflicts = []
        for rid, recs in resource_incidents.items():
            critical_recs = [
                r for r in recs if r.get("incident_priority_level") == "critical"
            ]
            if len(critical_recs) > 1:
                conflicts.append(
                    {
                        "resource_id": rid,
                        "conflict_type": "multiple_critical_incidents",
                        "incident_ids": [r.get("incident_id") for r in critical_recs],
                        "count": len(critical_recs),
                    }
                )
        return conflicts
