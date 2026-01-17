"""
Lab Service - AI-powered test data generation

This service handles:
- Mock API generation with realistic data using AI
- Document generation (Word, PDF, Excel, PPT)
- Image generation for OCR testing
"""

import os
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
        org_id: str = None
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
        
        # Save to storage
        result = {
            "id": item_id,
            "name": name,
            "endpoint": f"/api/lab/mock/{item_id}",
            "data": data,
            "schema": schema,
            "record_count": len(data),
            "created_at": datetime.utcnow().isoformat(),
            "org_id": org_id
        }
        
        with open(os.path.join(cls.STORAGE_PATH, f"{item_id}.json"), 'w') as f:
            json.dump(result, f, indent=2)
        
        return result
    
    @classmethod
    def _generate_sample_data(cls, description: str, count: int) -> List[Dict]:
        """Generate sample data when AI is not available"""
        import random
        
        # Detect what type of data based on description
        desc_lower = description.lower()
        
        if any(w in desc_lower for w in ['customer', 'user', 'person', 'employee']):
            return [
                {
                    "id": i + 1,
                    "name": f"Sample Person {i + 1}",
                    "email": f"person{i + 1}@example.com",
                    "phone": f"+1-555-{random.randint(100, 999)}-{random.randint(1000, 9999)}",
                    "company": f"Company {chr(65 + (i % 26))}",
                    "created_at": datetime.utcnow().isoformat()
                }
                for i in range(count)
            ]
        elif any(w in desc_lower for w in ['product', 'item', 'inventory']):
            return [
                {
                    "id": i + 1,
                    "name": f"Product {i + 1}",
                    "sku": f"SKU-{random.randint(10000, 99999)}",
                    "price": round(random.uniform(10, 500), 2),
                    "quantity": random.randint(0, 100),
                    "category": random.choice(["Electronics", "Clothing", "Food", "Home"])
                }
                for i in range(count)
            ]
        elif any(w in desc_lower for w in ['order', 'transaction', 'sale']):
            return [
                {
                    "id": i + 1,
                    "order_number": f"ORD-{random.randint(100000, 999999)}",
                    "customer_id": random.randint(1, 100),
                    "total": round(random.uniform(50, 1000), 2),
                    "status": random.choice(["pending", "processing", "shipped", "delivered"]),
                    "created_at": datetime.utcnow().isoformat()
                }
                for i in range(count)
            ]
        else:
            # Generic data
            return [
                {
                    "id": i + 1,
                    "name": f"Item {i + 1}",
                    "value": random.randint(1, 100),
                    "active": random.choice([True, False]),
                    "created_at": datetime.utcnow().isoformat()
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
        return f"""# Document

## Overview
{description}

## Details
This is a generated document based on your requirements.

## Conclusion
Document generated by AgentForge Lab.
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
        slide.placeholders[1].text = "Generated by AgentForge Lab"
        
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
        
        # Read as base64 for preview
        base64_data = None
        try:
            with open(filepath, 'rb') as f:
                base64_data = base64.b64encode(f.read()).decode('utf-8')
        except:
            pass
        
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
        """Create a document image using PIL"""
        
        # Get content from AI
        content = await cls._generate_image_content(description, document_type)
        
        # Image dimensions (A4-like ratio)
        width = 800
        height = 1100
        
        # Create image
        img = Image.new('RGB', (width, height), color='white')
        draw = ImageDraw.Draw(img)
        
        # Try to load a font
        try:
            font_large = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 24)
            font_medium = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 16)
            font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 12)
        except:
            font_large = ImageFont.load_default()
            font_medium = font_large
            font_small = font_large
        
        # Draw based on document type
        y = 40
        margin = 50
        
        if document_type == "invoice":
            # Invoice header
            draw.rectangle([0, 0, width, 120], fill='#1e3a5f')
            draw.text((margin, 30), "INVOICE", font=font_large, fill='white')
            draw.text((width - 200, 30), f"#{cls._random_number(6)}", font=font_medium, fill='white')
            draw.text((width - 200, 55), datetime.now().strftime("%Y-%m-%d"), font=font_small, fill='#cccccc')
            
            y = 150
            
            # Company info
            draw.text((margin, y), "From: Sample Company Inc.", font=font_medium, fill='black')
            y += 30
            draw.text((margin, y), "123 Business Street", font=font_small, fill='#666666')
            y += 50
            
            draw.text((margin, y), "Bill To:", font=font_medium, fill='black')
            y += 25
            draw.text((margin, y), "Customer Name", font=font_small, fill='#666666')
            y += 50
            
            # Table header
            draw.rectangle([margin, y, width - margin, y + 30], fill='#f0f0f0')
            draw.text((margin + 10, y + 8), "Item", font=font_small, fill='black')
            draw.text((400, y + 8), "Qty", font=font_small, fill='black')
            draw.text((500, y + 8), "Price", font=font_small, fill='black')
            draw.text((600, y + 8), "Total", font=font_small, fill='black')
            y += 35
            
            # Table rows
            items = ["Product A", "Service B", "Item C"]
            total = 0
            for item in items:
                qty = cls._random_number(1, as_int=True) or 1
                price = float(cls._random_number(3)) if cls._random_number(3) else 99.99
                line_total = qty * price
                total += line_total
                
                draw.text((margin + 10, y), item, font=font_small, fill='#333333')
                draw.text((400, y), str(qty), font=font_small, fill='#333333')
                draw.text((500, y), f"${price:.2f}", font=font_small, fill='#333333')
                draw.text((600, y), f"${line_total:.2f}", font=font_small, fill='#333333')
                draw.line([(margin, y + 25), (width - margin, y + 25)], fill='#eeeeee')
                y += 30
            
            # Total
            y += 20
            draw.rectangle([width - 250, y, width - margin, y + 40], fill='#1e3a5f')
            draw.text((width - 240, y + 10), f"TOTAL: ${total:.2f}", font=font_medium, fill='white')
            
        elif document_type == "receipt":
            # Receipt style
            draw.rectangle([0, 0, width, 80], fill='#2d2d2d')
            draw.text((width // 2 - 50, 25), "RECEIPT", font=font_large, fill='white')
            
            y = 100
            draw.text((margin, y), f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M')}", font=font_small, fill='#666666')
            y += 40
            
            # Items
            for i in range(5):
                item_name = f"Item {i + 1}"
                price = float(cls._random_number(2)) if cls._random_number(2) else 9.99
                draw.text((margin, y), item_name, font=font_medium, fill='black')
                draw.text((width - margin - 80, y), f"${price:.2f}", font=font_medium, fill='black')
                y += 30
            
            # Total line
            y += 20
            draw.line([(margin, y), (width - margin, y)], fill='black', width=2)
            y += 15
            draw.text((margin, y), "TOTAL", font=font_large, fill='black')
            draw.text((width - margin - 100, y), "$59.95", font=font_large, fill='black')
            
        elif document_type == "form":
            # Form style
            draw.text((width // 2 - 100, 40), "APPLICATION FORM", font=font_large, fill='black')
            y = 100
            
            fields = ["Full Name:", "Date of Birth:", "Address:", "Phone:", "Email:", "Signature:"]
            for field in fields:
                draw.text((margin, y), field, font=font_medium, fill='black')
                draw.line([(margin + 150, y + 20), (width - margin, y + 20)], fill='#cccccc')
                y += 60
                
        elif document_type == "id":
            # ID card style
            draw.rectangle([100, 100, width - 100, height - 400], outline='#1e3a5f', width=3)
            draw.rectangle([100, 100, width - 100, 180], fill='#1e3a5f')
            draw.text((width // 2 - 80, 125), "IDENTIFICATION", font=font_medium, fill='white')
            
            # Photo placeholder
            draw.rectangle([150, 220, 320, 420], outline='#cccccc', width=2)
            draw.text((180, 310), "PHOTO", font=font_medium, fill='#cccccc')
            
            # Info
            draw.text((350, 230), "Name: John Doe", font=font_medium, fill='black')
            draw.text((350, 270), "ID: 123-456-789", font=font_small, fill='#666666')
            draw.text((350, 300), "DOB: 1990-01-15", font=font_small, fill='#666666')
            draw.text((350, 330), "Valid Until: 2025-12-31", font=font_small, fill='#666666')
            
        else:
            # Generic document
            draw.text((margin, y), name.upper(), font=font_large, fill='black')
            y += 50
            
            # Draw content lines
            lines = content.split('\n') if content else ["Document content here"]
            for line in lines[:20]:
                if line.strip():
                    draw.text((margin, y), line[:80], font=font_small, fill='#333333')
                    y += 25
        
        # Footer
        draw.line([(0, height - 60), (width, height - 60)], fill='#eeeeee')
        draw.text((margin, height - 45), "Generated by AgentForge Lab", font=font_small, fill='#999999')
        
        # Save
        if format == 'jpg':
            img = img.convert('RGB')
            img.save(filepath, 'JPEG', quality=90)
        else:
            img.save(filepath, 'PNG')
        
        return os.path.getsize(filepath)
    
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
        """Get mock API data"""
        filepath = os.path.join(cls.STORAGE_PATH, f"{item_id}.json")
        if os.path.exists(filepath):
            with open(filepath, 'r') as f:
                data = json.load(f)
                return data.get('data', [])
        return None
