import axios from "axios";

// A signed-in tab keeps its user in memory, so when the token expires (7 days)
// or is revoked the page still looks signed in while every API call answers
// 401 — the admin panel then shows only generic "could not save" errors.
// The first such 401 clears the token, tells the user and reloads on the
// login page, which sends them back here once they sign in again.

const sentBearerToken = (config) => {
  const headers = config?.headers;
  const value =
    (headers && typeof headers.get === "function" ? headers.get("Authorization") : headers?.Authorization) || "";
  return /^Bearer\s+\S/.test(value);
};

// Only same-site paths are accepted as a return target (no "//host" or
// absolute URLs), and never the auth pages themselves.
export const safeReturnPath = (value) =>
  typeof value === "string" && /^\/(?![/\\])/.test(value) && !value.startsWith("/auth/") ? value : null;

export const loginUrlFor = (loginPath, returnPath) => {
  const next = safeReturnPath(returnPath);
  return next ? `${loginPath}?next=${encodeURIComponent(next)}` : loginPath;
};

export const installSessionExpiryHandler = ({ isSignedIn, clearToken, notify, loginPath }) => {
  let handling = false;

  axios.interceptors.response.use(undefined, (error) => {
    if (error?.response?.status !== 401 || !sentBearerToken(error.config) || !isSignedIn()) {
      return Promise.reject(error);
    }

    if (!handling) {
      handling = true;
      clearToken();
      const target = loginUrlFor(loginPath, window.location.pathname + window.location.search);
      Promise.resolve()
        .then(notify)
        .catch(() => {})
        .finally(() => window.location.assign(target));
    }

    // Leave the caller pending: the page is about to reload, and letting its
    // own catch run would replace the notice with a misleading error.
    return new Promise(() => {});
  });
};
