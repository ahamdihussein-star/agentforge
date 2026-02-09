"""
Lab Router - API endpoints for test data generation
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import FileResponse, JSONResponse
from typing import Optional
import os

from .schemas import (
    APIGenerateRequest, APIGenerateResponse,
    DocumentGenerateRequest, DocumentGenerateResponse,
    ImageGenerateRequest, ImageGenerateResponse,
    LabHistoryResponse
)
from .service import LabService

router = APIRouter(prefix="/api/lab", tags=["Lab - Test Data Generator"])


# ============================================
# API Generator Endpoints
# ============================================

@router.post("/generate/api", response_model=APIGenerateResponse)
async def generate_api(request: APIGenerateRequest):
    """
    Generate a mock API with realistic data
    
    The AI generates data based on your description, creating
    realistic, varied records that look like production data.
    """
    try:
        result = await LabService.generate_api_data(
            name=request.name,
            description=request.description,
            record_count=request.record_count
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/mock/{item_id}")
async def get_mock_api(item_id: str, request: Request):
    """
    Call the generated mock API to get data
    
    This endpoint serves the generated mock data as if it were
    a real API endpoint. Supports query parameters for filtering.
    """
    data = LabService.get_mock_data(item_id)
    if data is None:
        raise HTTPException(status_code=404, detail="Mock API not found")
    
    # Get query parameters from request
    query_params = dict(request.query_params)
    
    # If data is a list and query params provided, filter the results
    if isinstance(data, list) and query_params:
        filtered = []
        for item in data:
            if isinstance(item, dict):
                # Create case-insensitive field mapping
                item_lower = {k.lower(): v for k, v in item.items()}
                
                # Check if all query params match
                match = True
                for key, value in query_params.items():
                    # Case-insensitive field name lookup
                    key_lower = key.lower()
                    item_value = item_lower.get(key_lower)
                    
                    if item_value is None:
                        match = False
                        break
                    
                    # Case-insensitive partial match for values
                    if str(value).lower() not in str(item_value).lower():
                        match = False
                        break
                
                if match:
                    filtered.append(item)
        data = filtered
    
    return JSONResponse(content=data)


# ============================================
# Document Generator Endpoints
# ============================================

@router.post("/generate/document", response_model=DocumentGenerateResponse)
async def generate_document(request: DocumentGenerateRequest):
    """
    Generate a professional document
    
    Creates properly formatted documents (Word, PDF, Excel, PPT)
    with AI-generated content based on your description.
    """
    try:
        result = await LabService.generate_document(
            name=request.name,
            description=request.description,
            format=request.format.value
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# Image Generator Endpoints
# ============================================

@router.post("/generate/image", response_model=ImageGenerateResponse)
async def generate_image(request: ImageGenerateRequest):
    """
    Generate a document image for OCR testing
    
    Creates realistic document images (invoices, receipts, forms, etc.)
    that are formatted and structured for OCR testing.
    """
    try:
        result = await LabService.generate_image(
            name=request.name,
            description=request.description,
            document_type=request.document_type.value,
            format=request.format.value
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# Download & View Endpoints
# ============================================

@router.get("/download/{item_id}")
async def download_item(item_id: str):
    """Download a generated item (document, image, or API data as JSON)"""
    filepath = LabService.get_file(item_id)
    
    if filepath is None or not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="File not found")
    
    filename = os.path.basename(filepath)
    
    # Determine media type
    ext = os.path.splitext(filepath)[1].lower()
    media_types = {
        '.json': 'application/json',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.pdf': 'application/pdf',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.txt': 'text/plain'
    }
    media_type = media_types.get(ext, 'application/octet-stream')
    
    return FileResponse(
        filepath,
        filename=filename,
        media_type=media_type
    )


@router.get("/image/{item_id}")
async def view_image(item_id: str):
    """View a generated image (inline, not download)"""
    filepath = LabService.get_file(item_id)
    
    if filepath is None or not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Image not found")
    
    ext = os.path.splitext(filepath)[1].lower()
    if ext not in ['.png', '.jpg', '.jpeg']:
        raise HTTPException(status_code=400, detail="Not an image file")
    
    media_type = 'image/png' if ext == '.png' else 'image/jpeg'
    
    return FileResponse(filepath, media_type=media_type)


# ============================================
# Health Check
# ============================================

@router.get("/health")
async def lab_health():
    """Check Lab module health and available features"""
    from .service import DOCX_AVAILABLE, PDF_AVAILABLE, XLSX_AVAILABLE, PPTX_AVAILABLE, PIL_AVAILABLE
    
    return {
        "status": "ok",
        "module": "Lab - Test Data Generator",
        "features": {
            "api_generator": True,
            "document_generator": {
                "docx": DOCX_AVAILABLE,
                "pdf": PDF_AVAILABLE,
                "xlsx": XLSX_AVAILABLE,
                "pptx": PPTX_AVAILABLE
            },
            "image_generator": PIL_AVAILABLE
        }
    }
