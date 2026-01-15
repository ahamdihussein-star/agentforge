"""
Tool Service - Database Operations for Tool Management
Enterprise-grade tool persistence with multi-tenancy support
"""
import json
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid as uuid_lib

from sqlalchemy.orm import Session
from ..base import get_db_session
from ..models.tool import Tool as DBTool


class ToolService:
    """
    Tool Service - Bridge between API and Database
    Handles all tool-related database operations
    """
    
    @staticmethod
    def get_all_tools(org_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get all tools (optionally filtered by org)"""
        try:
            with get_db_session() as db:
                query = db.query(DBTool).filter(DBTool.deleted_at.is_(None))
                if org_id:
                    try:
                        org_uuid = uuid_lib.UUID(org_id) if isinstance(org_id, str) else org_id
                        query = query.filter(DBTool.org_id == org_uuid)
                    except (ValueError, AttributeError):
                        pass
                
                db_tools = query.all()
                return [ToolService._db_to_tool_dict(t) for t in db_tools]
        except Exception as e:
            print(f"⚠️  [DATABASE] Failed to get tools: {e}")
            return []
    
    @staticmethod
    def get_tool_by_id(tool_id: str) -> Optional[Dict[str, Any]]:
        """Get a single tool by ID"""
        try:
            with get_db_session() as db:
                db_tool = db.query(DBTool).filter(
                    DBTool.id == tool_id,
                    DBTool.deleted_at.is_(None)
                ).first()
                
                if db_tool:
                    return ToolService._db_to_tool_dict(db_tool)
                return None
        except Exception as e:
            print(f"⚠️  [DATABASE] Failed to get tool {tool_id}: {e}")
            return None
    
    @staticmethod
    def create_tool(tool_data: Dict[str, Any], org_id: str, created_by: str) -> Optional[Dict[str, Any]]:
        """Create a new tool in the database"""
        try:
            with get_db_session() as db:
                # Parse UUIDs - handle special values
                try:
                    if org_id in ['org_default', 'system', '', None]:
                        org_uuid = uuid_lib.UUID('2c969bf1-16d3-43d3-95da-66965c3fa132')  # Default org
                    else:
                        org_uuid = uuid_lib.UUID(org_id) if isinstance(org_id, str) else org_id
                except (ValueError, AttributeError):
                    org_uuid = uuid_lib.UUID('2c969bf1-16d3-43d3-95da-66965c3fa132')
                
                try:
                    if created_by in ['system', '', None]:
                        created_by_uuid = uuid_lib.UUID('00000000-0000-0000-0000-000000000000')
                    else:
                        created_by_uuid = uuid_lib.UUID(created_by) if isinstance(created_by, str) else created_by
                except (ValueError, AttributeError):
                    created_by_uuid = uuid_lib.UUID('00000000-0000-0000-0000-000000000000')
                
                # Get or generate tool ID
                tool_id = tool_data.get('id', str(uuid_lib.uuid4()))
                
                # Check if tool already exists
                existing = db.query(DBTool).filter(DBTool.id == tool_id).first()
                if existing:
                    return ToolService.update_tool(tool_id, tool_data, org_id, created_by)
                
                # Create new tool
                db_tool = DBTool(
                    id=tool_id,
                    org_id=org_uuid,
                    type=tool_data.get('type', 'api'),
                    name=tool_data.get('name', ''),
                    description=tool_data.get('description', ''),
                    config=tool_data.get('config', {}),
                    api_config=tool_data.get('api_config'),
                    database_config=tool_data.get('database_config'),
                    rag_config=tool_data.get('rag_config'),
                    email_config=tool_data.get('email_config'),
                    slack_config=tool_data.get('slack_config'),
                    input_parameters=tool_data.get('input_parameters', []),
                    output_schema=tool_data.get('output_schema'),
                    is_active=tool_data.get('is_active', True),
                    is_public=tool_data.get('is_public', False),
                    owner_id=created_by_uuid,
                    created_by=created_by_uuid,
                    extra_metadata=tool_data.get('extra_metadata', {})
                )
                
                db.add(db_tool)
                db.commit()
                db.refresh(db_tool)
                
                return ToolService._db_to_tool_dict(db_tool)
                
        except Exception as e:
            print(f"❌ [DATABASE ERROR] Failed to create tool: {e}")
            return None
    
    @staticmethod
    def update_tool(tool_id: str, tool_data: Dict[str, Any], org_id: str, updated_by: str) -> Optional[Dict[str, Any]]:
        """Update an existing tool"""
        try:
            with get_db_session() as db:
                db_tool = db.query(DBTool).filter(
                    DBTool.id == tool_id,
                    DBTool.deleted_at.is_(None)
                ).first()
                
                if not db_tool:
                    return None
                
                # Update fields
                if 'name' in tool_data:
                    db_tool.name = tool_data['name']
                if 'description' in tool_data:
                    db_tool.description = tool_data['description']
                if 'type' in tool_data:
                    db_tool.type = tool_data['type']
                if 'config' in tool_data:
                    db_tool.config = tool_data['config']
                if 'api_config' in tool_data:
                    db_tool.api_config = tool_data['api_config']
                if 'input_parameters' in tool_data:
                    db_tool.input_parameters = tool_data['input_parameters']
                if 'is_active' in tool_data:
                    db_tool.is_active = tool_data['is_active']
                if 'is_public' in tool_data:
                    db_tool.is_public = tool_data['is_public']
                
                db_tool.updated_at = datetime.utcnow()
                if updated_by:
                    try:
                        db_tool.updated_by = uuid_lib.UUID(updated_by) if isinstance(updated_by, str) else updated_by
                    except (ValueError, AttributeError):
                        pass
                
                db.commit()
                db.refresh(db_tool)
                
                return ToolService._db_to_tool_dict(db_tool)
                
        except Exception as e:
            print(f"❌ [DATABASE ERROR] Failed to update tool: {e}")
            return None
    
    @staticmethod
    def delete_tool(tool_id: str, deleted_by: str = None) -> bool:
        """Soft delete a tool"""
        try:
            with get_db_session() as db:
                db_tool = db.query(DBTool).filter(
                    DBTool.id == tool_id,
                    DBTool.deleted_at.is_(None)
                ).first()
                
                if not db_tool:
                    return False
                
                db_tool.deleted_at = datetime.utcnow()
                if deleted_by:
                    try:
                        db_tool.deleted_by = uuid_lib.UUID(deleted_by) if isinstance(deleted_by, str) else deleted_by
                    except (ValueError, AttributeError):
                        pass
                
                db.commit()
                return True
                
        except Exception as e:
            print(f"❌ [DATABASE ERROR] Failed to delete tool: {e}")
            return False
    
    @staticmethod
    def _db_to_tool_dict(db_tool: DBTool) -> Dict[str, Any]:
        """Convert database tool to dictionary"""
        # Handle JSON fields
        config = db_tool.config or {}
        if isinstance(config, str):
            try:
                config = json.loads(config)
            except:
                config = {}
        
        api_config = db_tool.api_config
        if isinstance(api_config, str):
            try:
                api_config = json.loads(api_config)
            except:
                api_config = None
        
        input_params = db_tool.input_parameters or []
        if isinstance(input_params, str):
            try:
                input_params = json.loads(input_params)
            except:
                input_params = []
        
        return {
            'id': db_tool.id,
            'type': db_tool.type,
            'name': db_tool.name,
            'description': db_tool.description or '',
            'config': config,
            'api_config': api_config,
            'input_parameters': input_params,
            'is_active': db_tool.is_active if db_tool.is_active is not None else True,
            'is_public': db_tool.is_public if db_tool.is_public is not None else False,
            'org_id': str(db_tool.org_id) if db_tool.org_id else None,
            'owner_id': str(db_tool.owner_id) if db_tool.owner_id else None,
            'usage_count': db_tool.usage_count or 0,
            'created_at': db_tool.created_at.isoformat() if db_tool.created_at else None,
            'updated_at': db_tool.updated_at.isoformat() if db_tool.updated_at else None,
        }

