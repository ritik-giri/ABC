import React from "react";
import ReactDOM from "react-dom";
import App from "./App";
import "./index.css";
import { CookiesProvider } from "react-cookie";
import "bootstrap/dist/css/bootstrap.css";
import { Provider } from "react-redux";
import store from "./redux/store";

ReactDOM.render(
    <React.StrictMode>
        <CookiesProvider>
            <Provider store={store}>
                <App />
            </Provider>
        </CookiesProvider>
    </React.StrictMode>,
    document.getElementById("root")
);
