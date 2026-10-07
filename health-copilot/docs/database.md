# Database Schema & Indexing Guide

Database: **MongoDB** with **Mongoose ODM**

## Schemas & Indexes

### 1. `users`
- `name`: String
- `email`: String (Unique index, lowercase)
- `password`: String (`select: false`)
- `dateOfBirth`: Date
- `gender`: String
- `timestamps`: true

### 2. `documents`
- `userId`: ObjectId (Indexed with `createdAt: -1`)
- `fileName`: String
- `fileUrl`: String
- `fileType`: String
- `fileSize`: Number
- `documentType`: Enum ('Blood Report', 'Prescription', 'Lab Report', 'Doctor Note', 'Imaging Report', 'Other')
- `extractedText`: String
- `summary`: Object (`overview`, `keyInformation`, `datesMentioned`, `medicationsMentioned`, `testsMentioned`, `doctorQuestions`)
- `chunks`: Array (`chunkText`, `embedding`)
- `status`: Enum ('UPLOADED', 'PROCESSING', 'PROCESSED', 'FAILED')
- `failureReason`: String

### 3. `medications`
- `userId`: ObjectId (Indexed with `createdAt: -1`)
- `name`: String
- `dosage`: String
- `frequency`: String
- `instructions`: String
- `startDate`: Date
- `endDate`: Date
- `prescribedBy`: String
- `notes`: String
- `status`: Enum ('ACTIVE', 'PAUSED', 'COMPLETED')

### 4. `appointments`
- `userId`: ObjectId (Indexed with `date: 1`)
- `doctorName`: String
- `specialty`: String
- `date`: Date
- `time`: String
- `location`: String
- `reason`: String
- `notes`: String
- `status`: Enum ('UPCOMING', 'COMPLETED', 'CANCELLED')

### 5. `conversations` & `messages`
- `conversations`: `{ userId (Indexed), title, timestamps: true }`
- `messages`: `{ conversationId (Indexed), role: 'user'|'assistant', content, sources, createdAt }`

### 6. `timelines`
- `userId`: ObjectId (Indexed with `date: -1`)
- `eventType`: Enum ('DOCUMENT', 'APPOINTMENT', 'MEDICATION', 'NOTE', 'LAB_RESULT')
- `title`: String
- `description`: String
- `date`: Date
- `referenceId`: ObjectId
