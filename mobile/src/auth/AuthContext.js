import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as api from "../api/client";
import { saveSession, getUser, getToken, clearSession } from "./session";
import { getMode, saveMode } from "./mode";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  // Yöneticinin son kullandığı mod ("admin" | "saha"); kayıt yoksa null → admin.
  const [mode, setModeState] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [token, storedMode] = await Promise.all([getToken(), getMode()]);
      const storedUser = token ? await getUser() : null;
      setUser(storedUser);
      setModeState(storedMode);
      setLoading(false);
    })();
  }, []);

  const setMode = useCallback((next) => {
    setModeState(next);
    saveMode(next);
  }, []);

  useEffect(() => {
    api.setSessionExpiredHandler(() => setUser(null));
    return () => api.setSessionExpiredHandler(null);
  }, []);

  const login = async (email, password) => {
    const { token } = await api.login(email, password);
    // Stash the token first — getCurrentUser() reads it via the axios
    // interceptor, which pulls straight from AsyncStorage (see client.js).
    await saveSession(token, null);
    const me = await api.getCurrentUser();
    if (!me.roles?.includes("Administrator") && !me.roles?.includes("Staff")) {
      await clearSession();
      throw new Error("Bu hesabın uygulamaya erişim yetkisi yok.");
    }
    await saveSession(token, me);
    setUser(me);
  };

  const logout = async () => {
    await clearSession();
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, loading, login, logout, mode, setMode }),
    [user, loading, mode, setMode]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
