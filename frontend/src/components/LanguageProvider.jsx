import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "shine-language-preference";
const FALLBACK_LANGUAGE = "en";
const RTL_LANGS = new Set(["ar", "he", "fa", "ur"]);

const LanguageContext = createContext(null);

const TRANSLATE_ENDPOINT = "https://libretranslate.com/translate";
const DETECT_ENDPOINT = "https://libretranslate.com/detect";

function getInitialLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved || FALLBACK_LANGUAGE;
  } catch {
    return FALLBACK_LANGUAGE;
  }
}

function getCache() {
  try {
    const raw = localStorage.getItem("shine-translation-cache");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setCache(cache) {
  try {
    localStorage.setItem("shine-translation-cache", JSON.stringify(cache));
  } catch {
    // no-op
  }
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(getInitialLanguage);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.setAttribute("lang", language);
    document.documentElement.setAttribute("dir", RTL_LANGS.has(language) ? "rtl" : "ltr");
  }, [language]);

  const detectLanguage = async (text) => {
    const payload = String(text || "").trim();
    if (!payload) return FALLBACK_LANGUAGE;
    try {
      const res = await fetch(DETECT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: payload }),
      });
      if (!res.ok) return FALLBACK_LANGUAGE;
      const data = await res.json();
      return data?.[0]?.language || FALLBACK_LANGUAGE;
    } catch {
      return FALLBACK_LANGUAGE;
    }
  };

  const translateText = async (text, targetLanguage = language) => {
    const payload = String(text || "").trim();
    if (!payload) return payload;
    if (!targetLanguage || targetLanguage === FALLBACK_LANGUAGE) return payload;

    const cache = getCache();
    const cacheKey = `${targetLanguage}::${payload}`;
    if (cache[cacheKey]) return cache[cacheKey];

    try {
      const sourceLanguage = await detectLanguage(payload);
      if (sourceLanguage === targetLanguage) return payload;

      const res = await fetch(TRANSLATE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: payload,
          source: sourceLanguage || "auto",
          target: targetLanguage,
          format: "text",
        }),
      });

      if (!res.ok) return payload;
      const data = await res.json();
      const translated = data?.translatedText || payload;
      cache[cacheKey] = translated;
      setCache(cache);
      return translated;
    } catch {
      return payload;
    }
  };

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      isRTL: RTL_LANGS.has(language),
      detectLanguage,
      translateText,
    }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}

