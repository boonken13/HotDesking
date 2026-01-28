import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Building2, LogOut, Settings, User, Shield, LayoutDashboard } from "lucide-react";
import type { User as UserType } from "@shared/models/auth";
import type { Role } from "@shared/schema";

interface HeaderProps {
  user: UserType | null;
  userRole: Role;
  onLogout: () => void;
}

export function Header({ user, userRole, onLogout }: HeaderProps) {
  const [location] = useLocation();
  const displayName = user?.firstName
    ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
    : user?.email || "User";

  const initials = user?.firstName
    ? `${user.firstName.charAt(0)}${user.lastName?.charAt(0) || ""}`
    : user?.email?.charAt(0).toUpperCase() || "U";

  const isOnAdminPage = location.startsWith("/admin");

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-3">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer hover-elevate rounded-md p-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Building2 className="h-4 w-4" />
              </div>
              <span className="font-semibold text-lg hidden sm:inline-block">HotDesk</span>
            </div>
          </Link>
          {userRole === "admin" && (
            <Badge variant="secondary" className="gap-1 hidden sm:flex">
              <Shield className="h-3 w-3" />
              Admin
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-3">
          {userRole === "admin" && (
            <Link href={isOnAdminPage ? "/" : "/admin"}>
              <Button
                variant={isOnAdminPage ? "outline" : "default"}
                size="sm"
                className="gap-2"
                data-testid="button-admin-portal"
              >
                {isOnAdminPage ? (
                  <>
                    <Building2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Dashboard</span>
                  </>
                ) : (
                  <>
                    <LayoutDashboard className="h-4 w-4" />
                    <span className="hidden sm:inline">Admin Portal</span>
                  </>
                )}
              </Button>
            </Link>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full" data-testid="button-user-menu">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user?.profileImageUrl || ""} alt={displayName} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{displayName}</p>
                  {user?.email && (
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2">
                <User className="h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              {userRole === "admin" && (
                <DropdownMenuItem className="gap-2">
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 text-destructive focus:text-destructive"
                onClick={onLogout}
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
