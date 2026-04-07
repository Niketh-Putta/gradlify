import React, { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";
import { Users, UserPlus, Activity, Crown, TrendingUp, TrendingDown, Loader2, PoundSterling, CreditCard } from "lucide-react";

const DAYS_LOOKBACK = 14;

type ApiTimelinePoint = {
  date: string;
  visits: number;
  visitors: number;
  newVisitors: number;
  signups: number;
  minutes: number;
};

type ApiKpis = {
  visitors?: {
    unique14d: number;
    // other fields omitted for conciseness
  };
  earnings?: {
    monthly: number;
    currency: string;
  };
  [key: string]: any;
};

type ApiTotals = {
  totalSignups: number;
  premiumSignups: number;
  sessionCount: number;
  mockAttempts: number;
};

type ApiPayload = {
  ok: boolean;
  data?: {
    timeline: ApiTimelinePoint[];
    kpis: ApiKpis;
    totals: ApiTotals;
    payingUsers?: PayingUser[];
    startDate: string;
    days: number;
  };
  message?: string;
};

type TrendPoint = ApiTimelinePoint & { label: string };

export type PayingUser = {
  id: string;
  name: string;
  email: string;
  plan: string;
  track: string;
  created_at: string;
  subscription_id: string;
};

type AnalyticsSnapshot = {
  timeline: TrendPoint[];
  kpis: ApiKpis;
  totals: ApiTotals;
  payingUsers: PayingUser[];
  startDate: string;
  days: number;
};

const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    Number.isFinite(value) ? value : 0
  );

export default function GrowthTracker() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem("adminAuth") === "true";
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  const [snapshot, setSnapshot] = useState<AnalyticsSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email === "niketh13putta@gmail.com" && password === "Welcome260679") {
      setIsAuthenticated(true);
      sessionStorage.setItem("adminAuth", "true");
      setAuthError("");
    } else {
      setAuthError("Invalid credentials");
    }
  };

  const fetchStats = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setErrorText(null);

    try {
      const { data, error } = await supabase.functions.invoke<ApiPayload>("admin-analytics", {
        body: { days: DAYS_LOOKBACK },
      });

      if (error) throw error;
      if (!data?.ok || !data.data) {
        throw new Error(data?.message || "Unable to load analytics.");
      }

      const api = data.data;
      const timeline: TrendPoint[] = (api.timeline ?? []).map((point) => {
        const day = new Date(point.date);
        return {
          ...point,
          label: day.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        };
      });

      setSnapshot({
        timeline,
        kpis: api.kpis,
        totals: api.totals,
        payingUsers: api.payingUsers || [],
        startDate: api.startDate,
        days: api.days,
      });
    } catch (err) {
      console.error("admin analytics fetch failed", err);
      setSnapshot(null);
      setErrorText("Unable to load analytics.");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && !snapshot) {
      fetchStats();
    }
  }, [isAuthenticated, fetchStats, snapshot]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <Card className="w-full max-w-md border-slate-200">
          <CardHeader>
            <CardTitle>Admin Access</CardTitle>
            <CardDescription>Sign in to view executive growth metrics.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {authError && <p className="text-sm text-red-500 font-medium">{authError}</p>}
              <Button type="submit" className="w-full bg-slate-900 text-white hover:bg-slate-800">
                Sign In
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const latestVisitPoint = snapshot?.timeline.at(-1);
  const previousVisitPoint = snapshot?.timeline.at(-2);

  const totalUsers = snapshot?.totals.totalSignups ?? 0;
  const uniqueVisitors = snapshot?.kpis?.visitors?.unique14d ?? 0;
  const signupsToday = latestVisitPoint?.signups ?? 0;
  const signupsYesterday = previousVisitPoint?.signups ?? 0;
  const signupsDelta = signupsToday - signupsYesterday;

  const activeToday = latestVisitPoint?.visitors ?? 0;
  const activeYesterday = previousVisitPoint?.visitors ?? 0;
  const activeDelta = activeToday - activeYesterday;

  const premiumConversions = snapshot?.totals.premiumSignups ?? 0;
  const monthlyRevenue = snapshot?.kpis?.earnings?.monthly ?? 0;
  const payingUsers = snapshot?.payingUsers ?? [];

  return (
    <div className="w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 bg-slate-50/50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 max-w-7xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Growth Metrics
          </h1>
          <p className="text-slate-500 mt-1">
            Track user acquisition, conversion, and daily activity.
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <Button onClick={fetchStats} variant="outline" disabled={loading} className="border-slate-200">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Refresh
          </Button>
          <Button
            onClick={() => {
              sessionStorage.removeItem("adminAuth");
              setIsAuthenticated(false);
            }}
            variant="ghost"
            className="text-slate-500 hover:text-slate-700"
          >
            Logout
          </Button>
        </div>
      </div>

      {snapshot ? (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 slide-in-from-bottom-2">
          {/* Executive Overview Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-slate-200 shadow-sm border-t-2 border-t-emerald-500">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Monthly Revenue (MRR)</p>
                    <h3 className="text-3xl font-bold text-slate-900 mt-2">
                      £{formatNumber(monthlyRevenue)}
                    </h3>
                  </div>
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                    <PoundSterling className="w-6 h-6" />
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-4 text-sm">
                  <span className="text-slate-400">Verified recurring payments</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm border-t-2 border-t-purple-500">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Active Subscribers</p>
                    <h3 className="text-3xl font-bold text-slate-900 mt-2">
                      {formatNumber(premiumConversions)}
                    </h3>
                  </div>
                  <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                    <Crown className="w-6 h-6" />
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-4 text-sm">
                  <span className="text-slate-400">Currently active profiles</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm border-t-2 border-t-blue-500">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Registered Accounts</p>
                    <h3 className="text-3xl font-bold text-slate-900 mt-2">
                      {formatNumber(totalUsers)}
                    </h3>
                  </div>
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                    <Users className="w-6 h-6" />
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-4 text-sm">
                  <span className="text-slate-400">Total lifetime sign-ups</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Activity Pulse Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-4 sm:p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Site Visitors (14d)</p>
                    <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2">{formatNumber(uniqueVisitors)}</h3>
                  </div>
                  <div className="p-2 sm:p-3 bg-sky-50 text-sky-600 rounded-xl">
                    <Activity className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                </div>
                <div className="mt-4 text-sm text-slate-400">
                  Different people visited
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-4 sm:p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Sign-ups (Today)</p>
                    <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2">{formatNumber(signupsToday)}</h3>
                  </div>
                  <div className="p-2 sm:p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                     <UserPlus className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-4 text-sm flex-wrap">
                  {signupsDelta >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-rose-500 flex-shrink-0" />
                  )}
                  <span className={signupsDelta >= 0 ? "text-emerald-600 font-medium whitespace-nowrap" : "text-rose-600 font-medium whitespace-nowrap"}>
                    {signupsDelta > 0 ? "+" : ""}{formatNumber(signupsDelta)}
                  </span>
                  <span className="text-slate-400 whitespace-nowrap">from yesterday</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-4 sm:p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Active Today</p>
                    <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2">{formatNumber(activeToday)}</h3>
                  </div>
                  <div className="p-2 sm:p-3 bg-slate-100 text-slate-600 rounded-xl">
                    <Users className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-4 text-sm flex-wrap">
                  {activeDelta >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-rose-500 flex-shrink-0" />
                  )}
                  <span className={activeDelta >= 0 ? "text-emerald-600 font-medium whitespace-nowrap" : "text-rose-600 font-medium whitespace-nowrap"}>
                    {activeDelta > 0 ? "+" : ""}{formatNumber(activeDelta)}
                  </span>
                  <span className="text-slate-400 whitespace-nowrap">from yesterday</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-slate-200 shadow-sm border-t-4 border-t-blue-500">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 gap-4">
              <div className="space-y-1">
                <CardTitle>14-Day Growth Trend</CardTitle>
                <CardDescription>
                  Comparing daily active visitors vs new sign-ups over time.
                </CardDescription>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-slate-600">Active Visitors</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-slate-600">Sign-ups</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={snapshot.timeline} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorSignups" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis 
                      dataKey="label" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: "#64748B", fontSize: 12 }} 
                      dy={10} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: "#64748B", fontSize: 12 }} 
                      dx={-10} 
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                    />
                    <Area
                      type="monotone"
                      name="Active Visitors"
                      dataKey="visitors"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorActive)"
                    />
                    <Area
                      type="monotone"
                      name="Sign-ups"
                      dataKey="signups"
                      stroke="#10b981"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorSignups)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm border-t-2 border-t-purple-500 overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CreditCard className="w-5 h-5 text-purple-600" />
                Live Paying Customers
              </CardTitle>
              <CardDescription>
                Detailed breakdown of your specifically verified active subscribers.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {payingUsers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50/80 text-slate-500 text-xs uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4 font-medium">User Profile</th>
                        <th className="px-6 py-4 font-medium">Email Address</th>
                        <th className="px-6 py-4 font-medium">Subscription Type</th>
                        <th className="px-6 py-4 font-medium">Since Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {payingUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-medium text-slate-900 capitalize">
                            {user.name && user.name !== "Unknown" ? user.name : "Anonymous"}
                          </td>
                          <td className="px-6 py-4">{user.email}</td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
                              {user.plan} · {user.track === 'gcse' ? 'GCSE' : '11+'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-slate-500">
                            {new Date(user.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500">
                  <Crown className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <p>No guaranteed live payments verified yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : errorText ? (
        <div className="max-w-7xl mx-auto rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600 mt-8">
          {errorText}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center min-h-[400px] mt-8">
          <Loader2 className="w-8 h-8 text-slate-300 animate-spin" />
        </div>
      )}
    </div>
  );
}
