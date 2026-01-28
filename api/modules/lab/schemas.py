"""
Lab Module Schemas - Request/Response models
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum


class DocumentFormat(str, Enum):
    DOCX = "docx"
    PDF = "pdf"
    XLSX = "xlsx"
    PPTX = "pptx"


class ImageFormat(str, Enum):
    PNG = "png"
    JPG = "jpg"


class DocumentType(str, Enum):
    INVOICE = "invoice"
    RECEIPT = "receipt"
    FORM = "form"
    ID = "id"
    CONTRACT = "contract"
    LETTER = "letter"
    TABLE = "table"
    CUSTOM = "custom"


# ============================================
# API Generator
# ============================================

class APIGenerateRequest(BaseModel):
    """Request to generate a mock API"""
    name: str = Field(..., description="Name of the API")
    description: str = Field(..., description="Description of what data the API should return")
    record_count: int = Field(default=10, ge=1, le=100, description="Number of records to generate")


class APIGenerateResponse(BaseModel):
    """Response from API generation"""
    id: str
    name: str
    endpoint: str
    data: List[Dict[str, Any]]
    response_schema: Dict[str, Any]  # renamed from 'schema' to avoid shadowing BaseModel.schema
    created_at: str


# ============================================
# Document Generator
# ============================================

class DocumentGenerateRequest(BaseModel):
    """Request to generate a document"""
    name: str = Field(..., description="Name of the document")
    description: str = Field(..., description="Description of document content")
    format: DocumentFormat = Field(default=DocumentFormat.DOCX)


class DocumentGenerateResponse(BaseModel):
    """Response from document generation"""
    id: str
    name: str
    format: str
    size: int
    download_url: str
    preview_url: Optional[str] = None
    created_at: str


# ============================================
# Image Generator
# ============================================

class ImageGenerateRequest(BaseModel):
    """Request to generate a document image"""
    name: str = Field(..., description="Name of the image")
    description: str = Field(..., description="Description of the document image")
    document_type: DocumentType = Field(default=DocumentType.INVOICE)
    format: ImageFormat = Field(default=ImageFormat.PNG)


class ImageGenerateResponse(BaseModel):
    """Response from image generation"""
    id: str
    name: str
    format: str
    document_type: str
    size: int
    download_url: str
    image_url: Optional[str] = None
    base64: Optional[str] = None
    created_at: str


# ============================================
# History & Management
# ============================================

class LabItem(BaseModel):
    """A generated item in the lab"""
    id: str
    type: str  # api, document, image
    name: str
    created_at: str
    metadata: Dict[str, Any] = {}


class LabHistoryResponse(BaseModel):
    """List of generated items"""
    items: List[LabItem]
    total: int
