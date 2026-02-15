# Enterprise Workflow Platform Comparison: Visual Process Builder Analysis

**Research Date:** February 15, 2026  
**Focus:** Business-user-facing visual process builders used by large enterprises and government agencies

---

## Executive Summary

This document compares leading enterprise workflow/process automation platforms to understand:
- Standard shapes/steps business users see
- How platforms handle "Action" vs "AI Action" distinction
- Essential node types that might be missing
- Properties/configuration approaches for non-technical users

---

## 1. Microsoft Power Automate

### Standard Shapes/Steps Business Users See

**Visual Organization:**
- **Favorites**: User-bookmarked actions for quick access
- **AI Capabilities**: Dedicated standalone section for all AI features
- **Built-in Tools**: Core building blocks (variables, loops, conditionals)
- **By Connector**: All connectors organized by service (20 most-used at top)

**Action Categories (100+ categories):**
- Active Directory, AI Builder, AWS, Azure
- Browser automation, Clipboard, Cloud connectors, CMD session, Compression
- Database, Date/time, Email, Excel, Exchange Server, File, Flow control, Folder, FTP
- IBM Cognitive, Logging, Loops, Message boxes, Microsoft Cognitive, Mouse and keyboard, OCR, Outlook
- SAP automation, Scripting, SharePoint, System, Terminal emulation, Text, UI automation, Variables, Windows services

**Core Node Types:**
- **Triggers**: Start events (manual, scheduled, event-based)
- **Actions**: Standard automation steps
- **Conditions**: Branching logic
- **Loops**: Iteration over collections
- **Variables**: Data storage/manipulation
- **Approvals**: Human-in-the-loop steps

### Handling "Action" vs "AI Action" Confusion

**Clear Separation Strategy:**
- ✅ **Dedicated "AI Capabilities" section** in the action pane (separate from regular actions)
- ✅ **AI Builder** is a distinct category with its own icon/branding
- ✅ AI actions include prebuilt models (text translation, sentiment analysis, receipt processing) and custom models
- ✅ Regular actions handle standard automation without AI enhancement

**Business User Experience:**
- AI Builder designed as "turnkey solution" with point-and-click interface
- No coding required for AI actions
- Clear visual distinction in the UI between AI and non-AI capabilities

### Essential Node Types

**Standard Nodes:**
- ✅ Triggers (multiple types)
- ✅ Actions (connector-based)
- ✅ Conditions/Branching
- ✅ Loops
- ✅ Variables
- ✅ Approvals
- ✅ Error handling
- ✅ Parallel branches

**AI-Specific Nodes:**
- ✅ AI Builder actions (prebuilt models)
- ✅ Custom AI models (prediction, object detection, document processing, entity extraction)

### Properties/Configuration for Non-Technical Users

**Configuration Panel:**
- After selecting an action, configuration panel shows:
  - Required fields (clearly marked)
  - Optional fields
  - Input/output fields displayed as forms
- Example: Email action shows recipient, subject, body, attachments as simple form fields
- Business users fill in information and continue building flows

**User-Friendly Features:**
- Visual drag-and-drop interface
- Contextual help and tooltips
- Pre-configured templates
- Favorites system for frequently used actions

---

## 2. ServiceNow Flow Designer

### Standard Shapes/Steps Business Users See

**Core Step Types:**
- **Ask for Approval**: Primary approval mechanism with configurable rules
- **Action Steps**: Execute various operations
- **Script Steps**: Advanced logic (optional, can be avoided)
- **Decision Steps**: Conditional branching
- **Trigger Steps**: Start events

**Approval Configuration:**
- Low-code conditions in "Ask for Approval" action
- Syntax: `ruleset+rule+who+[sys_id list]`
  - Rulesets: Approves, Rejects, ApprovesRejects
  - Rules: Any (anyone approves), All (all approve), Res (all respond + any approves), % (percentage), # (number)
  - Who: U (users) or G (groups)

### Handling "Action" vs "AI Action" Confusion

**Approach:**
- Scripted approvals use specific syntax but are designed to be accessible through low-code conditions
- Most approvals don't require scripting
- Business users can configure approvals through UI without technical knowledge

**Note:** Limited information found on explicit AI action separation in Flow Designer. Appears to integrate AI capabilities within standard actions rather than separate category.

### Essential Node Types

**Standard Nodes:**
- ✅ Approval steps (Ask for Approval)
- ✅ Action steps
- ✅ Decision/Branching
- ✅ Triggers
- ✅ Script steps (optional, for advanced users)

**Missing from Research:**
- Explicit AI action nodes (may be integrated)
- Loop/iteration nodes (may exist but not documented in search results)

### Properties/Configuration for Non-Technical Users

**Business User Focus:**
- Low-code conditions make scripting unnecessary in most cases
- Approval rules configurable through UI
- Flow variables accessible without deep technical knowledge
- Tracks multiple approvers through approval table

**Configuration Approach:**
- Visual workflow builder
- Form-based configuration panels
- Pre-built approval patterns

---

## 3. Kissflow

### Standard Shapes/Steps Business Users See

**Core Components:**
- **Workflow Steps**: Human tasks (sequential or parallel branches)
- **Conditional Logic**: Dynamic workflow adaptation based on inputs/triggers
- **SLAs**: Fixed or formula-based service level agreements with automated reminders
- **Forms**: Customized forms with field validation and templates

**Process Builder Interface:**
- **Left Navigation**: Form, workflow, and permissions tabs
- **Center Canvas**: Visual form/workflow being built
- **Right Panel**: Basic and advanced field options for drag-and-drop

**Workflow Design Elements:**
- Adding new steps
- Creating parallel branches
- Adding Goto functions
- Running connected processes
- **AI to suggest and create steps** (notable feature)

### Handling "Action" vs "AI Action" Confusion

**AI Integration:**
- ✅ **AI suggests and creates steps** - AI assists in workflow creation
- AI appears integrated into the step creation process rather than as separate action types
- Business users can leverage AI to discover and add appropriate steps

**Approach:** AI is a helper/enhancer rather than a separate category of actions.

### Essential Node Types

**Standard Nodes:**
- ✅ Workflow steps (human tasks)
- ✅ Conditional logic/branching
- ✅ Parallel branches
- ✅ Goto functions
- ✅ Connected processes (subprocesses)
- ✅ Forms
- ✅ SLA tracking

**AI Features:**
- ✅ AI step suggestion
- ✅ AI step creation assistance

### Properties/Configuration for Non-Technical Users

**Target Users:**
- Business users who need intuitive workflows without IT support
- Process owners streamlining operations
- Organizations automating simple to complex processes

**User Experience:**
- Three-part layout (navigation, canvas, properties panel)
- Drag-and-drop functionality
- Field validation and predefined templates
- AI assistance for step discovery

---

## 4. Appian

### Standard Shapes/Steps Business Users See

**Two Design Views:**

**1. Process Analyst View** (Business User Friendly):
- Flowchart tools with standard activities, events, and gateways
- Limited configuration options
- Designed for high-level diagram drafting

**2. Process Designer View** (Advanced):
- Advanced configuration options
- Process model publishing capabilities

**Node Categories:**

**Workflow Nodes:**
- **Human Tasks**: Assigning work to users or groups
- **Activities**: Capturing and processing business data
  - Script Tasks
  - Subprocesses
- **Events**: Starting, stopping, or continuing workflows
  - Timer Events
  - End Events
- **Gateways**: Workflow control (exclusive, parallel, inclusive, event-based)

**Smart Services:**
- Specialized business services integration
- Examples: Sending emails, writing data to databases, calling web services

### Handling "Action" vs "AI Action" Confusion

**Clear Separation:**
- ✅ **Workflow Nodes** vs **Smart Services** - distinct categories
- Workflow nodes handle human tasks and workflow control
- Smart services handle system integrations and business services
- Both share common configuration properties but serve different purposes

**AI Integration:**
- AI-assisted development suggestions available
- Smart service search bar for quick node discovery
- AI helps users find appropriate nodes rather than being a separate action type

### Essential Node Types

**Workflow Nodes:**
- ✅ Human Tasks
- ✅ Script Tasks
- ✅ Subprocesses
- ✅ Events (Timer, Start, End)
- ✅ Gateways (Exclusive, Parallel, Inclusive, Event-based)

**Smart Services:**
- ✅ Email sending
- ✅ Database operations
- ✅ Web service calls
- ✅ Other business service integrations

**Additional Features:**
- ✅ AI-assisted development suggestions
- ✅ Smart service search

### Properties/Configuration for Non-Technical Users

**Shared Configuration Properties:**

**General Tab** (all activities):
- Name and Description
- Task Display Name (for user task queues)
- Default Task Priority
- Quick Task settings
- Persistent ID (for certain events)
- End Condition (for end events)
- Activity Chaining (for start events)

**Data Tab** (most activities):
- Node Inputs: Define activity class parameters
  - Name, Type, Multiple values support, default Value, Required status
- Node Outputs: Configure output parameters

**Business User Experience:**
- Process Analyst View hides complexity
- Form-based configuration dialogs
- Clear separation between workflow control and system integration
- AI assistance for node discovery

---

## 5. Camunda / Flowable (BPMN Standard)

### Standard Shapes/Steps Business Users See

**BPMN 2.0 Core Flow Objects:**

**Events** (circles):
- **Start Events**: Process initiation
- **Intermediate Events**: Things that happen during process
  - Catching (waiting for trigger)
  - Throwing (firing trigger)
- **End Events**: Process completion

**Activities** (rectangles):
- **Tasks**: Service Task, User Task, Script Task, Business Rule Task, Manual Task, Receive Task, Send Task
- **Subprocesses**: Embedded Subprocess, Transaction Subprocess, Event Subprocess
- **Call Activities**: Reusable process references

**Gateways** (diamonds):
- **Exclusive (XOR)**: Single path selection
- **Parallel (AND)**: All paths execute
- **Inclusive (OR)**: One or more paths
- **Event-based**: Conditional branching based on events

**Supporting Elements:**
- **Participants**: Pool and Lane (organize process participants)
- **Data**: DataObject and DataStore
- **Artifacts**: TextAnnotation and Group

### Handling "Action" vs "AI Action" Confusion

**BPMN Approach:**
- BPMN is a formal standard, not specifically designed for AI distinction
- AI capabilities would typically be implemented as:
  - **Service Tasks** (for AI service calls)
  - **Business Rule Tasks** (for AI decision logic)
  - Custom extensions (marked with namespace prefixes)

**Business User Considerations:**
- Simplified modeling canvas introduced to reduce complexity
- Design mode for business users hides technical elements
- Focus on process modeling without complex development tools

### Essential Node Types

**Core BPMN Elements:**
- ✅ Start Events (multiple types)
- ✅ End Events (multiple types)
- ✅ Intermediate Events (Message, Timer, Error, Conditional, Signal, Escalation, Termination, Compensation, Cancel, Link, Multiple, Parallel)
- ✅ Tasks (Service, User, Script, Business Rule, Manual, Receive, Send)
- ✅ Subprocesses (Embedded, Transaction, Event)
- ✅ Gateways (Exclusive, Parallel, Inclusive, Event-based)
- ✅ Participants (Pool, Lane)
- ✅ Data (DataObject, DataStore)
- ✅ Artifacts (TextAnnotation, Group)

**Camunda-Specific Enhancements:**
- ✅ Simplified modeling canvas (2024 update)
- ✅ Design mode for business users
- ✅ Contextual actions and hover-over guidance
- ✅ Quick access icons (e.g., "Link form" on user tasks)

### Properties/Configuration for Non-Technical Users

**Simplified Modeling Canvas Features:**
- ✅ Cleaner, more intuitive UI with familiar UX patterns
- ✅ Hover-over guidance for correct decisions
- ✅ Contextual actions focused on common operations
- ✅ Quick access icons for faster modeling

**Design Mode for Business Users:**
- ✅ Reduced properties panel (documentation and comments only)
- ✅ Hides technical elements (deployment triggers, instance controls)
- ✅ Disables linting and problem annotations
- ✅ Focus on process modeling without development complexity

**Business User Experience:**
- Visual drag-and-drop interface
- Common visual language for business and IT alignment
- Simplified node types reduce cognitive load

---

## Comparative Analysis: Key Insights

### 1. Standard Shapes/Steps Across Platforms

**Common Patterns:**
- ✅ **Triggers/Start Events**: All platforms have clear initiation points
- ✅ **Actions/Tasks**: Core automation steps
- ✅ **Conditions/Gateways**: Branching logic
- ✅ **Approvals/Human Tasks**: Human-in-the-loop steps
- ✅ **Loops/Iteration**: Most platforms support (except simpler ones like Zapier)
- ✅ **Subprocesses**: Reusable process components

**Platform-Specific Additions:**
- **Power Automate**: Extensive connector library (100+ categories)
- **Appian**: Clear Workflow Nodes vs Smart Services distinction
- **Camunda**: Full BPMN 2.0 standard compliance
- **Kissflow**: AI step suggestion integrated into builder

### 2. Handling "Action" vs "AI Action" Confusion

**Best Practices Identified:**

**Microsoft Power Automate** (Best Practice):
- ✅ **Dedicated "AI Capabilities" section** in action pane
- ✅ Clear visual separation
- ✅ AI Builder as distinct category with own branding
- ✅ Point-and-click interface for AI actions

**Appian** (Alternative Approach):
- ✅ **Workflow Nodes** vs **Smart Services** distinction
- ✅ Different purposes (human tasks vs system integration)
- ✅ AI assists discovery rather than being separate action type

**Kissflow** (Integrated Approach):
- ✅ AI suggests and creates steps
- ✅ AI as helper/enhancer, not separate category

**Camunda/BPMN** (Standard-Based):
- ✅ AI implemented as Service Tasks or Business Rule Tasks
- ✅ Custom extensions for AI capabilities

**Recommendation for AgentForge:**
- Consider Power Automate's approach: **Dedicated AI section** in the visual builder
- Clear visual distinction (icon, color, category)
- Separate "AI Actions" palette from regular "Actions"
- Business-friendly naming (e.g., "AI Actions" vs "Automation Actions")

### 3. Essential Node Types We Might Be Missing

**Common Node Types Across Platforms:**

**Approval/Decision Nodes:**
- ✅ **Approval Steps** (ServiceNow, Power Automate)
- ✅ **Human Tasks** (Appian, Camunda)
- ✅ **Decision/Gateway Nodes** (All platforms)
- ✅ **Multi-approver patterns** (ServiceNow: Any, All, Percentage, Number)

**Data Handling:**
- ✅ **Variables/Data Objects** (All platforms)
- ✅ **Data Transformation** (Power Automate, Appian)
- ✅ **Data Validation** (Kissflow forms)

**Error Handling:**
- ✅ **Error Events** (Camunda/BPMN)
- ✅ **Try-Catch patterns** (Power Automate)
- ✅ **Retry logic** (Most platforms)

**Timing:**
- ✅ **Timer Events** (Camunda, Appian)
- ✅ **SLA Tracking** (Kissflow)
- ✅ **Scheduled Triggers** (Power Automate)

**Integration:**
- ✅ **Subprocesses/Call Activities** (All platforms)
- ✅ **Web Service Calls** (Appian Smart Services)
- ✅ **Database Operations** (Power Automate, Appian)

**Potential Gaps to Consider:**
- ⚠️ **Explicit Error Handling Nodes**: Visual error handling steps
- ⚠️ **SLA/Timer Nodes**: Visual SLA tracking and timer configuration
- ⚠️ **Data Transformation Nodes**: Visual data mapping/transformation
- ⚠️ **Multi-approver Patterns**: Visual configuration for approval rules (Any, All, Percentage)

### 4. Properties/Configuration for Non-Technical Users

**Best Practices Identified:**

**Visual Organization:**
- ✅ **Categorized Action Panes** (Power Automate: Favorites, AI, Built-in, By Connector)
- ✅ **Two-Tier Views** (Appian: Process Analyst vs Process Designer)
- ✅ **Simplified Design Mode** (Camunda: Reduced properties panel)

**Configuration Approach:**
- ✅ **Form-Based Properties**: Simple input fields, not JSON/technical syntax
- ✅ **Required vs Optional**: Clear visual distinction
- ✅ **Contextual Help**: Hover-over guidance, tooltips
- ✅ **Templates**: Pre-configured patterns

**User Experience:**
- ✅ **Drag-and-Drop**: Visual canvas interaction
- ✅ **Favorites/Bookmarks**: Quick access to frequently used actions
- ✅ **AI Assistance**: Step suggestion and creation help
- ✅ **Visual Feedback**: Clear indication of required fields, errors

**Recommendations for AgentForge:**
1. **Separate Configuration Views**: 
   - "Simple View" (business users): Name, Description, Key settings only
   - "Advanced View" (power users): All configuration options

2. **Form-Based Properties Panel**:
   - Never show raw JSON or object dumps
   - Use `_format_value_for_display` (already in rules)
   - Clear labels, help text, validation messages

3. **Visual Organization**:
   - Categorize actions clearly (AI Actions vs Regular Actions)
   - Favorites/bookmarks system
   - Search/filter capabilities

4. **Contextual Guidance**:
   - Hover-over help text
   - Pre-flight checks (already mentioned in rules)
   - Suggested next steps

---

## Key Takeaways for AgentForge

### 1. Action vs AI Action Clarity
- **Power Automate's approach is best**: Dedicated "AI Capabilities" section
- Clear visual separation (icon, color, category)
- Business-friendly naming

### 2. Essential Node Types
- **Approval Nodes**: Multi-approver patterns (Any, All, Percentage, Number)
- **Error Handling**: Visual error handling steps
- **SLA/Timer**: Visual SLA tracking and timer configuration
- **Data Transformation**: Visual data mapping nodes

### 3. Business User Configuration
- **Two-Tier Views**: Simple vs Advanced configuration
- **Form-Based**: Never raw JSON, always formatted display
- **Visual Organization**: Categories, favorites, search
- **Contextual Help**: Hover guidance, pre-flight checks

### 4. Platform Philosophy Alignment
- **No-Code First**: UI/UX never displays raw JSON (already in rules ✅)
- **Identity-Aware**: Dynamic routing and context (already implemented ✅)
- **Zero Hardcoding**: Generic engine (already in rules ✅)
- **Business-Friendly**: Self-healing, plain language errors (already in rules ✅)

---

## References

1. Microsoft Power Automate Documentation
2. ServiceNow Flow Designer Documentation
3. Kissflow Process Builder Documentation
4. Appian Process Modeling Documentation
5. Camunda BPMN 2.0 Reference
6. Flowable Open Source Documentation

---

**Document Status:** Research Complete  
**Next Steps:** Review against current AgentForge implementation and identify specific improvements
