# Security & Privacy Policy

Healthcare applications require stringent defense-in-depth security measures. Health Copilot implements:

## 1. Patient Data Isolation
- Every database query involves an ownership filter derived from the verified JWT:
  ```javascript
  // Example:
  Document.find({ userId: req.user.id })
  ```
- Client-supplied `userId` parameters in bodies or query parameters are never trusted.
- Security tests explicitly verify that User B attempting to view User A's document receives `403 Forbidden`.

## 2. Password Security
- Passwords must be at least 8 characters.
- Passwords are salted and hashed using `bcryptjs` with 12 rounds.
- The `password` field has `select: false` on the User schema and is stripped by `toJSON()`.

## 3. API Protection
- **Helmet**: Secures HTTP headers against XSS, clickjacking, and sniffing.
- **CORS**: Enforces whitelisted origins.
- **Rate Limiting**: Throttles brute-force attempts with `express-rate-limit`.
- **JWT Protection**: Tokens are signed with secret keys stored strictly on the server and expire after a configurable duration.

## 4. Privacy & Right to Be Forgotten
- Patients have the capability to delete individual documents or initiate a full account purge via `DELETE /api/profile`.
- Account purge cascades across documents, physical disk uploads, medications, appointments, conversations, messages, and timeline history.
