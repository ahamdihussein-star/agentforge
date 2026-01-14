"""
Agent Service - Database Operations for Agent Management
Enterprise-grade agent persistence with multi-tenancy support
"""
import json
import traceback
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid as uuid_lib

from sqlalchemy.orm import Session
from ..base import get_db_session
from ..models.agent import Agent as DBAgent
from ..enums import AgentStatus

# Import core models for API compatibility
# Note: AgentData is defined in api/main.py, we'll import it there when needed


class AgentService:
    """
    Agent Service - Bridge between API and Database
    Handles all agent-related database operations
    """
    
    @staticmethod
    def get_all_agents(org_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get all agents (optionally filtered by org)
        Returns: List of agent dictionaries (compatible with AgentData)
        """
        try:
            with get_db_session() as db:
                query = db.query(DBAgent)
                
                if org_id:
                    # Convert org_id to UUID
                    try:
                        if org_id == "org_default":
                            from .organization_service import OrganizationService
                            orgs = OrganizationService.get_all_organizations()
                            default_org = next((o for o in orgs if o.slug == "default"), None)
                            if default_org:
                                org_id = default_org.id
                            else:
                                org_id = orgs[0].id if orgs else None
                        
                        if org_id:
                            org_uuid = uuid_lib.UUID(org_id)
                            query = query.filter(DBAgent.org_id == org_uuid)
                    except (ValueError, AttributeError):
                        pass
                
                # Filter out soft-deleted agents
                query = query.filter(DBAgent.deleted_at.is_(None))
                
                db_agents = query.all()
                
                # Convert DB agents to dictionaries (compatible with AgentData)
                agents = []
                for db_agent in db_agents:
                    try:
                        agent_dict = AgentService._db_to_agent_dict(db_agent)
                        agents.append(agent_dict)
                    except Exception as e:
                        print(f"⚠️  [DATABASE ERROR] Error converting agent '{db_agent.name}' (ID: {str(db_agent.id)[:8]}...): {e}")
                        traceback.print_exc()
                        continue
                
                return agents
                
        except Exception as e:
            print(f"❌ [DATABASE ERROR] Failed to retrieve agents: {type(e).__name__}: {e}")
            traceback.print_exc()
            raise
    
    @staticmethod
    def get_agent_by_id(agent_id: str, org_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Get agent by ID"""
        try:
            with get_db_session() as db:
                try:
                    agent_uuid = uuid_lib.UUID(agent_id)
                except ValueError:
                    return None
                
                query = db.query(DBAgent).filter(DBAgent.id == agent_uuid)
                query = query.filter(DBAgent.deleted_at.is_(None))
                
                if org_id:
                    try:
                        if org_id == "org_default":
                            from .organization_service import OrganizationService
                            orgs = OrganizationService.get_all_organizations()
                            default_org = next((o for o in orgs if o.slug == "default"), None)
                            if default_org:
                                org_id = default_org.id
                            else:
                                org_id = orgs[0].id if orgs else None
                        
                        if org_id:
                            org_uuid = uuid_lib.UUID(org_id)
                            query = query.filter(DBAgent.org_id == org_uuid)
                    except (ValueError, AttributeError):
                        pass
                
                db_agent = query.first()
                
                if not db_agent:
                    return None
                
                return AgentService._db_to_agent_dict(db_agent)
                
        except Exception as e:
            print(f"❌ [DATABASE ERROR] Failed to retrieve agent: {type(e).__name__}: {e}")
            traceback.print_exc()
            return None
    
    @staticmethod
    def _db_to_agent_dict(db_agent: DBAgent) -> Dict[str, Any]:
        """Convert database Agent to dictionary (compatible with AgentData)"""
        try:
            # Parse JSON fields
            personality = db_agent.personality if isinstance(db_agent.personality, dict) else (
                json.loads(db_agent.personality) if isinstance(db_agent.personality, str) else {}
            )
            guardrails = db_agent.guardrails if isinstance(db_agent.guardrails, dict) else (
                json.loads(db_agent.guardrails) if isinstance(db_agent.guardrails, str) else {}
            )
            tasks = db_agent.tasks if isinstance(db_agent.tasks, list) else (
                json.loads(db_agent.tasks) if isinstance(db_agent.tasks, str) else []
            )
            tool_ids = db_agent.tool_ids if isinstance(db_agent.tool_ids, list) else (
                json.loads(db_agent.tool_ids) if isinstance(db_agent.tool_ids, str) else []
            )
            memory = db_agent.memory if isinstance(db_agent.memory, list) else (
                json.loads(db_agent.memory) if isinstance(db_agent.memory, str) else []
            )
            shared_with_user_ids = db_agent.shared_with_user_ids if isinstance(db_agent.shared_with_user_ids, list) else (
                json.loads(db_agent.shared_with_user_ids) if isinstance(db_agent.shared_with_user_ids, str) else []
            )
            shared_with_role_ids = db_agent.shared_with_role_ids if isinstance(db_agent.shared_with_role_ids, list) else (
                json.loads(db_agent.shared_with_role_ids) if isinstance(db_agent.shared_with_role_ids, str) else []
            )
            extra_metadata = db_agent.extra_metadata if isinstance(db_agent.extra_metadata, dict) else (
                json.loads(db_agent.extra_metadata) if isinstance(db_agent.extra_metadata, str) else {}
            )
            
            # Convert UUIDs to strings
            agent_id = str(db_agent.id) if db_agent.id else ""
            org_id = str(db_agent.org_id) if db_agent.org_id else ""
            owner_id = str(db_agent.owner_id) if db_agent.owner_id else ""
            parent_version_id = str(db_agent.parent_version_id) if db_agent.parent_version_id else None
            deleted_by = str(db_agent.deleted_by) if db_agent.deleted_by else None
            created_by = str(db_agent.created_by) if db_agent.created_by else ""
            updated_by = str(db_agent.updated_by) if db_agent.updated_by else None
            
            # Convert tool_ids from UUIDs to strings
            tool_ids_str = []
            for tid in tool_ids:
                if isinstance(tid, uuid_lib.UUID):
                    tool_ids_str.append(str(tid))
                else:
                    tool_ids_str.append(str(tid))
            
            # Convert shared_with_user_ids and shared_with_role_ids from UUIDs to strings
            shared_user_ids_str = [str(uid) if isinstance(uid, uuid_lib.UUID) else str(uid) for uid in shared_with_user_ids]
            shared_role_ids_str = [str(rid) if isinstance(rid, uuid_lib.UUID) else str(rid) for rid in shared_with_role_ids]
            
            return {
                'id': agent_id,
                'name': db_agent.name,
                'icon': db_agent.icon or "🤖",
                'goal': db_agent.goal or "",
                'description': db_agent.description or "",
                'model_id': db_agent.model_id or "gpt-4o",
                'personality': personality,
                'guardrails': guardrails,
                'tasks': tasks,
                'tool_ids': tool_ids_str,
                'memory': memory,
                'memory_enabled': db_agent.memory_enabled if db_agent.memory_enabled is not None else True,
                'status': db_agent.status.value if db_agent.status else "draft",
                'is_active': db_agent.is_published if db_agent.is_published is not None else False,
                'created_at': db_agent.created_at.isoformat() if db_agent.created_at else datetime.utcnow().isoformat(),
                'updated_at': db_agent.updated_at.isoformat() if db_agent.updated_at else datetime.utcnow().isoformat(),
                # Additional fields from database
                'org_id': org_id,
                'is_public': db_agent.is_public if db_agent.is_public is not None else False,
                'owner_id': owner_id,
                'shared_with_user_ids': shared_user_ids_str,
                'shared_with_role_ids': shared_role_ids_str,
                'usage_count': db_agent.usage_count if db_agent.usage_count is not None else 0,
                'last_used_at': db_agent.last_used_at.isoformat() if db_agent.last_used_at else None,
                'context_window': db_agent.context_window if db_agent.context_window is not None else 4096,
                'version': db_agent.version if db_agent.version is not None else 1,
                'parent_version_id': parent_version_id,
                'published_at': db_agent.published_at.isoformat() if db_agent.published_at else None,
                'extra_metadata': extra_metadata
            }
        except Exception as e:
            print(f"❌ Error in _db_to_agent_dict: {type(e).__name__}: {e}")
            print(f"   Agent data: id={db_agent.id}, name={db_agent.name}")
            traceback.print_exc()
            raise
    
    @staticmethod
    def create_agent(agent_data: Dict[str, Any], org_id: str, owner_id: str, created_by: str) -> Dict[str, Any]:
        """Create new agent in database"""
        try:
            with get_db_session() as db:
                # Resolve org_id: convert "org_default" to actual UUID
                org_uuid = None
                if org_id == "org_default":
                    from .organization_service import OrganizationService
                    orgs = OrganizationService.get_all_organizations()
                    default_org = next((o for o in orgs if o.slug == "default"), None)
                    if default_org:
                        org_uuid = uuid_lib.UUID(default_org.id)
                    else:
                        org_uuid = uuid_lib.UUID(orgs[0].id) if orgs else None
                else:
                    try:
                        org_uuid = uuid_lib.UUID(org_id)
                    except ValueError:
                        org_uuid = None
                
                if not org_uuid:
                    raise ValueError(f"Invalid org_id: {org_id}")
                
                # Resolve owner_id and created_by
                try:
                    owner_uuid = uuid_lib.UUID(owner_id)
                except ValueError:
                    raise ValueError(f"Invalid owner_id: {owner_id}")
                
                try:
                    created_by_uuid = uuid_lib.UUID(created_by)
                except ValueError:
                    created_by_uuid = owner_uuid  # Fallback to owner_id
                
                # Generate agent ID if not provided
                agent_id = agent_data.get('id')
                if agent_id:
                    try:
                        agent_uuid = uuid_lib.UUID(agent_id)
                    except ValueError:
                        agent_uuid = uuid_lib.uuid4()
                else:
                    agent_uuid = uuid_lib.uuid4()
                
                # Parse JSON fields - ensure they are dicts/lists, not JSON strings
                personality = agent_data.get('personality', {})
                if isinstance(personality, str):
                    personality = json.loads(personality)
                elif not isinstance(personality, dict):
                    personality = {}
                
                guardrails = agent_data.get('guardrails', {})
                if isinstance(guardrails, str):
                    guardrails = json.loads(guardrails)
                elif not isinstance(guardrails, dict):
                    guardrails = {}
                
                tasks = agent_data.get('tasks', [])
                if isinstance(tasks, str):
                    tasks = json.loads(tasks)
                elif not isinstance(tasks, list):
                    tasks = []
                
                tool_ids = agent_data.get('tool_ids', [])
                if isinstance(tool_ids, str):
                    tool_ids = json.loads(tool_ids)
                elif not isinstance(tool_ids, list):
                    tool_ids = []
                
                # Convert tool_ids to list of strings (for JSONArray type)
                tool_ids_list = []
                for tid in tool_ids:
                    try:
                        if isinstance(tid, uuid_lib.UUID):
                            tool_ids_list.append(str(tid))
                        elif isinstance(tid, str):
                            # Validate it's a valid UUID string, then keep as string
                            uuid_lib.UUID(tid)  # Validate
                            tool_ids_list.append(tid)
                        else:
                            tool_ids_list.append(str(tid))
                    except (ValueError, AttributeError):
                        # Keep as string if not valid UUID
                        tool_ids_list.append(str(tid))
                
                memory = agent_data.get('memory', [])
                if isinstance(memory, str):
                    memory = json.loads(memory)
                elif not isinstance(memory, list):
                    memory = []
                
                shared_with_user_ids = agent_data.get('shared_with_user_ids', [])
                if isinstance(shared_with_user_ids, str):
                    shared_with_user_ids = json.loads(shared_with_user_ids)
                elif not isinstance(shared_with_user_ids, list):
                    shared_with_user_ids = []
                
                shared_with_role_ids = agent_data.get('shared_with_role_ids', [])
                if isinstance(shared_with_role_ids, str):
                    shared_with_role_ids = json.loads(shared_with_role_ids)
                elif not isinstance(shared_with_role_ids, list):
                    shared_with_role_ids = []
                
                # Convert shared IDs to list of strings (for JSONArray type)
                shared_user_ids_list = []
                for uid in shared_with_user_ids:
                    try:
                        if isinstance(uid, uuid_lib.UUID):
                            shared_user_ids_list.append(str(uid))
                        elif isinstance(uid, str):
                            # Validate it's a valid UUID string, then keep as string
                            uuid_lib.UUID(uid)  # Validate
                            shared_user_ids_list.append(uid)
                        else:
                            shared_user_ids_list.append(str(uid))
                    except (ValueError, AttributeError):
                        pass
                
                shared_role_ids_list = []
                for rid in shared_with_role_ids:
                    try:
                        if isinstance(rid, uuid_lib.UUID):
                            shared_role_ids_list.append(str(rid))
                        elif isinstance(rid, str):
                            # Validate it's a valid UUID string, then keep as string
                            uuid_lib.UUID(rid)  # Validate
                            shared_role_ids_list.append(rid)
                        else:
                            shared_role_ids_list.append(str(rid))
                    except (ValueError, AttributeError):
                        pass
                
                # Parse status (normalize to lowercase for enum matching)
                status_str = agent_data.get('status', 'draft')
                if isinstance(status_str, str):
                    status_str = status_str.lower()
                try:
                    status = AgentStatus(status_str)
                except (ValueError, AttributeError):
                    status = AgentStatus.DRAFT
                
                # Create database agent
                # Note: personality, guardrails, tasks, memory, extra_metadata use JSON type (dict/list)
                # tool_ids, shared_with_user_ids, shared_with_role_ids use JSONArray type (list of strings)
                db_agent = DBAgent(
                    id=agent_uuid,
                    org_id=org_uuid,
                    name=agent_data.get('name', ''),
                    icon=agent_data.get('icon', '🤖'),
                    goal=agent_data.get('goal', ''),
                    description=agent_data.get('description', ''),
                    model_id=agent_data.get('model_id', 'gpt-4o'),
                    personality=personality,  # JSON type - dict
                    guardrails=guardrails,  # JSON type - dict
                    tasks=tasks,  # JSON type - list
                    tool_ids=tool_ids_list,  # JSONArray type - list of strings
                    memory=memory,  # JSON type - list
                    memory_enabled=agent_data.get('memory_enabled', True),
                    context_window=agent_data.get('context_window', 4096),
                    status=status,
                    is_published=agent_data.get('is_active', False) or agent_data.get('is_published', False),
                    is_public=agent_data.get('is_public', False),
                    owner_id=owner_uuid,
                    shared_with_user_ids=shared_user_ids_list,  # JSONArray type - list of strings
                    shared_with_role_ids=shared_role_ids_list,  # JSONArray type - list of strings
                    usage_count=agent_data.get('usage_count', 0),
                    version=agent_data.get('version', 1),
                    created_by=created_by_uuid,
                    extra_metadata=agent_data.get('extra_metadata', {})  # JSON type - dict
                )
                
                db.add(db_agent)
                db.commit()
                db.refresh(db_agent)
                
                return AgentService._db_to_agent_dict(db_agent)
                
        except Exception as e:
            print(f"❌ [DATABASE ERROR] Failed to create agent: {type(e).__name__}: {e}")
            traceback.print_exc()
            raise
    
    @staticmethod
    def update_agent(agent_id: str, agent_data: Dict[str, Any], org_id: Optional[str] = None, updated_by: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Update agent in database"""
        try:
            with get_db_session() as db:
                try:
                    agent_uuid = uuid_lib.UUID(agent_id)
                except ValueError:
                    return None
                
                db_agent = db.query(DBAgent).filter(
                    DBAgent.id == agent_uuid,
                    DBAgent.deleted_at.is_(None)
                ).first()
                
                if not db_agent:
                    return None
                
                # Check org_id if provided
                if org_id:
                    try:
                        if org_id == "org_default":
                            from .organization_service import OrganizationService
                            orgs = OrganizationService.get_all_organizations()
                            default_org = next((o for o in orgs if o.slug == "default"), None)
                            if default_org:
                                org_id = default_org.id
                            else:
                                org_id = orgs[0].id if orgs else None
                        
                        if org_id:
                            org_uuid = uuid_lib.UUID(org_id)
                            if db_agent.org_id != org_uuid:
                                return None  # Agent belongs to different org
                    except (ValueError, AttributeError):
                        pass
                
                # Update fields
                if 'name' in agent_data:
                    db_agent.name = agent_data['name']
                if 'icon' in agent_data:
                    db_agent.icon = agent_data['icon']
                if 'goal' in agent_data:
                    db_agent.goal = agent_data['goal']
                if 'description' in agent_data:
                    db_agent.description = agent_data.get('description', '')
                if 'model_id' in agent_data:
                    db_agent.model_id = agent_data['model_id']
                if 'personality' in agent_data:
                    personality = agent_data['personality']
                    if isinstance(personality, str):
                        personality = json.loads(personality)
                    elif not isinstance(personality, dict):
                        personality = {}
                    db_agent.personality = personality
                if 'guardrails' in agent_data:
                    guardrails = agent_data['guardrails']
                    if isinstance(guardrails, str):
                        guardrails = json.loads(guardrails)
                    elif not isinstance(guardrails, dict):
                        guardrails = {}
                    db_agent.guardrails = guardrails
                if 'tasks' in agent_data:
                    tasks = agent_data['tasks']
                    if isinstance(tasks, str):
                        tasks = json.loads(tasks)
                    elif not isinstance(tasks, list):
                        tasks = []
                    db_agent.tasks = tasks
                if 'tool_ids' in agent_data:
                    tool_ids = agent_data['tool_ids']
                    if isinstance(tool_ids, str):
                        tool_ids = json.loads(tool_ids)
                    elif not isinstance(tool_ids, list):
                        tool_ids = []
                    # Convert to list of strings (for JSONArray type)
                    tool_ids_list = []
                    for tid in tool_ids:
                        try:
                            if isinstance(tid, uuid_lib.UUID):
                                tool_ids_list.append(str(tid))
                            elif isinstance(tid, str):
                                # Validate it's a valid UUID string, then keep as string
                                uuid_lib.UUID(tid)  # Validate
                                tool_ids_list.append(tid)
                            else:
                                tool_ids_list.append(str(tid))
                        except (ValueError, AttributeError):
                            tool_ids_list.append(str(tid))  # Keep as string if not valid UUID
                    db_agent.tool_ids = tool_ids_list
                if 'memory' in agent_data:
                    memory = agent_data['memory']
                    if isinstance(memory, str):
                        memory = json.loads(memory)
                    elif not isinstance(memory, list):
                        memory = []
                    db_agent.memory = memory
                if 'memory_enabled' in agent_data:
                    db_agent.memory_enabled = agent_data['memory_enabled']
                if 'context_window' in agent_data:
                    db_agent.context_window = agent_data['context_window']
                if 'status' in agent_data:
                    try:
                        status_str = agent_data['status']
                        if isinstance(status_str, str):
                            status_str = status_str.lower()
                        db_agent.status = AgentStatus(status_str)
                    except (ValueError, AttributeError):
                        pass
                if 'is_active' in agent_data or 'is_published' in agent_data:
                    is_published = agent_data.get('is_published', agent_data.get('is_active', False))
                    db_agent.is_published = is_published
                    if is_published and not db_agent.published_at:
                        db_agent.published_at = datetime.utcnow()
                if 'is_public' in agent_data:
                    db_agent.is_public = agent_data['is_public']
                if 'shared_with_user_ids' in agent_data:
                    shared_user_ids = agent_data['shared_with_user_ids']
                    if isinstance(shared_user_ids, str):
                        shared_user_ids = json.loads(shared_user_ids)
                    elif not isinstance(shared_user_ids, list):
                        shared_user_ids = []
                    # Convert to list of strings (for JSONArray type)
                    shared_user_ids_list = []
                    for uid in shared_user_ids:
                        try:
                            if isinstance(uid, uuid_lib.UUID):
                                shared_user_ids_list.append(str(uid))
                            elif isinstance(uid, str):
                                # Validate it's a valid UUID string, then keep as string
                                uuid_lib.UUID(uid)  # Validate
                                shared_user_ids_list.append(uid)
                            else:
                                shared_user_ids_list.append(str(uid))
                        except (ValueError, AttributeError):
                            pass
                    db_agent.shared_with_user_ids = shared_user_ids_list
                if 'shared_with_role_ids' in agent_data:
                    shared_role_ids = agent_data['shared_with_role_ids']
                    if isinstance(shared_role_ids, str):
                        shared_role_ids = json.loads(shared_role_ids)
                    elif not isinstance(shared_role_ids, list):
                        shared_role_ids = []
                    # Convert to list of strings (for JSONArray type)
                    shared_role_ids_list = []
                    for rid in shared_role_ids:
                        try:
                            if isinstance(rid, uuid_lib.UUID):
                                shared_role_ids_list.append(str(rid))
                            elif isinstance(rid, str):
                                # Validate it's a valid UUID string, then keep as string
                                uuid_lib.UUID(rid)  # Validate
                                shared_role_ids_list.append(rid)
                            else:
                                shared_role_ids_list.append(str(rid))
                        except (ValueError, AttributeError):
                            pass
                    db_agent.shared_with_role_ids = shared_role_ids_list
                if 'usage_count' in agent_data:
                    db_agent.usage_count = agent_data['usage_count']
                if 'last_used_at' in agent_data:
                    if agent_data['last_used_at']:
                        if isinstance(agent_data['last_used_at'], str):
                            db_agent.last_used_at = datetime.fromisoformat(agent_data['last_used_at'].replace('Z', '+00:00'))
                        else:
                            db_agent.last_used_at = agent_data['last_used_at']
                if 'extra_metadata' in agent_data:
                    extra_metadata = agent_data['extra_metadata']
                    if isinstance(extra_metadata, str):
                        extra_metadata = json.loads(extra_metadata)
                    elif not isinstance(extra_metadata, dict):
                        extra_metadata = {}
                    db_agent.extra_metadata = extra_metadata
                
                # Update timestamps
                db_agent.updated_at = datetime.utcnow()
                if updated_by:
                    try:
                        db_agent.updated_by = uuid_lib.UUID(updated_by)
                    except ValueError:
                        pass
                
                db.commit()
                db.refresh(db_agent)
                
                return AgentService._db_to_agent_dict(db_agent)
                
        except Exception as e:
            print(f"❌ [DATABASE ERROR] Failed to update agent: {type(e).__name__}: {e}")
            traceback.print_exc()
            raise
    
    @staticmethod
    def delete_agent(agent_id: str, org_id: Optional[str] = None, deleted_by: Optional[str] = None) -> bool:
        """Soft delete agent (set deleted_at)"""
        try:
            with get_db_session() as db:
                try:
                    agent_uuid = uuid_lib.UUID(agent_id)
                except ValueError:
                    return False
                
                db_agent = db.query(DBAgent).filter(
                    DBAgent.id == agent_uuid,
                    DBAgent.deleted_at.is_(None)
                ).first()
                
                if not db_agent:
                    return False
                
                # Check org_id if provided
                if org_id:
                    try:
                        if org_id == "org_default":
                            from .organization_service import OrganizationService
                            orgs = OrganizationService.get_all_organizations()
                            default_org = next((o for o in orgs if o.slug == "default"), None)
                            if default_org:
                                org_id = default_org.id
                            else:
                                org_id = orgs[0].id if orgs else None
                        
                        if org_id:
                            org_uuid = uuid_lib.UUID(org_id)
                            if db_agent.org_id != org_uuid:
                                return False  # Agent belongs to different org
                    except (ValueError, AttributeError):
                        pass
                
                # Soft delete
                db_agent.deleted_at = datetime.utcnow()
                if deleted_by:
                    try:
                        db_agent.deleted_by = uuid_lib.UUID(deleted_by)
                    except ValueError:
                        pass
                
                db.commit()
                return True
                
        except Exception as e:
            print(f"❌ [DATABASE ERROR] Failed to delete agent: {type(e).__name__}: {e}")
            traceback.print_exc()
            return False
    
    @staticmethod
    def save_agent(agent_data: Dict[str, Any], org_id: str, owner_id: str, created_by: str, updated_by: Optional[str] = None) -> Dict[str, Any]:
        """
        Save or update agent (UPSERT pattern)
        Checks if agent exists by ID, updates if exists, creates if not
        """
        agent_id = agent_data.get('id')
        
        if agent_id:
            # Try to get existing agent
            existing = AgentService.get_agent_by_id(agent_id, org_id)
            if existing:
                # Update existing
                return AgentService.update_agent(agent_id, agent_data, org_id, updated_by or created_by)
        
        # Create new
        return AgentService.create_agent(agent_data, org_id, owner_id, created_by)

