# AgentForge Product Overview

## What It Does

AgentForge is an enterprise AI agent platform that lets organizations build, deploy, and manage two types of AI agents:

### Chat Agents (Conversational)
- Users have conversations with AI agents
- Agents can call tools (APIs, databases, email, web scraping)
- Agents use multiple LLM providers (OpenAI, Anthropic, Google, etc.)
- Supports file attachments and knowledge bases

### Process Agents (Workflows)
- Visual workflow builder for business processes
- Generate workflows from natural language descriptions
- Execute multi-step processes with approvals, conditions, loops
- Track execution history and state

## Key User Capabilities

**For End Users:**
- Chat with AI agents through web portal
- Upload files and get AI-powered responses
- View conversation history
- Manage profile and MFA settings

**For Administrators:**
- Create and configure agents (chat or process)
- Build visual workflows with drag-and-drop
- Set up tools (API integrations, databases, knowledge bases)
- Manage users, roles, and permissions
- Control access to agents and data
- Monitor agent usage and executions

**For Business Users:**
- Describe a workflow in plain English → get visual process
- Test workflows with step-by-step playback
- Approve/reject process steps
- Track process execution status

## Core Features

- **Multi-LLM Support**: 10+ providers with intelligent routing
- **Enterprise Security**: RBAC, MFA (TOTP/Email), OAuth (Google), audit logging
- **Access Control**: Agent-level permissions, delegated admin
- **Multi-Tenancy**: Organization isolation
- **Process Builder**: AI-powered workflow generation with grounded validation
- **Database-First**: PostgreSQL with full persistence
- **Tool Ecosystem**: API calls, RAG, email, web scraping, file operations

## Target Users

**Primary**: Non-technical business users in large organizations and government agencies
**Secondary**: IT administrators who configure the platform
**Tertiary**: Developers who extend the platform with custom tools

## Platform Philosophy

1. **No-Code First**: Everything configurable through UI
2. **Business Language**: No technical jargon in user-facing features
3. **Generic & Flexible**: No hardcoded business logic
4. **Enterprise-Grade**: Security, scalability, audit trails
5. **Cloud-Agnostic**: Runs anywhere (AWS, Azure, GCP, on-premise)
