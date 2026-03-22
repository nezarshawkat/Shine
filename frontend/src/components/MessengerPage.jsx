import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Search, Send, MoreVertical, Edit2, Trash2, ChevronLeft
} from 'lucide-react';
import profileDefault from "../assets/profileDefault.svg";
import { API_BASE_URL } from "../api";
import "../styles/MessengerPage.css";

const REFRESH_INTERVAL_MS = 5000;

const MessengerPage = ({ currentUser }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(null);
  const [view, setView] = useState('list');
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [systemNotifications, setSystemNotifications] = useState([]);
  const [openHeaderMenu, setOpenHeaderMenu] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [sendError, setSendError] = useState("");

  const unreadSystemCount = systemNotifications.filter((notification) => notification.isRead === false).length;

  const scrollRef = useRef();
  const headerMenuRef = useRef(null);

  const getAuthHeader = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const getErrorMessage = async (res, fallbackMessage) => {
    const contentType = res.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const data = await res.json().catch(() => ({}));
      return data.error || data.message || fallbackMessage;
    }

    const rawText = await res.text().catch(() => '');
    if (rawText.includes('<!doctype') || rawText.includes('<html')) {
      return fallbackMessage;
    }

    return rawText || fallbackMessage;
  };

  const requestJson = async (path, options = {}, fallbackMessage = 'Request failed.') => {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...getAuthHeader(),
        ...(options.headers || {}),
      },
    });

    const contentType = res.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const payload = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null);

    if (!res.ok) {
      const message = typeof payload === 'string'
        ? (payload.includes('<!doctype') || payload.includes('<html') ? fallbackMessage : payload)
        : payload?.error || payload?.message || fallbackMessage;
      throw new Error(message);
    }

    return payload;
  };

  const fetchConversations = async () => {
    try {
      const data = await requestJson('/messenger/conversations', {}, 'Unable to load conversations right now.');
      setConversations(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
  };

  const fetchSystemNotifications = async () => {
    try {
      const data = await requestJson('/messenger/system', {}, 'Unable to load system notifications right now.');
      setSystemNotifications(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
  };

  const markSystemNotificationsAsRead = async () => {
    if (unreadSystemCount === 0) return;

    try {
      const res = await fetch(`${API_BASE_URL}/messenger/system/read-all`, {
        method: 'PATCH',
        headers: getAuthHeader()
      });

      if (res.ok) {
        setSystemNotifications((prev) => prev.map((notification) => ({ ...notification, isRead: true })));
      }
    } catch (err) { console.error(err); }
  };

  const fetchChatHistory = async (partnerId) => {
    try {
      const data = await requestJson(`/messenger/history/${partnerId}`, {}, 'Unable to load this conversation right now.');
      setChatHistory(Array.isArray(data) ? data : []);
      fetchConversations();
      setSendError("");
    } catch (err) {
      console.error(err);
      setSendError(err.message || 'Unable to send your message right now.');
    }
  };

  useEffect(() => { fetchConversations(); fetchSystemNotifications(); }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      fetchConversations();
      fetchSystemNotifications();

      if (activeTab?.id && !activeTab.system) {
        fetchChatHistory(activeTab.id);
      }
    }, REFRESH_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [activeTab?.id, activeTab?.system]);

  useEffect(() => {
    if (activeTab?.system) {
      setChatHistory(systemNotifications.map((n) => ({ ...n, senderId: 'system', text: n.content })));
      setView('chat');
      markSystemNotificationsAsRead();
    } else if (activeTab?.id) {
      fetchChatHistory(activeTab.id);
      setView('chat');
    }
  }, [activeTab, systemNotifications]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatHistory]);

  useEffect(() => {
    const openChatUser = location.state?.openChatUser;
    if (!openChatUser?.id) return;

    const resolvedUser = {
      ...openChatUser,
      image: openChatUser.image
        ? (openChatUser.image.startsWith('http') ? openChatUser.image : `/api${openChatUser.image}`)
        : openChatUser.image,
    };

    setActiveTab(resolvedUser);
    setView('chat');
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      const term = searchQuery.trim();
      if (term.length > 0) {
        setIsSearching(true);
        try {
          const data = await requestJson(`/messenger/search?q=${encodeURIComponent(term)}`, {}, 'Unable to search users right now.');
          setSearchResults((Array.isArray(data) ? data : []).filter((u) => u.id !== currentUser?.id));
        } catch (err) { console.error(err); } finally { setIsSearching(false); }
      } else {
        setSearchResults([]);
      }
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, currentUser?.id]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (headerMenuRef.current && !headerMenuRef.current.contains(e.target)) {
        setOpenHeaderMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openConversation = (user) => {
    setActiveTab(user);
    setView('chat');
    setOpenHeaderMenu(false);
    setSendError("");
    setMessage("");
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !activeTab || activeTab.system) return;
    try {
      setSendError("");
      const res = await fetch(`${API_BASE_URL}/messenger/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ receiverId: activeTab.id, text: message })
      });
      if (res.ok) {
        const newMsg = await res.json();
        setChatHistory((prev) => [...prev, newMsg]);
        setMessage('');
        fetchConversations();
      } else {
        setSendError(await getErrorMessage(res, 'Unable to send your message right now.'));
      }
    } catch (err) { console.error(err); }
  };

  const deleteMessage = async (msgId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/messenger/${msgId}`, { method: 'DELETE', headers: getAuthHeader() });
      if (res.ok) {
        setChatHistory((prev) => prev.filter((m) => m.id !== msgId));
        setOpenMenuId(null);
      }
    } catch (err) { console.error(err); }
  };

  const startEditMessage = (msg) => {
    setEditingMessageId(msg.id);
    setEditingText(msg.text || '');
    setOpenMenuId(null);
  };

  const saveEditedMessage = async (msgId) => {
    if (!editingText.trim()) return;
    try {
      const res = await fetch(`${API_BASE_URL}/messenger/${msgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ text: editingText.trim() })
      });
      if (res.ok) {
        const updated = await res.json();
        setChatHistory((prev) => prev.map((m) => (m.id === msgId ? { ...m, text: updated.text } : m)));
        setEditingMessageId(null);
        setEditingText('');
      }
    } catch (err) { console.error(err); }
  };

  const handleDeleteConversation = async () => {
    if (!activeTab?.id || activeTab.system) return;
    try {
      const res = await fetch(`${API_BASE_URL}/messenger/conversation/${activeTab.id}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });
      if (res.ok) {
        setChatHistory([]);
        setActiveTab(null);
        setOpenHeaderMenu(false);
        fetchConversations();
      }
    } catch (err) { console.error(err); }
  };

  const formatMessageDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) return 'Today';
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getAvatar = (img) => img || profileDefault;

  const formatUnreadLabel = (count, singular) => {
    if (!count) return `0 new ${singular}s`;
    return `${count} new ${singular}${count === 1 ? '' : 's'}`;
  };

  const formatConversationPreview = (conv) => {
    if (!conv) return '';

    if (conv.unreadCount > 0) {
      return `${formatUnreadLabel(conv.unreadCount, 'message')} · ${conv.lastMessage}`;
    }

    return conv.lastMessage || 'No messages yet';
  };

  const renderMessagesWithDates = () => {
    let lastDate = null;
    const currentUserId = currentUser?.id;
    const lastOutgoingMessageId = [...chatHistory].reverse().find((msg) => msg.senderId === currentUserId)?.id;

    return chatHistory.map((msg) => {
      const currentDate = formatMessageDate(msg.createdAt);
      const showDateSeparator = currentDate !== lastDate;
      lastDate = currentDate;
      const showSeenState = msg.senderId === currentUserId && msg.id === lastOutgoingMessageId;

      return (
        <React.Fragment key={msg.id}>
          {showDateSeparator && <div className="date-separator"><span>{currentDate}</span></div>}
          <div className={`msg-row ${msg.senderId === currentUserId ? 'sent' : 'received'}`}>
            <div className="msg-bubble-container">
              <div className="msg-bubble">
                {editingMessageId === msg.id ? (
                  <div className="msg-inline-edit">
                    <input
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEditedMessage(msg.id);
                        if (e.key === 'Escape') {
                          setEditingMessageId(null);
                          setEditingText('');
                        }
                      }}
                    />
                    <button onClick={() => saveEditedMessage(msg.id)}>Save</button>
                    <button
                      className="cancel"
                      onClick={() => {
                        setEditingMessageId(null);
                        setEditingText('');
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  msg.text
                )}

                <span className="msg-time">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {showSeenState && <span className="msg-status">{msg.isRead ? 'Seen' : 'Sent'}</span>}

                {msg.senderId === currentUserId && editingMessageId !== msg.id && (
                  <div className="msg-menu-wrapper">
                    <button className="msg-menu-btn" onClick={() => setOpenMenuId(openMenuId === msg.id ? null : msg.id)}>
                      <MoreVertical size={14} />
                    </button>
                    {openMenuId === msg.id && (
                      <div className="msg-dropdown">
                        <button onClick={() => startEditMessage(msg)}><Edit2 size={12} /> Edit</button>
                        <button className="delete" onClick={() => deleteMessage(msg.id)}><Trash2 size={12} /> Delete</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </React.Fragment>
      );
    });
  };

  if (!currentUser) return <div className="loading">Loading...</div>;

  return (
    <div className={`messenger-fixed-layout ${view === 'chat' ? 'mobile-chat-active' : 'mobile-list-active'}`}>
      <div className="shine-messenger">
        <div className={`ms-sidebar ${view === 'chat' ? 'mobile-hide' : ''}`}>
          <div className="ms-sidebar-header">
            <h2>Messages</h2>
            <div className="ms-search-container">
              <div className="search-input-wrapper">
                <Search size={18} className="search-icon" />
                <input
                  placeholder="Search usernames..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              {searchQuery.trim() !== '' && (
                <div className="search-results-dropdown">
                  {isSearching ? (
                    <div className="p-2">Searching...</div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((user) => (
                      <div key={user.id} className="search-result-item" onClick={() => { openConversation(user); setSearchQuery(''); }}>
                        <img src={getAvatar(user.image)} alt="" />
                        <div><p className="res-name">{user.name}</p><p className="res-user">@{user.username}</p></div>
                      </div>
                    ))
                  ) : (
                    <div className="p-2">No users found</div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="convos-list">
            <div className={`convo-item ${activeTab?.system ? 'active' : ''}`} onClick={() => openConversation({ id: '__system', system: true, name: 'System Notifications', username: 'system' })}>
              <img src={profileDefault} alt="" />
              <div className="convo-info">
                <div className="convo-title">
                  <h4>System Notifications</h4>
                  {unreadSystemCount > 0 && <span className="unread-badge">{unreadSystemCount}</span>}
                </div>
                <p className="last-msg">{formatUnreadLabel(unreadSystemCount, 'notification')}</p>
              </div>
            </div>
            {conversations.length > 0 ? conversations.map((conv) => (
              <div
                key={conv.user.id}
                className={`convo-item ${activeTab?.id === conv.user.id ? 'active' : ''}`}
                onClick={() => openConversation(conv.user)}
              >
                <img src={getAvatar(conv.user.image)} alt="" onClick={(e) => { e.stopPropagation(); navigate(`/profile/${conv.user.id}`); }} />
                <div className="convo-info">
                  <div className="convo-title">
                    <h4>{conv.user.name}</h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {conv.unreadCount > 0 && <span className="unread-badge">{conv.unreadCount}</span>}
                      <span className="last-time">{new Date(conv.lastMessageDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                    </div>
                  </div>
                  <p className="last-msg">
                    {formatConversationPreview(conv)}
                  </p>
                </div>
              </div>
            )) : (
              <div className="no-convos">No conversations yet</div>
            )}
          </div>
        </div>

        <div className={`ms-main ${view === 'list' ? 'mobile-hide' : ''}`}>
          {activeTab ? (
            <>
              <div className="chat-header">
                <button className="mobile-back-btn" onClick={() => setView('list')}>
                  <ChevronLeft size={24} />
                </button>

                <div className="user-meta" onClick={() => !activeTab.system && navigate(`/profile/${activeTab.username}`)} style={{ cursor: activeTab.system ? 'default' : 'pointer' }}>
                  <img src={getAvatar(activeTab.image)} alt="" />
                  <div>
                    <h3>{activeTab.name}</h3>
                    <span>@{activeTab.username}</span>
                  </div>
                </div>
                {!activeTab.system && (
                  <div className="header-actions">
                    <div className="dropdown-container" ref={headerMenuRef}>
                      <button className="action-btn" onClick={() => setOpenHeaderMenu((prev) => !prev)}><MoreVertical size={20} /></button>
                      {openHeaderMenu && (
                        <div className="header-dropdown">
                          <button className="danger" onClick={handleDeleteConversation}>Delete Conversation</button>
                          <button>Block User</button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="chat-window">
                {renderMessagesWithDates()}
                <div ref={scrollRef} />
              </div>

              {!activeTab.system && <div className="chat-input-section">
                {sendError ? <div className="chat-error-banner">{sendError}</div> : null}
                <div className="input-inner">
                  <input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type a message..."
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <button onClick={handleSendMessage} className="text-send-btn" disabled={!message.trim()}>
                    <Send size={20} />
                  </button>
                </div>
              </div>}
            </>
          ) : (
            <div className="empty-chat">
              <div className="empty-icon-circle"><Send size={44} /></div>
              <h2>Select a Chat</h2>
              <p>Search for friends or select an existing conversation to start messaging.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessengerPage;
