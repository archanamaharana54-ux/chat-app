import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { getRoomMessages } from "../api/messageApi";
import RoomSidebar from "../components/RoomSidebar";
import MessageBubble from "../components/MessageBubble";

const TYPING_TIMEOUT_MS = 2000;

const ChatRoom = () => {
  const { user } = useAuth();
  const { socket, connected } = useSocket();

  const [room, setRoom] = useState("general");
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [input, setInput] = useState("");
  const [typingUser, setTypingUser] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load chat history + join room whenever room changes (or socket becomes ready)
  useEffect(() => {
    if (!socket) return;

    setLoadingHistory(true);
    getRoomMessages(room)
      .then(({ data }) => setMessages(data))
      .catch((err) => console.error("Failed to load history", err))
      .finally(() => setLoadingHistory(false));

    socket.emit("joinRoom", { room });

    const handleNewMessage = (msg) => {
      // only append if it belongs to the room currently open
      setMessages((prev) => (msg.room === room ? [...prev, msg] : prev));
    };
    const handleOnlineUsers = (users) => setOnlineUsers(users);
    const handleUserTyping = ({ name }) => setTypingUser(name);
    const handleUserStoppedTyping = () => setTypingUser(null);

    socket.on("newMessage", handleNewMessage);
    socket.on("onlineUsers", handleOnlineUsers);
    socket.on("userTyping", handleUserTyping);
    socket.on("userStoppedTyping", handleUserStoppedTyping);

    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("onlineUsers", handleOnlineUsers);
      socket.off("userTyping", handleUserTyping);
      socket.off("userStoppedTyping", handleUserStoppedTyping);
    };
  }, [socket, room]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim() || !socket) return;
    socket.emit("sendMessage", { room, text: input.trim() });
    socket.emit("stopTyping", { room });
    setInput("");
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (!socket) return;

    socket.emit("typing", { room });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stopTyping", { room });
    }, TYPING_TIMEOUT_MS);
  };

  return (
    <div className="chat-layout">
      <RoomSidebar currentRoom={room} onRoomChange={setRoom} onlineUsers={onlineUsers} />

      <div className="chat-main">
        <div className="chat-header">
          <h3># {room}</h3>
          {!connected && <span className="warning-text">Reconnecting...</span>}
        </div>

        <div className="message-list">
          {loadingHistory ? (
            <p className="center-text">Loading messages...</p>
          ) : messages.length === 0 ? (
            <p className="center-text">No messages yet. Say hi!</p>
          ) : (
            messages.map((msg) => (
              <MessageBubble key={msg._id} message={msg} isOwn={msg.sender === user._id} />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {typingUser && <div className="typing-indicator">{typingUser} is typing...</div>}

        <form className="message-input-row" onSubmit={handleSend}>
          <input
            value={input}
            onChange={handleInputChange}
            placeholder={`Message #${room}`}
            disabled={!connected}
          />
          <button type="submit" className="btn-primary" disabled={!connected || !input.trim()}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatRoom;
