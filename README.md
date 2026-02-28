# 🚦 TrafficGuard — Smart Traffic Violation Management System
### Node.js + Express + Mongoose + MongoDB

---

## 📁 Project Structure
```
trafficguard/
├── server.js                    ← Main Express server
├── .env                         ← Environment variables
├── package.json
├── backend/
│   ├── config/
│   │   └── database.js          ← MongoDB connection
│   ├── models/
│   │   ├── Violation.js         ← Mongoose schema + indexes
│   │   └── AuditLog.js          ← Audit log schema
│   ├── routes/
│   │   ├── violations.js        ← All violation CRUD + payment
│   │   └── audit.js             ← Audit log routes
│   └── middleware/
│       └── errorHandler.js      ← Global error handling
└── frontend/
    └── index.html               ← Full UI (talks to API)
```

---

## 🚀 Setup & Run

### 1. Install MongoDB
- Download MongoDB Community: https://www.mongodb.com/try/download/community
- Install MongoDB Compass: https://www.mongodb.com/try/download/compass

### 2. Install Dependencies
```bash
cd trafficguard
npm install
```

### 3. Configure Environment
Edit `.env` file:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/traffic_violations
NODE_ENV=development
```

### 4. Start the Server
```bash
# Production
npm start

# Development (auto-restart)
npm run dev
```

### 5. Open the App
→ http://localhost:5000

---

## 🗄️ MongoDB Compass Connection

1. Open **MongoDB Compass**
2. Connect to: `mongodb://localhost:27017`
3. Database: **traffic_violations**
4. Collections:
   - `violations` — all violation records
   - `auditlogs` — all audit events

---

## 📡 REST API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/health | Server + DB status |
| GET | /api/violations | List all (search, filter, paginate) |
| GET | /api/violations/stats | Dashboard statistics |
| GET | /api/violations/reports | Analytics aggregations |
| GET | /api/violations/:id | Single violation by ID or plate |
| POST | /api/violations | Create new violation |
| PUT | /api/violations/:id/pay | Process payment |
| PUT | /api/violations/:id/dispute | Mark as disputed |
| DELETE | /api/violations/:id | Delete violation |
| GET | /api/audit | Get audit log |
| DELETE | /api/audit | Clear audit log |

---

## 💡 Features

- ✅ Record violations with timestamps saved to MongoDB
- ✅ Auto-calculated fines (base + 5% processing fee)
- ✅ 12 violation types with preset fines
- ✅ Online payment simulation with receipt generation
- ✅ Full audit log stored in MongoDB
- ✅ Search, filter, export CSV
- ✅ MongoDB Compass compatible with proper indexes
- ✅ Reports & analytics using MongoDB aggregation pipeline
- ✅ Transactional consistency via Mongoose validation
