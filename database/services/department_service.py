"""
Department Service - Database Operations for Departments
"""
from typing import Optional, List
from datetime import datetime
from ..base import get_db_session
from ..models.department import Department as DBDepartment
from core.security import Department as CoreDepartment


class DepartmentService:
    """Department Service - Bridge between API and Database"""
    
    @staticmethod
    def get_all_departments() -> List[CoreDepartment]:
        """Get all departments from database"""
        with get_db_session() as session:
            db_depts = session.query(DBDepartment).all()
            print(f"📊 [DATABASE] Retrieved {len(db_depts)} departments from database")
            return [DepartmentService._db_to_core_dept(db_dept) for db_dept in db_depts]
    
    @staticmethod
    def save_department(dept: CoreDepartment) -> CoreDepartment:
        """Save department to database"""
        with get_db_session() as session:
            db_dept = session.query(DBDepartment).filter_by(id=dept.id).first()
            if db_dept:
                print(f"💾 [DATABASE] Updating department in database: {dept.name} (ID: {dept.id[:8]}...)")
                db_dept.name = dept.name
                db_dept.description = dept.description
                db_dept.parent_id = dept.parent_id
                db_dept.manager_id = dept.manager_id
                db_dept.updated_at = datetime.utcnow()
                print(f"✅ [DATABASE] Department updated successfully: {dept.name}")
            else:
                print(f"💾 [DATABASE] Creating new department in database: {dept.name} (ID: {dept.id[:8]}...)")
                db_dept = DBDepartment(
                    id=dept.id,
                    org_id=dept.org_id,
                    name=dept.name,
                    description=dept.description,
                    parent_id=dept.parent_id,
                    manager_id=dept.manager_id,
                    created_at=datetime.fromisoformat(dept.created_at) if dept.created_at else datetime.utcnow(),
                    updated_at=datetime.fromisoformat(dept.updated_at) if dept.updated_at else datetime.utcnow()
                )
                session.add(db_dept)
                print(f"✅ [DATABASE] Department created successfully: {dept.name}")
            session.commit()
            session.refresh(db_dept)
            return DepartmentService._db_to_core_dept(db_dept)
    
    @staticmethod
    def _db_to_core_dept(db_dept: DBDepartment) -> CoreDepartment:
        """Convert database Department to core Department model"""
        return CoreDepartment(
            id=str(db_dept.id),
            org_id=str(db_dept.org_id),
            name=db_dept.name,
            description=db_dept.description,
            parent_id=str(db_dept.parent_id) if db_dept.parent_id else None,
            manager_id=str(db_dept.manager_id) if db_dept.manager_id else None,
            created_at=db_dept.created_at.isoformat() if db_dept.created_at else datetime.utcnow().isoformat(),
            updated_at=db_dept.updated_at.isoformat() if db_dept.updated_at else datetime.utcnow().isoformat()
        )

