"""
Professional document service layer.

Aggregates documents from various sources (agreements, reports, recordings, 
attachments) into a unified document view for professionals.
"""

from datetime import datetime
from typing import Optional, List, Any
from enum import Enum

from sqlalchemy import select, and_, or_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.family_file import FamilyFile, QuickAccord
from app.models.agreement import Agreement
from app.models.legal import CourtExport
from app.models.recording import Recording
from app.models.message_attachment import MessageAttachment
from app.models.professional import CaseAssignment

class DocumentType(str, Enum):
    AGREEMENT = "agreement"
    QUICK_ACCORD = "quick_accord"
    REPORT = "report"
    RECORDING = "recording"
    ATTACHMENT = "attachment"
    COURT_ORDER = "court_order"

class ProfessionalDocumentService:
    """Service for managing and retrieving case documents for professionals."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_documents(
        self,
        professional_id: str,
        family_file_id: Optional[str] = None,
        doc_type: Optional[DocumentType] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[List[dict], int]:
        """
        List documents accessible to a professional.
        If family_file_id is provided, only show docs for that case.
        Otherwise, show docs across all assigned cases.
        """
        # 1. Get assigned family file IDs
        assigned_ids = await self._get_assigned_ids(professional_id)
        if not assigned_ids:
            return [], 0
            
        if family_file_id:
            if family_file_id not in assigned_ids:
                return [], 0
            target_ids = [family_file_id]
        else:
            target_ids = assigned_ids

        all_docs = []

        # 2. Fetch from various sources (Simplified for now)
        # In a real implementation, we might union these or fetch in parallel
        
        # Agreements
        if not doc_type or doc_type == DocumentType.AGREEMENT:
            agreements = await self._get_agreements(target_ids)
            all_docs.extend(agreements)

        # Quick Accords
        if not doc_type or doc_type == DocumentType.QUICK_ACCORD:
            accords = await self._get_quick_accords(target_ids)
            all_docs.extend(accords)

        # Court Exports (Reports)
        if not doc_type or doc_type == DocumentType.REPORT:
            reports = await self._get_reports(target_ids)
            all_docs.extend(reports)

        # Recordings
        if not doc_type or doc_type == DocumentType.RECORDING:
            recordings = await self._get_recordings(target_ids)
            all_docs.extend(recordings)

        # 3. Filtering and Sorting
        if search:
            search_low = search.lower()
            all_docs = [
                d for d in all_docs 
                if search_low in d["title"].lower() or (d.get("description") and search_low in d["description"].lower())
            ]

        # Sort by date descending
        all_docs.sort(key=lambda x: x["created_at"], reverse=True)

        total = len(all_docs)
        paged_docs = all_docs[skip : skip + limit]

        return paged_docs, total

    async def _get_assigned_ids(self, professional_id: str) -> List[str]:
        result = await self.db.execute(
            select(CaseAssignment.family_file_id).where(
                and_(
                    CaseAssignment.professional_id == professional_id,
                    CaseAssignment.status == "active"
                )
            )
        )
        return [row[0] for row in result.fetchall()]

    async def _get_agreements(self, family_file_ids: List[str]) -> List[dict]:
        result = await self.db.execute(
            select(Agreement).where(Agreement.family_file_id.in_(family_file_ids))
        )
        return [
            {
                "id": str(a.id),
                "title": a.title,
                "type": DocumentType.AGREEMENT,
                "status": a.status,
                "created_at": a.created_at,
                "family_file_id": str(a.family_file_id),
                "file_url": f"/api/v1/agreements/{a.id}/pdf", # Placeholder
                "description": f"Version {a.version} - {a.agreement_type}"
            }
            for a in result.scalars().all()
        ]

    async def _get_quick_accords(self, family_file_ids: List[str]) -> List[dict]:
        result = await self.db.execute(
            select(QuickAccord).where(QuickAccord.family_file_id.in_(family_file_ids))
        )
        return [
            {
                "id": str(a.id),
                "title": a.title,
                "type": DocumentType.QUICK_ACCORD,
                "status": a.status,
                "created_at": a.created_at,
                "family_file_id": str(a.family_file_id),
                "file_url": a.pdf_url,
                "description": a.purpose_category
            }
            for a in result.scalars().all()
        ]

    async def _get_reports(self, family_file_ids: List[str]) -> List[dict]:
        result = await self.db.execute(
            select(CourtExport).where(CourtExport.case_id.in_(family_file_ids))
        )
        return [
            {
                "id": str(a.id),
                "title": f"Report: {a.package_type}",
                "type": DocumentType.REPORT,
                "status": a.status,
                "created_at": a.created_at,
                "family_file_id": str(a.case_id),
                "file_url": a.pdf_url,
                "description": f"Generated for {a.generated_for}"
            }
            for a in result.scalars().all()
        ]

    async def _get_recordings(self, family_file_ids: List[str]) -> List[dict]:
        result = await self.db.execute(
            select(Recording).where(Recording.family_file_id.in_(family_file_ids))
        )
        return [
            {
                "id": str(a.id),
                "title": f"Recording: {a.recording_type}",
                "type": DocumentType.RECORDING,
                "status": a.status,
                "created_at": a.created_at,
                "family_file_id": str(a.family_file_id),
                "file_url": a.storage_path,
                "description": f"Duration: {a.duration_seconds}s"
            }
            for a in result.scalars().all()
        ]
