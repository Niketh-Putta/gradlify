import { AI_FEATURE_ENABLED } from '@/lib/featureFlags';
import type { UserTrack } from '@/lib/track';

const SPRINT_LENGTH_DAYS = 7;
const SPRINT_ANCHOR = new Date('2025-01-01T00:00:00Z');
const MS_PER_DAY = 24 * 60 * 60 * 1000;
export const CURRENT_SPRINT_ID = "founders-202602";
const SPRINT_START_AT = new Date('2026-02-02T00:00:00Z');
const SPRINT_END_AT = new Date('2026-02-08T20:00:00Z');
const NEXT_SPRINT_START_AT = new Date('2026-03-02T00:00:00Z');
const ELEVEN_PLUS_NEXT_SPRINT_START_AT = new Date('2026-02-23T00:00:00Z');

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
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

  return {
    sprintId: CURRENT_SPRINT_ID,
    daysLeft,
    isActive,
    sprintLengthDays: SPRINT_LENGTH_DAYS,
    startDate,
    endDate,
  };
}

const MONTH_FORMATTER = new Intl.DateTimeFormat('en-GB', { month: 'short' });
const TIME_FORMATTER = new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true });
const WEEKDAY_FORMATTER = new Intl.DateTimeFormat('en-GB', { weekday: 'long' });

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatSprintEnd(endDate: Date, referenceDate: Date) {
  const endMoment = new Date(endDate);

  const day = formatOrdinalDay(endMoment.getDate());
  const month = MONTH_FORMATTER.format(endMoment);
  const weekday = WEEKDAY_FORMATTER.format(endMoment);
  const time = TIME_FORMATTER.format(endMoment).replace(/\s+/g, " ").trim();
  if (isSameDay(endMoment, referenceDate)) {
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
    return `Sprint starts ${formatSprintStart(startDate)} — ends ${formatted}`;
  }
  return `Previous sprint ended ${formatted}`;
}

export function getSprintEndDateText(referenceDate: Date = new Date()) {
  return formatSprintEnd(SPRINT_END_AT, referenceDate);
}

function formatSprintStart(startDate: Date) {
  const startMoment = new Date(startDate);
  const day = formatOrdinalDay(startMoment.getDate());
  const month = MONTH_FORMATTER.format(startMoment);
  return `${day} ${month}`;
}

function getDaysToGo(referenceDate: Date, startDate: Date) {
  const remainingMs = startDate.getTime() - referenceDate.getTime();
  return Math.max(0, Math.ceil(Math.max(0, remainingMs) / MS_PER_DAY));
}

function formatTrackSprintLabel(startDate: Date, daysToGo: number) {
  const dayLabel = daysToGo === 1 ? 'day' : 'days';
  return `Next sprint starts ${formatSprintStart(startDate)} — ${daysToGo} ${dayLabel} to go`;
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
    return `Sprint live — ${daysLeft} ${dayLabel} left`;
  }
  const { startDate, daysToGo } = getNextSprintInfo(referenceDate);
  const dayLabel = daysToGo === 1 ? "day" : "days";
  return `Next sprint starts ${formatSprintStart(startDate)} — ${daysToGo} ${dayLabel} to go`;
}

export function getTrackNextSprintLabel(track: UserTrack | undefined, referenceDate: Date = new Date()) {
  if (track === '11plus') {
    const daysToGo = getDaysToGo(referenceDate, ELEVEN_PLUS_NEXT_SPRINT_START_AT);
    return formatTrackSprintLabel(ELEVEN_PLUS_NEXT_SPRINT_START_AT, daysToGo);
  }
  return getNextSprintLabel(referenceDate);
}

export const getSprintUpgradeCopy = () => {
  const { isActive, daysLeft } = getFoundersSprintInfo();
  const dayLabel = daysLeft === 1 ? "day" : "days";
  const countdown = `${daysLeft} ${dayLabel} left`;

  return {
    isActive,
    bannerTitle: isActive ? `Sprint live — ${countdown}` : "Gradlify Premium\nStart Your 3 Day Free Trial",
    bannerSubtitle: isActive
      ? "Mocks + Challenge only. Every correct answer counts. Climb the leaderboard now."
      : AI_FEATURE_ENABLED
        ? "Get unlimited AI questions, full mock exams, and personalised revision plans."
        : "Get unlimited questions, full mock exams, and personalised revision plans.",
    buttonPrimary: isActive ? "Unlock more sprint attempts" : "Start Your 3 Day Free Trial",
    buttonSecondary: isActive ? "Sprint leaderboard live" : "Start Your 3 Day Free Trial",
    buttonTertiary: isActive ? "Remove sprint limits" : "Start Your 3 Day Free Trial",
    listTitle: isActive ? "Sprint upgrade perks:" : "Start Your 3 Day Free Trial for:",
    settingsTitle: isActive ? "Sprint live: unlock more attempts" : "Gradlify Premium\nStart Your 3 Day Free Trial",
    settingsDescription: isActive
      ? `Sprint is live — ${countdown}. Unlock unlimited mock and challenge attempts.`
      : AI_FEATURE_ENABLED
        ? "Get unlimited access to AI-powered study assistance, advanced mock exams, personalised study plans, and premium resources."
        : "Get unlimited access to personalised study assistance, advanced mock exams, personalised study plans, and premium resources.",
    limitTitle: isActive ? "Sprint limit reached" : "Daily limit reached",
    limitHint: isActive ? "Sprint is live — unlock more attempts" : "Resets tomorrow or start your 3 Day Free Trial",
  };
};
