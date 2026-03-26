import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, "..");
const appRoutesPath = path.join(projectRoot, "src", "App.jsx");
const sitemapOutputPath = path.join(projectRoot, "public", "sitemap.xml");

const BASE_URL = "https://sshine.org";

const EXCLUDED_ROUTES = new Set([
  "/login",
  "/signup",
  "/messenger",
  "/invite-people",
  "/compost",
  "/article-apply",
  "/opinion-create",
  "/analysis-create",
  "/critique-create",
  "/poll-create",
  "/create-community",
  "/create-article",
  "/profile",
]);

const DYNAMIC_PREFIXES = ["/forum", "/communities", "/events", "/articles"];
const MAJOR_PREFIXES = ["/forum", "/communities", "/events", "/articles"];

function normalizeRoutePath(rawPath) {
  if (!rawPath || rawPath.includes(":")) return null;
  if (rawPath.includes("*")) {
    const wildcardNormalized = rawPath.replace(/\/\*$/, "") || "/";
    return wildcardNormalized;
  }
  return rawPath;
}

function shouldIncludeRoute(routePath) {
  if (!routePath) return false;
  if (!routePath.startsWith("/")) return false;
  if (routePath.startsWith("/admin")) return false;
  if (routePath.startsWith("/api")) return false;
  if (EXCLUDED_ROUTES.has(routePath)) return false;
  return true;
}

function getSeoMetadata(routePath) {
  if (routePath === "/") {
    return { changefreq: "daily", priority: "1.0" };
  }

  const isMajor = MAJOR_PREFIXES.some((prefix) => routePath === prefix || routePath.startsWith(`${prefix}/`));
  if (isMajor) {
    return { changefreq: "daily", priority: "0.9" };
  }

  const isDynamicSection = DYNAMIC_PREFIXES.some(
    (prefix) => routePath === prefix || routePath.startsWith(`${prefix}/`),
  );

  if (isDynamicSection) {
    return { changefreq: "daily", priority: "0.8" };
  }

  return { changefreq: "monthly", priority: "0.7" };
}

function buildSitemapXml(urlEntries) {
  const urlsXml = urlEntries
    .map(
      ({ loc, lastmod, changefreq, priority }) => `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlsXml}\n</urlset>\n`;
}

async function main() {
  const appFile = await readFile(appRoutesPath, "utf8");
  const routeRegex = /<Route\s+path="([^"]+)"/g;
  const discoveredRoutes = new Set(["/"]);

  let match;
  while ((match = routeRegex.exec(appFile)) !== null) {
    const normalized = normalizeRoutePath(match[1]);
    if (!shouldIncludeRoute(normalized)) continue;
    discoveredRoutes.add(normalized);
  }

  const sortedRoutes = [...discoveredRoutes].sort((a, b) => {
    if (a === "/") return -1;
    if (b === "/") return 1;
    return a.localeCompare(b);
  });

  const lastmod = new Date().toISOString().split("T")[0];
  const urlEntries = sortedRoutes.map((routePath) => {
    const { changefreq, priority } = getSeoMetadata(routePath);
    const route = routePath === "/" ? "/" : routePath;
    return {
      loc: `${BASE_URL}${route}`,
      lastmod,
      changefreq,
      priority,
    };
  });

  const sitemapXml = buildSitemapXml(urlEntries);
  await writeFile(sitemapOutputPath, sitemapXml, "utf8");

  console.log(`Generated ${sitemapOutputPath} with ${urlEntries.length} URLs.`);
}

main().catch((error) => {
  console.error("Failed to generate sitemap.xml", error);
  process.exit(1);
});
