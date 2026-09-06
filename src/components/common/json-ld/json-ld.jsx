import { useEffect } from "react";

// Injects a <script type="application/ld+json"> into <head> for the current
// route and removes it on unmount. `id` keeps multiple blocks from colliding.
const JsonLd = ({ data, id = "route-jsonld" }) => {
  const json = JSON.stringify(data);

  useEffect(() => {
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement("script");
      el.type = "application/ld+json";
      el.id = id;
      document.head.appendChild(el);
    }
    el.textContent = json;
    return () => {
      document.getElementById(id)?.remove();
    };
  }, [json, id]);

  return null;
};

export default JsonLd;
