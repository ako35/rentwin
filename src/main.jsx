import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./i18n";
import "./styles/styles.scss";
import { Provider as StoreProvider } from "react-redux";
import {store} from "./store";
import i18n from "./i18n";
import { services } from "./services";
import { utils } from "./utils";
import { constants } from "./constants";
import { installSessionExpiryHandler } from "./services/session-expiry/session-expiry";

installSessionExpiryHandler({
  isSignedIn: () => store.getState().auth.isLoggedIn,
  clearToken: () => services.encryptedLocalStorage.removeItem("rentwintoken"),
  notify: () => utils.functions.swalToast(i18n.t("common:session.expired"), "warning"),
  loginPath: constants.routes.login,
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <StoreProvider store={store}>
      <App />
    </StoreProvider>
  </React.StrictMode>
);
