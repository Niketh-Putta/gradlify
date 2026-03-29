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
import { useSubject } from '@/contexts/SubjectContext';
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
  const { currentSubject } = useSubject();
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
        isUltra: membership.isUltra,
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
    const isUltra = profile.plan === 'ultra' && hasTrackPremium;
    const founderTrack = profile.founder_track ?? null;

    return { isPremium, isUltra, founderTrack };
  };

  const { isPremium, isUltra, founderTrack } = resolveTier();
  const homePath = '/dashboard';
  const trackLabel = getTrackLabel(userTrack, currentSubject);
  const trackLabelWithAI = userTrack === '11plus' ? `AI-Powered 11+ ${currentSubject === 'english' ? 'English' : 'Maths'}` : 'AI-Powered GCSE Maths';
  const hasExplicitTrack = Boolean(profile?.track);
  const topBarTrackLabel = hasExplicitTrack
    ? (AI_FEATURE_ENABLED ? trackLabelWithAI : trackLabel)
    : '11+ practiced properly.';
  const topBarTrackShortLabel = hasExplicitTrack ? trackLabel : '11+ practiced properly.';

  const primaryNavigationItems = [
    { path: homePath, icon: Home, label: 'Home' },
    { path: '/readiness', icon: BarChart2, label: 'Exam Readiness' },
    { path: '/notes', icon: BookMarked, label: 'Notes' },
    { path: `/mocks/${currentSubject}`, icon: FileText, label: 'Practice' },
  ];

  const moreNavigationItems = [
    ...(AI_FEATURE_ENABLED ? [{ path: '/chat', icon: MessageSquare, label: 'AI Chat' }] : []),
    { path: '/connect', icon: Users, label: 'Leaderboard' },
    { path: '/resources', icon: Library, label: 'Resources' },
  ];

  const getTierDisplay = () => {
    if (isAdmin) return 'Admin';
    if (founderTrack === 'founder') return 'Founder';
    if (isUltra) return 'Ultra';
    if (isPremium) return 'Premium';
    return 'Free';
  };

  const getTierVariant = () => {
    if (isAdmin) return 'secondary';
    if (founderTrack === 'founder') return 'default';
    if (isUltra) return 'outline'; // Ultra has its own inline styling or badge below
    if (isPremium) return 'default';
    return 'outline';
  };

  const NavItem = ({ item, isMobile = false, inGrid = false }: { 
    item: typeof primaryNavigationItems[0], 
    isMobile?: boolean,
    inGrid?: boolean
  }) => (
    <NavLink
      to={item.path}
      className={({ isActive }) =>
        cn(
          "flex items-center rounded-xl transition-all duration-300 ease-in-out relative overflow-hidden",
          isActive
            ? cn(
                 "font-semibold",
                 currentSubject === 'english' ? "bg-amber-500/10 text-amber-500" : "bg-primary/10 text-primary"
              )
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/70',
          isMobile 
            ? 'justify-center flex-col gap-1 min-h-[56px] py-2 px-1 w-full' 
            : inGrid 
              ? 'py-2.5 px-3 gap-3 min-h-[56px] w-full'
              : cn('h-11', sidebarHovered ? 'w-full' : 'w-11')
        )
      }
      onClick={() => handleNavSelection({ isMobile })}
    >
      <div className={cn(
        "flex items-center justify-center shrink-0",
        isMobile ? "h-6 w-full" : inGrid ? "w-6 h-6" : "w-11 h-11"
      )}>
        <item.icon className={cn(
          "shrink-0 transition-transform duration-300",
          isMobile ? 'h-5 w-5' : 'h-[18px] w-[18px]',
          !isMobile && !inGrid && sidebarHovered && 'scale-105'
        )} />
      </div>
      {!isMobile && !inGrid ? (
        <span className={cn(
          "font-medium whitespace-nowrap text-sm absolute left-11 transition-all duration-300",
          sidebarHovered ? "opacity-100 translate-x-1" : "opacity-0 -translate-x-4 pointer-events-none"
        )}>
          {item.label}
        </span>
      ) : (
        <span className={cn(
           "font-medium whitespace-nowrap overflow-hidden pr-2",
           inGrid ? 'text-sm' : 'text-xs'
        )}>
          {item.label}
        </span>
      )}
    </NavLink>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside 
        className={cn(
          "hidden lg:block lg:fixed lg:inset-y-0 bg-gradient-card border-r shadow-card transition-all duration-300 ease-in-out z-50 overflow-hidden whitespace-nowrap",
          sidebarHovered ? "w-64" : "w-16"
        )}
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
      >
        <div className="flex flex-col h-full pt-3 pb-3 px-[10px] w-64">
          {/* Logo */}
          <NavLink
            to={homePath}
            onClick={() => handleNavSelection({ isMobile: false })}
            className={cn(
              "flex items-center hover:bg-muted/50 transition-all duration-300 cursor-pointer rounded-xl shrink-0 h-12 overflow-hidden mb-4 relative",
              sidebarHovered ? "w-[236px]" : "w-11"
            )}
          >
            <div className="w-11 h-11 flex items-center justify-center shrink-0">
               <LogoMark size={28} className="shrink-0" />
            </div>
            <div className={cn(
              "flex flex-col justify-center whitespace-nowrap absolute left-11 transition-all duration-300 pl-1",
              sidebarHovered ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 pointer-events-none"
            )}>
              <h1 className="text-sm font-bold font-gradlify bg-gradient-gradlify bg-clip-text text-transparent truncate">
                Gradlify
              </h1>
              <p className="text-[10px] text-muted-foreground truncate w-40 tracking-wide">
                {topBarTrackLabel}
              </p>
            </div>
          </NavLink>

          {/* User Info */}
          <div className={cn(
             "flex items-center shrink-0 h-11 overflow-hidden mb-2 relative rounded-xl transition-all duration-300",
             sidebarHovered ? "w-[236px] bg-muted/40" : "w-11 bg-transparent"
          )}>
            <div className="w-11 h-11 flex items-center justify-center shrink-0">
              <div className={cn(
                 "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border shadow-md transition-all duration-500 ease-in-out",
                 currentSubject === 'english' 
                   ? "bg-amber-500/10 border-amber-500/30 shadow-amber-500/5 dark:border-amber-500/20" 
                   : "bg-primary/10 border-primary/30 shadow-primary/5 dark:border-primary/20"
              )}>
                <span className={cn(
                   "text-[11px] font-black tracking-tight",
                   currentSubject === 'english' ? "text-amber-600" : "text-primary"
                )}>
                  {userName.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
            <div className={cn(
              "flex flex-col justify-center min-w-0 flex-1 whitespace-nowrap absolute left-11 transition-all duration-300 pl-1",
              sidebarHovered ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 pointer-events-none"
            )}>
              <p className="font-semibold text-xs truncate pr-4 text-foreground">
                {userName.split(' ')[0]}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                <Badge 
                  variant={getTierVariant()}
                  className={cn(
                    "text-[8px] h-3.5 px-1 whitespace-nowrap uppercase tracking-widest",
                    founderTrack === 'founder' && currentSubject === 'english' && "bg-gradient-to-r from-amber-400 to-amber-500 text-white border-0 shadow-sm",
                    founderTrack === 'founder' && currentSubject !== 'english' && "bg-gradient-to-r from-indigo-500 to-blue-500 text-white border-0 shadow-sm",
                    isUltra && "bg-gradient-to-r from-amber-200 to-amber-400 text-slate-900 border-0 shadow-sm",
                    isPremium && !isUltra && !founderTrack && "bg-gradient-to-r from-indigo-500 to-blue-500 text-white border-0 shadow-sm"
                  )}
                >
                  {getTierDisplay()}
                </Badge>
              </div>
            </div>
          </div>

          {/* Navigation - Scrollable */}
          <nav className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 py-2">
            <div className="space-y-1">
              {[...primaryNavigationItems, ...moreNavigationItems].map((item) => (
                <NavItem key={item.path} item={item} />
              ))}
            </div>
          </nav>

          {/* Settings & Logout */}
          <div className="space-y-1 shrink-0 border-t border-border/50 pt-3 mt-2">
            <button
              className={cn(
                "flex items-center rounded-xl transition-all duration-300 ease-in-out text-muted-foreground hover:text-foreground hover:bg-muted/70 h-11 overflow-hidden relative",
                sidebarHovered ? "w-[236px]" : "w-11"
              )}
              onClick={() => {
                handleNavSelection({ isMobile: false });
                onSettings();
              }}
            >
              <div className="w-11 h-11 flex items-center justify-center shrink-0">
                <Settings className="h-5 w-5 shrink-0" />
              </div>
              <span className={cn(
                "text-sm font-medium whitespace-nowrap absolute left-11 transition-all duration-300",
                sidebarHovered ? "opacity-100 translate-x-1" : "opacity-0 -translate-x-4 pointer-events-none"
              )}>Settings</span>
            </button>
            <button
              className={cn(
                "flex items-center rounded-xl transition-all duration-300 ease-in-out text-destructive hover:text-destructive hover:bg-destructive/10 h-11 overflow-hidden relative",
                sidebarHovered ? "w-[236px]" : "w-11"
              )}
              onClick={() => {
                handleNavSelection({ isMobile: false });
                onSignOut();
              }}
            >
              <div className="w-11 h-11 flex items-center justify-center shrink-0">
                <LogOut className="h-5 w-5 shrink-0" />
              </div>
              <span className={cn(
                "text-sm font-medium whitespace-nowrap absolute left-11 transition-all duration-300",
                sidebarHovered ? "opacity-100 translate-x-1" : "opacity-0 -translate-x-4 pointer-events-none"
              )}>Sign Out</span>
            </button>
          </div>
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
              className={cn(
                "text-xs whitespace-nowrap transition-all",
                founderTrack === 'founder' && currentSubject === 'english' && "bg-gradient-to-r from-amber-400 to-amber-500 text-white border-0 font-bold shadow-[0_0_10px_rgba(245,158,11,0.2)]",
                founderTrack === 'founder' && currentSubject !== 'english' && "bg-gradient-to-r from-indigo-500 to-blue-500 text-white border-0 font-bold shadow-[0_0_10px_rgba(99,102,241,0.2)]",
                isUltra && "bg-gradient-to-r from-amber-200 to-amber-400 text-slate-900 border-0 font-bold shadow-[0_0_10px_rgba(245,158,11,0.2)]",
                isPremium && !isUltra && !founderTrack && "bg-gradient-to-r from-indigo-500 to-blue-500 text-white border-0 shadow-[0_0_10px_rgba(99,102,241,0.2)]"
              )}
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
                {[...primaryNavigationItems, ...moreNavigationItems].map((item) => (
                  <NavItem key={item.path} item={item} inGrid />
                ))}
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

      {/* Mobile Bottom Navigation - Phone and Tablet */}
      <nav className={cn(
        "block lg:hidden fixed bottom-0 left-0 right-0 bg-gradient-card shadow-card pb-safe z-50 transition-transform duration-300 ease-in-out rounded-t-3xl",
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
                        ? cn(currentSubject === 'english' ? 'bg-amber-500 text-white' : 'bg-primary text-primary-foreground')
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
                  ? cn(currentSubject === 'english' ? 'bg-amber-500 text-white shadow-amber-500/20' : 'bg-primary text-primary-foreground shadow-primary')
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
