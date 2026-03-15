import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Send, MoreVertical, Info, Edit2, Trash2, X, ChevronLeft 
} from 'lucide-react';
import profileDefault from "../assets/profileDefault.svg";
import "/workspaces/Shine/frontend/src/styles/MessengerPage.css";

const MessengerPage = ({ currentUser }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(null); 
  const [view, setView] = useState('list'); // 'list' or 'chat' for mobile orientation
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null); 
  const [systemNotifications, setSystemNotifications] = useState([]);

  const scrollRef = useRef();

  const getAuthHeader = () => {
    const token = localStorage.getItem("token");
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  // --- 1. DATA FETCHING ---
  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/messenger/conversations', { headers: getAuthHeader() });
      if (res.ok) setConversations(await res.json());
    } catch (err) { console.error(err); }
  };

  const fetchSystemNotifications = async () => {
    try {
      const res = await fetch(`/api/messenger/system`, { headers: getAuthHeader() });
      if (res.ok) setSystemNotifications(await res.json());
    } catch (err) { console.error(err); }
  };

  const fetchChatHistory = async (partnerId) => {
    try {
      const res = await fetch(`/api/messenger/history/${partnerId}`, { headers: getAuthHeader() });
      if (res.ok) setChatHistory(await res.json());
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchConversations(); fetchSystemNotifications(); }, []);
  useEffect(() => { 
    if (activeTab?.system) {
        setChatHistory(systemNotifications.map((n) => ({ ...n, senderId: "system", text: n.content })));
        setView('chat');
    } else if (activeTab?.id) {
        fetchChatHistory(activeTab.id);
        setView('chat'); // Switch view on mobile when a chat is selected
    } 
  }, [activeTab, systemNotifications]);
  
  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatHistory]);

  // --- 2. SEARCH LOGIC ---
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      const term = searchQuery.trim();
      if (term.length > 0) {
        setIsSearching(true);
        try {
          const res = await fetch(`/api/messenger/search?q=${encodeURIComponent(term)}`, { headers: getAuthHeader() });
          if (res.ok) {
            const data = await res.json();
            setSearchResults(data.filter(u => u.id !== currentUser?.id));
          }
        } catch (err) { console.error(err); } finally { setIsSearching(false); }
      } else { setSearchResults([]); }
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // --- 3. ACTIONS ---
  const handleSendMessage = async () => {
    if (!message.trim() || !activeTab || activeTab.system) return;
    try {
      const res = await fetch('/api/messenger/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ receiverId: activeTab.id, text: message })
      });
      if (res.ok) {
        const newMsg = await res.json();
        setChatHistory(prev => [...prev, newMsg]);
        setMessage("");
        fetchConversations();
      }
    } catch (err) { console.error(err); }
  };

  const deleteMessage = async (msgId) => {
    try {
      const res = await fetch(`/api/messenger/${msgId}`, { method: 'DELETE', headers: getAuthHeader() });
      if (res.ok) setChatHistory(prev => prev.filter(m => m.id !== msgId));
    } catch (err) { console.error(err); }
  };

  // --- 4. HELPERS ---
  const formatMessageDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) return "Today";
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getAvatar = (img) => img ? img : profileDefault;

  // --- 5. RENDER HELPERS ---
  const renderMessagesWithDates = () => {
    let lastDate = null;
    return chatHistory.map((msg) => {
      const currentDate = formatMessageDate(msg.createdAt);
      const showDateSeparator = currentDate !== lastDate;
      lastDate = currentDate;

      return (
        <React.Fragment key={msg.id}>
          {showDateSeparator && <div className="date-separator"><span>{currentDate}</span></div>}
          <div className={`msg-row ${msg.senderId === currentUser.id ? 'sent' : 'received'}`}>
            <div className="msg-bubble-container">
              <div className="msg-bubble">
                {msg.text}
                <span className="msg-time">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                
                {msg.senderId === currentUser.id && (
                  <div className="msg-menu-wrapper">
                    <button className="msg-menu-btn" onClick={() => setOpenMenuId(openMenuId === msg.id ? null : msg.id)}>
                      <MoreVertical size={14} />
                    </button>
                    {openMenuId === msg.id && (
                      <div className="msg-dropdown">
                        <button onClick={() => { /* logic to edit */ }}><Edit2 size={12}/> Edit</button>
                        <button className="delete" onClick={() => deleteMessage(msg.id)}><Trash2 size={12}/> Delete</button>
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
        
        {/* SIDEBAR (List View) */}
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
              {searchQuery.trim() !== "" && (
                <div className="search-results-dropdown">
                  {isSearching ? <div className="p-2">Searching...</div> : 
                    searchResults.map(user => (
                      <div key={user.id} className="search-result-item" onClick={() => { setActiveTab(user); setSearchQuery(""); }}>
                        <img src={getAvatar(user.image)} alt="" />
                        <div><p className="res-name">{user.name}</p><p className="res-user">@{user.username}</p></div>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
          </div>

          <div className="convos-list">
            <div className={`convo-item ${activeTab?.system ? "active" : ""}`} onClick={() => setActiveTab({ id: "__system", system: true, name: "System Notifications", username: "system" })}>
              <img src={profileDefault} alt="" />
              <div className="convo-info"><div className="convo-title"><h4>System Notifications</h4></div><p className="last-msg">{systemNotifications.length} messages</p></div>
            </div>
            {conversations.length > 0 ? conversations.map(conv => (
              <div 
                key={conv.user.id} 
                className={`convo-item ${activeTab?.id === conv.user.id ? 'active' : ''}`}
                onClick={() => setActiveTab(conv.user)}
              >
                <img src={getAvatar(conv.user.image)} alt="" onClick={(e) => { e.stopPropagation(); navigate(`/profile/${conv.user.id}`); }} />
                <div className="convo-info">
                  <div className="convo-title">
                    <h4>{conv.user.name}</h4>
                    <span className="last-time">{new Date(conv.lastMessageDate).toLocaleDateString([], {month: 'short', day: 'numeric'})}</span>
                  </div>
                  <p className="last-msg">{conv.lastMessage}</p>
                </div>
              </div>
            )) : (
                <div className="no-convos">No conversations yet</div>
            )}
          </div>
        </div>

        {/* MAIN CHAT (Chat View) */}
        <div className={`ms-main ${view === 'list' ? 'mobile-hide' : ''}`}>
          {activeTab ? (
            <>
              <div className="chat-header">
                {/* Mobile Back Button */}
                <button className="mobile-back-btn" onClick={() => setView('list')}>
                    <ChevronLeft size={24} />
                </button>

                <div className="user-meta" onClick={() => !activeTab.system && navigate(`/profile/${activeTab.username}`)} style={{cursor: activeTab.system ? "default" : 'pointer'}}>
                  <img src={getAvatar(activeTab.image)} alt="" />
                  <div>
                    <h3>{activeTab.name}</h3>
                    <span>@{activeTab.username}</span>
                  </div>
                </div>
                <div className="header-actions">
                    <div className="dropdown-container">
                      <button className="action-btn"><MoreVertical size={20} /></button>
                      <div className="header-dropdown">
                        <button onClick={() => navigate(`/profile/${activeTab.id}`)}>View Profile</button>
                        <button className="danger">Delete Conversation</button>
                        <button>Block User</button>
                      </div>
                    </div>
                </div>
              </div>

              <div className="chat-window">
                {renderMessagesWithDates()}
                <div ref={scrollRef} />
              </div>

              {!activeTab.system && <div className="chat-input-section">
                <div className="input-inner">
                  <input 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type a message..." 
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
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