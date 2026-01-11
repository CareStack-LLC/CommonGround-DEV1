"use client";

import { useState, useEffect, createContext, useContext } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Scale,
  LayoutDashboard,
  FolderOpen,
  Bot,
  LogOut,
  Shield,
  Clock,
  FileCheck,
  FileText,
  Calendar,
  BarChart3,
  Menu,
  X,
  ChevronDown,
  Bell,
  Users,
  Gavel,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Court professional context
interface CourtProfessional {
  id: string;
  email: string;
  full_name: string;
  role: string;
  organization?: string;
  title?: string;
  is_verified: boolean;
  mfa_enabled: boolean;
}

interface CourtAuthContextType {
  professional: CourtProfessional | null;
  activeGrant: any | null;
  isLoading: boolean;
  token: string | null;
  login: (email: string, accessCode: string) => Promise<void>;
  logout: () => void;
  setActiveGrant: (grant: any) => void;
}

const CourtAuthContext = createContext<CourtAuthContextType | null>(null);

export function useCourtAuth() {
  const context = useContext(CourtAuthContext);
  if (!context) {
    throw new Error("useCourtAuth must be used within CourtPortalLayout");
  }
  return context;
}

// Role display info
const ROLE_INFO: Record<string, { icon: React.ReactNode; label: string; variant: 'default' | 'secondary' | 'success' | 'warning' }> = {
  court_clerk: { icon: <FileCheck className="h-3.5 w-3.5" />, label: "Court Clerk", variant: "default" },
  gal: { icon: <Shield className="h-3.5 w-3.5" />, label: "Guardian ad Litem", variant: "secondary" },
  attorney_petitioner: { icon: <Scale className="h-3.5 w-3.5" />, label: "Attorney (Petitioner)", variant: "success" },
  attorney_respondent: { icon: <Scale className="h-3.5 w-3.5" />, label: "Attorney (Respondent)", variant: "success" },
  mediator: { icon: <Bot className="h-3.5 w-3.5" />, label: "Mediator", variant: "warning" },
  judge: { icon: <Scale className="h-3.5 w-3.5" />, label: "Judge", variant: "default" },
};

export default function CourtPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [professional, setProfessional] = useState<CourtProfessional | null>(null);
  const [activeGrant, setActiveGrant] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Check for stored session
    const storedToken = localStorage.getItem("court_token");
    const stored = localStorage.getItem("court_professional");
    if (storedToken && stored) {
      try {
        setToken(storedToken);
        setProfessional(JSON.parse(stored));
      } catch (e) {
        localStorage.removeItem("court_professional");
        localStorage.removeItem("court_token");
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, accessCode: string) => {
    // Call the real backend API
    const response = await fetch(`${API_BASE}/court/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, access_code: accessCode }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Login failed");
    }

    const data = await response.json();

    const prof: CourtProfessional = {
      id: data.professional.id,
      email: data.professional.email,
      full_name: data.professional.full_name,
      role: data.professional.role,
      organization: data.professional.organization,
      title: data.professional.title,
      is_verified: data.professional.is_verified,
      mfa_enabled: data.professional.mfa_enabled,
    };

    setToken(data.access_token);
    setProfessional(prof);
    localStorage.setItem("court_token", data.access_token);
    localStorage.setItem("court_professional", JSON.stringify(prof));
  };

  const logout = () => {
    setToken(null);
    setProfessional(null);
    setActiveGrant(null);
    localStorage.removeItem("court_token");
    localStorage.removeItem("court_professional");
    localStorage.removeItem("court_grant");
  };

  const isLoginPage = pathname === "/court-portal/login";
  const roleInfo = professional ? ROLE_INFO[professional.role] : null;

  return (
    <CourtAuthContext.Provider
      value={{ professional, activeGrant, isLoading, token, login, logout, setActiveGrant }}
    >
      <div className="min-h-screen bg-background">
        {/* Header - Professional indigo for court context */}
        <header className="bg-indigo-950 text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/court-portal" className="flex items-center gap-3">
                  <div className="p-1.5 bg-indigo-800 rounded-lg">
                    <Scale className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-lg font-bold tracking-tight">MediatorMode</span>
                    <Badge variant="secondary" className="ml-2 text-xs bg-indigo-800 text-indigo-100 border-0">
                      by CommonGround
                    </Badge>
                  </div>
                </Link>
              </div>

              {professional && !isLoginPage && (
                <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <div className="font-medium text-sm">{professional.full_name}</div>
                    <div className="flex items-center justify-end gap-1.5 text-xs text-indigo-200">
                      {roleInfo?.icon}
                      <span>{roleInfo?.label}</span>
                    </div>
                  </div>
                  <Button
                    onClick={logout}
                    variant="ghost"
                    size="sm"
                    className="text-indigo-200 hover:text-white hover:bg-indigo-800"
                  >
                    <LogOut className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Sign Out</span>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Navigation - Dashboard, Cases, Form Queue, Calendar, ARIA */}
        {professional && !isLoginPage && (
          <CourtNavigation pathname={pathname} activeGrant={activeGrant} />
        )}

        {/* Active Grant Banner - Show directly under header when viewing a case */}
        {activeGrant && !isLoginPage && (
          <div className="bg-indigo-50 border-b border-indigo-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <FolderOpen className="h-4 w-4 text-indigo-600" />
                  <span className="font-medium text-indigo-900">
                    Active Case: {activeGrant.case_name || activeGrant.case_id}
                  </span>
                  {roleInfo && (
                    <Badge variant={roleInfo.variant} size="sm">
                      {roleInfo.label}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-indigo-600">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{activeGrant.days_remaining} days remaining</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-secondary/50 border-t border-border mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span>MediatorMode by CommonGround</span>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cg-success" />
                  Read-only access
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cg-primary" />
                  All actions logged
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  SHA-256 verified
                </span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </CourtAuthContext.Provider>
  );
}

// Enhanced Court Navigation Component
function CourtNavigation({ pathname, activeGrant }: { pathname: string; activeGrant: any }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Navigation items with categories
  const mainNavItems = [
    {
      href: "/court-portal/dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard className="h-4 w-4" />,
      description: "Overview & quick stats",
    },
    {
      href: "/court-portal/cases",
      label: "Cases",
      icon: <FolderOpen className="h-4 w-4" />,
      description: "Manage assigned cases",
    },
  ];

  const workflowNavItems = [
    {
      href: "/court-portal/forms-queue",
      label: "Form Queue",
      icon: <FileText className="h-4 w-4" />,
      description: "Forms pending review",
      badge: "3", // This would be dynamic
    },
    {
      href: "/court-portal/calendar",
      label: "Calendar",
      icon: <Calendar className="h-4 w-4" />,
      description: "Hearings & events",
    },
  ];

  const toolsNavItems = [
    {
      href: "/court-portal/aria",
      label: "ARIA",
      icon: <Bot className="h-4 w-4" />,
      description: "AI Assistant",
    },
  ];

  // Case-specific navigation (shown when viewing a case)
  const caseNavItems = activeGrant ? [
    {
      href: `/court-portal/cases/${activeGrant.case_id}`,
      label: "Overview",
      icon: <FolderOpen className="h-4 w-4" />,
    },
    {
      href: `/court-portal/cases/${activeGrant.case_id}/forms`,
      label: "Forms",
      icon: <FileText className="h-4 w-4" />,
    },
    {
      href: `/court-portal/cases/${activeGrant.case_id}/events`,
      label: "Hearings",
      icon: <Gavel className="h-4 w-4" />,
    },
    {
      href: `/court-portal/cases/${activeGrant.case_id}/messages`,
      label: "Messages",
      icon: <Users className="h-4 w-4" />,
    },
    {
      href: `/court-portal/cases/${activeGrant.case_id}/agreement`,
      label: "Agreement",
      icon: <FileCheck className="h-4 w-4" />,
    },
    {
      href: `/court-portal/cases/${activeGrant.case_id}/reports`,
      label: "Reports",
      icon: <BarChart3 className="h-4 w-4" />,
    },
  ] : [];

  const isInCaseContext = pathname.includes("/court-portal/cases/") &&
    pathname !== "/court-portal/cases" &&
    !pathname.endsWith("/cases/");

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="bg-card border-b border-border shadow-sm hidden md:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between">
            {/* Main Nav */}
            <div className="flex gap-1">
              {mainNavItems.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  current={pathname}
                  icon={item.icon}
                >
                  {item.label}
                </NavLink>
              ))}

              {/* Workflow Section with Visual Separator */}
              <div className="flex items-center">
                <div className="h-6 w-px bg-border mx-2" />
              </div>

              {workflowNavItems.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  current={pathname}
                  icon={item.icon}
                  badge={item.badge}
                >
                  {item.label}
                </NavLink>
              ))}

              {/* Tools Section */}
              <div className="flex items-center">
                <div className="h-6 w-px bg-border mx-2" />
              </div>

              {toolsNavItems.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  current={pathname}
                  icon={item.icon}
                >
                  {item.label}
                </NavLink>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground relative"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center">
                  2
                </span>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Case Sub-Navigation (when viewing a case) */}
      {isInCaseContext && activeGrant && (
        <nav className="bg-indigo-50/50 border-b border-indigo-100 hidden md:block">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex gap-1 overflow-x-auto py-1">
              {caseNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                    pathname === item.href ||
                    (item.label !== "Overview" && pathname.startsWith(item.href))
                      ? "bg-indigo-100 text-indigo-700"
                      : "text-indigo-600 hover:bg-indigo-100/50"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </nav>
      )}

      {/* Mobile Navigation */}
      <nav className="bg-card border-b border-border shadow-sm md:hidden">
        <div className="px-4 py-2 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex items-center gap-2"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            <span>Menu</span>
          </Button>

          {/* Current Location */}
          <span className="text-sm text-muted-foreground">
            {pathname.split("/").pop()?.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase()) || "Dashboard"}
          </span>

          {/* Notifications */}
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-4 w-4" />
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center">
              2
            </span>
          </Button>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="border-t border-border bg-card px-4 py-3 space-y-4">
            {/* Main Section */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Main
              </p>
              <div className="space-y-1">
                {mainNavItems.map((item) => (
                  <MobileNavLink
                    key={item.href}
                    href={item.href}
                    current={pathname}
                    icon={item.icon}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.label}
                  </MobileNavLink>
                ))}
              </div>
            </div>

            {/* Workflow Section */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Workflow
              </p>
              <div className="space-y-1">
                {workflowNavItems.map((item) => (
                  <MobileNavLink
                    key={item.href}
                    href={item.href}
                    current={pathname}
                    icon={item.icon}
                    badge={item.badge}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.label}
                  </MobileNavLink>
                ))}
              </div>
            </div>

            {/* Tools Section */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Tools
              </p>
              <div className="space-y-1">
                {toolsNavItems.map((item) => (
                  <MobileNavLink
                    key={item.href}
                    href={item.href}
                    current={pathname}
                    icon={item.icon}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.label}
                  </MobileNavLink>
                ))}
              </div>
            </div>

            {/* Case Navigation (if in case context) */}
            {isInCaseContext && activeGrant && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Current Case
                </p>
                <div className="space-y-1">
                  {caseNavItems.map((item) => (
                    <MobileNavLink
                      key={item.href}
                      href={item.href}
                      current={pathname}
                      icon={item.icon}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {item.label}
                    </MobileNavLink>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </nav>
    </>
  );
}

// Desktop NavLink Component
function NavLink({
  href,
  current,
  icon,
  children,
  badge,
}: {
  href: string;
  current: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  badge?: string;
}) {
  const isActive = current.startsWith(href) &&
    (href !== "/court-portal/cases" || current === "/court-portal/cases");

  return (
    <Link
      href={href}
      className={`px-4 py-3 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
        isActive
          ? "border-indigo-600 text-indigo-600"
          : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
      }`}
    >
      {icon}
      {children}
      {badge && (
        <span className="ml-1 px-1.5 py-0.5 text-[10px] font-semibold bg-red-500 text-white rounded-full">
          {badge}
        </span>
      )}
    </Link>
  );
}

// Mobile NavLink Component
function MobileNavLink({
  href,
  current,
  icon,
  children,
  badge,
  onClick,
}: {
  href: string;
  current: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  badge?: string;
  onClick?: () => void;
}) {
  const isActive = current.startsWith(href);

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        isActive
          ? "bg-indigo-100 text-indigo-700"
          : "text-foreground hover:bg-muted"
      }`}
    >
      <span className="flex items-center gap-2">
        {icon}
        {children}
      </span>
      {badge && (
        <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-red-500 text-white rounded-full">
          {badge}
        </span>
      )}
    </Link>
  );
}
