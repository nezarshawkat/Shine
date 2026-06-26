import React, { useEffect, useState, useRef, useCallback, useContext } from "react";
import axios from "axios";
import Post from "./Post";
import { SearchContext } from "../../searchContext.jsx";
import { API_BASE_URL, BACKEND_URL } from "../../api";


const FeedA = () => {
  const [articles, setArticles] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  // Access the search query from context
  const { searchQuery } = useContext(SearchContext);

  const observer = useRef();

  /* =====================================================
      RESET FEED ON SEARCH
  ===================================================== */
  useEffect(() => {
    // When search query changes, reset the list and start from page 1
    setArticles([]);
    setPage(1);
    setHasMore(true);
  }, [searchQuery]);

  /* =====================================================
      FETCH ARTICLES
  ===================================================== */
  useEffect(() => {
    const fetchArticles = async () => {
      // Prevent fetching if we are already loading or reached the end
      if (loading) return;
      
      setLoading(true);

      try {
        const res = await axios.get(`${BACKEND_URL}/api/articles`, {
          params: { 
            page, 
            limit: 10,
            search: searchQuery // Pass the search query to the backend
          },
        });

        const { articles: newArticles, metadata } = res.data;

        if (!Array.isArray(newArticles)) {
           setHasMore(false);
           return;
        }

        setArticles((prev) => {
          // If page 1, replace. Otherwise, append.
          if (page === 1) return newArticles;
          
          const existingIds = new Set(prev.map((a) => a.id));
          const filtered = newArticles.filter((a) => !existingIds.has(a.id));
          return [...prev, ...filtered];
        });

        if (metadata) {
          setHasMore(page < metadata.totalPages);
        } else {
          setHasMore(newArticles.length === 10);
        }
      } catch (err) {
        console.error("Failed to fetch articles:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, [page, searchQuery]); // Re-run fetch when page OR searchQuery changes

  /* =====================================================
      INFINITE SCROLL OBSERVER
  ===================================================== */
  const lastArticleRef = useCallback(
    (node) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((prev) => prev + 1);
        }
      });

      if (node) observer.current.observe(node);
    },
    [loading, hasMore]
  );

  return (
    <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "20px", width: "100%", maxWidth: "800px", margin: "0 auto" }}>
      
      {articles.length === 0 && !loading ? (
        <div style={{ textAlign: "center", marginTop: "50px" }}>
          <p>No articles found.</p>
          {searchQuery && <p style={{ fontSize: "14px", color: "#666" }}>Try searching for something else.</p>}
        </div>
      ) : (
        articles.map((article, index) => (
          <div
            key={article.id}
            ref={articles.length === index + 1 ? lastArticleRef : null}
            style={{ width: "100%" }}
          >
            {/* IMPORTANT: Only pass 'article'. 
                Post.jsx internalizes article.author and article._count 
            */}
            <Post article={article} />
          </div>
        ))
      )}

      {loading && <p style={{ textAlign: "center" }}>Loading articles...</p>}

      {!hasMore && articles.length > 0 && (
        <p style={{ textAlign: "center", padding: "40px 0", color: "#666" }}>
          🎉 You've caught up with everything!
        </p>
      )}
    </div>
  );
};

export default FeedA;