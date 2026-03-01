# Process Builder Knowledge Base — Dropdown Options & Taxonomies (v5)

This document defines rules for when and how to use dropdown (select) fields in workflows.

## Core Principle: Smart Dropdowns

The LLM is an intelligent assistant with deep business and industry knowledge.
When generating a process, dropdown fields should provide **useful, meaningful options**
that make the user's life easier — not empty or overly generic lists.

## Option Sources (in order of priority)

1. **User-provided options** — If the user explicitly lists the options in their prompt, use those exact options.
2. **Organization's configured tools** — If a tool provides a list of valid options, use `optionsSource: "tool:<toolId>"`.
3. **Organization's taxonomy configuration** — If the platform has a taxonomy configured, use `optionsSource: "taxonomy:<taxonomyId>"`.
4. **LLM's business/industry knowledge** — For industry-standard or universally understood categories, the LLM MUST generate a comprehensive and practical list of options using its own expertise. This is the DEFAULT behavior.

## When to Use a Dropdown vs. Free Text

| Scenario | Use |
|----------|-----|
| Options explicitly provided by the user | `select` with those options |
| Options come from a configured tool | `select` with `optionsSource: "tool:<id>"` |
| Options come from a configured taxonomy | `select` with `optionsSource: "taxonomy:<id>"` |
| Field has standard/industry options the LLM can infer | `select` — LLM populates |
| Truly unique to the organization AND cannot be inferred | `text` field |
| Person's name, free-form description, or unique identifier | `text` field |

## Standard Taxonomy Reference

The LLM should confidently populate dropdown options for any industry-standard or universally understood category. Below is a **non-exhaustive** reference organized by common business areas. **The platform supports ANY domain** — healthcare, legal, government, education, manufacturing, logistics, retail, energy, or any other industry. If the user's process belongs to a domain not listed here, the LLM MUST use its own expertise to generate equally comprehensive and relevant options for that domain.

### HR & People

| Category | Options |
|----------|---------|
| **Leave Types** | Annual Leave, Sick Leave, Personal Leave, Maternity Leave, Paternity Leave, Bereavement Leave, Marriage Leave, Study/Exam Leave, Unpaid Leave, Hajj Leave, Compensatory Leave, Other |
| **Employment Status** | Full-time, Part-time, Contract, Temporary, Intern, Probation |
| **Performance Rating** | Outstanding, Exceeds Expectations, Meets Expectations, Needs Improvement, Unsatisfactory |
| **Training Category** | Technical, Leadership, Compliance, Soft Skills, Safety, Certification, Onboarding |
| **Separation Reason** | Resignation, Termination, Retirement, End of Contract, Transfer, Redundancy, Other |
| **Shift Type** | Day Shift, Night Shift, Morning Shift, Evening Shift, Rotating, Flexible |

### Finance & Procurement

| Category | Options |
|----------|---------|
| **Expense Categories** | Travel, Meals & Entertainment, Office Supplies, Software & Subscriptions, Transportation, Accommodation, Training & Education, Communication, Equipment, Professional Services, Marketing, Utilities, Other |
| **Payment Methods** | Cash, Credit Card, Debit Card, Bank Transfer, Company Card, Petty Cash, Check, Wire Transfer, Digital Wallet, Other |
| **Currencies** | USD, EUR, GBP, AED, SAR, EGP, QAR, BHD, KWD, OMR, JOD, INR, CNY, JPY, CAD, AUD, CHF, SGD, MYR, Other |
| **Budget Category** | Operating, Capital, Project, Contingency, Research & Development |
| **Invoice Status** | Draft, Pending Approval, Approved, Sent, Partially Paid, Paid, Overdue, Disputed, Cancelled |
| **Purchase Type** | Goods, Services, Software License, Subscription, Maintenance, Consulting, Other |
| **Vendor Rating** | Preferred, Approved, Conditional, Probationary, Blocked |

### IT & Support

| Category | Options |
|----------|---------|
| **Ticket Priority** | Critical, High, Medium, Low |
| **Ticket Category** | Hardware, Software, Network, Access/Permissions, Email, Phone/VoIP, Printer, Security, Data Recovery, Other |
| **Change Type** | Standard, Normal, Emergency, Major |
| **Environment** | Production, Staging, Development, Testing, UAT |
| **Asset Type** | Laptop, Desktop, Monitor, Phone, Tablet, Server, Printer, Network Equipment, Software License, Peripheral, Other |
| **Access Level** | Read Only, Read/Write, Admin, Full Access, Custom |

### Operations & Project Management

| Category | Options |
|----------|---------|
| **Priority** | Critical, High, Medium, Low |
| **Urgency / SLA** | Immediate, Within 4 Hours, Within 24 Hours, Within 3 Days, Within a Week, No Rush |
| **Status** | Not Started, In Progress, On Hold, Under Review, Completed, Cancelled |
| **Risk Level** | Critical, High, Medium, Low, Negligible |
| **Impact Level** | Critical, Major, Moderate, Minor, Negligible |
| **Project Phase** | Initiation, Planning, Execution, Monitoring, Closing |

### General Business

| Category | Options |
|----------|---------|
| **Document Types** | Invoice, Receipt, Contract, Report, Proposal, Certificate, Policy, Memo, Letter, Form, Presentation, Other |
| **Approval Outcome** | Approved, Rejected, Approved with Conditions, Escalated, Request More Information |
| **Satisfaction Rating** | Very Satisfied, Satisfied, Neutral, Dissatisfied, Very Dissatisfied |
| **Frequency** | Daily, Weekly, Bi-weekly, Monthly, Quarterly, Semi-annually, Annually, Ad-hoc |
| **Communication Channel** | Email, Phone, Video Call, In-Person, Chat, Letter |
| **Compliance Category** | Regulatory, Internal Policy, ISO, SOX, GDPR, HIPAA, PCI-DSS, Industry Standard, Other |
| **Region** | Based on context — use geographic regions relevant to the organization |

### Facilities & Administration

| Category | Options |
|----------|---------|
| **Request Type** | Room Booking, Maintenance, Cleaning, Supplies, Parking, Security, Catering, Moving/Setup, Other |
| **Room Type** | Meeting Room, Conference Room, Training Room, Auditorium, Office, Lab, Workshop |
| **Building Area** | Reception, Office Floor, Warehouse, Cafeteria, Parking, Server Room, Common Area, Other |
| **Maintenance Priority** | Emergency, Urgent, Routine, Preventive |

### Other Domains (examples — not exhaustive)

The platform is domain-agnostic. When the user's process belongs to a domain not covered above, the LLM generates options using its own expertise. Examples:

| Domain | Example Categories |
|--------|--------------------|
| **Healthcare** | Visit Type (Outpatient, Inpatient, Emergency, Telemedicine), Triage Level (Resuscitation, Emergent, Urgent, Less Urgent, Non-Urgent), Specialty, Diagnosis Code Group |
| **Legal** | Case Type (Civil, Criminal, Commercial, Family, Administrative), Court Level, Document Category (Pleading, Evidence, Contract, Opinion, Filing) |
| **Government** | Service Channel (In-Person, Online, Phone, Mobile App), Citizen Request Type, Permit Category, Inspection Result |
| **Education** | Program Level (Undergraduate, Graduate, Diploma, Certificate), Assessment Type, Course Category, Student Status |
| **Manufacturing** | Defect Type, Inspection Stage, Product Line, Quality Grade, Batch Status |
| **Logistics** | Shipment Status, Transport Mode (Air, Sea, Road, Rail), Warehouse Zone, Customs Status |

## Anti-Hallucination Rules

- NEVER invent **organization-specific** lists (specific department names, employee names, internal product catalogs, internal project codes, or customer-specific data unique to one company).
- If the user mentions specific options, use those EXACT options — do not add or remove.
- For industry-standard categories (the tables above and similar), the LLM IS the expert and SHOULD generate comprehensive lists. This is NOT hallucination — this is applied knowledge.
- When a field is truly about organization-specific data (e.g., "which internal project?", "which client name?"), use a `text` field or `optionsSource` from a tool/taxonomy.
- **Universal/industry knowledge = LLM generates options** vs. **Organization-specific data = text field or tool/taxonomy source**.
- When generating options, include "Other" as the last option when the list might not be exhaustive.
- Adapt options to the organization's region/industry when context is available (e.g., include regional currencies, local leave types).
