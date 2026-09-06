const { verifyTokenAndGetUser } = require("../middleware/authMiddleware");
const Message = require("../models/Message");
const User = require("../models/User");

// Tracks which room each connected socket is currently in, and which
// userId maps to which socketId (a user could have multiple tabs open,
// so we track counts to know when they've truly gone offline).
const onlineUsersByRoom = {}; // { roomName: Set of {userId, name} }
const socketUserMap = {}; // { socketId: { userId, name, room } }
const userConnectionCount = {}; // { userId: number of open sockets }

const emitOnlineUsers = (io, room) => {
  const users = onlineUsersByRoom[room] ? Array.from(onlineUsersByRoom[room]) : [];
  io.to(room).emit("onlineUsers", users);
};

const initSocket = (io) => {
  // Socket-level authentication middleware — runs once per connection,
  // before any event handlers. Keeps auth logic out of business logic.
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Authentication error: no token provided"));

      const user = await verifyTokenAndGetUser(token);
      socket.user = { id: user._id.toString(), name: user.name };
      next();
    } catch (error) {
      next(new Error("Authentication error: invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id} (user: ${socket.user.name})`);

    // ---- JOIN ROOM ----
    socket.on("joinRoom", async ({ room }) => {
      const roomName = room || "general";

      // leave any previous room this socket was in
      const prev = socketUserMap[socket.id];
      if (prev && prev.room && prev.room !== roomName) {
        socket.leave(prev.room);
        onlineUsersByRoom[prev.room]?.forEach((u) => {
          if (u.userId === socket.user.id) onlineUsersByRoom[prev.room].delete(u);
        });
        emitOnlineUsers(io, prev.room);
      }

      socket.join(roomName);
      socketUserMap[socket.id] = { userId: socket.user.id, name: socket.user.name, room: roomName };

      if (!onlineUsersByRoom[roomName]) onlineUsersByRoom[roomName] = new Set();
      onlineUsersByRoom[roomName].add({ userId: socket.user.id, name: socket.user.name });

      // mark user online (first connection only)
      userConnectionCount[socket.user.id] = (userConnectionCount[socket.user.id] || 0) + 1;
      if (userConnectionCount[socket.user.id] === 1) {
        await User.findByIdAndUpdate(socket.user.id, { isOnline: true });
      }

      emitOnlineUsers(io, roomName);
      socket.to(roomName).emit("userJoined", { name: socket.user.name });
    });

    // ---- SEND MESSAGE ----
    socket.on("sendMessage", async ({ room, text }) => {
      try {
        if (!text || !text.trim()) return;
        const roomName = room || "general";

        const message = await Message.create({
          room: roomName,
          sender: socket.user.id,
          senderName: socket.user.name,
          text: text.trim(),
        });

        // broadcast to everyone in the room, including sender (for consistency)
        io.to(roomName).emit("newMessage", {
          _id: message._id,
          room: message.room,
          sender: message.sender,
          senderName: message.senderName,
          text: message.text,
          createdAt: message.createdAt,
        });
      } catch (error) {
        socket.emit("errorMessage", { message: "Failed to send message" });
      }
    });

    // ---- TYPING INDICATOR ----
    socket.on("typing", ({ room }) => {
      socket.to(room || "general").emit("userTyping", { name: socket.user.name });
    });

    socket.on("stopTyping", ({ room }) => {
      socket.to(room || "general").emit("userStoppedTyping", { name: socket.user.name });
    });

    // ---- DISCONNECT ----
    socket.on("disconnect", async () => {
      const info = socketUserMap[socket.id];
      if (info) {
        const { userId, name, room } = info;

        onlineUsersByRoom[room]?.forEach((u) => {
          if (u.userId === userId) onlineUsersByRoom[room].delete(u);
        });
        emitOnlineUsers(io, room);

        userConnectionCount[userId] = Math.max((userConnectionCount[userId] || 1) - 1, 0);
        if (userConnectionCount[userId] === 0) {
          await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() });
        }

        delete socketUserMap[socket.id];
      }
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
};

module.exports = initSocket;
