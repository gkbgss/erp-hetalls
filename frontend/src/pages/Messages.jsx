import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useMessages } from '../context/MessagesContext';
import { Search, Mail, Clock, Trash2, Reply, MoreVertical, Plus, Users, Paperclip, X, Image as ImageIcon, Send, CheckCircle } from 'lucide-react';
import '../index.css';

const API = import.meta.env.VITE_API_URL || '';

export default function Messages() {
  const { user } = useAuth();
  const { messages, markAsRead, deleteMessage, sendMessage } = useMessages();

  const [tab, setTab] = useState('inbox');           // 'inbox' | 'sent'
  const [sentMessages, setSentMessages] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [showDirectory, setShowDirectory] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [composeTo, setComposeTo] = useState(null);
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [sendError, setSendError] = useState('');
  const [sendSuccess, setSendSuccess] = useState('');
  const fileInputRef = useRef(null);

  // Fetch registered users for directory
  useEffect(() => {
    axios.get(`${API}/api/users/`).then(res => setUsers(res.data)).catch(() => {});
  }, []);

  // Fetch sent messages
  const fetchSent = () => {
    axios.get(`${API}/api/messages/sent`).then(res => setSentMessages(res.data)).catch(() => {});
  };
  useEffect(() => {
    fetchSent();
    const id = setInterval(fetchSent, 20000);
    return () => clearInterval(id);
  }, []);

  const activeList = tab === 'inbox' ? messages : sentMessages;

  const filteredMessages = activeList.filter(m => {
    const name = tab === 'inbox'
      ? (m.sender_name || m.sender || '').toLowerCase()
      : (m.recipient_name || '').toLowerCase();
    const subject = (m.subject || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    return name.includes(q) || subject.includes(q);
  });

  const selectedMessage = activeList.find(m => m.id === selectedId);

  const handleSelectMessage = (id) => {
    setIsComposing(false);
    setShowDirectory(false);
    setSelectedId(id);
    if (tab === 'inbox') markAsRead(id);
  };

  const startNewMessage = (targetUser) => {
    setComposeTo(targetUser);
    setIsComposing(true);
    setShowDirectory(false);
    setSelectedId(null);
    setComposeSubject('');
    setComposeBody('');
    removeAttachment();
    setSendError('');
    setSendSuccess('');
  };

  const handleAttachment = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds 10 MB limit.');
      e.target.value = '';
      return;
    }
    setAttachment(file);
  };

  const removeAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async () => {
    if (!composeBody.trim()) return;
    setSendError('');
    setSendSuccess('');
    try {
      const recipientId = isComposing ? composeTo?.id : selectedMessage?.sender_id;
      if (!recipientId) { setSendError('No recipient selected.'); return; }
      await sendMessage({
        recipient_id: recipientId,
        subject: isComposing ? (composeSubject || 'No Subject') : `Re: ${selectedMessage?.subject}`,
        content: composeBody,
        attachment: attachment ? attachment.name : null,
      });
      fetchSent();
      setSendSuccess(`Message sent to ${isComposing ? composeTo?.name : selectedMessage?.sender_name || 'recipient'}!`);
      setComposeBody('');
      setComposeSubject('');
      setIsComposing(false);
      removeAttachment();
      setTab('sent');
    } catch (e) {
      setSendError('Failed to send. Please try again.');
    }
  };

  const formatTime = (iso) => {
    const d = new Date(iso);
    const t = new Date();
    if (d.toDateString() === t.toDateString()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getSender = (msg) => msg.sender_name || msg.sender || 'Unknown';
  const getAvatar = (seed) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
  const isUnread = (msg) => msg.is_read === false;

  return (
    <div className="messages-layout">
      {/* Left Pane */}
      <div className="messages-sidebar card">
        <div className="messages-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2>Messages</h2>
            <button
              className={`icon-btn ${showDirectory ? 'active' : ''}`}
              onClick={() => { setShowDirectory(!showDirectory); setIsComposing(false); }}
              title="New Message"
            >
              <Plus size={20} />
            </button>
          </div>

          {/* Inbox / Sent Tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button
              onClick={() => { setTab('inbox'); setSelectedId(null); setShowDirectory(false); }}
              style={{
                flex: 1, padding: '6px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: tab === 'inbox' ? 'rgba(255,255,255,0.12)' : 'transparent',
                color: tab === 'inbox' ? '#fff' : 'var(--text-muted)',
              }}
            >
              Inbox {messages.filter(m => !m.is_read).length > 0 && (
                <span style={{ background: 'var(--danger)', color: '#fff', fontSize: 11, borderRadius: 10, padding: '1px 6px', marginLeft: 4 }}>
                  {messages.filter(m => !m.is_read).length}
                </span>
              )}
            </button>
            <button
              onClick={() => { setTab('sent'); setSelectedId(null); setShowDirectory(false); }}
              style={{
                flex: 1, padding: '6px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: tab === 'sent' ? 'rgba(255,255,255,0.12)' : 'transparent',
                color: tab === 'sent' ? '#fff' : 'var(--text-muted)',
              }}
            >
              Sent {sentMessages.length > 0 && (
                <span style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 11, borderRadius: 10, padding: '1px 6px', marginLeft: 4 }}>
                  {sentMessages.length}
                </span>
              )}
            </button>
          </div>

          <div className="search-box">
            <Search size={16} />
            <input type="text" placeholder="Search messages..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
        </div>

        {showDirectory ? (
          <div className="user-directory">
            <div style={{ padding: '10px 20px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              <Users size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} /> REGISTERED USERS
            </div>
            {users.map(u => (
              <div key={u.id || u.email} className="directory-item" onClick={() => startNewMessage(u)}>
                <img src={getAvatar(u.name)} alt={u.name} className="message-avatar" />
                <div className="directory-info">
                  <span className="sender-name">{u.name}</span>
                  <span className="sender-role" style={{ fontSize: '0.75rem' }}>{u.role} &bull; {u.department}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="message-list">
            {filteredMessages.length === 0 ? (
              <div className="no-messages">
                <p style={{ marginBottom: 16 }}>
                  {tab === 'sent' ? 'No sent messages yet.' : 'No messages found.'}
                </p>
                {tab === 'sent' && (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Click <strong>+</strong> to send your first message.</p>
                )}
              </div>
            ) : (
              filteredMessages.map(msg => (
                <div
                  key={msg.id}
                  className={`message-item ${msg.id === selectedId && !isComposing ? 'selected' : ''} ${tab === 'inbox' && isUnread(msg) ? 'unread' : ''}`}
                  onClick={() => handleSelectMessage(msg.id)}
                >
                  <img src={getAvatar(tab === 'inbox' ? getSender(msg) : (msg.recipient_name || 'User'))} alt="" className="message-avatar" />
                  <div className="message-preview">
                    <div className="message-sender-row">
                      <span className="sender-name">
                        {tab === 'inbox' ? getSender(msg) : `To: ${msg.recipient_name || 'User'}`}
                      </span>
                      <span className="message-time">{formatTime(msg.created_at || msg.date)}</span>
                    </div>
                    <div className="message-subject">{msg.subject}</div>
                    <div className="message-snippet">{(msg.content || '').substring(0, 60)}...</div>
                  </div>
                  {tab === 'inbox' && isUnread(msg) && <div className="unread-dot" />}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Right Pane */}
      <div className="message-detail-pane card">
        {sendSuccess && (
          <div style={{
            position: 'absolute', top: 24, right: 24, zIndex: 100,
            background: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981',
            borderRadius: 12, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10,
            color: '#10b981', fontSize: 14, fontWeight: 600,
          }}>
            <CheckCircle size={18} /> {sendSuccess}
          </div>
        )}

        {isComposing ? (
          <div className="compose-wrapper">
            <div className="compose-header">
              <h3>New Message</h3>
              <button className="icon-btn" onClick={() => setIsComposing(false)}><X size={20} /></button>
            </div>
            <div className="compose-field">
              <label>To:</label>
              <div className="compose-recipient">
                <img src={getAvatar(composeTo?.name)} alt="" className="detail-avatar" style={{ width: 24, height: 24 }} />
                <span>{composeTo?.name}</span>
              </div>
            </div>
            <div className="compose-field">
              <label>Subject:</label>
              <input type="text" placeholder="Message Subject" value={composeSubject} onChange={e => setComposeSubject(e.target.value)} />
            </div>
            <div className="compose-body">
              <textarea placeholder="Write your message..." value={composeBody} onChange={e => setComposeBody(e.target.value)} />
            </div>
            {attachment && (
              <div className="attachment-preview">
                <Paperclip size={14} />
                <span className="attachment-name">{attachment.name}</span>
                <span className="attachment-size">({(attachment.size / 1024 / 1024).toFixed(2)} MB)</span>
                <button className="icon-btn" onClick={removeAttachment}><X size={14} /></button>
              </div>
            )}
            {sendError && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{sendError}</p>}
            <div className="compose-actions">
              <div className="attachment-tools">
                <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleAttachment} />
                <button className="icon-btn" onClick={() => fileInputRef.current?.click()} title="Attach File (< 10MB)"><Paperclip size={18} /></button>
                <button className="icon-btn" onClick={() => fileInputRef.current?.click()} title="Attach Image (< 10MB)"><ImageIcon size={18} /></button>
              </div>
              <button className="btn btn-primary" onClick={handleSend} disabled={!composeBody.trim()}>
                <Send size={15} style={{ marginRight: 6 }} /> Send Message
              </button>
            </div>
          </div>
        ) : selectedMessage ? (
          <div className="message-content-wrapper">
            <div className="message-detail-header">
              <div className="detail-sender-info">
                <img src={getAvatar(tab === 'inbox' ? getSender(selectedMessage) : (selectedMessage.recipient_name || 'User'))} alt="" className="detail-avatar" />
                <div>
                  <h3>{tab === 'inbox' ? getSender(selectedMessage) : `To: ${selectedMessage.recipient_name || 'User'}`}</h3>
                  <span className="sender-role">
                    {tab === 'inbox'
                      ? `${selectedMessage.sender_role || ''} • ${selectedMessage.sender_dept || ''}`
                      : `Sent ${new Date(selectedMessage.created_at).toLocaleString()}`}
                  </span>
                </div>
              </div>
              <div className="message-actions">
                {tab === 'inbox' && (
                  <button className="icon-btn" title="Reply" onClick={() => {
                    setComposeTo({ id: selectedMessage.sender_id, name: getSender(selectedMessage) });
                    setIsComposing(true);
                    setComposeSubject(`Re: ${selectedMessage.subject}`);
                    setComposeBody('');
                    setSelectedId(null);
                  }}><Reply size={18} /></button>
                )}
                <button className="icon-btn" onClick={() => { deleteMessage(selectedMessage.id); setSelectedId(null); }}><Trash2 size={18} /></button>
                <button className="icon-btn"><MoreVertical size={18} /></button>
              </div>
            </div>

            <div className="message-subject-lg">
              <h2>{selectedMessage.subject}</h2>
              <span className="detail-time"><Clock size={14} style={{ marginRight: 4 }} /> {new Date(selectedMessage.created_at || selectedMessage.date).toLocaleString()}</span>
            </div>

            <div className="message-body">
              {selectedMessage.content.split('\n').map((line, i) => (
                <p key={i} style={{ minHeight: '1em' }}>{line}</p>
              ))}
              {selectedMessage.attachment && (
                <div className="message-attachment">
                  <Paperclip size={16} />
                  <span>{selectedMessage.attachment}</span>
                </div>
              )}
            </div>

            {tab === 'inbox' && (
              <div className="message-reply-box">
                <textarea placeholder="Write a reply..." rows={4} value={composeBody} onChange={e => setComposeBody(e.target.value)} />
                {attachment && (
                  <div className="attachment-preview">
                    <Paperclip size={14} />
                    <span className="attachment-name">{attachment.name}</span>
                    <span className="attachment-size">({(attachment.size / 1024 / 1024).toFixed(2)} MB)</span>
                    <button className="icon-btn" onClick={removeAttachment}><X size={14} /></button>
                  </div>
                )}
                {sendError && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{sendError}</p>}
                <div className="reply-actions" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
                  <div className="attachment-tools">
                    <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleAttachment} />
                    <button className="icon-btn" onClick={() => fileInputRef.current?.click()} title="Attach File"><Paperclip size={18} /></button>
                    <button className="icon-btn" onClick={() => fileInputRef.current?.click()} title="Attach Image"><ImageIcon size={18} /></button>
                  </div>
                  <button className="btn btn-primary" onClick={handleSend} disabled={!composeBody.trim()}>
                    <Send size={15} style={{ marginRight: 6 }} /> Send Reply
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="empty-state">
            <Mail size={48} className="empty-icon" />
            <h3>{tab === 'sent' ? 'No message selected' : 'Select a message'}</h3>
            <p>Choose a message from the list to read it, or click the <Plus size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> icon to start a new chat.</p>
          </div>
        )}
      </div>
    </div>
  );
}
