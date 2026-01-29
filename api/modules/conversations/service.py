"""
Conversation Management Service

Provides reusable operations for managing conversations:
- List conversations with filtering
- Bulk delete conversations
- Select all / deselect all
- Auto-generate conversation titles
- Export conversations

Used by:
- Main chat (index.html)
- Chat portal (chat.html)
- API endpoints
"""

from typing import List, Dict, Optional, Tuple
from datetime import datetime
import json


class ConversationTitleService:
    """
    Service for generating smart conversation titles based on context.
    Uses LLM to create descriptive, concise titles.
    """
    
    @classmethod
    async def generate_title(cls, first_message: str, agent_name: str = None, language: str = "auto") -> str:
        """
        Generate a descriptive title for a conversation based on the first message.
        
        Args:
            first_message: The first user message in the conversation
            agent_name: Optional agent name for context
            language: Language for the title ("en", "ar", or "auto" to detect)
            
        Returns:
            A short, descriptive title (max 50 chars)
        """
        try:
            # Auto-detect language if needed
            if language == "auto":
                # Check for Arabic characters
                is_arabic = any('\u0600' <= c <= '\u06FF' for c in first_message)
                language = "ar" if is_arabic else "en"
            
            # Truncate message if too long
            msg_preview = first_message[:200] if len(first_message) > 200 else first_message
            
            # Build prompt for title generation
            if language == "ar":
                prompt = f"""اكتب عنوان قصير (أقل من 6 كلمات) يصف هذه المحادثة:
"{msg_preview}"

اكتب العنوان فقط بدون علامات ترقيم أو تفسير."""
            else:
                prompt = f"""Write a short title (under 6 words) describing this conversation:
"{msg_preview}"

Write only the title, no punctuation or explanation."""
            
            # Try to use LLM for smart title generation
            try:
                from core.llm.factory import create_llm_client
                
                client = create_llm_client("openai")  # Use default provider
                response = await client.generate(
                    messages=[
                        {"role": "system", "content": "You are a helpful assistant that generates short, descriptive conversation titles."},
                        {"role": "user", "content": prompt}
                    ],
                    max_tokens=30,
                    temperature=0.3
                )
                
                title = response.get("content", "").strip()
                
                # Clean up the title
                title = title.strip('"\'.')
                
                # Limit length
                if len(title) > 50:
                    title = title[:47] + "..."
                
                if title:
                    return title
                    
            except Exception as llm_error:
                print(f"LLM title generation failed, using fallback: {llm_error}")
            
            # Fallback: Use first words of the message
            return cls._fallback_title(first_message, agent_name)
            
        except Exception as e:
            print(f"Error generating conversation title: {e}")
            return cls._fallback_title(first_message, agent_name)
    
    @classmethod
    def generate_title_sync(cls, first_message: str, agent_name: str = None) -> str:
        """
        Synchronous version - generates a simple title without LLM.
        Uses first words of the message.
        
        Args:
            first_message: The first user message
            agent_name: Optional agent name
            
        Returns:
            A short title
        """
        return cls._fallback_title(first_message, agent_name)
    
    @classmethod
    def _fallback_title(cls, message: str, agent_name: str = None) -> str:
        """
        Generate a simple title from the message content.
        Works for ANY type of agent - no domain-specific logic.
        """
        # Clean the message
        clean_msg = message.strip()
        
        # Take first meaningful words (up to 6 words or 50 chars)
        words = clean_msg.split()
        
        # Build title from first words
        title_words = []
        char_count = 0
        for word in words[:8]:  # Max 8 words to check
            if char_count + len(word) > 50:
                break
            title_words.append(word)
            char_count += len(word) + 1  # +1 for space
            if len(title_words) >= 6:
                break
        
        title = " ".join(title_words)
        
        # Add ellipsis if we truncated
        if len(title_words) < len(words):
            title += "..."
        
        # Fallback if empty or too short
        if not title or len(title) < 2:
            if agent_name:
                return f"Chat with {agent_name}"
            return "New conversation"
        
        return title
    
    @classmethod
    async def update_conversation_title(cls, conversation_id: str, first_message: str, agent_name: str = None) -> bool:
        """
        Update a conversation's title based on its first message.
        
        Args:
            conversation_id: The conversation ID
            first_message: The first user message
            agent_name: Optional agent name
            
        Returns:
            True if successful
        """
        try:
            from database.services import ConversationService
            
            # Generate title
            title = await cls.generate_title(first_message, agent_name)
            
            # Update in database
            return ConversationService.update_title(conversation_id, title)
            
        except Exception as e:
            print(f"Error updating conversation title: {e}")
            return False


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
