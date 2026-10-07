# AI-Powered Personal Health Copilot

[![Tests](https://img.shields.io/badge/tests-52%20passed-success)](https://github.com)
[![Status](https://img.shields.io/badge/status-production%20ready-blue)](https://github.com)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

> A modern, responsive healthcare web application that centralizes medical documents, explains lab reports in plain language, manages prescriptions and visits, and provides an AI health assistant powered by Retrieval-Augmented Generation (RAG).

---

## 1. Project Overview
Individuals frequently face scattered health information spread across blood reports, clinic notes, doctor prescriptions, and appointment slips. Understanding complex laboratory measurements and recollecting medical histories is challenging and stressful.

**Health Copilot** provides a centralized, secure digital health vault where patients can:
1. Securely store and organize health documents (PDFs, images).
2. Extract text and generate plain-language AI summaries of clinical findings.
3. Chat with an AI Health Assistant that references their own authorized documents with citations.
4. Track medications, schedules, and prescriber instructions.
5. Manage and complete upcoming medical appointments.
6. Explore a chronological health timeline of their medical journey.

> **CRITICAL MEDICAL DISCLAIMER:**
> Health Copilot is an informational and organizational assistant. It does **NOT** diagnose diseases, prescribe medication, alter dosages, or provide emergency care. Always consult a qualified medical professional for clinical guidance.

---

## 2. Key Features
- **Patient Authentication & Security:** JWT tokens, bcrypt password hashing, and strict patient data isolation.
- **Smart Health Dashboard:** Live metrics, recent documents, active medication reminders, upcoming visits, and instant AI search.
- **Document Intelligence Pipeline:** PDF text extraction, OCR file handling, chunking, and structured summaries (overview, key values, doctor questions).
- **In-Browser Document Preview:** Embedded PDF and image viewers alongside raw extracted transcripts.
- **AI Health Assistant (RAG):** Multi-turn chat assistant that searches user-owned document chunks and cites exact source reports.
- **Healthcare Safety Guardrails:** Automatic emergency detection (911/112 alert banner) and non-diagnostic policy enforcement.
- **Medication Management:** Full CRUD tracking of dosages, daily frequencies, instructions, and prescribers.
- **Appointment Scheduling:** Track upcoming specialist consultations, visit preparations, and completion statuses.
- **Chronological Health Timeline:** Unified medical timeline grouped by year connecting reports, prescriptions, and visits.
- **Patient Privacy & Right to Be Forgotten:** Complete account and medical document eradication on demand.

---

## 3. Technology Stack
- **Frontend:** React 18, Vite 6, React Router DOM, Axios, Lucide React, Custom Vanilla CSS Design System.
- **Backend:** Node.js, Express.js, Mongoose, Multer, Helmet, Morgan, Express-Rate-Limit.
- **Database:** MongoDB (Local or Atlas) with indexed schemas.
- **AI & RAG:** OpenAI-compatible LLM Client with local cosine similarity vector retrieval and deterministic heuristic fallback.
- **Document Processing:** `pdf-parse`, regex text normalization, overlapping token chunking.
- **Testing:** Node.js Test Runner (`node:test`, 52 automated tests passing).

---

## 4. Application Architecture
```
                         React Frontend (Vite)
                                  │
                                  ▼ REST API
                         Express Backend API
                       (Port 5000 / Proxy 5173)
                                  │
                 ┌────────────────┴────────────────┐
                 ▼                                 ▼
           MongoDB Database                AI & RAG Service
         (Documents, Meds, Appts)       (Vector Retrieval & LLM)
```

---

## 5. Demo Credentials
For testing and demonstration, use the seeded demo account:
- **Email:** `demo@healthcopilot.com`
- **Password:** `DemoPassword123!`
*(Or click the "Autofill Demo Account Credentials" button on the login screen!)*

The demo account includes:
- 3 Fictional medical documents (Complete Blood Count, Lipid Panel, Cardiology Prescription)
- 3 Active medications (Atorvastatin 20mg, Lisinopril 10mg, Vitamin D3)
- 2 Upcoming doctor visits (Cardiology with Dr. Jenkins, Wellness with Dr. Miller)
- 5 Chronological timeline milestones

---

## 6. Installation & Quick Start

### Prerequisites
- Node.js >= 18.x (Tested on v26)
- MongoDB running locally on port `27017` or a MongoDB Atlas URI

### 1. Clone & Install Dependencies
```bash
cd health-copilot
npm install
npm run install:all
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure MongoDB URI is configured (defaults to `mongodb://127.0.0.1:27017/health_copilot`).

### 3. Seed Demo Data
```bash
npm run seed
```

### 4. Run Development Servers
```bash
# Starts both Backend (port 5000) and Frontend (port 5173) concurrently:
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser!

---

## 7. Running Tests
The project contains comprehensive test suites across Backend, AI, Document processing, Integration, and Frontend layers:

```bash
npm run test:all
```
Result: **52 tests passing across 18 test suites**.

---

## 8. REST API Documentation
Refer to **[docs/api.md](docs/api.md)** for detailed request and response payloads.
- `POST /api/auth/register` — Patient registration
- `POST /api/auth/login` — Patient login
- `GET /api/documents` — List patient documents
- `POST /api/documents` — Upload and process report
- `POST /api/ai/chat` — Query AI assistant with RAG
- `GET /api/dashboard` — Unified metrics overview
- `GET /api/timeline` — Chronological health journey
- `DELETE /api/profile` — Purge account and all health data

---

## 9. Security Considerations
1. **Zero Client Trust:** All user IDs are resolved from authenticated JWT claims, never from request bodies.
2. **Cross-Tenant Isolation:** User A is strictly forbidden from querying or viewing User B's documents (`403 Forbidden`).
3. **Password Salting:** Salted with bcrypt (12 rounds), never stored in plain text.
4. **Secret Protection:** AI keys and JWT secrets remain solely on the server environment.

---

## 10. Future Improvements
- FHIR (Fast Healthcare Interoperability Resources) data import/export.
- Mobile push notifications for medication reminders.
- Multi-language clinical report translation.
- Wearable device synchronization (Apple Health / Google Health Connect).
