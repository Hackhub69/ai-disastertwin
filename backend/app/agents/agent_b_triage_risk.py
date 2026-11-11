from app.agents.base_agent import BaseAgent
from datetime import datetime
from typing import Tuple, Dict


class TriageRiskAgent(BaseAgent):
    name = "TriageRiskAgent"

    BASE_SCORES: Dict[str, float] = {
        "flood": 50.0,
        "fire": 55.0,
        "heatwave": 45.0,
        "earthquake": 60.0,
        "other": 35.0,
    }

    SEVERITY_MULTIPLIERS: Dict[int, float] = {
        1: 0.4,
        2: 0.6,
        3: 0.8,
        4: 1.0,
        5: 1.3,
    }

    PRIORITY_THRESHOLDS = {
        "critical": 70.0,
        "high": 50.0,
        "medium": 30.0,
    }

    def calculate_priority_score(
        self,
        incident_type: str,
        severity: int,
        affected_population: int = None,
        data_confidence: float = 1.0,
    ) -> Tuple[float, Dict]:
        """
        Returns (score 0-100, components dict) for full transparency.
        """
        base = self.BASE_SCORES.get(incident_type, self.BASE_SCORES["other"])
        severity = max(1, min(5, severity))
        multiplier = self.SEVERITY_MULTIPLIERS.get(severity, 0.8)

        score = base * multiplier

        # Population bonus: up to +20 points
        population_bonus = 0.0
        if affected_population and affected_population > 0:
            # logarithmic scaling: 100 people -> ~4.6, 10000 -> ~9.2, 100000 -> +20
            import math
            pop_log = min(20.0, math.log(affected_population + 1) * 2.0)
            population_bonus = round(pop_log, 2)
            score += population_bonus

        # Confidence factor: low confidence reduces score
        confidence_factor = max(0.5, data_confidence)
        score = score * confidence_factor

        # Clamp to 0-100
        score = round(max(0.0, min(100.0, score)), 2)

        components = {
            "base_score": base,
            "severity_multiplier": multiplier,
            "severity": severity,
            "incident_type": incident_type,
            "population_bonus": population_bonus,
            "affected_population": affected_population,
            "confidence_factor": round(confidence_factor, 2),
            "data_confidence": data_confidence,
            "final_score": score,
        }
        return score, components

    def get_priority_level(self, score: float) -> str:
        if score >= self.PRIORITY_THRESHOLDS["critical"]:
            return "critical"
        elif score >= self.PRIORITY_THRESHOLDS["high"]:
            return "high"
        elif score >= self.PRIORITY_THRESHOLDS["medium"]:
            return "medium"
        else:
            return "low"

    def generate_explanation(self, incident: dict, score: float, components: dict) -> str:
        """Generate human-readable explanation. Use LLM if available, else template."""
        incident_type = incident.get("incident_type", "incident")
        severity = incident.get("severity", 3)
        priority_level = self.get_priority_level(score)
        affected = incident.get("affected_population")
        location = incident.get("address") or f"lat {incident.get('latitude', '?')}, lon {incident.get('longitude', '?')}"

        if self.llm_available():
            prompt = (
                f"Explain the triage priority score for this disaster incident in 2-3 sentences:\n"
                f"Type: {incident_type}, Severity: {severity}/5\n"
                f"Location: {location}\n"
                f"Priority Score: {score}/100, Priority Level: {priority_level}\n"
                f"Score components: {components}\n"
                f"Affected population: {affected or 'unknown'}\n"
                f"Be concise and professional. Explain what factors drove the score."
            )
            result = self.safe_llm_call(prompt, max_tokens=200)
            if result:
                return result

        # Deterministic fallback
        pop_note = f" Approximately {affected:,} people affected." if affected else ""
        return (
            f"Priority score {score:.1f}/100 ({priority_level.upper()}) assigned to {incident_type} incident at {location}. "
            f"Severity {severity}/5 with confidence factor {components.get('confidence_factor', 1.0):.2f} applied.{pop_note}"
        )

    def triage(self, incident: dict) -> dict:
        """Full triage pipeline. Returns {score, priority_level, components, explanation, method, triaged_at}."""
        incident_type = incident.get("incident_type", "other")
        severity = incident.get("severity", 3)
        affected_population = incident.get("affected_population")
        data_confidence = incident.get("data_confidence", 1.0)

        score, components = self.calculate_priority_score(
            incident_type, severity, affected_population, data_confidence
        )
        priority_level = self.get_priority_level(score)
        explanation = self.generate_explanation(incident, score, components)

        return {
            "score": score,
            "priority_level": priority_level,
            "components": components,
            "explanation": explanation,
            "method": "TriageRiskAgent",
            "triaged_at": datetime.utcnow().isoformat(),
        }

    def override_priority(self, incident_id: str, new_level: str, reason: str, actor: str) -> dict:
        """Record a manual priority override. Returns an override record."""
        return {
            "incident_id": incident_id,
            "override_priority_level": new_level,
            "reason": reason,
            "actor": actor,
            "overridden_at": datetime.utcnow().isoformat(),
            "type": "manual_override",
        }
