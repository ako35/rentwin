import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { pageRows } from "../utils/admin";

// Spring Page biçiminde dönen admin listeleri için ortak durum: ilk yükleme,
// çek-yenile, sonsuz kaydırma. `fetchPage(page)` 0 tabanlı sayfa numarası alır
// ve ham yanıtı döner. `fetchPage` değiştiğinde (filtre/arama) liste baştan
// yüklenir; ekran her odaklandığında da tazelenir.
export function usePagedList(fetchPage) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const pageRef = useRef(0);
  const lastRef = useRef(true);
  // Eski bir isteğin geç gelen yanıtı yeni filtrenin sonucunu ezmesin.
  const requestRef = useRef(0);
  const busyRef = useRef(false);

  const load = useCallback(
    async (mode = "reset") => {
      if (mode === "more" && (busyRef.current || lastRef.current)) return;
      const requestId = ++requestRef.current;
      const page = mode === "more" ? pageRef.current + 1 : 0;
      busyRef.current = true;
      if (mode === "more") setLoadingMore(true);
      if (mode === "refresh") setRefreshing(true);
      try {
        const data = await fetchPage(page);
        if (requestId !== requestRef.current) return;
        const { rows: next, last } = pageRows(data);
        setRows((prev) => (mode === "more" ? [...prev, ...next] : next));
        pageRef.current = page;
        lastRef.current = last;
        setError(false);
      } catch {
        if (requestId === requestRef.current) setError(true);
      } finally {
        if (requestId === requestRef.current) {
          busyRef.current = false;
          setLoading(false);
          setRefreshing(false);
          setLoadingMore(false);
        }
      }
    },
    [fetchPage]
  );

  useFocusEffect(
    useCallback(() => {
      load("reset");
    }, [load])
  );

  return {
    rows,
    setRows,
    loading,
    refreshing,
    loadingMore,
    error,
    reload: () => load("reset"),
    refresh: () => load("refresh"),
    loadMore: () => load("more"),
  };
}
