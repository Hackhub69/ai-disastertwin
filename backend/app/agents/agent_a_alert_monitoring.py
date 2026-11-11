from app.agents.base_agent import BaseAgent
from typing import Optional
import math
import json
from datetime import datetime, timedelta


class AlertMonitoringAgent(BaseAgent):
    name = "AlertMonitoringAgent"

    VALID_INCIDENT_TYPES = ["flood", "fire", "heatwave", "earthquake", "other"]

    def validate_report(self, data: dict) -> dict:
        """Returns {"valid": bool, "errors": [], "warnings": []}"""
        errors = []
        warnings = []

        lat = data.get("latitude")
        lon = data.get("longitude")
        if lat is None or not (-90 <= lat <= 90):
            errors.append("Invalid latitude")
        if lon is None or not (-180 <= lon <= 180):
            errors.append("Invalid longitude")

        if not data.get("title") or len(str(data.get("title", ""))) < 3:
            errors.append("Title too short (min 3 chars)")

        if not data.get("description") or len(str(data.get("description", ""))) < 10:
            errors.append("Description too short (min 10 chars)")

        incident_type = data.get("incident_type", "other")
        if incident_type not in self.VALID_INCIDENT_TYPES:
            warnings.append(f"Unknown incident type '{incident_type}', defaulting to 'other'")
            data["incident_type"] = "other"

        severity = data.get("severity", 3)
        if not (1 <= severity <= 5):
            warnings.append("Severity out of range, clamped to 1-5")
            data["severity"] = max(1, min(5, severity))

        if data.get("affected_population") and data["affected_population"] < 0:
            errors.append("Affected population cannot be negative")

        return {"valid": len(errors) == 0, "errors": errors, "warnings": warnings}

    def haversine_distance(self, lat1, lon1, lat2, lon2) -> float:
        """Returns distance in km"""
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

    def detect_duplicates(
        self,
        new_incident: dict,
        existing_incidents: list,
        time_window_minutes: int = 30,
        distance_km: float = 1.0,
    ) -> list:
        """Returns list of potential duplicate incident IDs with similarity score"""
        duplicates = []
        new_lat = new_incident.get("latitude", 0)
        new_lon = new_incident.get("longitude", 0)
        new_type = new_incident.get("incident_type", "")
        now = datetime.utcnow()

        for existing in existing_incidents:
            # Check time window
            created = existing.get("created_at", now)
            if isinstance(created, str):
                try:
                    created = datetime.fromisoformat(created)
                except Exception:
                    created = now
            time_diff = abs((now - created).total_seconds() / 60)

            if time_diff > time_window_minutes:
                continue

            # Check distance
            try:
                dist = self.haversine_distance(
                    new_lat,
                    new_lon,
                    existing.get("latitude", 0),
                    existing.get("longitude", 0),
                )
                if dist <= distance_km:
                    similarity = 1.0 - (dist / distance_km)
                    if existing.get("incident_type") == new_type:
                        similarity = min(1.0, similarity + 0.2)
                    duplicates.append(
                        {
                            "incident_id": existing.get("id"),
                            "distance_km": round(dist, 3),
                            "time_diff_minutes": round(time_diff, 1),
                            "similarity_score": round(similarity, 2),
                        }
                    )
            except Exception:
                continue

        return sorted(duplicates, key=lambda x: x["similarity_score"], reverse=True)

    def generate_summary(self, incident: dict) -> str:
        """Generate incident summary, use LLM if available"""
        incident_type = incident.get("incident_type", "incident")
        severity = incident.get("severity", 3)
        location = incident.get("address") or f"lat {incident.get('latitude')}, lon {incident.get('longitude')}"
        description = incident.get("description", "")

        if self.llm_available():
            prompt = (
                f"Summarize this disaster incident in 2 sentences for emergency operators:\n"
                f"Type: {incident_type}\n"
                f"Severity: {severity}/5\n"
                f"Location: {location}\n"
                f"Description: {description}\n"
                f"Keep it factual and concise. Note any uncertainties."
            )
            result = self.safe_llm_call(prompt, max_tokens=150)
            if result:
                return result

        # Deterministic fallback
        severity_labels = {1: "Minor", 2: "Low", 3: "Moderate", 4: "High", 5: "Critical"}
        return (
            f"{severity_labels.get(severity, 'Unknown')} severity {incident_type} reported at {location}. "
            f"{description[:100]}{'...' if len(description) > 100 else ''}"
        )

    def normalize_report(self, data: dict) -> dict:
        """Normalize and enrich incoming report"""
        normalized = data.copy()
        normalized["incident_type"] = normalized.get("incident_type", "other").lower().strip()
        normalized["title"] = normalized.get("title", "").strip()
        normalized["description"] = normalized.get("description", "").strip()
        if "severity" not in normalized:
            normalized["severity"] = 3
        if "data_confidence" not in normalized:
            normalized["data_confidence"] = 1.0
        if "source_type" not in normalized:
            normalized["source_type"] = "manual"
        if "is_demo" not in normalized:
            normalized["is_demo"] = True
        normalized["_provenance"] = {
            "processed_by": "AlertMonitoringAgent",
            "processed_at": datetime.utcnow().isoformat(),
            "source": normalized.get("source_type", "manual"),
            "is_demo": normalized.get("is_demo", True),
        }
        return normalized

    def process_report(self, incident_data: dict, existing_incidents: list = None) -> dict:
        """Full pipeline: validate, normalize, check duplicates, summarize"""
        if existing_incidents is None:
            existing_incidents = []

        validation = self.validate_report(incident_data)
        if not validation["valid"]:
            return {
                "success": False,
                "errors": validation["errors"],
                "warnings": validation["warnings"],
            }

        normalized = self.normalize_report(incident_data)
        duplicates = self.detect_duplicates(normalized, existing_incidents)
        summary = self.generate_summary(normalized)

        return {
            "success": True,
            "normalized_data": normalized,
            "validation": validation,
            "potential_duplicates": duplicates,
            "summary": summary,
            "method": "AlertMonitoringAgent",
        }
