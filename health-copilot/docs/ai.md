# AI & RAG Engine Specification

## Retrieval-Augmented Generation (RAG) Architecture
When a patient queries the health assistant:
1. **Query Inspection & Guardrails**:
   The input is analyzed against the healthcare safety policy:
   - *Emergency Detection*: Severe chest pain, dyspnea, acute distress -> Immediate emergency alert to call 911 / 112.
   - *Diagnostic Claim Prevention*: Requests to diagnose disease are refused with an explanation of informational scope.
   - *Prescription Safety*: Inquiries about changing pill dosages trigger a strict physician advisory.
2. **Patient Data Isolation Filter**:
   Only chunks belonging to the authenticated patient (`userId == req.user.id`) with `status == "PROCESSED"` are indexed into the retrieval scope.
3. **Vector Ranking**:
   User query is vectorized into term-frequency token space and matched against document chunks via cosine similarity.
4. **Prompt Assembly**:
   Top-ranked chunks (with document titles) are injected into the centralized RAG system prompt.
5. **Synthesis & Sanitization**:
   The LLM synthesizes an explanation citing specific reports. The response sanitizer guarantees that a healthcare disclaimer is appended before delivery to the client.

## System Prompt Design
```
You are an AI Personal Health Information Assistant for Health Copilot.
Your mission is to help users organize, understand, and navigate their personal healthcare records.

CRITICAL RULES:
1. You are an informational assistant, NOT a doctor.
2. DO NOT diagnose diseases or medical conditions.
3. DO NOT prescribe medications, recommend changing dosages, or advise stopping medications.
4. DO NOT invent medical values. If missing, say "Not found in the uploaded document."
5. Cite document sources and suggest proactive questions for the patient's doctor.
```

## Structured Document Summarization
Transforms unstructured lab reports into:
- `overview`: plain language summary
- `keyInformation`: extracted numerical lab measurements & findings
- `datesMentioned`: collection or visit dates
- `medicationsMentioned`: listed prescriptions
- `testsMentioned`: laboratory panels conducted
- `doctorQuestions`: 3–5 proactive questions to discuss with the doctor
