import { useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Login from "./component/Login";
import Kasir from "./component/kasir/Kasir";

const LOGIN_ROUTE = "/login";
const APP_ROUTE = "/app";
const SESSION_KEY = "pos-demo-auth";

function App() {
  const [authenticated, setAuthenticated] = useState(
    () => window.sessionStorage.getItem(SESSION_KEY) === "1",
  );
  const authenticatedRoute = APP_ROUTE;
  const guestRoute = LOGIN_ROUTE;

  const handleLogin = () => {
    window.sessionStorage.setItem(SESSION_KEY, "1");
    setAuthenticated(true);
  };

  const handleLogout = () => {
    window.sessionStorage.removeItem(SESSION_KEY);
    setAuthenticated(false);
  };

  return (
    <Routes>
      <Route
        path="/"
        element={
          <Navigate to={authenticated ? authenticatedRoute : guestRoute} replace />
        }
      />
      <Route
        path={LOGIN_ROUTE}
        element={
          authenticated ? (
            <Navigate to={authenticatedRoute} replace />
          ) : (
            <Login onLogin={handleLogin} />
          )
        }
      />
      <Route
        path={APP_ROUTE}
        element={
          authenticated ? (
            <Kasir onLogout={handleLogout} />
          ) : (
            <Navigate to={guestRoute} replace />
          )
        }
      />
      <Route
        path="*"
        element={
          <Navigate to={authenticated ? authenticatedRoute : guestRoute} replace />
        }
      />
    </Routes>
  );
}

export default App;
