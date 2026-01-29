"""
Process Settings Service
Manages organization-level process settings and templates

Provides a configuration hierarchy:
1. System Defaults (hardcoded fallbacks)
2. Organization Defaults (from ProcessOrgSettings)
3. Process Settings (in agent.process_settings)
4. Node-level Config (in node.config)
"""

import uuid
import json
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from sqlalchemy.orm import Session

from database.models.process_settings import (
    ProcessOrgSettings,
    ProcessNodeType,
    ProcessTemplate
)

logger = logging.getLogger(__name__)


# =============================================================================
# SYSTEM DEFAULTS (Ultimate fallback)
# =============================================================================

SYSTEM_DEFAULTS = {
    'execution_limits': {
        'max_execution_time_seconds': 3600,
        'max_node_executions': 1000,
        'max_parallel_branches': 10,
        'max_loop_iterations': 1000,
        'checkpoint_interval_nodes': 5,
    },
    'retry_policy': {
        'max_attempts': 3,
        'delay_seconds': 5,
        'backoff_multiplier': 2.0,
        'retry_on': ['timeout', 'connection_error', 'rate_limit'],
    },
    'timeouts': {
        'node': 300,
        'http': 30,
        'database': 60,
    },
    'ai_defaults': {
        'temperature': 0.7,
        'max_tokens': 4096,
        'conversation_history_limit': 10,
    },
    'approval_defaults': {
        'timeout_hours': 24,
        'timeout_action': 'fail',
        'min_approvals': 1,
        'escalation_enabled': True,
        'escalation_after_hours': 12,
    },
    'business_hours': {
        'start_hour': 9,
        'end_hour': 17,
        'days': [0, 1, 2, 3, 4],  # Mon-Fri
        'timezone': 'UTC',
        'holidays': [],
    },
    'http_defaults': {
        'success_codes': [200, 201, 202, 204],
        'auth_type': 'none',
        'api_key_header': 'X-API-Key',
        'timeout_seconds': 30,
    },
    'notification_defaults': {
        'channel': 'email',
        'from_email': None,
        'priority': 'normal',
    },
    'database_max_rows': 1000,
    'file_encoding': 'utf-8',
    'aws_region': 'us-east-1',
    'log_level': 'info',
    'audit_enabled': True,
}


# =============================================================================
# DEFAULT NODE TYPES
# =============================================================================

DEFAULT_NODE_TYPES = [
    # Flow Control
    {
        'id': 'start',
        'display_name': 'Start',
        'description': 'Entry point of the process',
        'category': 'flow',
        'icon': 'play-circle',
        'color': '#28a745',
        'has_inputs': False,
        'has_outputs': True,
        'max_outputs': 1,
    },
    {
        'id': 'end',
        'display_name': 'End',
        'description': 'Exit point of the process',
        'category': 'flow',
        'icon': 'stop-circle',
        'color': '#dc3545',
        'has_inputs': True,
        'has_outputs': False,
    },
    {
        'id': 'merge',
        'display_name': 'Merge',
        'description': 'Merge parallel branches',
        'category': 'flow',
        'icon': 'git-merge',
        'color': '#6c757d',
    },
    
    # Logic
    {
        'id': 'condition',
        'display_name': 'Condition',
        'description': 'If/else branching',
        'category': 'logic',
        'icon': 'git-branch',
        'color': '#fd7e14',
    },
    {
        'id': 'switch',
        'display_name': 'Switch',
        'description': 'Multi-way branching',
        'category': 'logic',
        'icon': 'list',
        'color': '#fd7e14',
    },
    {
        'id': 'loop',
        'display_name': 'Loop',
        'description': 'Iterate over items',
        'category': 'logic',
        'icon': 'repeat',
        'color': '#fd7e14',
    },
    {
        'id': 'parallel',
        'display_name': 'Parallel',
        'description': 'Execute branches in parallel',
        'category': 'logic',
        'icon': 'git-branch',
        'color': '#fd7e14',
    },
    
    # AI & Tasks
    {
        'id': 'ai_task',
        'display_name': 'AI Task',
        'description': 'LLM-powered task',
        'category': 'task',
        'icon': 'brain',
        'color': '#6f42c1',
        'config_schema': {
            'type': 'object',
            'properties': {
                'prompt': {'type': 'string', 'description': 'Prompt template'},
                'model': {'type': 'string', 'description': 'Model override'},
                'temperature': {'type': 'number', 'minimum': 0, 'maximum': 2},
                'output_format': {'type': 'string', 'enum': ['text', 'json', 'structured']},
            },
            'required': ['prompt'],
        },
    },
    {
        'id': 'tool_call',
        'display_name': 'Tool Call',
        'description': 'Execute a platform tool',
        'category': 'task',
        'icon': 'wrench',
        'color': '#6f42c1',
    },
    {
        'id': 'script',
        'display_name': 'Script',
        'description': 'Execute custom code',
        'category': 'task',
        'icon': 'code',
        'color': '#6f42c1',
    },
    
    # Integration
    {
        'id': 'http_request',
        'display_name': 'HTTP Request',
        'description': 'Call REST API',
        'category': 'integration',
        'icon': 'globe',
        'color': '#17a2b8',
    },
    {
        'id': 'database_query',
        'display_name': 'Database Query',
        'description': 'Query database',
        'category': 'integration',
        'icon': 'database',
        'color': '#17a2b8',
    },
    {
        'id': 'file_operation',
        'display_name': 'File Operation',
        'description': 'Read/write files',
        'category': 'integration',
        'icon': 'file',
        'color': '#17a2b8',
    },
    {
        'id': 'message_queue',
        'display_name': 'Message Queue',
        'description': 'Publish to queue',
        'category': 'integration',
        'icon': 'mail',
        'color': '#17a2b8',
    },
    
    # Human
    {
        'id': 'approval',
        'display_name': 'Approval',
        'description': 'Request approval',
        'category': 'human',
        'icon': 'check-circle',
        'color': '#e83e8c',
    },
    {
        'id': 'human_task',
        'display_name': 'Human Task',
        'description': 'Assign task to user',
        'category': 'human',
        'icon': 'user',
        'color': '#e83e8c',
    },
    {
        'id': 'notification',
        'display_name': 'Notification',
        'description': 'Send notification',
        'category': 'human',
        'icon': 'bell',
        'color': '#e83e8c',
    },
    
    # Data
    {
        'id': 'transform',
        'display_name': 'Transform',
        'description': 'Transform data',
        'category': 'data',
        'icon': 'shuffle',
        'color': '#20c997',
    },
    {
        'id': 'validate',
        'display_name': 'Validate',
        'description': 'Validate data',
        'category': 'data',
        'icon': 'check-square',
        'color': '#20c997',
    },
    {
        'id': 'filter',
        'display_name': 'Filter',
        'description': 'Filter array data',
        'category': 'data',
        'icon': 'filter',
        'color': '#20c997',
    },
    
    # Timing
    {
        'id': 'delay',
        'display_name': 'Delay',
        'description': 'Wait for duration',
        'category': 'timing',
        'icon': 'clock',
        'color': '#6c757d',
    },
    {
        'id': 'schedule',
        'display_name': 'Schedule',
        'description': 'Wait until time',
        'category': 'timing',
        'icon': 'calendar',
        'color': '#6c757d',
    },
]


class ProcessSettingsService:
    """Service for managing process settings"""
    
    def __init__(self, db: Session):
        self.db = db
    
    # =========================================================================
    # ORGANIZATION SETTINGS
    # =========================================================================
    
    def get_org_settings(self, org_id: str) -> Dict[str, Any]:
        """
        Get settings for an organization
        
        Returns merged settings: System Defaults + Org Overrides
        """
        settings = self.db.query(ProcessOrgSettings).filter(
            ProcessOrgSettings.org_id == uuid.UUID(org_id)
        ).first()
        
        if settings:
            return settings.to_dict()
        
        # Return system defaults
        return SYSTEM_DEFAULTS.copy()
    
    def update_org_settings(
        self,
        org_id: str,
        updates: Dict[str, Any],
        updated_by: str
    ) -> Dict[str, Any]:
        """Update organization settings"""
        settings = self.db.query(ProcessOrgSettings).filter(
            ProcessOrgSettings.org_id == uuid.UUID(org_id)
        ).first()
        
        if not settings:
            settings = ProcessOrgSettings(
                org_id=uuid.UUID(org_id),
                created_at=datetime.utcnow().isoformat()
            )
            self.db.add(settings)
        
        # Flatten nested updates
        if 'execution_limits' in updates:
            limits = updates['execution_limits']
            settings.max_execution_time_seconds = limits.get('max_execution_time_seconds', settings.max_execution_time_seconds)
            settings.max_node_executions = limits.get('max_node_executions', settings.max_node_executions)
            settings.max_parallel_branches = limits.get('max_parallel_branches', settings.max_parallel_branches)
            settings.max_loop_iterations = limits.get('max_loop_iterations', settings.max_loop_iterations)
            settings.checkpoint_interval_nodes = limits.get('checkpoint_interval_nodes', settings.checkpoint_interval_nodes)
        
        if 'retry_policy' in updates:
            retry = updates['retry_policy']
            settings.default_retry_attempts = retry.get('max_attempts', settings.default_retry_attempts)
            settings.default_retry_delay_seconds = retry.get('delay_seconds', settings.default_retry_delay_seconds)
            settings.default_retry_backoff_multiplier = retry.get('backoff_multiplier', settings.default_retry_backoff_multiplier)
            if 'retry_on' in retry:
                settings.retry_on_errors = json.dumps(retry['retry_on'])
        
        if 'timeouts' in updates:
            timeouts = updates['timeouts']
            settings.default_node_timeout_seconds = timeouts.get('node', settings.default_node_timeout_seconds)
            settings.default_http_timeout_seconds = timeouts.get('http', settings.default_http_timeout_seconds)
            settings.default_database_timeout_seconds = timeouts.get('database', settings.default_database_timeout_seconds)
        
        if 'ai_defaults' in updates:
            ai = updates['ai_defaults']
            settings.default_ai_temperature = ai.get('temperature', settings.default_ai_temperature)
            settings.default_ai_max_tokens = ai.get('max_tokens', settings.default_ai_max_tokens)
            settings.default_conversation_history_limit = ai.get('conversation_history_limit', settings.default_conversation_history_limit)
        
        if 'approval_defaults' in updates:
            approval = updates['approval_defaults']
            settings.default_approval_timeout_hours = approval.get('timeout_hours', settings.default_approval_timeout_hours)
            settings.default_approval_timeout_action = approval.get('timeout_action', settings.default_approval_timeout_action)
            settings.default_min_approvals = approval.get('min_approvals', settings.default_min_approvals)
            settings.escalation_enabled = approval.get('escalation_enabled', settings.escalation_enabled)
            settings.escalation_after_hours = approval.get('escalation_after_hours', settings.escalation_after_hours)
        
        if 'business_hours' in updates:
            bh = updates['business_hours']
            settings.business_hours_start = bh.get('start_hour', settings.business_hours_start)
            settings.business_hours_end = bh.get('end_hour', settings.business_hours_end)
            settings.timezone = bh.get('timezone', settings.timezone)
            if 'days' in bh:
                settings.business_days = json.dumps(bh['days'])
            if 'holidays' in bh:
                settings.holidays = json.dumps(bh['holidays'])
        
        if 'notification_defaults' in updates:
            notif = updates['notification_defaults']
            settings.default_notification_channel = notif.get('channel', settings.default_notification_channel)
            settings.from_email_address = notif.get('from_email', settings.from_email_address)
            settings.notification_priority = notif.get('priority', settings.notification_priority)
        
        settings.updated_at = datetime.utcnow().isoformat()
        settings.updated_by = uuid.UUID(updated_by)
        
        self.db.commit()
        self.db.refresh(settings)
        
        return settings.to_dict()
    
    def get_setting_value(
        self,
        org_id: str,
        path: str,
        process_settings: Dict[str, Any] = None,
        node_config: Dict[str, Any] = None
    ) -> Any:
        """
        Get a specific setting value with hierarchy resolution
        
        Resolution order:
        1. Node config (if provided)
        2. Process settings (if provided)
        3. Organization settings
        4. System defaults
        
        Args:
            org_id: Organization ID
            path: Dot-notation path (e.g., 'approval_defaults.timeout_hours')
            process_settings: Process-level settings override
            node_config: Node-level config override
        """
        keys = path.split('.')
        
        # Try node config first
        if node_config:
            value = self._get_nested(node_config, keys)
            if value is not None:
                return value
        
        # Try process settings
        if process_settings:
            value = self._get_nested(process_settings, keys)
            if value is not None:
                return value
        
        # Try org settings
        org_settings = self.get_org_settings(org_id)
        value = self._get_nested(org_settings, keys)
        if value is not None:
            return value
        
        # Fall back to system defaults
        return self._get_nested(SYSTEM_DEFAULTS, keys)
    
    def _get_nested(self, data: Dict, keys: List[str]) -> Any:
        """Get nested value from dict"""
        for key in keys:
            if isinstance(data, dict) and key in data:
                data = data[key]
            else:
                return None
        return data
    
    # =========================================================================
    # NODE TYPES
    # =========================================================================
    
    def get_node_types(self, include_disabled: bool = False) -> List[Dict[str, Any]]:
        """Get all available node types"""
        query = self.db.query(ProcessNodeType)
        
        if not include_disabled:
            query = query.filter(ProcessNodeType.is_enabled == True)
        
        types = query.order_by(
            ProcessNodeType.category,
            ProcessNodeType.sort_order
        ).all()
        
        if types:
            return [t.to_dict() for t in types]
        
        # Return defaults if table is empty
        return DEFAULT_NODE_TYPES
    
    def get_node_types_by_category(self) -> Dict[str, List[Dict[str, Any]]]:
        """Get node types grouped by category"""
        types = self.get_node_types()
        
        grouped = {}
        for node_type in types:
            category = node_type['category']
            if category not in grouped:
                grouped[category] = []
            grouped[category].append(node_type)
        
        return grouped
    
    def initialize_node_types(self) -> int:
        """Initialize node types table with defaults"""
        count = 0
        for type_data in DEFAULT_NODE_TYPES:
            existing = self.db.query(ProcessNodeType).filter(
                ProcessNodeType.id == type_data['id']
            ).first()
            
            if not existing:
                node_type = ProcessNodeType(
                    id=type_data['id'],
                    display_name=type_data['display_name'],
                    description=type_data.get('description'),
                    category=type_data['category'],
                    icon=type_data.get('icon', 'cube'),
                    color=type_data.get('color', '#666666'),
                    config_schema=json.dumps(type_data.get('config_schema')) if type_data.get('config_schema') else None,
                    has_inputs=type_data.get('has_inputs', True),
                    has_outputs=type_data.get('has_outputs', True),
                    max_inputs=type_data.get('max_inputs', -1),
                    max_outputs=type_data.get('max_outputs', -1),
                )
                self.db.add(node_type)
                count += 1
        
        self.db.commit()
        return count
    
    # =========================================================================
    # TEMPLATES
    # =========================================================================
    
    def get_templates(
        self,
        org_id: str = None,
        category: str = None,
        include_public: bool = True
    ) -> List[Dict[str, Any]]:
        """Get available process templates"""
        query = self.db.query(ProcessTemplate)
        
        conditions = []
        
        if include_public:
            conditions.append(ProcessTemplate.is_public == True)
        
        if org_id:
            conditions.append(ProcessTemplate.org_id == uuid.UUID(org_id))
        
        if conditions:
            from sqlalchemy import or_
            query = query.filter(or_(*conditions))
        
        if category:
            query = query.filter(ProcessTemplate.category == category)
        
        templates = query.order_by(ProcessTemplate.use_count.desc()).all()
        
        return [t.to_dict() for t in templates]
    
    def create_template(
        self,
        name: str,
        process_definition: Dict[str, Any],
        description: str = None,
        category: str = 'general',
        is_public: bool = False,
        org_id: str = None,
        created_by: str = None
    ) -> Dict[str, Any]:
        """Create a new process template"""
        template = ProcessTemplate(
            name=name,
            description=description,
            category=category,
            process_definition=json.dumps(process_definition),
            is_public=is_public,
            org_id=uuid.UUID(org_id) if org_id else None,
            created_by=uuid.UUID(created_by) if created_by else None
        )
        
        self.db.add(template)
        self.db.commit()
        self.db.refresh(template)
        
        return template.to_dict()
    
    def use_template(self, template_id: str) -> Dict[str, Any]:
        """Get template and increment use count"""
        template = self.db.query(ProcessTemplate).filter(
            ProcessTemplate.id == uuid.UUID(template_id)
        ).first()
        
        if not template:
            raise ValueError(f"Template not found: {template_id}")
        
        template.use_count += 1
        self.db.commit()
        
        return template.to_dict()
