"""
Conversation Management Router

API endpoints for conversation management:
- GET /conversations - List conversations with filtering
- DELETE /conversations/bulk - Delete multiple conversations
- DELETE /conversations/all - Delete all conversations for agent
- GET /conversations/stats - Get conversation statistics
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import List, Optional

from .service import ConversationManagementService, ConversationTitleService

# Try to import security
try:
    from api.security import get_current_user
    from core.security import User
    SECURITY_AVAILABLE = True
except ImportError:
    SECURITY_AVAILABLE = False
    User = None
    def get_current_user():
        return None


router = APIRouter(prefix="/api/conversations", tags=["Conversations"])


class BulkDeleteRequest(BaseModel):
    """Request to delete multiple conversations"""
    conversation_ids: List[str]


class BulkDeleteResponse(BaseModel):
    """Response for bulk delete operation"""
    total: int
    deleted: int
    failed: int
    errors: List[dict] = []


class ConversationListResponse(BaseModel):
    """Response for conversation list"""
    conversations: List[dict]
    total: int
    limit: int
    offset: int


class ConversationStatsResponse(BaseModel):
    """Response for conversation statistics"""
    total_conversations: int
    total_messages: int
    oldest: Optional[str] = None
    newest: Optional[str] = None


@router.get("/agent/{agent_id}", response_model=ConversationListResponse)
async def list_conversations(
    agent_id: str,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    search: Optional[str] = None,
    current_user = Depends(get_current_user) if SECURITY_AVAILABLE else None
):
    """
    List conversations for an agent with optional filtering.
    
    - **agent_id**: Agent ID
    - **limit**: Max conversations to return (default 50)
    - **offset**: Offset for pagination
    - **search**: Optional search term for title
    """
    if not current_user:
        raise HTTPException(401, "Authentication required")
    
    user_id = str(current_user.id)
    org_id = current_user.org_id if hasattr(current_user, 'org_id') else "org_default"
    
    conversations, total = ConversationManagementService.get_conversations(
        agent_id=agent_id,
        user_id=user_id,
        org_id=org_id,
        limit=limit,
        offset=offset,
        search=search
    )
    
    return {
        "conversations": conversations,
        "total": total,
        "limit": limit,
        "offset": offset
    }


@router.delete("/bulk", response_model=BulkDeleteResponse)
async def delete_conversations_bulk(
    request: BulkDeleteRequest,
    current_user = Depends(get_current_user) if SECURITY_AVAILABLE else None
):
    """
    Delete multiple conversations at once.
    
    - **conversation_ids**: List of conversation IDs to delete
    """
    if not current_user:
        raise HTTPException(401, "Authentication required")
    
    if not request.conversation_ids:
        raise HTTPException(400, "No conversation IDs provided")
    
    if len(request.conversation_ids) > 100:
        raise HTTPException(400, "Cannot delete more than 100 conversations at once")
    
    user_id = str(current_user.id)
    org_id = current_user.org_id if hasattr(current_user, 'org_id') else "org_default"
    
    result = ConversationManagementService.delete_conversations_bulk(
        conversation_ids=request.conversation_ids,
        user_id=user_id,
        org_id=org_id
    )
    
    return result


@router.delete("/agent/{agent_id}/all", response_model=BulkDeleteResponse)
async def delete_all_conversations(
    agent_id: str,
    current_user = Depends(get_current_user) if SECURITY_AVAILABLE else None
):
    """
    Delete all conversations for the current user on an agent.
    
    - **agent_id**: Agent ID
    """
    if not current_user:
        raise HTTPException(401, "Authentication required")
    
    user_id = str(current_user.id)
    org_id = current_user.org_id if hasattr(current_user, 'org_id') else "org_default"
    
    result = ConversationManagementService.delete_all_conversations(
        agent_id=agent_id,
        user_id=user_id,
        org_id=org_id
    )
    
    return result


@router.get("/agent/{agent_id}/stats", response_model=ConversationStatsResponse)
async def get_conversation_stats(
    agent_id: str,
    current_user = Depends(get_current_user) if SECURITY_AVAILABLE else None
):
    """
    Get statistics about user's conversations on an agent.
    
    - **agent_id**: Agent ID
    """
    if not current_user:
        raise HTTPException(401, "Authentication required")
    
    user_id = str(current_user.id)
    org_id = current_user.org_id if hasattr(current_user, 'org_id') else "org_default"
    
    stats = ConversationManagementService.get_conversation_stats(
        agent_id=agent_id,
        user_id=user_id,
        org_id=org_id
    )
    
    return stats


@router.delete("/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    current_user = Depends(get_current_user) if SECURITY_AVAILABLE else None
):
    """
    Delete a single conversation.
    
    - **conversation_id**: Conversation ID to delete
    """
    if not current_user:
        raise HTTPException(401, "Authentication required")
    
    user_id = str(current_user.id)
    org_id = current_user.org_id if hasattr(current_user, 'org_id') else "org_default"
    
    success, message = ConversationManagementService.delete_conversation(
        conversation_id=conversation_id,
        user_id=user_id,
        org_id=org_id
    )
    
    if not success:
        raise HTTPException(400, message)
    
    return {"success": True, "message": message}


class UpdateTitleRequest(BaseModel):
    """Request to update conversation title"""
    title: Optional[str] = None
    first_message: Optional[str] = None
    agent_name: Optional[str] = None
    auto_generate: bool = False


@router.patch("/{conversation_id}/title")
async def update_conversation_title(
    conversation_id: str,
    request: UpdateTitleRequest,
    current_user = Depends(get_current_user) if SECURITY_AVAILABLE else None
):
    """
    Update a conversation's title.
    
    - **conversation_id**: Conversation ID
    - **title**: New title (optional, if not auto-generating)
    - **first_message**: First message content (for auto-generation)
    - **agent_name**: Agent name (for fallback title)
    - **auto_generate**: If true, generate title from first_message using AI
    """
    if not current_user:
        raise HTTPException(401, "Authentication required")
    
    from database.services import ConversationService
    
    if request.auto_generate and request.first_message:
        # Generate title using AI
        title = await ConversationTitleService.generate_title(
            first_message=request.first_message,
            agent_name=request.agent_name
        )
    elif request.title:
        title = request.title
    elif request.first_message:
        # Use sync fallback
        title = ConversationTitleService.generate_title_sync(
            first_message=request.first_message,
            agent_name=request.agent_name
        )
    else:
        raise HTTPException(400, "Either title or first_message is required")
    
    # Update in database
    success = ConversationService.update_title(conversation_id, title)
    
    if not success:
        raise HTTPException(400, "Failed to update conversation title")
    
    return {"success": True, "title": title}
