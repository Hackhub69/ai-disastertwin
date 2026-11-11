"""
Seed the database with rich demo data for end-to-end presentation.
Run from the backend/ directory:
    python seed.py
"""
import sys
import os
import uuid
import json
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal, engine, Base
from app.core.config import settings
from app.models import incidents as _inc
from app.models import resources as _res
from app.models import alerts as _al
from app.models import audit as _aud
from app.models import simulations as _sim
from app.models import rescue as _resc

from app.models.incidents import Incident
from app.models.resources import Resource
from app.models.alerts import AlertDraft
from app.models.audit import AuditEvent
from app.models.rescue import (
    RescueTeam, RescueAssignment, ResponsePlan, ChecklistItem,
    TeamMessage, TeamStatusUpdate
)
from app.agents.agent_b_triage_risk import TriageRiskAgent
from app.agents.rescue_response_agent import RescueResponseAgent, TEMPLATES
from app.agents.agent_d_communication import CommunicationAgent


def seed_all():
    print("=" * 60)
    print("  AI DisasterTwin Rescue — Seeding Full Demo Environment")
    print("=" * 60)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    agent_b = TriageRiskAgent(settings)
    agent_rescue = RescueResponseAgent(settings)
    agent_d = CommunicationAgent(settings)

    # Clean existing demo data
    print("Clearing prior demo records...")
    db.query(TeamMessage).filter(TeamMessage.is_demo == True).delete()
    db.query(TeamStatusUpdate).filter(TeamStatusUpdate.is_demo == True).delete()
    db.query(ChecklistItem).filter(ChecklistItem.is_demo == True).delete()
    db.query(RescueAssignment).filter(RescueAssignment.is_demo == True).delete()
    db.query(ResponsePlan).filter(ResponsePlan.is_demo == True).delete()
    db.query(RescueTeam).filter(RescueTeam.is_demo == True).delete()
    db.query(AlertDraft).delete()
    db.query(AuditEvent).filter(AuditEvent.is_demo == True).delete()
    db.query(Incident).filter(Incident.is_demo == True).delete()
    db.query(Resource).filter(Resource.is_demo == True).delete()
    db.commit()

    # ─── 1. Incidents ────────────────────────────────────────────────────────
    print("\n1. Seeding Incidents...")
    demo_incidents = [
        {
            "id": "inc-mumbai-flood-01",
            "title": "[DEMO] Severe Flash Flooding — Andheri West",
            "description": "Severe waterlogging reported in Andheri West subway and low-lying residential clusters. Multiple vehicles submerged and citizens stranded. Drainage infrastructure inundated after 210mm torrential rainfall in 4 hours.",
            "incident_type": "flood",
            "latitude": 19.1363,
            "longitude": 72.8296,
            "address": "SV Road & Subway, Andheri West, Mumbai, Maharashtra",
            "severity": 4,
            "affected_population": 15000,
            "data_confidence": 0.90,
        },
        {
            "id": "inc-delhi-heat-02",
            "title": "[DEMO] Wet-Bulb Heatwave Emergency — Connaught Place",
            "description": "Extreme heat emergency with temperatures reaching 47.4°C. High humidity pushing wet-bulb threshold to dangerous levels. Multiple heat exhaustion cases reported near transit hubs. Immediate cooling centers required.",
            "incident_type": "heatwave",
            "latitude": 28.6315,
            "longitude": 77.2167,
            "address": "Inner Circle, Connaught Place, New Delhi",
            "severity": 5,
            "affected_population": 50000,
            "data_confidence": 0.95,
        },
        {
            "id": "inc-ahmedabad-quake-03",
            "title": "[DEMO] Earthquake Tremors & Structural Distress — Ahmedabad",
            "description": "Magnitude 5.2 seismic event with focal depth 10km. Moderate structural fractures reported in older residential blocks in Satellite area. Gas lines shut off precautionary.",
            "incident_type": "earthquake",
            "latitude": 23.0225,
            "longitude": 72.5714,
            "address": "Satellite Corridor, Ahmedabad, Gujarat",
            "severity": 3,
            "affected_population": 8000,
            "data_confidence": 0.85,
        },
        {
            "id": "inc-bangalore-fire-04",
            "title": "[DEMO] Industrial Chemical Fire — Peenya Phase 2",
            "description": "Explosive fire at chemical storage warehouse in Peenya industrial sector. Toxic fumes drifting northeast. Evacuation perimeter established at 1.5 km.",
            "incident_type": "fire",
            "latitude": 13.0272,
            "longitude": 77.5132,
            "address": "Peenya Industrial Area Phase 2, Bangalore, Karnataka",
            "severity": 4,
            "affected_population": 3500,
            "data_confidence": 0.92,
        },
        {
            "id": "inc-chennai-coastal-05",
            "title": "[DEMO] Coastal Inundation & Surge — Marina Beach",
            "description": "Tidal surge causing seawater inundation across low-lying coastal fishing hamlets near Marina Beach. SDRF assistance requested for barrier installation and family evacuation.",
            "incident_type": "flood",
            "latitude": 13.0499,
            "longitude": 80.2824,
            "address": "Marina Beach South, Chennai, Tamil Nadu",
            "severity": 3,
            "affected_population": 4200,
            "data_confidence": 0.80,
        },
    ]

    incident_objects = {}
    for inc_data in demo_incidents:
        triage = agent_b.triage(inc_data)
        inc = Incident(
            id=inc_data["id"],
            title=inc_data["title"],
            description=inc_data["description"],
            incident_type=inc_data["incident_type"],
            latitude=inc_data["latitude"],
            longitude=inc_data["longitude"],
            address=inc_data["address"],
            severity=inc_data["severity"],
            priority_score=triage["score"],
            priority_level=triage["priority_level"],
            status="triaged",
            source_type="manual",
            is_demo=True,
            is_synthetic=False,
            data_confidence=inc_data.get("data_confidence", 0.85),
            affected_population=inc_data.get("affected_population"),
            agent_notes=json.dumps({
                "summary": f"Demo incident: {inc_data['title']}",
                "triage_explanation": triage.get("explanation", ""),
            }),
            score_components=json.dumps(triage.get("components", {})),
            triaged_at=datetime.now(timezone.utc),
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db.add(inc)
        incident_objects[inc_data["id"]] = inc
        print(f"  [OK] Incident: {inc_data['title']} -> {triage['priority_level'].upper()} ({triage['score']:.1f})")

    # ─── 2. Logistics Resources ───────────────────────────────────────────────
    print("\n2. Seeding Logistics Resources...")
    demo_resources = [
        {"name": "[DEMO] Advanced Cardiac Ambulance A-1", "resource_type": "ambulance", "latitude": 19.0760, "longitude": 72.8777, "address": "KEM Hospital, Parel, Mumbai", "capacity": 2, "load": 0},
        {"name": "[DEMO] NDRF Flood Rescue Unit Mumbai-1", "resource_type": "rescue_team", "latitude": 19.0596, "longitude": 72.8295, "address": "NDRF Camp, Bandra, Mumbai", "capacity": 25, "load": 8},
        {"name": "[DEMO] High-Capacity Shelter — Dharavi", "resource_type": "shelter", "latitude": 19.0376, "longitude": 72.8554, "address": "Dharavi Multi-Purpose Hall, Mumbai", "capacity": 500, "load": 120},
        {"name": "[DEMO] Heavy Water Tender FE-7", "resource_type": "fire_engine", "latitude": 12.9716, "longitude": 77.5946, "address": "Central Fire Station, Bangalore", "capacity": 8, "load": 0},
        {"name": "[DEMO] Water Tanker Fleet WT-3 (10kL)", "resource_type": "water_tanker", "latitude": 28.6139, "longitude": 77.2090, "address": "Delhi Jal Board Depot, Delhi", "capacity": 10000, "load": 3000},
        {"name": "[DEMO] Emergency Medical Supply Cache MS-1", "resource_type": "medical_supply", "latitude": 23.0225, "longitude": 72.5714, "address": "Civil Hospital Depot, Ahmedabad", "capacity": 1000, "load": 250},
        {"name": "[DEMO] Air Evacuation Helicopter H-2", "resource_type": "helicopter", "latitude": 19.0896, "longitude": 72.8656, "address": "Juhu Aerodrome, Mumbai", "capacity": 10, "load": 0},
        {"name": "[DEMO] Coastal SDRF Rescue Team Chennai-1", "resource_type": "rescue_team", "latitude": 13.0827, "longitude": 80.2707, "address": "SDRF Base, Chennai", "capacity": 18, "load": 0},
    ]

    for res_data in demo_resources:
        res = Resource(
            id=str(uuid.uuid4()),
            name=res_data["name"],
            resource_type=res_data["resource_type"],
            latitude=res_data["latitude"],
            longitude=res_data["longitude"],
            address=res_data["address"],
            status="available",
            capacity=res_data["capacity"],
            current_load=res_data["load"],
            is_demo=True,
            last_updated=datetime.now(timezone.utc),
            created_at=datetime.now(timezone.utc),
        )
        db.add(res)
        print(f"  [OK] Resource: {res_data['name']}")

    # ─── 3. Rescue Teams ──────────────────────────────────────────────────────
    print("\n3. Seeding Rescue Teams...")
    teams_data = [
        {
            "id": "team-rta-01",
            "name": "[DEMO] Rescue Team Alpha - Water Rescue",
            "team_code": "RTA-01",
            "team_leader": "Cmd. Rajesh Kumar",
            "responder_count": 8,
            "skills": ["water_rescue", "swift_water_rescue", "first_aid", "boat_operation"],
            "equipment": ["inflatable rescue boats", "PFDs", "throw ropes", "water pumps", "first aid kits"],
            "base_location": "NDRF Camp, Bandra, Mumbai",
            "latitude": 19.0596,
            "longitude": 72.8295,
            "specialty": "flood",
            "contact_number": "+91-98200-00001",
            "status": "deployed",
        },
        {
            "id": "team-rtb-02",
            "name": "[DEMO] Rescue Team Beta - Fire & Thermal",
            "team_code": "RTB-02",
            "team_leader": "Cmd. Sunita Sharma",
            "responder_count": 6,
            "skills": ["firefighting", "evacuation_coordination", "first_aid", "hazmat_awareness"],
            "equipment": ["SCBA breathing apparatus", "fire extinguishers", "thermal PPE", "exclusion tape"],
            "base_location": "Central Fire Station, Bangalore",
            "latitude": 12.9716,
            "longitude": 77.5946,
            "specialty": "fire",
            "contact_number": "+91-98200-00002",
            "status": "available",
        },
        {
            "id": "team-rtc-03",
            "name": "[DEMO] Rescue Team Gamma - Medical First Response",
            "team_code": "RTC-03",
            "team_leader": "Dr. Priya Nair",
            "responder_count": 5,
            "skills": ["first_aid", "emergency_medical", "triage", "welfare_check"],
            "equipment": ["first aid kits", "stretchers", "AED", "oxygen cylinders", "electrolyte packs"],
            "base_location": "KEM Hospital, Mumbai",
            "latitude": 19.0760,
            "longitude": 72.8777,
            "specialty": "medical",
            "contact_number": "+91-98200-00003",
            "status": "available",
        },
        {
            "id": "team-rtd-04",
            "name": "[DEMO] Rescue Team Delta - Search & Rescue",
            "team_code": "RTD-04",
            "team_leader": "Cmd. Arjun Singh",
            "responder_count": 10,
            "skills": ["urban_search_rescue", "structural_assessment", "first_aid", "navigation"],
            "equipment": ["search cameras", "hydraulic cutters", "shoring equipment", "GPS"],
            "base_location": "SDRF Base, Chennai",
            "latitude": 13.0827,
            "longitude": 80.2707,
            "specialty": "search_rescue",
            "contact_number": "+91-98200-00004",
            "status": "available",
        },
        {
            "id": "team-rte-05",
            "name": "[DEMO] Rescue Team Echo - General Emergency",
            "team_code": "RTE-05",
            "team_leader": "Cmd. Meera Patel",
            "responder_count": 7,
            "skills": ["first_aid", "emergency_response", "crowd_management"],
            "equipment": ["first aid kits", "digital transceivers", "PPE", "emergency rations"],
            "base_location": "Civil Hospital Depot, Ahmedabad",
            "latitude": 23.0225,
            "longitude": 72.5714,
            "specialty": "general",
            "contact_number": "+91-98200-00005",
            "status": "available",
        },
    ]

    for t in teams_data:
        db.add(RescueTeam(
            id=t["id"],
            name=t["name"],
            team_code=t["team_code"],
            team_leader=t["team_leader"],
            responder_count=t["responder_count"],
            skills=json.dumps(t["skills"]),
            equipment=json.dumps(t["equipment"]),
            base_location=t["base_location"],
            latitude=t["latitude"],
            longitude=t["longitude"],
            specialty=t["specialty"],
            contact_number=t["contact_number"],
            status=t["status"],
            is_demo=True,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        ))
        print(f"  [OK] Rescue Team: {t['name']} ({t['team_code']})")

    # ─── 4. Response Plans ────────────────────────────────────────────────────
    print("\n4. Seeding Structured Response Plans...")
    plan_flood_id = "plan-flood-mumbai-01"
    raw_flood_plan = agent_rescue.generate_response_plan({
        "id": "inc-mumbai-flood-01",
        "title": "[DEMO] Severe Flash Flooding — Andheri West",
        "incident_type": "flood",
        "severity": 4,
        "priority_level": "critical",
        "address": "SV Road & Subway, Andheri West, Mumbai",
    })

    plan_flood = ResponsePlan(
        id=plan_flood_id,
        incident_id="inc-mumbai-flood-01",
        situation_summary=raw_flood_plan["situation_summary"],
        known_hazards=raw_flood_plan["known_hazards"],
        recommended_team_type=raw_flood_plan["recommended_team_type"],
        required_skills=raw_flood_plan["required_skills"],
        recommended_equipment=raw_flood_plan["recommended_equipment"],
        action_checklist=raw_flood_plan["action_checklist"],
        coordination_instructions=raw_flood_plan["coordination_instructions"],
        external_services_needed=raw_flood_plan["external_services_needed"],
        uncertainties=raw_flood_plan["uncertainties"],
        escalation_conditions=raw_flood_plan["escalation_conditions"],
        generated_by=raw_flood_plan["generated_by"],
        template_used=raw_flood_plan["template_used"],
        approval_status="approved",
        approved_by="Commander Officer",
        approved_at=datetime.now(timezone.utc),
        is_demo=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(plan_flood)

    # Delhi Heatwave Plan
    raw_heat_plan = agent_rescue.generate_response_plan({
        "id": "inc-delhi-heat-02",
        "title": "[DEMO] Wet-Bulb Heatwave Emergency — Connaught Place",
        "incident_type": "heatwave",
        "severity": 5,
        "priority_level": "critical",
        "address": "Inner Circle, Connaught Place, New Delhi",
    })
    plan_heat = ResponsePlan(
        id="plan-heat-delhi-02",
        incident_id="inc-delhi-heat-02",
        situation_summary=raw_heat_plan["situation_summary"],
        known_hazards=raw_heat_plan["known_hazards"],
        recommended_team_type=raw_heat_plan["recommended_team_type"],
        required_skills=raw_heat_plan["required_skills"],
        recommended_equipment=raw_heat_plan["recommended_equipment"],
        action_checklist=raw_heat_plan["action_checklist"],
        coordination_instructions=raw_heat_plan["coordination_instructions"],
        external_services_needed=raw_heat_plan["external_services_needed"],
        uncertainties=raw_heat_plan["uncertainties"],
        escalation_conditions=raw_heat_plan["escalation_conditions"],
        generated_by=raw_heat_plan["generated_by"],
        template_used=raw_heat_plan["template_used"],
        approval_status="draft",
        is_demo=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(plan_heat)
    print("  [OK] Response Plan for Mumbai Flood (Approved)")
    print("  [OK] Response Plan for Delhi Heatwave (Draft)")

    # ─── 5. Rescue Assignment & Interactive Checklist ──────────────────────────
    print("\n5. Seeding Field Deployment & Action Checklist...")
    assignment_id = "asgn-mumbai-alpha-01"
    asgn = RescueAssignment(
        id=assignment_id,
        incident_id="inc-mumbai-flood-01",
        team_id="team-rta-01",
        response_plan_id=plan_flood_id,
        status="on_scene",
        recommended_by="Agent C Matcher",
        approved_by="Commander Officer",
        approved_at=datetime.now(timezone.utc),
        priority_at_assignment="critical",
        notes="Authorized deployment of Team Alpha with 2 inflatable boats and trauma support.",
        people_assisted=24,
        is_demo=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(asgn)

    # Checklist IDs are stable so a serverless demo instance can continue a
    # checklist selected from another warm instance.
    flood_checklist_items = agent_rescue.get_checklist_items("flood")
    for i, item in enumerate(flood_checklist_items):
        is_completed = i < 4  # Steps 1 to 4 completed, rest active
        db.add(ChecklistItem(
            id=f"check-rta01-{item['step_number']:02d}",
            assignment_id=assignment_id,
            response_plan_id=plan_flood_id,
            step_number=item["step_number"],
            title=item["title"],
            description=item.get("description", ""),
            category=item.get("category", "action"),
            is_mandatory=item.get("is_mandatory", True),
            requires_approval=item.get("requires_approval", False),
            completed=is_completed,
            completed_by="Cmd. Rajesh Kumar" if is_completed else None,
            completed_at=datetime.now(timezone.utc) if is_completed else None,
            is_demo=True,
            created_at=datetime.now(timezone.utc),
        ))
    print(f"  [OK] Deployment Assignment {assignment_id} (Status: ON_SCENE, 4/8 Checklist Tasks Completed)")

    # A pending recommendation keeps the operator approval flow available in
    # the hosted demo. Its fixed ID also makes it safe to use across Vercel
    # function instances backed by their own temporary SQLite databases.
    recommended_assignment_id = "asgn-mumbai-echo-05"
    db.add(RescueAssignment(
        id=recommended_assignment_id,
        incident_id="inc-mumbai-flood-01",
        team_id="team-rte-05",
        response_plan_id=plan_flood_id,
        status="recommended",
        recommended_by="Agent C Matcher",
        priority_at_assignment="high",
        notes="Pending operator authorization for general emergency support.",
        is_demo=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    ))
    for item in flood_checklist_items:
        db.add(ChecklistItem(
            id=f"check-rte05-{item['step_number']:02d}",
            assignment_id=recommended_assignment_id,
            response_plan_id=plan_flood_id,
            step_number=item["step_number"],
            title=item["title"],
            description=item.get("description", ""),
            category=item.get("category", "action"),
            is_mandatory=item.get("is_mandatory", True),
            requires_approval=item.get("requires_approval", False),
            completed=False,
            is_demo=True,
            created_at=datetime.now(timezone.utc),
        ))
    print(f"  [OK] Deployment Assignment {recommended_assignment_id} (Status: RECOMMENDED, pending authorization)")

    # Timeline updates
    timeline_steps = [
        ("recommended", "awaiting_approval", "System recommendation matched by skill suitability"),
        ("awaiting_approval", "assigned", "Operator authorized deployment after risk review"),
        ("assigned", "responding", "Team Alpha en route with 2 boats and high-water gear"),
        ("responding", "on_scene", "Team Alpha arrived on scene at Andheri Subway. Deployed boats."),
    ]
    for old_s, new_s, notes in timeline_steps:
        db.add(TeamStatusUpdate(
            id=str(uuid.uuid4()),
            assignment_id=assignment_id,
            old_status=old_s,
            new_status=new_s,
            updated_by="Commander Officer",
            notes=notes,
            is_demo=True,
            timestamp=datetime.now(timezone.utc),
        ))

    # ─── 6. Multilingual Comms & Public Alerts ─────────────────────────────────
    print("\n6. Seeding Multilingual Messages & Public Alerts...")
    db.add(TeamMessage(
        id="msg-briefing-01",
        assignment_id=assignment_id,
        incident_id="inc-mumbai-flood-01",
        message_type="briefing",
        content_en=(
            "OPERATIONAL BRIEFING: Heavy Flash Flooding at Andheri West Subway.\n"
            "TARGET: Evacuate stranded motorists and assist elderly residents near SV Road.\n"
            "HAZARDS: Submerged debris, open manholes, active electrical conduits.\n"
            "RULES: Wear Type-III PFDs at all times. Maintain line-of-sight communication on Channel 4."
        ),
        content_hi=(
            "परिचालन ब्रीफिंग: अंधेरी पश्चिम सबवे पर भारी जलभराव और बाढ़।\n"
            "लक्ष्य: फंसे हुए वाहन चालकों और एसवी रोड के निवासियों को सुरक्षित निकालना।\n"
            "खतरे: पानी में डूबा मलबा, खुले मैनहोल और बिजली के तार।\n"
            "सुरक्षा नियम: हर समय लाइफ जैकेट पहनें। चैनल 4 पर निरंतर संपर्क बनाए रखें।"
        ),
        content_mr=(
            "ऑपरेशनल ब्रीफिंग: अंधेरी पश्चिम सबवे येथे तीव्र पूरस्थिती.\n"
            "उद्दिष्ट: अडकलेल्या प्रवाशांना व स्थानिक नागरिकांना सुरक्षित बाहेर काढणे.\n"
            "धोके: पाण्यात बुडालेला कचरा, उघडी मॅनहोल्स आणि विजेच्या तारा.\n"
            "सुरक्षा नियम: नेहमी लाईफ जॅकेट परिधान करा. चॅनेल ४ वर संपर्क ठेवा."
        ),
        status="approved",
        created_by="Commander Officer",
        approved_by="Commander Officer",
        approved_at=datetime.now(timezone.utc),
        delivery_note="SIMULATED RADIO BROADCAST — Channel 4 VHF",
        is_demo=True,
        created_at=datetime.now(timezone.utc),
    ))

    db.add(TeamMessage(
        id="msg-sitrep-02",
        assignment_id=assignment_id,
        incident_id="inc-mumbai-flood-01",
        message_type="situation_update",
        content_en="SITREP 01: Water level 1.4m and receding slowly. 24 persons evacuated safely to Dharavi Relief Camp. 1 additional boat requested.",
        content_hi="स्थिति रिपोर्ट 01: जलस्तर 1.4 मीटर है और धीरे-धीरे घट रहा है। 24 व्यक्तियों को सुरक्षित धारावी राहत शिविर में पहुंचाया गया।",
        content_mr="परिस्थिती अहवाल 01: पाण्याची पातळी १.४ मीटर असून हळूहळू कमी होत आहे. २४ नागरिकांना धारावी निवारा केंद्रात सुरक्षित हलवण्यात आले आहे.",
        status="draft",
        created_by="Cmd. Rajesh Kumar",
        is_demo=True,
        created_at=datetime.now(timezone.utc),
    ))

    # Public Alert Draft
    db.add(AlertDraft(
        id="alert-mumbai-01",
        incident_id="inc-mumbai-flood-01",
        content_en=(
            "EMERGENCY ADVISORY: Flash flooding across Andheri West. Avoid SV Road and subway. "
            "Emergency relief centers open at Dharavi Community Hall. Dial 112 for rescue assistance."
        ),
        content_hi=(
            "आपातकालीन सूचना: अंधेरी पश्चिम में भारी जलभराव। एसवी रोड और सबवे की ओर जाने से बचें। "
            "धारावी सामुदायिक केंद्र में राहत शिविर चालू है। आपातकालीन मदद के लिए 112 डायल करें।"
        ),
        content_mr=(
            "तातडीची सूचना: अंधेरी पश्चिम परिसरात पूरस्थिती. एसव्ही रोड व सबवे मार्गाने प्रवास टाळा. "
            "धारावी कम्युनिटी सेंटर येथे निवारा केंद्र सुरू आहे. मदतीसाठी ११२ वर कॉल करा."
        ),
        status="approved",
        created_by="Agent D — Communication Agent",
        approved_by="Commander Officer",
        approved_at=datetime.now(timezone.utc),
        created_at=datetime.now(timezone.utc),
    ))

    # ─── 7. Audit Ledger ──────────────────────────────────────────────────────
    print("\n7. Seeding Audit Ledger Records...")
    audit_events = [
        ("system", "incident_created", "incident", "inc-mumbai-flood-01", "Inundation report registered via citizen field telemetry"),
        ("agent_b", "incident_triaged", "incident", "inc-mumbai-flood-01", "Agent B calculated priority score 85.5 (CRITICAL)"),
        ("operator", "rescue_plan_created", "rescue", plan_flood_id, "Generated deterministic safety protocol for urban flood"),
        ("operator", "rescue_plan_approved", "rescue", plan_flood_id, "Commander Officer approved flood response checklist"),
        ("agent_c", "recommendation_generated", "recommendation", "team-rta-01", "Agent C matched Team Alpha by water_rescue specialty"),
        ("operator", "rescue_team_assigned", "rescue", assignment_id, "Authorized Team Alpha field deployment"),
        ("operator", "status_advanced", "rescue", assignment_id, "Advanced operational stage to ON_SCENE"),
        ("agent_d", "alert_draft_created", "alert", "alert-mumbai-01", "Agent D synthesized English, Hindi, and Marathi public warnings"),
    ]

    for actor, action, ent_type, ent_id, reason in audit_events:
        db.add(AuditEvent(
            id=str(uuid.uuid4()),
            actor=actor,
            action=action,
            entity_type=ent_type,
            entity_id=ent_id,
            reason=reason,
            is_demo=True,
            timestamp=datetime.now(timezone.utc),
        ))

    db.commit()
    db.close()

    print("\n" + "=" * 60)
    print("  DEMO SEED COMPLETED SUCCESSFULLY!")
    print("  - 5 High-Priority Incidents with Agent B Risk Scores")
    print("  - 8 Response Logistics Assets (Ambulances, Boats, Shelters)")
    print("  - 5 Rescue Teams with Member Rosters and Gear Inventory")
    print("  - 2 Structured Response Plans (Approved & Draft)")
    print("  - 2 Demo Deployments (On Scene and Pending Authorization)")
    print("  - Multilingual Comms & Alerts (English, Hindi, Marathi)")
    print("  - Cryptographic Audit Trail of All Operator Decisions")
    print("=" * 60)


if __name__ == "__main__":
    seed_all()
