"""
AgentForge - RAG Tool
Knowledge Base search using Retrieval-Augmented Generation.
"""

import time
from typing import Dict, Any, List, Optional

from ..base import BaseTool, ToolDefinition, ToolResult, ToolConfig, ToolCategory


class RAGTool(BaseTool):
    """
    RAG (Retrieval-Augmented Generation) Tool.
    
    Provides knowledge base search capabilities using vector similarity search.
    Supports multiple vector database backends.
    """
    
    tool_type = "rag"
    category = ToolCategory.KNOWLEDGE
    version = "1.0.0"
    
    # Supported vector databases
    SUPPORTED_VECTOR_DBS = ["pinecone", "qdrant", "chromadb", "weaviate", "milvus"]
    
    def __init__(self, config: ToolConfig):
        super().__init__(config)
        
        # Extract configuration
        self.vector_db_config = config.config.get("vector_db", {})
        self.embeddings_config = config.config.get("embeddings", {})
        self.search_config = config.config.get("search", {})
        
        # Initialize components
        self.vector_db = self._init_vector_db()
        self.embeddings = self._init_embeddings()
    
    def _validate_config(self):
        """Validate RAG configuration"""
        if "vector_db" not in self.config.config:
            raise ValueError("RAG tool requires 'vector_db' configuration")
    
    def _init_vector_db(self):
        """Initialize vector database client"""
        db_type = self.vector_db_config.get("type", "").lower()
        
        if db_type == "pinecone":
            return self._init_pinecone()
        elif db_type == "qdrant":
            return self._init_qdrant()
        elif db_type == "chromadb":
            return self._init_chromadb()
        elif db_type == "weaviate":
            return self._init_weaviate()
        elif db_type == "milvus":
            return self._init_milvus()
        else:
            raise ValueError(f"Unsupported vector database: {db_type}")
    
    def _init_pinecone(self):
        """Initialize Pinecone client"""
        try:
            from pinecone import Pinecone
            
            pc = Pinecone(api_key=self.vector_db_config.get("api_key"))
            index_name = self.vector_db_config.get("index")
            return pc.Index(index_name)
        except ImportError:
            raise ImportError("pinecone-client required. Install with: pip install pinecone-client")
    
    def _init_qdrant(self):
        """Initialize Qdrant client"""
        try:
            from qdrant_client import QdrantClient
            
            return QdrantClient(
                host=self.vector_db_config.get("host", "localhost"),
                port=self.vector_db_config.get("port", 6333),
                api_key=self.vector_db_config.get("api_key")
            )
        except ImportError:
            raise ImportError("qdrant-client required. Install with: pip install qdrant-client")
    
    def _init_chromadb(self):
        """Initialize ChromaDB client"""
        try:
            import chromadb
            
            persist_dir = self.vector_db_config.get("persist_directory")
            if persist_dir:
                return chromadb.PersistentClient(path=persist_dir)
            else:
                return chromadb.Client()
        except ImportError:
            raise ImportError("chromadb required. Install with: pip install chromadb")
    
    def _init_weaviate(self):
        """Initialize Weaviate client"""
        try:
            import weaviate
            
            return weaviate.Client(
                url=self.vector_db_config.get("url"),
                auth_client_secret=weaviate.AuthApiKey(
                    api_key=self.vector_db_config.get("api_key")
                ) if self.vector_db_config.get("api_key") else None
            )
        except ImportError:
            raise ImportError("weaviate-client required. Install with: pip install weaviate-client")
    
    def _init_milvus(self):
        """Initialize Milvus client"""
        try:
            from pymilvus import connections, Collection
            
            connections.connect(
                host=self.vector_db_config.get("host", "localhost"),
                port=self.vector_db_config.get("port", 19530)
            )
            return Collection(self.vector_db_config.get("collection"))
        except ImportError:
            raise ImportError("pymilvus required. Install with: pip install pymilvus")
    
    def _init_embeddings(self):
        """Initialize embeddings model"""
        provider = self.embeddings_config.get("provider", "openai")
        model = self.embeddings_config.get("model", "text-embedding-3-small")
        
        if provider == "openai":
            try:
                from openai import OpenAI
                
                client = OpenAI(api_key=self.embeddings_config.get("api_key"))
                return lambda texts: client.embeddings.create(
                    model=model,
                    input=texts
                ).data
            except ImportError:
                raise ImportError("openai required. Install with: pip install openai")
        
        elif provider == "sentence_transformers" or provider == "local":
            try:
                from sentence_transformers import SentenceTransformer
                
                model_obj = SentenceTransformer(model)
                return lambda texts: model_obj.encode(texts).tolist()
            except ImportError:
                raise ImportError(
                    "sentence-transformers required. Install with: "
                    "pip install sentence-transformers"
                )
        
        else:
            raise ValueError(f"Unsupported embeddings provider: {provider}")
    
    def get_definition(self) -> ToolDefinition:
        """Return tool definition for LLM"""
        return ToolDefinition(
            name=f"search_{self.name}",
            description=f"Search the {self.name} knowledge base for relevant information. "
                       f"Use this to find answers to questions about the topics covered in the knowledge base.",
            parameters={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query to find relevant information"
                    },
                    "top_k": {
                        "type": "integer",
                        "description": "Number of results to return (default: 5)",
                        "default": 5
                    }
                },
                "required": ["query"]
            }
        )
    
    async def execute(self, query: str, top_k: int = 5, **kwargs) -> ToolResult:
        """
        Search the knowledge base.
        
        Args:
            query: Search query
            top_k: Number of results to return
            
        Returns:
            ToolResult with search results
        """
        start_time = time.time()
        
        try:
            # Generate embedding for query
            query_embedding = await self._embed_query(query)
            
            # Search vector database
            results = await self._search(query_embedding, top_k)
            
            # Format results
            formatted_results = self._format_results(results)
            
            execution_time = (time.time() - start_time) * 1000
            
            return ToolResult(
                success=True,
                data={
                    "query": query,
                    "results": formatted_results,
                    "count": len(formatted_results)
                },
                execution_time_ms=execution_time,
                summary=f"Found {len(formatted_results)} relevant documents"
            )
            
        except Exception as e:
            return ToolResult(
                success=False,
                error=str(e),
                execution_time_ms=(time.time() - start_time) * 1000
            )
    
    async def _embed_query(self, query: str) -> List[float]:
        """Generate embedding for a query"""
        embeddings = self.embeddings([query])
        
        if hasattr(embeddings[0], 'embedding'):
            # OpenAI format
            return embeddings[0].embedding
        else:
            # Direct list format
            return embeddings[0]
    
    async def _search(self, query_embedding: List[float], top_k: int) -> List[Dict]:
        """Search the vector database"""
        db_type = self.vector_db_config.get("type", "").lower()
        
        if db_type == "pinecone":
            return await self._search_pinecone(query_embedding, top_k)
        elif db_type == "qdrant":
            return await self._search_qdrant(query_embedding, top_k)
        elif db_type == "chromadb":
            return await self._search_chromadb(query_embedding, top_k)
        else:
            raise ValueError(f"Search not implemented for: {db_type}")
    
    async def _search_pinecone(self, query_embedding: List[float], top_k: int) -> List[Dict]:
        """Search Pinecone"""
        results = self.vector_db.query(
            vector=query_embedding,
            top_k=top_k,
            include_metadata=True
        )
        
        return [
            {
                "id": match.id,
                "score": match.score,
                "content": match.metadata.get("content", match.metadata.get("text", "")),
                "source": match.metadata.get("source", ""),
                "metadata": match.metadata
            }
            for match in results.matches
        ]
    
    async def _search_qdrant(self, query_embedding: List[float], top_k: int) -> List[Dict]:
        """Search Qdrant"""
        collection = self.vector_db_config.get("collection", "default")
        
        results = self.vector_db.search(
            collection_name=collection,
            query_vector=query_embedding,
            limit=top_k
        )
        
        return [
            {
                "id": str(hit.id),
                "score": hit.score,
                "content": hit.payload.get("content", hit.payload.get("text", "")),
                "source": hit.payload.get("source", ""),
                "metadata": hit.payload
            }
            for hit in results
        ]
    
    async def _search_chromadb(self, query_embedding: List[float], top_k: int) -> List[Dict]:
        """Search ChromaDB"""
        collection_name = self.vector_db_config.get("collection", "default")
        collection = self.vector_db.get_collection(collection_name)
        
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k
        )
        
        formatted = []
        for i, doc_id in enumerate(results['ids'][0]):
            formatted.append({
                "id": doc_id,
                "score": 1 - results['distances'][0][i] if results.get('distances') else 0,
                "content": results['documents'][0][i] if results.get('documents') else "",
                "metadata": results['metadatas'][0][i] if results.get('metadatas') else {}
            })
        
        return formatted
    
    def _format_results(self, results: List[Dict]) -> List[Dict]:
        """Format search results for output"""
        formatted = []
        
        for result in results:
            formatted.append({
                "content": result.get("content", "")[:1000],  # Truncate long content
                "source": result.get("source", "Unknown"),
                "relevance": round(result.get("score", 0) * 100, 1)
            })
        
        return formatted
    
    async def test(self) -> ToolResult:
        """Test the RAG tool configuration"""
        try:
            # Try to embed a test query
            await self._embed_query("test")
            
            return ToolResult(
                success=True,
                data={"status": "ok", "vector_db": self.vector_db_config.get("type")},
                summary="RAG tool is configured correctly"
            )
        except Exception as e:
            return ToolResult(
                success=False,
                error=str(e)
            )


# Register the tool
from ..base import ToolRegistry
ToolRegistry.register("rag", RAGTool)
ToolRegistry.register("knowledge_base", RAGTool)
