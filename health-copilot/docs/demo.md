# Hackathon Demo Walkthrough Guide

Follow these steps for a complete product evaluation of **Health Copilot**.

## Demo Credentials
- **Email:** `demo@healthcopilot.com`
- **Password:** `DemoPassword123!`
*(Or click "Autofill Demo Account Credentials" directly on the login screen!)*

---

## Step-by-Step Demonstration Flow

### 1. Landing Page
- Navigate to `http://localhost:5173/`
- Review hero section, healthcare feature highlights, and medical advisory policy.
- Click **"Sign In"** or **"Get Started"**.

### 2. Login
- On `/login`, click the **"Autofill Demo Account Credentials"** button.
- Click **"Sign In"**.

### 3. Patient Dashboard
- Observe personalized greeting ("Good morning / afternoon / evening, Alex Johnson").
- Inspect metric overview cards:
  - **Documents:** 3 uploaded records
  - **Active Medications:** 3 active prescriptions
  - **Upcoming Appointments:** 2 scheduled visits
- Notice recent medical documents list, upcoming visits with Dr. Jenkins, and medication schedules.

### 4. Upload & Analyze Document
- Click **"Upload Document"** in the top navbar or navigate to `/documents`.
- Select **"Upload New Document"**.
- Drag or select a sample report (e.g. PDF or PNG).
- Watch the 5-step processing pipeline:
  `Uploading...` -> `Processing structure...` -> `Extracting text...` -> `Generating AI summary...` -> `Complete`.

### 5. Document Intelligence & Details
- Click on any report (e.g., `Complete_Blood_Count_Panel.pdf`).
- Review the 3 core views:
  1. **AI Summary & Insights:** Plain language overview, numerical measurements, test lists, and tailored doctor questions.
  2. **Original Document Preview:** In-browser document viewer.
  3. **Extracted Raw Text:** Full OCR / parsed text stream.

### 6. Interactive AI Health Assistant (RAG)
- Navigate to `/assistant`.
- Type or select a suggested prompt:
  - *"What was my latest blood test and cholesterol level?"*
  - Notice the AI cites `Complete_Blood_Count_Panel.pdf` and `Comprehensive_Lipid_Profile.pdf` with clickable source links!
  - Test safety guardrail: type *"Do I have cancer?"* -> Observe the non-diagnostic refusal and physician guidance.
  - Test emergency guardrail: type *"I have severe chest pain"* -> Observe immediate emergency 911 / 112 alert banner.

### 7. Chronological Health Timeline
- Navigate to `/timeline`.
- View the unified journey grouped by year (2026), connecting document uploads, doctor consultations, and medication additions.

### 8. Medications & Appointments
- Navigate to `/medications`: add, pause, or update dosages.
- Navigate to `/appointments`: mark an upcoming consultation as completed.

### 9. Profile & Privacy Control
- Navigate to `/profile`.
- Observe patient data isolation disclosures and the permanent data erasure capability.
