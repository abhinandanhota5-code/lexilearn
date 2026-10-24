# Friend 3: Personalization Engine Implementation Brief

**Role:** Continuous Preference Updates & Approval Workflow  
**Branch:** `feature/personalization-engine`  
**Team Lead:** Will handle main/integration  
**Timeline:** Hackathon sprint  

---

## Your Mission (In 3 Sentences)

Build the closed-loop personalization system: activity outcome → show proposal → user approves → update profile → next activity reflects new preferences. You own preference updates, approval dialog, and profile inspector. Reuse the existing preference model and ALE (don't rewrite them, just extend).

---

## What You're Building

### 3 Core Features
1. **Preference Updates** — Extend preference model to handle workspace modalities
2. **Approval Workflow** — Show proposal dialog before updating profile
3. **Profile Inspector** — Read-only view of current preferences and approval history

### The Closed-Loop Flow
```
Activity Outcome (Friend 1/2 provides)
  ↓
Judge Activity (success/failure)
  ↓
Calculate new preferences (your code)
  ↓
Show Approval Proposal UI (your code)
  ↓
User Approves/Rejects (your UI)
  ↓
Update Profile (your code)
  ↓
Next Activity Reflects Updated Preferences (Friend 1/2 uses your updates)
```

---

## What You Can Reuse (Don't Rewrite)

✅ **Preference Model Logic** — `src/services/adaptive/preference-model.js` (extend, don't rewrite)  
✅ **Adaptive Engine** — `src/services/adaptive/adaptive-engine.js` (already mode-aware, you just ensure it works)  
✅ **Activity Judging** — `src/services/learning/activity-contract.js` (friend 2 handles, you just receive the outcome)  
✅ **Profile Storage** — `src/services/storage/profile-store.js` (team lead owns, you call it to save)  
✅ **IPC Channels** — Defined by Team Lead, you just use them  

---

## File Structure (Create These Directories)

```
src/services/adaptive/
├── preference-model.js             (EXTEND — add workspace modalities)
└── adaptive-engine.js              (VERIFY — ensure mode-aware, may not need changes)

src/services/approval/
├── approval-workflow.js            (NEW)
└── approval-store.js               (NEW)

src/renderer/screens/shared/
├── approval-dialog-screen.js       (NEW)
└── profile-inspector-screen.js     (NEW)

src/renderer/components/approval/
├── approval-proposal-card.js       (NEW)
└── profile-preference-display.js   (NEW)
```

---

## Quick Implementation Guide

### Step 1: Extend Preference Model

```javascript
// src/services/adaptive/preference-model.js

// Existing logic already works! Just extend for workspace:
export class PreferenceModel {
  recordOutcome(profile, observedModalities, success) {
    // Existing code (DON'T CHANGE):
    // - Takes modalities: ['audio', 'text', 'visual', 'manipulation']
    // - Updates weights by delta: success +0.08, failure -0.03
    // - Clamps weights to [0.05, 0.95]
    
    // Your job: VERIFY this works for workspace modalities
    // (It should already work—it's mode-agnostic!)
    
    const weights = profile.preferences?.weights || {};
    const delta = success ? 0.08 : -0.03;
    
    for (const modality of observedModalities) {
      if (weights[modality] !== undefined) {
        weights[modality] = Math.min(0.95, Math.max(0.05, weights[modality] + delta));
      }
    }
    
    return { weights, updatedAt: new Date().toISOString() };
  }
  
  // Add new method for workspace:
  getWorkspaceModalities() {
    return ['visual', 'audio', 'text', 'manipulation'];
  }
}
```

### Step 2: Create Approval Workflow

```javascript
// src/services/approval/approval-workflow.js

export class ApprovalWorkflow {
  constructor(profileStore) {
    this.profileStore = profileStore;
  }
  
  async createProposal(profile, oldPreferences, newPreferences, reason) {
    // Create proposal object
    const proposal = {
      id: `proposal_${Date.now()}`,
      timestamp: new Date().toISOString(),
      before: oldPreferences,
      after: newPreferences,
      reason: reason, // e.g., "You engaged well with audio narration"
      status: 'pending' // 'pending' | 'approved' | 'rejected'
    };
    
    return proposal;
  }
  
  async recordApproval(profile, proposal, approved) {
    // Log the decision
    proposal.status = approved ? 'approved' : 'rejected';
    proposal.decidedAt = new Date().toISOString();
    
    if (!profile.approvalHistory) {
      profile.approvalHistory = [];
    }
    profile.approvalHistory.push(proposal);
    
    // If approved: update profile
    if (approved) {
      profile.preferences = proposal.after;
      await this.profileStore.saveProfile(profile);
    }
    
    return profile;
  }
}
```

### Step 3: Create Approval Dialog Screen

```javascript
// src/renderer/screens/shared/approval-dialog-screen.js

import { ipcRenderer } from 'electron';

export function ApprovalDialogScreen({ proposal, onApprove, onReject }) {
  return (
    <div className="approval-dialog">
      <h2>Personalization Proposal</h2>
      
      {/* Show before/after */}
      <div className="proposal-comparison">
        <div className="before">
          <h3>Current Preferences</h3>
          <PreferenceDisplay preferences={proposal.before} />
        </div>
        <div className="arrow">→</div>
        <div className="after">
          <h3>Proposed Update</h3>
          <PreferenceDisplay preferences={proposal.after} />
        </div>
      </div>
      
      {/* Show reason */}
      <div className="proposal-reason">
        <p><strong>Why:</strong> {proposal.reason}</p>
      </div>
      
      {/* Buttons */}
      <div className="buttons">
        <button onClick={() => onApprove()}>Accept</button>
        <button onClick={() => onReject()}>Decline</button>
      </div>
    </div>
  );
}
```

### Step 4: Create Profile Inspector

```javascript
// src/renderer/screens/shared/profile-inspector-screen.js

export function ProfileInspectorScreen({ profile }) {
  return (
    <div className="profile-inspector">
      <h2>Your Profile</h2>
      
      {/* Current preferences */}
      <section className="current-preferences">
        <h3>Current Preferences</h3>
        <PreferenceDisplay preferences={profile.preferences?.weights} />
      </section>
      
      {/* Approval history */}
      <section className="approval-history">
        <h3>Personalization History</h3>
        {profile.approvalHistory?.map((decision) => (
          <ApprovalHistoryCard key={decision.id} decision={decision} />
        ))}
      </section>
      
      {/* Stats */}
      <section className="stats">
        <p>Activities Completed: {profile.adaptiveState?.activities || 0}</p>
        <p>Approvals: {profile.approvalHistory?.filter(d => d.status === 'approved').length || 0}</p>
      </section>
    </div>
  );
}
```

### Step 5: Hook Into Learning Flow

```javascript
// Integrate with src/services/learning/learning-flow.js (coordinate with Friend 2)

// After activity judgment:
async function handleActivityOutcome(learnerId, activityResult) {
  const profile = await getProfile(learnerId);
  const oldPreferences = { ...profile.preferences.weights };
  
  // 1. Update preferences
  const preferenceModel = new PreferenceModel();
  const newPreferences = preferenceModel.recordOutcome(
    profile,
    activityResult.observedModalities,
    activityResult.success
  );
  
  // 2. Show approval proposal
  const proposal = await approvalWorkflow.createProposal(
    profile,
    oldPreferences,
    newPreferences.weights,
    activityResult.success ? 'You engaged well with ' + bestModality : 'Opportunity to try a different approach'
  );
  
  // 3. Send to UI (via IPC)
  ipcMain.handle('show-approval-proposal', async () => {
    return proposal;
  });
  
  // 4. Wait for user decision (via IPC)
  ipcRenderer.on('approval-decision', async (event, { approved }) => {
    profile = await approvalWorkflow.recordApproval(profile, proposal, approved);
    
    // 5. Next activity will reflect updated preferences
    // (Friend 1/2 call getMission again, gets updated profile)
  });
}
```

---

## Testing Checklist (Before Merge)

Run these checks:
```bash
npm start  # Electron app should launch without errors

# Manual tests:
□ Preference model updates weights correctly
□ Weights stay clamped [0.05, 0.95]
□ Approval dialog shows and accepts input
□ Profile inspector displays current preferences
□ Approval history is populated
□ Profile persists after approval
□ Next activity reflects updated preferences
□ No console errors in DevTools

# Integration test:
□ Run: node ipp-mvp-demo.js (all 7 features should work)
□ Test with Friend 1: Do workspace activities show approval dialog?
□ Test with Friend 2: Do education activities show approval dialog?
□ Test continuous personalization end-to-end:
   - Activity 1: audio pref = 0.7
   - Activity 1 succeeds: pref should update to ~0.78
   - Activity 2: should reflect new pref (audio still strongest)
```

---

## Git Workflow

```bash
# Start work
git checkout feature/personalization-engine
git pull origin feature/personalization-engine

# Make changes
# ... edit files ...

# Every 30–60 minutes: commit & push
git add src/services/adaptive/ src/services/approval/ src/renderer/screens/shared/ src/renderer/components/approval/
git commit -m "feat(personalization): implement preference updates and approval workflow

- Extend preference model for workspace modalities
- Implement approval proposal UI with before/after
- Build profile inspector for history and preferences
- Add closed-loop profile update on activity outcome

Co-Authored-By: [Your Name] <your.email>"

git push origin feature/personalization-engine

# When done: Tell Team Lead you're ready for PR review
```

---

## Critical Implementation Detail: Closed-Loop Verification

**You MUST test that preferences actually affect next activity:**

```javascript
// Test script (add to test-ai.js or similar):
async function testClosedLoopPersonalization() {
  // 1. Create profile with audio pref = 0.7
  const profile = createProfile('test', 'workspace', 'audio');
  console.log('Initial audio pref:', profile.preferences.weights.audio); // Should be 0.7
  
  // 2. Simulate activity success
  const prefModel = new PreferenceModel();
  const newPrefs = prefModel.recordOutcome(profile, ['audio'], true);
  console.log('After success:', newPrefs.weights.audio); // Should be ~0.78
  
  // 3. Verify clamping
  console.assert(newPrefs.weights.audio >= 0.05 && newPrefs.weights.audio <= 0.95, 'Weights out of bounds!');
  
  // 4. Verify next activity selection uses new prefs
  const nextActivity = selectNextActivity(profile);
  console.log('Next activity:', nextActivity);
  
  console.log('✅ Closed-loop verified!');
}
```

---

## Common Questions

**Q: What if preference updates break something?**  
A: Revert your changes:
```bash
git reset --hard origin/main
git rebase origin/main
```

**Q: Should I add new modalities?**  
A: No. Reuse existing: visual, audio, text, manipulation. They're already mode-agnostic.

**Q: What if the approval dialog is too complex?**  
A: Start simple: just show "Update audio from 0.7 to 0.78?" with Yes/No buttons. Polish the UI if time allows.

**Q: Do I need to persist approval history?**  
A: Yes. Save it to `profile.approvalHistory` in the profile JSON. Team Lead's profile store handles persistence.

**Q: How does this integrate with Friend 1's workspace and Friend 2's education?**  
A: You don't need to know! Just ensure preferences update and new activity sees them. Friend 1/2 call `getProfile()` or `getMission()` after approval, and they get updated preferences.

---

## Success Criteria

By end of hackathon:
- ✅ Preferences update on activity success
- ✅ Weights clamped [0.05, 0.95]
- ✅ Approval dialog shows proposal
- ✅ User can approve/reject
- ✅ Profile persists after approval
- ✅ Next activity reflects updated preferences
- ✅ Continuous personalization works end-to-end
- ✅ ipp-mvp-demo.js still shows all 7 features
- ✅ Works on both macOS and Windows

---

## The Bottom Line

**You're building the "brain" of IPP: making it learn and adapt from user interactions.**

This is the most complex piece, but you're reusing 80% of existing code (preference model, activity judging, profile storage). Focus on the approval workflow and UI—that's the new part.

---

**Team Lead will help** if IPC integration is unclear.  
**Friend 1 owns** workspace mode UI.  
**Friend 2 owns** education mode integration.  
**You own** preference updates and approval workflow.

**Ready to start?** Checkout your branch and extend the preference model.

