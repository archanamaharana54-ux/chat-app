const DEFAULT_ROOMS = ["general", "random", "tech-talk"];

const RoomSidebar = ({ currentRoom, onRoomChange, onlineUsers }) => {
  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        <h4>Rooms</h4>
        <ul className="room-list">
          {DEFAULT_ROOMS.map((room) => (
            <li
              key={room}
              className={room === currentRoom ? "active" : ""}
              onClick={() => onRoomChange(room)}
            >
              # {room}
            </li>
          ))}
        </ul>
      </div>

      <div className="sidebar-section">
        <h4>Online ({onlineUsers.length})</h4>
        <ul className="online-list">
          {onlineUsers.map((u) => (
            <li key={u.userId}>
              <span className="dot online" /> {u.name}
            </li>
          ))}
          {onlineUsers.length === 0 && <li className="muted">No one else here yet</li>}
        </ul>
      </div>
    </aside>
  );
};

export default RoomSidebar;
