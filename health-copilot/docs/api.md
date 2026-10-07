# REST API Specification

All API responses follow a uniform JSON schema:
```json
// Success Response:
{
  "success": true,
  "message": "Descriptive message",
  "data": { ... }
}

// Error Response:
{
  "success": false,
  "message": "Human readable error description",
  "error": "ERROR_CODE"
}
```

---

## 1. Authentication Endpoints (`/api/auth`)

### `POST /api/auth/register`
Creates a new patient account.
- **Request Body**:
  ```json
  {
    "name": "Alex Johnson",
    "email": "alex@example.com",
    "password": "SecurePassword123!",
    "confirmPassword": "SecurePassword123!"
  }
  ```
- **Response**: `201 Created` with user object (password omitted) and JWT.

### `POST /api/auth/login`
Authenticates an existing patient.
- **Request Body**:
  ```json
  {
    "email": "alex@example.com",
    "password": "SecurePassword123!"
  }
  ```
- **Response**: `200 OK` with user profile and JWT.

### `GET /api/auth/me`
Retrieves currently authenticated session.
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `200 OK`.

---

## 2. Document Endpoints (`/api/documents`)

### `POST /api/documents`
Uploads a new medical report.
- **Headers**: `Content-Type: multipart/form-data`
- **Body**: `file` (PDF/PNG/JPG), `documentType` ("Blood Report" | "Prescription" | "Lab Report" | "Doctor Note" | "Imaging Report" | "Other")
- **Response**: `201 Created`.

### `GET /api/documents`
Lists documents for authenticated patient.
- **Query Params**: `?type=Blood%20Report&search=cholesterol&sort=desc`
- **Response**: `200 OK`.

### `GET /api/documents/:id`
Retrieves document details, extracted text, and AI summary. Enforces 403 Forbidden for unauthorized users.

### `DELETE /api/documents/:id`
Deletes document, disk file, and associated timeline entries.

---

## 3. AI Assistant & RAG Endpoints (`/api/ai`)

### `POST /api/ai/chat`
Ask question regarding uploaded health records.
- **Body**:
  ```json
  {
    "question": "What was my cholesterol result in the latest blood test?",
    "conversationId": "optional_id"
  }
  ```
- **Response**: `200 OK` with answer, citations, and conversation metadata.

### `GET /api/ai/conversations`
Lists past consultation threads.

---

## 4. Medication Endpoints (`/api/medications`)

- `GET /api/medications` — List user medications
- `POST /api/medications` — Add medication
- `PUT /api/medications/:id` — Update medication
- `DELETE /api/medications/:id` — Remove medication

---

## 5. Appointment Endpoints (`/api/appointments`)

- `GET /api/appointments` — List user appointments
- `POST /api/appointments` — Schedule appointment
- `PUT /api/appointments/:id` — Update or mark completed
- `DELETE /api/appointments/:id` — Delete appointment

---

## 6. Dashboard & Timeline Endpoints

- `GET /api/dashboard` — Aggregated metrics, recent documents, active meds, upcoming visits
- `GET /api/timeline` — Chronological timeline of all health events grouped by year
- `GET /api/profile` — User profile details
- `PUT /api/profile` — Update name, DOB, gender
- `DELETE /api/profile` — Permanent account & medical records erasure
