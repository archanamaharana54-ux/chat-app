import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <p className="center-text">Loading...</p>;
  return user ? children : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
