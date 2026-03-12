import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "./Header";
import LeftSidebar from "./forum/LeftSidebar";
import RightSidebar from "./forum/RightSidebar";
import Feed from "./forum/Feed";
import PostView from "./PostView/PostView";
import "../styles/Forum.css";

export default function Forum() {
  const { postId } = useParams();
  const navigate = useNavigate();

  const [selectedPostId, setSelectedPostId] = useState(postId || null);
  const [feed, setFeed] = useState([]);

  const scrollPosRef = useRef(0);

  useEffect(() => {
    setSelectedPostId(postId || null);
  }, [postId]);

  const handleSelectPost = (id) => {
    scrollPosRef.current = window.scrollY;
    setSelectedPostId(id);
    navigate(`/forum/post/${id}`);
    window.scrollTo(0, 0);
  };

  const handleBack = () => {
    setSelectedPostId(null);
    navigate("/forum");

    setTimeout(() => {
      window.scrollTo({
        top: scrollPosRef.current,
        behavior: "instant",
      });
    }, 0);
  };

  return (
    <div className="forum-page">
      <Header />

      <div className="forum-container">
        <aside className="left-column">
          <LeftSidebar />
        </aside>

        <main className="center-column">
          {selectedPostId ? (
            <PostView postId={selectedPostId} goBack={handleBack} />
          ) : (
            <div className="feed-scroll">
              <Feed
                onSelectPost={handleSelectPost}
                feed={feed}
                setFeed={setFeed}
              />
            </div>
          )}
        </main>

        <aside className="right-column">
          <RightSidebar />
        </aside>
      </div>
    </div>
  );
}