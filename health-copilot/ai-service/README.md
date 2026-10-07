# Health Copilot — AI & RAG Microservice

Autonomous AI service providing document summarization, retrieval-augmented generation (RAG), and healthcare safety guardrails.

## Scripts
- `npm run dev`: Runs AI service server on port 5001.
- `npm test`: Runs AI and RAG test suites.

## Features
- OpenAI-compatible LLM client with local deterministic heuristic fallback engine.
- Term-frequency cosine similarity vector retriever over document chunks.
- Healthcare safety guardrails: detects emergency conditions and prevents direct diagnostic claims.
- Structured medical JSON summarizer with doctor discussion prompts.
