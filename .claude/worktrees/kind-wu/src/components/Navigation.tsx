import { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DevModeBadge } from "@/components/DevModeBadge";
import { LogoMark } from "@/components/LogoMark";
import { 
  Home, 
  MessageSquare, 
  BarChart2, 
  BookOpen,
  Calendar,
  FileText,
  Library,
  BookMarked,
  Settings,
  LogOut,
  Menu,
  X,
  Users,
  ChevronDown,
  ChevronRight,
  MoreHorizontal
} from "lucide-react";
import { User } from '@supabase/supabase-js';
import { cn } from "@/lib/utils";
import { useMembership } from '@/hooks/useMembership';
import { AI_FEATURE_ENABLED } from "@/lib/featureFlags";
import { resolveUserTrack } from '@/lib/track';
import { getTrackLabel } from '@/lib/trackCurriculum';

interface NavigationProps {
  user: User;
  profile?: {
    id: string;
    user_id: string;
    tier?: string;
    is_premium?: boolean | null;
    premium_until?: string | null;
    plan?: string | null;
    current_period_end?: string | null;
    premium_track?: 'gcse' | '11plus' | 'eleven_plus' | null;
    founder_track?: 'competitor' | 'founder' | null;
    track?: 'gcse' | '11plus' | null;
    onboarding?: Record<string, unknown>;
  } | null;
  onSettings: () => void;
  onSignOut: () => void;
}

export function Navigation({ user, profile, onSettings, onSignOut }: NavigationProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [bottomNavHidden, setBottomNavHidden] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);
  const [moreExpanded, setMoreExpanded] = useState(false);
  const [bottomMoreOpen, setBottomMoreOpen] = useState(false);
  const lastScrollYRef = useRef(0);
  const scrollTickingRef = useRef(false);
  const location = useLocation();

  const shouldAutoCollapseDesktopSidebar = () => {
    if (typeof window === 'undefined') return false;
    if (!('matchMedia' in window)) return false;
    return window.matchMedia('(hover: none)').matches;
  };

  const handleNavSelection = (opts?: { isMobile?: boolean }) => {
    const isMobile = Boolean(opts?.isMobile);
    if (isMobile) {
      setMobileMenuOpen(false);
      return;
    }

    if (shouldAutoCollapseDesktopSidebar()) {
      setSidebarHovered(false);
      setMoreExpanded(false);
    }
  };
  
  // Auto-close mobile menu on route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Handle scroll for mobile header and bottom nav auto-hide
  useEffect(() => {
    const handleScroll = () => {
      if (scrollTickingRef.current) return;
      scrollTickingRef.current = true;

      window.requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;
        const lastScrollY = lastScrollYRef.current;

        if (currentScrollY < 10) {
          setHeaderHidden(false);
          setBottomNavHidden(false);
        } else if (currentScrollY > lastScrollY && currentScrollY > 80) {
          setHeaderHidden(true);
          setBottomNavHidden(true);
          setMobileMenuOpen(false);
        } else if (currentScrollY < lastScrollY) {
          setHeaderHidden(false);
          setBottomNavHidden(false);
        }

        lastScrollYRef.current = currentScrollY;
        scrollTickingRef.current = false;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  type OnboardingDetails = { preferredName?: string | null; [key: string]: unknown };
  const onboarding = (profile?.onboarding as OnboardingDetails | undefined) ?? {};
  const preferredName = typeof onboarding.preferredName === 'string' ? onboarding.preferredName.trim() : '';
  const userName = preferredName || user.user_metadata?.name || user.email?.split('@')[0] || '';
  const membership = useMembership();
  const userTrack = resolveUserTrack(profile?.track ?? null);
  const normalizePremiumTrack = (value?: string | null): 'gcse' | '11plus' | null => {
    if (!value) return null;
    if (value === 'gcse') return 'gcse';
    if (value === '11plus' || value === 'eleven_plus') return '11plus';
    return null;
  };

  // Check admin status
  const isAdmin = user.email === 'team@gradlify.com';

  const resolveTier = () => {
    if (!profile) {
      return {
        isPremium: membership.isPremium,
        founderTrack: membership.founderTrack ?? null,
      };
    }

    const premiumUntil = profile.premium_until ?? profile.current_period_end ?? null;
    const hasPlan = Boolean(profile.plan && profile.plan !== 'free');
    const hasActivePeriod =
      !premiumUntil || new Date(premiumUntil).getTime() > Date.now();
    const isPlanActive = hasPlan && hasActivePeriod;
    const isPremiumFlag = Boolean(profile.is_premium) && hasActivePeriod;
    const premiumTrack = normalizePremiumTrack(profile.premium_track ?? null);
    const hasTrackPremium = premiumTrack ? premiumTrack === userTrack : userTrack === 'gcse';
    const isPremium = (profile.tier === 'premium' || isPlanActive || isPremiumFlag) && hasTrackPremium;
    const founderTrack = profile.founder_track ?? null;

    return { isPremium, founderTrack };
  };

  const { isPremium, founderTrack } = resolveTier();
  const homePath = '/dashboard';
  const trackLabel = getTrackLabel(userTrack);
  const trackLabelWithAI = userTrack === '11plus' ? 'AI-Powered 11+ Maths Practice' : 'AI-Powered GCSE Maths Practice';
  const hasExplicitTrack = Boolean(profile?.track);
  const topBarTrackLabel = hasExplicitTrack
    ? (AI_FEATURE_ENABLED ? trackLabelWithAI : trackLabel)
    : 'Maths. Practised properly.';
  const topBarTrackShortLabel = hasExplicitTrack ? trackLabel : 'Maths. Practised properly.';

  const primaryNavigationItems = [
    { path: homePath, icon: Home, label: 'Home' },
    { path: '/readiness', icon: BarChart2, label: 'Exam Readiness' },
    { path: '/notes', icon: BookMarked, label: 'Notes' },
    { path: '/mocks', icon: FileText, label: 'Practice' },
  ];

  const moreNavigationItems = [
    ...(AI_FEATURE_ENABLED ? [{ path: '/chat', icon: MessageSquare, label: 'AI Chat' }] : []),
    { path: '/connect', icon: Users, label: 'Leaderboard' },
    { path: '/resources', icon: Library, label: 'Resources' },
  ];

  const getTierDisplay = () => {
    if (isAdmin) return 'Admin';
    if (founderTrack === 'founder') return 'Founder';
    if (isPremium) return 'Premium';
    return 'Free';
  };

  const getTierVariant = () => {
    if (isAdmin) return 'secondary';
    if (founderTrack === 'founder') return 'default';
    if (isPremium) return 'default';
    return 'outline';
  };

  const NavItem = ({ item, isMobile = false, isCollapsed = false, inGrid = false }: { 
    item: typeof primaryNavigationItems[0], 
    isMobile?: boolean,
    isCollapsed?: boolean,
    inGrid?: boolean
  }) => (
    <NavLink
      to={item.path}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-2 px-2.5 py-1.5 2xl:py-2 rounded-lg transition-colors duration-150 ease-out relative group/nav-item",
          isActive
            ? 'bg-primary text-primary-foreground shadow-primary'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/70',
          isMobile && 'justify-center flex-col gap-1 min-h-[56px]',
          isCollapsed && !isMobile && 'justify-center w-full px-0 py-1.5 2xl:py-2',
          inGrid && 'py-2.5'
        )
      }
      onClick={() => handleNavSelection({ isMobile })}
    >
      <item.icon className={cn(
        "transition-all duration-200 shrink-0",
        isMobile ? 'h-4 w-4' : 'h-4 w-4 2xl:h-[18px] 2xl:w-[18px]',
        isCollapsed && !isMobile && 'h-4 w-4 2xl:h-[18px] 2xl:w-[18px]'
      )} />
      <span className={cn(
        "font-medium transition-all duration-200 whitespace-nowrap overflow-hidden text-ellipsis",
        isMobile && 'text-xs',
        !isMobile && 'text-sm',
        isCollapsed && !isMobile && 'opacity-0 w-0'
      )}>
        {item.label}
      </span>
    </NavLink>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside 
        className={cn(
          "hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 bg-gradient-card border-r shadow-card transition-all duration-200 ease-in-out z-50 overflow-hidden",
          sidebarHovered ? "lg:w-64" : "lg:w-16"
        )}
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
      >
        {/* Logo */}
          <NavLink
            to={homePath}
            onClick={() => handleNavSelection({ isMobile: false })}
            className="flex items-center gap-2 py-2 2xl:py-3 pr-3 pl-2 hover:bg-muted/50 transition-colors cursor-pointer rounded-2xl ml-0 mr-2 mb-1 shrink-0"
          >
            <LogoMark
              className="shrink-0"
              size={36}
            />
            <div className={cn(
              "transition-all duration-200 overflow-hidden leading-tight",
              sidebarHovered ? "opacity-100 w-auto" : "opacity-0 w-0"
            )}>
              <h1 className="text-sm 2xl:text-base font-bold font-gradlify bg-gradient-gradlify bg-clip-text text-transparent">
                Gradlify
              </h1>
              <p className="text-[10px] 2xl:text-xs text-muted-foreground max-w-[120px]">
                {topBarTrackLabel}
              </p>
            </div>
          </NavLink>

        {/* User Info */}
        <div className="px-2 py-1.5 2xl:py-2 mb-1 flex items-center shrink-0">
          <div className="flex items-center gap-2 w-full">
            <div className="w-6 h-6 2xl:w-7 2xl:h-7 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
              <span className="text-[10px] 2xl:text-xs font-semibold text-primary">
                {userName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className={cn(
              "transition-all duration-200 overflow-hidden min-w-0 flex-1",
              sidebarHovered ? "opacity-100 w-auto" : "opacity-0 w-0"
            )}>
              <p className="font-medium text-xs whitespace-nowrap overflow-hidden text-ellipsis">
                {userName}
              </p>
              <Badge 
                variant={getTierVariant()}
                className="text-[10px] mt-0.5 whitespace-nowrap h-4 px-1.5"
              >
                {getTierDisplay()}
              </Badge>
              <Badge variant="outline" className="text-[10px] mt-1 whitespace-nowrap h-4 px-1.5">
                {trackLabel}
              </Badge>
            </div>
          </div>
        </div>

        {/* Navigation - Scrollable */}
        <nav className={cn(
          "flex-1 overflow-y-auto overflow-x-hidden transition-all duration-200 min-h-0",
          sidebarHovered ? "px-2 py-2" : "px-2 py-2"
        )}>
          {/* Primary Navigation */}
          <div className="space-y-0.5 2xl:space-y-1">
            {primaryNavigationItems.map((item) => (
              <NavItem key={item.path} item={item} isCollapsed={!sidebarHovered} />
            ))}
          </div>
          
          <div className="my-2 2xl:my-3" />
          
          {/* More Section */}
          <div className="space-y-0.5 2xl:space-y-1">
            <button
              onClick={() => setMoreExpanded(!moreExpanded)}
              className={cn(
                "flex items-center rounded-lg transition-all duration-200 ease-in-out",
                "text-muted-foreground hover:text-foreground hover:bg-muted/70",
                sidebarHovered ? 'gap-2 px-2.5 py-1.5 2xl:py-2 w-full' : 'justify-center py-1.5 2xl:py-2 w-full pl-2.5'
              )}
            >
              <MoreHorizontal className={cn(
                "h-4 w-4 2xl:h-[18px] 2xl:w-[18px] shrink-0 transition-all duration-200"
              )} />
              <span className={cn(
                "font-medium text-sm transition-all duration-200 whitespace-nowrap overflow-hidden text-ellipsis flex-1 text-left",
                !sidebarHovered && 'opacity-0 w-0'
              )}>
                More
              </span>
              {sidebarHovered && (
                moreExpanded ? 
                  <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : 
                  <ChevronRight className="h-3.5 w-3.5 shrink-0" />
              )}
            </button>
            
            {/* More Items - Expandable */}
            {moreExpanded && (
              <div className="space-y-0.5 2xl:space-y-1 mt-0.5">
                {moreNavigationItems.map((item) => (
                  <NavItem key={item.path} item={item} isCollapsed={!sidebarHovered} />
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* Settings & Logout */}
        <div className={cn(
          "space-y-0.5 2xl:space-y-1 rounded-2xl transition-all duration-200 shrink-0 border-t border-border/50 mt-1",
          sidebarHovered ? "p-2 mx-2" : "px-2 py-2 mx-0"
        )}>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "transition-colors duration-150",
              sidebarHovered ? "w-full justify-start h-8 2xl:h-9" : "w-full h-8 2xl:h-9 p-0 justify-center"
            )}
            onClick={() => {
              handleNavSelection({ isMobile: false });
              onSettings();
            }}
          >
            <Settings className="h-4 w-4 2xl:h-[18px] 2xl:w-[18px] shrink-0" />
            <span className={cn(
              "ml-2 transition-all duration-200 whitespace-nowrap overflow-hidden text-ellipsis text-sm",
              sidebarHovered ? "opacity-100 w-auto" : "opacity-0 w-0 ml-0"
            )}>
              Settings
            </span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "text-destructive hover:text-destructive transition-colors duration-150",
              sidebarHovered ? "w-full justify-start h-8 2xl:h-9" : "w-full h-8 2xl:h-9 p-0 justify-center"
            )}
            onClick={() => {
              handleNavSelection({ isMobile: false });
              onSignOut();
            }}
          >
            <LogOut className="h-4 w-4 2xl:h-[18px] 2xl:w-[18px] shrink-0" />
            <span className={cn(
              "ml-2 transition-all duration-200 whitespace-nowrap overflow-hidden text-ellipsis text-sm",
              sidebarHovered ? "opacity-100 w-auto" : "opacity-0 w-0 ml-0"
            )}>
              Sign Out
            </span>
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className={cn(
        "lg:hidden bg-background shadow-card sticky top-0 z-40 transition-transform duration-300 ease-in-out rounded-b-3xl",
        headerHidden ? "-translate-y-full" : "translate-y-0"
      )}>
        <div className="flex items-center justify-between p-4">
          <NavLink to={homePath} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <LogoMark size={32} />
            <div>
              <h1 className="text-lg font-bold font-gradlify bg-gradient-gradlify bg-clip-text text-transparent whitespace-nowrap">Gradlify</h1>
              <p className="text-[10px] text-muted-foreground">{topBarTrackShortLabel}</p>
            </div>
          </NavLink>
          <div className="flex items-center gap-2">
            <DevModeBadge />
            <Badge 
              variant={getTierVariant()}
              className="text-xs whitespace-nowrap"
            >
              {getTierDisplay()}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="shrink-0"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="bg-gradient-card absolute top-full left-0 right-0 z-50 shadow-lg rounded-b-3xl">
            <div className="p-4">
              <p className="font-medium text-sm whitespace-nowrap overflow-hidden text-ellipsis">
                {userName}
              </p>
            </div>
            <nav className="p-2">
              <div className="grid grid-cols-2 gap-1.5">
                {primaryNavigationItems.map((item) => (
                  <NavItem key={item.path} item={item} inGrid />
                ))}
              </div>
              
              {/* More Section */}
              <div className="mt-2 pt-2 border-t border-border/50">
                <button
                  onClick={() => setMoreExpanded(!moreExpanded)}
                  className={cn(
                    "flex items-center justify-between w-full px-2.5 py-2 rounded-lg transition-all duration-200",
                    "text-muted-foreground hover:text-foreground hover:bg-muted/70",
                    moreExpanded && "bg-muted/50"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="font-medium text-sm">More</span>
                  </div>
                  {moreExpanded ? 
                    <ChevronDown className="h-4 w-4" /> : 
                    <ChevronRight className="h-4 w-4" />
                  }
                </button>
                
                {moreExpanded && (
                  <div className="grid grid-cols-2 gap-1.5 mt-1.5 pl-2">
                    {moreNavigationItems.map((item) => (
                      <NavItem key={item.path} item={item} inGrid />
                    ))}
                  </div>
                )}
              </div>
              
              <div className="mt-2 pt-2 space-y-1 border-t border-border/50">
                <Button
                  variant="ghost"
                  className="w-full justify-start whitespace-nowrap overflow-hidden text-ellipsis"
                  onClick={() => {
                    onSettings();
                    setMobileMenuOpen(false);
                  }}
                >
                  <Settings className="h-4 w-4 mr-3 shrink-0" />
                  <span className="overflow-hidden text-ellipsis">Settings</span>
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-destructive hover:text-destructive whitespace-nowrap overflow-hidden text-ellipsis"
                  onClick={() => {
                    onSignOut();
                    setMobileMenuOpen(false);
                  }}
                >
                  <LogOut className="h-4 w-4 mr-3 shrink-0" />
                  <span className="overflow-hidden text-ellipsis">Sign Out</span>
                </Button>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Mobile Bottom Navigation - Tablet Only (hidden on phone) */}
      <nav className={cn(
        "hidden sm:block lg:hidden fixed bottom-0 left-0 right-0 bg-gradient-card shadow-card pb-safe z-50 transition-transform duration-300 ease-in-out rounded-t-3xl",
        bottomNavHidden ? "translate-y-full" : "translate-y-0"
      )}>
        {/* More Menu Popup */}
        {bottomMoreOpen && (
          <>
            <div 
              className="fixed inset-0 bg-black/20 z-40" 
              onClick={() => setBottomMoreOpen(false)} 
            />
            <div className="absolute bottom-full right-4 mb-2 bg-card border border-border rounded-2xl shadow-xl p-2 z-50 min-w-[160px]">
              {moreNavigationItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setBottomMoreOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
                    )
                  }
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="font-medium text-sm">{item.label}</span>
                </NavLink>
              ))}
            </div>
          </>
        )}
        
        <div className="flex items-center justify-around px-2 py-2">
          {primaryNavigationItems.map((item) => (
            <div key={item.path} className="flex-1 max-w-[120px]">
              <NavItem item={item} isMobile />
            </div>
          ))}
          {/* More Button */}
          <div className="flex-1 max-w-[120px]">
            <button
              onClick={() => setBottomMoreOpen(!bottomMoreOpen)}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-colors duration-150 ease-out relative w-full",
                "justify-center flex-col min-h-[56px]",
                bottomMoreOpen
                  ? 'bg-primary text-primary-foreground shadow-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
              )}
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="font-medium text-xs">More</span>
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
