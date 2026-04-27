import "./App.css";
import Login from "./component/Login";
import KasirLayout from "./component/kasir/KasirLayout";
import { Navigate, Route, Routes } from "react-router-dom";
import { getStoredUser } from "./services/auth";

function UserRoute() {
  const user = getStoredUser();

  if (user?.role !== "user") {
    return <Navigate to="/login" replace />;
  }

  return <KasirLayout />;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/kasir" element={<UserRoute />} />
    </Routes>
  );
}

export default App;
