#!/usr/bin/env python3
"""
AgentForge - Quick Start Script
Run this to start the AgentForge server.
"""

import os
import sys

def main():
    # Add project to path
    project_dir = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, project_dir)
    
    # Load environment
    from dotenv import load_dotenv
    load_dotenv()
    
    # Import and run
    import uvicorn
    
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", 8000))
    debug = os.environ.get("DEBUG", "false").lower() == "true"
    
    print(f"""
    🔥 AgentForge Starting...
    
    ╔══════════════════════════════════════════╗
    ║                                          ║
    ║   🌐 UI:   http://localhost:{port}/ui      ║
    ║   📚 API:  http://localhost:{port}/docs    ║
    ║                                          ║
    ╚══════════════════════════════════════════╝
    """)
    
    uvicorn.run(
        "api.main:app",
        host=host,
        port=port,
        reload=debug,
        log_level="info" if debug else "warning"
    )


if __name__ == "__main__":
    main()
