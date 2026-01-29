"""
Process Settings Model
Organization and process-level configuration for workflow execution

This provides a configuration hierarchy:
1. System Defaults (hardcoded fallbacks)
2. Organization Defaults (from this table)
3. Process Settings (in agent.process_settings)
4. Node-level Config (in node.config)
"""

from sqlalchemy import Column, String, Boolean, Integer, Float, ForeignKey, Text, Index
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import json

from ..base import Base
# Note: Using String(36) instead of UUID for database-agnostic compatibility
# The migration creates VARCHAR(36) columns, so we match that here


class ProcessOrgSettings(Base):
    """
    Organization-level process settings
    
    Provides default values for all process agents in an organization.
    Can be overridden at the process or node level.
    """
    __tablename__ = 'process_org_settings'
    
    # Use String(36) for database-agnostic UUID storage
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id = Column(String(36), nullable=False, unique=True, index=True)
    
    # =========================================================================
    # EXECUTION LIMITS
    # =========================================================================
    max_execution_time_seconds = Column(Integer, default=3600)  # 1 hour
    max_node_executions = Column(Integer, default=1000)
    max_parallel_branches = Column(Integer, default=10)
    max_loop_iterations = Column(Integer, default=1000)
    checkpoint_interval_nodes = Column(Integer, default=5)
    
    # =========================================================================
    # RETRY POLICY
    # =========================================================================
    default_retry_attempts = Column(Integer, default=3)
    default_retry_delay_seconds = Column(Integer, default=5)
    default_retry_backoff_multiplier = Column(Float, default=2.0)
    retry_on_errors = Column(Text, default='["timeout", "connection_error", "rate_limit"]')
    
    # =========================================================================
    # TIMEOUT DEFAULTS
    # =========================================================================
    default_node_timeout_seconds = Column(Integer, default=300)  # 5 min
    default_http_timeout_seconds = Column(Integer, default=30)
    default_database_timeout_seconds = Column(Integer, default=60)
    
    # =========================================================================
    # AI TASK DEFAULTS
    # =========================================================================
    default_ai_temperature = Column(Float, default=0.7)
    default_ai_max_tokens = Column(Integer, default=4096)
    default_conversation_history_limit = Column(Integer, default=10)
    
    # =========================================================================
    # APPROVAL DEFAULTS
    # =========================================================================
    default_approval_timeout_hours = Column(Integer, default=24)
    default_approval_timeout_action = Column(String(20), default='fail')  # fail, skip, escalate
    default_min_approvals = Column(Integer, default=1)
    escalation_enabled = Column(Boolean, default=True)
    escalation_after_hours = Column(Integer, default=12)
    
    # =========================================================================
    # NOTIFICATION DEFAULTS
    # =========================================================================
    default_notification_channel = Column(String(20), default='email')
    from_email_address = Column(String(255), default=None)
    notification_priority = Column(String(20), default='normal')
    
    # =========================================================================
    # BUSINESS HOURS
    # =========================================================================
    business_hours_start = Column(Integer, default=9)
    business_hours_end = Column(Integer, default=17)
    business_days = Column(Text, default='[0, 1, 2, 3, 4]')  # Mon-Fri
    timezone = Column(String(50), default='UTC')
    holidays = Column(Text, default='[]')  # List of YYYY-MM-DD
    
    # =========================================================================
    # HTTP DEFAULTS
    # =========================================================================
    default_http_success_codes = Column(Text, default='[200, 201, 202, 204]')
    default_http_auth_type = Column(String(20), default='none')
    default_api_key_header = Column(String(100), default='X-API-Key')
    
    # =========================================================================
    # DATABASE DEFAULTS
    # =========================================================================
    default_database_max_rows = Column(Integer, default=1000)
    
    # =========================================================================
    # FILE DEFAULTS
    # =========================================================================
    default_file_encoding = Column(String(20), default='utf-8')
    default_aws_region = Column(String(50), default='us-east-1')
    
    # =========================================================================
    # LOGGING
    # =========================================================================
    log_level = Column(String(20), default='info')
    log_sensitive_data = Column(Boolean, default=False)
    audit_enabled = Column(Boolean, default=True)
    
    # =========================================================================
    # METADATA
    # =========================================================================
    created_at = Column(String(50), default=lambda: datetime.utcnow().isoformat())
    updated_at = Column(String(50), default=lambda: datetime.utcnow().isoformat(), onupdate=lambda: datetime.utcnow().isoformat())
    updated_by = Column(String(36), nullable=True)  # String for database-agnostic compatibility
    
    def to_dict(self) -> dict:
        """Convert to dictionary for API responses"""
        return {
            'id': str(self.id),
            'org_id': str(self.org_id),
            
            # Execution limits
            'execution_limits': {
                'max_execution_time_seconds': self.max_execution_time_seconds,
                'max_node_executions': self.max_node_executions,
                'max_parallel_branches': self.max_parallel_branches,
                'max_loop_iterations': self.max_loop_iterations,
                'checkpoint_interval_nodes': self.checkpoint_interval_nodes,
            },
            
            # Retry policy
            'retry_policy': {
                'max_attempts': self.default_retry_attempts,
                'delay_seconds': self.default_retry_delay_seconds,
                'backoff_multiplier': self.default_retry_backoff_multiplier,
                'retry_on': json.loads(self.retry_on_errors or '[]'),
            },
            
            # Timeouts
            'timeouts': {
                'node': self.default_node_timeout_seconds,
                'http': self.default_http_timeout_seconds,
                'database': self.default_database_timeout_seconds,
            },
            
            # AI settings
            'ai_defaults': {
                'temperature': self.default_ai_temperature,
                'max_tokens': self.default_ai_max_tokens,
                'conversation_history_limit': self.default_conversation_history_limit,
            },
            
            # Approval settings
            'approval_defaults': {
                'timeout_hours': self.default_approval_timeout_hours,
                'timeout_action': self.default_approval_timeout_action,
                'min_approvals': self.default_min_approvals,
                'escalation_enabled': self.escalation_enabled,
                'escalation_after_hours': self.escalation_after_hours,
            },
            
            # Business hours
            'business_hours': {
                'start_hour': self.business_hours_start,
                'end_hour': self.business_hours_end,
                'days': json.loads(self.business_days or '[]'),
                'timezone': self.timezone,
                'holidays': json.loads(self.holidays or '[]'),
            },
            
            # HTTP defaults
            'http_defaults': {
                'success_codes': json.loads(self.default_http_success_codes or '[]'),
                'auth_type': self.default_http_auth_type,
                'api_key_header': self.default_api_key_header,
                'timeout_seconds': self.default_http_timeout_seconds,
            },
            
            # Notification
            'notification_defaults': {
                'channel': self.default_notification_channel,
                'from_email': self.from_email_address,
                'priority': self.notification_priority,
            },
            
            # Other
            'database_max_rows': self.default_database_max_rows,
            'file_encoding': self.default_file_encoding,
            'aws_region': self.default_aws_region,
            'log_level': self.log_level,
            'audit_enabled': self.audit_enabled,
        }
    
    @classmethod
    def get_defaults(cls) -> dict:
        """Get system defaults (used when no org settings exist)"""
        return cls().to_dict()


class ProcessNodeType(Base):
    """
    Dynamic node type definitions
    
    Allows adding new node types without code changes.
    UI loads available types from this table.
    """
    __tablename__ = 'process_node_types'
    
    id = Column(String(50), primary_key=True)  # e.g., 'ai_task', 'http_request'
    
    # Display info
    display_name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(50), nullable=False)  # flow, logic, task, integration, human, data, timing
    icon = Column(String(50), default='cube')
    color = Column(String(20), default='#666666')
    
    # Configuration schema (JSON Schema)
    config_schema = Column(Text, nullable=True)  # JSON Schema for node config
    
    # Default configuration
    default_config = Column(Text, default='{}')
    
    # Capabilities
    has_inputs = Column(Boolean, default=True)
    has_outputs = Column(Boolean, default=True)
    max_inputs = Column(Integer, default=-1)  # -1 = unlimited
    max_outputs = Column(Integer, default=-1)
    
    # Availability
    is_enabled = Column(Boolean, default=True)
    is_beta = Column(Boolean, default=False)
    requires_feature_flag = Column(String(100), nullable=True)
    
    # Ordering
    sort_order = Column(Integer, default=0)
    
    # Metadata
    created_at = Column(String(50), default=lambda: datetime.utcnow().isoformat())
    
    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'display_name': self.display_name,
            'description': self.description,
            'category': self.category,
            'icon': self.icon,
            'color': self.color,
            'config_schema': json.loads(self.config_schema) if self.config_schema else None,
            'default_config': json.loads(self.default_config) if self.default_config else {},
            'has_inputs': self.has_inputs,
            'has_outputs': self.has_outputs,
            'max_inputs': self.max_inputs,
            'max_outputs': self.max_outputs,
            'is_enabled': self.is_enabled,
            'is_beta': self.is_beta,
        }


class ProcessTemplate(Base):
    """
    Reusable process templates
    
    Pre-built workflows that users can use as starting points.
    Similar to "agent templates" in conversational AI.
    """
    __tablename__ = 'process_templates'
    
    # Use String(36) for database-agnostic UUID storage
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Template info
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), default='general')  # general, integration, approval, data_pipeline
    icon = Column(String(50), default='template')
    
    # The process definition (same schema as agent.process_definition)
    process_definition = Column(Text, nullable=False)
    
    # Default settings
    default_settings = Column(Text, default='{}')
    
    # Availability
    is_public = Column(Boolean, default=False)  # Available to all orgs
    org_id = Column(String(36), nullable=True)  # If private to an org (String for db-agnostic)
    
    # Usage stats
    use_count = Column(Integer, default=0)
    
    # Metadata
    created_by = Column(String(36), nullable=True)  # String for db-agnostic
    created_at = Column(String(50), default=lambda: datetime.utcnow().isoformat())
    updated_at = Column(String(50), default=lambda: datetime.utcnow().isoformat())
    
    def to_dict(self) -> dict:
        return {
            'id': str(self.id),
            'name': self.name,
            'description': self.description,
            'category': self.category,
            'icon': self.icon,
            'process_definition': json.loads(self.process_definition) if self.process_definition else None,
            'default_settings': json.loads(self.default_settings) if self.default_settings else {},
            'is_public': self.is_public,
            'use_count': self.use_count,
        }


# Indexes
Index('idx_process_node_types_category', ProcessNodeType.category)
Index('idx_process_templates_category', ProcessTemplate.category)
Index('idx_process_templates_org', ProcessTemplate.org_id)
