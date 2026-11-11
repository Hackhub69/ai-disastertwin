from app.agents.base_agent import BaseAgent
from datetime import datetime
from typing import Dict

DISCLAIMER = (
    "\n\n⚠️ DRAFT ONLY — This message requires authorized operator approval before publication. "
    "Do NOT distribute without approval."
)

TEMPLATES: Dict[str, Dict[str, str]] = {
    "en": {
        "flood": (
            "🚨 FLOOD ALERT — {confidence_label} Confidence\n\n"
            "Location: {location}\n"
            "Severity: {severity}/5\n"
            "Time: {time}\n\n"
            "{description}\n\n"
            "Precautions:\n"
            "• Move to higher ground immediately\n"
            "• Avoid flooded roads and bridges\n"
            "• Do not walk or drive through floodwaters\n"
            "• Follow instructions from emergency services\n\n"
            "Source: {source_label}"
        ),
        "fire": (
            "🔥 FIRE ALERT — {confidence_label} Confidence\n\n"
            "Location: {location}\n"
            "Severity: {severity}/5\n"
            "Time: {time}\n\n"
            "{description}\n\n"
            "Precautions:\n"
            "• Evacuate the area immediately\n"
            "• Cover nose and mouth with wet cloth\n"
            "• Do not use elevators\n"
            "• Call 101 for fire services\n\n"
            "Source: {source_label}"
        ),
        "heatwave": (
            "☀️ HEATWAVE ALERT — {confidence_label} Confidence\n\n"
            "Location: {location}\n"
            "Severity: {severity}/5\n"
            "Time: {time}\n\n"
            "{description}\n\n"
            "Precautions:\n"
            "• Stay indoors during peak hours (12pm–4pm)\n"
            "• Drink plenty of water\n"
            "• Wear light, loose-fitting clothes\n"
            "• Seek medical attention for heat exhaustion\n\n"
            "Source: {source_label}"
        ),
        "earthquake": (
            "🏚️ EARTHQUAKE ALERT — {confidence_label} Confidence\n\n"
            "Location: {location}\n"
            "Severity: {severity}/5\n"
            "Time: {time}\n\n"
            "{description}\n\n"
            "Precautions:\n"
            "• Drop, Cover, and Hold On\n"
            "• Stay away from windows and exterior walls\n"
            "• Do not use elevators\n"
            "• Be prepared for aftershocks\n\n"
            "Source: {source_label}"
        ),
        "other": (
            "⚠️ EMERGENCY ALERT — {confidence_label} Confidence\n\n"
            "Location: {location}\n"
            "Severity: {severity}/5\n"
            "Time: {time}\n\n"
            "{description}\n\n"
            "Precautions:\n"
            "• Follow instructions from local authorities\n"
            "• Stay informed via official channels\n"
            "• Call emergency services if needed\n\n"
            "Source: {source_label}"
        ),
    },
    "hi": {
        "flood": (
            "🚨 बाढ़ चेतावनी — {confidence_label} विश्वसनीयता\n\n"
            "स्थान: {location}\n"
            "गंभीरता: {severity}/5\n"
            "समय: {time}\n\n"
            "{description}\n\n"
            "सावधानियाँ:\n"
            "• तुरंत ऊँचे स्थान पर जाएं\n"
            "• बाढ़ग्रस्त सड़कों से बचें\n"
            "• बाढ़ के पानी में न चलें न गाड़ी चलाएं\n"
            "• आपातकालीन सेवाओं के निर्देशों का पालन करें\n\n"
            "स्रोत: {source_label}"
        ),
        "fire": (
            "🔥 आग चेतावनी — {confidence_label} विश्वसनीयता\n\n"
            "स्थान: {location}\n"
            "गंभीरता: {severity}/5\n"
            "समय: {time}\n\n"
            "{description}\n\n"
            "सावधानियाँ:\n"
            "• तुरंत क्षेत्र खाली करें\n"
            "• गीले कपड़े से नाक और मुंह ढकें\n"
            "• लिफ्ट का उपयोग न करें\n"
            "• अग्निशमन सेवा के लिए 101 पर कॉल करें\n\n"
            "स्रोत: {source_label}"
        ),
        "heatwave": (
            "☀️ लू चेतावनी — {confidence_label} विश्वसनीयता\n\n"
            "स्थान: {location}\n"
            "गंभीरता: {severity}/5\n"
            "समय: {time}\n\n"
            "{description}\n\n"
            "सावधानियाँ:\n"
            "• दोपहर 12 से 4 बजे तक घर के अंदर रहें\n"
            "• खूब पानी पिएं\n"
            "• हल्के और ढीले कपड़े पहनें\n"
            "• गर्मी से बेहोशी पर तुरंत चिकित्सा सहायता लें\n\n"
            "स्रोत: {source_label}"
        ),
        "earthquake": (
            "🏚️ भूकंप चेतावनी — {confidence_label} विश्वसनीयता\n\n"
            "स्थान: {location}\n"
            "गंभीरता: {severity}/5\n"
            "समय: {time}\n\n"
            "{description}\n\n"
            "सावधानियाँ:\n"
            "• झुकें, ढकें और पकड़े रहें\n"
            "• खिड़कियों और बाहरी दीवारों से दूर रहें\n"
            "• लिफ्ट का उपयोग न करें\n"
            "• आफ्टरशॉक के लिए तैयार रहें\n\n"
            "स्रोत: {source_label}"
        ),
        "other": (
            "⚠️ आपातकालीन चेतावनी — {confidence_label} विश्वसनीयता\n\n"
            "स्थान: {location}\n"
            "गंभीरता: {severity}/5\n"
            "समय: {time}\n\n"
            "{description}\n\n"
            "सावधानियाँ:\n"
            "• स्थानीय अधिकारियों के निर्देशों का पालन करें\n"
            "• आधिकारिक चैनलों के माध्यम से सूचित रहें\n"
            "• जरूरत पड़ने पर आपातकालीन सेवाओं को कॉल करें\n\n"
            "स्रोत: {source_label}"
        ),
    },
    "mr": {
        "flood": (
            "🚨 पूर इशारा — {confidence_label} विश्वासार्हता\n\n"
            "स्थान: {location}\n"
            "तीव्रता: {severity}/5\n"
            "वेळ: {time}\n\n"
            "{description}\n\n"
            "खबरदारी:\n"
            "• ताबडतोब उंच ठिकाणी जा\n"
            "• पुरग्रस्त रस्ते टाळा\n"
            "• पुराच्या पाण्यातून चालू किंवा गाडी चालवू नका\n"
            "• आपत्कालीन सेवांच्या सूचनांचे पालन करा\n\n"
            "स्रोत: {source_label}"
        ),
        "fire": (
            "🔥 आग इशारा — {confidence_label} विश्वासार्हता\n\n"
            "स्थान: {location}\n"
            "तीव्रता: {severity}/5\n"
            "वेळ: {time}\n\n"
            "{description}\n\n"
            "खबरदारी:\n"
            "• ताबडतोब परिसर रिकामा करा\n"
            "• ओल्या कापडाने नाक आणि तोंड झाका\n"
            "• लिफ्ट वापरू नका\n"
            "• अग्निशमन सेवेसाठी 101 वर कॉल करा\n\n"
            "स्रोत: {source_label}"
        ),
        "heatwave": (
            "☀️ उष्णलहर इशारा — {confidence_label} विश्वासार्हता\n\n"
            "स्थान: {location}\n"
            "तीव्रता: {severity}/5\n"
            "वेळ: {time}\n\n"
            "{description}\n\n"
            "खबरदारी:\n"
            "• दुपारी 12 ते 4 दरम्यान घरात राहा\n"
            "• भरपूर पाणी प्या\n"
            "• हलके आणि सैल कपडे घाला\n"
            "• उष्माघाताच्या लक्षणांसाठी त्वरित वैद्यकीय मदत घ्या\n\n"
            "स्रोत: {source_label}"
        ),
        "earthquake": (
            "🏚️ भूकंप इशारा — {confidence_label} विश्वासार्हता\n\n"
            "स्थान: {location}\n"
            "तीव्रता: {severity}/5\n"
            "वेळ: {time}\n\n"
            "{description}\n\n"
            "खबरदारी:\n"
            "• खाली वाका, आश्रय घ्या आणि धरा\n"
            "• खिडक्या आणि बाह्य भिंतींपासून दूर राहा\n"
            "• लिफ्ट वापरू नका\n"
            "• आफ्टरशॉकसाठी तयार राहा\n\n"
            "स्रोत: {source_label}"
        ),
        "other": (
            "⚠️ आपत्कालीन इशारा — {confidence_label} विश्वासार्हता\n\n"
            "स्थान: {location}\n"
            "तीव्रता: {severity}/5\n"
            "वेळ: {time}\n\n"
            "{description}\n\n"
            "खबरदारी:\n"
            "• स्थानिक अधिकाऱ्यांच्या सूचनांचे पालन करा\n"
            "• अधिकृत वाहिन्यांद्वारे माहिती ठेवा\n"
            "• आवश्यकता असल्यास आपत्कालीन सेवांना कॉल करा\n\n"
            "स्रोत: {source_label}"
        ),
    },
}


class CommunicationAgent(BaseAgent):
    name = "CommunicationAgent"

    def get_confidence_label(self, confidence: float) -> str:
        if confidence >= 0.8:
            return "High"
        elif confidence >= 0.5:
            return "Medium"
        else:
            return "Low"

    def format_template(self, template: str, incident: dict) -> str:
        """Fill template placeholders from incident dict."""
        location = incident.get("address") or (
            f"Lat {incident.get('latitude', '?')}, Lon {incident.get('longitude', '?')}"
        )
        confidence = incident.get("data_confidence", 1.0)
        confidence_label = self.get_confidence_label(confidence)
        source_type = incident.get("source_type", "manual")
        source_label = f"AI DisasterTwin Rescue Platform (Source: {source_type})"
        time_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
        description = incident.get("description", "No additional details available.")

        filled = template.format(
            location=location,
            severity=incident.get("severity", "N/A"),
            time=time_str,
            description=description,
            confidence_label=confidence_label,
            source_label=source_label,
        )
        return filled

    def draft_in_language(self, incident: dict, lang: str) -> str:
        """Draft alert in a specific language. Use LLM if available, else template."""
        incident_type = incident.get("incident_type", "other")

        if self.llm_available():
            lang_names = {"en": "English", "hi": "Hindi (Devanagari script)", "mr": "Marathi (Devanagari script)"}
            lang_name = lang_names.get(lang, lang)
            location = incident.get("address") or f"lat {incident.get('latitude')}, lon {incident.get('longitude')}"
            prompt = (
                f"Draft a public emergency alert in {lang_name} for this disaster:\n"
                f"Type: {incident_type}\n"
                f"Severity: {incident.get('severity', 3)}/5\n"
                f"Location: {location}\n"
                f"Description: {incident.get('description', '')}\n"
                f"Data confidence: {incident.get('data_confidence', 1.0)}\n\n"
                f"Include: location, severity, precautions, and source. "
                f"Keep it under 200 words. Be factual and calm."
            )
            result = self.safe_llm_call(prompt, max_tokens=300)
            if result:
                return result + DISCLAIMER

        # Template fallback
        lang_templates = TEMPLATES.get(lang, TEMPLATES["en"])
        template = lang_templates.get(incident_type, lang_templates.get("other", ""))
        try:
            content = self.format_template(template, incident)
        except Exception:
            content = f"Emergency alert for {incident_type} at {incident.get('address', 'unknown location')}."

        return content + DISCLAIMER

    def draft_alert(self, incident: dict) -> dict:
        """
        Generate draft alerts in English, Hindi, and Marathi.
        All drafts remain in DRAFT status and must be approved before publication.
        """
        warnings = []
        data_confidence = incident.get("data_confidence", 1.0)
        if data_confidence < 0.5:
            warnings.append("Low data confidence: verify incident details before publishing.")

        incident_type = incident.get("incident_type", "other")
        if incident_type not in ["flood", "fire", "heatwave", "earthquake", "other"]:
            warnings.append(f"Unrecognized incident type '{incident_type}', using 'other' template.")

        content_en = self.draft_in_language(incident, "en")
        content_hi = self.draft_in_language(incident, "hi")
        content_mr = self.draft_in_language(incident, "mr")

        return {
            "en": content_en,
            "hi": content_hi,
            "mr": content_mr,
            "status": "draft",
            "warnings": warnings,
            "method": "CommunicationAgent",
            "drafted_at": datetime.utcnow().isoformat(),
        }
