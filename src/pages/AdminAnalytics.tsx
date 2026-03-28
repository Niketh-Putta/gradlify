import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/integrations/supabase/client"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart"
import {
  Area,
  AreaChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { ArrowDownRight, ArrowUpRight, Loader2 } from "lucide-react"

const DAYS_LOOKBACK = 14

const formatNumber = (value: number, digits = 0) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(
    Number.isFinite(value) ? value : 0
  )

const formatCompact = (value: number) =>
  new Intl.NumberFormat("en-US", { notation: "compact" }).format(
    Number.isFinite(value) ? value : 0
  )

const formatPercent = (value: number, digits = 1) =>
  `${(Number.isFinite(value) ? value : 0).toFixed(digits)}%`

const formatDelta = (value: number) => `${value >= 0 ? "+" : ""}${formatPercent(value)}`

const formatRange = (startIso: string, endIso: string) => {
  const start = new Date(startIso)
  const end = new Date(endIso)
  const startLabel = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
  const endLabel = end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
  return `${startLabel} – ${endLabel}`
}

const formatCurrency = (value: number, currency: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0)

type ApiTimelinePoint = {
  date: string
  visits: number
  visitors: number
  newVisitors: number
  signups: number
  minutes: number
}

type ApiKpis = {
  visitors: {
    unique14d: number
    unique7d: number
    uniquePrev7d: number
    visitorDays14d: number
    visitorDays7d: number
    visitorDaysPrev7d: number
  }
  signups: {
    total: number
    premiumTotal: number
    last14d: number
    last7d: number
    last30d: number
    period14d: number
    period7d: number
    periodPrev7d: number
  }
  engagement: {
    minutes14d: number
    minutes7d: number
    minutesPrev7d: number
    avgDailyMinutes14d: number
    minutesPerVisitorDay14d: number
    practiceAttempts14d: number
    practiceCorrect14d: number
    practiceAccuracy14d: number
  }
  questions: {
    attempted14d: number
    practiceAttempts14d: number
    mockAttempts14d: number
  }
  activity: {
    sessionsTotal: number
    sessions14d: number
    sessions7d: number
    sessions30d: number
    mocksTotal: number
    mocks14d: number
    mocks7d: number
    mocks30d: number
    practiceSessions14d: number
    practiceSessions7d: number
    practiceSessions30d: number
  }
  growth: {
    visitorDaysWoW: number
    signupsWoW: number
    minutesWoW: number
  }
  earnings: {
    monthly: number
    currency: string
    interval: string
  }
}

type ApiTotals = {
  totalSignups: number
  premiumSignups: number
  sessionCount: number
  mockAttempts: number
}

type ApiPayload = {
  ok: boolean
  data?: {
    timeline: ApiTimelinePoint[]
    kpis: ApiKpis
    totals: ApiTotals
    startDate: string
    days: number
  }
  message?: string
}

type TrendPoint = ApiTimelinePoint & {
  label: string
}

type AnalyticsSnapshot = {
  timeline: TrendPoint[]
  kpis: ApiKpis
  totals: ApiTotals
  startDate: string
  days: number
}

export default function AdminAnalytics() {
  const navigate = useNavigate()
  const [snapshot, setSnapshot] = useState<AnalyticsSnapshot | null>(null)
  const [loading, setLoading] = useState(false)
  const [errorText, setErrorText] = useState<string | null>(null)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [trendMetric, setTrendMetric] = useState<"visitors" | "newVisitors" | "signups" | "minutes">("visitors")

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setErrorText(null)

    try {
      const { data, error } = await supabase.functions.invoke<ApiPayload>("admin-analytics", {
        body: { days: DAYS_LOOKBACK },
      })

      if (error) throw error
      if (!data?.ok || !data.data) {
        throw new Error(data?.message || "Unable to load analytics.")
      }

      const api = data.data
      const timeline: TrendPoint[] = (api.timeline ?? []).map((point) => {
        const day = new Date(point.date)
        return {
          ...point,
          label: day.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        }
      })

      setSnapshot({
        timeline,
        kpis: api.kpis,
        totals: api.totals,
        startDate: api.startDate,
        days: api.days,
      })
      setUpdatedAt(new Date().toISOString())
    } catch (err) {
      console.error("admin analytics fetch failed", err)
      setSnapshot(null)
      setErrorText("Unable to load analytics.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const rangeLabel = useMemo(() => {
    if (!snapshot?.timeline.length) return null
    const end = snapshot.timeline[snapshot.timeline.length - 1]?.date
    if (!end) return null
    return formatRange(snapshot.startDate, end)
  }, [snapshot?.startDate, snapshot?.timeline])

  const premiumConversion = 0

  const acquisition = useMemo(() => {
    if (!snapshot) return null

    const visitorDays14d = snapshot.kpis.visitors.visitorDays14d
    const visitorDays7d = snapshot.kpis.visitors.visitorDays7d
    const visitorDaysPrev7d = snapshot.kpis.visitors.visitorDaysPrev7d
    const signups14d = snapshot.kpis.signups.period14d
    const signups7d = snapshot.kpis.signups.period7d
    const signupsPrev7d = snapshot.kpis.signups.periodPrev7d

    const signupRate = visitorDays14d === 0 ? 0 : (signups14d / visitorDays14d) * 100

    return {
      visitorDays14d,
      visitorDays7d,
      visitorDaysPrev7d,
      signups14d,
      signups7d,
      signupsPrev7d,
      signupRate,
    }
  }, [snapshot])

  const insights = useMemo(() => {
    if (!snapshot || !acquisition) return []

    const items: Array<{ label: string; value: string; tone?: "muted" | "good" | "warn" }> = []

    items.push({
      label: "Signup rate (14d)",
      value: `${formatPercent(acquisition.signupRate)} per visitor-day`,
      tone: acquisition.signupRate >= 5 ? "good" : "warn",
    })

    items.push({
      label: "Premium conversion",
      value: "0% · 0 premium accounts",
      tone: "muted",
    })

    items.push({
      label: "Minutes / visitor-day (14d)",
      value: `${formatNumber(snapshot.kpis.engagement.minutesPerVisitorDay14d, 1)} mins`,
      tone: snapshot.kpis.engagement.minutesPerVisitorDay14d >= 8 ? "good" : "muted",
    })

    items.push({
      label: "Practice accuracy (14d)",
      value: snapshot.kpis.engagement.practiceAttempts14d
        ? formatPercent(snapshot.kpis.engagement.practiceAccuracy14d, 1)
        : "—",
      tone: snapshot.kpis.engagement.practiceAttempts14d
        ? snapshot.kpis.engagement.practiceAccuracy14d >= 70
          ? "good"
          : "warn"
        : "muted",
    })

    return items
  }, [acquisition, snapshot])

  const trendSeries = useMemo(() => {
    if (!snapshot) return []
    return snapshot.timeline.map((point) => ({
      ...point,
      metric:
        trendMetric === "visitors"
          ? point.visitors
          : trendMetric === "newVisitors"
          ? point.newVisitors
          : trendMetric === "signups"
          ? point.signups
          : point.minutes,
    }))
  }, [snapshot, trendMetric])

  const trendConfig = useMemo(() => {
    if (trendMetric === "visitors") {
      return { metric: { color: "#22c55e", label: "Visitors" } }
    }
    if (trendMetric === "newVisitors") {
      return { metric: { color: "#38bdf8", label: "New visitors" } }
    }
    if (trendMetric === "signups") {
      return { metric: { color: "#6366f1", label: "Sign-ups" } }
    }
    return { metric: { color: "#f59e0b", label: "Minutes" } }
  }, [trendMetric])

  const trendHeadline = useMemo(() => {
    if (!snapshot) return null
    const latest = snapshot.timeline.at(-1)
    const previous = snapshot.timeline.at(-2)
    const currentValue =
      trendMetric === "visitors"
        ? latest?.visitors ?? 0
        : trendMetric === "newVisitors"
        ? latest?.newVisitors ?? 0
        : trendMetric === "signups"
          ? latest?.signups ?? 0
          : latest?.minutes ?? 0
    const previousValue =
      trendMetric === "visitors"
        ? previous?.visitors ?? 0
        : trendMetric === "newVisitors"
        ? previous?.newVisitors ?? 0
        : trendMetric === "signups"
          ? previous?.signups ?? 0
          : previous?.minutes ?? 0
    const delta = previousValue > 0 ? ((currentValue - previousValue) / previousValue) * 100 : 0
    const label =
      trendMetric === "visitors"
        ? "Visitors (today)"
        : trendMetric === "newVisitors"
        ? "New visitors (today)"
        : trendMetric === "signups"
          ? "Sign-ups (today)"
          : "Learning minutes (today)"

    return {
      label,
      value: formatNumber(currentValue),
      delta,
    }
  }, [snapshot, trendMetric])

  const earningsData = snapshot?.kpis.earnings

  const heroStats = useMemo(() => {
    if (!snapshot) return []
    return [
      {
        label: "Premium revenue",
        value: "£0",
        detail: "Reset; new inflow counts only",
      },
      {
        label: "Visitors (unique)",
        value: formatCompact(snapshot.kpis.visitors.unique14d),
        detail: "Different people opened the site",
      },
      {
        label: "Questions attempted (14d)",
        value: formatCompact(snapshot.kpis.questions.attempted14d ?? 0),
        detail: `${formatNumber(snapshot.kpis.questions.practiceAttempts14d)} practice · ${formatNumber(
          snapshot.kpis.questions.mockAttempts14d
        )} mock`,
      },
      {
        label: "Learning minutes (14d)",
        value: formatCompact(snapshot.kpis.engagement.minutes14d),
        detail: "Momentum across all sessions",
      },
    ]
  }, [snapshot])

  const visitSeries = useMemo(() => {
    if (!snapshot) return []
    return snapshot.timeline.map((point) => ({
      label: point.label,
      visits: point.visits,
    }))
  }, [snapshot])

  const latestVisitPoint = snapshot?.timeline.at(-1)
  const todayVisits = latestVisitPoint?.visits ?? 0

  const latestUpdateLabel = updatedAt
    ? new Date(updatedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    : "—"

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-white/20 bg-black/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.4em] text-white/50">
              Gradlify intelligence
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight">
                Executive analytics
              </h1>
              {rangeLabel ? (
                <Badge variant="outline" className="border-white/40 text-white">
                  {rangeLabel}
                </Badge>
              ) : null}
            </div>
            <p className="max-w-2xl text-sm text-white/60">
              Discreet, public-facing insights into visitors, conversions, and earnings. Bookmark
              <span className="text-white"> gradlify.com/nikethputtaadmin-xyz</span> and share only if necessary.
            </p>
          </div>
          <div className="flex flex-col gap-3 text-right">
            <p className="text-sm text-white/60">
              Latest refresh <span className="font-semibold text-white">{latestUpdateLabel}</span>
            </p>
            <div className="flex items-center justify-end gap-2">
              <Button
                size="sm"
                className="gap-2 text-white"
                onClick={fetchStats}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Refresh metrics
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-10 px-4 py-10">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {heroStats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-3xl border border-white/20 bg-black/50 p-5 shadow-[0_25px_60px_-35px_rgba(0,0,0,0.9)]"
            >
              <p className="text-xs uppercase tracking-[0.3em] text-white/60">{stat.label}</p>
              <p className="mt-4 text-3xl font-semibold text-white">{stat.value}</p>
              <p className="mt-2 text-sm text-white/70">{stat.detail}</p>
            </div>
          ))}
        </div>

        {visitSeries.length > 0 && (
          <Card className="border-white/30 bg-black/70 shadow-[0_25px_80px_-40px_rgba(0,0,0,0.95)]">
            <CardHeader className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-lg text-white">Visits (site opens)</CardTitle>
                <CardDescription className="text-white/60">
                  Graph of how many times the site was opened. Visitors (unique people) are tracked separately.
                </CardDescription>
              </div>
              <Badge variant="outline" className="border-white/40 text-white">
                {formatNumber(todayVisits)} today
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="space-y-4">
                <p className="text-4xl font-semibold text-white">{formatNumber(todayVisits)}</p>
                <ChartContainer className="h-32 w-full" config={{ visits: { color: "#ffffff" } }}>
                  <AreaChart
                    data={visitSeries}
                    margin={{ top: 16, right: 12, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.15)" />
                    <XAxis dataKey="label" tick={{ fill: "#FFFFFF" }} />
                    <YAxis allowDecimals={false} tick={{ fill: "#FFFFFF" }} />
                    <Tooltip
                      content={<ChartTooltipContent hideLabel indicator="dot" />}
                      formatter={(value: number) => formatNumber(value)}
                    />
                    <Area
                      type="monotone"
                      dataKey="visits"
                      stroke="var(--color-visits)"
                      strokeWidth={3}
                      fill="var(--color-visits)"
                      fillOpacity={0.25}
                    />
                  </AreaChart>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
        )}

        <section className="space-y-8">
          {errorText ? (
            <div className="rounded-3xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-100">
              {errorText}
            </div>
          ) : null}

          {!snapshot ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/60">
              Loading analytics...
            </div>
          ) : (
            <>
              <Card className="border-white/30 bg-black/60 shadow-[0_25px_80px_-40px_rgba(0,0,0,0.95)]">
                <CardHeader className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg text-white">Acquisition pulse</CardTitle>
                    <CardDescription className="text-white/70">
                      Today&apos;s totals with a 14-day trend line for context.
                    </CardDescription>
                  </div>
                  <ToggleGroup
                    type="single"
                    value={trendMetric}
                    onValueChange={(next) => {
                      if (
                        next === "visitors" ||
                        next === "newVisitors" ||
                        next === "signups" ||
                        next === "minutes"
                      ) {
                        setTrendMetric(next)
                      }
                    }}
                    className="gap-1"
                  >
                    <ToggleGroupItem value="visitors" className="text-white/80">
                      Visitors
                    </ToggleGroupItem>
                    <ToggleGroupItem value="newVisitors" className="text-white/80">
                      New visitors
                    </ToggleGroupItem>
                    <ToggleGroupItem value="signups" className="text-white/80">
                      Sign-ups
                    </ToggleGroupItem>
                    <ToggleGroupItem value="minutes" className="text-white/80">
                      Minutes
                    </ToggleGroupItem>
                  </ToggleGroup>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-white/60">
                        {trendHeadline?.label ?? "Trend metric"}
                      </p>
                      <p className="text-3xl font-semibold text-white">
                        {trendHeadline?.value ?? "-"}
                      </p>
                    </div>
                    {trendHeadline ? (
                      <Badge variant={trendHeadline.delta >= 0 ? "secondary" : "destructive"} className="gap-1">
                        {trendHeadline.delta >= 0 ? (
                          <ArrowUpRight className="h-4 w-4" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4" />
                        )}
                        {formatDelta(trendHeadline.delta)}
                      </Badge>
                    ) : null}
                  </div>
                  <ChartContainer className="h-64 w-full" config={trendConfig}>
                    <AreaChart
                      data={trendSeries}
                      margin={{ top: 16, right: 16, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                      <XAxis dataKey="label" tick={{ fill: "#FFFFFF" }} />
                      <YAxis allowDecimals={false} tick={{ fill: "#FFFFFF" }} />
                      <Tooltip content={<ChartTooltipContent hideLabel indicator="dot" />} />
                      <Area
                        type="monotone"
                        dataKey="metric"
                        stroke="var(--color-metric)"
                        strokeWidth={3}
                        fill="var(--color-metric)"
                        fillOpacity={0.25}
                      />
                    </AreaChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
                <Card className="border-white/30 bg-black/60">
                  <CardHeader className="space-y-2">
                    <CardTitle className="text-lg text-white">Signals & insights</CardTitle>
                    <CardDescription className="text-white/60">
                      High-level cues worth acting on today.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2">
                    {insights.map((item) => (
                      <div key={item.label} className="rounded-2xl border border-white/5 bg-white/5 p-4">
                        <p className="text-xs uppercase tracking-[0.3em] text-white/50">{item.label}</p>
                        <p
                          className={cn(
                            "mt-2 text-base font-semibold",
                            item.tone === "good"
                              ? "text-emerald-400"
                              : item.tone === "warn"
                              ? "text-amber-400"
                              : "text-white/80"
                          )}
                        >
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="border-white/30 bg-black/60">
                  <CardHeader className="space-y-2">
                    <CardTitle className="text-lg text-white">Questions + workflows</CardTitle>
                    <CardDescription className="text-white/60">
                      Practice depth, mock volume, and accuracy.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <p className="text-sm text-white/60">Total questions (14d)</p>
                      <p className="text-3xl font-semibold text-white">
                        {formatNumber(snapshot.kpis.questions.attempted14d)}
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <p className="text-sm text-white/60">
                          {formatNumber(snapshot.kpis.questions.practiceAttempts14d)} practice attempts
                        </p>
                        <p className="text-sm text-white/60">
                          {formatNumber(snapshot.kpis.questions.mockAttempts14d)} mock attempts
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-white/60">Sessions & mocks (30d)</p>
                      <div className="grid gap-3 sm:grid-cols-3 mt-2">
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
                          <p className="text-xs text-white/50">Practice</p>
                          <p className="text-lg font-semibold text-white">
                            {formatNumber(snapshot.kpis.activity.practiceSessions30d ?? 0)}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
                          <p className="text-xs text-white/50">Mocks</p>
                          <p className="text-lg font-semibold text-white">
                            {formatNumber(snapshot.kpis.activity.mocks30d ?? 0)}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
                          <p className="text-xs text-white/50">Sessions</p>
                          <p className="text-lg font-semibold text-white">
                            {formatNumber(snapshot.kpis.activity.sessions30d ?? 0)}
                          </p>
                        </div>
                      </div>
                      <Progress
                        value={Math.min(100, Math.max(0, snapshot.kpis.engagement.practiceAccuracy14d))}
                        className="mt-4"
                      />
                      <p className="mt-1 text-xs text-white/50">
                        Practice accuracy (14d)
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-white/30 bg-black/60">
                <CardHeader className="space-y-1">
                  <CardTitle className="text-lg text-white">Daily snapshot</CardTitle>
                  <CardDescription className="text-white/60">
                    Last 7 days of visits, visitors, sign-ups, and minutes.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Table className="bg-transparent">
                    <TableHeader>
                    <TableRow className="text-white/60 uppercase tracking-wide text-xs">
                      <TableHead className="text-white/60">Date</TableHead>
                      <TableHead className="text-right text-white/60">Visits</TableHead>
                      <TableHead className="text-right text-white/60">Visitors</TableHead>
                      <TableHead className="text-right text-white/60">Sign-ups</TableHead>
                      <TableHead className="text-right text-white/60">Minutes</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                      {snapshot.timeline.slice(-7).map((row) => (
                        <TableRow key={row.date} className="border-t border-white/5 text-white/80">
                            <TableCell className="py-3 font-medium text-white">{row.label}</TableCell>
                            <TableCell className="py-3 text-right text-white/80">
                              {formatNumber(row.visits)}
                            </TableCell>
                            <TableCell className="py-3 text-right text-white/80">
                              {formatNumber(row.visitors)}
                            </TableCell>
                            <TableCell className="py-3 text-right text-white/80">
                              {formatNumber(row.signups)}
                            </TableCell>
                            <TableCell className="py-3 text-right text-white/80">
                              {formatNumber(row.minutes)}
                            </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </section>
      </main>
    </div>
  )
}
