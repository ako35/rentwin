import { createContext, useContext, useEffect, useMemo, useState } from "react";
import * as api from "../api/client";
import { saveSession, getUser, getToken, clearSession } from "./session";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      const storedUser = token ? await getUser() : null;
      setUser(storedUser);
      setLoading(false);
    })();
  }, []);

  const login = async (email, password) => {
    const { token } = await api.login(email, password);
    // Stash the token first — getCurrentUser() reads it via the axios
    // interceptor, which pulls straight from AsyncStorage (see client.js).
    await saveSession(token, null);
    const me = await api.getCurrentUser();
    if (!me.roles?.includes("Administrator")) {
      await clearSession();
      throw new Error("Bu hesabın saha uygulamasına erişim yetkisi yok.");
    }
    await saveSession(token, me);
    setUser(me);
  };

  const logout = async () => {
    await clearSession();
    setUser(null);
  };

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
