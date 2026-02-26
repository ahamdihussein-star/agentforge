#!/usr/bin/env python3
"""
Add Google OAuth Credentials to Database
"""
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.base import get_db_session
from database.models.organization import Organization
from sqlalchemy import text
import json

# Google OAuth Credentials - from environment variables
# Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Railway environment variables
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")

def add_google_oauth_credentials():
    """Add Google OAuth credentials to the default organization"""
    print("\n" + "="*60)
    print("🔧 Adding Google OAuth Credentials to Database")
    print("="*60 + "\n")
    
    # Check if credentials are provided
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        print("⚠️  Google OAuth credentials not found in environment variables")
        print("   Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Railway environment variables")
        print("   Skipping Google OAuth configuration...")
        return False
    
    with get_db_session() as session:
        # Find the default organization
        # Try by slug first
        org = session.query(Organization).filter_by(slug="default").first()
        
        if not org:
            # Try to get the first organization
            org = session.query(Organization).first()
        
        if not org:
            print("❌ No organization found in database!")
            return False
        
        print(f"📋 Found organization: {org.name} (ID: {str(org.id)[:8]}...)")
        
        # Update Google OAuth credentials
        org.google_client_id = GOOGLE_CLIENT_ID
        org.google_client_secret = GOOGLE_CLIENT_SECRET
        
        # Ensure Google is in allowed_auth_providers
        # Parse if it's a JSON string
        if org.allowed_auth_providers:
            if isinstance(org.allowed_auth_providers, str):
                try:
                    allowed_providers = json.loads(org.allowed_auth_providers)
                except:
                    allowed_providers = []
            elif isinstance(org.allowed_auth_providers, list):
                allowed_providers = org.allowed_auth_providers
            else:
                allowed_providers = []
        else:
            allowed_providers = []
        
        # Normalize provider names to lowercase strings
        allowed_providers_normalized = [
            p.lower() if isinstance(p, str) 
            else p.value.lower() if hasattr(p, 'value') 
            else str(p).lower() 
            for p in allowed_providers
        ]
        
        # Add Google if not present
        if "google" not in allowed_providers_normalized:
            allowed_providers.append("google")
            print(f"✅ Added 'google' to allowed_auth_providers")
        else:
            print(f"ℹ️  'google' already in allowed_auth_providers")
        
        # Save as JSON string (PostgreSQL JSONB expects JSON string)
        org.allowed_auth_providers = json.dumps(allowed_providers)
        
        session.commit()
        
        # Never print secrets to logs (Railway logs are treated as sensitive audit data)
        def _mask_secret(s: str, show: int = 4) -> str:
            s = str(s or "")
            if len(s) <= show:
                return "*" * len(s)
            return ("*" * (len(s) - show)) + s[-show:]

        print("✅ Added Google OAuth credentials:")
        print(f"   Client ID: {GOOGLE_CLIENT_ID[:30]}...")
        print(f"   Client Secret: {_mask_secret(GOOGLE_CLIENT_SECRET)}")
        print(f"   Allowed providers: {allowed_providers}")
        
        print("\n" + "="*60)
        print("✅ Google OAuth credentials added successfully!")
        print("="*60 + "\n")
        
        return True

if __name__ == "__main__":
    add_google_oauth_credentials()

