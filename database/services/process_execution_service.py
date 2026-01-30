"""
Process Execution Service
Database operations for process executions

This service handles:
- Creating and updating process executions
- Managing node execution records
- Handling approval requests
- Querying execution history

All database-agnostic operations.
"""

import logging
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, func

logger = logging.getLogger(__name__)

from ..models.process_execution import (
    ProcessExecution, 
    ProcessNodeExecution, 
    ProcessApprovalRequest
)
from ..models.agent import Agent


class ProcessExecutionService:
    """
    Service for managing process executions
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    # =========================================================================
    # PROCESS EXECUTION CRUD
    # =========================================================================
    
    def create_execution(
        self,
        agent_id: str,
        org_id: str,
        created_by: str,
        trigger_type: str = "manual",
        trigger_input: Dict[str, Any] = None,
        conversation_id: str = None,
        correlation_id: str = None,
        process_definition_snapshot: Dict[str, Any] = None
    ) -> ProcessExecution:
        """
        Create a new process execution
        
        Args:
            agent_id: ID of the process agent
            org_id: Organization ID
            created_by: User ID who triggered the execution
            trigger_type: How the process was triggered
            trigger_input: Input data from trigger
            conversation_id: Optional linked conversation
            correlation_id: Optional correlation ID for tracking
            process_definition_snapshot: Snapshot of process definition
            
        Returns:
            Created ProcessExecution
        """
        # Get execution number for this agent
        execution_number = self._get_next_execution_number(agent_id)
        
        execution = ProcessExecution(
            id=uuid.uuid4(),
            org_id=uuid.UUID(org_id) if isinstance(org_id, str) else org_id,
            agent_id=uuid.UUID(agent_id) if isinstance(agent_id, str) else agent_id,
            conversation_id=uuid.UUID(conversation_id) if conversation_id else None,
            execution_number=execution_number,
            correlation_id=correlation_id,
            status="pending",
            trigger_type=trigger_type,
            trigger_input=trigger_input or {},
            variables={},
            completed_nodes=[],
            skipped_nodes=[],
            created_by=uuid.UUID(created_by) if isinstance(created_by, str) else created_by,
            process_definition_snapshot=process_definition_snapshot,
            extra_metadata={}
        )
        
        self.db.add(execution)
        self.db.commit()
        self.db.refresh(execution)
        
        return execution
    
    def get_execution(self, execution_id: str) -> Optional[ProcessExecution]:
        """Get execution by ID"""
        return self.db.query(ProcessExecution).filter(
            ProcessExecution.id == uuid.UUID(execution_id)
        ).first()
    
    def get_execution_by_correlation(
        self, 
        correlation_id: str,
        org_id: str = None
    ) -> Optional[ProcessExecution]:
        """Get execution by correlation ID"""
        query = self.db.query(ProcessExecution).filter(
            ProcessExecution.correlation_id == correlation_id
        )
        if org_id:
            query = query.filter(ProcessExecution.org_id == uuid.UUID(org_id))
        return query.first()
    
    def update_execution_status(
        self,
        execution_id: str,
        status: str,
        current_node_id: str = None,
        error_message: str = None,
        error_node_id: str = None,
        error_details: Dict[str, Any] = None
    ) -> ProcessExecution:
        """Update execution status"""
        execution = self.get_execution(execution_id)
        if not execution:
            raise ValueError(f"Execution not found: {execution_id}")
        
        execution.status = status
        
        if current_node_id is not None:
            execution.current_node_id = current_node_id
        
        if status == "running" and not execution.started_at:
            execution.started_at = datetime.utcnow()
        
        if status in ["completed", "failed", "cancelled", "timed_out"]:
            execution.completed_at = datetime.utcnow()
            if execution.started_at:
                execution.total_duration_ms = (
                    execution.completed_at - execution.started_at
                ).total_seconds() * 1000
        
        if error_message:
            execution.error_message = error_message
            execution.error_node_id = error_node_id
            execution.error_details = error_details
        
        execution.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(execution)
        
        return execution
    
    def update_execution_state(
        self,
        execution_id: str,
        variables: Dict[str, Any] = None,
        completed_nodes: List[str] = None,
        skipped_nodes: List[str] = None,
        checkpoint_data: Dict[str, Any] = None,
        output: Any = None,
        node_count_executed: int = None,
        tokens_used: int = None
    ) -> ProcessExecution:
        """Update execution state and variables"""
        execution = self.get_execution(execution_id)
        if not execution:
            raise ValueError(f"Execution not found: {execution_id}")
        
        if variables is not None:
            execution.variables = variables
        
        if completed_nodes is not None:
            execution.completed_nodes = completed_nodes
        
        if skipped_nodes is not None:
            execution.skipped_nodes = skipped_nodes
        
        if checkpoint_data is not None:
            execution.checkpoint_data = checkpoint_data
            execution.checkpoint_at = datetime.utcnow()
        
        if output is not None:
            execution.output = output
        
        if node_count_executed is not None:
            execution.node_count_executed = node_count_executed
        
        if tokens_used is not None:
            execution.tokens_used = tokens_used
        
        execution.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(execution)
        
        return execution
    
    def list_executions(
        self,
        org_id: str,
        agent_id: str = None,
        status: str = None,
        created_by: str = None,
        limit: int = 50,
        offset: int = 0,
        order_desc: bool = True
    ) -> Tuple[List[ProcessExecution], int]:
        """
        List executions with filters
        
        Returns:
            Tuple of (executions, total_count)
        """
        query = self.db.query(ProcessExecution).filter(
            ProcessExecution.org_id == uuid.UUID(org_id)
        )
        
        if agent_id:
            query = query.filter(ProcessExecution.agent_id == uuid.UUID(agent_id))
        
        if status:
            if status == "active":
                query = query.filter(ProcessExecution.status.in_([
                    "pending", "running", "waiting", "paused"
                ]))
            elif status == "terminal":
                query = query.filter(ProcessExecution.status.in_([
                    "completed", "failed", "cancelled", "timed_out"
                ]))
            else:
                query = query.filter(ProcessExecution.status == status)
        
        if created_by:
            query = query.filter(ProcessExecution.created_by == uuid.UUID(created_by))
        
        total = query.count()
        
        if order_desc:
            query = query.order_by(desc(ProcessExecution.created_at))
        else:
            query = query.order_by(ProcessExecution.created_at)
        
        executions = query.offset(offset).limit(limit).all()
        
        return executions, total
    
    def get_active_executions(self, org_id: str) -> List[ProcessExecution]:
        """Get all active (non-terminal) executions"""
        return self.db.query(ProcessExecution).filter(
            and_(
                ProcessExecution.org_id == uuid.UUID(org_id),
                ProcessExecution.status.in_(["pending", "running", "waiting", "paused"])
            )
        ).all()
    
    def _get_next_execution_number(self, agent_id: str) -> int:
        """Get next execution number for an agent"""
        result = self.db.query(func.max(ProcessExecution.execution_number)).filter(
            ProcessExecution.agent_id == uuid.UUID(agent_id)
        ).scalar()
        return (result or 0) + 1
    
    # =========================================================================
    # NODE EXECUTION TRACKING
    # =========================================================================
    
    def create_node_execution(
        self,
        process_execution_id: str,
        node_id: str,
        node_type: str,
        node_name: str = None,
        execution_order: int = 0,
        input_data: Dict[str, Any] = None,
        variables_before: Dict[str, Any] = None
    ) -> ProcessNodeExecution:
        """Create a node execution record"""
        node_exec = ProcessNodeExecution(
            id=uuid.uuid4(),
            process_execution_id=uuid.UUID(process_execution_id),
            node_id=node_id,
            node_type=node_type,
            node_name=node_name,
            execution_order=execution_order,
            status="running",
            input_data=input_data or {},
            variables_before=variables_before or {},
            started_at=datetime.utcnow()
        )
        
        self.db.add(node_exec)
        self.db.commit()
        self.db.refresh(node_exec)
        
        return node_exec
    
    def complete_node_execution(
        self,
        node_execution_id: str,
        status: str,
        output_data: Any = None,
        variables_after: Dict[str, Any] = None,
        branch_taken: str = None,
        error_message: str = None,
        error_type: str = None,
        duration_ms: float = None,
        tokens_used: int = None
    ) -> ProcessNodeExecution:
        """Complete a node execution"""
        node_exec = self.db.query(ProcessNodeExecution).filter(
            ProcessNodeExecution.id == uuid.UUID(node_execution_id)
        ).first()
        
        if not node_exec:
            raise ValueError(f"Node execution not found: {node_execution_id}")
        
        node_exec.status = status
        node_exec.output_data = output_data
        node_exec.variables_after = variables_after or {}
        node_exec.branch_taken = branch_taken
        node_exec.completed_at = datetime.utcnow()
        
        if duration_ms is not None:
            node_exec.duration_ms = duration_ms
        elif node_exec.started_at:
            node_exec.duration_ms = (
                node_exec.completed_at - node_exec.started_at
            ).total_seconds() * 1000
        
        if error_message:
            node_exec.error_message = error_message
            node_exec.error_type = error_type
        
        if tokens_used:
            node_exec.llm_tokens_used = tokens_used
        
        self.db.commit()
        self.db.refresh(node_exec)
        
        return node_exec
    
    def get_node_executions(
        self, 
        process_execution_id: str
    ) -> List[ProcessNodeExecution]:
        """Get all node executions for a process execution"""
        return self.db.query(ProcessNodeExecution).filter(
            ProcessNodeExecution.process_execution_id == uuid.UUID(process_execution_id)
        ).order_by(ProcessNodeExecution.execution_order).all()
    
    # =========================================================================
    # APPROVAL REQUESTS
    # =========================================================================
    
    def create_approval_request(
        self,
        process_execution_id: str,
        org_id: str,
        node_id: str,
        node_name: str,
        title: str,
        description: str = None,
        review_data: Dict[str, Any] = None,
        assignee_type: str = "user",
        assigned_user_ids: List[str] = None,
        assigned_role_ids: List[str] = None,
        min_approvals: int = 1,
        priority: str = "normal",
        deadline_at: datetime = None,
        escalation_enabled: bool = False,
        escalation_after_hours: int = None,
        escalation_user_ids: List[str] = None
    ) -> ProcessApprovalRequest:
        """Create an approval request"""
        approval_id = uuid.uuid4()
        assigned_user_ids_str = [str(uid) for uid in (assigned_user_ids or [])]
        assigned_role_ids_str = [str(rid) for rid in (assigned_role_ids or [])]
        logger.info(
            "[ApprovalDB] INSERT approval: id=%s execution_id=%s org_id=%s node_id=%s node_name=%s "
            "assignee_type=%s assigned_user_ids=%s assigned_role_ids=%s",
            approval_id, process_execution_id, org_id, node_id, node_name,
            assignee_type, assigned_user_ids_str, assigned_role_ids_str,
        )
        approval = ProcessApprovalRequest(
            id=approval_id,
            org_id=uuid.UUID(org_id),
            process_execution_id=uuid.UUID(process_execution_id),
            node_id=node_id,
            node_name=node_name,
            status="pending",
            title=title,
            description=description,
            review_data=review_data or {},
            priority=priority,
            assignee_type=assignee_type,
            assigned_user_ids=assigned_user_ids_str,
            assigned_role_ids=assigned_role_ids_str,
            min_approvals=min_approvals,
            deadline_at=deadline_at,
            escalate_after_hours=escalation_after_hours if escalation_enabled else None,
            escalation_user_ids=[str(uid) for uid in (escalation_user_ids or [])]
        )
        
        self.db.add(approval)
        self.db.commit()
        self.db.refresh(approval)
        logger.info("[ApprovalDB] INSERT success: approval_id=%s", str(approval.id))
        return approval
    
    def get_approval_request(self, approval_id: str) -> Optional[ProcessApprovalRequest]:
        """Get approval request by ID"""
        return self.db.query(ProcessApprovalRequest).filter(
            ProcessApprovalRequest.id == uuid.UUID(approval_id)
        ).first()
    
    def get_pending_approvals_for_execution(
        self, 
        process_execution_id: str
    ) -> List[ProcessApprovalRequest]:
        """Get pending approvals for an execution"""
        return self.db.query(ProcessApprovalRequest).filter(
            and_(
                ProcessApprovalRequest.process_execution_id == uuid.UUID(process_execution_id),
                ProcessApprovalRequest.status == "pending"
            )
        ).all()
    
    def get_pending_approvals_for_user(
        self,
        user_id: str,
        org_id: str,
        user_role_ids: List[str] = None
    ) -> List[ProcessApprovalRequest]:
        """
        Get pending approvals assigned to a user
        
        Filters approvals where:
        - User ID is in assigned_user_ids, OR
        - Any of user's role IDs is in assigned_role_ids
        
        Since we use JSON columns (TEXT) for compatibility, we perform
        the filtering in Python after fetching pending approvals.
        """
        logger.info(
            "[ApprovalDB] RETRIEVE pending: user_id=%s org_id=%s user_role_ids_count=%s",
            user_id, org_id, len(user_role_ids or []),
        )
        try:
            org_uuid = org_id if isinstance(org_id, uuid.UUID) else uuid.UUID(str(org_id))
        except (ValueError, TypeError):
            logger.warning("[ApprovalDB] Invalid org_id for approval list: %s", org_id)
            return []
        # Get all pending approvals for the org
        pending = self.db.query(ProcessApprovalRequest).filter(
            and_(
                ProcessApprovalRequest.org_id == org_uuid,
                ProcessApprovalRequest.status == "pending"
            )
        ).order_by(desc(ProcessApprovalRequest.created_at)).all()
        logger.info(
            "[ApprovalDB] RETRIEVE from DB: org_id=%s status=pending -> count=%s (approval_ids=%s)",
            org_id, len(pending), [str(a.id) for a in pending],
        )
        
        # Filter by user assignment (normalize IDs to strings for comparison)
        result = []
        user_role_set = set(str(r) for r in (user_role_ids or []))
        
        for approval in pending:
            assigned_users = approval.assigned_user_ids or []
            assigned_roles = approval.assigned_role_ids or []
            assigned_users_str = [str(u) for u in assigned_users]
            assigned_roles_str = [str(r) for r in assigned_roles]

            # Check if user is directly assigned (compare as strings; DB may store UUID strings)
            if assigned_users and str(user_id) in assigned_users_str:
                result.append(approval)
                logger.info("[ApprovalDB] include approval_id=%s reason=user_assigned", str(approval.id))
                continue

            # Check if user's role is assigned
            if assigned_roles and user_role_set.intersection(set(assigned_roles_str)):
                result.append(approval)
                logger.info("[ApprovalDB] include approval_id=%s reason=role_assigned", str(approval.id))
                continue

            # Anyone can approve: assignee_type is 'any' OR no assignees configured (workflow creator often approves their own run)
            if (approval.assignee_type == 'any' or
                    (not assigned_users and not assigned_roles)):
                result.append(approval)
                logger.info(
                    "[ApprovalDB] include approval_id=%s reason=any_or_empty (assignee_type=%s assigned_users=%s assigned_roles=%s)",
                    str(approval.id), approval.assignee_type, len(assigned_users), len(assigned_roles),
                )
                continue
            logger.info(
                "[ApprovalDB] exclude approval_id=%s (user_id not in %s, roles %s not in %s, assignee_type=%s)",
                str(approval.id), assigned_users_str, list(user_role_set), assigned_roles_str, approval.assignee_type,
            )

        logger.info("[ApprovalDB] RETRIEVE result: returning count=%s", len(result))
        return result
    
    def decide_approval(
        self,
        approval_id: str,
        decision: str,  # approved, rejected
        decided_by: str,
        comments: str = None,
        decision_data: Dict[str, Any] = None
    ) -> ProcessApprovalRequest:
        """Record approval decision"""
        approval = self.get_approval_request(approval_id)
        if not approval:
            raise ValueError(f"Approval not found: {approval_id}")
        
        if approval.status != "pending":
            raise ValueError(f"Approval is not pending: {approval.status}")
        
        approval.decision = decision
        approval.decided_by = uuid.UUID(decided_by)
        approval.decided_at = datetime.utcnow()
        approval.decision_comments = comments
        approval.decision_data = decision_data or {}
        approval.status = decision  # approved or rejected
        approval.approval_count += 1
        approval.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(approval)
        
        return approval
    
    def check_expired_approvals(self, org_id: str) -> List[ProcessApprovalRequest]:
        """Find and mark expired approvals"""
        now = datetime.utcnow()
        
        expired = self.db.query(ProcessApprovalRequest).filter(
            and_(
                ProcessApprovalRequest.org_id == uuid.UUID(org_id),
                ProcessApprovalRequest.status == "pending",
                ProcessApprovalRequest.deadline_at < now
            )
        ).all()
        
        for approval in expired:
            approval.status = "expired"
            approval.updated_at = now
        
        if expired:
            self.db.commit()
        
        return expired
    
    # =========================================================================
    # ANALYTICS
    # =========================================================================
    
    def get_execution_stats(
        self,
        org_id: str,
        agent_id: str = None,
        days: int = 30
    ) -> Dict[str, Any]:
        """Get execution statistics"""
        since = datetime.utcnow() - timedelta(days=days)
        
        query = self.db.query(ProcessExecution).filter(
            and_(
                ProcessExecution.org_id == uuid.UUID(org_id),
                ProcessExecution.created_at >= since
            )
        )
        
        if agent_id:
            query = query.filter(ProcessExecution.agent_id == uuid.UUID(agent_id))
        
        executions = query.all()
        
        # Calculate stats
        total = len(executions)
        by_status = {}
        total_duration = 0
        completed_count = 0
        
        for ex in executions:
            by_status[ex.status] = by_status.get(ex.status, 0) + 1
            if ex.total_duration_ms and ex.status == "completed":
                total_duration += ex.total_duration_ms
                completed_count += 1
        
        return {
            'total_executions': total,
            'by_status': by_status,
            'success_rate': (by_status.get('completed', 0) / total * 100) if total > 0 else 0,
            'avg_duration_ms': total_duration / completed_count if completed_count > 0 else 0,
            'period_days': days
        }
