# Process Builder Knowledge Base — Document & Image Handling (v2)

Workflows may need to collect, read, or generate documents and images.

## Collecting Files (Input)

Use a `file` field in the Start form (trigger):
```json
{
  "name": "uploadedFile",
  "label": "Attach File",
  "type": "file",
  "required": false,
  "placeholder": "Upload a file or image"
}
```

The platform accepts ANY file type. There is no limitation on file formats.

## Extracting Content from Files

If a workflow needs to process the content of an uploaded file (e.g., analyze a document,
extract data from an image, read a spreadsheet), add an **Action** node AFTER the trigger:

1. Set `actionType: "extractDocumentText"`
2. Set `sourceField` to the file field name (e.g., `"uploadedFile"`)
3. Set `output_variable` to store the extracted content (e.g., `"fileContent"`)

Then reference the extracted content in subsequent AI steps: `{{fileContent}}`

### Supported File Types

The platform handles file extraction with NO hardcoded format limitations:

- **Documents**: PDF, Word (docx/doc), text files, markdown, HTML, XML, and any text-based format.
- **Spreadsheets**: Excel (xlsx/xls), CSV — extracted as structured text with rows and columns.
- **Presentations**: PowerPoint (pptx/ppt) — extracted slide by slide.
- **Images**: PNG, JPG, GIF, WebP, BMP, TIFF, HEIC, and any image format — extracted via LLM vision/OCR.
  The LLM reads the image and extracts all visible text, data, tables, forms, and information.
- **Code files**: Python, JavaScript, Java, SQL, and any programming language — read as text.
- **Any other text-readable file**: The engine attempts to read it as text automatically.

The only limitation is the LLM's own capability for a given format, not a hardcoded list.

### Image OCR / Vision

When an uploaded file is an image (receipt, invoice, form, ID card, screenshot, photo of a document, etc.),
the platform uses the LLM's vision capability to extract content. This means:
- Handwritten text can be read (OCR).
- Tables and forms in images are extracted as structured data.
- Charts and diagrams are described.
- Any visible text, numbers, or data is captured.

## Generating Documents (Output)

Use an **Action** node with `actionType: "generateDocument"`.

Properties:
- Document title/name
- Document format (any supported output format)
- Content instructions (what to include)
- Data sources (which workflow variables to reference)

## Data Flow Pattern: Upload → Extract → AI Parse → Use

When workflows involve document/image uploads, follow this pattern:

1. **Trigger form**: Collect file(s) via `file` field
2. **Action node**: `extractDocumentText` extracts raw text/data from the file (OCR for images)
3. **AI node**: Parse the raw extracted text into structured data (JSON with specific fields)
4. **Condition/Approval/Notification nodes**: Use the parsed structured data for routing, decisions, and notifications

This ensures the AI can process any type of document or image and extract exactly what the workflow needs.

## Anti-Hallucination Rules

### Process Design Rules
- AI steps CANNOT read raw file uploads directly — always use `extractDocumentText` first.
- Do NOT limit file types in the process design — the platform handles any format.
- File fields should be optional unless the business requirement explicitly demands a file.
- Do NOT hardcode what data to extract — let the AI determine it based on the workflow's purpose.

### AI Parsing Rules (CRITICAL — Prevents Incorrect Data)
- When the AI step parses extracted text into structured JSON, it MUST **only use values that appear in the actual extracted text**.
- NEVER fabricate amounts, dates, vendor names, or any data — extract them verbatim from the source.
- When multiple files are uploaded, the extracted text contains ALL files separated by `--- File: <name> ---` headers. The AI MUST process data from **every file**, not just the first.
- Numeric totals MUST be calculated from the **actual numbers** in the extracted text, not estimated or invented.
- If a requested field cannot be determined from the extracted text, return `null` — NEVER guess.
- The `details` or `summary` field MUST reference **specific data points** from the extraction (e.g., "Parking: 100 AED, Flight: 1500 AED, Total: 1600 AED"), NEVER generic descriptions like "Extracted data from receipts".

### Error Handling Rules
- If file extraction fails (file not found, empty, corrupted), the workflow MUST stop and report the actual error — not silently continue with empty data.
- If the AI step receives empty or garbled input, it MUST report that parsing failed rather than producing hallucinated output.
- Downstream steps (conditions, notifications) that depend on parsed data will receive clear errors if the data is missing, with business-friendly explanations.
