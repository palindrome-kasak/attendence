# FaceAttend — AI Attendance System

Face recognition attendance system for factories and small businesses. Phase 1 MVP: admin login, employee management, face registration, capture-based attendance, and dashboard.

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | React, Vite, Tailwind CSS |
| Backend | Node.js, Express, Prisma |
| Database | SQLite |
| AI Service | Python, FastAPI, face_recognition |

## Project Structure

```
attendance-system/
├── backend/       # Node.js API
├── frontend/      # React admin dashboard
└── ai-service/    # Python face recognition microservice
```

## Prerequisites

- Node.js 18+
- Python 3.9+
- CMake (for face_recognition / dlib): `brew install cmake`

## Quick Start

### 1. AI Service (port 8001)

```bash
cd ai-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

### 2. Backend (port 3001)

```bash
cd backend
npm install
cp .env.example .env
npx prisma migrate dev
npm run seed
npm run dev
```

Default admins (2 factories):

| Factory | Email | Password |
|---------|-------|----------|
| Sunrise Textiles (Factory 1) | `admin@factory1.com` | `factory1123` |
| Green Valley Manufacturing (Factory 2) | `admin@factory2.com` | `factory2123` |

Each factory has isolated employees, attendance, and settings.

### 3. Frontend (port 5173)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## Production deploy (Render)

All three services deploy from one `render.yaml` blueprint:

| Service | Host |
|---------|------|
| Frontend | https://faceattend-web.onrender.com |
| API | https://faceattend-api.onrender.com |
| AI | https://faceattend-ai.onrender.com |

See [DEPLOY.md](./DEPLOY.md) for full steps.

## Attendance Flow

1. Admin registers employees with photo (upload or webcam capture).
2. On **Live Scan**, employee clicks **Start Attendance**.
3. Camera opens → **Capture** → face is recognized → attendance marked.
4. Camera closes. No 24/7 live feed required.

## API Overview

- `POST /api/auth/login` — Admin login
- `GET/POST/PUT/DELETE /api/employees` — Employee CRUD
- `POST /api/employees/:id/register-face` — Store face embedding
- `POST /api/attendance/scan` — Capture photo → recognize → mark attendance
- `GET /api/attendance/today` — Today's records
- `GET /api/dashboard` — Summary stats

## License

MIT
