# System Architecture & Technical Design: HealthCopilot Personal Vault

## 1. System Overview
**HealthCopilot Personal Vault** is an AI-powered personal health data platform built with the MERN stack (MongoDB, Express.js, React, Node.js) featuring end-to-end medical document intelligence, OCR, bilingual summaries (English and Telugu), FHIR R4 interoperability, ABDM/ABHA sandbox readiness, and user-isolated zero-trust security.

---

## 2. Comprehensive System Architecture Diagram (Mermaid)

```mermaid
flowchart TB
    %% Subgraphs for trust boundaries
    subgraph ClientPerimeter [" Patient Client Perimeter (Browser) "]
        UI["React 18 / Vite SPA\n(Vanilla CSS Design System)"]
        subgraph UIPages ["Frontend Views"]
            Dashboard["Dashboard\n(Real Stats & Lab Observations)"]
            DocVault["Document Vault\n(Upload, Preview, OCR, Review)"]
            ChatUI["AI Health Assistant\n(Bilingual, Multimodal & Camera)"]
            ProfileUI["Profile & ABDM\n(English/Telugu & Mock ABHA)"]
            TimelineUI["Health Timeline\n(Deduplicated Chronological EHR)"]
            MedsUI["Medications\n(Verified Prescriptions)"]
        end
        UI --> UIPages
    end

    subgraph ApiPerimeter [" Express API Gateway Perimeter (Port 5000) "]
        AuthMW["JWT Authentication & Owner Authorization\n(Req.User & ID Validation)"]
        
        subgraph Controllers ["Controllers & Routes"]
            DocCtrl["Document Controller\n(/api/documents)"]
            ChatCtrl["AI Chat Controller\n(/api/ai)"]
            ProfileCtrl["Profile & ABHA Controller\n(/api/profile)"]
            DashCtrl["Dashboard Controller\n(/api/dashboard)"]
            MedCtrl["Medication Controller\n(/api/medications)"]
        end

        DocCtrl --> StorageService["Secure Storage Engine\n(User-Isolated uploads/{userId}/)"]
    end

    subgraph IntelligencePipeline [" Medical Intelligence & OCR Pipeline "]
        OCR["OCR & Text Extraction\n(Tesseract OCR + pdf-parse)"]
        Classifier["Document Classifier\n(Lab Report, Rx, Discharge, Notes)"]
        Extractor["Structured Clinical Extractor\n(Dictionary Engine + Heuristics)"]
        SummaryEngine["Bilingual Summary Engine\n(English & Telugu 6-Section Format)"]
        ReviewEngine["Validation & Review Engine\n(User Edit & Verify UI)"]
        FHIRMapper["HL7 FHIR R4 Mapper\n(Patient, DocRef, Obs, MedReq)"]
        ABHAMock["Mock ABDM / ABHA Gateway\n(Simulated Record Import)"]
    end

    subgraph LLMPerimeter [" AI / LLM Provider Layer "]
        LLMClient["Multimodal LLM Service\n(Gemini 2.5 / OpenAI Compatible)"]
        RAG["Authorized Record Retrieval\n(Patient-Isolated Vault Grounding)"]
        Guardrails["Safety & Trust Guardrails\n(Non-Diagnostic, Uncertainty Flags)"]
    end

    subgraph DataPerimeter [" Encrypted Database Perimeter "]
        MongoDB[(MongoDB Database)]
        subgraph Schemas ["Isolated Collections"]
            UserColl["Users (Mock ABHA, PreferredLang)"]
            DocColl["Documents (StructuredData, TeluguSummary)"]
            MedColl["Medications (Verified Prescriptions)"]
            TimeColl["Timeline (Deduplicated Chronology)"]
            ConvColl["Conversations & Messages (Isolated)"]
        end
        MongoDB --- Schemas
    end

    %% Data Flow Connections
    UIPages -->|Bearer JWT + HTTPS| AuthMW
    AuthMW --> DocCtrl & ChatCtrl & ProfileCtrl & DashCtrl & MedCtrl

    DocCtrl --> OCR --> Classifier --> Extractor --> ReviewEngine
    Extractor --> SummaryEngine
    ReviewEngine --> DocColl
    ReviewEngine --> MedColl
    DocCtrl --> FHIRMapper
    ProfileCtrl --> ABHAMock --> DocColl

    ChatCtrl --> RAG
    RAG -->|Read Authorized Records Only| DocColl & MedColl & TimeColl
    RAG --> Guardrails --> LLMClient

    DocCtrl & ProfileCtrl & DashCtrl & MedCtrl --> MongoDB

    %% Styling
    classDef client fill:#f0f9ff,stroke:#0284c7,stroke-width:2px;
    classDef gateway fill:#f8fafc,stroke:#334155,stroke-width:2px;
    classDef pipeline fill:#f0fdf4,stroke:#16a34a,stroke-width:2px;
    classDef ai fill:#fdf4ff,stroke:#a855f7,stroke-width:2px;
    classDef db fill:#fff7ed,stroke:#ea580c,stroke-width:2px;

    class UI,Dashboard,DocVault,ChatUI,ProfileUI,TimelineUI,MedsUI client;
    class AuthMW,DocCtrl,ChatCtrl,ProfileCtrl,DashCtrl,MedCtrl,StorageService gateway;
    class OCR,Classifier,Extractor,SummaryEngine,ReviewEngine,FHIRMapper,ABHAMock pipeline;
    class LLMClient,RAG,Guardrails ai;
    class MongoDB,UserColl,DocColl,MedColl,TimeColl,ConvColl db;
```

---

## 3. Trust Boundaries & Privacy Architecture

### 3.1 Strict User-Isolated Storage
- Physical file uploads are written strictly to `uploads/{userId}/{filename}`.
- All file retrieval (`GET /api/documents/:id/file`) checks both `_id: documentId` AND `userId: req.user.id`.
- Attempted path traversal (e.g. `../`) is blocked by `path.resolve` and checked against root upload bounds.

### 3.2 AI Grounding & Zero Data Leakage
- The AI Health Assistant retrieves authorized clinical records belonging strictly to `req.user.id`.
- Conversations and dynamic history titles are strictly queried with `{ _id: convId, userId: req.user.id }`.
- Prompt injection and out-of-context fabrication are mitigated by grounding system instructions with cited excerpts.

### 3.3 Clinical Safety Guardrails
1. **Informational Only**: AI responses and summaries explicitly carry mandatory disclaimers and never substitute for licensed doctor consultations.
2. **Preserving Laboratory Reference Ranges**: Numeric values, units (e.g., `mg/dL`, `g/dL`), and original laboratory intervals are never modified or guessed.
3. **Telugu Summary Fidelity**: In Telugu translations, numeric test results and medicine brand names remain identical to eliminate clinical ambiguity.
4. **Mock ABDM Readiness**: Simulated ABHA linking clearly displays a sandbox badge and sample records are explicitly labeled with `provenance: ABDM_SANDBOX`.
