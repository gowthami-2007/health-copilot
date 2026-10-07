# Document Processing Pipeline

## Supported File Formats
- Portable Document Format (`.pdf`)
- JPEG Images (`.jpg`, `.jpeg`)
- PNG Images (`.png`)
- Maximum file size: Configurable via `MAX_FILE_SIZE` (Default: 10MB)

## Processing Lifecycle
```
User Selection
     ↓
Frontend MIME & Size Validation
     ↓
Multipart Upload to Backend (/api/documents)
     ↓
Multer Disk Storage with Unique Timestamp Slug
     ↓
Creation of Document Record (status: UPLOADED)
     ↓
Document Processing Worker:
     ├── Status updated to: PROCESSING
     ├── Text Extraction (pdf-parse / textExtractor)
     ├── Text Cleaning & Normalization (textCleaner)
     ├── Overlapping Chunking (chunkService: 800-char chunks, 150-char overlap)
     ├── AI Structured Extraction (overview, key values, questions)
     └── Status updated to: PROCESSED (or FAILED if unreadable)
     ↓
Automatic Chronological Event Logging into Health Timeline
```

## Failure Handling
In accordance with Section 39:
- If a document is corrupt, password-protected, or unreadable, the system marks the document status as `FAILED`.
- Sets `failureReason = "We couldn't extract readable text from this document."`
- The system never fabricates clinical information from an unreadable document.
