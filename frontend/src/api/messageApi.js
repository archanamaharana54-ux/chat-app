import api from "./axios";

export const getRoomMessages = (room, params) => api.get(`/messages/${room}`, { params });
