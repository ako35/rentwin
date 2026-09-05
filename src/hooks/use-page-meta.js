import { useEffect } from "react";

const setMetaTag = (name, content) => {
  let tag = document.querySelector(`meta[name="${name}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("name", name);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
};

// Per-page <title> + meta description — the SPA ships one static pair in
// index.html, so every route showed the same search-result snippet.
export const usePageMeta = (title, description) => {
  useEffect(() => {
    const previousTitle = document.title;
    if (title) document.title = title;
    if (description) setMetaTag("description", description);
    return () => {
      document.title = previousTitle;
    };
  }, [title, description]);
};
