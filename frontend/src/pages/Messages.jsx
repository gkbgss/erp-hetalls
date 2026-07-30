import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useMessages } from '../context/MessagesContext';
import { Search, MessageSquare, Clock, Trash2, MoreVertical, Plus, Users, Paperclip, X, Image as ImageIcon, Send, CheckCircle, Mic, Square, ArrowLeft } from 'lucide-react';
import '../index.css';

const API = import.meta.env.VITE_API_URL || '';

export default function Messages() {
  const { user } = useAuth();
  const { messages, markAsRead, deleteMessage, sendMessage } = useMessages();

  const [sentMessages, setSentMessages] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [showDirectory, setShowDirectory] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState(null);
  
  const [composeBody, setComposeBody] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState(null);
  const [sendError, setSendError] = useState('');
  const fileInputRef = useRef(null);

  const [activeMenuMsg, setActiveMenuMsg] = useState(null);
  const [deletedForMeIds, setDeletedForMeIds] = useState(() => {
    try {
      const saved = localStorage.getItem(`hetalls_deleted_for_me_${user?.id || 'default'}`);
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  const handleDeleteForMe = (msg) => {
    const nextIds = [...deletedForMeIds, msg.id];
    setDeletedForMeIds(nextIds);
    try {
      localStorage.setItem(`hetalls_deleted_for_me_${user?.id || 'default'}`, JSON.stringify(nextIds));
    } catch (e) {}
    setActiveMenuMsg(null);
  };

  const handleDeleteForEveryone = async (msg) => {
    try {
      await axios.delete(`${API}/api/messages/${msg.id}`);
      if (deleteMessage) deleteMessage(msg.id);
      setSentMessages(prev => prev.filter(m => m.id !== msg.id));
      setActiveMenuMsg(null);
    } catch (e) {
      alert("Could not delete message from server.");
    }
  };

  useEffect(() => {
    if (!attachment) {
      setAttachmentPreviewUrl(null);
      return;
    }
    if ((attachment.type && (attachment.type.startsWith('image/') || attachment.type.startsWith('video/'))) || (attachment.name && attachment.name.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg|mp4|mov|avi|mkv|webm)$/i))) {
      try {
        const url = URL.createObjectURL(attachment);
        setAttachmentPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
      } catch (e) {
        setAttachmentPreviewUrl(null);
      }
    } else {
      setAttachmentPreviewUrl(null);
    }
  }, [attachment]);

  const isImageAttachment = (att) => {
    if (!att) return false;
    try {
      const lower = decodeURIComponent(String(att)).toLowerCase();
      return lower.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)($|\?|&)/) || lower.includes('image') || lower.includes('photo') || lower.includes('.jpg') || lower.includes('.png') || lower.includes('.jpeg') || lower.includes('.webp') || lower.includes('.gif');
    } catch (e) {
      const lower = String(att).toLowerCase();
      return lower.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)($|\?|&)/) || lower.includes('.jpg') || lower.includes('.png') || lower.includes('.jpeg') || lower.includes('.webp') || lower.includes('.gif');
    }
  };

  const isAudioAttachment = (att) => {
    if (!att) return false;
    try {
      const lower = decodeURIComponent(String(att)).toLowerCase();
      return lower.match(/\.(webm|mp3|wav|ogg|m4a|aac)($|\?|&)/) || lower.includes('voice_memo');
    } catch (e) {
      const lower = String(att).toLowerCase();
      return lower.match(/\.(webm|mp3|wav|ogg|m4a|aac)($|\?|&)/) || lower.includes('voice_memo');
    }
  };

  const isVideoAttachment = (att) => {
    if (!att) return false;
    try {
      const lower = decodeURIComponent(String(att)).toLowerCase();
      return lower.match(/\.(mp4|mov|avi|mkv|m4v)($|\?|&)/) && !isAudioAttachment(att);
    } catch (e) {
      const lower = String(att).toLowerCase();
      return lower.match(/\.(mp4|mov|avi|mkv|m4v)($|\?|&)/) && !isAudioAttachment(att);
    }
  };

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    axios.get(`${API}/api/users/`).then(res => setUsers(res.data)).catch(() => {});
  }, []);

  const fetchSent = () => {
    axios.get(`${API}/api/messages/sent`).then(res => setSentMessages(res.data)).catch(() => {});
  };
  useEffect(() => {
    fetchSent();
    const id = setInterval(fetchSent, 20000);
    return () => clearInterval(id);
  }, []);

  const combined = [
    ...messages.map(m => ({ ...m, type: 'received', partnerId: m.sender_id, partnerName: m.sender_name || m.sender })),
    ...sentMessages.map(m => ({ ...m, type: 'sent', partnerId: m.recipient_id, partnerName: m.recipient_name }))
  ].filter(m => !deletedForMeIds.includes(m.id)).sort((a, b) => new Date(a.created_at || a.date) - new Date(b.created_at || b.date));

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [combined.length, selectedPartner]);

  useEffect(() => {
    if (selectedPartner) {
      const unreadReceived = messages.filter(m => m.sender_id === selectedPartner.id && !m.is_read);
      unreadReceived.forEach(m => markAsRead(m.id));
    }
  }, [selectedPartner, messages, markAsRead]);

  useEffect(() => {
    if (selectedPartner) {
      document.body.classList.add('chat-active');
    } else {
      document.body.classList.remove('chat-active');
    }
    return () => document.body.classList.remove('chat-active');
  }, [selectedPartner]);

  const conversationsMap = new Map();
  combined.forEach(m => {
    const partnerId = m.partnerId;
    if (!conversationsMap.has(partnerId)) {
      conversationsMap.set(partnerId, {
        id: partnerId,
        name: m.partnerName || 'Unknown User',
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.partnerName || 'Unknown'}`,
        latestMessage: m,
        unreadCount: 0
      });
    } else {
      const conv = conversationsMap.get(partnerId);
      conv.latestMessage = m;
    }
  });
  
  messages.forEach(m => {
    if (!m.is_read && conversationsMap.has(m.sender_id)) {
      conversationsMap.get(m.sender_id).unreadCount += 1;
    }
  });

  const conversations = Array.from(conversationsMap.values())
    .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      const aUnread = a.unreadCount > 0 ? 1 : 0;
      const bUnread = b.unreadCount > 0 ? 1 : 0;
      if (aUnread !== bUnread) return bUnread - aUnread;
      const dA = new Date((a.latestMessage.created_at || a.latestMessage.date || '').replace(' ', 'T'));
      const dB = new Date((b.latestMessage.created_at || b.latestMessage.date || '').replace(' ', 'T'));
      return dB - dA;
    });

  const handleSelectPartner = (partner) => {
    setSelectedPartner(partner);
    setShowDirectory(false);
    setComposeBody('');
    removeAttachment();
    setSendError('');
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

  
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([audioBlob], `voice_memo_${Date.now()}.webm`, { type: 'audio/webm' });
        setAttachment(file);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (err) {
      console.error("Error accessing microphone", err);
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerIntervalRef.current);
    }
  };

  const formatRecordingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const removeAttachment = () => {
    setAttachment(null);
    setAttachmentPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async () => {
    if ((!composeBody.trim() && !attachment && !isRecording) || !selectedPartner) return;
    setSendError('');
    try {
      let attachmentUrl = null;
      if (attachment) {
        const formData = new FormData();
        formData.append('file', attachment);
        const res = await axios.post(`${API}/api/messages/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        const fileName = res.data.name || attachment.name || "file";
        const sep = res.data.url.includes('?') ? '&' : '?';
        attachmentUrl = `${res.data.url}${sep}filename=${encodeURIComponent(fileName)}`;
      }
      const messageContent = composeBody.trim() || (attachment ? `Shared file: ${attachment.name}` : "Voice Memo");
      await sendMessage({
        recipient_id: selectedPartner.id,
        subject: "Chat Message",
        content: messageContent,
        attachment: attachmentUrl,
      });
      fetchSent();
      setComposeBody('');
      removeAttachment();
    } catch (e) {
      setSendError('Failed to send. Please try again.');
    }
  };


  const formatTime = (iso) => {
    const d = new Date(iso);
    const t = new Date();
    if (d.toDateString() === t.toDateString()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  const getAvatar = (seed) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;

  const currentChatMessages = selectedPartner ? combined.filter(m => m.partnerId === selectedPartner.id) : [];

  return (
    <div className="messages-layout">
      {/* Left Pane - Chat List */}
      <div className={`messages-sidebar card ${selectedPartner ? 'mobile-hide' : ''}`} style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="messages-header" style={{ paddingBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2>Chats</h2>
            <button
              className={`icon-btn ${showDirectory ? 'active' : ''}`}
              onClick={() => setShowDirectory(!showDirectory)}
              title="New Chat"
              style={{ background: 'var(--gold)', color: '#000', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Plus size={20} />
            </button>
          </div>

          <div className="search-box">
            <Search size={16} />
            <input type="text" placeholder="Search chats..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
        </div>

        <div className="message-list" style={{ flex: 1, overflowY: 'auto' }}>
          {showDirectory ? (
            <div className="user-directory">
              <div style={{ padding: '10px 20px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                <Users size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} /> DIRECTORY
              </div>
              {users.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase())).map(u => (
                <div key={u.id} className="directory-item" onClick={() => handleSelectPartner({ id: u.id, name: u.name, avatar: getAvatar(u.name) })}>
                  <img src={getAvatar(u.name)} alt={u.name} className="message-avatar" />
                  <div className="directory-info">
                    <span className="sender-name">{u.name}</span>
                    <span className="sender-role" style={{ fontSize: '0.75rem' }}>{u.role}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {conversations.length === 0 ? (
                <div className="no-messages" style={{ textAlign: 'center', marginTop: 40, color: 'var(--text-muted)' }}>
                  <MessageSquare size={32} style={{ opacity: 0.5, marginBottom: 12 }} />
                  <p>No active chats.</p>
                  <p style={{ fontSize: 13 }}>Click + to start a new conversation.</p>
                </div>
              ) : (
                conversations.map(conv => (
                  <div
                    key={conv.id}
                    className={`message-item ${selectedPartner?.id === conv.id ? 'selected' : ''}`}
                    onClick={() => handleSelectPartner(conv)}
                    style={{ position: 'relative', padding: '16px 20px' }}
                  >
                    <div style={{ position: 'relative' }}>
                      <img src={conv.avatar} alt={conv.name} className="message-avatar" />
                      {conv.unreadCount > 0 && (
                        <div style={{ position: 'absolute', top: 0, right: 0, width: 12, height: 12, background: 'var(--danger)', borderRadius: '50%', border: '2px solid var(--bg-surface)' }} />
                      )}
                    </div>
                    <div className="message-preview" style={{ flex: 1, overflow: 'hidden', marginLeft: 12 }}>
                      <div className="message-sender-row">
                        <span className="sender-name" style={{ color: conv.unreadCount > 0 ? '#fff' : 'inherit' }}>{conv.name}</span>
                        <span className="message-time">{formatTime(conv.latestMessage.created_at || conv.latestMessage.date).split(' ')[0]}</span>
                      </div>
                      <div className="message-snippet" style={{ color: conv.unreadCount > 0 ? '#fff' : 'var(--text-muted)', fontWeight: conv.unreadCount > 0 ? 500 : 400 }}>
                        {conv.latestMessage.type === 'sent' ? 'You: ' : ''}{(conv.latestMessage.content || '').substring(0, 40)}...
                      </div>
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </div>

      {/* Right Pane - Chat History */}
      <div className={`message-detail-pane card ${!selectedPartner ? 'mobile-hide' : 'mobile-active'}`} style={{ display: 'flex', flexDirection: 'column' }}>
        {selectedPartner ? (
          <>
            {/* Chat Header */}
            <div className="chat-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button className="icon-btn mobile-back-btn" onClick={() => setSelectedPartner(null)} style={{ padding: 4, marginRight: 4, color: 'var(--gold)' }} title="Back to chats">
                  <ArrowLeft size={20} />
                </button>
                <img src={selectedPartner.avatar} alt={selectedPartner.name} style={{ width: 40, height: 40, borderRadius: '50%' }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: 16 }}>{selectedPartner.name}</h3>
                </div>
              </div>
              <button className="icon-btn" onClick={() => setSelectedPartner(null)} title="Close"><X size={20} /></button>
            </div>

            {/* Chat Bubbles Area */}
            <div className="chat-history" style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {currentChatMessages.length === 0 ? (
                <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <p>No messages yet. Send a message to start the conversation!</p>
                </div>
              ) : (
                currentChatMessages.map(msg => {
                  const isSent = msg.type === 'sent';
                  return (
                    <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isSent ? 'flex-end' : 'flex-start', maxWidth: '100%' }}>
                      <div 
                        onDoubleClick={() => setActiveMenuMsg(msg)}
                        onContextMenu={(e) => { e.preventDefault(); setActiveMenuMsg(msg); }}
                        title="Double-click or right-click for options (Delete/Unsend)"
                        style={{
                          background: isSent ? 'var(--gold)' : 'rgba(255,255,255,0.08)',
                          color: isSent ? '#000' : '#fff',
                          padding: '10px 14px 6px 14px',
                          borderRadius: isSent ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                          maxWidth: '85%',
                          minWidth: '100px',
                          lineHeight: 1.4,
                          position: 'relative',
                          wordBreak: 'break-word',
                          overflowWrap: 'anywhere',
                          boxShadow: '0 2px 5px rgba(0,0,0,0.15)',
                          cursor: 'pointer',
                          transition: 'transform 0.1s, box-shadow 0.1s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 2px 5px rgba(0,0,0,0.15)'; }}
                      >
                        <div style={{ marginBottom: '4px' }}>
                          {msg.content.split('\n').map((line, i) => (
                            <React.Fragment key={i}>
                              {line}
                              {i < msg.content.split('\n').length - 1 && <br />}
                            </React.Fragment>
                          ))}
                        </div>
                        {isAudioAttachment(msg.attachment) ? (
                          <div style={{ marginTop: 8 }}>
                            <audio controls src={msg.attachment.startsWith('/') ? `${API}${msg.attachment}` : msg.attachment} style={{ height: 32, maxWidth: 220 }} />
                          </div>
                        ) : isVideoAttachment(msg.attachment) ? (
                          <div style={{ marginTop: 8, borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.15)', maxWidth: '100%', background: '#000' }}>
                            <video controls src={msg.attachment.startsWith('/') ? `${API}${msg.attachment}` : msg.attachment} style={{ maxHeight: 300, maxWidth: '100%', display: 'block', margin: '0 auto', borderRadius: 6 }} />
                          </div>
                        ) : isImageAttachment(msg.attachment) ? (
                          <div style={{ marginTop: 8, borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.15)', maxWidth: '100%', background: 'rgba(0,0,0,0.2)' }}>
                            <a href={msg.attachment.startsWith('/') ? `${API}${msg.attachment}` : msg.attachment} target="_blank" rel="noopener noreferrer" style={{ display: 'block', cursor: 'pointer' }}>
                              <img 
                                src={msg.attachment.startsWith('/') ? `${API}${msg.attachment}` : msg.attachment} 
                                alt="Shared attachment" 
                                style={{ maxHeight: 260, maxWidth: '100%', objectFit: 'contain', display: 'block', margin: '0 auto', borderRadius: 6 }} 
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = 'flex';
                                }}
                              />
                              <div style={{ display: 'none', padding: '8px 10px', alignItems: 'center', gap: 8, fontSize: 13, color: 'inherit' }}>
                                <Paperclip size={15} style={{ flexShrink: 0 }} />
                                <span style={{ textDecoration: 'underline', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {msg.attachment.startsWith('/') ? 'View Attachment' : msg.attachment}
                                </span>
                              </div>
                            </a>
                          </div>
                        ) : msg.attachment ? (
                          <div style={{ marginTop: 8, padding: '8px 10px', background: isSent ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.2)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, maxWidth: '100%', overflow: 'hidden' }}>
                            <Paperclip size={15} style={{ flexShrink: 0 }} /> 
                            <a href={msg.attachment.startsWith('/') ? `${API}${msg.attachment}` : msg.attachment} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', maxWidth: 'calc(100% - 24px)', fontWeight: 500 }}>
                              {msg.attachment.startsWith('/') ? 'View Attachment' : msg.attachment}
                            </a>
                          </div>
                        ) : null}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'flex-end',
                          alignItems: 'center',
                          marginTop: '4px',
                          fontSize: '10px',
                          opacity: isSent ? 0.65 : 0.5,
                          fontWeight: 500,
                          letterSpacing: '0.2px'
                        }}>
                          {formatTime(msg.created_at || msg.date)}
                          {isSent && <CheckCircle size={11} style={{ marginLeft: '4px', opacity: 0.8 }} />}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Compose Area */}
            <div className="chat-compose" style={{ padding: '20px 24px', borderTop: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
              {attachment && (
                <div className="attachment-preview" style={{ marginBottom: 12, background: 'rgba(255,255,255,0.08)', padding: '10px 14px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, border: '1px solid var(--border)', maxWidth: 'fit-content' }}>
                  {attachmentPreviewUrl ? (
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
                      {isVideoAttachment(attachment.name) ? (
                        <video src={attachmentPreviewUrl} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', flexShrink: 0, background: '#000' }} />
                      ) : (
                        <img src={attachmentPreviewUrl} alt="upload preview" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', flexShrink: 0 }} />
                      )}
                      <div style={{ overflow: 'hidden' }}>
                        <span className="attachment-name" style={{ fontWeight: 600, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220, color: '#fff' }}>{attachment.name}</span>
                        <span style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 500 }}>{isVideoAttachment(attachment.name) ? 'Video Ready to Send' : 'Image Ready to Send'}</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Paperclip size={16} style={{ color: 'var(--gold)' }} />
                      <span className="attachment-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220, fontWeight: 500 }}>{attachment.name}</span>
                    </div>
                  )}
                  <button className="icon-btn" onClick={removeAttachment} style={{ padding: 4, marginLeft: 8, background: 'rgba(255,255,255,0.1)', borderRadius: '50%', color: '#fff' }} title="Remove attachment"><X size={14} /></button>
                </div>
              )}
              {sendError && <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 8 }}>{sendError}</p>}
              
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, background: 'rgba(255,255,255,0.05)', padding: '12px 16px', borderRadius: 24, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', gap: 4, paddingBottom: 4 }}>
                  <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleAttachment} />
                  <button className="icon-btn" onClick={() => fileInputRef.current?.click()} style={{ padding: 4 }} title="Attach File"><Paperclip size={18} /></button>

                {!isRecording ? (
                  <button className="icon-btn" onClick={startRecording} style={{ padding: 4 }} title="Record Voice Memo"><Mic size={18} /></button>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--danger)' }}>
                    <span style={{ fontSize: 13, fontWeight: 500, minWidth: 40 }}>{formatRecordingTime(recordingTime)}</span>
                    <button className="icon-btn" onClick={stopRecording} style={{ padding: 4, color: 'var(--danger)' }} title="Stop Recording"><Square size={18} fill="currentColor" /></button>
                  </div>
                )}

                </div>
                
                <textarea 
                  placeholder="Type a message..." 
                  value={composeBody} 
                  onChange={e => setComposeBody(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  style={{ flex: 1, background: 'transparent', border: 'none', color: '#fff', resize: 'none', outline: 'none', minHeight: 24, maxHeight: 120, padding: '4px 0', fontFamily: 'inherit' }}
                  rows={1}
                />
                
                <button 
                  onClick={handleSend} 
                  disabled={!composeBody.trim()}
                  style={{ 
                    background: composeBody.trim() ? 'var(--gold)' : 'rgba(255,255,255,0.1)', 
                    color: composeBody.trim() ? '#000' : 'rgba(255,255,255,0.4)', 
                    border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: composeBody.trim() ? 'pointer' : 'default', transition: 'all 0.2s'
                  }}
                >
                  <Send size={16} style={{ marginLeft: 2 }} />
                </button>
              </div>
              <div className="chat-help-text" style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 8 }}>
                Press Enter to send, Shift + Enter for new line
              </div>
            </div>
          </>
        ) : (
          <div className="empty-state" style={{ margin: 'auto' }}>
            <MessageSquare size={48} className="empty-icon" />
            <h3>Your Chats</h3>
            <p>Select a chat from the left or start a new conversation.</p>
          </div>
        )}
      </div>

      {/* ── Double-Click Message Action Modal (Unsend / Delete) ── */}
      {activeMenuMsg && (
        <div 
          onClick={() => setActiveMenuMsg(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="card"
            style={{
              background: '#1e2330',
              border: '1px solid var(--border)',
              borderRadius: 16,
              padding: '20px 24px',
              maxWidth: 380,
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: 6 }}>
              <h3 style={{ fontSize: 18, color: '#fff', marginBottom: 4 }}>Message Options</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%', background: 'rgba(255,255,255,0.05)', padding: '6px 10px', borderRadius: 6, fontStyle: 'italic' }}>
                "{activeMenuMsg.content || (activeMenuMsg.attachment ? 'Attachment / Media' : 'Message')}"
              </p>
            </div>

            <button
              onClick={() => handleDeleteForEveryone(activeMenuMsg)}
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                border: '1px solid #ef4444',
                padding: '12px 16px',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'; e.currentTarget.style.color = '#ef4444'; }}
            >
              <Trash2 size={18} />
              Delete for Everyone (Unsend)
            </button>

            <button
              onClick={() => handleDeleteForMe(activeMenuMsg)}
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
                padding: '12px 16px',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'; }}
            >
              <Trash2 size={18} style={{ opacity: 0.7 }} />
              Delete for Me
            </button>

            <button
              onClick={() => setActiveMenuMsg(null)}
              style={{
                background: 'transparent',
                color: 'var(--text-muted)',
                border: 'none',
                padding: '10px 16px',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                marginTop: 4,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
