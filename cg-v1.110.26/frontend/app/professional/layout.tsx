"use client";

import { useState, useEffect, createContext, useContext } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Briefcase,
  LayoutDashboard,
  FolderOpen,
  Bot,
  LogOut,
  Shield,
  Menu,
  X,
  Bell,
  MessageSquare,
  Users,
  Calendar,
  Settings,
  Building2,
  User,
  ChevronDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Professional profile types
interface ProfessionalProfile {
  id: string;
  user_id: string;
  professional_type: string;
  license_number?: string;
  license_state?: string;
  license_verified: boolean;
  is_active: boolean;
  user_first_name?: string;
  user_last_name?: string;
  user_email?: string;
}

interface Firm {
  id: string;
  name: string;
  slug: string;
  firm_type: string;
  role: string;
}

interface ProfessionalAuthContextType {
  profile: ProfessionalProfile | null;
  firms: Firm[];
  activeFirm: Firm | null;
  isLoading: boolean;
  token: string | null;
  dashboardData: any | null;
  logout: () => void;
  setActiveFirm: (firm: Firm | null) => void;
  refreshProfile: () => Promise<void>;
  refreshDashboard: () => Promise<void>;
}

const ProfessionalAuthContext = createContext<ProfessionalAuthContextType | null>(null);

export function useProfessionalAuth() {
  const context = useContext(ProfessionalAuthContext);
  if (!context) {
    throw new Error("useProfessionalAuth must be used within ProfessionalPortalLayout");
  }
  return context;
}

// Professional type display info
const PROFESSIONAL_TYPE_INFO: Record<string, { label: string; color: string }> = {
  attorney: { label: "Attorney", color: "bg-emerald-100 text-emerald-800" },
  paralegal: { label: "Paralegal", color: "bg-blue-100 text-blue-800" },
  mediator: { label: "Mediator", color: "bg-purple-100 text-purple-800" },
  parenting_coordinator: { label: "Parenting Coordinator", color: "bg-amber-100 text-amber-800" },
  intake_coordinator: { label: "Intake Coordinator", color: "bg-cyan-100 text-cyan-800" },
  practice_admin: { label: "Practice Admin", color: "bg-slate-100 text-slate-800" },
};

export default function ProfessionalPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
  const [firms, setFirms] = useState<Firm[]>([]);
  const [activeFirm, setActiveFirm] = useState<Firm | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<any | null>(null);

  // Check for auth token from main app
  useEffect(() => {
    const storedToken = localStorage.getItem("access_token");
    if (storedToken) {
      setToken(storedToken);
      fetchProfile(storedToken);
    } else {
      setIsLoading(false);
      // Redirect to login if not authenticated
      if (!pathname.includes("/login") && !pathname.includes("/onboarding")) {
        router.push("/login?redirect=/professional");
      }
    }
  }, [pathname, router]);

  const fetchProfile = async (authToken: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/v1/professional/profile`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data);

        // Extract firms from the response
        if (data.firms && Array.isArray(data.firms)) {
          const firmList = data.firms.map((m: any) => ({
            id: m.firm_id,
            name: m.firm_name,
            slug: m.firm_slug,
            firm_type: m.firm_type || "law_firm",
            role: m.role,
          }));
          setFirms(firmList);
          if (firmList.length > 0 && !activeFirm) {
            setActiveFirm(firmList[0]);
          }
        }

        // Fetch dashboard data
        fetchDashboard(authToken);
      } else if (response.status === 404) {
        // No professional profile - redirect to onboarding
        router.push("/professional/onboarding");
      } else {
        console.error("Failed to fetch professional profile");
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDashboard = async (authToken: string) => {
    try {
      const url = activeFirm
        ? `${API_BASE}/api/v1/professional/dashboard?firm_id=${activeFirm.id}`
        : `${API_BASE}/api/v1/professional/dashboard`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      }
    } catch (error) {
      console.error("Error fetching dashboard:", error);
    }
  };

  const refreshProfile = async () => {
    if (token) {
      await fetchProfile(token);
    }
  };

  const refreshDashboard = async () => {
    if (token) {
      await fetchDashboard(token);
    }
  };

  const logout = () => {
    setToken(null);
    setProfile(null);
    setFirms([]);
    setActiveFirm(null);
    setDashboardData(null);
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    router.push("/login");
  };

  const isOnboardingPage = pathname.includes("/onboarding");
  const typeInfo = profile ? PROFESSIONAL_TYPE_INFO[profile.professional_type] : null;
  const displayName = profile
    ? `${profile.user_first_name || ""} ${profile.user_last_name || ""}`.trim() || profile.user_email
    : "";

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <ProfessionalAuthContext.Provider
      value={{
        profile,
        firms,
        activeFirm,
        isLoading,
        token,
        dashboardData,
        logout,
        setActiveFirm,
        refreshProfile,
        refreshDashboard,
      }}
    >
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header - Emerald for professional context */}
        <header className="bg-emerald-950 text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/professional" className="flex items-center gap-3">
                  <div className="p-1.5 bg-emerald-800 rounded-lg">
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-lg font-bold tracking-tight">CommonGround</span>
                    <Badge variant="secondary" className="ml-2 text-xs bg-emerald-800 text-emerald-100 border-0">
                      Pro
                    </Badge>
                  </div>
                </Link>
              </div>

              {profile && !isOnboardingPage && (
                <div className="flex items-center gap-4">
                  {/* Firm Selector (if multiple firms) */}
                  {firms.length > 1 && (
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-900/50 rounded-lg">
                      <Building2 className="h-4 w-4 text-emerald-300" />
                      <select
                        value={activeFirm?.id || ""}
                        onChange={(e) => {
                          const firm = firms.find((f) => f.id === e.target.value);
                          setActiveFirm(firm || null);
                        }}
                        className="bg-transparent text-sm text-emerald-100 border-0 focus:ring-0 cursor-pointer"
                      >
                        {firms.map((firm) => (
                          <option key={firm.id} value={firm.id} className="bg-emerald-900 text-white">
                            {firm.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="text-right hidden sm:block">
                    <div className="font-medium text-sm">{displayName}</div>
                    {typeInfo && (
                      <div className="text-xs text-emerald-200">{typeInfo.label}</div>
                    )}
                  </div>
                  <Button
                    onClick={logout}
                    variant="ghost"
                    size="sm"
                    className="text-emerald-200 hover:text-white hover:bg-emerald-800"
                  >
                    <LogOut className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Sign Out</span>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Navigation */}
        {profile && !isOnboardingPage && (
          <ProfessionalNavigation pathname={pathname} dashboardData={dashboardData} />
        )}

        {/* Main Content */}
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-secondary/50 border-t border-border mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span>CommonGround Professional Portal</span>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cg-success" />
                  HIPAA Compliant
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  All actions logged
                </span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </ProfessionalAuthContext.Provider>
  );
}

// Navigation Component
function ProfessionalNavigation({
  pathname,
  dashboardData,
}: {
  pathname: string;
  dashboardData: any;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const mainNavItems: { href: string; label: string; icon: React.ReactNode; badge?: string }[] = [
    {
      href: "/professional/dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard className="h-4 w-4" />,
    },
    {
      href: "/professional/cases",
      label: "Cases",
      icon: <FolderOpen className="h-4 w-4" />,
      badge: dashboardData?.case_count?.toString(),
    },
    {
      href: "/professional/intake",
      label: "Intake",
      icon: <Bot className="h-4 w-4" />,
      badge: dashboardData?.pending_intakes > 0 ? dashboardData.pending_intakes.toString() : undefined,
    },
    {
      href: "/professional/messages",
      label: "Messages",
      icon: <MessageSquare className="h-4 w-4" />,
      badge: dashboardData?.unread_messages > 0 ? dashboardData.unread_messages.toString() : undefined,
    },
  ];

  const toolsNavItems: { href: string; label: string; icon: React.ReactNode; badge?: string }[] = [
    {
      href: "/professional/profile",
      label: "Profile",
      icon: <User className="h-4 w-4" />,
    },
  ];

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="bg-card border-b border-border shadow-sm hidden md:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {mainNavItems.map((item) => (
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
              {dashboardData?.pending_intakes > 0 && (
                <Badge variant="warning" className="text-xs">
                  {dashboardData.pending_intakes} pending intakes
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground relative"
              >
                <Bell className="h-4 w-4" />
                {dashboardData?.alerts?.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center">
                    {dashboardData.alerts.length}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </nav>

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

          <span className="text-sm text-muted-foreground">
            {pathname.split("/").pop()?.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) ||
              "Dashboard"}
          </span>

          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-4 w-4" />
            {dashboardData?.alerts?.length > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center">
                {dashboardData.alerts.length}
              </span>
            )}
          </Button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-border bg-card px-4 py-3 space-y-1">
            {[...mainNavItems, ...toolsNavItems].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  pathname.startsWith(item.href)
                    ? "bg-emerald-100 text-emerald-700"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                <span className="flex items-center gap-2">
                  {item.icon}
                  {item.label}
                </span>
                {item.badge && (
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-500 text-white rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}
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
  const isActive = current.startsWith(href);

  return (
    <Link
      href={href}
      className={`px-4 py-3 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
        isActive
          ? "border-emerald-600 text-emerald-600"
          : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
      }`}
    >
      {icon}
      {children}
      {badge && (
        <span className="ml-1 px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-500 text-white rounded-full">
          {badge}
        </span>
      )}
    </Link>
  );
}
