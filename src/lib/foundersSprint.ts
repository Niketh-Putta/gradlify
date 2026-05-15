import { AI_FEATURE_ENABLED } from '@/lib/featureFlags';
import type { UserTrack } from '@/lib/track';

const SPRINT_LENGTH_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
export const CURRENT_SPRINT_ID = "monthly-sprint-may-2026";

const envStartIso = typeof import.meta.env.VITE_SPRINT_START_ISO === 'string' ? import.meta.env.VITE_SPRINT_START_ISO : '';
const envEndIso = typeof import.meta.env.VITE_SPRINT_END_ISO === 'string' ? import.meta.env.VITE_SPRINT_END_ISO : '';

/** Instant when the sprint opens (absolute instant; labels use each viewer’s local time). Override with VITE_SPRINT_START_ISO. */
function computeDefaultStart(): Date {
  if (envStartIso) return new Date(envStartIso);
  return new Date('2026-05-14T19:30:00Z');
}

/** Instant when the sprint closes (30 days after start at 17:30 UTC / 18:30 UK in BST). Override with VITE_SPRINT_END_ISO. */
function computeDefaultEnd(start: Date): Date {
  if (envEndIso) return new Date(envEndIso);
  const d = new Date(start);
  d.setUTCDate(d.getUTCDate() + SPRINT_LENGTH_DAYS);
  d.setUTCHours(17, 30, 0, 0);
  return d;
}

/** Canonical UK/London zone for server-side or explicit UK copy (display uses viewer local time). */
export const SPRINT_UK_TIMEZONE = 'Europe/London' as const;

export const SPRINT_START_AT = computeDefaultStart();
export const SPRINT_END_AT = computeDefaultEnd(SPRINT_START_AT);

const NEXT_SPRINT_START_AT = new Date(SPRINT_END_AT.getTime() + 14 * MS_PER_DAY);
export const ELEVEN_PLUS_NEXT_SPRINT_START_AT = new Date(SPRINT_START_AT);

/** IANA timezone used for sprint date labels on this device (e.g. Europe/London). */
export function getSprintDisplayTimeZoneId(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
}

function localTimeZoneShort(d: Date): string {
  const v = new Intl.DateTimeFormat("en-GB", { timeZoneName: "short" })
    .formatToParts(d)
    .find((p) => p.type === "timeZoneName")?.value;
  return (v ?? "").trim();
}

/** Date + compact time in the viewer’s local timezone (e.g. "Thursday, 14 May 2026 · 8:30pm BST"). */
export function getSprintEventDisplayLabels() {
  const datePart = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const compactTime = (d: Date) => {
    const parts = new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).formatToParts(d);
    const hour = parts.find((p) => p.type === "hour")?.value ?? "";
    const minute = parts.find((p) => p.type === "minute")?.value ?? "";
    const dayPeriod = (parts.find((p) => p.type === "dayPeriod")?.value ?? "").replace(/\s+/g, "").toLowerCase();
    const tzShort = localTimeZoneShort(d);
    const time = `${hour}:${minute}${dayPeriod}`;
    return tzShort ? `${time} ${tzShort}` : time;
  };

  const line = (d: Date) => `${datePart.format(d)} · ${compactTime(d)}`;
  const shortStart = localTimeZoneShort(SPRINT_START_AT);
  const shortEnd = localTimeZoneShort(SPRINT_END_AT);
  const viewerTimeZoneShort =
    shortStart && shortEnd && shortStart !== shortEnd ? `${shortStart} → ${shortEnd}` : shortStart || shortEnd || "";

  return {
    startLabel: line(SPRINT_START_AT),
    endLabel: line(SPRINT_END_AT),
    endDateOnly: datePart.format(SPRINT_END_AT),
    localTimeZoneId: getSprintDisplayTimeZoneId(),
    /** Short zone name(s) for the viewer’s locale (e.g. BST, GMT, EST). */
    localTimeZoneShort: viewerTimeZoneShort,
  };
}

function formatOrdinalDay(day: number) {
  const mod100 = day % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${day}th`;
  const mod10 = day % 10;
  if (mod10 === 1) return `${day}st`;
  if (mod10 === 2) return `${day}nd`;
  if (mod10 === 3) return `${day}rd`;
  return `${day}th`;
}

export function getFoundersSprintInfo(referenceDate: Date = new Date()) {
  const startDate = new Date(SPRINT_START_AT);
  const endDate = new Date(SPRINT_END_AT);
  const remainingMs = endDate.getTime() - referenceDate.getTime();
  const daysLeft = Math.max(0, Math.ceil(Math.max(0, remainingMs) / MS_PER_DAY));
  const isActive = referenceDate >= startDate && referenceDate <= endDate;
  const hasEnded = referenceDate > endDate;

  return {
    sprintId: CURRENT_SPRINT_ID,
    daysLeft,
    isActive,
    hasEnded,
    sprintLengthDays: SPRINT_LENGTH_DAYS,
    startDate,
    endDate,
  };
}

function localCalendarKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function formatSprintEnd(endDate: Date, referenceDate: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(endDate);
  const val = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';
  const dayNum = parseInt(val('day'), 10);
  const day = formatOrdinalDay(dayNum);
  const month = val('month');
  const weekday = val('weekday');
  const hour = val('hour');
  const minute = val('minute');
  const dayPeriod = val('dayPeriod');
  const time = `${hour}:${minute} ${dayPeriod}`.replace(/\s+/g, ' ').trim();

  if (localCalendarKey(endDate) === localCalendarKey(referenceDate)) {
    return `${day} ${month}, today ${time}`;
  }
  return `${weekday} ${day} ${month} ${time}`;
}

export function getSprintEndLabel(referenceDate: Date = new Date()) {
  const { isActive, startDate } = getFoundersSprintInfo(referenceDate);
  const formatted = formatSprintEnd(SPRINT_END_AT, referenceDate);
  if (isActive) {
    return `Sprint ends ${formatted}`;
  }
  if (referenceDate < startDate) {
    return `Sprint starts ${formatSprintStart(startDate)} - ends ${formatted}`;
  }
  return `Previous sprint ended ${formatted}`;
}

export function getSprintEndDateText(referenceDate: Date = new Date()) {
  return formatSprintEnd(SPRINT_END_AT, referenceDate);
}

function formatSprintStart(startDate: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
  }).formatToParts(startDate);
  const dayNum = parseInt(parts.find((p) => p.type === 'day')?.value ?? '0', 10);
  const month = parts.find((p) => p.type === 'month')?.value ?? '';
  return `${formatOrdinalDay(dayNum)} ${month}`;
}

function getDaysToGo(referenceDate: Date, startDate: Date) {
  const remainingMs = startDate.getTime() - referenceDate.getTime();
  return Math.max(0, Math.ceil(Math.max(0, remainingMs) / MS_PER_DAY));
}

function formatTrackSprintLabel(startDate: Date, daysToGo: number) {
  const dayLabel = daysToGo === 1 ? 'day' : 'days';
  return `Next sprint starts ${formatSprintStart(startDate)} - ${daysToGo} ${dayLabel} to go`;
}

export function getNextSprintInfo(referenceDate: Date = new Date()) {
  const upcomingStart = referenceDate < SPRINT_START_AT
    ? new Date(SPRINT_START_AT)
    : new Date(NEXT_SPRINT_START_AT);
  const remainingMs = upcomingStart.getTime() - referenceDate.getTime();
  const daysToGo = Math.max(0, Math.ceil(Math.max(0, remainingMs) / MS_PER_DAY));
  return { startDate: upcomingStart, daysToGo };
}

export function getNextSprintStartText() {
  const { startDate } = getNextSprintInfo();
  return formatSprintStart(startDate);
}

export function getNextSprintLabel(referenceDate: Date = new Date()) {
  const { isActive, daysLeft } = getFoundersSprintInfo(referenceDate);
  if (isActive) {
    const dayLabel = daysLeft === 1 ? "day" : "days";
    return `Sprint live - ${daysLeft} ${dayLabel} left`;
  }
  const { startDate, daysToGo } = getNextSprintInfo(referenceDate);
  const dayLabel = daysToGo === 1 ? "day" : "days";
  return `Next sprint starts ${formatSprintStart(startDate)} - ${daysToGo} ${dayLabel} to go`;
}

export function getTrackNextSprintLabel(track: UserTrack | undefined, referenceDate: Date = new Date()) {
  if (track === '11plus') {
    const daysToGo = getDaysToGo(referenceDate, ELEVEN_PLUS_NEXT_SPRINT_START_AT);
    return formatTrackSprintLabel(ELEVEN_PLUS_NEXT_SPRINT_START_AT, daysToGo);
  }
  return getNextSprintLabel(referenceDate);
}

export const getSprintUpgradeCopy = () => {
  const { isActive, hasEnded, daysLeft } = getFoundersSprintInfo();
  const dayLabel = daysLeft === 1 ? "day" : "days";
  const countdown = `${daysLeft} ${dayLabel} left`;

  return {
    isActive,
    hasEnded,
    bannerTitle: isActive ? `Sprint live - ${countdown}` : hasEnded ? "Sprint has ended" : "Gradlify Premium\nStart Your 3 Day Free Trial",
    bannerSubtitle: isActive
      ? "Only full mock exams count: correct answers in mocks move the leaderboard; practice does not. After one month, the highest score wins."
      : hasEnded 
        ? "Results are being verified. The winner will be announced shortly."
        : AI_FEATURE_ENABLED
          ? "Get unlimited AI questions, full mock exams, and personalised revision plans."
          : "Get unlimited questions, full mock exams, and personalised revision plans.",
    buttonPrimary: isActive ? "Unlock more sprint attempts" : (hasEnded ? "View Sprint Results" : "Start Your 3 Day Free Trial"),
    buttonSecondary: isActive ? "Sprint leaderboard live" : "Start Your 3 Day Free Trial",
    buttonTertiary: isActive ? "Remove sprint limits" : "Start Your 3 Day Free Trial",
    listTitle: isActive ? "Sprint upgrade perks:" : "Start Your 3 Day Free Trial for:",
    settingsTitle: isActive ? "Sprint live: unlock more attempts" : "Gradlify Premium\nStart Your 3 Day Free Trial",
    settingsDescription: isActive
      ? `Sprint is live - ${countdown}. Unlock more mock attempts so every correct answer in a full mock can count toward your score.`
      : hasEnded
        ? "The monthly competition has concluded. Final results are being verified."
        : AI_FEATURE_ENABLED
          ? "Get unlimited access to AI-powered study assistance, advanced mock exams, personalised study plans, and premium resources."
          : "Get unlimited access to personalised study assistance, advanced mock exams, personalised study plans, and premium resources.",
    limitTitle: isActive ? "Sprint limit reached" : (hasEnded ? "Sprint has ended" : "Daily limit reached"),
    limitHint: isActive ? "Sprint is live - unlock more attempts" : (hasEnded ? "The competition phase is now closed." : "Resets tomorrow or start your 3 Day Free Trial"),
  };
};
