import React, { useState } from 'react';
import { useMessages } from '../context/MessagesContext';
import { Search, Mail, MailOpen, Clock, Trash2, Reply, MoreVertical } from 'lucide-react';
import '../index.css';

export default function Messages() {
  const { messages, markAsRead, deleteMessage } = useMessages();
  const [selectedId, setSelectedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMessages = messages.filter(m => 
    m.sender.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedMessage = messages.find(m => m.id === selectedId);

  const handleSelectMessage = (id) => {
    setSelectedId(id);
    markAsRead(id);
  };

  const formatTime = (isoString) => {
    const date = new Date(isoString);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="messages-layout">
      {/* Left Pane - Message List */}
      <div className="messages-sidebar card">
        <div className="messages-header">
          <h2>Inbox</h2>
          <div className="search-box">
            <Search size={16} />
            <input 
              type="text" 
              placeholder="Search messages..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        <div className="message-list">
          {filteredMessages.length === 0 ? (
            <div className="no-messages">No messages found.</div>
          ) : (
            filteredMessages.map(msg => (
              <div 
                key={msg.id} 
                className={`message-item ${msg.id === selectedId ? 'selected' : ''} ${!msg.isRead ? 'unread' : ''}`}
                onClick={() => handleSelectMessage(msg.id)}
              >
                <img src={msg.avatar} alt={msg.sender} className="message-avatar" />
                <div className="message-preview">
                  <div className="message-sender-row">
                    <span className="sender-name">{msg.sender}</span>
                    <span className="message-time">{formatTime(msg.date)}</span>
                  </div>
                  <div className="message-subject">{msg.subject}</div>
                  <div className="message-snippet">{msg.content.substring(0, 60)}...</div>
                </div>
                {!msg.isRead && <div className="unread-dot" />}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Pane - Message Detail */}
      <div className="message-detail-pane card">
        {selectedMessage ? (
          <div className="message-content-wrapper">
            <div className="message-detail-header">
              <div className="detail-sender-info">
                <img src={selectedMessage.avatar} alt={selectedMessage.sender} className="detail-avatar" />
                <div>
                  <h3>{selectedMessage.sender}</h3>
                  <span className="sender-role">{selectedMessage.role} &bull; {selectedMessage.department}</span>
                </div>
              </div>
              <div className="message-actions">
                <button className="icon-btn"><Reply size={18} /></button>
                <button className="icon-btn" onClick={() => deleteMessage(selectedMessage.id)}><Trash2 size={18} /></button>
                <button className="icon-btn"><MoreVertical size={18} /></button>
              </div>
            </div>
            
            <div className="message-subject-lg">
              <h2>{selectedMessage.subject}</h2>
              <span className="detail-time"><Clock size={14} style={{marginRight: 4}}/> {new Date(selectedMessage.date).toLocaleString()}</span>
            </div>
            
            <div className="message-body">
              {selectedMessage.content.split('\n').map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
            
            <div className="message-reply-box">
              <textarea placeholder="Write a reply..." rows={4} />
              <div className="reply-actions">
                <button className="btn btn-primary">Send Reply</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <Mail size={48} className="empty-icon" />
            <h3>Select a message</h3>
            <p>Choose a message from the list to read it.</p>
          </div>
        )}
      </div>
    </div>
  );
}
