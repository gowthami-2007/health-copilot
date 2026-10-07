# Health Copilot — Test Suite Directory

Comprehensive automated test suites for Health Copilot.

## Test Organization
- `backend/`: Authentication, data isolation, documents, medications, appointments, and dashboard tests.
- `ai/`: RAG vector search, summarization, and healthcare safety guardrails.
- `documents/`: Extraction, chunking, and file validation tests.
- `integration/`: End-to-end upload-to-summary pipeline and RAG chat flow tests.
- `frontend/`: Unit tests for auth, dashboard metrics, document filtering, and AI prompt formats.

## Running Tests
Run all test suites across the repository:
```bash
node scripts/runAllTests.js
```
Total: **52 passing tests across 18 test suites**.
