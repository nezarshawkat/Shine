import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

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
    if (saved) return saved;
    const browserLang = (navigator.language || navigator.userLanguage || FALLBACK_LANGUAGE)
      .toLowerCase()
      .split("-")[0];
    return browserLang || FALLBACK_LANGUAGE;
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
  const cacheRef = useRef(getCache());
  const pendingRef = useRef(new Map());
  const saveTimerRef = useRef(null);

  const flushCacheToStorage = () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      setCache(cacheRef.current);
    }, 250);
  };

  const restoreOriginalDomTexts = () => {
    document.querySelectorAll("[data-original-text]").forEach((el) => {
      el.textContent = el.getAttribute("data-original-text") || "";
      el.removeAttribute("data-original-text");
    });
    document.querySelectorAll("[data-original-placeholder]").forEach((el) => {
      el.setAttribute("placeholder", el.getAttribute("data-original-placeholder") || "");
      el.removeAttribute("data-original-placeholder");
    });
    document.querySelectorAll("[data-original-aria-label]").forEach((el) => {
      el.setAttribute("aria-label", el.getAttribute("data-original-aria-label") || "");
      el.removeAttribute("data-original-aria-label");
    });
    document.querySelectorAll("[data-original-title]").forEach((el) => {
      el.setAttribute("title", el.getAttribute("data-original-title") || "");
      el.removeAttribute("data-original-title");
    });
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.setAttribute("lang", language);
    document.documentElement.setAttribute("dir", RTL_LANGS.has(language) ? "rtl" : "ltr");
  }, [language]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let observer;
    let translatingDom = false;

    const skipSelector = [
      ".notranslate",
      ".post-text-pane",
      ".postbody-container",
      ".article-detail-content",
      ".article-post-excerpt",
      ".community-name",
      ".member-name",
      ".member-username",
      "[data-no-ui-translate='true']",
    ].join(", ");

    const shouldSkipElement = (element) => {
      if (!element) return true;
      if (element.closest(skipSelector)) return true;
      const tag = element.tagName?.toLowerCase();
      return tag === "script" || tag === "style" || tag === "code" || tag === "pre";
    };

    const collectTextNodes = (root) => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) => {
          const value = (node.nodeValue || "").trim();
          if (!value) return NodeFilter.FILTER_REJECT;
          if (value.length < 2) return NodeFilter.FILTER_REJECT;
          if (/^[\d\s.,:;!?()[\]{}\-_/\\]+$/.test(value)) return NodeFilter.FILTER_REJECT;
          if (shouldSkipElement(node.parentElement)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      });
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      return nodes;
    };

    const translateAttributes = async (rootEl) => {
      const elements = rootEl.querySelectorAll("input, textarea, button, a, [title], [aria-label]");
      const attributeTargets = [];
      for (const el of elements) {
        if (cancelled || shouldSkipElement(el)) break;
        const placeholder = el.getAttribute("placeholder");
        if (placeholder && placeholder.trim()) {
          if (!el.hasAttribute("data-original-placeholder")) {
            el.setAttribute("data-original-placeholder", placeholder);
          }
          attributeTargets.push({
            el,
            attr: "placeholder",
            original: el.getAttribute("data-original-placeholder"),
          });
        }
        const ariaLabel = el.getAttribute("aria-label");
        if (ariaLabel && ariaLabel.trim()) {
          if (!el.hasAttribute("data-original-aria-label")) {
            el.setAttribute("data-original-aria-label", ariaLabel);
          }
          attributeTargets.push({
            el,
            attr: "aria-label",
            original: el.getAttribute("data-original-aria-label"),
          });
        }
        const title = el.getAttribute("title");
        if (title && title.trim()) {
          if (!el.hasAttribute("data-original-title")) {
            el.setAttribute("data-original-title", title);
          }
          attributeTargets.push({
            el,
            attr: "title",
            original: el.getAttribute("data-original-title"),
          });
        }
      }
      return attributeTargets;
    };

    const applyDomTranslation = async (root = document.body) => {
      if (language === FALLBACK_LANGUAGE) {
        restoreOriginalDomTexts();
        return;
      }
      if (translatingDom || cancelled) return;
      translatingDom = true;

      const textNodes = collectTextNodes(root);
      const attributeTargets = await translateAttributes(document.body);
      const originals = new Set();

      for (const textNode of textNodes) {
        if (cancelled) break;
        const parent = textNode.parentElement;
        if (!parent) continue;

        const currentText = (textNode.nodeValue || "").trim();
        if (!currentText) continue;
        if (!parent.hasAttribute("data-original-text")) {
          parent.setAttribute("data-original-text", currentText);
        }
        const originalText = parent.getAttribute("data-original-text") || currentText;
        originals.add(originalText);
      }

      for (const target of attributeTargets) {
        if (target?.original) originals.add(target.original);
      }

      const translateQueue = Array.from(originals);
      await Promise.all(translateQueue.map((text) => translateText(text, language)));

      for (const textNode of textNodes) {
        if (cancelled) break;
        const parent = textNode.parentElement;
        if (!parent) continue;
        const currentText = (textNode.nodeValue || "").trim();
        const originalText = parent.getAttribute("data-original-text") || currentText;
        const cacheKey = `${language}::${originalText}`;
        const translated = cacheRef.current[cacheKey];
        if (translated && currentText) {
          textNode.nodeValue = textNode.nodeValue.replace(currentText, translated);
        }
      }

      for (const target of attributeTargets) {
        if (cancelled) break;
        const cacheKey = `${language}::${target.original}`;
        const translated = cacheRef.current[cacheKey];
        if (translated) {
          target.el.setAttribute(target.attr, translated);
        }
      }

      translatingDom = false;
    };

    if (language === FALLBACK_LANGUAGE) {
      restoreOriginalDomTexts();
    } else {
      applyDomTranslation();
      observer = new MutationObserver(() => {
        if (translatingDom) return;
        applyDomTranslation();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }

    return () => {
      cancelled = true;
      if (observer) observer.disconnect();
    };
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

    const cache = cacheRef.current;
    const cacheKey = `${targetLanguage}::${payload}`;
    if (cache[cacheKey]) return cache[cacheKey];
    if (pendingRef.current.has(cacheKey)) return pendingRef.current.get(cacheKey);

    const pendingPromise = (async () => {
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
      cacheRef.current = cache;
      flushCacheToStorage();
      return translated;
    })().catch(() => {
      return payload;
    }).finally(() => {
      pendingRef.current.delete(cacheKey);
    });

    pendingRef.current.set(cacheKey, pendingPromise);
    return pendingPromise;
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
