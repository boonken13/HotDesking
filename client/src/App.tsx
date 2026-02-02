import { useEffect } from "react";
import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import LoginPage from "@/pages/auth/login";
import RegisterPage from "@/pages/auth/register";
import Dashboard from "@/pages/dashboard";
import AdminPortal from "@/pages/admin";
import NotFound from "@/pages/not-found";
import type { Role } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="space-y-4 w-full max-w-md px-4">
        <div className="flex items-center justify-center gap-3 mb-8">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-6 w-24" />
        </div>
        <Skeleton className="h-4 w-3/4 mx-auto" />
        <Skeleton className="h-4 w-1/2 mx-auto" />
        <div className="pt-4">
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      </div>
    </div>
  );
}

function ProtectedRoute({ children, role }: { children: React.ReactNode; role?: Role }) {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  const { data: userRole, isLoading: roleLoading } = useQuery<{ role: Role }>({
    queryKey: ["/api/user/role"],
    enabled: !!user,
  });

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (role && roleLoading) {
    return <LoadingScreen />;
  }

  if (role === "admin" && userRole?.role !== "admin") {
    return <Redirect to="/" />;
  }

  return <>{children}</>;
}

function AuthenticatedApp() {
  const { user, isLoading } = useAuth();

  const { data: userRole } = useQuery<{ role: Role }>({
    queryKey: ["/api/user/role"],
    enabled: !!user,
  });

  const role = userRole?.role || "employee";

  return (
    <Switch>
      <Route path="/login">
        {user ? <Redirect to="/" /> : <LoginPage />}
      </Route>
      <Route path="/register">
        {user ? <Redirect to="/" /> : <RegisterPage />}
      </Route>
      <Route path="/">
        <ProtectedRoute>
          <Dashboard userRole={role} />
        </ProtectedRoute>
      </Route>
      <Route path="/admin">
        <ProtectedRoute role="admin">
          <AdminPortal />
        </ProtectedRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AuthenticatedApp />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
