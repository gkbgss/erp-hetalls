import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "";
const MessagesContext = createContext();

export function MessagesProvider({ children }) {
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchInbox = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/messages/inbox`);
      setMessages(res.data);
      setUnreadCount(res.data.filter(m => !m.is_read).length);
    } catch (e) { /* not logged in yet, ignore */ }
  }, []);

  // Poll every 20 seconds for new messages
  useEffect(() => {
    fetchInbox();
    const id = setInterval(fetchInbox, 20000);
    return () => clearInterval(id);
  }, [fetchInbox]);

  const markAsRead = async (id) => {
    try {
      await axios.patch(`${API}/api/messages/${id}/read`, {});
      setMessages(prev => prev.map(m => m.id === id ? { ...m, is_read: true } : m));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {}
  };

  const deleteMessage = async (id) => {
    const wasUnread = messages.find(m => m.id === id && !m.is_read);
    try {
      await axios.delete(`${API}/api/messages/${id}`);
      setMessages(prev => prev.filter(m => m.id !== id));
      if (wasUnread) setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {}
  };

  // payload: { recipient_id, subject, content, attachment }
  const sendMessage = async (payload) => {
    await axios.post(`${API}/api/messages/`, payload);
    // Refresh inbox in case they sent to themselves (or for future real-time)
    fetchInbox();
  };

  return (
    <MessagesContext.Provider value={{ messages, unreadCount, markAsRead, deleteMessage, sendMessage, fetchInbox }}>
      {children}
    </MessagesContext.Provider>
  );
}

export function useMessages() {
  const ctx = useContext(MessagesContext);
  if (!ctx) throw new Error("useMessages must be used within a MessagesProvider");
  return ctx;
}
