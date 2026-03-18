import React, { useContext } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

// Providers
import { AuthProvider, AuthContext } from "./components/AuthProvider.jsx";
import { SearchProvider } from "/workspaces/Shine/frontend/src/searchContext.jsx";

// Pages
import LandingPage from "./components/LandingPage.jsx"; 
import Forum from "./components/Forum.jsx";
import Communities from "./components/Communities.jsx";
import Articles from "./components/Articles.jsx";
import Article from "/workspaces/Shine/frontend/src/components/articles/article.jsx";
import Events from "./components/Events.jsx";
import ContactPage from "./components/ContactPage.jsx";
import FollowersPage from "./components/FollowersPage.jsx";
import FollowingPage from "./components/FollowingPage.jsx";
import FriendsPage from "./components/FriendsPage.jsx";
import ArticleCreate from "./components/articles/articleCreate.jsx";

// Layout
import Header from "./components/Header.jsx";

// Community & Posts
import CommunityProfile from "./components/communities/CommunityProfile.jsx";
import PostView from "./components/PostView/PostView.jsx";

// Create pages
import OpinionCreate from "./components/PostCreate/opinionCreate.jsx";
import AnalysisCreate from "./components/PostCreate/analysisCreate.jsx";
import CritiqueCreate from "./components/PostCreate/critiqueCreate.jsx";
import PollCreate from "./components/PostCreate/pollCreate.jsx";

// Other pages
import CommunityForm from "./components/CommunityForm.jsx";
import InvitePeople from "./components/InvitePeople.jsx";
import Compost from "./components/Compost.jsx";
import ArticleApply from "./components/ArticleApply.jsx";
import Donate from "./components/Donate.jsx";
import MessengerPage from "./components/MessengerPage.jsx";
import AdminApp from "./admin/AdminApp/AdminApp.jsx";

// Auth & Profile
import ProfilePageWrapper from "./components/ProfilePageWrapper.jsx";
import SignUp from "./components/SignUp.jsx";
import LogIn from "./components/LogIn.jsx";

// ==========================================================
// Component to handle Route-based Logic (like hiding Header)
// ==========================================================
function AppRoutes() {
  const location = useLocation();
  
  // 1. Extract user from context to pass to pages that need it
  const { user } = useContext(AuthContext);

  // List of routes where the Header should not be visible
  const hideHeaderRoutes = [
    "/login",
    "/signup",
    "/opinion-create",
    "/analysis-create",
    "/critique-create",
    "/poll-create",
    "/create-community",
    "/invite-people",
    "/article-apply",
    "/compost",
    "/admin",
    "/admin/login",
    "/admin/dashboard",
    "/admin/users",
    "/admin/posts",
    "/admin/events",
    "/admin/communities",
    "/admin/reports",
    "/admin/analytics",
    "/admin/settings",
    "/admin/system-messages",
    "admin/content-moderation",
    "admin/feedback",
    "admin/logs",
    "admin/maintenance",
    "admin/roles",
    "admin/permissions",
    "admin/audit-logs",
    "admin/api-keys",
    "admin/integrations",
    "admin/themes",
    "admin/customization",
    "admin/appearance",
    "admin/navigation",
    "admin/widgets",
    "admin/ads",
    "admin/monetization",
    "admin/subscriptions",
    "admin/payments",
    "admin/billing",
    "admin/invoices",
    "admin/coupons",
    "admin/discounts",
    "admin/promotions",
    "admin/affiliates",
    "admin/referrals",
    "admin/analytics",
    "admin/reports",
    "admin/insights",
    "admin/dashboard",
    "/admin/support",
    "/admin/knowledge-base",
    "/admin/tickets",
    "/admin/chat",
    "/admin/notifications",
    "/admin/announcements",
    "/admin/updates",
    "/admin/releases",
    "/admin/roadmap",
    "/admin/feedback",
    "/admin/suggestions",
    "/admin/voting",
    "/admin/polls",
    "/admin/surveys",
    "/admin/forms",
    "/admin/qa",
    "/admin/discussions",
    "/admin/forums",
    "/admin/community",
    "/admin/posts",
    "/admin/users",
    "/admin/events",
    "/admin/analytics",
    "/admin/settings",
    "/admin/logs",
    "/admin/maintenance",
    "/admin/roles",
    "/admin/permissions",
    "/admin/audit-logs",
    "/admin/api-keys",
    "/admin/integrations",
    "/admin/themes",
    "/admin/customization",
    "/admin/appearance",
    "/admin/navigation",
    "/admin/widgets",
    "/admin/ads",
    "/admin/monetization",
    "/admin/subscriptions",
    "/admin/payments",
    "/admin/billing",
    "/admin/invoices",
    "/admin/article-applications",
  ];

  const hideHeader = hideHeaderRoutes.includes(location.pathname);

  return (
    <>
      {/* Conditionally render Header based on current path */}
      {!hideHeader && <Header />}

      <Routes>
        {/* Main Navigation */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/forum/*" element={<Forum />} />
        <Route path="/communities" element={<Communities />} />
        <Route path="/events" element={<Events />} />
        <Route path="/contact" element={<ContactPage />} />

        {/* Auth */}
        <Route path="/login" element={<LogIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/admin/*" element={<AdminApp />} />

        {/* Articles */}
        <Route path="/articles" element={<Articles />} />
        <Route path="/article/:id" element={<Article />} />

        {/* Dynamic Profiles & Views */}
        <Route path="/community/:communityId" element={<CommunityProfile />} />
        <Route path="/post/:postId" element={<PostView />} />
        <Route path="/profile/:username" element={<ProfilePageWrapper />} />
        <Route path="/profile" element={<ProfilePageWrapper />} />
        <Route path="/:username/followers" element={<FollowersPage />} />
        <Route path="/:username/following" element={<FollowingPage />} />
        <Route path="/:username/friends" element={<FriendsPage />} />
        <Route path="/donate" element={<Donate />} />
        
        {/* Creation Routes */}
        <Route path="/opinion-create" element={<OpinionCreate />} />
        <Route path="/analysis-create" element={<AnalysisCreate />} />
        <Route path="/critique-create" element={<CritiqueCreate />} />
        <Route path="/poll-create" element={<PollCreate />} />
        <Route path="/create-community" element={<CommunityForm />} />
        <Route path="/create-article" element={<ArticleCreate />} />
        
        {/* FIX: Messenger now receives the currentUser from Context */}
        <Route path="/messenger" element={<MessengerPage currentUser={user} />} />
        
        {/* Utility Routes */}
        <Route path="/invite-people" element={<InvitePeople />} />
        <Route path="/compost" element={<Compost />} />
        <Route path="/article-apply" element={<ArticleApply />} />
      </Routes>
    </>
  );
}

// ==========================================================
// Main Entry Point with Context Providers
// ==========================================================
export default function App() {
  return (
    <AuthProvider>
      <SearchProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </SearchProvider>
    </AuthProvider>
  );
}