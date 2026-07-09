# Deploy FaceAttend on Render (one blueprint, three services)

| Service | Type | URL |
|---------|------|-----|
| `faceattend-web` | Static site (React) | https://faceattend-web.onrender.com |
| `faceattend-api` | Web service (Node.js) | https://faceattend-api.onrender.com |
| `faceattend-ai` | Web service (Docker/Python) | https://faceattend-ai.onrender.com |

```
React (Static)  →  Node API  →  Python AI
```

## Deploy

1. Go to [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**
2. Connect GitHub repo: `palindrome-kasak/attendence`
3. Render reads `render.yaml` and creates all three services
4. Wait for builds to finish (AI Docker build may take ~10–15 min first time)
5. Open **https://faceattend-web.onrender.com**

### Verify

```bash
curl https://faceattend-api.onrender.com/api/health
curl https://faceattend-ai.onrender.com/health
```

## Login credentials

| Factory | Email | Password |
|---------|-------|----------|
| Sunrise Textiles (Factory 1) | `admin@factory1.com` | `factory1123` |
| Green Valley Manufacturing (Factory 2) | `admin@factory2.com` | `factory2123` |

## Local development

```bash
# Terminal 1 — AI
cd ai-service && source venv/bin/activate && uvicorn main:app --reload --port 8001

# Terminal 2 — API
cd backend && npm run dev

# Terminal 3 — Frontend (uses Vite proxy, no VITE_API_URL needed)
cd frontend && npm run dev
```

For local frontend pointing at a remote API:

```bash
VITE_API_URL=https://faceattend-api.onrender.com npm run dev
```

## Environment variables

### faceattend-web (build-time)

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://faceattend-api.onrender.com` |

### faceattend-api

| Variable | Value |
|----------|-------|
| `AI_SERVICE_URL` | Auto-linked from `faceattend-ai` (`RENDER_EXTERNAL_URL`) |
| `DATABASE_URL` | `file:./dev.db` |
| `JWT_SECRET` | Auto-generated |

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Login fails | Check `faceattend-api` is Live; verify `/api/health` |
| Face scan fails | Check `faceattend-ai` deploy logs; redeploy if Docker build failed |
| Slow first request | Render free tier wakes from sleep (~30s) |
| Camera not working | Use HTTPS URL (Render provides this) |

## After code changes

Push to `main` → Render Blueprint auto-syncs all three services.

You can delete the old Netlify site (`faceattend-app`) if you no longer need it.
