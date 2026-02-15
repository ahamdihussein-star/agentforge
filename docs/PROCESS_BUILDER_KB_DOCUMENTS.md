# Process Builder Knowledge Base — Document & Image Handling (v3)

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

For multiple file uploads (receipts, attachments, etc.), add `"multiple": true`.

## Extracting Content from Files

Use a **Read Document** (`read_document`) node after the trigger:

1. Set `sourceField` to the file field name (e.g., `"uploadedFile"`)
2. Set `output_variable` to store the extracted content (e.g., `"extractedData"`)
3. Optionally set `dataLabel` for a friendly name (auto-generated from source field if empty)

Then reference the extracted content in subsequent AI steps: `{{extractedData}}`

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

Use a **Create Document** (`create_document`) node:

- `title` (string): Document title
- `format` (string): `docx` | `pdf` | `xlsx` | `pptx` | `txt`
- `instructions` (string): What should be in the document (can use `{{fieldName}}` references)
- `output_variable` (string): Store the document reference for later steps

## Data Flow Pattern: Upload → Read Document → AI Parse → Use

When workflows involve document/image uploads, follow this pattern:

1. **Start form**: Collect file(s) via `file` field (with `multiple: true` for multiple uploads)
2. **Read Document** (`read_document`): Extracts raw text/data from the file (OCR for images)
3. **AI Step** (`ai`): Parse the raw extracted text into structured data (JSON with specific fields)
   - Reference the extracted text: `{{extractedData}}`
   - Define `outputFields` for all data the AI will produce
   - Set `output_format: "json"` and low `creativity` (1-2)
4. **Downstream steps**: Use the parsed structured data for routing, decisions, notifications
   - All `outputFields` from the AI step appear as selectable chips in downstream steps

### Multi-File Pattern

When the file field has `multiple: true`:
- Read Document processes ALL uploaded files
- Extracted text has `--- File: <name> ---` headers separating each file
- The AI step MUST parse ALL files and return an `items` array + aggregate fields

## Anti-Hallucination Rules

### Process Design Rules
- AI steps CANNOT read raw file uploads directly — ALWAYS use Read Document first.
- Do NOT limit file types in the process design — the platform handles any format.
- File fields should be optional unless the business requirement explicitly demands a file.
- Do NOT hardcode what data to extract — let the AI determine it based on the workflow's purpose.

### AI Parsing Rules (CRITICAL — Prevents Incorrect Data)
- When the AI step parses extracted text into structured JSON, it MUST **only use values that appear in the actual extracted text**.
- NEVER fabricate amounts, dates, vendor names, or any data — extract them verbatim from the source.
- When multiple files are uploaded, the extracted text contains ALL files separated by `--- File: <name> ---` headers. The AI MUST process data from **every file**, not just the first.
- Numeric totals MUST be calculated from the **actual numbers** in the extracted text, not estimated or invented.
- If a requested field cannot be determined from the extracted text, return `null` — NEVER guess.

### Error Handling Rules
- If file extraction fails (file not found, empty, corrupted), the workflow MUST stop and report the actual error — not silently continue with empty data.
- If the AI step receives empty or garbled input, it MUST report that parsing failed rather than producing hallucinated output.
