# Process Builder Knowledge Base — Documents (Upload & Generate) (v1)
Workflows may need to **collect documents** and/or **generate documents** as outputs.

## Uploading documents (input)
Recommended UX: collect documents as part of the **Start form** using a field:
- `type: "file"`
- `label`: business-friendly (e.g., "Supporting Document")

Notes:
- File fields should be optional unless required by business policy.
- Store file metadata (name, size, type) in variables; the platform will later support uploading and storing files.

## Generating documents (output)
Use an **Action** node with:
- `actionType: "generateDocument"`

Supported formats (platform target):
- `docx`, `pdf`, `xlsx`, `pptx`, `txt`, `md`, `csv`, `json`, `html`

Recommended properties (business-friendly):
- Document title/name
- Document format (dropdown)
- Content instructions (what the document should contain)
- Data sources (which workflow variables to include)

Anti-hallucination:
- If a format is not supported, use `txt` as a safe fallback.

