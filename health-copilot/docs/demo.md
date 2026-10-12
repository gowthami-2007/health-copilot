# HealthCopilot — Personal Vault: Evaluation Demo & Presentation Guide

## 1. Challenge Demo Credentials & Access
- **Application URL:** `http://localhost:5173/`
- **Backend API:** `http://localhost:5000/api`
- **Default Test Account:** Register a new patient account or use your personal credentials.

---

## 2. Step-by-Step 9-Point Demonstration Workflow

### Step 1: Secure Document Upload & OCR Ingestion
1. Navigate to **Documents** (`/documents`) and click **"Upload New Document"**.
2. Select any laboratory test report or prescription (PDF, PNG, JPG).
3. The backend authenticates the user, isolates the file into `uploads/{userId}/`, performs Tesseract OCR / text extraction, classifies the document, and triggers structured extraction.

### Step 2: Clinical Data Extraction & Abnormal Values Flagging
1. Open the processed report in **Document Details** (`/documents/:id`).
2. Notice the **Verified Lab Values & Rx** tab.
3. Review the extracted table:
   - Test names (e.g. Hemoglobin, Fasting Blood Glucose, Platelet Count).
   - Observed values and units.
   - Reporting laboratory reference intervals.
   - Abnormal flags (HIGH, LOW, NORMAL) highlighted with distinct badges.

### Step 3: Interactive Verification & Review Interface (Phase 2.4)
1. Click **"Edit & Verify"** on the clinical data banner.
2. Correct or refine any ambiguous values.
3. Click **"Confirm & Save"**. The record transitions from `REVIEW_REQUIRED` to `VERIFIED`.

### Step 4: Bilingual AI Health Summaries (English & Telugu - Phase 6)
1. In the **AI Summary & Insights** tab, view the 6 clinical sections:
   - What this document is (Overview)
   - Results outside reference ranges
   - Key clinical findings
   - What the findings may mean (with uncertainty limitations)
   - Documented medicines & instructions
   - Proactive questions for your doctor
2. Click the **"తెలుగు (Telugu)"** language button:
   - Observe immediate rendering in readable Telugu.
   - Notice that numeric values, decimal precision, units, and medicine names are strictly preserved to avoid clinical misinterpretation.

### Step 5: HL7 FHIR R4 Bundle Export (Phase 7.1)
1. In the **Verified Lab Values & Rx** tab, click **"View FHIR R4 Bundle"**.
2. An in-app modal displays the complete standard HL7 FHIR R4 JSON bundle:
   - `Patient` resource mapped from user credentials.
   - `DocumentReference` resource with file provenance.
   - `DiagnosticReport` resource linking observations.
   - Standardized `Observation` resources with LOINC and interpretation flags.
   - `MedicationRequest` resources for prescribed drugs.

### Step 6: Unified Health Profile & Medication Vault (Phase 4)
1. Navigate to **Medications** (`/medications`).
2. Notice that verified prescriptions from uploaded documents appear directly as active medications with doctor provenance.
3. Users can add, pause, or update schedules with complete patient data isolation.

### Step 7: Chronological Health Timeline (Phase 5.2)
1. Navigate to **Health Timeline** (`/timeline`).
2. View chronological events sorted by clinical event date rather than upload date:
   - Uploaded documents and analyzed test panels.
   - Verified prescriptions.
   - Scheduled appointments.
   - Reprocessing deduplicates timeline entries idempotently.

### Step 8: Source-Grounded AI Health Assistant (Phase 3)
1. Navigate to **AI Assistant** (`/assistant`).
2. Type: *"What was my latest hemoglobin result and what should I ask my doctor?"*
3. Observe:
   - Grounded answer citing your specific uploaded document.
   - Direct quote of numerical values and laboratory reference range.
   - Proactive discussion questions.
   - Safe medical disclaimer.
4. Test **New Consultation**: Clicking New Consultation immediately clears the chat pane and starts a fresh conversation with isolated history.

### Step 9: ABDM / ABHA Readiness Sandbox (Phase 7.2)
1. Navigate to **Profile & Settings** (`/profile`).
2. In the **ABDM / ABHA Readiness** section:
   - View mock ABHA address (`patient@abdm`) and status.
   - Click **"Preview Simulated ABHA Records"** to inspect simulated external records from Apollo Diagnostics and Yashoda Hospital.
   - Click **"Import to Vault"** on a simulated record: the synthetic record is imported directly into the user's document vault and reflected in the Health Timeline.
   - Click **"Unlink Mock ABHA"** to verify sandbox state transitions.

---

## 3. Challenge Presentation Outline

### Slide 1: Problem Statement
- **Fragmented Health Data:** Patients struggle with scattered physical medical records, complex lab jargon, and uncoordinated care.
- **Privacy & Security Gaps:** Generic AI apps leak personal health records or hallucinate critical medical figures.
- **National Interoperability Readiness:** India's ABDM / ABHA standards require FHIR R4 alignment and federated record exchange.

### Slide 2: The Solution — HealthCopilot Personal Vault
- Centrally organized, privacy-first personal health vault.
- End-to-end OCR and automated extraction of test values, units, and reference ranges.
- Grounded bilingual AI summaries (English & Telugu) that empower patient-physician dialogue without replacing doctors.
- FHIR R4 mapping and ABDM sandbox readiness for future-proof interoperability.

### Slide 3: Architecture & Security Perimeter
- Full MERN stack with user-isolated physical file storage (`uploads/{userId}/`).
- Zero cross-patient data access; strict JWT and database query scoping.
- Fallback clinical extraction dictionary + multimodal LLM intelligence.

### Slide 4: Clinical Safety & Ethical AI
- No fabricated values or arbitrary reference ranges; reporting laboratory intervals are preserved.
- Non-diagnostic clinical guardrails: uncertainty flags and structured questions for doctors.
- Regional language fidelity: numbers, decimals, and medicine names are never mistranslated.

### Slide 5: Interoperability (ABDM & FHIR R4)
- Live export of patient reports to standard HL7 FHIR R4 JSON bundles.
- Functional Mock ABDM Gateway demonstrating discovery, preview, and consent-based record import.

### Slide 6: Roadmap & Production Readiness
- Integration with live ABDM sandbox APIs upon national gateway onboarding.
- Expansion to additional regional Indian languages (Hindi, Tamil, Kannada).
- Wearable IoT vitals sync (Apple Health / Google Health Connect).
