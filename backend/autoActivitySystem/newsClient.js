const { newsApiKey } = require('./config');

async function fetchHotNews() {
  if (!newsApiKey) return [];
  try {
    const url = `https://newsapi.org/v2/top-headlines?country=us&pageSize=8&apiKey=${newsApiKey}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.articles || []).map((a) => ({ title: a.title, description: a.description, url: a.url }));
  } catch {
    return [];
  }
}

module.exports = { fetchHotNews };
