"""
Lab Router - API endpoints for test data generation
History is stored in DB (no localStorage).
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import FileResponse, JSONResponse
from typing import Optional
import os

from .schemas import (
    APIGenerateRequest, APIGenerateResponse,
    DocumentGenerateRequest, DocumentGenerateResponse,
    ImageGenerateRequest, ImageGenerateResponse,
    LabHistoryAddRequest,
    LabHistoryItemResponse,
    LabHistoryResponse,
)
from .service import LabService

router = APIRouter(prefix="/api/lab", tags=["Lab - Test Data Generator"])

try:
    from api.security import get_current_user_optional
except Exception:
    async def get_current_user_optional():
        return None  # history endpoints will 401 via _require_user


# ============================================
# API Generator Endpoints
# ============================================

@router.post("/generate/api", response_model=APIGenerateResponse)
async def generate_api(request: APIGenerateRequest, user=Depends(get_current_user_optional)):
    """
    Generate a mock API with realistic data.
    Stored in DB (and file) so data is served from DB.
    """
    try:
        user_id = str(getattr(user, "id", None)) if user else None
        result = await LabService.generate_api_data(
            name=request.name,
            description=request.description,
            record_count=request.record_count,
            user_id=user_id,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _user_can_access_mock(item_id: str, current_user, record: dict) -> bool:
    """True if current user is owner of the mock or has execute access to a tool that uses it."""
    if not record or not record.get("user_id") or not current_user:
        return True  # no owner or no user -> allow (e.g. file-only mock or unauthenticated tool call)
    user_id = str(getattr(current_user, "id", None) or "")
    if not user_id:
        return True
    if str(record["user_id"]) == user_id:
        return True  # owner
    # Check if user has execute access to any tool that uses this mock
    try:
        from api.main import app_state, check_tool_access
        from api.main import get_user_group_ids
        user_group_ids = list(get_user_group_ids(user_id) or [])
        endpoint_needle = f"/api/lab/mock/{item_id}"
        for tool in (getattr(app_state, "tools", None) or {}).values():
            if getattr(tool, "type", None) != "api":
                continue
            ac = getattr(tool, "api_config", None)
            ep = None
            if hasattr(ac, "endpoint_path"):
                ep = ac.endpoint_path
            elif isinstance(ac, dict):
                ep = ac.get("endpoint_path")
            if not ep or (endpoint_needle not in ep and item_id not in ep):
                continue
            if check_tool_access(tool, user_id, user_group_ids, "execute"):
                return True
    except Exception as e:
        print(f"⚠️ [LAB] Tool access check failed: {e}")
    return False


@router.get("/mock/{item_id}")
async def get_mock_api(item_id: str, request: Request, user=Depends(get_current_user_optional)):
    """
    Call the generated mock API to get data.
    Only the owner or users with execute access to a tool using this mock can read data.
    Unauthenticated requests are allowed (e.g. tool execution from backend).
    """
    record = LabService.get_mock_api_record(item_id)
    if record and record.get("user_id") and user:
        if not _user_can_access_mock(item_id, user, record):
            raise HTTPException(status_code=403, detail="You don't have access to this mock API")
    data = LabService.get_mock_data(item_id)
    if data is None:
        raise HTTPException(status_code=404, detail="Mock API not found")

    # Get query parameters from request
    query_params = dict(request.query_params)
    
    # If data is a list and query params provided, filter the results
    if isinstance(data, list) and query_params:
        print(f"🔍 [FILTER] Starting filter: {len(data)} items, params: {query_params}")
        filtered = []
        for idx, item in enumerate(data):
            if isinstance(item, dict):
                # Create normalized field mapping (remove underscores, lowercase)
                # This handles: supplier_id, SupplierID, SUPPLIER_ID all the same
                def normalize_key(k):
                    return k.lower().replace('_', '').replace('-', '')
                
                item_normalized = {normalize_key(k): v for k, v in item.items()}
                print(f"   Item {idx}: original keys={list(item.keys())[:3]}, normalized keys={list(item_normalized.keys())[:3]}")
                
                # Check if all query params match
                match = True
                for key, value in query_params.items():
                    # Normalize parameter name
                    key_normalized = normalize_key(key)
                    item_value = item_normalized.get(key_normalized)
                    
                    print(f"      Checking param '{key}' (normalized: '{key_normalized}') = '{value}'")
                    print(f"      Found value: {item_value}")
                    
                    if item_value is None:
                        print(f"      ❌ Field not found in item")
                        match = False
                        break
                    
                    # Exact match (case-insensitive): "1" must not match "S001" or "S010"
                    value_str = str(value).strip().lower()
                    item_str = str(item_value).strip().lower()
                    if value_str != item_str:
                        print(f"      ❌ Value mismatch: '{value}' != '{item_value}' (exact match required)")
                        match = False
                        break
                    print(f"      ✅ Match!")
                
                if match:
                    print(f"   ✅ Item {idx} MATCHED")
                    filtered.append(item)
                else:
                    print(f"   ❌ Item {idx} rejected")
        
        print(f"🔍 [FILTER] Result: {len(filtered)} items matched")
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
# History (DB-backed; no localStorage)
# ============================================

def _require_user(user):
    """Raise 401 if user is not authenticated (Lab history requires login)."""
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required for Lab history")
    return user


def _user_id(user) -> str:
    """Get string user id for DB."""
    uid = getattr(user, "id", None)
    return str(uid) if uid is not None else None


@router.get("/history", response_model=LabHistoryResponse)
async def list_lab_history(user=Depends(get_current_user_optional)):
    """List current user's Lab history (API, document, image items). Max 20."""
    _require_user(user)
    from database.base import get_db_session
    from database.models import LabHistoryItem

    uid = _user_id(user)
    if not uid:
        return LabHistoryResponse(items=[], total=0)

    with get_db_session() as db:
        rows = (
            db.query(LabHistoryItem)
            .filter(LabHistoryItem.user_id == uid)
            .order_by(LabHistoryItem.created_at.desc())
            .limit(20)
            .all()
        )
        items = [
            LabHistoryItemResponse(
                id=str(r.id),
                type=r.type,
                name=r.name,
                result=r.result or {},
                created_at=r.created_at.isoformat() if r.created_at else "",
            )
            for r in rows
        ]
        return LabHistoryResponse(items=items, total=len(items))


@router.post("/history", response_model=LabHistoryItemResponse)
async def add_lab_history(request: LabHistoryAddRequest, user=Depends(get_current_user_optional)):
    """Add a generated item to Lab history."""
    _require_user(user)
    from database.base import get_db_session
    from database.models import LabHistoryItem

    uid = _user_id(user)
    if not uid:
        raise HTTPException(status_code=401, detail="User ID not found")

    with get_db_session() as db:
        item = LabHistoryItem(
            user_id=uid,
            type=request.type if request.type in ("api", "document", "image") else "api",
            name=request.name,
            result=request.result,
        )
        db.add(item)
        db.flush()
        db.refresh(item)
        return LabHistoryItemResponse(
            id=str(item.id),
            type=item.type,
            name=item.name,
            result=item.result or {},
            created_at=item.created_at.isoformat() if item.created_at else "",
        )


@router.delete("/history/{item_id}")
async def delete_lab_history_item(item_id: str, user=Depends(get_current_user_optional)):
    """Delete one Lab history item (only if owned by current user)."""
    _require_user(user)
    from database.base import get_db_session
    from database.models import LabHistoryItem

    uid = _user_id(user)
    with get_db_session() as db:
        row = db.query(LabHistoryItem).filter(
            LabHistoryItem.id == item_id,
            LabHistoryItem.user_id == uid,
        ).first()
        if not row:
            raise HTTPException(status_code=404, detail="Item not found or access denied")
        db.delete(row)
    return {"ok": True}


@router.delete("/history")
async def clear_lab_history(user=Depends(get_current_user_optional)):
    """Clear all Lab history for the current user."""
    _require_user(user)
    from database.base import get_db_session
    from database.models import LabHistoryItem

    uid = _user_id(user)
    with get_db_session() as db:
        db.query(LabHistoryItem).filter(LabHistoryItem.user_id == uid).delete()
    return {"ok": True, "message": "History cleared"}


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
