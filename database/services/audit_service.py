"""
Audit Service - Database Operations for Audit Logs
"""
from typing import Optional, List
from datetime import datetime
from ..base import get_db_session
from ..models.audit import AuditLog as DBAuditLog
from core.security import AuditLog as CoreAuditLog, ActionType, ResourceType


class AuditService:
    """Audit Service - Bridge between API and Database"""
    
    @staticmethod
    def get_all_audit_logs(limit: int = 1000) -> List[CoreAuditLog]:
        """Get all audit logs from database (limited)"""
        with get_db_session() as session:
            db_logs = session.query(DBAuditLog).order_by(DBAuditLog.timestamp.desc()).limit(limit).all()
            return [AuditService._db_to_core_log(db_log) for db_log in db_logs]
    
    @staticmethod
    def save_audit_log(log: CoreAuditLog) -> CoreAuditLog:
        """Save audit log to database"""
        with get_db_session() as session:
            action_str = log.action.value if isinstance(log.action, ActionType) else str(log.action)
            resource_str = log.resource_type.value if isinstance(log.resource_type, ResourceType) else str(log.resource_type)
            db_log = DBAuditLog(
                id=log.id,
                org_id=log.org_id,
                user_id=log.user_id,
                user_email=log.user_email,
                user_name=log.user_name,
                session_id=log.session_id,
                action=action_str,
                resource_type=resource_str,
                resource_id=log.resource_id,
                resource_name=log.resource_name,
                description=log.details.get('description', '') if log.details else '',
                changes=log.changes,
                extra_metadata=log.details,
                success=log.success,
                error_message=log.error_message,
                http_method=log.request_method,
                http_path=log.request_path,
                http_status_code=None,  # Not in core model
                ip_address=log.ip_address or '',
                user_agent=log.user_agent,
                timestamp=datetime.fromisoformat(log.timestamp) if isinstance(log.timestamp, str) else log.timestamp if isinstance(log.timestamp, datetime) else datetime.utcnow()
            )
            session.add(db_log)
            session.commit()
            session.refresh(db_log)
            return AuditService._db_to_core_log(db_log)
    
    @staticmethod
    def _db_to_core_log(db_log: DBAuditLog) -> CoreAuditLog:
        """Convert database AuditLog to core AuditLog model"""
        # Parse action and resource_type
        try:
            action = ActionType(db_log.action)
        except (ValueError, AttributeError):
            action = ActionType.OTHER
        
        try:
            resource_type = ResourceType(db_log.resource_type)
        except (ValueError, AttributeError):
            resource_type = ResourceType.OTHER
        
        # Build details dict
        details = {}
        if db_log.extra_metadata:
            if isinstance(db_log.extra_metadata, str):
                import json
                details = json.loads(db_log.extra_metadata)
            elif isinstance(db_log.extra_metadata, dict):
                details = db_log.extra_metadata
        if db_log.description:
            details['description'] = db_log.description
        
        return CoreAuditLog(
            id=str(db_log.id),
            org_id=str(db_log.org_id),
            user_id=str(db_log.user_id) if db_log.user_id else '',
            user_email=db_log.user_email or '',
            user_name=db_log.user_name or '',
            session_id=str(db_log.session_id) if db_log.session_id else None,
            action=action,
            resource_type=resource_type,
            resource_id=str(db_log.resource_id) if db_log.resource_id else None,
            resource_name=db_log.resource_name,
            details=details,
            changes=db_log.changes if db_log.changes else None,
            ip_address=db_log.ip_address,
            user_agent=db_log.user_agent,
            request_id=None,  # Not in DB model
            request_path=db_log.http_path,
            request_method=db_log.http_method,
            success=db_log.success,
            error_message=db_log.error_message,
            timestamp=db_log.timestamp.isoformat() if db_log.timestamp else datetime.utcnow().isoformat()
        )

