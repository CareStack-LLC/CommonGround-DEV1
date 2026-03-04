"""
Professional Tasks CRUD service for Phase 1 dashboard.
Handles create, list, update, and delete for professional_tasks table.
"""
from datetime import datetime
from typing import Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class ProfessionalTaskService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_tasks(
        self,
        professional_id: str,
        completed: Optional[bool] = None,
        priority: Optional[str] = None,
        case_id: Optional[str] = None,
        limit: int = 50,
    ) -> list[dict]:
        base = """
            SELECT id, professional_id, case_id, title, description,
                   due_date, priority, completed, completed_at, created_at, updated_at
            FROM professional_tasks
            WHERE professional_id = :pid
        """
        params: dict = {"pid": professional_id, "limit": limit}
        if completed is not None:
            base += " AND completed = :completed"
            params["completed"] = completed
        if priority:
            base += " AND priority = :priority"
            params["priority"] = priority
        if case_id:
            base += " AND case_id = :case_id"
            params["case_id"] = case_id
        base += " ORDER BY CASE WHEN due_date IS NULL THEN 1 ELSE 0 END, due_date ASC, created_at DESC LIMIT :limit"
        result = await self.db.execute(text(base), params)
        return [dict(r._mapping) for r in result.fetchall()]

    async def create_task(
        self,
        professional_id: str,
        title: str,
        description: Optional[str] = None,
        case_id: Optional[str] = None,
        due_date: Optional[datetime] = None,
        priority: str = "medium",
    ) -> dict:
        result = await self.db.execute(
            text("""
                INSERT INTO professional_tasks
                  (professional_id, case_id, title, description, due_date, priority)
                VALUES (:pid, :cid, :title, :desc, :due, :prio)
                RETURNING id, professional_id, case_id, title, description,
                          due_date, priority, completed, completed_at, created_at, updated_at
            """),
            {"pid": professional_id, "cid": case_id, "title": title,
             "desc": description, "due": due_date, "prio": priority},
        )
        await self.db.commit()
        row = result.fetchone()
        return dict(row._mapping) if row else {}

    async def update_task(
        self,
        task_id: str,
        professional_id: str,
        **kwargs,
    ) -> Optional[dict]:
        updates: list[str] = []
        params: dict = {"task_id": task_id, "pid": professional_id}

        field_map = {
            "title": "title = :title",
            "description": "description = :desc",
            "due_date": "due_date = :due",
            "priority": "priority = :prio",
        }
        param_map = {"title": "title", "description": "desc", "due_date": "due", "priority": "prio"}

        for field, clause in field_map.items():
            if field in kwargs and kwargs[field] is not None:
                updates.append(clause)
                params[param_map[field]] = kwargs[field]

        if "completed" in kwargs and kwargs["completed"] is not None:
            updates.append("completed = :completed")
            params["completed"] = kwargs["completed"]
            updates.append("completed_at = :cat")
            params["cat"] = datetime.utcnow() if kwargs["completed"] else None

        if not updates:
            return None

        set_clause = ", ".join(updates)
        result = await self.db.execute(
            text(f"""
                UPDATE professional_tasks SET {set_clause}
                WHERE id = :task_id AND professional_id = :pid
                RETURNING id, professional_id, case_id, title, description,
                          due_date, priority, completed, completed_at, created_at, updated_at
            """),
            params,
        )
        await self.db.commit()
        row = result.fetchone()
        return dict(row._mapping) if row else None

    async def delete_task(self, task_id: str, professional_id: str) -> bool:
        result = await self.db.execute(
            text("DELETE FROM professional_tasks WHERE id = :tid AND professional_id = :pid RETURNING id"),
            {"tid": task_id, "pid": professional_id},
        )
        await self.db.commit()
        return result.fetchone() is not None
