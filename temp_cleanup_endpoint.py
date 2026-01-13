"""
Emergency API endpoint to delete roles with string IDs
Add this to api/security.py temporarily for quick fix
"""

# Add this endpoint to api/security.py

@router.delete("/roles/cleanup-string-ids")
async def cleanup_string_id_roles(user: User = Depends(require_super_admin)):
    """Emergency endpoint to delete roles with string IDs (from roles.json)"""
    from sqlalchemy import text
    from database.base import get_db_session
    
    deleted_roles = []
    
    try:
        with get_db_session() as session:
            # Delete roles with string IDs
            result = session.execute(text("""
                DELETE FROM roles 
                WHERE id IN ('role_super_admin', 'role_admin', 'role_manager', 'role_user', 'role_viewer')
                RETURNING id, name
            """))
            
            for row in result:
                deleted_roles.append({"id": row[0], "name": row[1]})
            
            session.commit()
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
    
    # Also remove from in-memory state
    for role_id in ['role_super_admin', 'role_admin', 'role_manager', 'role_user', 'role_viewer']:
        if role_id in security_state.roles:
            del security_state.roles[role_id]
    
    return {
        "message": f"Deleted {len(deleted_roles)} roles with string IDs",
        "deleted": deleted_roles,
        "remaining_count": len(security_state.roles)
    }

