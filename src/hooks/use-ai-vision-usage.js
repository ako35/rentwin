import { useCallback, useEffect, useState } from "react";
import { services } from "../services";

// Shared Gemini vision-call quota status for "Ruhsattan Doldur" / "Belgeden
// Doldur" — both draw from the same daily free-tier pool (see backend
// lib/gemini.js), so a badge next to either button needs the same live
// count. Silent on failure: the badge just doesn't render rather than
// breaking the scan buttons over a status check.
export const useAiVisionUsage = () => {
  const [usage, setUsage] = useState(null);

  const refresh = useCallback(() => {
    services.settings.getAiUsage().then(setUsage).catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { usage, refresh };
};
