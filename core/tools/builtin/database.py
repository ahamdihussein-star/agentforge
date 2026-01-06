"""
AgentForge - Database Tool
Query any SQL or NoSQL database.
"""

import time
import json
from typing import Dict, Any, List, Optional

from ..base import BaseTool, ToolDefinition, ToolResult, ToolConfig, ToolCategory


class DatabaseTool(BaseTool):
    """
    Database Tool for querying SQL and NoSQL databases.
    
    Supports:
    - PostgreSQL
    - MySQL
    - SQLite
    - MongoDB
    - SQL Server
    - Oracle
    - Snowflake
    - BigQuery
    """
    
    tool_type = "database"
    category = ToolCategory.DATA
    version = "1.0.0"
    
    SUPPORTED_DBS = [
        "postgresql", "mysql", "sqlite", "mongodb",
        "sqlserver", "oracle", "snowflake", "bigquery"
    ]
    
    def __init__(self, config: ToolConfig):
        super().__init__(config)
        
        # Extract configuration
        self.db_type = config.config.get("type", "").lower()
        self.connection_string = config.config.get("connection")
        self.allowed_tables = config.config.get("allowed_tables", [])
        self.allowed_operations = config.config.get("allowed_operations", ["read"])
        self.max_rows = config.config.get("max_rows", 100)
        
        # Initialize connection
        self.connection = self._init_connection()
    
    def _validate_config(self):
        """Validate database configuration"""
        if "type" not in self.config.config:
            raise ValueError("Database tool requires 'type' in config")
        
        db_type = self.config.config["type"].lower()
        if db_type not in self.SUPPORTED_DBS:
            raise ValueError(f"Unsupported database type: {db_type}")
    
    def _init_connection(self):
        """Initialize database connection"""
        if self.db_type == "postgresql":
            return self._init_postgresql()
        elif self.db_type == "mysql":
            return self._init_mysql()
        elif self.db_type == "sqlite":
            return self._init_sqlite()
        elif self.db_type == "mongodb":
            return self._init_mongodb()
        else:
            raise ValueError(f"Connection not implemented for: {self.db_type}")
    
    def _init_postgresql(self):
        """Initialize PostgreSQL connection"""
        try:
            import asyncpg
            # Return connection string for async connection
            return {"type": "postgresql", "connection_string": self.connection_string}
        except ImportError:
            try:
                import psycopg2
                return psycopg2.connect(self.connection_string)
            except ImportError:
                raise ImportError(
                    "PostgreSQL driver required. Install with: "
                    "pip install asyncpg or pip install psycopg2-binary"
                )
    
    def _init_mysql(self):
        """Initialize MySQL connection"""
        try:
            import aiomysql
            return {"type": "mysql", "connection_string": self.connection_string}
        except ImportError:
            try:
                import mysql.connector
                return mysql.connector.connect(
                    **self._parse_connection_string(self.connection_string)
                )
            except ImportError:
                raise ImportError(
                    "MySQL driver required. Install with: "
                    "pip install aiomysql or pip install mysql-connector-python"
                )
    
    def _init_sqlite(self):
        """Initialize SQLite connection"""
        import sqlite3
        db_path = self.config.config.get("path", ":memory:")
        return sqlite3.connect(db_path)
    
    def _init_mongodb(self):
        """Initialize MongoDB connection"""
        try:
            from motor.motor_asyncio import AsyncIOMotorClient
            return AsyncIOMotorClient(self.connection_string)
        except ImportError:
            try:
                from pymongo import MongoClient
                return MongoClient(self.connection_string)
            except ImportError:
                raise ImportError(
                    "MongoDB driver required. Install with: "
                    "pip install motor or pip install pymongo"
                )
    
    def _parse_connection_string(self, conn_str: str) -> Dict[str, str]:
        """Parse connection string to dict"""
        # Simple parsing for mysql://user:pass@host:port/database
        import urllib.parse
        parsed = urllib.parse.urlparse(conn_str)
        
        return {
            "host": parsed.hostname,
            "port": parsed.port or 3306,
            "user": parsed.username,
            "password": parsed.password,
            "database": parsed.path.lstrip('/')
        }
    
    def get_definition(self) -> ToolDefinition:
        """Return tool definition for LLM"""
        
        # Build description based on allowed operations
        ops_desc = ", ".join(self.allowed_operations)
        tables_desc = ", ".join(self.allowed_tables) if self.allowed_tables else "all tables"
        
        return ToolDefinition(
            name=f"query_{self.name}",
            description=f"Query the {self.name} database ({self.db_type}). "
                       f"Allowed operations: {ops_desc}. "
                       f"Available tables: {tables_desc}.",
            parameters={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "SQL query to execute (for SQL databases) or "
                                     "MongoDB query document as JSON string"
                    },
                    "collection": {
                        "type": "string",
                        "description": "(MongoDB only) Collection name to query"
                    }
                },
                "required": ["query"]
            }
        )
    
    async def execute(
        self,
        query: str,
        collection: Optional[str] = None,
        **kwargs
    ) -> ToolResult:
        """
        Execute a database query.
        
        Args:
            query: SQL query or MongoDB query document
            collection: MongoDB collection name
            
        Returns:
            ToolResult with query results
        """
        start_time = time.time()
        
        try:
            # Validate query
            is_valid, error = self._validate_query(query)
            if not is_valid:
                return ToolResult(
                    success=False,
                    error=error,
                    execution_time_ms=(time.time() - start_time) * 1000
                )
            
            # Execute based on database type
            if self.db_type == "mongodb":
                results = await self._execute_mongodb(query, collection)
            else:
                results = await self._execute_sql(query)
            
            execution_time = (time.time() - start_time) * 1000
            
            return ToolResult(
                success=True,
                data={
                    "results": results,
                    "count": len(results) if isinstance(results, list) else 1
                },
                execution_time_ms=execution_time,
                summary=f"Query returned {len(results) if isinstance(results, list) else 1} rows"
            )
            
        except Exception as e:
            return ToolResult(
                success=False,
                error=str(e),
                execution_time_ms=(time.time() - start_time) * 1000
            )
    
    def _validate_query(self, query: str) -> tuple:
        """Validate query against allowed operations and tables"""
        query_lower = query.lower().strip()
        
        # Check operations
        if "read" in self.allowed_operations:
            if not query_lower.startswith("select"):
                # Check if it's not a read operation
                if any(query_lower.startswith(op) for op in ["insert", "update", "delete", "drop", "create", "alter"]):
                    if "write" not in self.allowed_operations:
                        return False, "Write operations not allowed"
        
        # Check tables (basic check)
        if self.allowed_tables:
            # Extract table names from query (simplified)
            mentioned_tables = self._extract_tables(query)
            for table in mentioned_tables:
                if table.lower() not in [t.lower() for t in self.allowed_tables]:
                    return False, f"Access to table '{table}' not allowed"
        
        # Check for dangerous patterns
        dangerous_patterns = ["drop table", "truncate", "drop database", "--", ";--"]
        for pattern in dangerous_patterns:
            if pattern in query_lower:
                return False, f"Dangerous pattern detected: {pattern}"
        
        return True, None
    
    def _extract_tables(self, query: str) -> List[str]:
        """Extract table names from SQL query (simplified)"""
        import re
        
        # Common patterns: FROM table, JOIN table, INTO table, UPDATE table
        patterns = [
            r'\bfrom\s+(\w+)',
            r'\bjoin\s+(\w+)',
            r'\binto\s+(\w+)',
            r'\bupdate\s+(\w+)',
        ]
        
        tables = []
        for pattern in patterns:
            matches = re.findall(pattern, query.lower())
            tables.extend(matches)
        
        return list(set(tables))
    
    async def _execute_sql(self, query: str) -> List[Dict]:
        """Execute SQL query"""
        if self.db_type == "sqlite":
            cursor = self.connection.cursor()
            cursor.execute(query)
            
            # Get column names
            columns = [desc[0] for desc in cursor.description] if cursor.description else []
            
            # Fetch results
            rows = cursor.fetchmany(self.max_rows)
            
            return [dict(zip(columns, row)) for row in rows]
        
        elif self.db_type == "postgresql":
            try:
                import asyncpg
                conn = await asyncpg.connect(self.connection_string)
                try:
                    rows = await conn.fetch(query)
                    return [dict(row) for row in rows[:self.max_rows]]
                finally:
                    await conn.close()
            except ImportError:
                # Fall back to sync
                cursor = self.connection.cursor()
                cursor.execute(query)
                columns = [desc[0] for desc in cursor.description]
                rows = cursor.fetchmany(self.max_rows)
                return [dict(zip(columns, row)) for row in rows]
        
        else:
            # Generic SQL execution
            cursor = self.connection.cursor()
            cursor.execute(query)
            columns = [desc[0] for desc in cursor.description] if cursor.description else []
            rows = cursor.fetchmany(self.max_rows)
            return [dict(zip(columns, row)) for row in rows]
    
    async def _execute_mongodb(self, query: str, collection: str) -> List[Dict]:
        """Execute MongoDB query"""
        if not collection:
            raise ValueError("Collection name required for MongoDB queries")
        
        # Parse query document from JSON string
        try:
            query_doc = json.loads(query)
        except json.JSONDecodeError:
            raise ValueError("Invalid JSON query document")
        
        # Get collection
        db_name = self.config.config.get("database", "default")
        coll = self.connection[db_name][collection]
        
        # Execute query
        cursor = coll.find(query_doc).limit(self.max_rows)
        
        results = []
        async for doc in cursor:
            doc['_id'] = str(doc['_id'])  # Convert ObjectId to string
            results.append(doc)
        
        return results
    
    async def test(self) -> ToolResult:
        """Test database connection"""
        try:
            if self.db_type == "mongodb":
                # Test MongoDB connection
                await self.connection.admin.command('ping')
            else:
                # Test SQL connection with simple query
                await self._execute_sql("SELECT 1")
            
            return ToolResult(
                success=True,
                data={"status": "ok", "database_type": self.db_type},
                summary="Database connection successful"
            )
        except Exception as e:
            return ToolResult(
                success=False,
                error=str(e)
            )


# Register the tool
from ..base import ToolRegistry
ToolRegistry.register("database", DatabaseTool)
ToolRegistry.register("db", DatabaseTool)
ToolRegistry.register("sql", DatabaseTool)
