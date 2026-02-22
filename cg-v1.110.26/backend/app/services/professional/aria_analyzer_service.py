"""
ARIA Analyzer Service.

Provides deep analysis of message threads between parents, including
narrative summaries, communication lags, and fact extraction for professionals.
"""

import json
from datetime import datetime
from typing import List, Dict, Any, Optional

from sqlalchemy import select, and_, asc
from sqlalchemy.ext.asyncio import AsyncSession
from openai import OpenAI

from app.models.message import Message, MessageThread
from app.models.user import User
from app.core.config import settings

class ARIAAnalyzerService:
    """Service for deep AI analysis of parent communication threads."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)

    async def analyze_thread(
        self, 
        family_file_id: str, 
        thread_id: Optional[str] = None,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Perform a full analysis of a message thread (or all messages in a case).
        """
        # 1. Fetch messages
        messages = await self._fetch_messages(family_file_id, thread_id, days)
        if not messages:
            return {
                "summary": "No messages found for the selected period.",
                "lags": {},
                "facts": [],
                "resolution_score": 0,
                "tone_analysis": "N/A"
            }

        # 2. Calculate Lags (Response times)
        lags = self._calculate_lags(messages)

        # 3. Call AI for Summary and Fact Extraction
        analysis = await self._get_ai_analysis(messages)

        return {
            **analysis,
            "lags": lags,
            "message_count": len(messages),
            "analyzed_at": datetime.utcnow().isoformat()
        }

    async def _fetch_messages(
        self, 
        family_file_id: str, 
        thread_id: Optional[str], 
        days: int
    ) -> List[Message]:
        """Fetch messages for analysis."""
        since = datetime.utcnow() - (datetime.utcnow() - datetime.utcnow()) # placeholder
        import datetime as dt
        since = dt.datetime.utcnow() - dt.timedelta(days=days)

        query = select(Message).where(Message.family_file_id == family_file_id)
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
            
            # Only calculate lag if it's a response to the other person
            if prev.sender_id != curr.sender_id:
                delta = (curr.created_at - prev.created_at).total_seconds()
                resp_times.append({
                    "from_user": prev.sender_id,
                    "to_user": curr.sender_id,
                    "seconds": delta
                })

        if not resp_times:
            return {}

        # Aggregate by sender
        stats = {}
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

    async def _get_ai_analysis(self, messages: List[Message]) -> Dict[str, Any]:
        """Use GPT-4 to analyze the thread content."""
        transcript = []
        for m in messages:
            role = "PARENT_A" if m.sender_id == messages[0].sender_id else "PARENT_B" # Simplification
            transcript.append(f"{role} [{m.created_at}]: {m.content}")

        transcript_text = "\n".join(transcript)

        prompt = """You are ARIA, a professional communication analyst for family law cases.
Analyze the following transcript between two parents and provide a professional report.

Return a JSON object with:
{
  "narrative_summary": "A 2-paragraph professional summary of the current state of communication, major topics, and overall tone.",
  "tone_analysis": "Description of the emotional climate (e.g., 'Increasingly hostile', 'Constructive but guarded').",
  "resolution_score": 85, // 0-100 score of how likely they are to resolve issues themselves
  "facts_for_professional": [
    "Fact 1: Mother requested schedule change for Easter.",
    "Fact 2: Father agreed but only if he gets extra time in summer."
  ],
  "conflict_points": [
    "Exchanges happening late consistently",
    "Disagreement over child's soccer practice"
  ],
  "professional_recommendation": "Suggest a mediated session specifically for summer logistics."
}

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
            print(f"ARIA Analysis error: {e}")
            return {
                "narrative_summary": "Error analyzing thread.",
                "tone_analysis": "Error",
                "resolution_score": 0,
                "facts_for_professional": [],
                "conflict_points": [],
                "professional_recommendation": "Manual review required due to system error."
            }
