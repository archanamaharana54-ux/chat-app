# Real-Time Chat App (MERN + Socket.io)

A real-time chat application with JWT authentication, multiple chat rooms, online presence tracking, typing indicators, and persistent message history.

## Folder Structure

```
chat-app/
├── backend/
│   ├── config/db.js
│   ├── models/User.js, Message.js
│   ├── controllers/authController.js, messageController.js
│   ├── routes/authRoutes.js, messageRoutes.js
│   ├── middleware/authMiddleware.js, errorMiddleware.js
│   ├── sockets/socketHandler.js   <- all Socket.io logic lives here, separate from REST
│   ├── server.js                  <- Express + raw HTTP server + Socket.io attached together
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── api/ (REST calls: auth, message history)
    │   ├── context/AuthContext.jsx, SocketContext.jsx
    │   ├── components/ (Navbar, RoomSidebar, MessageBubble, ProtectedRoute)
    │   ├── pages/ (Login, Register, ChatRoom)
    │   └── App.jsx, main.jsx, index.css
    └── .env.example
```

## How the real-time part works (important to understand for interviews)

1. **Socket auth happens once per connection** (`io.use(...)` middleware in `socketHandler.js`), not per-event — the JWT is sent via `socket.handshake.auth.token` when the client connects, not as an HTTP header.
2. **Rooms** are just Socket.io's built-in room feature (`socket.join(roomName)`). A message is broadcast with `io.to(room).emit(...)` so only people in that room receive it.
3. **Online presence** is tracked in-memory (`onlineUsersByRoom`, `userConnectionCount`) because a user can have multiple tabs open — we only mark them "offline" in MongoDB when their last socket disconnects.
4. **Persistence**: every message is saved to MongoDB (`Message` model) before being broadcast, so refreshing the page loads full history via a normal REST call (`GET /api/messages/:room`).
5. **Typing indicators** are ephemeral — they're not stored anywhere, just relayed live via `socket.to(room).emit(...)`.

## Step 1 — Local Setup

### Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env: MONGO_URI (use a different database name than the to-do app, e.g. add /chatapp before the ?), JWT_SECRET
npm run dev
```
Runs on `http://localhost:5001`.

### Frontend
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```
Runs on `http://localhost:5174`.

**To test real-time features properly**, open the app in two different browsers (or one normal + one incognito window), register two different users, and chat between them — you'll see messages, online status, and typing indicators update live.

## Step 2 — MongoDB

You can reuse the same Atlas cluster from the To-Do app — just use a different database name in the connection string so the two projects don't mix collections, e.g.:
```
mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/chatapp?retryWrites=true&w=majority
```

## Step 3 — Deployment

### Backend → Railway
Railway supports WebSockets out of the box (Render's free tier historically had issues with long-lived socket connections sleeping) — Railway is the more reliable pick here.

1. Push `backend/` to GitHub (same repo, new folder, or a separate repo — your choice)
2. Railway → New Project → Deploy from GitHub repo
3. Set **Root Directory** to `backend`
4. Add environment variables: `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT`, `CLIENT_URL`
5. Generate a public domain (Settings → Networking)

### Frontend → Vercel
1. New Project → import repo → Root Directory: `frontend`
2. Environment variables:
   - `VITE_API_URL` = `https://your-backend.up.railway.app/api`
   - `VITE_SOCKET_URL` = `https://your-backend.up.railway.app`
3. Deploy

### Final step
Update backend's `CLIENT_URL` on Railway to the live Vercel URL, and make sure MongoDB Atlas Network Access allows `0.0.0.0/0` (same as the to-do app).

## Resume Bullet Points

- Built a real-time chat application using Socket.io, Express, and MongoDB, supporting multiple chat rooms and live presence tracking.
- Implemented Socket.io authentication middleware to verify JWTs at the handshake level, keeping auth logic separate from message-handling logic.
- Designed an in-memory presence-tracking system that correctly handles multiple simultaneous connections per user (e.g. multiple browser tabs).
- Persisted chat history in MongoDB with indexed queries for fast retrieval, while keeping ephemeral events (typing indicators) socket-only.

## Possible Extensions

- Private 1-on-1 messaging (not just public rooms)
- Message read receipts
- File/image sharing in chat
- Redis adapter for Socket.io if scaling to multiple server instances
