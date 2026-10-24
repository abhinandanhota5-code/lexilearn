# Team Collaboration Plan: IPP MVP (4-Person Hackathon)

**Date:** October 24, 2026  
**Team:** 4 people (Team Lead + 3 Feature Owners)  
**Platforms:** macOS (2), Windows (1)  
**Repository:** TBD (local Git initialized, no remote yet)  
**Timeline:** Hackathon sprint (immediate)

---

## PART A: GitHub COLLABORATION PLAN

### Current Repository State
- **Status:** Git initialized locally, NO commits yet, NO remotes configured
- **Branch:** main (but `* No commits yet on main`)
- **Untracked Files:** ~60 files (MVP code, audit reports, test files)
- **Size:** ~1.8GB (includes node_modules)

### Step 1: Create GitHub Repository (Team Lead Only)

**BEFORE DOING ANYTHING:**
1. Confirm target GitHub URL (e.g., `github.com/myorg/ipp-mvp` or `github.com/abhinandan/ipp-mvp`)
2. Create repo with:
   - ✅ README.md (can be empty, we'll create one)
   - ✅ .gitignore (Node.js template)
   - ❌ Do NOT initialize with any files
   - ❌ Do NOT add license yet

**Create `.gitignore` locally first:**

```bash
# /Users/abhinandan/Developers Peeve/dyslexia-app/.gitignore
node_modules/
.ipp-test-data/
scratch_*.js
scratch_test_*/
*.log
.env
.env.local
dist/
build/
.DS_Store
Thumbs.db
*.swp
*.swo
*~
.idea/
.vscode/settings.json
```

Then add and commit it (see Step 2).

### Step 2: First Commit & Push (Team Lead Only)

```bash
# Navigate to project
cd "/Users/abhinandan/Developers Peeve/dyslexia-app"

# Stage all non-scratch, non-audit files
git add -A

# Remove scratch files and audit reports from staging
git reset HEAD scratch_*.js scratch_test_*/ 
git reset HEAD AUDIT_*.txt FINAL_REPORT.txt LEXILEARN_*.md README_AUDIT_AND_MVP.md IPP_MVP_IMPLEMENTATION_SUMMARY.md DELIVERABLES_INDEX.md

# Verify what's staged (should be: src/, main.js, package.json, ipp-mvp-demo.js, etc.)
git status

# First commit: baseline MVP
git commit -m "Initial commit: IPP MVP baseline with LexiLearn foundation

- Core MVP implementation: ipp-mvp-demo.js, main.js, package.json
- LexiLearn service layer: src/services/* (adaptive, learning, AI, etc.)
- Electron main process and renderer
- Shared profile schema and IPC channels
- Verified working: all 7 IPP features demonstrated

Co-Authored-By: Claude Code <noreply@anthropic.com>"

# Add remote (replace URL with actual GitHub URL)
git remote add origin https://github.com/YOUR_ORG/ipp-mvp.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### Step 3: Create Feature Branches (All Team Members)

After Team Lead pushes to GitHub, each feature owner pulls and creates their branch:

```bash
# Pull latest (Team Members)
git fetch origin
git checkout main
git pull origin main

# Create feature branch (each person runs their own)
# Friend 1 — Workspace Mode
git checkout -b feature/workspace-mode
git push -u origin feature/workspace-mode

# Friend 2 — Education Mode
git checkout -b feature/education-mode
git push -u origin feature/education-mode

# Friend 3 — Personalization Engine
git checkout -b feature/personalization-engine
git push -u origin feature/personalization-engine

# Team Lead — Integration branch (for coordinating final merge)
git checkout -b feature/integration
git push -u origin feature/integration
```

### Step 4: Branch Protection Rules (Optional, Team Lead Sets Up)

In GitHub Settings → Branches → Branch protection rules:
- **Protect:** `main`
- **Require:** Pull request review (1 approval minimum)
- **Dismiss stale reviews:** ✅ checked
- **Require status checks:** When ready (after tests are set up)

---

## PART B: FILE OWNERSHIP MAP

### Ownership Principles
1. **Each file owned by ONE person** (no overlaps)
2. **Shared API** for cross-team collaboration (see section below)
3. **Minimize merge conflicts** (divide by function, not by change type)

### File Ownership Assignment

#### **Team Lead** — main, integration, profile API, IPC
```
Branch: main (+ local feature/integration for testing)
Owned Files:
  • package.json (dependencies)
  • main.js (Electron main process, IPC handlers)
  • src/shared/ipc-channels.js (IPC definitions — READ ONLY after definition)
  • src/shared/profile-schema.js (canonical profile schema — extend only, never break)
  • src/services/storage/profile-store.js (profile persistence — extend only)
  • TEAM_COLLABORATION_PLAN.md (this file)
  • README.md (top-level project docs)

Responsibilities:
  • Review and merge all PRs
  • Maintain profile API contract
  • Run integration tests before merge
  • Coordinate cross-feature dependencies
  • Resolve merge conflicts
```

#### **Friend 1** — Workspace Mode UI & Responses
```
Branch: feature/workspace-mode
Owned Files:
  • src/renderer/screens/workspace/ (NEW — create this directory)
    └─ workspace-onboarding-screen.js (new)
    └─ workspace-activity-screen.js (new)
    └─ workspace-response-screen.js (new)
    └─ workspace-dashboard-screen.js (new)
  
  • src/renderer/components/workspace/ (NEW)
    └─ workspace-task-display.js (new)
    └─ workspace-response-input.js (new)
    └─ workspace-personalization-card.js (new)
  
  • src/services/workspace/ (NEW)
    └─ workspace-registry.js (new — task definitions)
    └─ workspace-activity-builder.js (new)
    └─ workspace-ui-service.js (new)

Responsibilities:
  • Design workspace UI (onboarding, activity, results)
  • Implement workspace-specific screens
  • Build workspace task types (summarize, explain, rewrite)
  • Render personalized workspace responses
  • Coordinate with Friend 3 on approval flow UI
  • Test on both Mac and Windows
```

#### **Friend 2** — Education Mode Integration
```
Branch: feature/education-mode
Owned Files:
  • src/renderer/screens/learner/ (MODIFY EXISTING)
    └─ learning-activity-screen.js (extend for IPP mode)
    └─ my-day-screen.js (show mode in UI)
  
  • src/services/learning/ (MODIFY EXISTING)
    └─ learning-flow.js (add mode parameter)
    └─ activity-contract.js (ensure mode-aware judging)
  
  • src/services/curriculum/ (REUSE EXISTING)
    └─ curriculum-registry.js (reuse as-is)
    └─ grade-difficulty.js (reuse as-is)
  
  • src/renderer/components/learning/ (NO CHANGES)
    └─ All existing components reusable as-is

Responsibilities:
  • Connect existing LexiLearn learning flow to IPP profile
  • Ensure education mode still works (regression test)
  • Pass mode through decision pipeline
  • Reuse all existing activity builders (no rewrites)
  • Test on both Mac and Windows
  • Verify no regression in original education flow
```

#### **Friend 3** — Personalization Engine & Profile Updates
```
Branch: feature/personalization-engine
Owned Files:
  • src/services/adaptive/ (EXTEND EXISTING)
    └─ preference-model.js (extend for workspace modalities)
    └─ adaptive-engine.js (parameterize by mode)
  
  • src/services/approval/ (NEW)
    └─ approval-workflow.js (new)
    └─ approval-store.js (new)
  
  • src/renderer/screens/shared/ (NEW)
    └─ approval-dialog-screen.js (new)
    └─ profile-inspector-screen.js (new)
  
  • src/renderer/components/approval/ (NEW)
    └─ approval-proposal-card.js (new)
    └─ profile-preference-display.js (new)

Responsibilities:
  • Extend preference model for workspace modalities
  • Implement approval workflow (show proposal → user approves/rejects)
  • Update profile on activity outcome
  • Build profile inspector UI
  • Ensure preference weights stay clamped [0.05, 0.95]
  • Test continuous personalization end-to-end
  • Verify on both Mac and Windows
```

### Shared / Read-Only Files (All Team Members Can Read, Only Team Lead Modifies)
```
src/shared/ipc-channels.js        — Define new channels as needed
src/shared/profile-schema.js      — Only extend, never break
src/services/storage/profile-store.js  — Only extend, never break
main.js                           — Team Lead manages IPC handlers
```

### New Directories to Create
```
src/renderer/screens/workspace/   — Friend 1
src/renderer/components/workspace/ — Friend 1
src/services/workspace/           — Friend 1
src/services/approval/            — Friend 3
src/renderer/screens/shared/      — Friend 3
src/renderer/components/approval/ — Friend 3
```

---

## PART C: IMPLEMENTATION BRIEFS FOR FEATURE OWNERS

### Brief 1: Friend 1 — Workspace Mode (feature/workspace-mode)

**YOUR MISSION:** Build the Workspace UI and task delivery system

**WHAT YOU OWN:**
- Workspace onboarding (collect name, modality preference, mode selection)
- Workspace activity display (show task, collect response)
- Workspace response validation UI
- Workspace dashboard (show quality improvements, approval history)

**WHAT YOU REUSE:**
- Profile schema (read-only, Team Lead owns)
- IPC channels (defined by Team Lead)
- Preference weights (Friend 3 updates them)
- Activity judging logic (Friend 3 extends)

**YOUR WORKFLOW:**
1. Create `src/renderer/screens/workspace/` directory
2. Implement 4 screens:
   - `workspace-onboarding-screen.js` — Collect name, modality, mode
   - `workspace-activity-screen.js` — Display task, accept response
   - `workspace-response-screen.js` — Show result (success/failure)
   - `workspace-dashboard-screen.js` — Show personalization history
3. Create `src/services/workspace/workspace-registry.js` with task types:
   ```javascript
   // Example task types (you define these)
   {
     summarize: { prompt: "Summarize this text", examples: [...] },
     explain_simply: { prompt: "Explain simply", examples: [...] },
     rewrite_tone: { prompt: "Rewrite in tone", examples: [...] }
   }
   ```
4. Build workspace activity builder in `src/services/workspace/workspace-activity-builder.js`
5. Implement response input component in `src/renderer/components/workspace/`

**TESTING BEFORE MERGE:**
- [ ] Onboarding collects name and modality
- [ ] Workspace screens render without error
- [ ] Activity display shows task correctly
- [ ] Response input works on Mac and Windows
- [ ] No regressions in education mode (test with Friend 2)
- [ ] Profile updates flow to Friend 3's personalization engine

**GIT WORKFLOW:**
```bash
# Work on feature/workspace-mode
git checkout feature/workspace-mode
# ... make changes ...
git add src/renderer/screens/workspace/ src/services/workspace/
git commit -m "feat(workspace): add onboarding and activity screens

- Implement workspace mode UI
- Create workspace task registry
- Build response input components

Co-Authored-By: [Your Name] <your.email@company.com>"

git push origin feature/workspace-mode

# When ready: Create PR on GitHub
# Title: "feat: Workspace Mode UI"
# Description: "Implement onboarding, activity display, dashboard"
```

---

### Brief 2: Friend 2 — Education Mode Integration (feature/education-mode)

**YOUR MISSION:** Connect existing LexiLearn to IPP profile system

**WHAT YOU OWN:**
- Pass mode parameter through learning flow
- Ensure education activities work with shared profile
- Verify no regression in original LexiLearn functionality

**WHAT YOU REUSE:**
- `src/services/learning/learning-flow.js` (extend, don't rewrite)
- `src/services/learning/activity-registry.js` (reuse as-is)
- `src/services/curriculum/curriculum-registry.js` (reuse as-is)
- `src/services/adaptive/adaptive-engine.js` (Friend 3 parameterizes)
- ALL existing activity builders, validators, screens (reuse as-is)

**YOUR WORKFLOW:**
1. Update `src/services/learning/learning-flow.js`:
   - Add `mode` parameter to `getMission(learnerId, mode)`
   - Route to education objectives when `mode === 'education'`
   - Reuse all existing logic, just add mode check
2. Update `src/services/learning/activity-contract.js`:
   - Ensure judging logic works for both modes (should already work)
3. Modify `src/renderer/screens/learner/learning-activity-screen.js`:
   - Show mode in UI header (optional, nice-to-have)
4. Verify profile updates flow correctly through IPC

**TESTING BEFORE MERGE:**
- [ ] Education mode activities still work
- [ ] Mode parameter flows through learning-flow.js
- [ ] Activity judging works correctly
- [ ] Profile updates on activity outcome
- [ ] No errors in console on Mac or Windows
- [ ] Regression test: original education flow unchanged

**GIT WORKFLOW:**
```bash
# Work on feature/education-mode
git checkout feature/education-mode
# ... make changes ...
git add src/services/learning/ src/renderer/screens/learner/
git commit -m "feat(education): integrate IPP mode into learning flow

- Add mode parameter to learning-flow.js
- Ensure activity contract works with shared profile
- Verify education mode regression tests pass

Co-Authored-By: [Your Name] <your.email@company.com>"

git push origin feature/education-mode

# When ready: Create PR on GitHub
# Title: "feat: Education Mode Integration"
# Description: "Connect LexiLearn to IPP profile, pass mode through flow"
```

---

### Brief 3: Friend 3 — Personalization Engine (feature/personalization-engine)

**YOUR MISSION:** Build continuous preference updates and approval workflow

**WHAT YOU OWN:**
- Extend preference model for workspace modalities
- Implement approval workflow (proposal → user approval → profile update)
- Build profile inspector UI
- Ensure closed-loop personalization (activity → update → next activity)

**WHAT YOU REUSE:**
- `src/services/adaptive/preference-model.js` (extend, don't rewrite)
- `src/services/adaptive/adaptive-engine.js` (extend for mode)
- Profile schema (Team Lead owns, you only read/extend)
- Activity judging (from Friend 2's activity contract)

**YOUR WORKFLOW:**
1. Extend `src/services/adaptive/preference-model.js`:
   - Add workspace modality tracking (visual, audio, text, manipulation)
   - Reuse existing success/failure deltas (+0.08/-0.03)
   - Ensure weight clamping [0.05, 0.95] works for all modalities
2. Create `src/services/approval/approval-workflow.js`:
   - Show proposal before updating: "Update audio preference to 0.78?"
   - Collect user approval/rejection
   - Log approval decision with timestamp
3. Create `src/renderer/screens/shared/approval-dialog-screen.js`:
   - Display proposal (before/after comparison)
   - Accept/reject buttons
   - Show reasoning ("You engaged well with audio narration")
4. Create `src/renderer/screens/shared/profile-inspector-screen.js`:
   - Show current preferences
   - Show approval history
   - Read-only view
5. Update `src/services/learning/learning-flow.js` (with Friend 2):
   - After activity outcome: show approval dialog
   - On approval: update profile
   - Next activity reflects updated preferences

**TESTING BEFORE MERGE:**
- [ ] Preferences update on activity success
- [ ] Weights stay clamped [0.05, 0.95]
- [ ] Approval dialog shows proposal correctly
- [ ] User can approve/reject
- [ ] Profile persists after approval
- [ ] Next activity reflects updated preferences
- [ ] Continuous personalization works end-to-end
- [ ] Works on Mac and Windows

**GIT WORKFLOW:**
```bash
# Work on feature/personalization-engine
git checkout feature/personalization-engine
# ... make changes ...
git add src/services/adaptive/ src/services/approval/ src/renderer/screens/shared/ src/renderer/components/approval/
git commit -m "feat(personalization): implement preference updates and approval workflow

- Extend preference model for workspace modalities
- Build approval proposal UI with before/after
- Implement closed-loop profile update on activity outcome
- Add profile inspector for viewing history

Co-Authored-By: [Your Name] <your.email@company.com>"

git push origin feature/personalization-engine

# When ready: Create PR on GitHub
# Title: "feat: Continuous Personalization & Approval Workflow"
# Description: "Profile updates, approval dialog, closed-loop personalization"
```

---

## PART D: EXACT GIT COMMANDS FOR TEAM

### Setup Commands (Team Lead Only, Day 1)

```bash
# 1. Create GitHub repo (manual, on GitHub.com)
# → Go to github.com/new
# → Repo name: ipp-mvp
# → Visibility: Private (or Public)
# → Do NOT initialize with files
# → Create repository

# 2. Navigate to project
cd "/Users/abhinandan/Developers Peeve/dyslexia-app"

# 3. Verify Git status
git status
# Should show: "No commits yet on main" and many untracked files

# 4. Add remote
git remote add origin https://github.com/YOUR_ORG/ipp-mvp.git
# Verify: git remote -v

# 5. Verify .gitignore exists and is correct
cat .gitignore
# Should exclude: node_modules/, scratch_*.js, scratch_test_*/, etc.

# 6. Stage MVP files (not scratch, not audit reports)
git add -A
git reset HEAD scratch_*.js scratch_test_*/
git reset HEAD AUDIT_*.txt FINAL_REPORT.txt LEXILEARN_*.md README_AUDIT_AND_MVP.md IPP_MVP_IMPLEMENTATION_SUMMARY.md DELIVERABLES_INDEX.md

# 7. Verify staging
git status --short
# Should show: A  src/, A  main.js, A  package.json, A  ipp-mvp-demo.js, etc.

# 8. First commit
git commit -m "Initial commit: IPP MVP baseline with LexiLearn foundation

- Core MVP implementation: ipp-mvp-demo.js, main.js, package.json
- LexiLearn service layer: src/services/*
- Electron main process and renderer
- Shared profile schema and IPC channels
- All 7 IPP features working and demonstrated

Co-Authored-By: Claude Code <noreply@anthropic.com>"

# 9. Push to GitHub
git branch -M main
git push -u origin main
# Verify on GitHub: should see main branch with 1 commit

# 10. Create feature branches and push
git checkout -b feature/workspace-mode && git push -u origin feature/workspace-mode
git checkout -b feature/education-mode && git push -u origin feature/education-mode
git checkout -b feature/personalization-engine && git push -u origin feature/personalization-engine
git checkout main  # Return to main
```

### Daily Development Commands (Each Feature Owner)

```bash
# Every morning: fetch latest
git fetch origin

# At start of work session: ensure on your branch
git checkout feature/YOUR-BRANCH
git pull origin feature/YOUR-BRANCH

# Make changes
# ... edit files ...

# Stage and commit frequently (every 30-60 min)
git add src/YOUR-DIRECTORY/
git commit -m "feat(your-area): short description

- Detailed change 1
- Detailed change 2

Co-Authored-By: [Your Name] <your.email@company.com>"

# Push to GitHub
git push origin feature/YOUR-BRANCH

# Optional: Sync with main occasionally
git fetch origin
git rebase origin/main
git push origin feature/YOUR-BRANCH --force-with-lease  # Only if rebasing
```

### PR & Merge Workflow (Team Lead)

```bash
# Team Lead: After each friend finishes, review and merge
# (On GitHub, create PR: Compare feature/YOUR-BRANCH → main)

# Team Lead: Test locally before merge
git fetch origin
git checkout feature/FRIEND-BRANCH
npm install  # If dependencies changed
npm start    # If running Electron app, or use your test script

# After testing: Merge on GitHub or locally
git checkout main
git pull origin main
git merge feature/FRIEND-BRANCH
git push origin main

# Or on GitHub: Click "Merge pull request" → "Confirm merge"

# After merge: Delete branch (optional)
git push origin --delete feature/FRIEND-BRANCH
```

### Handling Conflicts (If They Occur)

```bash
# Scenario: Your branch has conflicts with main

# 1. Fetch latest
git fetch origin

# 2. Try to rebase (safer than merge)
git rebase origin/main
# If conflicts: Git will pause and show files with conflicts

# 3. Resolve conflicts in VS Code or editor
# Look for: <<<<<< ===== >>>>>>
# Keep the parts you want, delete conflict markers

# 4. Stage resolved files
git add src/path/to/resolved/file.js

# 5. Continue rebase
git rebase --continue

# 6. Push (may need --force-with-lease because you rebased)
git push origin feature/YOUR-BRANCH --force-with-lease

# If rebase is too complicated, abort and ask Team Lead
git rebase --abort
# Then Team Lead merges main into your branch:
git fetch origin && git merge origin/main
```

---

## PART E: PRE-MERGE TEST CHECKLIST

### Checklist for EACH Feature Branch Before Merging to Main

#### Friend 1: Workspace Mode
```
BEFORE MERGE:
□ All files staged in feature/workspace-mode branch
□ npm start runs without errors
□ Workspace screens render (no crashes)
□ Onboarding collects name and modality
□ Activity displays task correctly
□ Response input works on your machine (Mac/Windows)
□ No console errors in DevTools
□ No changes to LexiLearn education mode

REGRESSION TEST (with Friend 2):
□ Education mode still works
□ Original learning screens unchanged
□ Activity judging works

TEST WITH OTHER BRANCHES:
□ Run ipp-mvp-demo.js to verify no breakage
□ No conflicts with feature/personalization-engine (ask Team Lead to verify)

FINAL CHECK:
□ All commits have descriptive messages
□ All commits have Co-Authored-By line
□ No scratch files in commit
□ No node_modules/ in commit
□ Ready for PR review
```

#### Friend 2: Education Mode
```
BEFORE MERGE:
□ All files staged in feature/education-mode branch
□ npm start runs without errors
□ Learning flow still works with mode parameter
□ Education activities complete without errors
□ Activity judging works for both modes
□ No console errors in DevTools
□ Original LexiLearn behavior unchanged

REGRESSION TEST:
□ Original learning screens render
□ Original activity builders work
□ Original curriculum registry works
□ Original difficulty model works

TEST WITH OTHER BRANCHES:
□ Run ipp-mvp-demo.js to verify no breakage
□ No conflicts with feature/personalization-engine

FINAL CHECK:
□ All commits have descriptive messages
□ All commits have Co-Authored-By line
□ No scratch files in commit
□ No node_modules/ in commit
□ Ready for PR review
```

#### Friend 3: Personalization Engine
```
BEFORE MERGE:
□ All files staged in feature/personalization-engine branch
□ npm start runs without errors
□ Preference model updates correctly
□ Weights clamped [0.05, 0.95]
□ Approval dialog shows and accepts input
□ Profile inspector displays current preferences
□ Profile persists after approval
□ No console errors in DevTools

CONTINUOUS PERSONALIZATION TEST:
□ Activity 1 → outcome → profile updates
□ Activity 2 → reflects updated preferences
□ Before/after personalization observable
□ Closed-loop works end-to-end

TEST WITH OTHER BRANCHES:
□ Run ipp-mvp-demo.js to verify all 7 features still work
□ No conflicts with feature/workspace-mode
□ No conflicts with feature/education-mode

FINAL CHECK:
□ All commits have descriptive messages
□ All commits have Co-Authored-By line
□ No scratch files in commit
□ No node_modules/ in commit
□ Ready for PR review
```

#### Team Lead: Final Integration Check (Before Merging PR)

```
BEFORE APPROVING PR:
□ Read the PR description and changed files
□ Verify all files owned by feature branch author
□ Verify no changes to shared files (profile-schema, ipc-channels, main.js, profile-store)
□ Pull and test locally:
   git fetch origin
   git checkout FEATURE-BRANCH
   npm install
   npm start

□ Run ipp-mvp-demo.js to verify all features work
□ Check console for errors
□ Test on both macOS and Windows (or ask friend to test on Windows)
□ Verify no regression tests broke
□ Ask specific questions about implementation if unclear

AFTER APPROVING & MERGING:
□ Merge PR on GitHub (or merge locally and push)
□ Delete feature branch from GitHub (optional)
□ Post in team chat: "Merged feature/X to main ✅"
□ Note any remaining work or follow-ups
```

---

## SUMMARY: Next Steps

### Day 1 (Today)
1. **Team Lead:** Confirm GitHub URL with team
2. **Team Lead:** Run Step 1–3 of Part A (create repo, first commit, push)
3. **Team Lead:** Share GitHub URL with all three friends
4. **All:** Clone repo: `git clone https://github.com/YOUR_ORG/ipp-mvp.git`

### Day 2–3
5. **All:** Each checkout your feature branch: `git checkout feature/YOUR-BRANCH`
6. **Friend 1:** Start building workspace mode (Part C, Brief 1)
7. **Friend 2:** Start integrating education mode (Part C, Brief 2)
8. **Friend 3:** Start personaliz engine (Part C, Brief 3)

### Day 4–5 (End of Hackathon)
9. **All:** Finish implementations, commit, push
10. **Team Lead:** Run pre-merge checklist for each PR
11. **Team Lead:** Merge PRs one by one, verify integration
12. **All:** Test final MVP on all platforms

### Repository State After Setup
```
GitHub: https://github.com/YOUR_ORG/ipp-mvp
├── main (baseline MVP)
├── feature/workspace-mode (Friend 1)
├── feature/education-mode (Friend 2)
└── feature/personalization-engine (Friend 3)
```

---

**Preserving All Work:** ✅ All MVP code, LexiLearn foundation, audit reports preserved locally. Only committing production code to GitHub.

