"""
ARIA Analyzer Service.

Provides deep analysis of message threads between parents, including
narrative summaries, communication lags, fact extraction, and V2
Sentinel Shield enrichment for professionals.
"""

import hashlib
import json
import logging
from collections import defaultdict
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

from sqlalchemy import select, and_, asc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.models.message import Message, MessageFlag
from app.models.user import User
from app.core.config import settings
from app.core.ai_clients import get_openai


class ARIAAnalyzerService:
    """Service for deep AI analysis of parent communication threads."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.openai_client = get_openai()

    async def analyze_thread(
        self,
        family_file_id: str,
        thread_id: Optional[str] = None,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Perform a full analysis of a message thread (or all messages in a case).
        Includes V2 Sentinel Shield enrichment when available.
        """
        messages = await self._fetch_messages(family_file_id, thread_id, days)
        if not messages:
            return {
                "summary": "No messages found for the selected period.",
                "lags": {},
                "facts": [],
                "resolution_score": 0,
                "tone_analysis": "N/A",
                "message_count": 0,
                "analyzed_at": datetime.utcnow().isoformat(),
            }

        lags = self._calculate_lags(messages)
        v2_stats = self._compute_v2_stats(messages)
        analysis = await self._get_ai_analysis(messages, v2_stats)

        result = {
            **analysis,
            "lags": lags,
            "message_count": len(messages),
            "analyzed_at": datetime.utcnow().isoformat(),
            # V2 computed data for frontend charts
            **v2_stats,
        }

        # Verification hash over the full analysis payload
        hash_payload = json.dumps(result, sort_keys=True, default=str)
        result["verification"] = {
            "data_hash": hashlib.sha256(hash_payload.encode()).hexdigest(),
            "message_count": len(messages),
            "date_range": {
                "start": (datetime.utcnow() - timedelta(days=days)).isoformat(),
                "end": datetime.utcnow().isoformat(),
            },
            "generated_at": datetime.utcnow().isoformat(),
        }

        return result

    async def _fetch_messages(
        self,
        family_file_id: str,
        thread_id: Optional[str],
        days: int
    ) -> List[Message]:
        """Fetch messages with eager-loaded flags for V2 enrichment."""
        since = datetime.utcnow() - timedelta(days=days)

        query = (
            select(Message)
            .options(selectinload(Message.flags))
            .where(Message.family_file_id == family_file_id)
        )
        if thread_id:
            query = query.where(Message.thread_id == thread_id)

        query = query.where(Message.created_at >= since).order_by(asc(Message.created_at))

        result = await self.db.execute(query)
        return list(result.scalars().all())

    def _calculate_lags(self, messages: List[Message]) -> Dict[str, Any]:
        """Calculate response time statistics between parents."""
        if len(messages) < 2:
            return {}

        resp_times = []
        for i in range(1, len(messages)):
            prev = messages[i-1]
            curr = messages[i]

            if prev.sender_id != curr.sender_id:
                delta = (curr.created_at - prev.created_at).total_seconds()
                resp_times.append({
                    "from_user": prev.sender_id,
                    "to_user": curr.sender_id,
                    "seconds": delta
                })

        if not resp_times:
            return {}

        stats: Dict[str, list] = {}
        for r in resp_times:
            uid = r["to_user"]
            if uid not in stats:
                stats[uid] = []
            stats[uid].append(r["seconds"])

        final_stats = {}
        for uid, times in stats.items():
            avg = sum(times) / len(times)
            final_stats[uid] = {
                "average_response_time_hours": round(avg / 3600, 2),
                "max_response_time_hours": round(max(times) / 3600, 2),
                "response_count": len(times)
            }

        return final_stats

    def _compute_v2_stats(self, messages: List[Message]) -> Dict[str, Any]:
        """Compute V2 summary statistics from eager-loaded message flags."""
        heat_timeline: List[Dict] = []
        domain_totals: Dict[str, Dict] = defaultdict(lambda: {"total": 0.0, "count": 0})
        category_totals: Dict[str, Dict] = defaultdict(
            lambda: {"count": 0, "conf_total": 0.0, "conf_count": 0}
        )
        legal_flags: List[Dict] = []
        time_signal_counts: Dict[str, int] = defaultdict(int)
        pattern_counts: Dict[str, int] = defaultdict(int)

        legal_categories = {
            "threats", "grooming", "hate_speech", "sexual_harassment",
            "custody_weaponization", "parental_alienation",
        }

        first_sender = messages[0].sender_id if messages else None

        for msg in messages:
            if not msg.flags:
                continue
            for flag in msg.flags:
                parent_label = "parent_a" if msg.sender_id == first_sender else "parent_b"

                # Heat timeline
                if flag.window_heat_score is not None:
                    heat_timeline.append({
                        "date": msg.created_at.isoformat(),
                        parent_label: round(flag.window_heat_score, 2),
                    })

                # Domain aggregation
                if isinstance(flag.domain_scores, dict):
                    for domain, score in flag.domain_scores.items():
                        domain_totals[domain]["total"] += float(score)
                        domain_totals[domain]["count"] += 1

                # Category aggregation
                if isinstance(flag.v2_categories, list):
                    conf = flag.category_confidence if isinstance(flag.category_confidence, dict) else {}
                    for cat in flag.v2_categories:
                        category_totals[cat]["count"] += 1
                        if cat in conf:
                            category_totals[cat]["conf_total"] += float(conf[cat])
                            category_totals[cat]["conf_count"] += 1

                # Legal flags
                if isinstance(flag.reporting_tags, list):
                    for tag in flag.reporting_tags:
                        pattern_counts[tag] += 1
                        if tag in legal_categories:
                            legal_flags.append({
                                "date": msg.created_at.isoformat(),
                                "category": tag,
                                "severity": flag.severity or "unknown",
                                "parent": "Parent A" if msg.sender_id == first_sender else "Parent B",
                            })

                # Time signals
                if isinstance(flag.time_frequency_flags, list):
                    for sig in flag.time_frequency_flags:
                        time_signal_counts[sig] += 1

        v2_domain_summary = {
            domain: {
                "count": data["count"],
                "avg_score": round(data["total"] / data["count"], 3),
            }
            for domain, data in domain_totals.items()
        }

        v2_category_summary = {
            cat: {
                "count": data["count"],
                "avg_confidence": round(data["conf_total"] / data["conf_count"], 3)
                if data["conf_count"] > 0 else None,
            }
            for cat, data in category_totals.items()
        }

        return {
            "v2_heat_timeline": heat_timeline,
            "v2_domain_summary": v2_domain_summary,
            "v2_category_summary": v2_category_summary,
            "v2_legal_flags": legal_flags,
            "v2_time_signal_distribution": dict(time_signal_counts),
            "v2_session_patterns": dict(pattern_counts),
        }

    async def _get_ai_analysis(
        self, messages: List[Message], v2_stats: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Use GPT-4o to analyze the thread with V2 enrichment context."""
        transcript = []
        first_sender = messages[0].sender_id if messages else None

        for m in messages:
            role = "PARENT_A" if m.sender_id == first_sender else "PARENT_B"
            line = f"{role} [{m.created_at}]: {m.content}"

            # Append V2 flag context if available
            if m.flags:
                for flag in m.flags:
                    parts = []
                    if flag.window_heat_score is not None:
                        parts.append(f"heat={flag.window_heat_score:.1f}")
                    if isinstance(flag.domain_scores, dict) and flag.domain_scores:
                        domain_str = ", ".join(
                            f"{d}:{s:.2f}" for d, s in flag.domain_scores.items()
                        )
                        parts.append(f"domains={{{domain_str}}}")
                    if isinstance(flag.v2_categories, list) and flag.v2_categories:
                        conf = flag.category_confidence if isinstance(flag.category_confidence, dict) else {}
                        cat_str = ", ".join(
                            f"{c}({conf.get(c, 0):.2f})" if c in conf else c
                            for c in flag.v2_categories
                        )
                        parts.append(f"categories=[{cat_str}]")
                    if isinstance(flag.time_frequency_flags, list) and flag.time_frequency_flags:
                        parts.append(f"time_signals={flag.time_frequency_flags}")
                    if parts:
                        line += f"\n  [ARIA V2: {', '.join(parts)}]"

            transcript.append(line)

        transcript_text = "\n".join(transcript)

        # Build V2 context summary for the prompt
        v2_context = ""
        if v2_stats.get("v2_domain_summary"):
            v2_context += "\nV2 Domain Summary (aggregated across all messages):\n"
            for domain, data in v2_stats["v2_domain_summary"].items():
                v2_context += f"  {domain}: {data['count']} occurrences, avg score {data['avg_score']}\n"
        if v2_stats.get("v2_legal_flags"):
            v2_context += f"\nLegal Flags: {len(v2_stats['v2_legal_flags'])} instances detected\n"
        if v2_stats.get("v2_time_signal_distribution"):
            v2_context += f"\nTime Signals: {json.dumps(v2_stats['v2_time_signal_distribution'])}\n"

        prompt = f"""You are ARIA, a professional communication analyst for family law cases.
Analyze the following transcript between two parents and provide a professional, court-ready report.

The transcript includes ARIA V2 Sentinel Shield annotations where available:
- heat: escalation score (0-5 scale, >3.0 = high concern)
- domains: 8 behavioral domains (CTRL=Control, THRT=Threats, PSYB=Psychological Burden,
  CONT=Contempt, ALNT=Alienation, ESCP=Escalation, PAGG=Passive Aggression, MNIP=Manipulation)
- categories: 32 specific behavior categories with confidence scores
- time_signals: temporal patterns (rapid_fire, off_hours, weekend_cluster, etc.)
{v2_context}

Return a JSON object with:
{{
  "narrative_summary": "A 2-3 paragraph professional summary of the communication dynamics, major topics, behavioral patterns, and overall trajectory. Reference specific V2 domain patterns where relevant.",
  "tone_analysis": "Description of the emotional climate (e.g., 'Hostile with escalating control patterns', 'Cooperative but guarded').",
  "resolution_score": 85,
  "facts_for_professional": [
    "Fact 1: ...",
    "Fact 2: ..."
  ],
  "conflict_points": [
    "Point 1: ...",
    "Point 2: ..."
  ],
  "professional_recommendation": "Specific, actionable recommendation for the legal professional.",
  "v2_domain_analysis": {{
    "primary_concerns": ["CTRL", "THRT"],
    "domain_trend": "escalating" | "stable" | "de-escalating",
    "domain_summary": "Brief analysis of which domains are most active and why."
  }},
  "v2_heat_trajectory": {{
    "trend": "escalating" | "stable" | "cooling",
    "summary": "Brief description of how conversation heat has changed over the period."
  }},
  "v2_pattern_insights": [
    "Insight about recurring communication patterns..."
  ],
  "v2_risk_assessment": {{
    "level": "low" | "moderate" | "elevated" | "high" | "critical",
    "factors": ["factor1", "factor2"],
    "summary": "Brief risk summary for the professional."
  }},
  "v2_legal_observations": [
    "Observation relevant to legal proceedings..."
  ]
}}

Transcript:
"""

        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": transcript_text}
                ],
                response_format={"type": "json_object"}
            )
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            logger.error("ARIA Analysis error: %s", e)
            return {
                "narrative_summary": "Error analyzing thread.",
                "tone_analysis": "Error",
                "resolution_score": 0,
                "facts_for_professional": [],
                "conflict_points": [],
                "professional_recommendation": "Manual review required due to system error.",
                "v2_domain_analysis": None,
                "v2_heat_trajectory": None,
                "v2_pattern_insights": [],
                "v2_risk_assessment": None,
                "v2_legal_observations": [],
            }
