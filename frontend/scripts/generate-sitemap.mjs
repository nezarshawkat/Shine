import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, "..", "public");

const SITE_URL = "https://sshine.org";
const API_URL = process.env.SITEMAP_API_URL || `${SITE_URL}/api`;
const lastmod = new Date().toISOString().split("T")[0];

const STATIC_ROUTES = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/forum", changefreq: "daily", priority: "0.9" },
  { path: "/forum/trending", changefreq: "daily", priority: "0.8" },
  { path: "/communities", changefreq: "daily", priority: "0.9" },
  { path: "/articles", changefreq: "daily", priority: "0.9" },
  { path: "/events", changefreq: "weekly", priority: "0.8" },
  { path: "/donate", changefreq: "monthly", priority: "0.6" },
  { path: "/contact", changefreq: "monthly", priority: "0.5" },
  { path: "/privacypolicy", changefreq: "yearly", priority: "0.3" },
  { path: "/terms&conditions", changefreq: "yearly", priority: "0.3" },
];

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildUrlSet(entries) {
  const xmlEntries = entries
    .map(
      (entry) => `  <url>
    <loc>${escapeXml(entry.loc)}</loc>
    <lastmod>${entry.lastmod || lastmod}</lastmod>
    <changefreq>${entry.changefreq || "weekly"}</changefreq>
    <priority>${entry.priority || "0.7"}</priority>
  </url>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlEntries}
</urlset>
`;
}

function buildSitemapIndex(fileNames) {
  const items = fileNames
    .map(
      (fileName) => `  <sitemap>
    <loc>${SITE_URL}/${fileName}</loc>
    <lastmod>${lastmod}</lastmod>
  </sitemap>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${items}
</sitemapindex>
`;
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  return res.json();
}

async function loadDynamicEntries() {
  const entries = {
    articles: [],
    posts: [],
    profiles: [],
    communities: [],
  };

  const requests = [
    fetchJson(`${API_URL}/articles?limit=500`)
      .then((data) => {
        const articles = Array.isArray(data?.articles) ? data.articles : [];
        entries.articles = articles
          .filter((item) => item?.id)
          .map((item) => ({
            loc: `${SITE_URL}/article/${item.id}`,
            lastmod: item.updatedAt ? new Date(item.updatedAt).toISOString().split("T")[0] : lastmod,
            changefreq: "weekly",
            priority: "0.8",
          }));
      })
      .catch((err) => console.warn("Could not load article URLs for sitemap:", err.message)),

    fetchJson(`${API_URL}/posts?page=1&pageSize=500`)
      .then((data) => {
        const posts = Array.isArray(data) ? data : [];
        entries.posts = posts
          .filter((item) => item?.id)
          .map((item) => ({
            loc: `${SITE_URL}/post/${item.id}`,
            lastmod: item.updatedAt ? new Date(item.updatedAt).toISOString().split("T")[0] : lastmod,
            changefreq: "weekly",
            priority: "0.7",
          }));
      })
      .catch((err) => console.warn("Could not load post URLs for sitemap:", err.message)),

    fetchJson(`${API_URL}/users/list?limit=500`)
      .then((data) => {
        const users = Array.isArray(data) ? data : [];
        entries.profiles = users
          .filter((item) => item?.username)
          .map((item) => ({
            loc: `${SITE_URL}/profile/${encodeURIComponent(item.username)}`,
            lastmod,
            changefreq: "weekly",
            priority: "0.6",
          }));
      })
      .catch((err) => console.warn("Could not load profile URLs for sitemap:", err.message)),

    fetchJson(`${API_URL}/communities`)
      .then((data) => {
        const communities = Array.isArray(data) ? data : [];
        entries.communities = communities
          .filter((item) => item?.id)
          .map((item) => ({
            loc: `${SITE_URL}/community/${item.id}`,
            lastmod: item.updatedAt ? new Date(item.updatedAt).toISOString().split("T")[0] : lastmod,
            changefreq: "weekly",
            priority: "0.8",
          }));
      })
      .catch((err) => console.warn("Could not load community URLs for sitemap:", err.message)),
  ];

  await Promise.all(requests);
  return entries;
}

async function main() {
  const staticEntries = STATIC_ROUTES.map((route) => ({
    loc: `${SITE_URL}${route.path}`,
    lastmod,
    changefreq: route.changefreq,
    priority: route.priority,
  }));

  const dynamicEntries = await loadDynamicEntries();

  const files = [
    { name: "sitemap-static.xml", entries: staticEntries },
    { name: "sitemap-articles.xml", entries: dynamicEntries.articles },
    { name: "sitemap-posts.xml", entries: dynamicEntries.posts },
    { name: "sitemap-profiles.xml", entries: dynamicEntries.profiles },
    { name: "sitemap-communities.xml", entries: dynamicEntries.communities },
  ];

  await Promise.all(
    files.map((file) => writeFile(path.join(publicDir, file.name), buildUrlSet(file.entries), "utf8")),
  );

  const indexXml = buildSitemapIndex(files.map((file) => file.name));
  await writeFile(path.join(publicDir, "sitemap.xml"), indexXml, "utf8");

  const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
IndexNow-Key: ${SITE_URL}/1f4b9b5b0d8344d19d08e6db84d6de20.txt
Host: sshine.org
`;
  await writeFile(path.join(publicDir, "robots.txt"), robotsTxt, "utf8");

  console.log("Sitemaps + robots.txt generated successfully.");
}

main().catch((error) => {
  console.error("Failed to generate sitemap assets:", error);
  process.exit(1);
});
