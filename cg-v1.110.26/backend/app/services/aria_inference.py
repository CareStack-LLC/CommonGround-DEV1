"""
ARIA Inference Service (The "Smart Path")
Implements LLM-as-a-Classifier for high-nuance toxicity detection.
"""

import os
import json
from typing import Dict, Any, List, Optional
from datetime import datetime
from openai import OpenAI
# from app.core.config import settings # In production, use settings

# --- CONFIGURATION ---
# Using the key provided by the user for this implementation
# In a real deployment, this would be in os.environ ("OPENAI_API_KEY")
API_KEY = os.environ.get("OPENAI_API_KEY")
if not API_KEY:
    # Fallback to prevent crash if not set, but won't work for inference
    print("WARNING: OPENAI_API_KEY not found in environment")

client = OpenAI(api_key=API_KEY)

ARIA_SYSTEM_PROMPT = """
You are ARIA (AI-Powered Relationship Intelligence Assistant), a court-grade safety monitor for co-parenting communication.
Your goal is to detect toxic conflict, psychological coercion, and safety risks in messages between parents.

You must output a JSON object adhering strictly to this schema:
{
  "labels": [
    {"name": "ThreatPhysical", "score": 0.0-1.0},
    {"name": "CustodyWeaponization", "score": 0.0-1.0},
    {"name": "FinancialCoercion", "score": 0.0-1.0},
    {"name": "Hostility", "score": 0.0-1.0},
    {"name": "Insult", "score": 0.0-1.0},
    {"name": "Manipulation", "score": 0.0-1.0},
    {"name": "SexualHarassment", "score": 0.0-1.0},
    {"name": "HateSpeech", "score": 0.0-1.0}
  ],
  "severity": 0.0-1.0,  // Overall toxicity severity
  "target": "other_parent" | "child" | "court" | "self" | "none",
  "action": "ALLOW" | "FLAG" | "WARN_REWRITE" | "BLOCK",
  "explanation": "Brief, neutral, objection-style explanation (e.g., 'Message contains implied threat to withhold custody')."
}

### Detection Rules:
1. **BLOCK**: Threats of physical harm, sexual harassment, or explicit hate speech.
2. **WARN_REWRITE**: Custody weaponization (denying access), financial coercion, severe hostility.
3. **FLAG**: Passive aggressiveness, mild insults, blame.
4. **ALLOW**: Neutral, logistical, or constructive communication.

### Context:
*   The message is for permanent court records.
*   Be sensitive to "lawfare" (using legal threats to intimidate).
*   Detect "Gaslighting" (denying reality/feelings) and "Parental Alienation" (turning child against parent).
"""

def analyze_message_with_llm(
    message_id: str,
    text: str,
    context: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Analyzes a message using OpenAI GPT-4o-mini (or available model).
    Returns the strict JSON classification.
    """
    
    context_str = "\n".join(context) if context else "No prior context."
    
    user_prompt = f"""
    Message ID: {message_id}
    Previous Context:
    {context_str}
    
    Current Message to Analyze:
    "{text}"
    """

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini", # efficient for classification
            messages=[
                {"role": "system", "content": ARIA_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.1, # Low temperature for consistent classification
            max_tokens=500
        )
        
        result_json = response.choices[0].message.content
        return json.loads(result_json)

    except Exception as e:
        print(f"ARIA Inference Error: {e}")
        # Fallback safe response
        return {
            "labels": [],
            "severity": 0.0,
            "target": "none",
            "action": "ALLOW",
            "explanation": "Analysis failed, defaulting to safe allow.",
            "error": str(e)
        }

# --- TEST HARNESS ---
if __name__ == "__main__":
    # verification
    msg = "If you don't drop the motion, I'll make sure the kids hate you forever."
    print(f"Testing Analysis on: '{msg}'")
    result = analyze_message_with_llm("test-123", msg)
    print(json.dumps(result, indent=2))
