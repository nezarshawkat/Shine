import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import API from "../api.js";

const SITE_NAME = "Shine";
const BASE_URL = "https://sshine.org";

const DEFAULT_DESCRIPTION =
  "Shine is a social platform for forum discussions, communities, thoughtful articles, and meaningful connections.";

const STATIC_SEO = {
  "/": {
    title: `${SITE_NAME} - Home`,
    description: DEFAULT_DESCRIPTION,
  },
  "/forum": {
    title: `${SITE_NAME} - Forum`,
    description: "Join trending conversations, opinions, analysis, critiques, and polls on Shine Forum.",
  },
  "/forum/trending": {
    title: `${SITE_NAME} - Trending`,
    description: "Discover the most trending hashtags and topics in Shine Forum.",
  },
  "/communities": {
    title: `${SITE_NAME} - Communities`,
    description: "Explore and join communities that match your interests on Shine.",
  },
  "/articles": {
    title: `${SITE_NAME} - Articles`,
    description: "Read insightful articles from the Shine community.",
  },
  "/events": {
    title: `${SITE_NAME} - Events`,
    description: "Browse upcoming events and community activities on Shine.",
  },
  "/contact": {
    title: `${SITE_NAME} - Contact`,
    description: "Contact the Shine team.",
  },
  "/privacypolicy": {
    title: `${SITE_NAME} - Privacy Policy`,
    description: "Read Shine's privacy policy.",
  },
  "/terms&conditions": {
    title: `${SITE_NAME} - Terms & Conditions`,
    description: "Read Shine's terms and conditions.",
  },
  "/donate": {
    title: `${SITE_NAME} - Donate`,
    description: "Support the Shine platform and its community.",
  },
};

const NO_INDEX_PREFIXES = [
  "/login",
  "/signup",
  "/messenger",
  "/admin",
  "/opinion-create",
  "/analysis-create",
  "/critique-create",
  "/poll-create",
  "/create-community",
  "/create-article",
  "/invite-people",
  "/compost",
  "/article-apply",
];

function ensureMetaTag(name, content) {
  if (!content) return;
  let tag = document.querySelector(`meta[name="${name}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("name", name);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

function ensureCanonical(href) {
  let tag = document.querySelector('link[rel="canonical"]');
  if (!tag) {
    tag = document.createElement("link");
    tag.setAttribute("rel", "canonical");
    document.head.appendChild(tag);
  }
  tag.setAttribute("href", href);
}

function buildPostTitle(postText = "") {
  const cleaned = String(postText).replace(/\s+/g, " ").trim();
  const preview = cleaned.split(" ").slice(0, 9).join(" ");
  return preview ? `${SITE_NAME} - ${preview}${cleaned.split(" ").length > 9 ? "..." : ""}` : `${SITE_NAME} - Post`;
}

export default function SeoManager() {
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;

    const applySeo = ({ title, description }) => {
      if (cancelled) return;
      document.title = title || SITE_NAME;
      ensureMetaTag("description", description || DEFAULT_DESCRIPTION);
      const canonicalUrl = `${BASE_URL}${location.pathname}`;
      ensureCanonical(canonicalUrl);

      const shouldNoIndex = NO_INDEX_PREFIXES.some(
        (prefix) => location.pathname === prefix || location.pathname.startsWith(`${prefix}/`),
      );
      ensureMetaTag("robots", shouldNoIndex ? "noindex, nofollow" : "index, follow");
    };

    const staticSeo = STATIC_SEO[location.pathname];
    if (staticSeo) {
      applySeo(staticSeo);
      return () => {
        cancelled = true;
      };
    }

    if (location.pathname.startsWith("/article/")) {
      const articleId = location.pathname.split("/article/")[1];
      API.get(`/articles/${articleId}`)
        .then((res) => {
          const title = res.data?.title || "Article";
          const description = String(res.data?.content || DEFAULT_DESCRIPTION).slice(0, 160);
          applySeo({ title: `${SITE_NAME} - ${title}`, description });
        })
        .catch(() => applySeo({ title: `${SITE_NAME} - Article`, description: DEFAULT_DESCRIPTION }));
      return () => {
        cancelled = true;
      };
    }

    if (location.pathname.startsWith("/profile/")) {
      const username = location.pathname.split("/profile/")[1];
      if (!username) {
        applySeo({ title: `${SITE_NAME} - Profile`, description: "View your profile on Shine." });
      } else {
        API.get(`/users/${username}`)
          .then((res) => {
            const name = res.data?.name || username;
            const description = res.data?.description || `View ${name}'s profile on Shine.`;
            applySeo({ title: `${SITE_NAME} - ${name}`, description });
          })
          .catch(() => applySeo({ title: `${SITE_NAME} - ${username}`, description: DEFAULT_DESCRIPTION }));
      }
      return () => {
        cancelled = true;
      };
    }

    if (location.pathname.startsWith("/community/")) {
      const communityId = location.pathname.split("/community/")[1];
      API.get(`/communities/${communityId}`)
        .then((res) => {
          const name = res.data?.name || "Community";
          const description = res.data?.discription || `Join ${name} on Shine communities.`;
          applySeo({ title: `${SITE_NAME} - ${name}`, description });
        })
        .catch(() => applySeo({ title: `${SITE_NAME} - Community`, description: DEFAULT_DESCRIPTION }));
      return () => {
        cancelled = true;
      };
    }

    if (location.pathname.startsWith("/post/")) {
      const postId = location.pathname.split("/post/")[1];
      API.get(`/posts/${postId}`)
        .then((res) => {
          applySeo({
            title: buildPostTitle(res.data?.text),
            description: String(res.data?.text || "Read this Shine forum post.").slice(0, 160),
          });
        })
        .catch(() => applySeo({ title: `${SITE_NAME} - Post`, description: DEFAULT_DESCRIPTION }));
      return () => {
        cancelled = true;
      };
    }

    if (location.pathname.startsWith("/forum/post/")) {
      const postId = location.pathname.split("/forum/post/")[1];
      API.get(`/posts/${postId}`)
        .then((res) => {
          applySeo({
            title: buildPostTitle(res.data?.text),
            description: String(res.data?.text || "Read this Shine forum post.").slice(0, 160),
          });
        })
        .catch(() => applySeo({ title: `${SITE_NAME} - Post`, description: DEFAULT_DESCRIPTION }));
      return () => {
        cancelled = true;
      };
    }

    const followMatch = location.pathname.match(/^\/([^/]+)\/(followers|following|friends)$/);
    if (followMatch) {
      const [, username, section] = followMatch;
      const sectionTitle = section.charAt(0).toUpperCase() + section.slice(1);
      applySeo({
        title: `${SITE_NAME} - ${username} ${sectionTitle}`,
        description: `View ${username}'s ${section} on Shine.`,
      });
      return () => {
        cancelled = true;
      };
    }

    applySeo({ title: `${SITE_NAME}`, description: DEFAULT_DESCRIPTION });
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  return null;
}
