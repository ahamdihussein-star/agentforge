"""
Conversation Service - Database Operations for Chat History
Enterprise-grade conversation persistence with multi-tenancy support
"""
import json
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid as uuid_lib

from sqlalchemy.orm import Session
from ..base import get_db_session
from ..models.conversation import Conversation as DBConversation, Message as DBMessage


class ConversationService:
    """
    Conversation Service - Bridge between API and Database
    Handles all conversation-related database operations
    """
    
    @staticmethod
    def get_all_conversations(org_id: Optional[str] = None, user_id: Optional[str] = None, include_test: bool = False) -> List[Dict[str, Any]]:
        """Get all conversations (optionally filtered). Excludes test conversations by default."""
        try:
            with get_db_session() as db:
                query = db.query(DBConversation).filter(DBConversation.deleted_at.is_(None))
                
                # Exclude test conversations unless specifically requested
                if not include_test:
                    query = query.filter((DBConversation.is_test == False) | (DBConversation.is_test.is_(None)))
                
                if org_id:
                    try:
                        org_uuid = uuid_lib.UUID(org_id) if isinstance(org_id, str) and org_id not in ['org_default'] else None
                        if org_uuid:
                            query = query.filter(DBConversation.org_id == org_uuid)
                    except (ValueError, AttributeError):
                        pass
                
                if user_id:
                    try:
                        user_uuid = uuid_lib.UUID(user_id) if isinstance(user_id, str) else user_id
                        query = query.filter(DBConversation.user_id == user_uuid)
                    except (ValueError, AttributeError):
                        pass
                
                query = query.order_by(DBConversation.created_at.desc())
                db_convs = query.all()
                return [ConversationService._db_to_conv_dict(c) for c in db_convs]
        except Exception as e:
            print(f"⚠️  [DATABASE] Failed to get conversations: {e}")
            return []
    
    @staticmethod
    def get_conversation_by_id(conv_id: str) -> Optional[Dict[str, Any]]:
        """Get a single conversation with its messages"""
        try:
            with get_db_session() as db:
                # Parse UUID
                try:
                    conv_uuid = uuid_lib.UUID(conv_id) if isinstance(conv_id, str) else conv_id
                except (ValueError, AttributeError):
                    return None
                
                db_conv = db.query(DBConversation).filter(
                    DBConversation.id == conv_uuid,
                    DBConversation.deleted_at.is_(None)
                ).first()
                
                if not db_conv:
                    return None
                
                # Get messages
                messages = db.query(DBMessage).filter(
                    DBMessage.conversation_id == conv_uuid,
                    DBMessage.deleted_at.is_(None)
                ).order_by(DBMessage.timestamp.asc()).all()
                
                conv_dict = ConversationService._db_to_conv_dict(db_conv)
                conv_dict['messages'] = [ConversationService._db_to_message_dict(m) for m in messages]
                return conv_dict
                
        except Exception as e:
            print(f"⚠️  [DATABASE] Failed to get conversation {conv_id}: {e}")
            return None
    
    @staticmethod
    def create_conversation(conv_data: Dict[str, Any], org_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Create a new conversation"""
        try:
            with get_db_session() as db:
                # Parse UUIDs
                org_uuid = ConversationService._parse_uuid(org_id, '2c969bf1-16d3-43d3-95da-66965c3fa132')
                user_uuid = ConversationService._parse_uuid(user_id, '00000000-0000-0000-0000-000000000000')
                agent_uuid = ConversationService._parse_uuid(conv_data.get('agent_id'), '00000000-0000-0000-0000-000000000000')
                
                conv_id = conv_data.get('id')
                if conv_id:
                    try:
                        conv_uuid = uuid_lib.UUID(conv_id) if isinstance(conv_id, str) else conv_id
                    except:
                        conv_uuid = uuid_lib.uuid4()
                else:
                    conv_uuid = uuid_lib.uuid4()
                
                # Check if exists
                existing = db.query(DBConversation).filter(DBConversation.id == conv_uuid).first()
                if existing:
                    return ConversationService._db_to_conv_dict(existing)
                
                db_conv = DBConversation(
                    id=conv_uuid,
                    org_id=org_uuid,
                    agent_id=agent_uuid,
                    user_id=user_uuid,
                    title=conv_data.get('title', 'New Conversation'),
                    is_test=conv_data.get('is_test', False),
                    message_count=0,
                    created_at=datetime.utcnow()
                )
                
                db.add(db_conv)
                db.commit()
                db.refresh(db_conv)
                
                return ConversationService._db_to_conv_dict(db_conv)
                
        except Exception as e:
            print(f"❌ [DATABASE ERROR] Failed to create conversation: {e}")
            return None
    
    @staticmethod
    def add_message(conv_id: str, message_data: Dict[str, Any], org_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Add a message to a conversation"""
        try:
            with get_db_session() as db:
                conv_uuid = ConversationService._parse_uuid(conv_id, None)
                if not conv_uuid:
                    return None
                
                org_uuid = ConversationService._parse_uuid(org_id, '2c969bf1-16d3-43d3-95da-66965c3fa132')
                user_uuid = ConversationService._parse_uuid(user_id, '00000000-0000-0000-0000-000000000000')
                
                # Get message ID
                msg_id = message_data.get('id')
                if msg_id:
                    try:
                        msg_uuid = uuid_lib.UUID(msg_id) if isinstance(msg_id, str) else msg_id
                    except:
                        msg_uuid = uuid_lib.uuid4()
                else:
                    msg_uuid = uuid_lib.uuid4()
                
                db_message = DBMessage(
                    id=msg_uuid,
                    conversation_id=conv_uuid,
                    org_id=org_uuid,
                    user_id=user_uuid,
                    role=message_data.get('role', 'user').lower(),
                    content=message_data.get('content', ''),
                    tool_calls=message_data.get('tool_calls', []),
                    sources=message_data.get('sources', []),
                    model_used=message_data.get('model_used'),
                    tokens_used=message_data.get('tokens_used'),
                    timestamp=datetime.utcnow()
                )
                
                db.add(db_message)
                
                # Update conversation
                conv = db.query(DBConversation).filter(DBConversation.id == conv_uuid).first()
                if conv:
                    conv.message_count = (conv.message_count or 0) + 1
                    conv.last_message_at = datetime.utcnow()
                    conv.updated_at = datetime.utcnow()
                
                db.commit()
                db.refresh(db_message)
                
                return ConversationService._db_to_message_dict(db_message)
                
        except Exception as e:
            print(f"❌ [DATABASE ERROR] Failed to add message: {e}")
            return None
    
    @staticmethod
    def delete_conversation(conv_id: str, deleted_by: str = None) -> bool:
        """Soft delete a conversation"""
        try:
            with get_db_session() as db:
                conv_uuid = ConversationService._parse_uuid(conv_id, None)
                if not conv_uuid:
                    return False
                
                db_conv = db.query(DBConversation).filter(
                    DBConversation.id == conv_uuid,
                    DBConversation.deleted_at.is_(None)
                ).first()
                
                if not db_conv:
                    return False
                
                db_conv.deleted_at = datetime.utcnow()
                if deleted_by:
                    deleted_uuid = ConversationService._parse_uuid(deleted_by, None)
                    if deleted_uuid:
                        db_conv.deleted_by = deleted_uuid
                
                db.commit()
                return True
                
        except Exception as e:
            print(f"❌ [DATABASE ERROR] Failed to delete conversation: {e}")
            return False
    
    @staticmethod
    def _parse_uuid(value: str, default: str) -> Optional[uuid_lib.UUID]:
        """Parse UUID with fallback"""
        if not value or value in ['org_default', 'system', '']:
            if default:
                return uuid_lib.UUID(default)
            return None
        try:
            return uuid_lib.UUID(value) if isinstance(value, str) else value
        except (ValueError, AttributeError):
            if default:
                return uuid_lib.UUID(default)
            return None
    
    @staticmethod
    def _db_to_conv_dict(db_conv: DBConversation) -> Dict[str, Any]:
        """Convert database conversation to dictionary"""
        return {
            'id': str(db_conv.id),
            'agent_id': str(db_conv.agent_id) if db_conv.agent_id else None,
            'user_id': str(db_conv.user_id) if db_conv.user_id else None,
            'title': db_conv.title,
            'messages': [],  # Filled separately if needed
            'message_count': db_conv.message_count or 0,
            'created_at': db_conv.created_at.isoformat() if db_conv.created_at else None,
            'updated_at': db_conv.updated_at.isoformat() if db_conv.updated_at else None,
        }
    
    @staticmethod
    def _db_to_message_dict(db_msg: DBMessage) -> Dict[str, Any]:
        """Convert database message to dictionary"""
        return {
            'id': str(db_msg.id),
            'role': db_msg.role,
            'content': db_msg.content,
            'tool_calls': db_msg.tool_calls or [],
            'sources': db_msg.sources or [],
            'timestamp': db_msg.timestamp.isoformat() if db_msg.timestamp else None,
        }

