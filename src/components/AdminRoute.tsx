import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { useEffect } from "react";

export const AdminRoute = () => {
  const { role, loading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && role !== "admin") {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "Only management can access this content.",
      });
    }
  }, [loading, role, toast]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return role === "admin" ? <Outlet /> : <Navigate to="/" />;
};
