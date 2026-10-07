# Health Copilot — Document Processing Service

Extraction, validation, cleaning, and text chunking engine for medical documents.

## Features
- PDF text extraction using `pdf-parse`.
- MIME type and file size validation (PDF, JPG, PNG).
- Text cleaning and whitespace normalization.
- Overlapping token chunking (800-char chunks, 150-char overlap) for RAG vector search.
- Graceful failure transitions for unreadable documents without fabricating hallucinated values.
