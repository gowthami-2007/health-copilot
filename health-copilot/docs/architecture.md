# System Architecture & Technical Design

## Overview
**Health Copilot** is a full-stack, AI-powered healthcare management web application built with a modern MERN-style architecture coupled with an autonomous AI and Document Processing microservice pipeline.

```
                    +---------------------------+
                    |   React / Vite Frontend   |
                    |  (HTML5 / Vanilla CSS)    |
                    +-------------+-------------+
                                  | REST / JSON
                                  v
                    +---------------------------+
                    |   Express Backend API     |
                    |     (Port 5000)           |
                    +-------+-----------+-------+
                            |           |
            +---------------+           +---------------+
            |                                           |
            v                                           v
+-----------------------+                   +-----------------------+
|  MongoDB Database     |                   |   AI / RAG Service    |
|   (Port 27017)        |                   |      (Port 5001)      |
+-----------------------+                   +-----------+-----------+
                                                        |
                                                        v
                                            +-----------------------+
                                            | OpenAI-compatible LLM |
                                            | & Vector Similarity   |
                                            +-----------------------+
```

## Architectural Highlights
1. **Frontend Layer (Vite + React)**:
   - Component-driven modular architecture.
   - Design system written with pure Vanilla CSS tokens, glassmorphism, responsive navigation, and accessible clinical healthcare styling.
   - Axios client with automatic Bearer token interceptor, centralized error handling, and session persistence.

2. **Backend API Gateway (Node.js + Express)**:
   - Thin controllers with fat business services (`authService`, `documentService`, `medicationService`, `appointmentService`, `timelineService`, `dashboardService`, `aiChatService`).
   - Centralized error handling (`AppError` hierarchy) and standardized JSON envelope format (`successResponse`, `errorResponse`).
   - High security defaults: Helmet HTTP headers, CORS whitelisting, rate limiting (`express-rate-limit`), and Multer file validation.

3. **AI & RAG Service**:
   - Extraction of text and chunks (500–1000 characters with 150-char overlap).
   - In-memory TF-IDF / term-frequency cosine vector retrieval engine (no third-party vector SaaS required for offline or local execution).
   - OpenAI-compatible LLM client with local deterministic heuristic fallback engine.
   - Multi-tier safety guardrails: emergency query interception, non-diagnostic policy enforcement, and mandatory medical disclaimers.

4. **Document Processing Service**:
   - `pdf-parse` extraction for PDF documents.
   - Text sanitizer and normalizer.
   - OCR raster validation and file integrity validator.
