"""
Lab Module - Test Data Generator

This module provides AI-powered generation of:
- Mock APIs with realistic data
- Professional documents (Word, PDF, Excel, PPT)
- Document images for OCR testing

Designed as a standalone module for future microservices extraction.
"""

from .router import router as lab_router
from .service import LabService

__all__ = ['lab_router', 'LabService']
