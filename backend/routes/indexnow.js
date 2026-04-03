const express = require("express");

const router = express.Router();

const INDEXNOW_ENDPOINTS = [
  "https://api.indexnow.org/indexnow",
  "https://www.bing.com/indexnow",
];

router.post("/submit", async (req, res) => {
  const key = process.env.INDEXNOW_KEY || "6641b49d58b145ba8920386e3a25367f";
  const keyLocation = process.env.INDEXNOW_KEY_LOCATION || `https://sshine.org/${key}.txt`;

  const bodyUrls = Array.isArray(req.body?.urls) ? req.body.urls : [];
  const singleUrl = typeof req.body?.url === "string" ? [req.body.url] : [];
  const urls = [...new Set([...bodyUrls, ...singleUrl].filter((url) => typeof url === "string" && url.startsWith("http")))];

  if (!urls.length) {
    return res.status(400).json({ error: "Provide at least one URL in `url` or `urls`." });
  }

  const payload = {
    host: "sshine.org",
    key,
    keyLocation,
    urlList: urls,
  };

  const results = await Promise.all(
    INDEXNOW_ENDPOINTS.map(async (endpoint) => {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        return { endpoint, ok: response.ok, status: response.status };
      } catch (error) {
        return { endpoint, ok: false, error: error.message };
      }
    }),
  );

  res.json({ submitted: urls.length, results });
});

module.exports = router;
