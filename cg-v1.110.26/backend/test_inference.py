import sys
import os

# Add the project root to the python path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.services.aria_inference import analyze_message_with_llm
import json

if __name__ == "__main__":
    msg = "If you don't drop the motion, I'll make sure the kids hate you forever."
    print(f"Testing Analysis on: '{msg}'")
    
    # Run analysis
    result = analyze_message_with_llm("test-123", msg)
    
    print("\n--- Inference Result ---")
    print(json.dumps(result, indent=2))
