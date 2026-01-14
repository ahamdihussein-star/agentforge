"""
Knowledge Base Models - RAG & Document Management
Enterprise document management with access control
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, Integer, Enum as SQLEnum, Index, Boolean, Float
from ..column_types import UUID, JSON, JSONArray
JSONB = JSON, JSONArray
from enum import Enum

from ..base import Base


class DocumentStatus(str, Enum):
    """Document processing status"""
    PENDING = "pending"
    PROCESSING = "processing"
    INDEXED = "indexed"
    FAILED = "failed"
    ARCHIVED = "archived"


class DocumentType(str, Enum):
    """Document file types"""
    PDF = "pdf"
    DOCX = "docx"
    TXT = "txt"
    MD = "md"
    HTML = "html"
    CSV = "csv"
    XLSX = "xlsx"
    JSON = "json"
    OTHER = "other"


class KnowledgeBase(Base):
    """
    Knowledge Base Collection
    Logical grouping of documents
    """
    __tablename__ = "knowledge_bases"
    
    # Primary Key
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    
    # Multi-tenancy
    org_id = Column(UUID, nullable=False, index=True)
    
    # Basic Info
    name = Column(String(255), nullable=False)
    description = Column(Text)
    icon = Column(String(10), default="📚")
    
    # Configuration
    embedding_model = Column(String(100))  # Model used for embeddings
    chunk_size = Column(Integer, default=1000)
    chunk_overlap = Column(Integer, default=200)
    search_top_k = Column(Integer, default=5)
    
    # Stats
    document_count = Column(Integer, default=0)
    total_chunks = Column(Integer, default=0)
    total_size_bytes = Column(Integer, default=0)
    
    # Access Control
    is_public = Column(Boolean, default=False)
    owner_id = Column(UUID, nullable=False, index=True)
    shared_with_user_ids = Column(JSONArray, default=[])
    shared_with_role_ids = Column(JSONArray, default=[])
    
    # Usage Tracking
    query_count = Column(Integer, default=0)
    last_queried_at = Column(DateTime)
    
    # Soft Delete
    deleted_at = Column(DateTime)
    deleted_by = Column(UUID)
    
    # Audit Trail
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_by = Column(UUID, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = Column(UUID)
    
    # Additional metadata
    extra_metadata = Column(JSON, default={})
    
    def __repr__(self):
        return f"<KnowledgeBase {self.name}>"
    
    def to_dict(self):
        return {
            'id': str(self.id),
            'org_id': str(self.org_id),
            'name': self.name,
            'description': self.description,
            'icon': self.icon,
            'document_count': self.document_count,
            'total_chunks': self.total_chunks,
            'owner_id': str(self.owner_id),
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class Document(Base):
    """
    Individual Document
    Full audit trail and versioning
    """
    __tablename__ = "documents"
    
    # Primary Key
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    
    # References
    kb_id = Column(UUID, nullable=False, index=True)
    org_id = Column(UUID, nullable=False, index=True)
    
    # File Info
    filename = Column(String(500), nullable=False)
    file_type = Column(SQLEnum(DocumentType), nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    file_hash = Column(String(64), index=True)  # SHA-256 for duplicate detection
    storage_path = Column(String(1000))  # S3 key or local path
    
    # Content
    title = Column(String(500))  # Extracted or user-provided
    content = Column(Text)  # Full text content
    content_preview = Column(String(500))  # First 500 chars
    
    # Processing
    status = Column(SQLEnum(DocumentStatus), default=DocumentStatus.PENDING, nullable=False)
    processing_started_at = Column(DateTime)
    processing_completed_at = Column(DateTime)
    processing_error = Column(Text)
    
    # Chunking
    chunk_count = Column(Integer, default=0)
    total_tokens = Column(Integer)  # Total token count
    
    # Metadata Extraction
    language = Column(String(10))  # ISO 639-1 code
    author = Column(String(255))
    created_date = Column(DateTime)  # Document creation date (metadata)
    tags = Column(JSONArray)  # User or auto-generated tags
    
    # Security Classification
    classification = Column(String(50))  # 'public', 'internal', 'confidential', 'secret'
    contains_pii = Column(Boolean, default=False)
    pii_types = Column(JSONArray)
    
    # Versioning
    version = Column(Integer, default=1)
    parent_version_id = Column(UUID)
    
    # Access Control (inherited from KB by default)
    override_kb_permissions = Column(Boolean, default=False)
    allowed_user_ids = Column(JSONArray)
    allowed_role_ids = Column(JSONArray)
    
    # Usage Tracking
    view_count = Column(Integer, default=0)
    last_viewed_at = Column(DateTime)
    citation_count = Column(Integer, default=0)  # Times cited in AI responses
    
    # Soft Delete
    deleted_at = Column(DateTime)
    deleted_by = Column(UUID)
    
    # Audit Trail
    uploaded_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    uploaded_by = Column(UUID, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = Column(UUID)
    
    # Additional metadata
    extra_metadata = Column(JSON, default={})
    
    def __repr__(self):
        return f"<Document {self.filename}>"
    
    def to_dict(self):
        return {
            'id': str(self.id),
            'kb_id': str(self.kb_id),
            'filename': self.filename,
            'file_type': self.file_type.value if self.file_type else None,
            'file_size_bytes': self.file_size_bytes,
            'title': self.title,
            'status': self.status.value if self.status else None,
            'chunk_count': self.chunk_count,
            'tags': self.tags,
            'classification': self.classification,
            'uploaded_at': self.uploaded_at.isoformat() if self.uploaded_at else None,
        }


class DocumentChunk(Base):
    """
    Document Chunks for RAG
    Optimized for vector search
    """
    __tablename__ = "document_chunks"
    
    # Primary Key
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    
    # References
    document_id = Column(UUID, nullable=False, index=True)
    kb_id = Column(UUID, nullable=False, index=True)
    org_id = Column(UUID, nullable=False, index=True)
    
    # Chunk Content
    content = Column(Text, nullable=False)
    chunk_index = Column(Integer, nullable=False)  # Position in document
    
    # Vector Embedding
    embedding_model = Column(String(100), nullable=False)
    vector_id = Column(String(255))  # ID in vector database (Chroma/Pinecone/etc.)
    
    # Metadata for Better Retrieval
    page_number = Column(Integer)  # For PDFs
    section_title = Column(String(500))
    start_char = Column(Integer)  # Character position in original document
    end_char = Column(Integer)
    
    # Token Count
    token_count = Column(Integer)
    
    # Audit
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    def __repr__(self):
        return f"<DocumentChunk {self.document_id}:{self.chunk_index}>"


class KBQuery(Base):
    """
    Knowledge Base Query Log
    For analytics and improvement
    """
    __tablename__ = "kb_queries"
    
    # Primary Key
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    
    # References
    kb_id = Column(UUID, nullable=False, index=True)
    org_id = Column(UUID, nullable=False, index=True)
    user_id = Column(UUID, nullable=False, index=True)
    
    # Query
    query_text = Column(Text, nullable=False)
    query_embedding_model = Column(String(100))
    
    # Results
    results_count = Column(Integer)
    top_document_ids = Column(JSONArray)
    relevance_scores = Column(JSONArray)  # Similarity scores as JSON array
    
    # Performance
    search_duration_ms = Column(Integer)
    
    # Feedback
    user_feedback = Column(String(20))  # 'helpful', 'not_helpful'
    user_feedback_comment = Column(Text)
    
    # Audit
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    def __repr__(self):
        return f"<KBQuery {self.query_text[:50]}>"


# Composite indexes for performance
Index('idx_kb_org_owner', KnowledgeBase.org_id, KnowledgeBase.owner_id)
Index('idx_document_kb_status', Document.kb_id, Document.status)
Index('idx_document_org_status', Document.org_id, Document.status)
Index('idx_chunk_document', DocumentChunk.document_id, DocumentChunk.chunk_index)
Index('idx_kb_query_time', KBQuery.org_id, KBQuery.created_at.desc())

