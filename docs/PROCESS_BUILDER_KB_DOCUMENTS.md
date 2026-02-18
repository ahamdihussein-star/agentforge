# Process Builder Knowledge Base — Document & Image Handling (v5)

Workflows may need to collect, read, analyze, or generate documents and images.

## Collecting Files (Input)

Use a `file` field in the Collect Information form:
```json
{
  "name": "uploadedFile",
  "label": "Attach File",
  "type": "file",
  "required": false,
  "placeholder": "Upload a file or image",
  "multiple": true
}
```

The platform accepts ANY file type. There is no limitation on file formats.
For multiple file uploads (receipts, attachments, etc.), add `"multiple": true`. When in doubt, default to `multiple: true`.

## Extracting Content from Files

Use an **AI Step** (`ai`) with `aiMode: "extract_file"`:

1. Set `sourceField` to the file field name (e.g., `"uploadedFile"`)
2. Set `prompt` to describe what data to extract
3. Define `outputFields` with typed fields (e.g., `[{"label":"Total","name":"total","type":"currency"}]`)
4. Set `output_variable` to store the structured result (e.g., `"parsedData"`)
5. Set `creativity: 1` for strict data extraction
6. Add `instructions` for extraction rules (anti-hallucination, format requirements)

The platform automatically reads any file type and the AI extracts requested fields as structured data in one step.

### Supported File Types

The platform handles file extraction with NO hardcoded format limitations:

| Category | Formats | How It Works |
|----------|---------|-------------|
| **Documents** | PDF, Word (docx/doc), text, markdown, HTML, XML | Text extraction |
| **Spreadsheets** | Excel (xlsx/xls), CSV | Structured text with rows/columns |
| **Presentations** | PowerPoint (pptx/ppt) | Slide-by-slide extraction |
| **Images** | PNG, JPG, GIF, WebP, BMP, TIFF, HEIC, SVG | LLM vision / OCR |
| **Code files** | Python, JavaScript, Java, SQL, etc. | Read as text |
| **Any text file** | Any text-based format | Automatic text reading |

### Image OCR / Vision

When an uploaded file is an image (receipt, invoice, form, ID card, screenshot, photo of a document):
- Handwritten text can be read (OCR).
- Tables and forms in images are extracted as structured data.
- Charts and diagrams are described.
- Any visible text, numbers, or data is captured.

### Multi-File Upload Pattern

When the file field has `multiple: true`:
- The AI step processes ALL uploaded files automatically.
- Each file's content is separated by `--- File: <name> ---` headers.
- The AI MUST parse ALL files and return structured results (e.g., `items` array + aggregate fields).
- Include instructions like: `"Each file section is exactly ONE item — count carefully"`.

## Analyzing Across Multiple Files

Use an **AI Step** (`ai`) with `aiMode: "batch_files"` when you need cross-file calculations:

1. Set `sourceFields` to an array of file field names (e.g., `["invoices", "receipts"]`)
2. `prompt` describes what to calculate (e.g., "Sum all invoice totals, find the highest amount")
3. Define typed `outputFields` for results (e.g., `grandTotal: currency`, `highestAmount: currency`)
4. The engine reads ALL files from all selected fields and sends contents to the AI

**When to use `batch_files` vs `extract_file`:**

| Scenario | Mode |
|----------|------|
| Extract data from a single file or one multi-file field | `extract_file` |
| Calculations spanning multiple file fields | `batch_files` |
| Compare data across different documents | `batch_files` |
| Aggregate/summarize data from multiple sources | `batch_files` |
| Simple file parsing into structured data | `extract_file` |

## Generating Documents (Output)

Use an **AI Step** (`ai`) with `aiMode: "create_doc"`:

- `docTitle` (string): Document title.
- `docFormat` (string): `"docx"` | `"pdf"` | `"xlsx"` | `"pptx"` | `"txt"`.
- `prompt` (string): What should be in the document (can use `{{fieldName}}` references).
- `output_variable` (string): Store the document reference for later steps.

### Document Formats

| Format | Best For |
|--------|----------|
| `docx` | Reports, letters, memos, policies (default) |
| `pdf` | Formal documents, certificates, contracts |
| `xlsx` | Data tables, financial reports, calculations |
| `pptx` | Presentations, slide decks |
| `txt` | Simple text output, logs |

## Data Flow Patterns

### Pattern 1: Upload → Extract → Route → Notify
```
form (file upload) → AI extract_file → condition (route by data) → approval/notification
```

### Pattern 2: Upload → Extract → Calculate → Report
```
form (file upload) → AI extract_file → calculate (formula) → AI create_doc → notification
```

### Pattern 3: Multiple Files → Cross-File Analysis
```
form (multiple file uploads) → AI batch_files → condition → notification
```

### Pattern 4: Upload → Validate → Approve → Archive
```
form (file upload) → AI extract_file → condition (valid?) → approval → tool (archive to system)
```

### Pattern 5: Scheduled Data Collection → Report Generation
```
trigger (scheduled) → tool (fetch data) → AI analyze → AI create_doc → notification
```

## Anti-Hallucination Rules

### Process Design Rules
- Use AI Step with `aiMode: "extract_file"` to read files — it handles extraction and parsing in one step.
- Do NOT limit file types in the process design — the platform handles any format.
- File fields should be optional unless the business requirement explicitly demands a file.

### AI Parsing Rules (CRITICAL)
- AI MUST **only use values that appear in the actual extracted text**.
- NEVER fabricate amounts, dates, vendor names, or any data — extract verbatim.
- When multiple files are uploaded, process data from **every file**, not just the first.
- Numeric totals MUST be calculated from **actual numbers**, not estimated.
- If a field cannot be determined from extracted text, return `null` — NEVER guess.

### Error Handling
- If file extraction fails, report the actual error — do not continue with empty data.
- If AI receives empty or garbled input, report parsing failure rather than hallucinating output.
