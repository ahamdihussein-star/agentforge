"""
SystemSettings Service - Database Operations for System Settings
"""
import json
from typing import Optional, Dict, Any
from datetime import datetime
from ..base import get_db_session
from ..models.settings import SystemSetting as DBSystemSetting, OrganizationSetting as DBOrganizationSetting


class SystemSettingsService:
    """SystemSettings Service - Bridge between API and Database"""
    
    @staticmethod
    def get_system_setting(key: str) -> Optional[Any]:
        """Get a system setting by key"""
        with get_db_session() as session:
            db_setting = session.query(DBSystemSetting).filter_by(key=key).first()
            if not db_setting:
                return None
            print(f"📊 [DATABASE] Retrieved system setting from database: {key}")
            
            # Parse value based on type
            if db_setting.value_type == 'json':
                if isinstance(db_setting.value, str):
                    return json.loads(db_setting.value)
                return db_setting.value
            elif db_setting.value_type == 'number':
                if isinstance(db_setting.value, str):
                    try:
                        return float(db_setting.value) if '.' in db_setting.value else int(db_setting.value)
                    except ValueError:
                        return db_setting.value
                return db_setting.value
            elif db_setting.value_type == 'boolean':
                if isinstance(db_setting.value, str):
                    return db_setting.value.lower() in ('true', '1', 'yes')
                return bool(db_setting.value)
            else:
                # string
                return str(db_setting.value) if db_setting.value else None
    
    @staticmethod
    def get_all_system_settings() -> Dict[str, Any]:
        """Get all system settings as a dictionary"""
        with get_db_session() as session:
            db_settings = session.query(DBSystemSetting).all()
            print(f"📊 [DATABASE] Retrieved {len(db_settings)} system settings from database")
            result = {}
            for db_setting in db_settings:
                result[db_setting.key] = SystemSettingsService.get_system_setting(db_setting.key)
            return result
    
    @staticmethod
    def set_system_setting(key: str, value: Any, value_type: str = None, category: str = None, description: str = None, updated_by: str = None):
        """Set a system setting"""
        with get_db_session() as session:
            db_setting = session.query(DBSystemSetting).filter_by(key=key).first()
            
            # Determine value type if not provided
            if not value_type:
                if isinstance(value, bool):
                    value_type = 'boolean'
                elif isinstance(value, (int, float)):
                    value_type = 'number'
                elif isinstance(value, (dict, list)):
                    value_type = 'json'
                else:
                    value_type = 'string'
            
            # Serialize value
            if value_type == 'json':
                serialized_value = json.dumps(value) if not isinstance(value, str) else value
            else:
                serialized_value = str(value)
            
            if db_setting:
                # Update existing
                print(f"💾 [DATABASE] Updating system setting in database: {key}")
                db_setting.value = serialized_value
                db_setting.value_type = value_type
                if category:
                    db_setting.category = category
                if description:
                    db_setting.description = description
                if updated_by:
                    db_setting.updated_by = updated_by
                db_setting.updated_at = datetime.utcnow()
                print(f"✅ [DATABASE] System setting updated successfully: {key}")
            else:
                # Create new
                print(f"💾 [DATABASE] Creating new system setting in database: {key}")
                db_setting = DBSystemSetting(
                    key=key,
                    value=serialized_value,
                    value_type=value_type,
                    category=category or 'general',
                    description=description,
                    updated_by=updated_by
                )
                session.add(db_setting)
                print(f"✅ [DATABASE] System setting created successfully: {key}")
            session.commit()
    
    @staticmethod
    def get_organization_setting(org_id: str, key: str) -> Optional[Any]:
        """Get an organization setting by key"""
        with get_db_session() as session:
            db_setting = session.query(DBOrganizationSetting).filter_by(org_id=org_id, key=key).first()
            if not db_setting:
                return None
            
            # Parse value based on type (same logic as system settings)
            if db_setting.value_type == 'json':
                if isinstance(db_setting.value, str):
                    return json.loads(db_setting.value)
                return db_setting.value
            elif db_setting.value_type == 'number':
                if isinstance(db_setting.value, str):
                    try:
                        return float(db_setting.value) if '.' in db_setting.value else int(db_setting.value)
                    except ValueError:
                        return db_setting.value
                return db_setting.value
            elif db_setting.value_type == 'boolean':
                if isinstance(db_setting.value, str):
                    return db_setting.value.lower() in ('true', '1', 'yes')
                return bool(db_setting.value)
            else:
                return str(db_setting.value) if db_setting.value else None
    
    @staticmethod
    def get_all_organization_settings(org_id: str) -> Dict[str, Any]:
        """Get all organization settings as a dictionary"""
        with get_db_session() as session:
            db_settings = session.query(DBOrganizationSetting).filter_by(org_id=org_id).all()
            result = {}
            for db_setting in db_settings:
                result[db_setting.key] = SystemSettingsService.get_organization_setting(org_id, db_setting.key)
            return result
    
    @staticmethod
    def set_organization_setting(org_id: str, key: str, value: Any, value_type: str = None, category: str = None, updated_by: str = None):
        """Set an organization setting"""
        with get_db_session() as session:
            db_setting = session.query(DBOrganizationSetting).filter_by(org_id=org_id, key=key).first()
            
            # Determine value type if not provided
            if not value_type:
                if isinstance(value, bool):
                    value_type = 'boolean'
                elif isinstance(value, (int, float)):
                    value_type = 'number'
                elif isinstance(value, (dict, list)):
                    value_type = 'json'
                else:
                    value_type = 'string'
            
            # Serialize value
            if value_type == 'json':
                serialized_value = json.dumps(value) if not isinstance(value, str) else value
            else:
                serialized_value = str(value)
            
            if db_setting:
                # Update existing
                db_setting.value = serialized_value
                db_setting.value_type = value_type
                if category:
                    db_setting.category = category
                if updated_by:
                    db_setting.updated_by = updated_by
                db_setting.updated_at = datetime.utcnow()
            else:
                # Create new
                db_setting = DBOrganizationSetting(
                    org_id=org_id,
                    key=key,
                    value=serialized_value,
                    value_type=value_type,
                    category=category or 'general',
                    updated_by=updated_by
                )
                session.add(db_setting)
            session.commit()

