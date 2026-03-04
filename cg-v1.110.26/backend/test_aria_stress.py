import sys
import os
import asyncio
import json
from tabulate import tabulate

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

# Inject Env Vars
env_path = os.path.join(os.getcwd(), 'backend', '.env')
real_db_url = None
if os.path.exists(env_path):
    with open(env_path, 'r') as f:
        for line in f:
            if line.startswith('DATABASE_URL='):
                real_db_url = line.split('=', 1)[1].strip().strip('"').strip("'")
                break

os.environ["SECRET_KEY"] = "test"
os.environ["DATABASE_URL"] = real_db_url or "postgresql://user:pass@localhost/db"
os.environ["SUPABASE_URL"] = "https://example.supabase.co"
os.environ["SUPABASE_ANON_KEY"] = "test"
os.environ["SUPABASE_SERVICE_KEY"] = "test"
os.environ["ANTHROPIC_API_KEY"] = "test"
os.environ["OPENAI_API_KEY"] = "test" # Should be set if using actual API, assuming user environment has it or we rely on the hardcoded one in aria_inference.py (which I did hardcode for the prototype)
os.environ["STRIPE_SECRET_KEY"] = "test"
os.environ["STRIPE_PUBLISHABLE_KEY"] = "test"
os.environ["STRIPE_WEBHOOK_SECRET"] = "test"

from app.services.aria import aria_service
from app.services.aria_inference import analyze_message_with_llm

TEST_CASES = [
    # --- CUSTODY WEAPONIZATION (Subtle & Direct) ---
    ("If you don't drop the motion, I'll make sure the kids hate you.", "custody_weaponization"),
    ("Bet you won't see the damn kids again.", "custody_weaponization"),
    ("My lawyer says I'll get full custody easily.", "custody_weaponization"), # Legal threat
    ("The kids don't want to come over this weekend.", "custody_weaponization"), # Gatekeeping/Alienation?
    ("They cry every time they have to go to your house.", "custody_weaponization"), # Alienation
    ("I'm not bringing them until you pay me.", "custody_weaponization"), # + Financial

    # --- FINANCIAL COERCION ---
    ("I'm cutting you off completely.", "financial_coercion"),
    ("Good luck paying rent without my support.", "financial_coercion"),
    ("No money, no kids. Simple as that.", "financial_coercion"),
    ("I will bleed you dry in court.", "financial_coercion"),
    ("Where's my money? sending the invoice again.", "financial_coercion"), # Borderline

    # --- HOSTILITY & INSULTS ---
    ("You are such a narcissist.", "insult"),
    ("Everyone knows you're crazy.", "hostility"),
    ("Stop gaslighting me.", "insult"), # Modern slang
    ("Shut your mouth.", "hostility"),
    ("You're a joke of a parent.", "hostility"),
    ("Mid parent energy.", "insult"), # Slang
    ("L + Ratio", "insult"), # Slang

    # --- THREATS (Physical & General) ---
    ("I'm going to kill you.", "threatening"),
    ("Watch your back.", "threatening"),
    ("You better be careful tonight.", "threatening"),
    ("I know where you sleep.", "threatening"),
    ("Don't make me come over there.", "threatening"),
    
    # --- EVASION / PROFANITY ---
    ("F*ck you", "profanity"),
    ("k i l l yourself", "threatening"),
    ("Go commit toaster bath", "threatening"), # Suicide baiting
    ("Ur a b!tch", "insult"),

    # --- SAFE / FALSE POSITIVES ---
    ("I'm frustrated with the schedule.", "none"),
    ("The kids are sick, can we swap days?", "none"),
    ("Please stop yelling at me.", "none"), # Using "stop" and "yelling" might trigger?
    ("I hate it when it rains.", "none"), # "Hate" keyword but neutral context
    ("I will cut the sandwich in half.", "none"), # "Cut" + "Kill"? (Testing dumb regex)
]

from concurrent.futures import ThreadPoolExecutor, as_completed

def analyze_case(case_data):
    msg, expected = case_data
    
    # 1. Regex (Fast) Analysis
    regex_time_start = time.time()
    regex_res = aria_service.analyze_message(msg)
    regex_duration = time.time() - regex_time_start
    
    fast_verdict = "BLOCK" if regex_res.block_send else ("FLAG" if regex_res.is_flagged else "ALLOW")
    fast_cats = [c.value for c in regex_res.categories]
    
    # 2. LLM (Smart) Analysis
    llm_verdict = "SKIPPED"
    llm_cats_str = ""
    status = ""
    
    # In real hybrid flow, we only LLM if not blocked. 
    # But for stress test, we run BOTH to find gaps.
    try:
        llm_raw = analyze_message_with_llm("test-stress", msg, context=[])
        smart_verdict = llm_raw.get("action", "UNKNOWN")
        smart_cats = [l["name"] for l in llm_raw.get("labels", []) if l["score"] > 0.5]
        llm_verdict = smart_verdict
        llm_cats_str = str(smart_cats[:2])
    except Exception as e:
        llm_verdict = "ERROR"
        smart_verdict = "ERROR"
        smart_cats = []

    # Determine Status
    gap = False
    if expected != "none":
        # We expect a flag
        regex_hit = expected in fast_cats or (expected == "insult" and "profanity" in fast_cats) or (fast_verdict == "BLOCK" and expected in ["threatening", "hate_speech"])
        
        if not regex_hit and smart_verdict in ["FLAG", "WARN_REWRITE", "BLOCK"]:
            status = "⚠️ GAP (ML Saved Us)"
            gap = True
        elif regex_hit:
            status = "✅ PASS (Regex)"
        else:
            status = "❌ FAIL (Both Missed)"
    else:
        # We expect safe
        if fast_verdict != "ALLOW":
            status = "⚠️ FALSE POSITIVE (Regex)"
        elif smart_verdict != "ALLOW" and smart_verdict != "UNKNOWN":
            status = "⚠️ FALSE POSITIVE (LLM)"
        else:
            status = "✅ PASS (Safe)"

    return [
        msg[:40] + "...",
        expected,
        f"{fast_verdict} {fast_cats}",
        f"{llm_verdict} {llm_cats_str}",
        status
    ]

import time

def run_stress_test():
    print(f"\n🚀 STARTING ARIA STRESS TEST ({len(TEST_CASES)} examples)...")
    print("Using ThreadPoolExecutor for parallel LLM calls...")
    
    results = []
    with ThreadPoolExecutor(max_workers=5) as executor:  # 5 parallel calls to avoid rate limit
        future_to_case = {executor.submit(analyze_case, case): case for case in TEST_CASES}
        
        for i, future in enumerate(as_completed(future_to_case)):
            res = future.result()
            results.append(res)
            print(f"[{i+1}/{len(TEST_CASES)}] Analyzed: {res[0]} -> {res[4]}")

    # Sorting for nicer output (by status roughly)
    results.sort(key=lambda x: x[4])

    # Print Table
    headers = ["Message", "Expected", "Regex (Fast)", "LLM (Smart)", "Status"]
    print("\n" + tabulate(results, headers=headers, tablefmt="grid"))
    
    # Summary
    gaps = len([r for r in results if "GAP" in r[4]])
    fps = len([r for r in results if "FALSE POSITIVE" in r[4]])
    fails = len([r for r in results if "FAIL" in r[4]])
    print(f"\nSUMMARY: {gaps} Detection Gaps (caught by ML), {fails} Missed by Both, {fps} False Positives.")

if __name__ == "__main__":
    run_stress_test()
