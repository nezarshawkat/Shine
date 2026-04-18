import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "shine-language-preference";
const FALLBACK_LANGUAGE = "en";
const RTL_LANGS = new Set(["ar", "he", "fa", "ur"]);

const LanguageContext = createContext(null);

const DETECT_ENDPOINTS = [
  "https://libretranslate.com/detect",
  "https://translate.argosopentech.com/detect",
];

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
    if (!payload) return "unknown";

    for (const endpoint of DETECT_ENDPOINTS) {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ q: payload }),
        });
        if (!res.ok) continue;
        const data = await res.json();
        const detected = data?.[0]?.language;
        if (detected) return detected;
      } catch {
        // try next endpoint
      }
    }
    return "unknown";
  };

  const translateText = async (text, targetLanguage = language) => {
    const payload = String(text || "").trim();
    if (!payload) return payload;
    if (!targetLanguage) return payload;

    const cache = getCache();
    const cacheKey = `${targetLanguage}::${payload}`;
    if (cache[cacheKey]) return cache[cacheKey];

    try {
      const sourceLanguage = await detectLanguage(payload);
      if (sourceLanguage !== "unknown" && sourceLanguage === targetLanguage) return payload;

      let translated = payload;
      const libreEndpoints = [
        "https://libretranslate.com/translate",
        "https://translate.argosopentech.com/translate",
      ];

      for (const endpoint of libreEndpoints) {
        try {
          const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              q: payload,
              source: sourceLanguage === "unknown" ? "auto" : sourceLanguage,
              target: targetLanguage,
              format: "text",
            }),
          });
          if (!res.ok) continue;
          const data = await res.json();
          if (data?.translatedText) {
            translated = data.translatedText;
            break;
          }
        } catch {
          // try next endpoint
        }
      }

      if (translated === payload) {
        const mmRes = await fetch(
          `https://api.mymemory.translated.net/get?q=${encodeURIComponent(payload)}&langpair=${encodeURIComponent(
            `${sourceLanguage === "unknown" ? "en" : sourceLanguage}|${targetLanguage}`
          )}`
        );
        if (mmRes.ok) {
          const mmData = await mmRes.json();
          translated = mmData?.responseData?.translatedText || payload;
        }
      }

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
