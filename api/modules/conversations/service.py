"""
Conversation Management Service

Provides reusable operations for managing conversations:
- List conversations with filtering
- Bulk delete conversations
- Select all / deselect all
- Export conversations

Used by:
- Main chat (index.html)
- Chat portal (chat.html)
- API endpoints
"""

from typing import List, Dict, Optional, Tuple
from datetime import datetime
import json


class ConversationManagementService:
    """
    Centralized service for conversation management operations.
    """
    
    @classmethod
    def get_conversations(
        cls,
        agent_id: str,
        user_id: str,
        org_id: str,
        limit: int = 50,
        offset: int = 0,
        search: str = None
    ) -> Tuple[List[Dict], int]:
        """
        Get conversations for an agent with optional filtering.
        
        Args:
            agent_id: Agent ID
            user_id: User ID
            org_id: Organization ID
            limit: Max number of conversations to return
            offset: Offset for pagination
            search: Optional search term for title
            
        Returns:
            Tuple of (conversations list, total count)
        """
        try:
            from database.services import ConversationService
            
            # Get all conversations for the agent
            all_convs = ConversationService.get_conversations_for_agent(agent_id, org_id)
            
            # Filter by search term if provided
            if search:
                search_lower = search.lower()
                all_convs = [
                    c for c in all_convs 
                    if search_lower in (c.get('title', '') or '').lower()
                ]
            
            # Sort by updated_at descending
            all_convs.sort(
                key=lambda x: x.get('updated_at', x.get('created_at', '')),
                reverse=True
            )
            
            total = len(all_convs)
            
            # Apply pagination
            paginated = all_convs[offset:offset + limit]
            
            return paginated, total
            
        except Exception as e:
            print(f"Error getting conversations: {e}")
            return [], 0
    
    @classmethod
    def delete_conversation(
        cls,
        conversation_id: str,
        user_id: str,
        org_id: str
    ) -> Tuple[bool, str]:
        """
        Delete a single conversation.
        
        Args:
            conversation_id: Conversation ID to delete
            user_id: User ID (for permission check)
            org_id: Organization ID
            
        Returns:
            Tuple of (success, message)
        """
        try:
            from database.services import ConversationService
            
            # Get conversation to verify ownership (use correct method name)
            conv = ConversationService.get_conversation_by_id(conversation_id)
            if not conv:
                return False, "Conversation not found"
            
            # Verify user owns this conversation
            if conv.get('user_id') != user_id:
                return False, "Not authorized to delete this conversation"
            
            # Delete the conversation (pass user_id as deleted_by)
            success = ConversationService.delete_conversation(conversation_id, user_id)
            
            if success:
                return True, "Conversation deleted"
            else:
                return False, "Failed to delete conversation"
            
        except Exception as e:
            print(f"Error deleting conversation: {e}")
            return False, str(e)
    
    @classmethod
    def delete_conversations_bulk(
        cls,
        conversation_ids: List[str],
        user_id: str,
        org_id: str
    ) -> Dict:
        """
        Delete multiple conversations at once.
        
        Args:
            conversation_ids: List of conversation IDs to delete
            user_id: User ID (for permission check)
            org_id: Organization ID
            
        Returns:
            Dict with success count, failed count, and details
        """
        results = {
            "total": len(conversation_ids),
            "deleted": 0,
            "failed": 0,
            "errors": []
        }
        
        for conv_id in conversation_ids:
            success, message = cls.delete_conversation(conv_id, user_id, org_id)
            if success:
                results["deleted"] += 1
            else:
                results["failed"] += 1
                results["errors"].append({"id": conv_id, "error": message})
        
        return results
    
    @classmethod
    def delete_all_conversations(
        cls,
        agent_id: str,
        user_id: str,
        org_id: str
    ) -> Dict:
        """
        Delete all conversations for a user on an agent.
        
        Args:
            agent_id: Agent ID
            user_id: User ID
            org_id: Organization ID
            
        Returns:
            Dict with deletion results
        """
        try:
            from database.services import ConversationService
            
            # Get all conversations for this user/agent
            all_convs = ConversationService.get_conversations_for_agent(agent_id, org_id)
            
            # Filter to only user's conversations
            user_convs = [c for c in all_convs if c.get('user_id') == user_id]
            
            if not user_convs:
                return {"total": 0, "deleted": 0, "failed": 0, "errors": []}
            
            # Delete each conversation
            conv_ids = [c['id'] for c in user_convs]
            return cls.delete_conversations_bulk(conv_ids, user_id, org_id)
            
        except Exception as e:
            print(f"Error deleting all conversations: {e}")
            return {"total": 0, "deleted": 0, "failed": 1, "errors": [str(e)]}
    
    @classmethod
    def get_conversation_stats(
        cls,
        agent_id: str,
        user_id: str,
        org_id: str
    ) -> Dict:
        """
        Get statistics about user's conversations.
        
        Args:
            agent_id: Agent ID
            user_id: User ID
            org_id: Organization ID
            
        Returns:
            Dict with conversation statistics
        """
        try:
            from database.services import ConversationService
            
            all_convs = ConversationService.get_conversations_for_agent(agent_id, org_id)
            user_convs = [c for c in all_convs if c.get('user_id') == user_id]
            
            total_messages = 0
            for conv in user_convs:
                messages = conv.get('messages', [])
                total_messages += len(messages) if isinstance(messages, list) else 0
            
            return {
                "total_conversations": len(user_convs),
                "total_messages": total_messages,
                "oldest": min((c.get('created_at', '') for c in user_convs), default=None),
                "newest": max((c.get('updated_at', c.get('created_at', '')) for c in user_convs), default=None)
            }
            
        except Exception as e:
            print(f"Error getting conversation stats: {e}")
            return {"total_conversations": 0, "total_messages": 0}


# Singleton instance
conversation_service = ConversationManagementService()
