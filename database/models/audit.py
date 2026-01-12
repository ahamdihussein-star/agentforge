"""
Audit Log Models - Complete System Audit Trail
CRITICAL for government/enterprise compliance
Immutable, tamper-proof logging
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, Integer, Index, Boolean
from ..types import UUID, JSON, JSONArray
JSONB = JSON, INET
from enum import Enum

from ..base import Base


class AuditLog(Base):
    """
    Comprehensive Audit Trail
    Immutable records for compliance (SOC2, GDPR, HIPAA, etc.)
    """
    __tablename__ = "audit_logs"
    
    # Primary Key
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    
    # Multi-tenancy
    org_id = Column(UUID, nullable=False, index=True)
    
    # Actor (who did the action)
    user_id = Column(UUID, index=True)  # Nullable for system actions
    user_email = Column(String(255))  # Denormalized for reporting
    user_name = Column(String(255))
    impersonated_by = Column(UUID)  # If admin acting as user
    
    # Action
    action = Column(String(100), nullable=False, index=True)  # 'create', 'update', 'delete', 'view', etc.
    resource_type = Column(String(100), nullable=False, index=True)  # 'agent', 'user', 'document', etc.
    resource_id = Column(String(255), index=True)  # ID of affected resource
    resource_name = Column(String(500))  # Human-readable name
    
    # Details
    description = Column(Text)  # Human-readable action description
    changes = Column(JSON)  # Before/after values: {'field': {'old': ..., 'new': ...}}
    extra_metadata = Column(JSON)  # Additional context
    
    # Result
    success = Column(Boolean, nullable=False)
    error_message = Column(Text)  # If action failed
    
    # Request Context
    http_method = Column(String(10))  # GET, POST, PUT, DELETE
    http_path = Column(String(1000))
    http_status_code = Column(Integer)
    
    # Network Context
    ip_address = Column(INET, nullable=False)  # PostgreSQL INET type for IPv4/IPv6
    user_agent = Column(Text)
    device_type = Column(String(50))  # 'desktop', 'mobile', 'tablet', 'api'
    browser = Column(String(100))
    os = Column(String(100))
    
    # Session Context
    session_id = Column(UUID, index=True)
    auth_method = Column(String(50))  # 'password', 'oauth', 'sso', 'api_key'
    
    # Geolocation (for security analysis)
    country_code = Column(String(2))  # ISO 3166-1 alpha-2
    city = Column(String(100))
    
    # Severity (for alerting)
    severity = Column(String(20))  # 'info', 'warning', 'critical'
    
    # Tags (for categorization)
    tags = Column(JSON)  # ['security', 'data_export', 'pii_access', etc.]
    
    # Compliance Flags
    requires_review = Column(Boolean, default=False)
    reviewed = Column(Boolean, default=False)
    reviewed_by = Column(UUID)
    reviewed_at = Column(DateTime)
    review_notes = Column(Text)
    
    # Retention
    retention_policy_id = Column(UUID)
    scheduled_deletion_at = Column(DateTime)  # Auto-archive date
    
    # Immutable Timestamp (NEVER updated)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Checksum for tamper detection
    checksum = Column(String(64))  # SHA-256 of critical fields
    
    def __repr__(self):
        return f"<AuditLog {self.action} {self.resource_type} by {self.user_email}>"
    
    def to_dict(self):
        """Convert to dictionary for API response"""
        return {
            'id': str(self.id),
            'user_email': self.user_email,
            'action': self.action,
            'resource_type': self.resource_type,
            'resource_id': self.resource_id,
            'resource_name': self.resource_name,
            'description': self.description,
            'success': self.success,
            'ip_address': str(self.ip_address) if self.ip_address else None,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
        }


class SecurityEvent(Base):
    """
    Security-specific Events
    Suspicious activities, failed logins, etc.
    """
    __tablename__ = "security_events"
    
    # Primary Key
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    
    # Multi-tenancy
    org_id = Column(UUID, index=True)
    
    # Event Type
    event_type = Column(String(100), nullable=False, index=True)
    # Examples: 'failed_login', 'brute_force_attempt', 'suspicious_activity',
    #           'unauthorized_access', 'privilege_escalation', 'data_exfiltration'
    
    # Severity
    severity = Column(String(20), nullable=False, index=True)  # 'low', 'medium', 'high', 'critical'
    
    # Actor
    user_id = Column(UUID, index=True)
    user_email = Column(String(255))
    target_user_id = Column(UUID)  # If action targeted another user
    
    # Details
    description = Column(Text, nullable=False)
    details = Column(JSON)  # Full event details
    
    # Context
    ip_address = Column(INET, nullable=False)
    user_agent = Column(Text)
    session_id = Column(UUID)
    country_code = Column(String(2))
    
    # Response
    blocked = Column(Boolean, default=False)  # Was action blocked automatically
    block_reason = Column(String(255))
    
    # Investigation
    investigated = Column(Boolean, default=False)
    investigated_by = Column(UUID)
    investigated_at = Column(DateTime)
    investigation_notes = Column(Text)
    false_positive = Column(Boolean)
    
    # Alerting
    alert_sent = Column(Boolean, default=False)
    alert_sent_to = Column(JSON)  # Array of user IDs/emails notified
    alert_sent_at = Column(DateTime)
    
    # Timestamp
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    def __repr__(self):
        return f"<SecurityEvent {self.event_type} [{self.severity}]>"


class DataExport(Base):
    """
    Data Export Audit Trail
    CRITICAL for compliance (GDPR, HIPAA)
    """
    __tablename__ = "data_exports"
    
    # Primary Key
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    
    # Multi-tenancy
    org_id = Column(UUID, nullable=False, index=True)
    
    # Requester
    requested_by = Column(UUID, nullable=False, index=True)
    requester_email = Column(String(255), nullable=False)
    
    # Export Details
    export_type = Column(String(100), nullable=False)  # 'user_data', 'audit_logs', 'conversations', etc.
    resource_types = Column(JSON)  # Array of resource types included
    date_range_start = Column(DateTime)
    date_range_end = Column(DateTime)
    
    # Filters
    filters = Column(JSON)  # Applied filters
    record_count = Column(Integer)  # Number of records exported
    
    # File
    file_format = Column(String(20))  # 'json', 'csv', 'pdf'
    file_size_bytes = Column(Integer)
    file_path = Column(String(1000))  # Storage location
    file_hash = Column(String(64))  # SHA-256 for integrity
    encrypted = Column(Boolean, default=False)
    
    # Access
    download_count = Column(Integer, default=0)
    last_downloaded_at = Column(DateTime)
    expires_at = Column(DateTime)  # Auto-delete date
    
    # Approval (for sensitive data)
    requires_approval = Column(Boolean, default=False)
    approved = Column(Boolean)
    approved_by = Column(UUID)
    approved_at = Column(DateTime)
    approval_notes = Column(Text)
    
    # Status
    status = Column(String(50), default='pending')  # 'pending', 'processing', 'completed', 'failed'
    completed_at = Column(DateTime)
    error_message = Column(Text)
    
    # Network Context
    ip_address = Column(INET, nullable=False)
    
    # Audit
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    deleted_at = Column(DateTime)  # When file was auto-deleted
    
    def __repr__(self):
        return f"<DataExport {self.export_type} by {self.requester_email}>"


class ComplianceReport(Base):
    """
    Compliance Reports
    Pre-generated reports for auditors
    """
    __tablename__ = "compliance_reports"
    
    # Primary Key
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    
    # Multi-tenancy
    org_id = Column(UUID, nullable=False, index=True)
    
    # Report Info
    report_type = Column(String(100), nullable=False)  # 'soc2', 'gdpr', 'hipaa', 'iso27001'
    title = Column(String(255), nullable=False)
    description = Column(Text)
    
    # Time Period
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)
    
    # Metrics
    metrics = Column(JSON)  # Summary statistics
    findings = Column(JSON)  # Issues/violations found
    
    # File
    file_path = Column(String(1000))
    file_size_bytes = Column(Integer)
    file_hash = Column(String(64))
    
    # Status
    status = Column(String(50), default='pending')
    
    # Audit
    generated_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    generated_by = Column(UUID, nullable=False)
    
    def __repr__(self):
        return f"<ComplianceReport {self.report_type} {self.period_start} to {self.period_end}>"


# Critical indexes for audit queries
Index('idx_audit_org_time', AuditLog.org_id, AuditLog.timestamp.desc())
Index('idx_audit_user_time', AuditLog.user_id, AuditLog.timestamp.desc())
Index('idx_audit_resource', AuditLog.resource_type, AuditLog.resource_id, AuditLog.timestamp.desc())
Index('idx_audit_action_time', AuditLog.action, AuditLog.timestamp.desc())
Index('idx_security_event_severity', SecurityEvent.org_id, SecurityEvent.severity, SecurityEvent.timestamp.desc())
Index('idx_security_event_type', SecurityEvent.event_type, SecurityEvent.timestamp.desc())
Index('idx_data_export_org_time', DataExport.org_id, DataExport.created_at.desc())

