# Health Copilot — Backend REST API

Node.js and Express.js REST API server with MongoDB data layer.

## Scripts
- `npm run dev`: Starts Express development server with watch mode (`port 5000`).
- `npm start`: Runs production server.
- `npm test`: Runs backend test suites.

## Features
- JWT authentication and bcrypt password salting (12 rounds).
- Strict patient data isolation enforced across every model query.
- Document upload and storage handling via Multer.
- Health event timeline integration across documents, medications, and visits.
- Centralized error handler and REST response format.
