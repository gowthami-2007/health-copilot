# HealthCopilot: Real Google Sign-In & Verified Email Authentication Setup Guide

This guide walks you through configuring production credentials for **Google OAuth 2.0 / OpenID Connect** and **Email Verification Delivery** in HealthCopilot.

---

## 1. Google OAuth 2.0 Configuration (Google Cloud Console)

HealthCopilot utilizes **Google Identity Services (GIS)** on the frontend and cryptographic ID token verification (`OAuth2Client.verifyIdToken`) via `google-auth-library` on the backend.

### Step 1: Create or Select a Google Cloud Project
1. Navigate to the [Google Cloud Console](https://console.cloud.google.com/).
2. Select your existing project or click **New Project** (e.g., `HealthCopilot-Production`).

### Step 2: Configure the OAuth Consent Screen
1. Go to **APIs & Services > OAuth consent screen**.
2. Select **External** user type and click **Create**.
3. Fill in the required application details:
   - **App name:** `HealthCopilot`
   - **User support email:** Your support or admin email.
   - **App logo:** (Optional) Upload application icon.
   - **Authorized domains:** Add your production domain (e.g., `healthcopilot.app` or `yourdomain.com`).
   - **Developer contact information:** Your admin email.
4. Click **Save and Continue**.
5. Under **Scopes**, add standard OpenID Connect scopes:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - `openid`
6. Finish the wizard. (During development, add your test Google email addresses under **Test users**).

### Step 3: Create OAuth 2.0 Client ID
1. Go to **APIs & Services > Credentials**.
2. Click **+ Create Credentials > OAuth client ID**.
3. Select **Application type:** **Web application**.
4. Set **Name:** `HealthCopilot Web Client`.
5. Under **Authorized JavaScript origins**, add:
   - Local development:
     - `http://localhost:5173`
     - `http://127.0.0.1:5173`
     - `http://localhost:3000`
   - Production:
     - `https://your-frontend-domain.com`
     - `https://health-copilot-pearl.vercel.app` (if using Vercel)
6. Under **Authorized redirect URIs**, add:
   - `http://localhost:5173`
   - `https://your-frontend-domain.com`
7. Click **Create**.
8. Copy your **Client ID** and **Client Secret**.

---

## 2. Email Provider Configuration (Resend or Custom SMTP)

HealthCopilot sends cryptographically secure email verification links and single-use 6-digit confirmation codes to prevent unverified mailbox access.

### Recommended Provider: Resend
1. Sign up for free at [Resend.com](https://resend.com/).
2. Go to **Domains** and click **Add Domain** (e.g., `mail.yourdomain.com` or `yourdomain.com`).
3. Add the provided DNS records (SPF, DKIM, MX) in your domain registrar (GoDaddy, Cloudflare, Namecheap, etc.) to achieve verified sender status.
4. Go to **API Keys** and generate a new key with sending permissions.
5. Copy the key (starts with `re_...`).

### Alternative: Custom SMTP (SendGrid, Mailgun, AWS SES, Gmail)
If you prefer traditional SMTP credentials, you can provide `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASS`.

---

## 3. Environment Variables Configuration

### Root / Backend `.env`
Add the following to your root `.env`:

```env
# Google OAuth 2.0
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here

# Email Delivery (Resend API)
EMAIL_PROVIDER_API_KEY=re_your_api_key_here
EMAIL_FROM=HealthCopilot <notifications@yourverifieddomain.com>

# Frontend Client URL (for verification and password reset links)
CLIENT_URL=http://localhost:5173
```

### Frontend `.env` (`frontend/.env` or Vercel Environment Variables)
Add the following:

```env
# Public Google Client ID
VITE_GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
```

> **Note on Local Development without API Keys:**  
> When `EMAIL_PROVIDER_API_KEY` is not set, HealthCopilot automatically logs formatted verification links and 6-digit OTP codes to the backend development console. This allows local developer testing without requiring external credentials.

---

## 4. Running and Testing Locally

### 1. Start the Backend:
```bash
cd backend
npm run dev
```

### 2. Start the Frontend:
```bash
cd frontend
npm run dev
```

### 3. Verify End-to-End User Journeys:
1. **Registration:**
   - Go to `http://localhost:5173/register`.
   - Enter Full Name, Email, Password, and Confirm Password.
   - Click **Create Account**.
   - Notice the account is created in an unverified state and the user is guided to the email confirmation screen.
2. **Email Verification:**
   - Either click the link from your email (or dev console) or enter the 6-digit confirmation code on `/verify-email`.
   - Upon verification, the user receives an active session token and can access `/dashboard`.
3. **Unverified Login Prevention:**
   - If an unverified user attempts to log in, the system blocks access with `403 Forbidden` and displays a direct button to resend the verification email or enter the OTP.
4. **Google Sign-In:**
   - Click **Continue with Google** on the login or registration page.
   - The official Google Identity Services dialog will open.
   - Upon approval, the backend verifies Google's cryptographic signature, registers or links the user, marks their email as verified, and grants authenticated access.
5. **Password Reset:**
   - Click **Forgot password?** on the login screen (`/forgot-password`).
   - Enter your email and click **Send Reset Link**.
   - Follow the link in the email to `/reset-password?token=...` to choose a new password.
