import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth, hasRole } from "../context/AuthContext";

type UserRole = "customer" | "worker" | "admin" | "store_manager";

interface ProtectedRouteProps {
  children: ReactNode;
  /** If provided, only these roles are allowed. If omitted, any authenticated user passes. */
  roles?: UserRole[];
}

/**
 * Guards a route: redirects to /login if not authenticated,
 * or to /join if authenticated but lacking the required role.
 */
export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !hasRole(user, ...roles)) {
    // Authenticated but wrong role — redirect to their home page
    return <Navigate to="/join" replace />;
  }

  return <>{children}</>;
}
