/**
 * Daily Dashboard Service — "My Day" (Phase 7.1, extended in Phase 7.2)
 *
 * Read-only, deterministic view model for the child's daily home screen.
 * Nothing here writes state, invents assignments, or computes streaks:
 * every field is derived from already-persisted state (profile, schoolwork
 * records, learning sessions) plus the injectable clock.
 *
 * Sections:
 *  - greeting          time-of-day greeting (deterministic on `now`)
 *  - schoolwork        verified SCHOOLWORK records from the schoolwork service
 *                      (Phase 7.2: a school material is never automatically a
 *                      child task — only parent-created, verified assignments)
 *  - practice          ALE-backed practice availability, derived from the
 *                      persisted learning session (never fabricated)
 *  - quickCheck        interface-only placeholder (engine arrives later)
 *
 * Fail-closed: on any unexpected read error the dashboard degrades to a
 * safe, accurate sub-state ("unavailable") instead of throwing.
 */

import { AVAILABLE_AVATARS } from '../../shared/profile-schema.js';
import { probeMission } from './learning-flow.js';
import { listActiveSchoolwork } from '../curriculum/schoolwork-service.js';

/**
 * @param {object} deps { profileStore, learningStore, materialStore }
 * @param {object} [options] { now } — injectable clock for determinism
 * @returns {Promise<{ success: boolean, dashboard?: object, error?: string }>}
 */
export async function getDailyDashboard(deps = {}, options = {}) {
  const { profileStore, learningStore, materialStore } = deps;
  const now = coerceDate(options.now);

  try {
    const profile = profileStore?.getProfile ? await profileStore.getProfile() : null;
    if (!profile) {
      return { success: false, error: 'No active learner profile.' };
    }

    const avatar = AVAILABLE_AVATARS.find((a) => a.id === profile.avatar) || { emoji: '🌟', label: 'Learner' };
    const firstName = (profile.name || 'friend').split(' ')[0];

    const schoolwork = await buildSchoolworkSection(materialStore, profile.learnerId, now);
    const practice = await buildPracticeSection(deps, profile.learnerId, now);
    const quickCheck = { availability: 'coming_soon' };

    const dashboard = {
      generatedAt: now.toISOString(),
      dayKey: localDayKey(now),
      greeting: buildGreeting(now, firstName, avatar.emoji),
      profile: {
        learnerId: profile.learnerId,
        firstName,
        grade: profile.grade || '',
        avatar: avatar.emoji,
        avatarLabel: avatar.label || 'Learner'
      },
      schoolwork,
      practice,
      quickCheck,
      allDone: practice.availability === 'done_today'
    };

    return { success: true, dashboard };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/* ───────────────────────── sections ───────────────────────── */

async function buildSchoolworkSection(materialStore, learnerId, now) {
  const fallback = { availability: 'unavailable', items: [] };
  if (!materialStore || typeof materialStore.loadSchoolwork !== 'function' || !learnerId) {
    return fallback;
  }
  try {
    // Phase 7.2 rule: only parent-created, VERIFIED schoolwork records are
    // child tasks. Verified school MATERIALS alone are reference material —
    // they never surface here until a schoolwork record is created for them.
    const active = await listActiveSchoolwork(materialStore, learnerId, { now });
    if (!active.success) return fallback;
    if (active.items.length === 0) {
      return {
        availability: 'empty',
        items: [],
        note: 'No schoolwork added yet.'
      };
    }
    return {
      availability: 'ready',
      items: active.items.map((v) => ({
        schoolworkId: v.schoolworkId,
        materialId: v.materialId,
        title: v.title || 'Schoolwork',
        subject: v.subject || '',
        assignmentLabel: v.assignmentLabel || '',
        dueCopy: v.dueCopy || null,
        status: v.status
      }))
    };
  } catch (err) {
    console.error('[daily-dashboard] schoolwork read failed:', err.message);
    return fallback;
  }
}

async function buildPracticeSection(deps, learnerId, now) {
  const defaultTitle = 'A reading mission, just for you';
  const learningStore = deps?.learningStore;
  if (!learningStore || typeof learningStore.getLatestSession !== 'function' || !learnerId) {
    return { availability: 'empty', objectiveTitle: defaultTitle, completedToday: 0, mode: 'start' };
  }
  try {
    const latest = await learningStore.getLatestSession(learnerId);
    const results = Array.isArray(latest?.results) ? latest.results : [];
    const objectiveTitle = firstPlanTitle(latest) || defaultTitle;

    if (latest && localDayKey(parseDate(latest.startedAt)) === localDayKey(now) && latest.status === 'completed') {
      // ALE marked the session complete today → today's practice is done.
      return {
        availability: 'done_today',
        objectiveTitle,
        completedToday: results.length,
        mode: 'done'
      };
    }

    // Ask the EXISTING ALE recommendation infrastructure (read-only) whether a
    // plan can actually be served right now. Zero eligible activities → empty
    // state, never a fabricated "Start My Mission!" CTA.
    if (typeof probeMission === 'function') {
      const probe = await probeMission(deps, { now });
      if (probe.success && !probe.eligible) {
        return {
          availability: 'empty',
          objectiveTitle,
          completedToday: results.length,
          mode: 'start'
        };
      }
      if (probe.success && probe.eligible) {
        return {
          availability: 'ready',
          objectiveTitle,
          completedToday: results.length,
          mode: probe.resumed ? 'continue' : 'start'
        };
      }
    }

    // Fail-closed (probe unavailable): never fabricate an activity.
    return { availability: 'empty', objectiveTitle, completedToday: results.length, mode: 'start' };
  } catch (err) {
    console.error('[daily-dashboard] practice read failed:', err.message);
    return { availability: 'empty', objectiveTitle: defaultTitle, completedToday: 0, mode: 'start' };
  }
}

/* ───────────────────────── helpers ───────────────────────── */

function firstPlanTitle(session) {
  const plans = Array.isArray(session?.plans) ? session.plans : [];
  const first = plans.find((p) => p && typeof p.title === 'string' && p.title.trim());
  return first ? first.title.trim() : '';
}

function buildGreeting(now, firstName, emoji) {
  const hour = now.getHours();
  const bucket =
    hour >= 5 && hour < 12 ? 'morning'
    : hour >= 12 && hour < 17 ? 'afternoon'
    : 'evening';
  const copy = bucket === 'morning' ? 'Good morning' : bucket === 'afternoon' ? 'Good afternoon' : 'Good evening';
  return { bucket, text: `${copy}, ${firstName}!`, emoji };
}

function localDayKey(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function coerceDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

function parseDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}