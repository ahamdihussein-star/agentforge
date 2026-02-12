# Process Builder Knowledge Base — Document Handling (v2)

Workflows may need to collect, read, or generate documents.

## Collecting Documents (Input)

Use a `file` field in the Start form (trigger):
```json
{
  "name": "uploadedDocument",
  "label": "Attach Document",
  "type": "file",
  "required": false,
  "placeholder": "Upload a file"
}
```

## Reading/Extracting Document Content

If a workflow needs to process the content of an uploaded document (e.g., AI analysis of a receipt,
contract review, extracting data from a report), add an **Action** node AFTER the trigger:

1. Set `actionType: "extractDocumentText"`
2. Set `sourceField` to the file field name (e.g., `"uploadedDocument"`)
3. Set `output_variable` to store the extracted text (e.g., `"documentText"`)

Then reference the extracted text in subsequent AI steps: `{{documentText}}`

**Important:** AI steps CANNOT read raw uploaded files directly. Always extract text first.

## Generating Documents (Output)

Use an **Action** node with `actionType: "generateDocument"`.

Supported formats: `docx`, `pdf`, `xlsx`, `pptx`, `txt`, `md`, `csv`, `json`, `html`

Properties:
- Document title/name
- Document format
- Content instructions (what to include)
- Data sources (which workflow variables to reference)

If a format is not supported, use `txt` as a safe fallback.

## Anti-Hallucination Rules
- Do NOT assume AI nodes can read raw file uploads — always use `extractDocumentText` first.
- Do NOT invent document formats not listed above.
- File fields should be optional unless the business requirement explicitly demands a document.
