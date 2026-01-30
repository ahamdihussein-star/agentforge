"""
Approval Service
Handles approval workflow logic for human-in-the-loop processes

This service:
- Creates approval requests
- Tracks approval status
- Handles escalation
- Manages deadlines
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import uuid

logger = logging.getLogger(__name__)


class ApprovalService:
    """
    Service for managing approval workflows
    """
    
    def __init__(self, db=None, exec_service=None):
        """
        Initialize approval service
        
        Args:
            db: Database session
            exec_service: ProcessExecutionService instance
        """
        self.db = db
        self.exec_service = exec_service
    
    async def create_approval_request(
        self,
        execution_id: str,
        org_id: str,
        node_id: str,
        node_name: str,
        title: str,
        description: str = None,
        review_data: Dict[str, Any] = None,
        assignee_type: str = "user",
        assignee_ids: List[str] = None,
        min_approvals: int = 1,
        priority: str = "normal",
        timeout_hours: int = 24,
        escalation_config: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Create a new approval request
        
        Args:
            execution_id: Process execution ID
            org_id: Organization ID
            node_id: Node that requires approval
            node_name: Display name of the node
            title: Approval request title
            description: Description for approver
            review_data: Data to review
            assignee_type: user, role, group, department
            assignee_ids: List of assignee IDs
            min_approvals: Minimum approvals needed
            priority: low, normal, high, urgent
            timeout_hours: Hours before timeout
            escalation_config: Escalation settings
            
        Returns:
            Created approval request details
        """
        if not self.exec_service:
            logger.error("No execution service configured")
            return {'success': False, 'error': 'Service not configured'}
        
        # Calculate deadline
        deadline = datetime.utcnow() + timedelta(hours=timeout_hours)
        
        # Map assignee_ids to user_ids, role_ids, or group_ids per assignee_type
        user_ids = assignee_ids or []
        role_ids = []
        group_ids = []
        
        if assignee_type == 'role':
            role_ids = user_ids
            user_ids = []
        elif assignee_type == 'group':
            group_ids = user_ids
            user_ids = []
        
        # Create approval via service
        try:
            approval = self.exec_service.create_approval_request(
                process_execution_id=execution_id,
                org_id=org_id,
                node_id=node_id,
                node_name=node_name,
                title=title,
                description=description,
                review_data=review_data or {},
                assignee_type=assignee_type,
                assigned_user_ids=user_ids,
                assigned_role_ids=role_ids,
                assigned_group_ids=group_ids,
                min_approvals=min_approvals,
                priority=priority,
                deadline_at=deadline,
                escalation_enabled=bool(escalation_config),
                escalation_after_hours=escalation_config.get('after_hours') if escalation_config else None,
                escalation_user_ids=escalation_config.get('assignee_ids', []) if escalation_config else []
            )
            
            logger.info(f"Created approval request {approval.id} for execution {execution_id}")
            
            return {
                'success': True,
                'approval_id': str(approval.id),
                'deadline': deadline.isoformat(),
                'assignees': assignee_ids
            }
            
        except Exception as e:
            logger.error(f"Failed to create approval request: {e}")
            return {'success': False, 'error': str(e)}
    
    async def get_approval_status(
        self,
        approval_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get current status of an approval request
        """
        if not self.exec_service:
            return None
        
        approval = self.exec_service.get_approval_request(approval_id)
        if not approval:
            return None
        
        return {
            'id': str(approval.id),
            'status': approval.status,
            'title': approval.title,
            'priority': approval.priority,
            'deadline_at': approval.deadline_at.isoformat() if approval.deadline_at else None,
            'approval_count': approval.approval_count,
            'min_approvals': approval.min_approvals,
            'decided_by': str(approval.decided_by) if approval.decided_by else None,
            'decided_at': approval.decided_at.isoformat() if approval.decided_at else None,
            'decision': approval.decision,
            'is_pending': approval.status == 'pending',
            'is_approved': approval.status == 'approved',
            'is_rejected': approval.status == 'rejected',
            'is_expired': approval.is_expired
        }
    
    async def process_decision(
        self,
        approval_id: str,
        user_id: str,
        decision: str,
        comments: str = None,
        decision_data: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Process an approval decision
        
        Args:
            approval_id: Approval request ID
            user_id: User making the decision
            decision: approved or rejected
            comments: Decision comments
            decision_data: Additional decision data
            
        Returns:
            Result with next steps
        """
        if not self.exec_service:
            return {'success': False, 'error': 'Service not configured'}
        
        try:
            # Get current approval
            approval = self.exec_service.get_approval_request(approval_id)
            if not approval:
                return {'success': False, 'error': 'Approval not found'}
            
            if approval.status != 'pending':
                return {
                    'success': False, 
                    'error': f'Approval already {approval.status}'
                }
            
            # Record the decision
            updated = self.exec_service.decide_approval(
                approval_id=approval_id,
                decision=decision,
                decided_by=user_id,
                comments=comments,
                decision_data=decision_data
            )
            
            logger.info(f"Approval {approval_id} {decision} by {user_id}")
            
            return {
                'success': True,
                'approval_id': approval_id,
                'decision': decision,
                'execution_id': str(approval.process_execution_id),
                'can_resume': decision == 'approved'
            }
            
        except Exception as e:
            logger.error(f"Failed to process approval decision: {e}")
            return {'success': False, 'error': str(e)}
    
    async def check_and_handle_timeouts(
        self,
        org_id: str
    ) -> List[Dict[str, Any]]:
        """
        Check for timed-out approvals and handle them
        
        Should be called periodically (e.g., by a background task)
        """
        if not self.exec_service:
            return []
        
        try:
            expired = self.exec_service.check_expired_approvals(org_id)
            
            results = []
            for approval in expired:
                results.append({
                    'approval_id': str(approval.id),
                    'execution_id': str(approval.process_execution_id),
                    'status': 'expired',
                    'title': approval.title
                })
                
                logger.info(f"Approval {approval.id} expired")
            
            return results
            
        except Exception as e:
            logger.error(f"Failed to check timeouts: {e}")
            return []
    
    async def get_pending_for_user(
        self,
        user_id: str,
        org_id: str,
        role_ids: List[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get all pending approvals for a user
        """
        if not self.exec_service:
            return []
        
        try:
            approvals = self.exec_service.get_pending_approvals_for_user(
                user_id=user_id,
                org_id=org_id,
                user_role_ids=role_ids
            )
            
            return [
                {
                    'id': str(a.id),
                    'title': a.title,
                    'description': a.description,
                    'priority': a.priority,
                    'deadline_at': a.deadline_at.isoformat() if a.deadline_at else None,
                    'review_data': a.review_data,
                    'created_at': a.created_at.isoformat(),
                    'execution_id': str(a.process_execution_id),
                    'node_name': a.node_name
                }
                for a in approvals
            ]
            
        except Exception as e:
            logger.error(f"Failed to get pending approvals: {e}")
            return []
    
    async def escalate(
        self,
        approval_id: str
    ) -> Dict[str, Any]:
        """
        Escalate an approval to the escalation contacts
        """
        if not self.exec_service:
            return {'success': False, 'error': 'Service not configured'}
        
        approval = self.exec_service.get_approval_request(approval_id)
        if not approval:
            return {'success': False, 'error': 'Approval not found'}
        
        if approval.escalated:
            return {'success': False, 'error': 'Already escalated'}
        
        # Mark as escalated
        approval.escalated = True
        approval.escalated_at = datetime.utcnow()
        self.exec_service.db.commit()
        
        logger.info(f"Approval {approval_id} escalated to {approval.escalation_user_ids}")
        
        return {
            'success': True,
            'escalated_to': approval.escalation_user_ids
        }
