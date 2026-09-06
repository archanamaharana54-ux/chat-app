const MessageBubble = ({ message, isOwn }) => {
  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={`message-row ${isOwn ? "own" : ""}`}>
      <div className="message-bubble">
        {!isOwn && <span className="message-sender">{message.senderName}</span>}
        <p className="message-text">{message.text}</p>
        <span className="message-time">{time}</span>
      </div>
    </div>
  );
};

export default MessageBubble;
