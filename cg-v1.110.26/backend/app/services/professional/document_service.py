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
from app.models.professional import CaseAssignment, ComplianceReport

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

        Each document category is filtered by the assignment's access scopes:
        agreements/accords need "agreement", reports need "compliance",
        recordings need "circle".
        """
        # 1. Get assigned family file IDs with their granted scopes
        scopes_by_case = await self._get_assigned_scopes(professional_id)
        if not scopes_by_case:
            return [], 0

        if family_file_id:
            if family_file_id not in scopes_by_case:
                return [], 0
            scopes_by_case = {family_file_id: scopes_by_case[family_file_id]}

            # Audit: single-case document views leave a log entry.
            from app.services.professional.assignment_service import (
                CaseAssignmentService,
            )
            await CaseAssignmentService(self.db).log_access(
                professional_id, family_file_id, "view_documents",
                resource_type="documents",
            )

        def _ids_with_scope(scope: str) -> List[str]:
            return [
                ff_id for ff_id, scopes in scopes_by_case.items() if scope in scopes
            ]

        all_docs = []

        # 2. Fetch from various sources, each limited to the cases whose
        # assignment grants the matching data-category scope.

        # Agreements
        if not doc_type or doc_type == DocumentType.AGREEMENT:
            ids = _ids_with_scope("agreement")
            if ids:
                all_docs.extend(await self._get_agreements(ids))

        # Quick Accords
        if not doc_type or doc_type == DocumentType.QUICK_ACCORD:
            ids = _ids_with_scope("agreement")
            if ids:
                all_docs.extend(await self._get_quick_accords(ids))

        # Court Exports (Legacy Reports) & Compliance Reports (New)
        if not doc_type or doc_type == DocumentType.REPORT:
            ids = _ids_with_scope("compliance")
            if ids:
                all_docs.extend(await self._get_reports(ids))
                all_docs.extend(await self._get_compliance_reports(ids))

        # Recordings
        if not doc_type or doc_type == DocumentType.RECORDING:
            ids = _ids_with_scope("circle")
            if ids:
                all_docs.extend(await self._get_recordings(ids))

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

    async def _get_assigned_scopes(self, professional_id: str) -> dict:
        """Map of family_file_id -> set of granted access scopes."""
        result = await self.db.execute(
            select(
                CaseAssignment.family_file_id, CaseAssignment.access_scopes
            ).where(
                and_(
                    CaseAssignment.professional_id == professional_id,
                    CaseAssignment.status == "active",
                )
            )
        )
        return {row[0]: set(row[1] or []) for row in result.fetchall()}

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
                "file_url": f"/api/v1/agreements/{a.id}/pdf", 
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
        
    async def _get_compliance_reports(self, family_file_ids: List[str]) -> List[dict]:
        result = await self.db.execute(
            select(ComplianceReport).where(ComplianceReport.family_file_id.in_(family_file_ids))
        )
        return [
            {
                "id": str(a.id),
                "title": a.title or "Compliance Report",
                "type": DocumentType.REPORT,
                "status": a.status,
                "created_at": a.created_at,
                "family_file_id": str(a.family_file_id),
                # If file_url is stored (completed), use it. Else fall back to generation endpoint (future)
                # For now using a placeholder endpoint that we might need to create or exposing the file_url
                "file_url": a.file_url or f"/api/v1/professional/reports/{a.id}/download", 
                "description": f"Professional Compliance Report ({a.export_format})"
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
