"""
Rescue Response Agent
Generates structured response plans, checklists, and team briefings.
Uses deterministic templates as the primary decision layer.
LLM (if available) only enhances text, never makes emergency decisions.
"""
import json
import logging
from datetime import datetime
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Response templates by incident type
# ---------------------------------------------------------------------------

TEMPLATES: Dict[str, Dict] = {
    "flood": {
        "recommended_team_type": "water_rescue",
        "required_skills": ["water_rescue", "swift_water_rescue", "first_aid", "boat_operation"],
        "recommended_equipment": [
            "inflatable rescue boats", "personal flotation devices (PFDs)",
            "throw ropes", "water pumps", "flood lights",
            "first aid kits", "waterproof radio", "GPS devices",
        ],
        "external_services_needed": ["medical", "police"],
        "coordination_instructions": (
            "Coordinate with local police for traffic management and crowd control. "
            "Alert nearest hospital for potential flood-related injuries. "
            "Contact NDRF/SDRF for heavy machinery if buildings are submerged. "
            "Establish a command post at the nearest elevated, accessible location."
        ),
        "uncertainties": [
            "Exact water depth and current speed not confirmed",
            "Number of people trapped may change",
            "Structural integrity of flooded buildings unknown",
            "Duration of flooding event uncertain",
        ],
        "escalation_conditions": [
            "Rising water levels endangering responder safety",
            "Casualties requiring immediate medical evacuation",
            "Structural collapse imminent",
            "Additional areas reporting flooding",
        ],
        "safety_note": (
            "SAFETY: Only trained water-rescue personnel with appropriate equipment "
            "should enter flooded areas. Do not encourage untrained civilians to perform rescues."
        ),
        "checklist": [
            {"step": 1, "title": "Review incident report and confirm source", "category": "safety",
             "description": "Verify incident details, source credibility, and confirm coordinates.", "is_mandatory": True},
            {"step": 2, "title": "Contact incident commander", "category": "communication",
             "description": "Establish radio contact with on-site incident commander or local authority.", "is_mandatory": True},
            {"step": 3, "title": "Assess hazards and access routes", "category": "safety",
             "description": "Identify flood depth, current, debris, downed power lines, and safe approach routes. Do NOT confirm routes as safe without on-site verification.", "is_mandatory": True},
            {"step": 4, "title": "Check team availability and equipment", "category": "action",
             "description": "Confirm rescue boat, PFDs, throw ropes, and team members are ready.", "is_mandatory": True},
            {"step": 5, "title": "Obtain human approval for assignment", "category": "action",
             "description": "Assignment must be approved by authorized operator before deployment.", "is_mandatory": True, "requires_approval": True},
            {"step": 6, "title": "Brief team and deploy (post-approval)", "category": "action",
             "description": "Conduct team safety briefing. Deploy only after approval is confirmed.", "is_mandatory": True},
            {"step": 7, "title": "Perform water rescue operations", "category": "action",
             "description": "Prioritize life safety. Use boats and throw ropes. Escalate if conditions deteriorate.", "is_mandatory": True},
            {"step": 8, "title": "Coordinate medical support", "category": "action",
             "description": "Refer flood victims showing signs of hypothermia, injury, or distress to medical team.", "is_mandatory": True},
            {"step": 9, "title": "Report status every 30 minutes", "category": "communication",
             "description": "Transmit situation updates: people assisted, resources needed, outstanding risks.", "is_mandatory": True},
            {"step": 10, "title": "Submit completion report", "category": "report",
             "description": "Record people rescued, resources used, outstanding hazards, and lessons learned.", "is_mandatory": True},
        ],
    },

    "heatwave": {
        "recommended_team_type": "medical_first_response",
        "required_skills": ["first_aid", "medical_assessment", "welfare_check"],
        "recommended_equipment": [
            "drinking water supplies", "oral rehydration salts",
            "cooling fans / misting equipment", "first aid kits",
            "stretchers", "shade canopies", "thermometers",
        ],
        "external_services_needed": ["medical"],
        "coordination_instructions": (
            "Coordinate with municipal health department for cooling centers. "
            "Alert hospitals for potential heat-illness cases. "
            "Inform local NGOs and community volunteers for welfare checks in vulnerable areas. "
            "Identify and prioritize elderly, children, outdoor workers."
        ),
        "uncertainties": [
            "Exact number of affected individuals unknown",
            "Duration of heatwave event uncertain",
            "Availability of cooling centers not confirmed",
            "Medical capacity at local hospitals unknown",
        ],
        "escalation_conditions": [
            "Multiple cases of heat stroke (confusion, high temperature, no sweating)",
            "Fatalities confirmed",
            "Cooling center capacity exceeded",
            "Heatwave intensifying beyond forecast",
        ],
        "safety_note": (
            "SAFETY: Responders must remain hydrated and take regular shade breaks. "
            "Any individual showing confusion, hot dry skin, or loss of consciousness "
            "requires immediate medical escalation — this is a life-threatening emergency."
        ),
        "checklist": [
            {"step": 1, "title": "Review incident report and confirm area affected", "category": "safety",
             "description": "Confirm heatwave advisory, temperature readings, and location details.", "is_mandatory": True},
            {"step": 2, "title": "Identify vulnerable populations", "category": "action",
             "description": "Map elderly residents, children, and outdoor workers in affected area.", "is_mandatory": True},
            {"step": 3, "title": "Confirm cooling center availability", "category": "action",
             "description": "Check nearest air-conditioned public spaces, community halls, hospitals.", "is_mandatory": True},
            {"step": 4, "title": "Obtain human approval for assignment", "category": "action",
             "description": "Assignment must be approved by authorized operator before deployment.", "is_mandatory": True, "requires_approval": True},
            {"step": 5, "title": "Deploy welfare check teams", "category": "action",
             "description": "Knock-and-check campaign in priority areas. Distribute water and ORS.", "is_mandatory": True},
            {"step": 6, "title": "Identify and escalate heat illness cases", "category": "action",
             "description": "Refer anyone showing heat stroke symptoms to medical immediately.", "is_mandatory": True},
            {"step": 7, "title": "Coordinate transport to cooling centers", "category": "action",
             "description": "Arrange transportation for vulnerable individuals unable to self-evacuate.", "is_mandatory": True},
            {"step": 8, "title": "Report status and case count", "category": "communication",
             "description": "Regular updates on welfare checks completed, referrals made, resources needed.", "is_mandatory": True},
            {"step": 9, "title": "Submit completion report", "category": "report",
             "description": "Record individuals assisted, referrals, cooling centers used, outstanding needs.", "is_mandatory": True},
        ],
    },

    "fire": {
        "recommended_team_type": "fire_thermal",
        "required_skills": ["firefighting", "evacuation_coordination", "first_aid", "hazmat_awareness"],
        "recommended_equipment": [
            "fire extinguishers", "breathing apparatus (SCBA)",
            "protective gear (PPE)", "evacuation signage",
            "first aid kits", "radio communication", "exclusion zone tape",
        ],
        "external_services_needed": ["fire", "medical", "police"],
        "coordination_instructions": (
            "IMMEDIATELY alert the appropriate fire service - do NOT allow untrained personnel near the fire. "
            "Coordinate police for exclusion zone and crowd management. "
            "Medical standby for burns, smoke inhalation. "
            "Identify hazardous materials on-site before entry."
        ),
        "uncertainties": [
            "Hazardous materials on-site not fully identified",
            "Structural integrity of building unknown",
            "Number of people inside building unknown",
            "Fire spread rate uncertain",
        ],
        "escalation_conditions": [
            "Hazmat risk confirmed - specialist response required",
            "Structural collapse risk",
            "People confirmed trapped inside",
            "Fire spreading to adjacent structures",
        ],
        "safety_note": (
            "SAFETY CRITICAL: Untrained personnel must NOT approach the fire. "
            "Establish and enforce an exclusion zone. "
            "Only certified firefighters with appropriate PPE should enter the building."
        ),
        "checklist": [
            {"step": 1, "title": "Alert fire service immediately", "category": "action",
             "description": "Call the appropriate fire service before any other action. Provide location, scale, hazmat risk.", "is_mandatory": True},
            {"step": 2, "title": "Establish exclusion zone", "category": "safety",
             "description": "Keep untrained civilians and non-essential responders away from the building.", "is_mandatory": True},
            {"step": 3, "title": "Identify hazardous materials", "category": "safety",
             "description": "Check site records or signage for chemical storage. Alert fire service to hazmat risk.", "is_mandatory": True},
            {"step": 4, "title": "Coordinate evacuation", "category": "action",
             "description": "Assist police in evacuating the immediate area. Establish muster point.", "is_mandatory": True},
            {"step": 5, "title": "Obtain human approval for assignment", "category": "action",
             "description": "Assignment must be approved by authorized operator before deployment.", "is_mandatory": True, "requires_approval": True},
            {"step": 6, "title": "Medical standby at safe perimeter", "category": "action",
             "description": "Position medical team at safe distance for burns/smoke-inhalation casualties.", "is_mandatory": True},
            {"step": 7, "title": "Monitor and communicate fire progression", "category": "communication",
             "description": "Regular updates to command: fire spread, casualties, resources needed.", "is_mandatory": True},
            {"step": 8, "title": "Submit completion report", "category": "report",
             "description": "Record actions taken, casualties, hazmat status, resources used.", "is_mandatory": True},
        ],
    },

    "medical": {
        "recommended_team_type": "medical_first_response",
        "required_skills": ["first_aid", "emergency_medical", "triage"],
        "recommended_equipment": [
            "first aid kits", "stretchers", "AED (defibrillator)",
            "oxygen cylinders", "blood pressure monitors",
            "ambulance", "personal protective equipment",
        ],
        "external_services_needed": ["medical"],
        "coordination_instructions": (
            "Alert nearest hospital emergency department. "
            "Coordinate ambulance dispatch for transport. "
            "Establish triage area away from hazards."
        ),
        "uncertainties": [
            "Number and condition of casualties not fully known",
            "Specific medical conditions unknown",
            "Hospital capacity at receiving facility unknown",
        ],
        "escalation_conditions": [
            "Multiple critical casualties",
            "Specialist medical care required (cardiac, trauma, pediatric)",
            "Mass casualty event - MCI protocols required",
        ],
        "safety_note": (
            "SAFETY: Only trained medical personnel should perform clinical interventions. "
            "Do not move patients with suspected spinal injuries without proper training."
        ),
        "checklist": [
            {"step": 1, "title": "Review incident and confirm medical nature", "category": "safety",
             "description": "Confirm type of medical emergency, number of casualties, and location.", "is_mandatory": True},
            {"step": 2, "title": "Alert hospital and ambulance service", "category": "communication",
             "description": "Notify nearest hospital ER and dispatch ambulance.", "is_mandatory": True},
            {"step": 3, "title": "Assess scene safety", "category": "safety",
             "description": "Ensure scene is safe for responders before entry.", "is_mandatory": True},
            {"step": 4, "title": "Obtain human approval for assignment", "category": "action",
             "description": "Assignment must be approved by authorized operator before deployment.", "is_mandatory": True, "requires_approval": True},
            {"step": 5, "title": "Triage casualties", "category": "action",
             "description": "Assess severity using START triage protocol. Prioritize critical cases.", "is_mandatory": True},
            {"step": 6, "title": "Provide immediate first aid", "category": "action",
             "description": "Apply first aid to critical cases. Do not delay transport for stable patients.", "is_mandatory": True},
            {"step": 7, "title": "Transport to hospital", "category": "action",
             "description": "Coordinate ambulance transport. Alert hospital of incoming patients and conditions.", "is_mandatory": True},
            {"step": 8, "title": "Submit completion report", "category": "report",
             "description": "Record casualties, treatment given, hospital transported to, outstanding needs.", "is_mandatory": True},
        ],
    },

    "missing_person": {
        "recommended_team_type": "search_rescue",
        "required_skills": ["search_rescue", "first_aid", "navigation", "tracking"],
        "recommended_equipment": [
            "GPS devices", "maps of search area", "search lights / torches",
            "two-way radios", "first aid kits", "blankets",
            "search dogs (if available)", "drones (if available)",
        ],
        "external_services_needed": ["police"],
        "coordination_instructions": (
            "Immediately involve police - missing person search is a police-led operation. "
            "Coordinate search teams to cover grid sectors systematically. "
            "Maintain radio contact between all search teams. "
            "Brief all searchers on description and last known location."
        ),
        "uncertainties": [
            "Last known location and time may be approximate",
            "Condition of missing person unknown",
            "Search area may expand based on findings",
        ],
        "escalation_conditions": [
            "Person found injured - medical escalation required",
            "Search area significantly larger than initial estimate",
            "Weather conditions deteriorating",
            "More than 24 hours elapsed since last seen",
        ],
        "safety_note": (
            "SAFETY: All searchers must remain in communication and operate in pairs minimum. "
            "Do not enter hazardous terrain without proper training and equipment."
        ),
        "checklist": [
            {"step": 1, "title": "Confirm police involvement", "category": "action",
             "description": "Missing person cases are police-led. Confirm police have been notified and are coordinating.", "is_mandatory": True},
            {"step": 2, "title": "Obtain last known information", "category": "action",
             "description": "Confirm description, last known location, time, clothing, and any relevant conditions.", "is_mandatory": True},
            {"step": 3, "title": "Define search area and sectors", "category": "action",
             "description": "Map out search area. Assign teams to grid sectors.", "is_mandatory": True},
            {"step": 4, "title": "Obtain human approval for assignment", "category": "action",
             "description": "Assignment must be approved by authorized operator before deployment.", "is_mandatory": True, "requires_approval": True},
            {"step": 5, "title": "Brief and deploy search teams", "category": "action",
             "description": "Brief all teams on description, sector assignments, radio channels, and safety protocols.", "is_mandatory": True},
            {"step": 6, "title": "Systematic sector search", "category": "action",
             "description": "Search assigned sectors methodically. Report findings at regular intervals.", "is_mandatory": True},
            {"step": 7, "title": "Medical standby", "category": "action",
             "description": "Medical team on standby for when/if person is found.", "is_mandatory": True},
            {"step": 8, "title": "Submit completion report", "category": "report",
             "description": "Record search area covered, findings, outcome, and handover to police.", "is_mandatory": True},
        ],
    },

    "earthquake": {
        "recommended_team_type": "search_rescue",
        "required_skills": ["urban_search_rescue", "structural_assessment", "first_aid", "heavy_rescue"],
        "recommended_equipment": [
            "search cameras / listening devices", "hydraulic spreaders",
            "cutting tools", "shoring equipment", "hard hats and PPE",
            "first aid kits", "stretchers", "GPS devices",
        ],
        "external_services_needed": ["medical", "fire", "police"],
        "coordination_instructions": (
            "Coordinate with NDRF/SDRF for heavy rescue equipment. "
            "Alert structural engineers for building assessment. "
            "Medical teams on standby for crush injuries. "
            "Police for perimeter control and crowd management."
        ),
        "uncertainties": [
            "Structural integrity of affected buildings unknown",
            "Number of trapped individuals unknown",
            "Aftershock risk - secondary hazard",
            "Gas line and utility damage unknown",
        ],
        "escalation_conditions": [
            "Confirmed structural collapse with people trapped",
            "Aftershocks occurring",
            "Gas leak or fire risk",
            "Mass casualty event",
        ],
        "safety_note": (
            "SAFETY CRITICAL: Do not enter structurally compromised buildings without clearance from structural engineers. "
            "Establish aftershock alert protocol. Check for gas leaks before entry."
        ),
        "checklist": [
            {"step": 1, "title": "Assess structural damage extent", "category": "safety",
             "description": "Rapid visual assessment of affected buildings. Do not enter without clearance.", "is_mandatory": True},
            {"step": 2, "title": "Check for immediate life hazards", "category": "safety",
             "description": "Gas leaks, live electrical wires, unstable structures. Alert utilities.", "is_mandatory": True},
            {"step": 3, "title": "Alert NDRF/SDRF heavy rescue", "category": "communication",
             "description": "Request heavy rescue and urban search-and-rescue teams.", "is_mandatory": True},
            {"step": 4, "title": "Obtain human approval for assignment", "category": "action",
             "description": "Assignment must be approved by authorized operator before deployment.", "is_mandatory": True, "requires_approval": True},
            {"step": 5, "title": "Search for trapped individuals", "category": "action",
             "description": "Use listening devices and search cameras. Call out to potential survivors.", "is_mandatory": True},
            {"step": 6, "title": "Provide first aid and extraction", "category": "action",
             "description": "Provide immediate first aid. Coordinate careful extraction to avoid further injury.", "is_mandatory": True},
            {"step": 7, "title": "Medical evacuation", "category": "action",
             "description": "Transport casualties to hospital. Alert ER of incoming trauma patients.", "is_mandatory": True},
            {"step": 8, "title": "Submit completion report", "category": "report",
             "description": "Record buildings searched, people extracted, casualties, outstanding hazards.", "is_mandatory": True},
        ],
    },
}

DEFAULT_TEMPLATE = {
    "recommended_team_type": "general",
    "required_skills": ["first_aid", "emergency_response"],
    "recommended_equipment": ["first aid kits", "radio communication", "personal protective equipment"],
    "external_services_needed": ["medical", "police"],
    "coordination_instructions": "Coordinate with local emergency services. Establish command post. Regular status updates.",
    "uncertainties": ["Incident details and scope not fully confirmed"],
    "escalation_conditions": ["Situation deteriorating", "Additional resources required"],
    "safety_note": "SAFETY: Assess hazards before entry. Follow official emergency protocols.",
    "checklist": [
        {"step": 1, "title": "Review incident report", "category": "safety",
         "description": "Confirm incident details and source.", "is_mandatory": True},
        {"step": 2, "title": "Assess scene safety", "category": "safety",
         "description": "Identify hazards before deploying team.", "is_mandatory": True},
        {"step": 3, "title": "Obtain human approval for assignment", "category": "action",
         "description": "Assignment must be approved by authorized operator.", "is_mandatory": True, "requires_approval": True},
        {"step": 4, "title": "Deploy team and execute response", "category": "action",
         "description": "Follow trained responder protocols.", "is_mandatory": True},
        {"step": 5, "title": "Submit completion report", "category": "report",
         "description": "Record actions, outcomes, and outstanding items.", "is_mandatory": True},
    ],
}

MESSAGE_TEMPLATES: Dict[str, Dict[str, str]] = {
    "briefing": {
        "en": (
            "TEAM BRIEFING - {incident_type} at {location}\n"
            "Incident ID: {incident_id}\n"
            "Severity: {severity}/5 | Priority: {priority}\n"
            "Situation: {summary}\n"
            "Key hazards: {hazards}\n"
            "Your assignment: {team_name} | Team leader: {leader}\n"
            "Action: Proceed per approved response plan. Await deployment confirmation.\n"
            "[DEMO MODE - Simulated briefing. Not transmitted to real teams.]"
        ),
        "hi": (
            "TIM BRIEFING - {incident_type} at {location}\n"
            "Ghatna ID: {incident_id}\n"
            "Gambhirata: {severity}/5 | Prathamikta: {priority}\n"
            "Sthiti: {summary}\n"
            "Mukhya jokhim: {hazards}\n"
            "Aapka kaam: {team_name} | Tim lidar: {leader}\n"
            "[DEMO MODE - Simuleted briefing]"
        ),
        "mr": (
            "TIM BRIEFING - {incident_type} at {location}\n"
            "Ghatna ID: {incident_id}\n"
            "Tivrata: {severity}/5 | Pradhanyta: {priority}\n"
            "Sthiti: {summary}\n"
            "Mukhya dhoke: {hazards}\n"
            "Tumache kaam: {team_name} | Tim lidar: {leader}\n"
            "[DEMO MODE - Simulated briefing]"
        ),
    },
    "situation_update": {
        "en": (
            "SITUATION UPDATE - Incident {incident_id}\n"
            "Time: {timestamp}\n"
            "Status: {status}\n"
            "People assisted: {people_assisted}\n"
            "Outstanding risks: {risks}\n"
            "Resources needed: {resources_needed}\n"
            "[DEMO MODE - Simulated update. Not transmitted to real teams.]"
        ),
        "hi": (
            "STHITI UPDATE - Ghatna {incident_id}\n"
            "Samay: {timestamp}\n"
            "Sthiti: {status}\n"
            "Sahayata prapt log: {people_assisted}\n"
            "Lambit jokhim: {risks}\n"
            "[DEMO MODE - Simuleted update]"
        ),
        "mr": (
            "STHITI UPDATE - Ghatna {incident_id}\n"
            "Vel: {timestamp}\n"
            "Sthiti: {status}\n"
            "Sahaay kelele log: {people_assisted}\n"
            "Lambit dhoke: {risks}\n"
            "[DEMO MODE - Simulated update]"
        ),
    },
    "resource_request": {
        "en": (
            "RESOURCE REQUEST - Incident {incident_id}\n"
            "Requesting team: {team_name}\n"
            "Additional resources needed: {resources_needed}\n"
            "Reason: {reason}\n"
            "Urgency: {priority}\n"
            "[DEMO MODE - Simulated request. Not transmitted to real services.]"
        ),
        "hi": (
            "SANSADHAN ANURODH - Ghatna {incident_id}\n"
            "Anurodh karne wali tim: {team_name}\n"
            "Avashyak sansadhan: {resources_needed}\n"
            "Karan: {reason}\n"
            "[DEMO MODE - Simuleted anurodh]"
        ),
        "mr": (
            "SANSADHAN VINANTI - Ghatna {incident_id}\n"
            "Vinanti karnarya tim: {team_name}\n"
            "Avashyak sansadhan: {resources_needed}\n"
            "Karan: {reason}\n"
            "[DEMO MODE - Simulated vinanti]"
        ),
    },
    "completion": {
        "en": (
            "COMPLETION REPORT - Incident {incident_id}\n"
            "Team: {team_name}\n"
            "Completed at: {timestamp}\n"
            "People assisted: {people_assisted}\n"
            "Resources used: {resources_used}\n"
            "Outstanding risks: {risks}\n"
            "Notes: {notes}\n"
            "[DEMO MODE - Simulated report. Not an official record.]"
        ),
        "hi": (
            "SAMAAPTI REPORT - Ghatna {incident_id}\n"
            "Tim: {team_name}\n"
            "Samapt: {timestamp}\n"
            "Sahayata prapt log: {people_assisted}\n"
            "Upayog kiye gaye sansadhan: {resources_used}\n"
            "[DEMO MODE - Simuleted report]"
        ),
        "mr": (
            "POORNATAA AHAVAAL - Ghatna {incident_id}\n"
            "Tim: {team_name}\n"
            "Poorn: {timestamp}\n"
            "Sahaay kelele log: {people_assisted}\n"
            "Vaprlelya sansadhan: {resources_used}\n"
            "[DEMO MODE - Simulated ahavaal]"
        ),
    },
}


class RescueResponseAgent:
    """
    Generates structured rescue response plans using deterministic templates.
    LLM (if available) only improves situation_summary text - it never makes
    emergency decisions, route safety claims, or dispatch commands.
    """

    def __init__(self, settings=None, openai_service=None):
        self.settings = settings
        self.openai_service = openai_service

    def get_template(self, incident_type: str) -> Dict:
        """Return the best-matching template for the incident type."""
        key = (incident_type or "").lower().strip()
        aliases = {
            "urban_flooding": "flood",
            "coastal_flooding": "flood",
            "wildfire": "fire",
            "forest_fire": "fire",
            "medical_emergency": "medical",
            "missing": "missing_person",
        }
        key = aliases.get(key, key)
        return TEMPLATES.get(key, DEFAULT_TEMPLATE)

    def generate_response_plan(self, incident: Dict) -> Dict:
        """
        Generate a structured response plan for the given incident dict.
        Returns a dict matching ResponsePlan fields + checklist items.
        """
        incident_type = incident.get("incident_type", "unknown")
        tmpl = self.get_template(incident_type)

        severity = incident.get("severity", 3)
        priority_level = incident.get("priority_level", "medium")
        affected_population = incident.get("affected_population")

        pop_str = f" affecting approximately {affected_population:,} people" if affected_population else ""
        situation_summary = (
            f"[{priority_level.upper()}] {incident_type.replace('_', ' ').title()} incident "
            f"at {incident.get('address', 'location unknown')}{pop_str}. "
            f"Reported severity: {severity}/5. "
            f"Response plan generated using deterministic template. "
            f"Human operator must verify all details and approve deployment."
        )

        known_hazards = list(tmpl.get("uncertainties", []))
        safety_note = tmpl.get("safety_note", "")
        if safety_note:
            known_hazards.insert(0, safety_note)

        return {
            "situation_summary": situation_summary,
            "known_hazards": json.dumps(known_hazards),
            "recommended_team_type": tmpl["recommended_team_type"],
            "required_skills": json.dumps(tmpl["required_skills"]),
            "recommended_equipment": json.dumps(tmpl["recommended_equipment"]),
            "action_checklist": json.dumps(tmpl["checklist"]),
            "coordination_instructions": tmpl["coordination_instructions"],
            "external_services_needed": json.dumps(tmpl["external_services_needed"]),
            "uncertainties": json.dumps(tmpl["uncertainties"]),
            "escalation_conditions": json.dumps(tmpl["escalation_conditions"]),
            "additional_resources_needed": json.dumps([]),
            "generated_by": "template",
            "template_used": incident_type,
        }

    def get_checklist_items(self, incident_type: str, is_demo: bool = True) -> List[Dict]:
        """Return checklist items for the given incident type."""
        tmpl = self.get_template(incident_type)
        return [
            {
                "step_number": item["step"],
                "title": item["title"],
                "description": item.get("description", ""),
                "category": item.get("category", "action"),
                "is_mandatory": item.get("is_mandatory", True),
                "requires_approval": item.get("requires_approval", False),
                "is_demo": is_demo,
            }
            for item in tmpl["checklist"]
        ]

    def generate_message(
        self,
        message_type: str,
        incident: Dict,
        assignment: Optional[Dict] = None,
        team: Optional[Dict] = None,
        extra: Optional[Dict] = None,
    ) -> Dict[str, str]:
        """Generate multilingual message draft (EN/HI/MR)."""
        tmpl_set = MESSAGE_TEMPLATES.get(message_type, MESSAGE_TEMPLATES["briefing"])
        extra = extra or {}
        incident_type = incident.get("incident_type", "unknown")
        hazards_list = self.get_template(incident_type).get("uncertainties", [])

        def _fmt(template_str: str) -> str:
            try:
                return template_str.format(
                    incident_id=str(incident.get("id", "N/A"))[:8],
                    incident_type=incident_type.replace("_", " ").title(),
                    location=incident.get("address", "location unknown"),
                    severity=incident.get("severity", "?"),
                    priority=(incident.get("priority_level", "unknown") or "unknown").upper(),
                    summary=str(incident.get("description", "No details available."))[:200],
                    hazards=", ".join(hazards_list[:2]) if hazards_list else "See response plan",
                    team_name=team.get("name", "N/A") if team else "N/A",
                    leader=team.get("team_leader", "N/A") if team else "N/A",
                    timestamp=datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"),
                    status=assignment.get("status", "unknown") if assignment else "unknown",
                    people_assisted=str(assignment.get("people_assisted", 0)) if assignment else "0",
                    risks=str(assignment.get("outstanding_risks", "None identified") or "None identified") if assignment else "None identified",
                    resources_needed=str(extra.get("resources_needed", "None specified")),
                    reason=str(extra.get("reason", "Operational requirement")),
                    resources_used=str(assignment.get("resources_used", "[]")) if assignment else "[]",
                    notes=str(assignment.get("notes", "") or "") if assignment else "",
                )
            except KeyError:
                return template_str

        return {
            "en": _fmt(tmpl_set["en"]),
            "hi": _fmt(tmpl_set.get("hi", tmpl_set["en"])),
            "mr": _fmt(tmpl_set.get("mr", tmpl_set["en"])),
        }
