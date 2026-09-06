require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const connectDB = require("./config/db");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const initSocket = require("./sockets/socketHandler");

const authRoutes = require("./routes/authRoutes");
const messageRoutes = require("./routes/messageRoutes");

connectDB();

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || "*" }));
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

app.use(notFound);
app.use(errorHandler);

// Wrap Express in a raw HTTP server so Socket.io can attach to the same port
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST"],
  },
});

initSocket(io);

const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
  console.log(`Server (HTTP + Socket.io) running on port ${PORT}`);
});
