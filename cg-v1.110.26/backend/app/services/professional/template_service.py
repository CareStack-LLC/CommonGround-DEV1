"""
Firm template service layer.

Handles CRUD for firm templates and logic for variable injection
into email and message templates.
"""

import re
from datetime import datetime
from typing import Optional, List, Any, Dict
from uuid import uuid4

from sqlalchemy import select, and_, or_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.professional import FirmTemplate, TemplateType, Firm
from app.models.family_file import FamilyFile

class FirmTemplateService:
    """Service for managing firm-wide templates and variable injection."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_templates(
        self,
        firm_id: str,
        template_type: Optional[TemplateType] = None,
        is_active: bool = True,
    ) -> List[FirmTemplate]:
        """List templates for a firm."""
        query = select(FirmTemplate).where(
            and_(
                FirmTemplate.firm_id == firm_id,
                FirmTemplate.is_current == True
            )
        )
        if template_type:
            query = query.where(FirmTemplate.template_type == template_type.value)
        if is_active:
            query = query.where(FirmTemplate.is_active == True)
            
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_template(self, template_id: str) -> Optional[FirmTemplate]:
        """Get a specific template by ID."""
        result = await self.db.execute(
            select(FirmTemplate).where(FirmTemplate.id == template_id)
        )
        return result.scalar_one_or_none()

    async def create_template(
        self,
        firm_id: str,
        user_id: str,
        name: str,
        template_type: TemplateType,
        content: Dict[str, Any],
        description: Optional[str] = None,
    ) -> FirmTemplate:
        """Create a new firm template."""
        template = FirmTemplate(
            id=str(uuid4()),
            firm_id=firm_id,
            created_by=user_id,
            name=name,
            template_type=template_type.value,
            content=content,
            description=description,
            is_active=True,
            is_current=True,
            version=1,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        self.db.add(template)
        await self.db.commit()
        await self.db.refresh(template)
        return template

    async def inject_variables(
        self,
        template_id: str,
        family_file_id: str,
    ) -> Dict[str, str]:
        """
        Fetch a template and inject variables from the specified family file.
        Returns the processed content (e.g., subject and body).
        """
        template = await self.get_template(template_id)
        if not template:
            raise ValueError("Template not found")

        # Fetch family file with relationships for variable sourcing
        result = await self.db.execute(
            select(FamilyFile)
            .where(FamilyFile.id == family_file_id)
            .options(
                selectinload(FamilyFile.parent_a),
                selectinload(FamilyFile.parent_b),
                selectinload(FamilyFile.children)
            )
        )
        family_file = result.scalar_one_or_none()
        if not family_file:
            raise ValueError("Family file not found")

        # Define variables
        variables = {
            "parent_a_name": f"{family_file.parent_a.first_name} {family_file.parent_a.last_name}",
            "parent_b_name": f"{family_file.parent_b.first_name} {family_file.parent_b.last_name}" if family_file.parent_b else "Other Parent",
            "family_file_number": family_file.family_file_number,
            "children_names": ", ".join([f"{c.first_name} {c.last_name}" for c in family_file.children]),
            "case_title": family_file.title,
            "current_date": datetime.now().strftime("%Y-%m-%d"),
        }

        # Process content (inject variables into subject and body)
        content = template.content
        processed = {}
        
        for key, value in content.items():
            if isinstance(value, str):
                processed[key] = self._substitute(value, variables)
            else:
                processed[key] = value

        return processed

    def _substitute(self, text: str, variables: Dict[str, str]) -> str:
        """Helper to replace {{variable}} placeholders."""
        for var, val in variables.items():
            placeholder = "{{" + var + "}}"
            text = text.replace(placeholder, val)
        return text
