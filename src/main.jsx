import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./i18n";
import "./styles/styles.scss";
import { Provider as StoreProvider } from "react-redux";
import {store} from "./store";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <StoreProvider store={store}>
      <App />
    </StoreProvider>
  </React.StrictMode>
);
