# Friend 1: Workspace Mode Implementation Brief

**Role:** Workspace Mode UI & Response System  
**Branch:** `feature/workspace-mode`  
**Team Lead:** Will handle main/integration  
**Timeline:** Hackathon sprint  

---

## Your Mission (In 3 Sentences)

Build the Workspace UI that lets users input tasks, get feedback, and see their preferences adapt. You own all workspace-specific screens and components. Reuse the shared profile system (Team Lead owns it, Friend 3 updates it).

---

## What You're Building

### 4 Screens (Required)
1. **Workspace Onboarding** — Collect name, preferred modality, confirm mode selection
2. **Workspace Activity Screen** — Display task, collect user response
3. **Workspace Response Screen** — Show result (success/failure), option to try again
4. **Workspace Dashboard** — Show personalization history, approval decisions

### Task Registry (Workspace Activities)
Define 3–5 task types:
- `summarize` — "Summarize this text concisely"
- `explain_simply` — "Explain this in simple terms"
- `rewrite_tone` — "Rewrite in a different tone"
- (Add 1–2 more if time allows)

---

## What You Can Reuse (Don't Reinvent)

✅ **Profile Schema** (read-only)  
✅ **IPC Channels** (defined by Team Lead)  
✅ **Preference Weights** (Friend 3 updates them)  
✅ **Activity Judging** (Friend 2/3 handle the logic)  
✅ **Electron/React patterns** (copy from existing screens in `src/renderer/screens/learner/`)

---

## File Structure (Create These Directories)

```
src/renderer/screens/workspace/
├── workspace-onboarding-screen.js      (NEW)
├── workspace-activity-screen.js        (NEW)
├── workspace-response-screen.js        (NEW)
└── workspace-dashboard-screen.js       (NEW)

src/renderer/components/workspace/
├── workspace-task-display.js           (NEW)
├── workspace-response-input.js         (NEW)
└── workspace-personalization-card.js   (NEW — for dashboard)

src/services/workspace/
├── workspace-registry.js               (NEW — task definitions)
├── workspace-activity-builder.js       (NEW)
└── workspace-ui-service.js             (NEW)
```

---

## Quick Implementation Guide

### Step 1: Create `workspace-registry.js`
Define your 3–5 task types:
```javascript
// src/services/workspace/workspace-registry.js
export const workspaceTasks = {
  summarize: {
    id: 'summarize',
    prompt: 'Summarize this text concisely:',
    examples: [
      'Machine learning models learn patterns from data.',
      'The company released a new product this quarter.'
    ]
  },
  explain_simply: {
    id: 'explain_simply',
    prompt: 'Explain this in simple terms:',
    examples: [
      'Photosynthesis is how plants make food from sunlight.',
      'A neural network is like a brain made of connected dots.'
    ]
  },
  // Add 1–3 more...
};
```

### Step 2: Create Onboarding Screen
```javascript
// src/renderer/screens/workspace/workspace-onboarding-screen.js
export function WorkspaceOnboardingScreen() {
  // 1. Collect name
  // 2. Show modality options (visual, audio, text, manipulation)
  // 3. Confirm mode = workspace
  // 4. On submit: create profile via IPC
  //    → ipcRenderer.send('create-profile', { name, mode: 'workspace', modality })
  // 5. Navigate to first workspace activity
}
```

### Step 3: Create Activity Screen
```javascript
// src/renderer/screens/workspace/workspace-activity-screen.js
export function WorkspaceActivityScreen() {
  // 1. Get task from registry (e.g., 'summarize')
  // 2. Display prompt + example
  // 3. Show input field for user response
  // 4. On submit: 
  //    → ipcRenderer.send('judge-activity', { response })
  //    → Receive result: { success: true/false }
  // 5. Navigate to response screen
}
```

### Step 4: Create Dashboard Screen
```javascript
// src/renderer/screens/workspace/workspace-dashboard-screen.js
export function WorkspaceDashboardScreen() {
  // 1. Show current preferences (call via IPC: 'get-profile')
  // 2. Display approval history
  // 3. Show personalization stats (e.g., "audio preference improved from 0.7 to 0.78")
  // 4. Button to start new activity
}
```

---

## Testing Checklist (Before Merge)

Run these checks:
```bash
npm start  # Electron app should launch without errors

# Manual tests:
□ Onboarding screen renders
□ Can enter name and select modality
□ Activity screen displays task
□ Can input response
□ Response screen shows success/failure
□ Dashboard loads (even if empty)
□ No console errors in DevTools
□ Works on your machine (Mac or Windows)

# Integration test:
□ Run: node ipp-mvp-demo.js (should still work)
□ Discuss with Friend 2: Does education mode still load?
```

---

## Git Workflow

```bash
# Start work
git checkout feature/workspace-mode
git pull origin feature/workspace-mode

# Make changes
# ... edit/create files ...

# Every 30–60 minutes: commit & push
git add src/renderer/screens/workspace/ src/renderer/components/workspace/ src/services/workspace/
git commit -m "feat(workspace): add activity screens

- Implement workspace onboarding screen
- Add task display and response input
- Create workspace dashboard

Co-Authored-By: [Your Name] <your.email>"

git push origin feature/workspace-mode

# When done: Tell Team Lead you're ready for PR review
```

---

## Common Questions

**Q: What if I need to update the profile?**  
A: Use IPC channels (defined by Team Lead in `src/shared/ipc-channels.js`). Example:
```javascript
ipcRenderer.send('update-profile-preferences', { modalities: ['audio'], delta: 0.08 });
```

**Q: What if activity judging is different for workspace?**  
A: Talk to Friend 3. They own the approval workflow and can extend judging logic. You just display the result.

**Q: Should I create my own components or reuse?**  
A: Copy from `src/renderer/screens/learner/` and `src/renderer/components/learning/` as templates. Adapt for workspace.

**Q: What if I finish early?**  
A: Add more task types (translate, generate_examples, etc.) or polish the UI. Aim for ~5 task types total.

---

## Success Criteria

By end of hackathon:
- ✅ Workspace screens render without errors
- ✅ Can complete a workspace activity end-to-end
- ✅ Preferences update based on outcome (verify with Friend 3)
- ✅ Dashboard shows personalization history
- ✅ No regression in education mode
- ✅ Works on both macOS and Windows

---

**Team Lead will help** if you get stuck on IPC, profile schema, or integration.  
**Friend 3 owns** approval workflow and profile updates.  
**You own** UI, screens, components.

**Ready to start?** Checkout your branch and create those directories.

