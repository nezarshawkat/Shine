import React, { useState, useEffect, useContext, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../AuthProvider.jsx";
import SharePopup from "../posts/SharePopup.jsx";
import Header from "../Header.jsx";
import { API_BASE_URL, BACKEND_URL } from "../../api";
import { useLanguage } from "../LanguageProvider.jsx";

// Icons
import heartIcon from "../../assets/Heart.svg";
import heartClickedIcon from "../../assets/HeartC.svg";
import shareIcon from "../../assets/Share.svg";
import saveIcon from "../../assets/Tag.svg";
import saveClickedIcon from "../../assets/TagClicked.svg";
import profileDefault from "../../assets/profileDefault.svg";

// --- Toast Component ---
function Toast({ message, type = "success", onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div style={{
      position: "fixed", bottom: 20, right: 20, left: window.innerWidth < 768 ? 20 : "auto", 
      background: type === "error" ? "#e74c3c" : "#1C274C",
      color: "#fff", padding: "16px 24px", borderRadius: "12px", boxShadow: "0 10px 20px rgba(0,0,0,0.1)",
      zIndex: 5000, fontWeight: 600, animation: "slideIn 0.3s ease-out", textAlign: "center"
    }}>{message}</div>
  );
}

export default function Article() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: loggedInUser } = useContext(AuthContext);

  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [toast, setToast] = useState(null);
  const [isImageFull, setIsImageFull] = useState(false); 
  const [translatedContent, setTranslatedContent] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [showTranslated, setShowTranslated] = useState(false);
  const [isSameLanguage, setIsSameLanguage] = useState(false);
  const { translationLanguage, translateText, detectLanguage } = useLanguage();
  
  const [width, setWidth] = useState(window.innerWidth);
  const isMobile = width < 1024;

  const currentUserId = loggedInUser?.id || loggedInUser?._id;
  const showToast = (message, type = "success") => setToast({ message, type });

  const getFullUrl = (url) => {
    if (!url) return null;
    return url.startsWith('http') ? url : `${BACKEND_URL}${url}`;
  };

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    
    async function fetchData() {
      try {
        const res = await fetch(`${BACKEND_URL}/api/articles/${id}`);
        if (!res.ok) throw new Error("Not found");
        const data = await res.json();
        setArticle(data);

        if (currentUserId) {
          fetch(`${BACKEND_URL}/api/articles/${id}/view?userId=${currentUserId}`, { method: "POST" });
          const [lRes, sRes] = await Promise.all([
            fetch(`${BACKEND_URL}/api/articles/${id}/like-status?userId=${currentUserId}`),
            fetch(`${BACKEND_URL}/api/articles/${id}/save-status?userId=${currentUserId}`)
          ]);
          if (lRes.ok) setIsLiked((await lRes.json()).liked);
          if (sRes.ok) setIsSaved((await sRes.json()).saved);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
    window.scrollTo(0, 0);
    return () => window.removeEventListener("resize", handleResize);
  }, [id, currentUserId]);

  useEffect(() => {
    let mounted = true;
    const resolveLanguageMatch = async () => {
      if (!article?.content || !translationLanguage) return;
      const source = await detectLanguage(article.content);
      if (mounted) setIsSameLanguage(source === translationLanguage);
    };
    resolveLanguageMatch();
    return () => { mounted = false; };
  }, [article?.content, translationLanguage, detectLanguage]);

  // Prevent scroll when image is full screen
  useEffect(() => {
    if (isImageFull) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
  }, [isImageFull]);

  const handleInteraction = async (endpoint, setter) => {
    if (!loggedInUser) return showToast("Please login to interact", "error");
    try {
      const res = await fetch(`${BACKEND_URL}/api/articles/${id}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId }),
      });
      const data = await res.json();
      if (res.ok) {
        setter(data.status);
        setArticle(prev => ({
          ...prev,
          _count: { 
            ...prev._count, 
            likes: data.likesCount ?? prev._count.likes, 
            saves: data.savesCount ?? prev._count.saves 
          }
        }));
      }
    } catch (err) { showToast("Action failed", "error"); }
  };

  const handleDelete = async () => {
    if (!window.confirm("Permanently delete this article? This cannot be undone.")) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/articles/${id}`, { method: "DELETE" });
      if (res.ok) {
        navigate("/articles"); 
      } else {
        showToast("Failed to delete", "error");
      }
    } catch (err) { showToast("Server error during deletion", "error"); }
  };

  const handleTranslateArticle = async () => {
    if (!article?.content) return;
    if (showTranslated) {
      setShowTranslated(false);
      return;
    }
    if (translatedContent) {
      setShowTranslated(true);
      return;
    }
    setIsTranslating(true);
    const translated = await translateText(article.content, translationLanguage);
    setTranslatedContent(translated);
    setShowTranslated(true);
    setIsTranslating(false);
  };

  if (loading) return <div style={fullPageCenter}>Loading Article...</div>;
  if (!article) return <div style={fullPageCenter}>Article not found.</div>;

  const isAuthor = currentUserId && String(currentUserId) === String(article.authorId);
  const author = article.author || { name: "Anonymous", image: profileDefault };
  const mainImage = article.media?.length > 0 ? getFullUrl(article.media[0].url) : getFullUrl(article.image);

  const SidebarContent = () => (
    <div className="article-contributor-card" style={{ 
      padding: isMobile ? "24px" : "32px", 
      borderRadius: "28px", 
      border: "1px solid #F0F0F0", 
      backgroundColor: "#fff", 
      boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
      marginTop: isMobile ? "40px" : "0"
    }}>
      <Link to={`/profile/${author.id}`} style={{ display: "flex", alignItems: "center", textDecoration: "none", marginBottom: "30px" }}>
        <img src={getFullUrl(author.image) || profileDefault} style={{ width: "60px", height: "60px", borderRadius: "50%", objectFit: "cover", marginRight: "16px", border: "1px solid #F0F0F0" }} alt="" />
        <div>
          <h4 className="article-contributor-name" style={{ margin: 0, fontSize: "1.1rem", color: "#1C274C" }}>{author.name}</h4>
          <p className="article-contributor-role" style={{ margin: 0, color: "#888", fontSize: "0.85rem" }}>Contributor</p>
        </div>
      </Link>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <button onClick={() => handleInteraction('like', setIsLiked)} style={sidebarBtn(isLiked ? "#FFE5E5" : "#F5F7FA", isLiked ? "#FF3B3B" : "#1C274C")}>
          <img src={isLiked ? heartClickedIcon : heartIcon} width="20" alt="" />
          {article._count?.likes || 0}
        </button>
        <button onClick={() => setShowShare(true)} style={sidebarBtn("#F5F7FA", "#1C274C")}>
          <img src={shareIcon} width="20" alt="" /> Share
        </button>
        <button onClick={handleTranslateArticle} disabled={isSameLanguage} style={sidebarBtn("#F5F7FA", "#1C274C")}>
          <span style={{ fontSize: 13, fontWeight: 800 }}>{isTranslating ? "..." : showTranslated ? "Original" : "Translate"}</span>
        </button>
        <button onClick={() => handleInteraction('save', setIsSaved)} style={sidebarBtn(isSaved ? "#1C274C" : "#F5F7FA", isSaved ? "#fff" : "#1C274C")}>
          <img src={isSaved ? saveClickedIcon : saveIcon} width="20" style={{ filter: isSaved ? "brightness(0) invert(1)" : "none" }} alt="" />
          {isSaved ? "Saved" : "Save"}
        </button>
      </div>

      {isAuthor && (
        <div style={{ marginTop: "24px", paddingTop: "24px", borderTop: "1px solid #F0F0F0" }}>
          <button onClick={handleDelete} style={controlBtn("#FFF", "#FF3B3B", "#FF3B3B")}>Delete Article</button>
        </div>
      )}
    </div>
  );

  return (
    <div className="article-detail-page" style={{ backgroundColor: "#fff", minHeight: "100vh" }}>
      <Header />
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* High-Quality Image Viewer Overlay */}
      {isImageFull && (
        <div 
          onClick={() => setIsImageFull(false)}
          style={{
            position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
            backgroundColor: "rgba(0,0,0,0.9)", backdropFilter: "blur(10px)",
            zIndex: 10000, display: "flex", justifyContent: "center", alignItems: "center",
            cursor: "zoom-out", padding: "20px"
          }}
        >
          <img 
            src={mainImage} 
            style={{ 
              maxWidth: "100%", 
              maxHeight: "100%", 
              objectFit: "contain", 
              borderRadius: "12px",
              boxShadow: "0 0 50px rgba(0,0,0,0.5)"
            }} 
            alt="View full" 
          />
          <button style={{ 
            position: "absolute", top: 20, right: 20, background: "rgba(255,255,255,0.1)", 
            color: "white", border: "none", borderRadius: "50%", width: "44px", height: "44px",
            fontSize: "24px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            &times;
          </button>
        </div>
      )}

      {/* Removed Blue Spacing: Margin top strictly follows header height */}
      <main style={{ maxWidth: "1300px", margin: "0 auto", padding: isMobile ? "20px" : "40px 24px" }}>
        
        <header className="article-detail-header" style={{ maxWidth: "850px", marginBottom: "40px" }}>
          <h1 className="article-detail-title" style={{ 
            fontSize: isMobile ? "2.2rem" : "3.5rem", 
            fontWeight: "850", 
            letterSpacing: "-0.04em", 
            lineHeight: "1.1", 
            marginBottom: "20px", 
            paddingTop: "50px",
            color: "#1C274C" 
          }}>
            {article.title}
          </h1>
          <div className="article-detail-meta" style={{ display: "flex", alignItems: "center", gap: "15px", color: "#666", fontSize: "1rem" }}>
            <span>{new Date(article.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            <span>•</span>
            <span>{article._count?.views || 0} views</span>
          </div>
        </header>

        {mainImage && (
          <div 
            onClick={() => setIsImageFull(true)}
            style={{ 
              width: "100%", 
              height: isMobile ? "40vh" : "70vh", 
              borderRadius: isMobile ? "20px" : "32px", 
              overflow: "hidden", 
              marginBottom: isMobile ? "30px" : "60px", 
              boxShadow: "0 20px 40px rgba(0,0,0,0.08)",
              cursor: "zoom-in",
              backgroundColor: "#f0f0f0"
            }}
          >
            <img src={mainImage} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
          </div>
        )}

        <div style={{ 
          display: "flex", 
          flexDirection: isMobile ? "column" : "row", 
          gap: isMobile ? "40px" : "80px", 
          alignItems: "flex-start" 
        }}>
          
          <article className="article-detail-content-wrap" style={{ flex: 1, maxWidth: isMobile ? "100%" : "800px", width: "100%" }}>
            <div className="article-detail-content" style={{ fontSize: isMobile ? "1.1rem" : "1.25rem", lineHeight: "1.8", color: "#222", whiteSpace: "pre-wrap" }}>
              {showTranslated && translatedContent ? translatedContent : article.content}
            </div>

            {article.sources?.length > 0 && (
              <div className="article-detail-sources" style={{ 
                marginTop: isMobile ? "40px" : "80px", 
                padding: isMobile ? "24px" : "40px", 
                backgroundColor: "#F8F9FB", 
                borderRadius: "24px", 
                border: "1px solid #E5E9F0",
                width: "100%",
                boxSizing: "border-box"
              }}>
                <h3 style={{ marginBottom: "20px", color: "#1C274C" }}>Sources & References</h3>
                {article.sources.map((s, i) => (
                  <a key={i} href={s.link} target="_blank" rel="noreferrer" style={{ display: "block", color: "#0066FF", textDecoration: "none", marginBottom: "12px", fontWeight: 500 }}>
                    • {s.name}
                  </a>
                ))}
              </div>
            )}

            {isMobile && <SidebarContent />}
          </article>

          {!isMobile && (
            <aside style={{ width: "350px", position: "sticky", top: "100px" }}>
              <SidebarContent />
            </aside>
          )}
        </div>
      </main>

      {showShare && <SharePopup id={article.id} type="article" onClose={() => setShowShare(false)} />}

      <style>{`
        @keyframes slideIn { from { transform: translateX(50px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        button { transition: all 0.2s ease; cursor: pointer; border: none; outline: none; }
        button:hover { transform: translateY(-2px); filter: brightness(0.95); }
        button:active { transform: translateY(0); }
      `}</style>
    </div>
  );
}

// --- Styles ---
const fullPageCenter = { height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", color: "#666" };

const sidebarBtn = (bg, color) => ({
  display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
  padding: "14px", borderRadius: "14px", background: bg, color: color,
  fontWeight: "700", fontSize: "0.95rem"
});

const controlBtn = (bg, color, border = "transparent") => ({
  width: "100%", padding: "14px", borderRadius: "14px", background: bg, color: color,
  fontWeight: "700", border: `1px solid ${border}`, fontSize: "0.95rem"
});
