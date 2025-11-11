import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAdmin } from "@/hooks/useAdmin";
import { LoadingScreen } from "./LoadingScreen";

const ProtectedAdminRoute = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const { isAdmin, isLoading } = useAdmin();

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      navigate("/admin/login");
    }
  }, [isAdmin, isLoading, navigate]);

  if (isLoading) {
    return <LoadingScreen message="Verifying admin access..." />;
  }

  if (!isAdmin) {
    return null;
  }

  return <>{children}</>;
};

export default ProtectedAdminRoute;
