import { useCallback, useEffect, useState } from "react";
import { services } from "../services";

// Shared Claude vision-call usage count for "Ruhsattan Doldur" / "Belgeden
// Doldur" — both draw from the same daily counter (see backend lib/claude.js),
// so a badge next to either button needs the same live count. Silent on
// failure: the badge just doesn't render rather than breaking the scan
// buttons over a status check.
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
