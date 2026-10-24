# Personalization Engine: Evidence-Based Implementation Plan
## Reusing existing infrastructure, fixing approval workflow bypass

**Date:** October 24, 2026, 10:26 UTC  
**Scope:** Add approval gate to existing PE infrastructure without rewriting  
**Constraint:** Hackathon MVP — smallest safe implementation, tested end-to-end  
**Preservation:** No resets, rebases, force-pushes, or file overwrites

---

## PART 1: CURRENT STATE VERIFICATION

### 1.1 Git Status (Verified)

```
Current branch:     main (with 1 modified file: main.js)
Working tree:       Clean (untracked files are documentation)
Remote branches:    4 branches available
Local branches:     4 branches (all at baseline 8521961 except education-mode behind by 1)
```

### 1.2 Remote Branch State (Verified via git ls-remote)

| Branch | Commit | Status |
|--------|--------|--------|
| **origin/main** | 8521961 | Baseline (IPC, profile, preference model in place) |
| **origin/feature/education-mode** | **78dfdb8** | ✅ 1 commit ahead; full education mode implementation |
| **origin/feature/workspace-mode** | 8521961 | ❌ No commits beyond baseline; branch empty |
| **origin/feature/personalization-engine** | 8521961 | Baseline; ready for PE work |

### 1.3 File Modifications on main

**main.js** — Already modified (from earlier Electron import fix):
```javascript
import pkg from 'electron';
const { app, BrowserWindow, ipcMain, dialog } = pkg;
```

This is compatible with all branches. No revert needed.

---

## PART 2: CRITICAL CODE INSPECTION FINDINGS

### 2.1 Education Mode: Where Preferences Bypass Approval (VERIFIED)

**File:** `origin/feature/education-mode:src/services/education/education-flow.js`

**Critical Function: `endEducationSession()` (lines ~320-340)**

```javascript
export async function endEducationSession({
  learnerId,
  sessionId,
  profileStore
}) {
  const session = getSession(learnerId, sessionId);
  if (!session) {
    return { success: false, reason: 'session_not_found' };
  }

  try {
    // Load current profile
    const profile = await profileStore.getProfile();
    if (!profile) {
      return { success: false, reason: 'profile_not_found' };
    }

    // ❌ CRITICAL: Preferences are merged WITHOUT approval
    if (session.preferences_delta?.weights && profile.adaptiveLearning?.preferences?.weights) {
      for (const modality of Object.keys(session.preferences_delta.weights)) {
        profile.adaptiveLearning.preferences.weights[modality] =
          session.preferences_delta.weights[modality];
      }
      profile.adaptiveLearning.preferences.updatedAt = new Date().toISOString();
    }

    // ❌ CRITICAL: Profile is persisted immediately, NO user decision point
    await profileStore.saveProfile(profile);
    // ... cleanup
  }
}
```

**Evidence of Bypass:**
1. **No approval UI called** — Session end directly merges deltas
2. **No approval event** — Changes applied silently
3. **No user choice** — Preferences update unconditionally
4. **No proposal generated** — User never sees what changed or why

**Impact:** IPP MVP requirement violated — users cannot explicitly approve or reject preference changes.

### 2.2 Education Mode: Where Deltas Are Created (VERIFIED)

**File:** `origin/feature/education-mode:src/services/education/education-flow.js`

**Function: `buildVariantPreferences()` (lines ~350-375)**

```javascript
function buildVariantPreferences(basePreferences, variantKind) {
  const weights = { ...(basePreferences?.weights || {}) };

  switch (variantKind) {
    case 'make_simpler':
      weights.guided_assistance = Math.min(0.95, (weights.guided_assistance || 0.5) + 0.3);
      weights.text = Math.min(0.95, (weights.text || 0.5) + 0.2);
      break;
    case 'give_example':
      weights.example = Math.min(0.95, (weights.example || 0.5) + 0.3);
      break;
    case 'show_me':
      weights.visual = Math.min(0.95, (weights.visual || 0.5) + 0.3);
      break;
    default:
      break;
  }

  return { ...basePreferences, weights, updatedAt: new Date().toISOString() };
}
```

**Delta Source:** When user requests variant (simplify/example/visual), weights are adjusted locally in session but persisted at session end.

### 2.3 Shared Profile Interface (VERIFIED IN MAIN)

**File:** `src/shared/profile-schema.js` (lines 238-276)

```javascript
export function buildCanonicalProfile(input, existingProfile = null) {
  const now = new Date().toISOString();

  return {
    learnerId: existingProfile?.learnerId || `learner_${Date.now()}`,
    name: input.name.trim(),
    age: Number(input.age),
    grade: input.grade,
    // ... accommodations ...

    // ✅ Shared structure supports both modes
    adaptiveLearning: sanitizeAdaptiveLearning(
      existingProfile?.adaptiveLearning ?? input.adaptiveLearning
    ),

    createdAt: existingProfile?.createdAt || now,
    updatedAt: now
  };
}
```

**Preference Location:** `profile.adaptiveLearning.preferences.weights[modality]`

**Interface Contract:**
- Single profile per learner
- Preferences stored in shared `adaptiveLearning.preferences` block
- Both modes read/write same structure
- Schema supports both Education and Workspace modes

### 2.4 Existing Preference Model (VERIFIED IN MAIN)

**File:** `src/services/adaptive/preference-model.js`

**Available Functions:**
```javascript
✅ createDefaultPreferences()
   → { weights: {visual:0.5, audio:0.5, ...}, updatedAt: null }

✅ recordPreferenceOutcome(state, outcome)
   → Applies delta (+0.08 success, -0.03 failure)
   → Returns updated preferences state
   
✅ strongestModality(state)
   → Returns highest-weighted modality ID
   
✅ clampWeight(value)
   → Enforces [0.05, 0.95] bounds
   
✅ decayWeights(weights)
   → Applies mean-reversion decay
```

**Modalities Defined in adaptive-config.js:**
```javascript
PREFERENCE_MODALITIES = [
  'visual', 'audio', 'text', 'manipulation',
  'example', 'repetition', 'guided_assistance'
]
```

### 2.5 Profile Storage (VERIFIED IN MAIN)

**File:** `src/services/storage/profile-store.js`

```javascript
async saveProfile(profileData) {
  // ✅ Atomic write pattern (crash-safe)
  const tempFile = `${this.profileFile}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(payload, null, 2), 'utf-8');
  await fs.rename(tempFile, this.profileFile);
  return payload;
}
```

**Interface Contract:**
- `await profileStore.getProfile()` — Returns full profile or null
- `await profileStore.saveProfile(profile)` — Atomically persists, sanitizes on write
- Single file: `userData/profiles/learner-profile.json`
- NaN protection: `sanitizeAdaptiveLearning()` called on write

### 2.6 Workspace Mode Status (VERIFIED)

**Result:** `git diff main origin/feature/workspace-mode --name-only` → (empty)

**Conclusion:** Workspace Mode branch has NO commits beyond baseline. No personalization code exists yet.

**Implication:** Workspace Mode is blank slate; will inherit PE approval workflow once implemented on PE branch.

---

## PART 3: RISK ANALYSIS & FILE IMPACT

### 3.1 Files That Need Changes (Minimal Set)

| File | Current | Change | Risk | Why |
|------|---------|--------|------|-----|
| `src/services/education/education-flow.js` | Bypass approval | ✅ Gate preference persist | 🟢 LOW | Only affects education-mode branch; isolated function |
| `src/services/adaptive/outcome-recorder.js` | ❌ MISSING | 🆕 CREATE | 🟢 LOW | New file; no conflicts |
| `src/services/adaptive/approval-flow.js` | ❌ MISSING | 🆕 CREATE | 🟢 LOW | New file; no conflicts |
| `src/shared/ipc-channels.js` | 21 channels | +1 channel | 🟢 LOW | New channel; no overwrites |
| `main.js` | Has fix | +IPC handler | 🟢 LOW | Isolated handler registration |

**Files NOT touched:**
- ✅ `profile-schema.js` — No changes (already supports both modes)
- ✅ `preference-model.js` — No changes (reused as-is)
- ✅ `profile-store.js` — No changes (reused as-is)
- ✅ All Workspace Mode code — None exists; no risk

### 3.2 Branch Isolation Verification

**Education Mode Changes:**
- Modifying `education-flow.js` only affects `origin/feature/education-mode`
- Does not affect `main`, `feature/workspace-mode`, or `feature/personalization-engine`
- Safe to modify without impacting other branches

**PE Branch Work:**
- New files created only on `feature/personalization-engine`
- No modifications to main branch baseline
- Workspace Mode can merge when ready; will inherit approval framework

### 3.3 Integration Safety

**Profile Schema:** ✅ **SAFE**
- Designed to support both modes
- No breaking changes needed
- Both modes read/write same `adaptiveLearning.preferences` block

**Preference Model:** ✅ **SAFE**
- Pure functions; no state mutations
- Reusable across all modes
- No modifications needed

**Storage:** ✅ **SAFE**
- Single profile per learner (enforced)
- Atomic writes prevent corruption
- Both modes use same `ProfileStore` instance

---

## PART 4: MINIMAL IMPLEMENTATION PLAN

### 4.1 Phase 1: Outcome Capture (Foundation)

**Goal:** Structure outcome signals without changing persistence behavior yet.

**Effort:** 3-4 hours  
**Files to Create:** 1 new file  
**Files to Modify:** 0 (education-flow.js changes deferred)

#### 4.1.1 Create: `src/services/adaptive/outcome-recorder.js`

**Purpose:** Pure function to record outcomes and compute preference deltas.

**Code (sketch):**
```javascript
/**
 * Deterministic outcome recorder — pure functions for recording learning outcomes
 * and proposing preference updates (WITHOUT persisting).
 */

export function recordOutcome(preferences, outcome) {
  // outcome = { outcome: 'success'|'help_success'|'incorrect'|'timeout',
  //             modalityObservations: [modality...],
  //             successModalities: [modality...] }
  
  // ✅ Reuse existing preference model
  return recordPreferenceOutcome(preferences, outcome);
}

export function generateUpdateProposal(currentWeights, delta, context) {
  // Inputs:
  //   currentWeights = { visual: 0.5, audio: 0.6, ... }
  //   delta = { audio: +0.08 } (from recordOutcome)
  //   context = { activity: 'explanation', modality: 'audio', success: true }
  
  // Output: { modality, oldWeight, newWeight, reason, rationale }
  const modality = Object.keys(delta)[0];
  const oldWeight = currentWeights[modality];
  const newWeight = clampWeight(oldWeight + delta[modality]);
  
  return {
    modality,
    oldWeight: Math.round(oldWeight * 100) / 100,
    newWeight: Math.round(newWeight * 100) / 100,
    reason: context.success ? 'improved_performance' : 'difficulty_detected',
    rationale: context.success
      ? `Your preference for ${modality} improved from ${oldWeight.toFixed(2)} → ${newWeight.toFixed(2)} because you succeeded with this approach.`
      : `We noticed difficulty with ${modality}. Adjusting to help you learn better.`,
    proposalId: `prop_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  };
}
```

**Testing (MVP):**
- Unit test: `recordOutcome()` with various outcomes → computes correct deltas
- Unit test: `generateUpdateProposal()` → produces human-readable proposal
- No approval yet; just verify deterministic output

**Integration Point:** Called by education-flow.js (not yet), will be called by approval-flow.js.

#### 4.1.2 Verify: Existing Preference Model Reusability

**Files:** `src/services/adaptive/preference-model.js` (INSPECT, DON'T MODIFY)

**Confirmation Checklist:**
- ✅ `recordPreferenceOutcome()` accepts outcome + modalities
- ✅ Returns updated preferences without side effects
- ✅ `clampWeight()` available for proposal validation
- ✅ Already imported and tested (no changes needed)

**Outcome:** Phase 1 establishes signal recording without touching education-flow.js yet.

---

### 4.2 Phase 2: Approval Gate (Core PE)

**Goal:** Implement decision point before persisting preferences.

**Effort:** 6-8 hours  
**Files to Create:** 1 new file  
**Files to Modify:** 3 files (education-flow.js, ipc-channels.js, main.js)

#### 4.2.1 Create: `src/services/adaptive/approval-flow.js`

**Purpose:** State machine for pending proposals; decides what to persist.

**Code (sketch):**
```javascript
/**
 * Approval flow — manages pending preference proposals and user decisions.
 * Tracks what was proposed, what user approved/declined, what persists.
 */

class ApprovalFlow {
  constructor() {
    this.pendingProposals = new Map(); // proposalId → { proposal, decision?, timestamp }
  }

  queueProposal(proposal, learnerId) {
    // proposal = { modality, oldWeight, newWeight, reason, rationale, proposalId }
    // Store but don't persist yet
    this.pendingProposals.set(proposal.proposalId, {
      proposal,
      learnerId,
      decision: null, // 'approved' | 'declined' | null (pending)
      timestamp: new Date().toISOString()
    });
    return proposal.proposalId;
  }

  recordApproval(proposalId, approved) {
    // User made a decision via UI
    const entry = this.pendingProposals.get(proposalId);
    if (!entry) return { success: false, error: 'proposal_not_found' };
    
    entry.decision = approved ? 'approved' : 'declined';
    return { success: true, entry };
  }

  getApprovedUpdates(learnerId) {
    // Return ONLY approved proposals for this learner
    const approved = [];
    for (const entry of this.pendingProposals.values()) {
      if (entry.learnerId === learnerId && entry.decision === 'approved') {
        approved.push(entry.proposal);
      }
    }
    return approved;
  }

  cleanupProposal(proposalId) {
    this.pendingProposals.delete(proposalId);
  }
}

export const approvalFlow = new ApprovalFlow();
```

**Testing (MVP):**
- Unit test: Queue proposal → retrieve pending
- Unit test: Approve → proposal marked approved
- Unit test: Decline → proposal marked declined
- Integration test: Approved proposals returned; declined ignored

**Integration Points:**
- Education Mode calls `queueProposal()` when session ends
- Renderer calls `recordApproval()` when user clicks Accept/Decline
- ProfileStore calls `getApprovedUpdates()` before persisting

#### 4.2.2 Modify: `src/services/education/education-flow.js`

**Current Bypass (lines ~320-340):**
```javascript
// ❌ WRONG: Merges preferences immediately
await profileStore.saveProfile(profile);
```

**New Approval Gate:**
```javascript
// ✅ RIGHT: Queue proposal, return to user
const proposals = [];
for (const modality of Object.keys(session.preferences_delta?.weights || {})) {
  const oldWeight = profile.adaptiveLearning.preferences.weights[modality];
  const newWeight = session.preferences_delta.weights[modality];
  
  const proposal = generateUpdateProposal(
    profile.adaptiveLearning.preferences.weights,
    { [modality]: newWeight - oldWeight },
    { activity: 'education_session', modality }
  );
  
  approvalFlow.queueProposal(proposal, learnerId);
  proposals.push(proposal);
}

// Return proposals to UI; don't persist yet
return { success: true, proposals, sessionId };
```

**Change Scope:**
- Modify `endEducationSession()` to queue proposals instead of persist
- Do NOT modify `createEducationSession()`, `getEducationExplanationInSession()`, etc.
- Do NOT touch profile reading/loading logic
- Minimal, surgical fix

**Risk:** 🟢 **LOW**
- Only affects education-mode branch
- Isolated to single function
- Backward-compatible IPC (add new response field)

#### 4.2.3 Modify: `src/shared/ipc-channels.js`

**Addition (after line 69):**
```javascript
// Personalization Engine — Approval Workflow
PE_GET_PENDING_PROPOSALS: 'pe:get-pending-proposals',
PE_SUBMIT_APPROVAL: 'pe:submit-approval',
```

**Risk:** 🟢 **LOW**
- Only adding new channels
- No overwrites or deletions
- Compatible with existing Education Mode channels

#### 4.2.4 Modify: `main.js`

**Addition (in `registerIpcHandlers()`):**
```javascript
// Personalization Engine approval
ipcMain.handle(IPC_CHANNELS.PE_GET_PENDING_PROPOSALS, async (_event, learnerId) => {
  try {
    return { success: true, proposals: approvalFlow.getPendingProposals(learnerId) };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle(IPC_CHANNELS.PE_SUBMIT_APPROVAL, async (_event, { proposalId, approved }) => {
  try {
    const { entry } = approvalFlow.recordApproval(proposalId, approved);
    if (approved) {
      // Persist approved changes
      const profile = await profileStore.getProfile();
      const proposal = entry.proposal;
      profile.adaptiveLearning.preferences.weights[proposal.modality] = proposal.newWeight;
      profile.adaptiveLearning.preferences.updatedAt = new Date().toISOString();
      await profileStore.saveProfile(profile);
      approvalFlow.cleanupProposal(proposalId);
      return { success: true, updated: true };
    } else {
      // Declined: just clean up
      approvalFlow.cleanupProposal(proposalId);
      return { success: true, updated: false };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
});
```

**Risk:** 🟢 **LOW**
- New handlers only
- No changes to existing handlers
- main.js already modified (Electron fix); compatible

---

### 4.3 Phase 3: Shared Mode Integration (Completeness)

**Goal:** Both modes use approval workflow; add approval history tracking.

**Effort:** 2-3 hours  
**Files to Modify:** 2 files

#### 4.3.1 Modify: `src/shared/profile-schema.js`

**Addition (in `buildCanonicalProfile()`, around line 273):**
```javascript
// Approval history — audit trail of what user accepted/declined
approvalHistory: existingProfile?.approvalHistory || [],
```

**Change Scope:**
- Add single field to profile structure
- Initialize as empty array
- Append entries when approvals happen

**Risk:** 🟢 **LOW**
- Non-breaking change (new field)
- Backward compatible (existing profiles get empty array)
- Sanitization already handles missing fields

#### 4.3.2 Modify: `src/services/adaptive/approval-flow.js`

**Enhancement (in `recordApproval()`):**
```javascript
recordApproval(proposalId, approved, profileStore) {
  // ... existing logic ...
  
  // If approved, create history entry
  if (approved) {
    return {
      success: true,
      entry,
      historyEntry: {
        proposalId,
        modality: entry.proposal.modality,
        oldWeight: entry.proposal.oldWeight,
        newWeight: entry.proposal.newWeight,
        approved: true,
        timestamp: new Date().toISOString()
      }
    };
  }
  // If declined, still create history for audit trail
  return {
    success: true,
    entry,
    historyEntry: {
      proposalId,
      modality: entry.proposal.modality,
      approved: false,
      timestamp: new Date().toISOString()
    }
  };
}
```

**Integration:**
- Main.js handler appends historyEntry to profile.approvalHistory on persistence
- Education Mode calls this when flushing preferences
- Workspace Mode will inherit same pattern when it's implemented

**Risk:** 🟢 **LOW**
- Additive only
- No impact on existing logic
- Pure instrumentation

---

## PART 5: HACKATHON MVP TESTING STRATEGY

### 5.1 Smallest Testable Slice

**Test Scenario (End-to-End):**
1. Learner creates Education Mode session
2. Requests explanation → LLM response adapted to preferences
3. Requests variant (simplify) → education-flow.js computes preference delta
4. Session ends → `endEducationSession()` queues proposal (NOT persisting yet)
5. Approval modal shown to learner (stub UI acceptable)
6. Learner clicks "Accept" → IPC call to `PE_SUBMIT_APPROVAL`
7. Handler persists updated profile to disk
8. Verify: Profile file contains updated weight; history tracks approval

**Verification Points:**
```bash
# After approval is granted:
cat ~/Library/Application\ Support/OnYou/profiles/learner-profile.json | jq '.adaptiveLearning.preferences.weights'
# Should show updated weight (e.g., guided_assistance: 0.8 instead of 0.5)

# Check history:
cat ~/Library/Application\ Support/OnYou/profiles/learner-profile.json | jq '.approvalHistory[-1]'
# Should show: { proposalId, modality, approved: true, timestamp }
```

### 5.2 Manual Test Cases (No UI automation needed)

**Test 1: Successful Outcome → Approval**
```
Input:  Education session, explanation succeeded with audio modality
Verify: Proposal generated with audio weight increase
Action: User clicks Accept
Check:  Profile saved with higher audio weight
```

**Test 2: Successful Outcome → Decline**
```
Input:  Same as Test 1
Action: User clicks Decline
Check:  Profile unchanged; proposal removed from pending; history shows declined
```

**Test 3: Multiple Proposals**
```
Input:  Education session with multiple modality variants requested
Verify: Multiple proposals queued
Action: Approve some, decline others
Check:  Only approved changes persisted; history tracks all decisions
```

**Test 4: Profile Reload (Persistence Verify)**
```
Input:  After Test 1 approval completes
Action: Restart app, load profile
Check:  Audio weight persists; history is intact
```

### 5.3 Logging for Observability (MVP)

**Add console logs (no file logging needed):**
```javascript
// In approval-flow.js:
console.log(`[PE] Proposal queued: ${proposal.proposalId} (${proposal.modality})`);
console.log(`[PE] User decision: ${proposalId} → ${approved ? 'APPROVED' : 'DECLINED'}`);
console.log(`[PE] Preferences persisted: ${modality} ${oldWeight} → ${newWeight}`);

// In education-flow.js:
console.log(`[ED] Session ended: ${sessionId} with ${proposals.length} proposals`);
```

**Verification:** Run app, watch console; match logs to test case steps.

---

## PART 6: BRANCH & FILE MANAGEMENT (PRESERVATION STRATEGY)

### 6.1 Work Location

**Do NOT modify these branches:**
- ❌ `main` — only add IPC handlers and imports (isolation)
- ❌ `origin/feature/education-mode` — only modify education-flow.js (surgical)
- ❌ `origin/feature/workspace-mode` — preserve empty; will inherit PE framework

**DO create/modify on this branch:**
- ✅ `feature/personalization-engine` — all new PE infrastructure (outcome-recorder.js, approval-flow.js)

### 6.2 Commit Strategy (MVP)

**Commit 1 (on feature/personalization-engine):**
```
feat(PE): Add outcome recorder for deterministic signal capture
- Create src/services/adaptive/outcome-recorder.js
- Pure functions: recordOutcome(), generateUpdateProposal()
- Reuses existing preference model; no state mutations
- Unit testable
```

**Commit 2 (on feature/personalization-engine):**
```
feat(PE): Implement approval flow state machine
- Create src/services/adaptive/approval-flow.js
- Queue, track, and persist user approval decisions
- Defers preference persistence until explicit approval
```

**Commit 3 (on main branch, after PE commits):**
```
feat(PE): Wire approval workflow into IPC and main process
- Add PE_GET_PENDING_PROPOSALS and PE_SUBMIT_APPROVAL IPC channels
- Register handlers in main.js
- Integrate with ProfileStore for approved updates
```

**Commit 4 (modify education-flow.js on feature/education-mode, later):**
```
fix(ED): Gate preference updates through approval workflow
- Modify endEducationSession() to queue proposals instead of persist
- Return proposals to UI; wait for user approval
- Prevents silent preference updates
```

**Commit 5 (on feature/personalization-engine):**
```
feat(PE): Add approval history to profile schema
- Add approvalHistory field to learner profile
- Track approved/declined decisions for audit trail
- Backward compatible; defaults to empty array
```

### 6.3 Merge Order (Safe Sequence)

**Order (CRITICAL):**
1. ✅ **First:** Merge feature/personalization-engine to main (PE foundation)
   - outcome-recorder.js, approval-flow.js
   - IPC channels and main.js handlers
   - No breaking changes to education mode yet

2. ✅ **Second:** Update feature/education-mode to use approval workflow
   - Cherry-pick approval-flow integration from main
   - OR git rebase onto main (safe; PE is downstream)

3. ✅ **Third:** feature/workspace-mode inherits PE workflow when merged

**Why This Order?**
- PE foundation is independent (pure functions)
- Education Mode can optionally adopt when ready
- Workspace Mode has no code yet; will use PE as baseline

### 6.4 NO Destructive Operations

**Forbidden:**
- ❌ `git reset --hard`
- ❌ `git rebase -i` (interactive rebase)
- ❌ `git force-push`
- ❌ Overwriting files (use Edit tool, not Write)
- ❌ Deleting branches

**Allowed:**
- ✅ `git fetch`, `git pull`
- ✅ `git checkout` (non-destructive branch switch)
- ✅ `git merge` (forward merge only)
- ✅ Creating new branches
- ✅ Creating new commits

---

## PART 7: SUMMARY TABLE & DELIVERABLES

### 7.1 Scope Summary

| Phase | Effort | Files | Risk | MVP | Delivers |
|-------|--------|-------|------|-----|----------|
| **1: Outcome Capture** | 3-4h | +1 (outcome-recorder.js) | 🟢 LOW | ✅ YES | Deterministic signal recording |
| **2: Approval Gate** | 6-8h | +1 (approval-flow.js), mod 3 | 🟢 LOW | ✅ YES | User decision point before persist |
| **3: Integration** | 2-3h | mod 2 | 🟢 LOW | ⏭️ NICE | Shared history tracking |
| **TOTAL MVP** | **9-12h** | **+2 files, mod 3** | 🟢 **LOW** | ✅ **TESTABLE** | Approval workflow end-to-end |

### 7.2 Files to Create (New)

```
src/services/adaptive/outcome-recorder.js      (Phase 1: ~80 lines)
src/services/adaptive/approval-flow.js         (Phase 2: ~120 lines)
```

### 7.3 Files to Modify (Surgical Changes)

```
src/shared/ipc-channels.js                     (+2 lines: PE channels)
main.js                                        (+20 lines: PE IPC handlers)
src/services/education/education-flow.js       (+15 lines: approval gate)
src/shared/profile-schema.js                   (+1 line: approvalHistory field)
```

### 7.4 Files NOT to Touch

```
src/services/adaptive/preference-model.js      (reuse as-is)
src/services/storage/profile-store.js          (reuse as-is)
src/services/companion/companion-event-bus.js  (reuse as-is)
src/services/adaptive/adaptive-engine.js       (reuse as-is)
```

---

## PART 8: RISKS & MITIGATION

### 8.1 Risk: Education Mode Still Persists Silently (Before Fix)

**Scenario:** Feature/education-mode branch merges to main before approval gate is added.

**Mitigation:** Defer merging feature/education-mode until after Phase 2 is complete. Keep branches separate on the remote.

**Verification:** Check `git log main` does NOT contain commit 78dfdb8 until approval fix is ready.

### 8.2 Risk: Profile Schema Change Breaks Existing Profiles

**Scenario:** approvalHistory field added; old profiles loaded without it.

**Mitigation:** Schema already has sanitization. New field defaults to empty array (non-breaking).

**Verification:** Test profile loading with existing JSON (no approvalHistory field).

### 8.3 Risk: Approval Flow Memory Leak (In-Memory Proposals)

**Scenario:** Proposals accumulate indefinitely; memory grows without bound.

**Mitigation:** 
- Implement cleanup on user approval/decline
- Set TTL on pending proposals (expire after 24h, fallback to auto-decline)
- Log cleanup events

**Testing:** Monitor memory after 100+ approvals.

### 8.4 Risk: Workspace Mode Code Appears After PE Is Done

**Scenario:** Workspace Mode has personalization code incompatible with PE workflow.

**Mitigation:** All modes reuse same profile schema and preference model. PE workflow is design constraint; WM will inherit it.

**Communication:** Brief Workspace Mode developer on PE pattern before they start.

---

## PART 9: NEXT CONCRETE ACTIONS

### ✅ Immediate (Today — 30 minutes)

1. Review this plan with team
2. Confirm Workspace Mode developer status (is work local-only?)
3. Decide: Merge education-mode to main now, or wait for approval fix?

### ✅ Sprint Day 1 (4-6 hours)

1. Create `outcome-recorder.js` (Phase 1)
   ```bash
   git checkout feature/personalization-engine
   # Create file with recordOutcome() and generateUpdateProposal() functions
   # Write unit tests
   git commit -m "feat(PE): Add outcome recorder"
   ```

2. Create `approval-flow.js` (Phase 2 foundation)
   ```bash
   # Create file with ApprovalFlow class
   # Implement queueProposal, recordApproval, getApprovedUpdates
   git commit -m "feat(PE): Implement approval flow"
   ```

3. Add IPC channels and main.js handlers
   ```bash
   git checkout main
   # Edit src/shared/ipc-channels.js: add PE_GET_PENDING_PROPOSALS, PE_SUBMIT_APPROVAL
   # Edit main.js: add IPC handlers
   git commit -m "feat(PE): Wire approval workflow to IPC"
   ```

### ✅ Sprint Day 2 (4-6 hours)

1. Modify education-flow.js on feature/education-mode
   ```bash
   git checkout origin/feature/education-mode
   # Edit endEducationSession(): queue proposals instead of persist
   git commit -m "fix(ED): Gate preference updates through approval"
   ```

2. End-to-end testing
   - Launch app
   - Create Education Mode session
   - Request variant → trigger preference delta
   - Verify proposal queued
   - Approve in UI → verify profile persisted
   - Check profile file and history

### ✅ Before Team Integration (Day 3)

1. Verify no broken imports or circular dependencies
2. Confirm PE branch builds without errors
3. Document for Workspace Mode developer: "Use approval-flow.js pattern"

---

## CONCLUSION

### What We're Building

A **non-invasive approval workflow** that:
1. ✅ Captures outcomes deterministically (Phase 1)
2. ✅ Queues preference updates for user approval (Phase 2)
3. ✅ Persists ONLY approved changes (Phase 2)
4. ✅ Tracks decisions in audit trail (Phase 3)

### What We're Reusing

- ✅ Profile schema (shared, supports both modes)
- ✅ Preference model (pure functions, deterministic)
- ✅ Profile store (atomic, crash-safe)
- ✅ IPC framework (extensible channels)

### What We're NOT Doing

- ❌ Rewriting education mode (just adding approval gate)
- ❌ Rebuilding preference model (using as-is)
- ❌ Recreating profile schema (extending, not replacing)
- ❌ Breaking Workspace Mode (keeps it compatible)

### MVP Success Criteria

- ✅ Preference updates require explicit user approval
- ✅ Approvals/declines are tracked in profile history
- ✅ Education Mode integrates without rewriting
- ✅ Workspace Mode can adopt same pattern
- ✅ All work preserved; no force-pushes or resets
- ✅ End-to-end test passes (proposal → approval → persist → verify)

---

**Generated:** October 24, 2026, 10:26 UTC  
**Status:** Ready for team review and implementation  
**Next Step:** Team decision on merge order and start Sprint Day 1

