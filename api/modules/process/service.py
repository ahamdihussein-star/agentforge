"""
Process API Service
Business logic for process execution API

This service bridges the API layer with the Process Engine.
Integrates with the platform's security module for access control.
"""

import uuid
import logging
from typing import Dict, Any, List, Optional, AsyncIterator
from datetime import datetime
from sqlalchemy.orm import Session

from database.services.process_execution_service import ProcessExecutionService
from database.models import Agent
from core.process import (
    ProcessEngine,
    ProcessDefinition,
    ProcessContext,
    ProcessResult,
)
from core.process.nodes.base import ExecutorDependencies
from core.llm.registry import LLMRegistry
from core.llm.factory import LLMFactory
from core.tools.base import ToolRegistry, ToolConfig

from .schemas import (
    ProcessExecutionResponse,
    ApprovalRequestResponse,
    ProcessStatsResponse,
)

from core.process.services import NotificationService, ApprovalService

# Import Access Control for security integration
from api.modules.access_control.service import AccessControlService

logger = logging.getLogger(__name__)


class ProcessAPIService:
    """
    Service for process execution API operations
    """
    
    def __init__(
        self,
        db: Session,
        llm_registry: Optional[LLMRegistry] = None
    ):
        self.db = db
        self.exec_service = ProcessExecutionService(db)
        self.llm_registry = llm_registry
    
    async def start_execution(
        self,
        agent_id: str,
        org_id: str,
        user_id: str,
        trigger_input: Dict[str, Any] = None,
        trigger_type: str = "manual",
        conversation_id: str = None,
        correlation_id: str = None,
        user_info: Dict[str, Any] = None
    ) -> ProcessExecutionResponse:
        """
        Start a new process execution
        
        Security checks:
        1. Agent access - Does user have access to the agent?
        2. Execute permission - Can user execute this agent?
        3. Tool access - Which tools can user use? (filtered at runtime)
        
        Args:
            agent_id: ID of the process agent
            org_id: Organization ID
            user_id: ID of user triggering execution
            trigger_input: Input data
            trigger_type: How it was triggered
            conversation_id: Optional conversation link
            correlation_id: Optional correlation ID
            user_info: Optional user info for context
            
        Returns:
            ProcessExecutionResponse with execution details
        """
        # Get the agent
        agent = self.db.query(Agent).filter(
            Agent.id == uuid.UUID(agent_id),
            Agent.org_id == uuid.UUID(org_id)
        ).first()
        
        if not agent:
            raise ValueError(f"Agent not found: {agent_id}")
        
        if agent.agent_type != "process":
            raise ValueError(f"Agent is not a process type: {agent.agent_type}")
        
        if not agent.process_definition:
            raise ValueError("Agent has no process definition")
        
        # =========================================================
        # SECURITY CHECK 1: Agent Access Control
        # =========================================================
        owner_id = str(agent.owner_id) if agent.owner_id else str(agent.created_by)
        is_owner = user_id == owner_id
        
        if not is_owner:
            # Check if user has access to this agent
            user_roles = user_info.get('roles', []) if user_info else []
            user_groups = user_info.get('groups', []) if user_info else []
            
            access_result = AccessControlService.check_user_access(
                user_id=user_id,
                user_role_ids=user_roles,
                user_group_ids=user_groups,
                agent_id=agent_id,
                org_id=org_id
            )
            
            if not access_result.has_access:
                raise PermissionError(
                    f"Access denied: {access_result.reason or 'You do not have permission to execute this process'}"
                )
            
            # Store denied tools for filtering during execution
            denied_tool_ids = access_result.denied_tools or []
        else:
            denied_tool_ids = []  # Owner has access to all tools
        
        # =========================================================
        # MERGE SETTINGS: Org Defaults + Process Settings
        # =========================================================
        from database.services.process_settings_service import ProcessSettingsService
        
        settings_service = ProcessSettingsService(self.db)
        org_settings = settings_service.get_org_settings(org_id)
        process_settings = agent.process_settings or {}
        
        # Merge: org_settings as base, process_settings as override
        merged_settings = self._merge_settings(org_settings, process_settings)
        
        # Validate and parse process definition with merged settings
        try:
            # Inject merged settings into the definition
            definition_data = agent.process_definition.copy()
            if 'settings' not in definition_data:
                definition_data['settings'] = {}
            
            # Merge settings into definition
            definition_data['settings'] = self._merge_settings(
                merged_settings, 
                definition_data.get('settings', {})
            )
            
            process_def = ProcessDefinition.from_dict(definition_data)
        except Exception as e:
            raise ValueError(f"Invalid process definition: {e}")
        
        # Create execution record
        execution = self.exec_service.create_execution(
            agent_id=agent_id,
            org_id=org_id,
            created_by=user_id,
            trigger_type=trigger_type,
            trigger_input=trigger_input or {},
            conversation_id=conversation_id,
            correlation_id=correlation_id,
            process_definition_snapshot=agent.process_definition
        )
        
        # Update status to running
        execution = self.exec_service.update_execution_status(
            str(execution.id),
            status="running"
        )
        
        # =========================================================
        # SECURITY: Filter available tools based on access control
        # =========================================================
        available_tools = agent.tool_ids or []
        # Remove denied tools from available list
        filtered_tool_ids = [t for t in available_tools if t not in denied_tool_ids]
        
        if denied_tool_ids:
            logger.info(f"Filtered {len(denied_tool_ids)} denied tools for user {user_id}")
        
        # Build context with filtered tools
        context = ProcessContext(
            execution_id=str(execution.id),
            agent_id=agent_id,
            org_id=org_id,
            trigger_type=trigger_type,
            trigger_input=trigger_input or {},
            conversation_id=conversation_id,
            user_id=user_id,
            user_name=user_info.get('name') if user_info else None,
            user_email=user_info.get('email') if user_info else None,
            user_roles=user_info.get('roles', []) if user_info else [],
            user_groups=user_info.get('groups', []) if user_info else [],
            available_tool_ids=filtered_tool_ids,  # Filtered based on access control
            denied_tool_ids=denied_tool_ids,  # Track what's denied for error messages
            settings=agent.process_settings or {}
        )
        
        # Build dependencies (only with allowed tools)
        deps = await self._build_dependencies(agent, filtered_tool_ids)
        
        # Create engine
        engine = ProcessEngine(
            process_definition=process_def,
            context=context,
            dependencies=deps,
            execution_id=str(execution.id)
        )
        
        # Set checkpoint callback to persist to database
        async def checkpoint_callback(
            execution_id: str,
            checkpoint_data: Dict[str, Any],
            variables: Dict[str, Any],
            completed_nodes: List[str]
        ):
            self.exec_service.update_execution_state(
                execution_id=execution_id,
                checkpoint_data=checkpoint_data,
                variables=variables,
                completed_nodes=completed_nodes
            )
        
        engine.set_checkpoint_callback(checkpoint_callback)
        
        # Execute (async)
        try:
            result = await engine.execute(trigger_input)
            
            # Update execution with result
            if result.is_success:
                execution = self.exec_service.update_execution_status(
                    str(execution.id),
                    status="completed"
                )
                execution = self.exec_service.update_execution_state(
                    str(execution.id),
                    variables=result.final_variables,
                    completed_nodes=result.nodes_executed,
                    output=result.output,
                    node_count_executed=result.node_count,
                    tokens_used=result.total_tokens_used
                )
            elif result.is_waiting:
                execution = self.exec_service.update_execution_status(
                    str(execution.id),
                    status="waiting",
                    current_node_id=result.resume_node_id
                )
                execution = self.exec_service.update_execution_state(
                    str(execution.id),
                    variables=result.final_variables,
                    completed_nodes=result.nodes_executed,
                    checkpoint_data=engine.get_checkpoint()
                )
            else:
                execution = self.exec_service.update_execution_status(
                    str(execution.id),
                    status="failed",
                    error_message=result.error.message if result.error else "Unknown error",
                    error_node_id=result.failed_node_id,
                    error_details=result.error.to_dict() if result.error else None
                )
            
        except Exception as e:
            logger.error(f"Process execution error: {e}")
            execution = self.exec_service.update_execution_status(
                str(execution.id),
                status="failed",
                error_message=str(e)
            )
        
        return self._to_response(execution)
    
    async def resume_execution(
        self,
        execution_id: str,
        user_id: str,
        user_info: Dict[str, Any] = None,
        resume_input: Dict[str, Any] = None
    ) -> ProcessExecutionResponse:
        """
        Resume a paused execution
        
        Security: User must have access to the agent and appropriate permissions
        """
        execution = self.exec_service.get_execution(execution_id)
        if not execution:
            raise ValueError(f"Execution not found: {execution_id}")
        
        if execution.status not in ["waiting", "paused"]:
            raise ValueError(f"Execution cannot be resumed: {execution.status}")
        
        if not execution.checkpoint_data:
            raise ValueError("Execution has no checkpoint data")
        
        # Get agent
        agent = self.db.query(Agent).filter(
            Agent.id == execution.agent_id
        ).first()
        
        if not agent:
            raise ValueError("Agent not found")
        
        # =========================================================
        # SECURITY CHECK: User must have access or be owner
        # =========================================================
        owner_id = str(agent.owner_id) if agent.owner_id else str(agent.created_by)
        is_owner = user_id == owner_id
        created_by_user = str(execution.created_by) == user_id
        
        if not is_owner and not created_by_user:
            # Check if user has EXECUTE_PROCESS permission
            user_roles = user_info.get('roles', []) if user_info else []
            user_groups = user_info.get('groups', []) if user_info else []
            
            perm_result = AccessControlService.check_agent_permission(
                user_id=user_id,
                user_role_ids=user_roles,
                user_group_ids=user_groups,
                agent_id=str(agent.id),
                org_id=str(agent.org_id),
                permission="execute_process"
            )
            
            if not perm_result.get("has_permission"):
                raise PermissionError("You don't have permission to resume this execution")
        
        # Parse process definition from snapshot
        process_def = ProcessDefinition.from_dict(
            execution.process_definition_snapshot or agent.process_definition
        )
        
        # Build context
        context = ProcessContext(
            execution_id=str(execution.id),
            agent_id=str(execution.agent_id),
            org_id=str(execution.org_id),
            trigger_type=execution.trigger_type,
            trigger_input=execution.trigger_input,
            user_id=user_id,
            available_tool_ids=agent.tool_ids or []
        )
        
        # Build dependencies
        deps = await self._build_dependencies(agent)
        
        # Create engine with restored state
        engine = ProcessEngine(
            process_definition=process_def,
            context=context,
            dependencies=deps,
            execution_id=str(execution.id)
        )
        
        # Update status
        execution = self.exec_service.update_execution_status(
            str(execution.id),
            status="running"
        )
        
        # Resume execution
        try:
            result = await engine.resume(
                execution.checkpoint_data,
                resume_input
            )
            
            # Update execution with result
            if result.is_success:
                execution = self.exec_service.update_execution_status(
                    str(execution.id),
                    status="completed"
                )
                execution = self.exec_service.update_execution_state(
                    str(execution.id),
                    variables=result.final_variables,
                    completed_nodes=result.nodes_executed,
                    output=result.output,
                    node_count_executed=result.node_count
                )
            elif result.is_waiting:
                execution = self.exec_service.update_execution_status(
                    str(execution.id),
                    status="waiting",
                    current_node_id=result.resume_node_id
                )
                execution = self.exec_service.update_execution_state(
                    str(execution.id),
                    variables=result.final_variables,
                    completed_nodes=result.nodes_executed,
                    checkpoint_data=engine.get_checkpoint()
                )
            else:
                execution = self.exec_service.update_execution_status(
                    str(execution.id),
                    status="failed",
                    error_message=result.error.message if result.error else "Unknown error",
                    error_node_id=result.failed_node_id
                )
                
        except Exception as e:
            logger.error(f"Resume error: {e}")
            execution = self.exec_service.update_execution_status(
                str(execution.id),
                status="failed",
                error_message=str(e)
            )
        
        return self._to_response(execution)
    
    async def cancel_execution(
        self,
        execution_id: str,
        user_id: str,
        user_info: Dict[str, Any] = None,
        reason: str = None
    ) -> ProcessExecutionResponse:
        """
        Cancel an execution
        
        Security: User must be owner, execution creator, or have cancel_executions permission
        """
        execution = self.exec_service.get_execution(execution_id)
        if not execution:
            raise ValueError(f"Execution not found: {execution_id}")
        
        if execution.status in ["completed", "failed", "cancelled"]:
            raise ValueError(f"Execution already terminated: {execution.status}")
        
        # =========================================================
        # SECURITY CHECK: User must have permission to cancel
        # =========================================================
        agent = self.db.query(Agent).filter(
            Agent.id == execution.agent_id
        ).first()
        
        if agent:
            owner_id = str(agent.owner_id) if agent.owner_id else str(agent.created_by)
            is_owner = user_id == owner_id
            created_by_user = str(execution.created_by) == user_id
            
            if not is_owner and not created_by_user:
                user_roles = user_info.get('roles', []) if user_info else []
                user_groups = user_info.get('groups', []) if user_info else []
                
                perm_result = AccessControlService.check_agent_permission(
                    user_id=user_id,
                    user_role_ids=user_roles,
                    user_group_ids=user_groups,
                    agent_id=str(agent.id),
                    org_id=str(agent.org_id),
                    permission="cancel_executions"
                )
                
                if not perm_result.get("has_permission"):
                    raise PermissionError("You don't have permission to cancel this execution")
        
        execution = self.exec_service.update_execution_status(
            execution_id,
            status="cancelled",
            error_message=reason or f"Cancelled by user {user_id}"
        )
        
        logger.info(f"Execution {execution_id} cancelled by {user_id}")
        
        return self._to_response(execution)
    
    def get_execution(
        self,
        execution_id: str,
        org_id: str
    ) -> ProcessExecutionResponse:
        """Get execution details"""
        execution = self.exec_service.get_execution(execution_id)
        if not execution or str(execution.org_id) != org_id:
            raise ValueError(f"Execution not found: {execution_id}")
        
        return self._to_response(execution)
    
    def list_executions(
        self,
        org_id: str,
        agent_id: str = None,
        status: str = None,
        limit: int = 50,
        offset: int = 0
    ) -> tuple:
        """List executions"""
        executions, total = self.exec_service.list_executions(
            org_id=org_id,
            agent_id=agent_id,
            status=status,
            limit=limit,
            offset=offset
        )
        
        return [self._to_response(e) for e in executions], total
    
    # =========================================================================
    # APPROVAL METHODS
    # =========================================================================
    
    async def handle_approval_decision(
        self,
        approval_id: str,
        user_id: str,
        decision: str,
        comments: str = None,
        decision_data: Dict[str, Any] = None
    ) -> ApprovalRequestResponse:
        """Handle approval decision and resume process if needed"""
        approval = self.exec_service.get_approval_request(approval_id)
        if not approval:
            raise ValueError(f"Approval not found: {approval_id}")
        
        # Record decision
        approval = self.exec_service.decide_approval(
            approval_id=approval_id,
            decision=decision,
            decided_by=user_id,
            comments=comments,
            decision_data=decision_data
        )
        
        # If approved, resume the process
        if decision == "approved":
            try:
                await self.resume_execution(
                    str(approval.process_execution_id),
                    user_id,
                    resume_input={
                        'approval_decision': decision,
                        'approval_comments': comments,
                        'approval_data': decision_data or {}
                    }
                )
            except Exception as e:
                logger.error(f"Failed to resume after approval: {e}")
        
        return self._approval_to_response(approval)
    
    def get_pending_approvals(
        self,
        user_id: str,
        org_id: str,
        user_role_ids: List[str] = None
    ) -> List[ApprovalRequestResponse]:
        """Get pending approvals for user"""
        approvals = self.exec_service.get_pending_approvals_for_user(
            user_id=user_id,
            org_id=org_id,
            user_role_ids=user_role_ids
        )
        return [self._approval_to_response(a) for a in approvals]
    
    # =========================================================================
    # STATISTICS
    # =========================================================================
    
    def get_stats(
        self,
        org_id: str,
        agent_id: str = None,
        days: int = 30
    ) -> ProcessStatsResponse:
        """Get execution statistics with user-friendly formatting"""
        stats = self.exec_service.get_execution_stats(
            org_id=org_id,
            agent_id=agent_id,
            days=days
        )
        
        # Format for users
        avg_ms = stats.get('avg_duration_ms', 0)
        avg_display = self._format_duration(avg_ms / 1000) if avg_ms else "N/A"
        
        return ProcessStatsResponse(
            total_executions=stats.get('total_executions', 0),
            by_status=stats.get('by_status', {}),
            success_rate=stats.get('success_rate', 0),
            average_duration_display=avg_display,
            time_period=f"Last {days} day{'s' if days != 1 else ''}"
        )
    
    # =========================================================================
    # HELPER METHODS
    # =========================================================================
    
    async def _build_dependencies(
        self, 
        agent: Agent, 
        allowed_tool_ids: List[str] = None
    ) -> ExecutorDependencies:
        """
        Build executor dependencies from agent config
        
        Provides all services needed by node executors:
        - LLM for AI tasks
        - Tools for tool_call nodes (filtered by access control)
        - Notification service
        - Approval service
        
        Args:
            agent: Agent model
            allowed_tool_ids: Tools allowed for this user (after access control filtering)
        """
        llm = None
        tools = {}
        
        # Get LLM
        if self.llm_registry and agent.model_id:
            llm_config = self.llm_registry.get(agent.model_id)
            if llm_config:
                llm = LLMFactory.create(llm_config)
        
        # Use allowed tools list if provided, otherwise use all agent tools
        tool_ids_to_load = allowed_tool_ids if allowed_tool_ids is not None else (agent.tool_ids or [])
        
        # Get tools (only allowed ones)
        from database.models import Tool
        for tool_id in tool_ids_to_load:
            tool_record = self.db.query(Tool).filter(
                Tool.id == uuid.UUID(tool_id)
            ).first()
            
            if tool_record:
                try:
                    tool_config = ToolConfig(
                        type=tool_record.type,
                        name=tool_record.name,
                        config=tool_record.config or {},
                        enabled=tool_record.is_enabled,
                        requires_approval=tool_record.requires_approval
                    )
                    tool = ToolRegistry.create(tool_config)
                    tools[tool_id] = tool
                except Exception as e:
                    logger.warning(f"Failed to load tool {tool_id}: {e}")
        
        # Build notification service
        notification_service = NotificationService(db=self.db)
        
        # Build approval service
        approval_service = ApprovalService(
            db=self.db,
            exec_service=self.exec_service
        )
        
        return ExecutorDependencies(
            llm=llm,
            tools=tools,
            notification_service=notification_service,
            approval_service=approval_service
        )
    
    def _to_response(self, execution) -> ProcessExecutionResponse:
        """Convert execution model to response with business-friendly format"""
        from .schemas import StatusInfo, ErrorInfo
        from core.process.messages import get_status_info, sanitize_for_user
        
        duration = None
        duration_display = None
        if execution.started_at and execution.completed_at:
            duration = (execution.completed_at - execution.started_at).total_seconds()
            duration_display = self._format_duration(duration)
        elif execution.started_at:
            duration = (datetime.utcnow() - execution.started_at).total_seconds()
            duration_display = self._format_duration(duration)
        
        # Get user-friendly status
        status_data = get_status_info(execution.status)
        status_info = StatusInfo(**status_data)
        
        # Format error for user
        error_info = None
        if execution.error_message:
            error_info = ErrorInfo(
                title="Error Occurred",
                message=sanitize_for_user(execution.error_message),
                can_retry=execution.status in ["failed", "timed_out"]
            )
        
        return ProcessExecutionResponse(
            id=str(execution.id),
            agent_id=str(execution.agent_id),
            org_id=str(execution.org_id),
            execution_number=execution.execution_number,
            correlation_id=execution.correlation_id,
            status=execution.status,
            status_info=status_info,
            current_step=execution.current_node_id,  # TODO: Get display name
            completed_steps=execution.completed_nodes or [],
            trigger_input=execution.trigger_input or {},
            output=execution.output,
            error=error_info,
            can_resume=execution.can_resume and execution.status in ["waiting", "paused"],
            started_at=execution.started_at,
            completed_at=execution.completed_at,
            duration_display=duration_display,
            node_count_executed=execution.node_count_executed or 0,
            created_at=execution.created_at,
            created_by=str(execution.created_by)
        )
    
    def _format_duration(self, seconds: float) -> str:
        """Format duration for users"""
        if seconds < 1:
            return "Less than a second"
        elif seconds < 60:
            return f"{int(seconds)} second{'s' if seconds != 1 else ''}"
        elif seconds < 3600:
            minutes = int(seconds / 60)
            return f"{minutes} minute{'s' if minutes != 1 else ''}"
        else:
            hours = int(seconds / 3600)
            return f"{hours} hour{'s' if hours != 1 else ''}"
    
    def _approval_to_response(self, approval) -> ApprovalRequestResponse:
        """Convert approval model to response"""
        return ApprovalRequestResponse(
            id=str(approval.id),
            process_execution_id=str(approval.process_execution_id),
            node_id=approval.node_id,
            node_name=approval.node_name,
            status=approval.status,
            title=approval.title,
            description=approval.description,
            review_data=approval.review_data or {},
            priority=approval.priority,
            assignee_type=approval.assignee_type,
            assigned_user_ids=approval.assigned_user_ids or [],
            assigned_role_ids=approval.assigned_role_ids or [],
            min_approvals=approval.min_approvals,
            approval_count=approval.approval_count,
            decided_by=str(approval.decided_by) if approval.decided_by else None,
            decided_at=approval.decided_at,
            decision=approval.decision,
            decision_comments=approval.decision_comments,
            deadline_at=approval.deadline_at,
            created_at=approval.created_at
        )
    
    def _merge_settings(
        self, 
        base: Dict[str, Any], 
        override: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Deep merge settings dictionaries
        
        Args:
            base: Base settings (lower priority)
            override: Override settings (higher priority)
            
        Returns:
            Merged settings with override taking precedence
        """
        result = base.copy()
        
        for key, value in override.items():
            if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                # Recursively merge nested dicts
                result[key] = self._merge_settings(result[key], value)
            else:
                # Override value
                result[key] = value
        
        return result
