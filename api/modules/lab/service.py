"""
Lab Service - AI-powered test data generation

This service handles:
- Mock API generation with realistic data using AI
- Document generation (Word, PDF, Excel, PPT)
- Image generation for OCR testing
"""

import os
import re
import json
import uuid
import base64
from datetime import datetime
from typing import Dict, Any, List, Optional
from io import BytesIO

# Document generation libraries
try:
    from docx import Document
    from docx.shared import Inches, Pt
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    DOCX_AVAILABLE = True
except ImportError:
    DOCX_AVAILABLE = False

try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import letter, A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False

try:
    from openpyxl import Workbook
    from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
    XLSX_AVAILABLE = True
except ImportError:
    XLSX_AVAILABLE = False

try:
    from pptx import Presentation
    from pptx.util import Inches as PptxInches, Pt as PptxPt
    PPTX_AVAILABLE = True
except ImportError:
    PPTX_AVAILABLE = False

try:
    from PIL import Image, ImageDraw, ImageFont
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False


class LabService:
    """Service for generating test data using AI"""
    
    # Storage path for generated files
    STORAGE_PATH = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'data', 'lab')
    
    @classmethod
    def _ensure_storage(cls):
        """Ensure storage directory exists"""
        os.makedirs(cls.STORAGE_PATH, exist_ok=True)
    
    @classmethod
    def _get_ai_client(cls):
        """Get the AI client for generation"""
        # Try to import the existing AI setup
        try:
            from api.main import get_llm_client
            return get_llm_client()
        except:
            pass
        
        # Fallback to OpenAI
        try:
            import openai
            api_key = os.getenv('OPENAI_API_KEY')
            if api_key:
                return openai.OpenAI(api_key=api_key)
        except:
            pass
        
        return None
    
    @classmethod
    async def generate_api_data(
        cls,
        name: str,
        description: str,
        record_count: int = 10,
        org_id: str = None,
        user_id: str = None
    ) -> Dict[str, Any]:
        """
        Generate mock API data using AI
        
        The AI generates realistic data based on the description,
        without knowing it's for demo/testing purposes.
        """
        cls._ensure_storage()
        
        item_id = str(uuid.uuid4())
        
        # Build the AI prompt
        prompt = f"""Generate exactly {record_count} records of realistic data based on this description:

{description}

Requirements:
- Return ONLY a valid JSON array
- Each record should have realistic, varied data
- Use proper data types (strings, numbers, dates, etc.)
- Make names, emails, and other identifiers look real
- Ensure data is consistent and makes sense together
- Do not include any explanation, just the JSON array

Example format:
[
  {{"field1": "value1", "field2": "value2"}},
  {{"field1": "value3", "field2": "value4"}}
]"""

        # Try to use AI
        client = cls._get_ai_client()
        data = []
        
        if client:
            try:
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": "You are a data generation expert. Generate realistic, production-quality data. Return only valid JSON."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.7,
                    max_tokens=4000
                )
                
                content = response.choices[0].message.content.strip()
                
                # Extract JSON from response
                if content.startswith('```'):
                    content = content.split('```')[1]
                    if content.startswith('json'):
                        content = content[4:]
                
                data = json.loads(content)
                
            except Exception as e:
                print(f"AI generation failed: {e}")
                # Fall back to sample data
                data = cls._generate_sample_data(description, record_count)
        else:
            # No AI available, generate sample data
            data = cls._generate_sample_data(description, record_count)
        
        # Infer schema from data
        schema = cls._infer_schema(data)
        
        # URL-friendly slug from name so endpoint can be /api/lab/mock/{api-name}
        slug = (re.sub(r"[^a-z0-9-]+", "-", name.lower()).strip("-") or item_id)[:80]
        
        # AI-generated metadata for agent tool: description and parameters (no hardcoded rules)
        agent_meta = cls._generate_agent_metadata(name, description, client)
        
        # Save to storage (response_schema for APIGenerateResponse compatibility)
        result = {
            "id": item_id,
            "name": name,
            "slug": slug,
            "endpoint": f"/api/lab/mock/{slug}",
            "data": data,
            "response_schema": schema,
            "record_count": len(data),
            "created_at": datetime.utcnow().isoformat(),
            "org_id": org_id,
            "agent_description": agent_meta.get("agent_description"),
            "parameters": agent_meta.get("parameters") or []
        }
        
        filepath = os.path.join(cls.STORAGE_PATH, f"{item_id}.json")
        with open(filepath, 'w') as f:
            json.dump(result, f, indent=2)

        cls._save_mock_api_to_db(result, user_id)

        print(f"💾 [LAB] Saved API: name='{name}', slug='{slug}', file={filepath}")
        return result

    @classmethod
    def _save_mock_api_to_db(cls, result: Dict[str, Any], user_id: Optional[str] = None) -> None:
        """Persist mock API to database (id, slug, data, parameters, etc.)."""
        try:
            from database.base import get_db_session
            from database.models import LabMockAPI

            item_id = result.get("id")
            slug = (result.get("slug") or "")[:120]
            if not item_id or not slug:
                return
            with get_db_session() as db:
                row = LabMockAPI(
                    id=item_id,
                    user_id=user_id,
                    name=result.get("name", ""),
                    slug=slug,
                    description=None,
                    endpoint=result.get("endpoint", f"/api/lab/mock/{slug}"),
                    agent_description=result.get("agent_description"),
                    parameters=result.get("parameters") or [],
                    response_schema=result.get("response_schema") or {},
                    data=result.get("data") or [],
                    record_count=result.get("record_count", 0),
                )
                db.add(row)
        except Exception as e:
            print(f"⚠️ [LAB] Could not save mock API to DB: {e}")
    
    @classmethod
    def _generate_agent_metadata(
        cls, name: str, description: str, client: Any
    ) -> Dict[str, Any]:
        """
        Use AI to generate agent-facing description and input parameters.
        No hardcoded rules; suitable for any enterprise API.
        """
        out = {"agent_description": None, "parameters": []}
        if not client:
            out["agent_description"] = f"Returns data for: {name}. Use when the user asks for this information."
            return out
        prompt = f"""API name: {name}
User description: {description}

Return a JSON object with exactly two keys:
1. "agent_description": One clear sentence for an AI agent: what this API returns and when to use it. Do not mention mock, demo, or test.
2. "parameters": If this API logically accepts parameters (e.g. ID, filter, date range), return an array of objects, each with: "name", "description", "data_type" (string/number/boolean), "required" (boolean), "location" (query or path). If the API does not take parameters, return [].

Return only valid JSON, no markdown or explanation."""
        try:
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You output only valid JSON. No markdown code blocks."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=800
            )
            content = response.choices[0].message.content.strip()
            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
            obj = json.loads(content)
            out["agent_description"] = obj.get("agent_description") or out["agent_description"]
            out["parameters"] = obj.get("parameters") if isinstance(obj.get("parameters"), list) else []
        except Exception as e:
            print(f"Agent metadata generation failed: {e}")
            out["agent_description"] = f"Returns data for: {name}. Use when the user asks for this information."
        return out
    
    @classmethod
    def _generate_sample_data(cls, description: str, count: int) -> List[Dict]:
        """Generate realistic fallback data when AI is not available"""
        import random
        from datetime import timedelta

        first_names = ["Ahmed", "Sarah", "Michael", "Emily", "James", "Maria", "David",
                        "Jessica", "Robert", "Laura", "Daniel", "Sophia", "Omar", "Lina",
                        "William", "Olivia", "Hassan", "Nora", "Thomas", "Fatima"]
        last_names = ["Al-Rashid", "Johnson", "Chen", "Garcia", "Müller", "Tanaka",
                       "Petrov", "Williams", "Kim", "Santos", "Ali", "Martin",
                       "Anderson", "Lee", "Hernandez", "Smith", "Patel", "Brown"]
        companies = ["Apex Technologies Inc.", "GlobalTech Solutions", "Premier Services LLC",
                      "Quantum Dynamics Corp.", "Nexus Industries", "Blue Ocean Trading",
                      "Pinnacle Holdings", "Vantage Consulting", "Meridian Partners",
                      "Atlas Logistics", "Silverline Financial", "Nova Enterprises"]
        domains = ["company.com", "corp.com", "group.io", "global.com", "hq.com"]
        departments = ["Engineering", "Finance", "Marketing", "Operations", "Sales",
                        "Human Resources", "Legal", "Product", "Customer Success"]

        def _rand_name():
            return f"{random.choice(first_names)} {random.choice(last_names)}"

        def _rand_email(name: str):
            local = name.lower().replace(" ", ".")
            return f"{local}@{random.choice(domains)}"

        def _rand_date(days_back=365):
            d = datetime.utcnow() - timedelta(days=random.randint(0, days_back))
            return d.strftime("%Y-%m-%d")

        desc_lower = description.lower()

        if any(w in desc_lower for w in ['customer', 'user', 'person', 'employee']):
            results = []
            for i in range(count):
                name = _rand_name()
                results.append({
                    "id": i + 1,
                    "name": name,
                    "email": _rand_email(name),
                    "phone": f"+1-{random.randint(200,999)}-{random.randint(100,999)}-{random.randint(1000,9999)}",
                    "company": random.choice(companies),
                    "department": random.choice(departments),
                    "created_at": _rand_date(730)
                })
            return results

        elif any(w in desc_lower for w in ['product', 'item', 'inventory']):
            product_names = [
                "Wireless Bluetooth Headphones", "Smart Watch Pro", "4K Ultra Monitor",
                "Ergonomic Office Chair", "Portable SSD 1TB", "Mechanical Keyboard",
                "Noise-Canceling Earbuds", "USB-C Hub Adapter", "LED Desk Lamp",
                "Webcam HD 1080p", "Standing Desk Converter", "Laptop Backpack",
                "Wireless Charging Pad", "External Battery Pack", "Graphics Tablet",
                "Smart Thermostat", "Security Camera Kit", "Robot Vacuum Cleaner",
                "Air Purifier HEPA", "Espresso Machine Pro"
            ]
            random.shuffle(product_names)
            return [
                {
                    "id": i + 1,
                    "name": product_names[i % len(product_names)],
                    "sku": f"SKU-{random.randint(10000, 99999)}",
                    "price": round(random.uniform(19.99, 599.99), 2),
                    "quantity": random.randint(0, 250),
                    "category": random.choice(["Electronics", "Office", "Home & Garden", "Audio", "Computing"])
                }
                for i in range(count)
            ]

        elif any(w in desc_lower for w in ['order', 'transaction', 'sale']):
            statuses = ["pending", "processing", "shipped", "delivered", "completed"]
            return [
                {
                    "id": i + 1,
                    "order_number": f"ORD-{random.randint(100000, 999999)}",
                    "customer": _rand_name(),
                    "total": round(random.uniform(45, 2500), 2),
                    "status": random.choice(statuses),
                    "created_at": _rand_date(90)
                }
                for i in range(count)
            ]

        else:
            record_names = [
                "Annual Budget Review", "Q4 Performance Report", "Client Onboarding",
                "Maintenance Schedule", "Compliance Audit", "Partnership Agreement",
                "Training Program", "Market Analysis", "Supply Chain Update",
                "Risk Assessment", "Strategic Plan", "Resource Allocation"
            ]
            random.shuffle(record_names)
            return [
                {
                    "id": i + 1,
                    "name": record_names[i % len(record_names)],
                    "value": random.randint(1, 100),
                    "active": random.choice([True, False]),
                    "created_at": _rand_date(180)
                }
                for i in range(count)
            ]
    
    @classmethod
    def _infer_schema(cls, data: List[Dict]) -> Dict[str, Any]:
        """Infer JSON schema from data"""
        if not data:
            return {"type": "array", "items": {}}
        
        sample = data[0]
        properties = {}
        
        for key, value in sample.items():
            if isinstance(value, bool):
                properties[key] = {"type": "boolean"}
            elif isinstance(value, int):
                properties[key] = {"type": "integer"}
            elif isinstance(value, float):
                properties[key] = {"type": "number"}
            elif isinstance(value, str):
                properties[key] = {"type": "string"}
            elif isinstance(value, list):
                properties[key] = {"type": "array"}
            elif isinstance(value, dict):
                properties[key] = {"type": "object"}
            else:
                properties[key] = {"type": "string"}
        
        return {
            "type": "array",
            "items": {
                "type": "object",
                "properties": properties
            }
        }
    
    @classmethod
    async def generate_document(
        cls,
        name: str,
        description: str,
        format: str = "docx",
        org_id: str = None
    ) -> Dict[str, Any]:
        """
        Generate a professional document using AI
        """
        cls._ensure_storage()
        
        item_id = str(uuid.uuid4())
        filename = f"{item_id}.{format}"
        filepath = os.path.join(cls.STORAGE_PATH, filename)
        
        # Get content from AI
        content = await cls._generate_document_content(description)
        
        # Generate the document based on format
        size = 0
        
        if format == "docx" and DOCX_AVAILABLE:
            size = cls._create_docx(filepath, name, content)
        elif format == "pdf" and PDF_AVAILABLE:
            size = cls._create_pdf(filepath, name, content)
        elif format == "xlsx" and XLSX_AVAILABLE:
            size = cls._create_xlsx(filepath, name, content)
        elif format == "pptx" and PPTX_AVAILABLE:
            size = cls._create_pptx(filepath, name, content)
        else:
            # Create a simple text file as fallback
            with open(filepath.replace(f'.{format}', '.txt'), 'w') as f:
                f.write(f"# {name}\n\n{content}")
            filepath = filepath.replace(f'.{format}', '.txt')
            format = 'txt'
            size = os.path.getsize(filepath)
        
        result = {
            "id": item_id,
            "name": name,
            "format": format,
            "size": size,
            "download_url": f"/api/lab/download/{item_id}",
            "created_at": datetime.utcnow().isoformat(),
            "org_id": org_id
        }
        
        # Save metadata
        with open(os.path.join(cls.STORAGE_PATH, f"{item_id}_meta.json"), 'w') as f:
            json.dump(result, f, indent=2)
        
        return result
    
    @classmethod
    async def _generate_document_content(cls, description: str) -> str:
        """Generate document content using AI"""
        client = cls._get_ai_client()
        
        if client:
            try:
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": "You are a professional document writer. Create well-structured, detailed content with proper sections, paragraphs, and formatting. Use markdown for structure."},
                        {"role": "user", "content": f"Create professional document content for:\n\n{description}"}
                    ],
                    temperature=0.7,
                    max_tokens=3000
                )
                return response.choices[0].message.content
            except Exception as e:
                print(f"AI content generation failed: {e}")
        
        # Fallback content
        return f"""# {description[:60] if description else 'Document'}

## Overview
{description}

## Details
This document provides a comprehensive overview of the subject matter outlined above. 
All information has been compiled from relevant sources and reviewed for accuracy.

## Summary
For further details or inquiries, please contact the responsible department.
"""
    
    @classmethod
    def _create_docx(cls, filepath: str, title: str, content: str) -> int:
        """Create a Word document"""
        doc = Document()
        
        # Add title
        doc.add_heading(title, 0)
        
        # Parse markdown-like content
        for line in content.split('\n'):
            line = line.strip()
            if not line:
                continue
            
            if line.startswith('# '):
                doc.add_heading(line[2:], 1)
            elif line.startswith('## '):
                doc.add_heading(line[3:], 2)
            elif line.startswith('### '):
                doc.add_heading(line[4:], 3)
            elif line.startswith('- ') or line.startswith('* '):
                doc.add_paragraph(line[2:], style='List Bullet')
            elif line.startswith('1. ') or line.startswith('2. '):
                doc.add_paragraph(line[3:], style='List Number')
            else:
                doc.add_paragraph(line)
        
        doc.save(filepath)
        return os.path.getsize(filepath)
    
    @classmethod
    def _create_pdf(cls, filepath: str, title: str, content: str) -> int:
        """Create a PDF document"""
        doc = SimpleDocTemplate(filepath, pagesize=A4)
        styles = getSampleStyleSheet()
        story = []
        
        # Title
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            spaceAfter=30
        )
        story.append(Paragraph(title, title_style))
        story.append(Spacer(1, 12))
        
        # Content
        for line in content.split('\n'):
            line = line.strip()
            if not line:
                story.append(Spacer(1, 12))
                continue
            
            if line.startswith('# '):
                story.append(Paragraph(line[2:], styles['Heading1']))
            elif line.startswith('## '):
                story.append(Paragraph(line[3:], styles['Heading2']))
            elif line.startswith('### '):
                story.append(Paragraph(line[4:], styles['Heading3']))
            else:
                story.append(Paragraph(line, styles['Normal']))
        
        doc.build(story)
        return os.path.getsize(filepath)
    
    @classmethod
    def _create_xlsx(cls, filepath: str, title: str, content: str) -> int:
        """Create an Excel document"""
        wb = Workbook()
        ws = wb.active
        ws.title = title[:31]  # Excel sheet names limited to 31 chars
        
        # Style
        header_font = Font(bold=True, size=14)
        header_fill = PatternFill(start_color="366092", end_color="366092", fill_type="solid")
        
        # Title
        ws['A1'] = title
        ws['A1'].font = Font(bold=True, size=18)
        ws.merge_cells('A1:E1')
        
        # Parse content and try to create table-like structure
        row = 3
        for line in content.split('\n'):
            line = line.strip()
            if not line:
                continue
            
            if line.startswith('|'):
                # Table row
                cells = [c.strip() for c in line.split('|')[1:-1]]
                for col, cell in enumerate(cells, 1):
                    ws.cell(row=row, column=col, value=cell)
                row += 1
            elif line.startswith('#'):
                # Header
                ws.cell(row=row, column=1, value=line.lstrip('#').strip())
                ws.cell(row=row, column=1).font = header_font
                row += 1
            else:
                ws.cell(row=row, column=1, value=line)
                row += 1
        
        wb.save(filepath)
        return os.path.getsize(filepath)
    
    @classmethod
    def _create_pptx(cls, filepath: str, title: str, content: str) -> int:
        """Create a PowerPoint presentation"""
        prs = Presentation()
        
        # Title slide
        title_slide_layout = prs.slide_layouts[0]
        slide = prs.slides.add_slide(title_slide_layout)
        slide.shapes.title.text = title
        slide.placeholders[1].text = datetime.utcnow().strftime("%B %Y")
        
        # Content slides
        bullet_slide_layout = prs.slide_layouts[1]
        current_slide = None
        current_points = []
        
        for line in content.split('\n'):
            line = line.strip()
            if not line:
                continue
            
            if line.startswith('# ') or line.startswith('## '):
                # New slide
                if current_slide and current_points:
                    body = current_slide.shapes.placeholders[1]
                    tf = body.text_frame
                    for i, point in enumerate(current_points):
                        if i == 0:
                            tf.paragraphs[0].text = point
                        else:
                            p = tf.add_paragraph()
                            p.text = point
                
                current_slide = prs.slides.add_slide(bullet_slide_layout)
                current_slide.shapes.title.text = line.lstrip('#').strip()
                current_points = []
            elif line.startswith('- ') or line.startswith('* '):
                current_points.append(line[2:])
            elif current_slide:
                current_points.append(line)
        
        # Last slide content
        if current_slide and current_points:
            body = current_slide.shapes.placeholders[1]
            tf = body.text_frame
            for i, point in enumerate(current_points):
                if i == 0:
                    tf.paragraphs[0].text = point
                else:
                    p = tf.add_paragraph()
                    p.text = point
        
        prs.save(filepath)
        return os.path.getsize(filepath)
    
    @classmethod
    async def generate_image(
        cls,
        name: str,
        description: str,
        document_type: str = "invoice",
        format: str = "png",
        org_id: str = None
    ) -> Dict[str, Any]:
        """
        Generate a document image for OCR testing
        """
        cls._ensure_storage()
        
        item_id = str(uuid.uuid4())
        filename = f"{item_id}.{format}"
        filepath = os.path.join(cls.STORAGE_PATH, filename)
        
        # Generate image
        if PIL_AVAILABLE:
            size = await cls._create_document_image(filepath, name, description, document_type, format)
        else:
            # Create placeholder
            size = 0
        # NOTE: Do not inline base64 in the JSON response by default.
        # The UI can display images via `image_url`, which is faster and cacheable.
        base64_data = None
        
        result = {
            "id": item_id,
            "name": name,
            "format": format,
            "document_type": document_type,
            "size": size,
            "download_url": f"/api/lab/download/{item_id}",
            "image_url": f"/api/lab/image/{item_id}",
            "base64": base64_data,
            "created_at": datetime.utcnow().isoformat(),
            "org_id": org_id
        }
        
        # Save metadata
        with open(os.path.join(cls.STORAGE_PATH, f"{item_id}_meta.json"), 'w') as f:
            json.dump({k: v for k, v in result.items() if k != 'base64'}, f, indent=2)
        
        return result
    
    @classmethod
    async def _create_document_image(
        cls,
        filepath: str,
        name: str,
        description: str,
        document_type: str,
        format: str
    ) -> int:
        """Create a document image using PIL with AI-generated content"""
        
        # Get structured content from AI based on description
        doc_data = await cls._generate_structured_image_content(description, document_type)
        
        # Image dimensions (A4-like ratio)
        width = 800
        height = 1100
        
        # Create image
        img = Image.new('RGB', (width, height), color='white')
        draw = ImageDraw.Draw(img)
        
        # Try to load fonts
        try:
            font_large = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 24)
            font_medium = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 16)
            font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 12)
            font_title = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 28)
        except:
            font_large = ImageFont.load_default()
            font_medium = font_large
            font_small = font_large
            font_title = font_large
        
        margin = 50
        y = 40
        
        # Use AI-generated data
        title = doc_data.get('title', name.upper())
        subtitle = doc_data.get('subtitle', '')
        header_color = doc_data.get('header_color', '#1e3a5f')
        sections = doc_data.get('sections', [])
        items = doc_data.get('items', [])
        footer = doc_data.get('footer', '')
        
        # Draw header
        draw.rectangle([0, 0, width, 120], fill=header_color)
        draw.text((margin, 35), title[:30], font=font_title, fill='white')
        if subtitle:
            draw.text((margin, 75), subtitle[:50], font=font_small, fill='#cccccc')
        
        # Draw reference number and date on right
        ref_num = doc_data.get('reference', f"#{cls._random_number(6)}")
        draw.text((width - 200, 35), ref_num, font=font_medium, fill='white')
        draw.text((width - 200, 60), datetime.now().strftime("%Y-%m-%d"), font=font_small, fill='#cccccc')
        
        y = 150
        
        # Draw sections (From, To, etc.)
        for section in sections[:4]:
            section_title = section.get('title', '')
            section_lines = section.get('lines', [])
            
            draw.text((margin, y), section_title, font=font_medium, fill='black')
            y += 25
            
            for line in section_lines[:3]:
                draw.text((margin + 10, y), str(line)[:60], font=font_small, fill='#666666')
                y += 20
            
            y += 15
        
        # Draw items table if present
        columns = doc_data.get('columns', [])
        if items or columns:
            # Ensure we have columns
            if not columns and items:
                # Try to get columns from first item if it's a dict
                if isinstance(items[0], dict):
                    columns = list(items[0].keys())[:4]
                else:
                    columns = [f"Column {i+1}" for i in range(min(4, len(items[0]) if items else 4))]
            
            num_cols = len(columns) if columns else 4
            col_width = (width - 2 * margin) // num_cols
            
            # Table header
            draw.rectangle([margin, y, width - margin, y + 30], fill='#f0f0f0')
            
            for i, col in enumerate(columns[:4]):
                draw.text((margin + 10 + i * col_width, y + 8), str(col)[:18], font=font_small, fill='black')
            
            y += 35
            
            # Table rows
            calculated_total = 0
            for item in items[:8]:
                # Handle both list and dict formats
                if isinstance(item, list):
                    values = item[:4]
                elif isinstance(item, dict):
                    values = list(item.values())[:4]
                else:
                    values = [str(item)]
                
                for i, val in enumerate(values):
                    text = str(val)[:20]
                    draw.text((margin + 10 + i * col_width, y), text, font=font_small, fill='#333333')
                    
                    # Try to extract numeric for total (last column usually)
                    if i == len(values) - 1:
                        try:
                            num_val = float(str(val).replace('$', '').replace(',', ''))
                            calculated_total += num_val
                        except:
                            pass
                
                draw.line([(margin, y + 22), (width - margin, y + 22)], fill='#eeeeee')
                y += 28
            
            # Total - use provided total or calculated
            total_text = doc_data.get('total', '')
            if total_text:
                y += 15
                draw.rectangle([width - 280, y, width - margin, y + 40], fill=header_color)
                draw.text((width - 270, y + 10), f"TOTAL: {total_text}", font=font_medium, fill='white')
                y += 50
            elif calculated_total > 0:
                y += 15
                draw.rectangle([width - 280, y, width - margin, y + 40], fill=header_color)
                draw.text((width - 270, y + 10), f"TOTAL: ${calculated_total:,.2f}", font=font_medium, fill='white')
                y += 50
        
        # Draw additional content/notes
        notes = doc_data.get('notes', [])
        if notes:
            y += 20
            draw.text((margin, y), "Notes:", font=font_medium, fill='black')
            y += 25
            for note in notes[:5]:
                draw.text((margin + 10, y), f"• {str(note)[:70]}", font=font_small, fill='#666666')
                y += 20
        
        # Footer
        draw.line([(0, height - 60), (width, height - 60)], fill='#eeeeee')
        footer_text = footer or doc_data.get('company', doc_data.get('subtitle', ''))
        draw.text((margin, height - 45), footer_text[:60], font=font_small, fill='#999999')
        
        # Save
        if format == 'jpg':
            img = img.convert('RGB')
            # Web-friendly JPEG: smaller + progressive
            img.save(
                filepath,
                'JPEG',
                quality=85,
                optimize=True,
                progressive=True,
            )
        else:
            # Web-friendly PNG: max compression + optimization.
            # Keep RGB first for best OCR; only quantize if still too large.
            try:
                from io import BytesIO
                buf = BytesIO()
                img.save(buf, 'PNG', optimize=True, compress_level=9)
                data = buf.getvalue()
                # If still large, quantize without dithering to avoid introducing OCR artifacts.
                if len(data) > 350_000:
                    q = img.quantize(colors=256, dither=Image.Dither.NONE)
                    q.save(filepath, 'PNG', optimize=True, compress_level=9)
                else:
                    with open(filepath, 'wb') as f:
                        f.write(data)
            except Exception:
                img.save(filepath, 'PNG', optimize=True, compress_level=9)
        
        return os.path.getsize(filepath)
    
    @classmethod
    async def _generate_structured_image_content(cls, description: str, document_type: str) -> Dict[str, Any]:
        """Generate structured content for image using AI"""
        client = cls._get_ai_client()
        
        prompt = f"""Generate realistic document data for this request:

Description: {description}
Document Type: {document_type}

Return a JSON object with this EXACT structure:
{{
    "title": "Main document title matching the description (e.g., 'AIRLINE TICKET', 'BOARDING PASS', 'FLIGHT INVOICE')",
    "subtitle": "Company or organization name",
    "reference": "Unique reference number (realistic format)",
    "header_color": "Hex color matching the brand (e.g., '#c60c30' for Emirates, '#00205b' for Delta)",
    "sections": [
        {{"title": "Section Title", "lines": ["Detail line 1", "Detail line 2", "Detail line 3"]}}
    ],
    "columns": ["Column Header 1", "Column Header 2", "Column Header 3", "Column Header 4"],
    "items": [
        ["Row 1 Col 1", "Row 1 Col 2", "Row 1 Col 3", "Row 1 Col 4"],
        ["Row 2 Col 1", "Row 2 Col 2", "Row 2 Col 3", "Row 2 Col 4"]
    ],
    "total": "Total amount if applicable (e.g., '$1,250.00')",
    "notes": ["Note 1", "Note 2"],
    "footer": "Footer text"
}}

IMPORTANT:
- "columns" is a list of column header NAMES (strings)
- "items" is a list of ROWS, each row is a list of VALUES (not objects)
- Make all data realistic and contextual to the description
- For airline tickets: include passenger name, flight number, route, date/time, seat, class
- For invoices: include line items with quantities and prices

Return ONLY the JSON, no explanation or markdown."""

        if client:
            try:
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": "You generate realistic document data in JSON format. Be accurate and detailed."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.7,
                    max_tokens=1500
                )
                
                content = response.choices[0].message.content.strip()
                
                # Extract JSON from response
                if '```' in content:
                    content = content.split('```')[1]
                    if content.startswith('json'):
                        content = content[4:]
                
                data = json.loads(content)
                return data
                
            except Exception as e:
                print(f"AI structured content generation failed: {e}")
        
        # Fallback - basic structure based on document type
        return cls._get_fallback_structure(description, document_type)
    
    @classmethod
    def _get_fallback_structure(cls, description: str, document_type: str) -> Dict[str, Any]:
        """Fallback structure when AI is not available"""
        import random
        desc_lower = description.lower()

        first_names = ["Ahmed", "Sarah", "Michael", "Emily", "James", "Maria", "David", "Olivia"]
        last_names = ["Al-Rashid", "Johnson", "Chen", "Garcia", "Müller", "Williams", "Patel", "Santos"]
        companies = ["Apex Technologies Inc.", "Meridian Partners", "Blue Ocean Trading",
                      "Pinnacle Holdings", "Vantage Consulting", "Silverline Financial"]

        def _name():
            return f"{random.choice(first_names)} {random.choice(last_names)}"

        def _company():
            return random.choice(companies)

        if 'airline' in desc_lower or 'flight' in desc_lower or 'ticket' in desc_lower:
            passenger = _name()
            return {
                "title": "AIRLINE TICKET",
                "subtitle": "E-Ticket Receipt",
                "reference": f"TKT-{cls._random_number(10)}",
                "header_color": "#0066cc",
                "sections": [
                    {"title": "Passenger", "lines": [passenger, f"Passport: {chr(random.randint(65,90))}{chr(random.randint(65,90))}{cls._random_number(7)}"]},
                    {"title": "Flight Details", "lines": [f"Flight: EK {random.randint(100,999)}", f"Date: {datetime.now().strftime('%Y-%m-%d')}", "Route: DXB \u2192 LHR"]}
                ],
                "columns": ["Segment", "Class", "Status", "Fare"],
                "items": [
                    ["DXB - LHR", "Business", "Confirmed", "$1,850.00"],
                    ["Taxes & Fees", "-", "-", "$124.50"]
                ],
                "total": "$1,974.50",
                "notes": ["Check-in opens 24 hours before departure", "Baggage allowance: 2 x 32kg"],
                "footer": "Thank you for flying with us"
            }
        elif 'receipt' in desc_lower:
            store = _company()
            return {
                "title": "RECEIPT",
                "subtitle": store,
                "reference": f"RCP-{cls._random_number(8)}",
                "header_color": "#2d2d2d",
                "sections": [
                    {"title": "Store", "lines": [store, f"{random.randint(100,999)} Market Street, Suite {random.randint(100,400)}"]}
                ],
                "columns": ["Item", "Qty", "Price", "Total"],
                "items": [
                    ["Wireless Keyboard", "1", "$79.99", "$79.99"],
                    ["USB-C Cable (2m)", "3", "$12.50", "$37.50"],
                    ["Monitor Stand", "1", "$45.00", "$45.00"]
                ],
                "total": "$162.49",
                "notes": ["Returns accepted within 30 days with receipt"],
                "footer": store
            }
        elif 'invoice' in desc_lower:
            company = _company()
            customer = _name()
            return {
                "title": "INVOICE",
                "subtitle": company,
                "reference": f"INV-{cls._random_number(8)}",
                "header_color": "#1e3a5f",
                "sections": [
                    {"title": "Bill To", "lines": [customer, f"{random.randint(100,9999)} Commerce Blvd, Suite {random.randint(100,800)}", "New York, NY 10017"]}
                ],
                "columns": ["Description", "Qty", "Unit Price", "Amount"],
                "items": [
                    ["Consulting Services - Phase 1", "40", "$150.00", "$6,000.00"],
                    ["Software License (Annual)", "1", "$2,400.00", "$2,400.00"],
                    ["Technical Support Plan", "12", "$200.00", "$2,400.00"]
                ],
                "total": "$10,800.00",
                "notes": ["Payment due within 30 days", "Wire transfer or ACH preferred"],
                "footer": company
            }
        else:
            company = _company()
            return {
                "title": document_type.upper() if document_type else "DOCUMENT",
                "subtitle": company,
                "reference": f"DOC-{cls._random_number(6)}",
                "header_color": "#1e3a5f",
                "sections": [
                    {"title": "Details", "lines": [description[:100] if description else "Refer to the attached documentation for full details."]}
                ],
                "columns": [],
                "items": [],
                "total": "",
                "notes": [],
                "footer": company
            }
    
    @classmethod
    async def _generate_image_content(cls, description: str, document_type: str) -> str:
        """Generate content for image using AI"""
        client = cls._get_ai_client()
        
        if client:
            try:
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": f"Generate realistic content for a {document_type} document. Be brief and use real-looking data."},
                        {"role": "user", "content": description}
                    ],
                    temperature=0.7,
                    max_tokens=500
                )
                return response.choices[0].message.content
            except:
                pass
        
        return description
    
    @classmethod
    def _random_number(cls, digits: int, as_int: bool = False):
        """Generate a random number string"""
        import random
        num = ''.join([str(random.randint(0, 9)) for _ in range(digits)])
        return int(num) if as_int else num
    
    @classmethod
    def get_file(cls, item_id: str) -> Optional[str]:
        """Get the file path for a generated item"""
        cls._ensure_storage()
        
        # Look for the file
        for ext in ['json', 'docx', 'pdf', 'xlsx', 'pptx', 'txt', 'png', 'jpg']:
            filepath = os.path.join(cls.STORAGE_PATH, f"{item_id}.{ext}")
            if os.path.exists(filepath):
                return filepath
        
        return None
    
    @classmethod
    def get_mock_data(cls, item_id: str) -> Optional[List[Dict]]:
        """Get mock API data by item id (UUID) or by slug. DB first, then file."""
        # 1) Try DB by id (UUID)
        if len(item_id) == 36 and item_id.count("-") == 4:
            data = cls._get_mock_data_from_db_by_id(item_id)
            if data is not None:
                return data
        # 2) Try DB by slug
        data = cls._get_mock_data_from_db_by_slug(item_id)
        if data is not None:
            return data
        # 3) Fallback: file by id
        if len(item_id) == 36 and item_id.count("-") == 4:
            filepath = os.path.join(cls.STORAGE_PATH, f"{item_id}.json")
            if os.path.exists(filepath):
                with open(filepath, 'r') as f:
                    obj = json.load(f)
                    return obj.get("data", [])
            return None
        # 4) Fallback: file by slug
        return cls.get_mock_data_by_slug(item_id)

    @classmethod
    def get_mock_api_record(cls, item_id: str) -> Optional[Dict[str, Any]]:
        """Return mock API record (user_id, id) from DB for access check. None if file-only or not found."""
        if not item_id or item_id in ("null", "undefined", "None"):
            return None
        try:
            from database.base import get_db_session
            from database.models import LabMockAPI
            with get_db_session() as db:
                # Try by id (UUID)
                if len(item_id) == 36 and item_id.count("-") == 4:
                    row = db.query(LabMockAPI).filter(LabMockAPI.id == item_id).first()
                    if row:
                        return {"user_id": str(row.user_id) if row.user_id else None, "id": str(row.id)}
                # Try by slug
                row = (
                    db.query(LabMockAPI)
                    .filter(LabMockAPI.slug == item_id)
                    .order_by(LabMockAPI.created_at.desc())
                    .first()
                )
                if row:
                    return {"user_id": str(row.user_id) if row.user_id else None, "id": str(row.id)}
        except Exception as e:
            print(f"⚠️ [LAB] get_mock_api_record failed: {e}")
        return None

    @classmethod
    def _get_mock_data_from_db_by_id(cls, item_id: str) -> Optional[List[Dict]]:
        """Load mock API data from DB by primary key id."""
        try:
            from database.base import get_db_session
            from database.models import LabMockAPI
            with get_db_session() as db:
                row = db.query(LabMockAPI).filter(LabMockAPI.id == item_id).first()
                if row and row.data is not None:
                    return list(row.data) if isinstance(row.data, list) else []
        except Exception as e:
            print(f"⚠️ [LAB] DB get by id failed: {e}")
        return None

    @classmethod
    def _get_mock_data_from_db_by_slug(cls, slug: str) -> Optional[List[Dict]]:
        """Load mock API data from DB by slug (most recent when multiple)."""
        if not slug or slug in ("null", "undefined", "None"):
            return None
        try:
            from database.base import get_db_session
            from database.models import LabMockAPI
            with get_db_session() as db:
                row = (
                    db.query(LabMockAPI)
                    .filter(LabMockAPI.slug == slug)
                    .order_by(LabMockAPI.created_at.desc())
                    .first()
                )
                if row and row.data is not None:
                    return list(row.data) if isinstance(row.data, list) else []
        except Exception as e:
            print(f"⚠️ [LAB] DB get by slug failed: {e}")
        return None

    @classmethod
    def get_mock_data_by_slug(cls, slug: str) -> Optional[List[Dict]]:
        """Get mock API data by URL slug from DB first, then from files."""
        if not slug or slug in ("null", "undefined", "None"):
            return None
        data = cls._get_mock_data_from_db_by_slug(slug)
        if data is not None:
            return data
        cls._ensure_storage()
        for f in os.listdir(cls.STORAGE_PATH):
            if not f.endswith(".json"):
                continue
            filepath = os.path.join(cls.STORAGE_PATH, f)
            try:
                with open(filepath, 'r') as file:
                    obj = json.load(file)
                    if obj.get("slug") == slug:
                        return obj.get("data", [])
            except Exception:
                continue
        return None
