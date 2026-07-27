import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useMessages } from '../context/MessagesContext';
import { Search, Mail, Clock, Trash2, Reply, MoreVertical, Plus, Users, Paperclip, X, Image as ImageIcon } from 'lucide-react';
import '../index.css';

export default function Messages() {
  const { API, user } = useAuth();
  const { messages, markAsRead, deleteMessage, sendMessage } = useMessages();
  
  const [selectedId, setSelectedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [users, setUsers] = useState([]);
  const [showDirectory, setShowDirectory] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [composeTo, setComposeTo] = useState(null);
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [attachment, setAttachment] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    // Fetch registered users
    if (API) {
      axios.get(`${API}/api/users/`)
        .then(res => setUsers(res.data))
        .catch(console.error);
    } else {
      // Mock for development without backend
      setUsers([
        { id: '1', name: 'Admin User', role: 'Admin', department: 'IT' },
        { id: '2', name: 'Sarah Jenkins', role: 'Sales Representative', department: 'Sales' },
        { id: '3', name: 'David Chen', role: 'Warehouse Manager', department: 'Operations' }
      ]);
    }
  }, [API]);

  const filteredMessages = messages.filter(m => {
    const sender = (m.sender_name || m.sender || '').toLowerCase();
    const subject = (m.subject || '').toLowerCase();
    const dept = (m.sender_dept || m.department || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    return sender.includes(q) || subject.includes(q) || dept.includes(q);
  });

  const selectedMessage = messages.find(m => m.id === selectedId);

  const handleSelectMessage = (id) => {
    setIsComposing(false);
    setShowDirectory(false);
    setSelectedId(id);
    markAsRead(id);
  };

  const startNewMessage = (targetUser) => {
    setComposeTo(targetUser);
    setIsComposing(true);
    setShowDirectory(false);
    setSelectedId(null);
    setComposeSubject('');
    setComposeBody('');
    removeAttachment();
  };

  const handleAttachment = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // 10 MB limit
    if (file.size > 10 * 1024 * 1024) {
      alert("File size exceeds 10 MB limit.");
      e.target.value = '';
      return;
    }
    setAttachment(file);
  };

  const removeAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const [sendError, setSendError] = useState('');

  const handleSend = async () => {
    if (!composeBody.trim()) return;
    setSendError('');
    try {
      if (isComposing && composeTo) {
        // Send to a specific recipient via the real API
        await sendMessage({
          recipient_id: composeTo.id,
          subject: composeSubject || 'No Subject',
          content: composeBody,
          attachment: attachment ? attachment.name : null,
        });
      } else if (selectedMessage) {
        // Reply: send back to the original sender
        await sendMessage({
          recipient_id: selectedMessage.sender_id,
          subject: `Re: ${selectedMessage.subject}`,
          content: composeBody,
          attachment: attachment ? attachment.name : null,
        });
      }
      setComposeBody('');
      setComposeSubject('');
      setIsComposing(false);
      removeAttachment();
    } catch (e) {
      setSendError('Failed to send. Please try again.');
    }
  };

  const formatTime = (isoString) => {
    const date = new Date(isoString);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Helper to normalise field names between old mock format and real API format
  const getSender = (msg) => msg.sender_name || msg.sender || 'Unknown';
  const getAvatar = (msg) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${getSender(msg)}`;
  const isUnread = (msg) => msg.is_read === false || msg.isRead === false;

  return (
    <div className="messages-layout">
      {/* Left Pane - Message List */}
      <div className="messages-sidebar card">
        <div className="messages-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2>Inbox</h2>
            <button 
              className={`icon-btn ${showDirectory ? 'active' : ''}`} 
              onClick={() => { setShowDirectory(!showDirectory); setIsComposing(false); }} 
              title="New Message"
            >
              <Plus size={20} />
            </button>
          </div>
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
        
        {showDirectory ? (
          <div className="user-directory">
            <div style={{ padding: '10px 20px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              <Users size={14} style={{marginRight: 6, verticalAlign: 'middle'}}/> REGISTERED USERS
            </div>
            {users.map(u => (
              <div key={u.id || u.email} className="directory-item" onClick={() => startNewMessage(u)}>
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`} alt={u.name} className="message-avatar" />
                <div className="directory-info">
                  <span className="sender-name">{u.name}</span>
                  <span className="sender-role" style={{fontSize: '0.75rem'}}>{u.role} &bull; {u.department}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="message-list">
            {filteredMessages.length === 0 ? (
              <div className="no-messages">
                <p style={{marginBottom: 16}}>No messages found.</p>
              </div>
            ) : (
              filteredMessages.map(msg => (
                <div 
                  key={msg.id} 
                  className={`message-item ${msg.id === selectedId && !isComposing ? 'selected' : ''} ${isUnread(msg) ? 'unread' : ''}`}
                  onClick={() => handleSelectMessage(msg.id)}
                >
                  <img src={getAvatar(msg)} alt={getSender(msg)} className="message-avatar" />
                  <div className="message-preview">
                    <div className="message-sender-row">
                      <span className="sender-name">{getSender(msg)}</span>
                      <span className="message-time">{formatTime(msg.created_at || msg.date)}</span>
                    </div>
                    <div className="message-subject">{msg.subject}</div>
                    <div className="message-snippet">{(msg.content || '').substring(0, 60)}...</div>
                  </div>
                  {isUnread(msg) && <div className="unread-dot" />}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Right Pane - Message Detail / Compose */}
      <div className="message-detail-pane card">
        {isComposing ? (
          <div className="compose-wrapper">
            <div className="compose-header">
              <h3>New Message</h3>
              <button className="icon-btn" onClick={() => setIsComposing(false)}><X size={20}/></button>
            </div>
            <div className="compose-field">
              <label>To:</label>
              <div className="compose-recipient">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${composeTo?.name}`} alt="" className="detail-avatar" style={{width: 24, height: 24}}/>
                <span>{composeTo?.name}</span>
              </div>
            </div>
            <div className="compose-field">
              <label>Subject:</label>
              <input 
                type="text" 
                placeholder="Message Subject" 
                value={composeSubject}
                onChange={e => setComposeSubject(e.target.value)}
              />
            </div>
            <div className="compose-body">
              <textarea 
                placeholder="Write your message..." 
                value={composeBody}
                onChange={e => setComposeBody(e.target.value)}
              />
            </div>
            
            {attachment && (
              <div className="attachment-preview">
                <Paperclip size={14} />
                <span className="attachment-name">{attachment.name}</span>
                <span className="attachment-size">({(attachment.size / 1024 / 1024).toFixed(2)} MB)</span>
                <button className="icon-btn" onClick={removeAttachment}><X size={14}/></button>
              </div>
            )}
            
            {sendError && <p style={{color: 'var(--danger)', fontSize: 13, marginTop: 8}}>{sendError}</p>}
            <div className="compose-actions">
              <div className="attachment-tools">
                <input 
                  type="file" 
                  ref={fileInputRef}
                  style={{display: 'none'}} 
                  onChange={handleAttachment}
                />
                <button className="icon-btn" onClick={() => fileInputRef.current?.click()} title="Attach File (< 10MB)">
                  <Paperclip size={18} />
                </button>
                <button className="icon-btn" onClick={() => fileInputRef.current?.click()} title="Attach Image (< 10MB)">
                  <ImageIcon size={18} />
                </button>
              </div>
              <button className="btn btn-primary" onClick={handleSend} disabled={!composeBody.trim()}>Send Message</button>
            </div>
          </div>
        ) : selectedMessage ? (
          <div className="message-content-wrapper">
            <div className="message-detail-header">
            <div className="detail-sender-info">
              <img src={getAvatar(selectedMessage)} alt={getSender(selectedMessage)} className="detail-avatar" />
              <div>
                <h3>{getSender(selectedMessage)}</h3>
                <span className="sender-role">{selectedMessage.sender_role || selectedMessage.role} &bull; {selectedMessage.sender_dept || selectedMessage.department}</span>
              </div>
            </div>
            <div className="message-actions">
              <button className="icon-btn" onClick={() => setComposeTo({id: selectedMessage.sender_id, name: getSender(selectedMessage)})}><Reply size={18} /></button>
              <button className="icon-btn" onClick={() => { deleteMessage(selectedMessage.id); setSelectedId(null); }}><Trash2 size={18} /></button>
              <button className="icon-btn"><MoreVertical size={18} /></button>
            </div>
          </div>
          
          <div className="message-subject-lg">
            <h2>{selectedMessage.subject}</h2>
            <span className="detail-time"><Clock size={14} style={{marginRight: 4}}/> {new Date(selectedMessage.created_at || selectedMessage.date).toLocaleString()}</span>
          </div>
            
            <div className="message-body">
              {selectedMessage.content.split('\n').map((line, i) => (
                <p key={i} style={{minHeight: '1em'}}>{line}</p>
              ))}
              {selectedMessage.attachment && (
                <div className="message-attachment">
                  <Paperclip size={16} />
                  <span>{selectedMessage.attachment}</span>
                </div>
              )}
            </div>
            
            <div className="message-reply-box">
              <textarea 
                placeholder="Write a reply..." 
                rows={4} 
                value={composeBody}
                onChange={e => setComposeBody(e.target.value)}
              />
              
              {attachment && (
                <div className="attachment-preview">
                  <Paperclip size={14} />
                  <span className="attachment-name">{attachment.name}</span>
                  <span className="attachment-size">({(attachment.size / 1024 / 1024).toFixed(2)} MB)</span>
                  <button className="icon-btn" onClick={removeAttachment}><X size={14}/></button>
                </div>
              )}
              
              <div className="reply-actions" style={{display: 'flex', justifyContent: 'space-between', marginTop: 12}}>
                <div className="attachment-tools">
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    style={{display: 'none'}} 
                    onChange={handleAttachment}
                  />
                  <button className="icon-btn" onClick={() => fileInputRef.current?.click()} title="Attach File (< 10MB)">
                    <Paperclip size={18} />
                  </button>
                  <button className="icon-btn" onClick={() => fileInputRef.current?.click()} title="Attach Image (< 10MB)">
                    <ImageIcon size={18} />
                  </button>
                </div>
                <button className="btn btn-primary" onClick={handleSend} disabled={!composeBody.trim()}>Send Reply</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <Mail size={48} className="empty-icon" />
            <h3>Select a message</h3>
            <p>Choose a message from the list to read it, or click the <Plus size={14} style={{display: 'inline', verticalAlign: 'middle'}}/> icon to start a new chat.</p>
          </div>
        )}
      </div>
    </div>
  );
}
