import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export const PrivateRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    // You can replace this with a proper loading spinner component
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return user ? <Outlet /> : <Navigate to="/login" replace />;
};
