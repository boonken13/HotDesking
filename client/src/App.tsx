import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import Landing from "@/pages/landing";
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

function AuthenticatedRoutes() {
  const { user, isLoading: authLoading } = useAuth();
  const [location, setLocation] = useLocation();

  // Fetch user role
  const { data: userRole, isLoading: roleLoading } = useQuery<{ role: Role }>({
    queryKey: ["/api/user/role"],
    enabled: !!user,
  });

  if (authLoading || (user && roleLoading)) {
    return <LoadingScreen />;
  }

  // Not authenticated - show landing page
  if (!user) {
    return <Landing />;
  }

  const role = userRole?.role || "employee";

  return (
    <Switch>
      <Route path="/">
        <Dashboard userRole={role} />
      </Route>
      <Route path="/admin">
        {role === "admin" ? (
          <AdminPortal />
        ) : (
          <Dashboard userRole={role} />
        )}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function Router() {
  return <AuthenticatedRoutes />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
