# Team Collaboration: Quick Start Guide

**Date:** October 24, 2026  
**Team:** 4 people (You + 3 Friends)  
**Platform:** macOS (2) + Windows (1)  
**Timeline:** Hackathon sprint (starting now)

---

## 📋 READ FIRST (In This Order)

1. **TEAM_COLLABORATION_PLAN.md** (10 min read)
   - Complete GitHub setup instructions
   - File ownership map for all 4 people
   - Git commands for Day 1, Day 2–3, Day 4–5
   - Pre-merge test checklist

2. **Your Role-Specific Brief** (5 min read)
   - FRIEND1_WORKSPACE_MODE_BRIEF.md
   - FRIEND2_EDUCATION_MODE_BRIEF.md
   - FRIEND3_PERSONALIZATION_ENGINE_BRIEF.md

---

## 🎯 What You're Building

### The IPP MVP (All 7 Features Working)
```
✅ 1. Mode-aware profile creation
✅ 2. Workspace mode with dynamic input
✅ 3. Education mode using objectives
✅ 4. Continuous personalization
✅ 5. Shared local profile
✅ 6. Explicit approval workflow
✅ 7. Before/after personalization difference
```

### Your Team's Division of Work
```
YOU (Team Lead)
  • Own main branch and final integration
  • Manage profile API contract (shared across all branches)
  • Review and merge all 3 feature branches
  • Run integration tests

Friend 1 (feature/workspace-mode)
  • Build workspace UI and task display
  • Implement onboarding, activity screens, dashboard
  • Define workspace task types

Friend 2 (feature/education-mode)
  • Add mode parameter to learning flow
  • Ensure education mode still works (regression test)
  • Reuse all existing LexiLearn functionality

Friend 3 (feature/personalization-engine)
  • Extend preference model for all modalities
  • Build approval workflow (show proposal → user approves → update profile)
  • Create profile inspector UI
```

---

## 🚀 Day 1: Setup (Today)

### Step 1: Create GitHub Repository (You Only)
```bash
# On GitHub.com:
# 1. Go to github.com/new
# 2. Repo name: ipp-mvp
# 3. Do NOT initialize with files
# 4. Create repository
# 5. Copy the GitHub URL (e.g., https://github.com/YOUR_ORG/ipp-mvp.git)
```

### Step 2: Push Initial Commit (You Only)
```bash
cd "/Users/abhinandan/Developers Peeve/dyslexia-app"

# Verify .gitignore exists
cat .gitignore

# Stage MVP files (not scratch, not audit reports)
git add -A
git reset HEAD scratch_*.js scratch_test_*/
git reset HEAD AUDIT_*.txt FINAL_REPORT.txt LEXILEARN_*.md README_AUDIT_AND_MVP.md IPP_MVP_IMPLEMENTATION_SUMMARY.md DELIVERABLES_INDEX.md

# Verify
git status --short

# First commit
git commit -m "Initial commit: IPP MVP baseline with LexiLearn foundation

- Core MVP implementation: ipp-mvp-demo.js, main.js, package.json
- LexiLearn service layer: src/services/*
- Electron main process and renderer
- Shared profile schema and IPC channels
- All 7 IPP features working and demonstrated

Co-Authored-By: Claude Code <noreply@anthropic.com>"

# Add remote and push
git remote add origin https://github.com/YOUR_ORG/ipp-mvp.git
git branch -M main
git push -u origin main

# Verify on GitHub: should see main branch with 1 commit
```

### Step 3: Create Feature Branches (You Only, Then Share URL)
```bash
# Create and push all feature branches
git checkout -b feature/workspace-mode && git push -u origin feature/workspace-mode
git checkout -b feature/education-mode && git push -u origin feature/education-mode
git checkout -b feature/personalization-engine && git push -u origin feature/personalization-engine

# Return to main
git checkout main

# Share GitHub URL with your 3 friends
# They will each clone and checkout their branch
```

### Step 4: Friends Clone Repo (All Three Friends)
```bash
# Each friend runs:
git clone https://github.com/YOUR_ORG/ipp-mvp.git
cd ipp-mvp

# Each friend checks out their branch:
# Friend 1:
git checkout feature/workspace-mode

# Friend 2:
git checkout feature/education-mode

# Friend 3:
git checkout feature/personalization-engine
```

---

## 🔨 Days 2–3: Development (Each Friend)

### Friend 1: Workspace Mode
```bash
git checkout feature/workspace-mode
git pull origin feature/workspace-mode

# Create directories
mkdir -p src/renderer/screens/workspace
mkdir -p src/renderer/components/workspace
mkdir -p src/services/workspace

# Follow FRIEND1_WORKSPACE_MODE_BRIEF.md
# Create: workspace-registry.js, screens, components
# Test: npm start, onboarding flow, activity display

# Commit and push frequently
git add src/renderer/screens/workspace/ src/services/workspace/
git commit -m "feat(workspace): [your message]"
git push origin feature/workspace-mode
```

### Friend 2: Education Mode
```bash
git checkout feature/education-mode
git pull origin feature/education-mode

# Follow FRIEND2_EDUCATION_MODE_BRIEF.md
# Modify: learning-flow.js (add mode parameter)
# Verify: activity contract, education regression tests

# Commit when done
git add src/services/learning/
git commit -m "feat(education): add mode parameter to learning flow"
git push origin feature/education-mode
```

### Friend 3: Personalization Engine
```bash
git checkout feature/personalization-engine
git pull origin feature/personalization-engine

# Create directories
mkdir -p src/services/approval
mkdir -p src/renderer/screens/shared
mkdir -p src/renderer/components/approval

# Follow FRIEND3_PERSONALIZATION_ENGINE_BRIEF.md
# Extend: preference-model.js
# Create: approval-workflow.js, dialogs, profile inspector

# Commit frequently
git add src/services/approval/ src/renderer/screens/shared/
git commit -m "feat(personalization): [your message]"
git push origin feature/personalization-engine
```

---

## 🧪 Days 4–5: Testing & Merging (You)

### For Each Feature Branch:

```bash
# 1. Fetch latest
git fetch origin

# 2. Test locally
git checkout feature/BRANCH-NAME
git pull origin feature/BRANCH-NAME
npm install  # if needed
npm start    # if applicable

# 3. Run regression test
node ipp-mvp-demo.js
# Should see: All 7 features verified ✅

# 4. Review code
# Read all commits and changes
# Ask specific questions if unclear

# 5. Merge to main
git checkout main
git pull origin main
git merge feature/BRANCH-NAME
git push origin main

# 6. Post in team chat: "Merged feature/X ✅"
```

---

## 📁 Repository Structure (After Setup)

```
GitHub: https://github.com/YOUR_ORG/ipp-mvp

Branches:
├── main                              (baseline MVP)
├── feature/workspace-mode            (Friend 1)
├── feature/education-mode            (Friend 2)
└── feature/personalization-engine    (Friend 3)

Files:
├── TEAM_COLLABORATION_PLAN.md        ← Read this first
├── FRIEND1_WORKSPACE_MODE_BRIEF.md   ← Friend 1 reads this
├── FRIEND2_EDUCATION_MODE_BRIEF.md   ← Friend 2 reads this
├── FRIEND3_PERSONALIZATION_ENGINE_BRIEF.md ← Friend 3 reads this
├── main.js
├── package.json
├── src/
│   ├── services/
│   │   ├── adaptive/                 (Personalization)
│   │   ├── learning/                 (Education flow)
│   │   ├── approval/                 (NEW — Friend 3)
│   │   ├── workspace/                (NEW — Friend 1)
│   │   └── ...
│   └── renderer/
│       ├── screens/
│       │   ├── learner/              (Education)
│       │   ├── workspace/            (NEW — Friend 1)
│       │   ├── shared/               (NEW — Friend 3)
│       │   └── ...
│       └── components/
│           ├── approval/             (NEW — Friend 3)
│           ├── workspace/            (NEW — Friend 1)
│           └── ...
└── ipp-mvp-demo.js                  (Regression test)
```

---

## ✅ Success Checklist

### By End of Day 1
- [ ] GitHub repo created and shared
- [ ] Main branch pushed with baseline MVP
- [ ] All 3 feature branches created
- [ ] All 3 friends have cloned repo and checked out their branch
- [ ] Friends have read their role-specific briefs

### By End of Days 2–3
- [ ] Friend 1: Workspace screens created and tested
- [ ] Friend 2: Mode parameter added to learning flow
- [ ] Friend 3: Approval workflow and profile inspector built

### By End of Days 4–5
- [ ] All 3 PRs reviewed and merged
- [ ] All regression tests pass (ipp-mvp-demo.js)
- [ ] No regressions in education mode
- [ ] Continuous personalization works end-to-end
- [ ] Works on both macOS and Windows

---

## 🆘 Common Issues & Solutions

### "I got a merge conflict"
```bash
# Don't panic! Merge conflicts are normal.
# You modified main.js, Friend 3 also modified main.js

# Option 1: Rebase (safer for feature branches)
git fetch origin
git rebase origin/main
# Git will pause and show conflicts
# Resolve in VS Code or editor
git add resolved-file.js
git rebase --continue
git push origin feature/YOUR-BRANCH --force-with-lease

# Option 2: Ask Team Lead (you) to resolve
# You can merge branches in any order you want
# Merge simpler branches first (Friend 2), complex last (Friend 3)
```

### "npm start doesn't work"
```bash
# Check if node_modules is corrupted
rm -rf node_modules package-lock.json
npm install
npm start

# If still broken: ask Team Lead
```

### "I accidentally committed to wrong branch"
```bash
# No problem! You can move commits between branches.
# Ask Team Lead for help, or:

git log --oneline  # See your commits
git reset --soft HEAD~1  # Undo last commit (keeps changes)
git stash  # Save changes
git checkout feature/CORRECT-BRANCH
git stash pop  # Apply changes
git add .
git commit -m "..."
git push origin feature/CORRECT-BRANCH
```

### "I want to see what changed in my branch"
```bash
git fetch origin
git diff origin/main...feature/YOUR-BRANCH
# Shows all changes in your branch vs main
```

---

## 🎯 Keep It Simple

**Don't:**
- ❌ Push to main directly (only Team Lead does this)
- ❌ Rewrite existing working code (reuse it!)
- ❌ Add cloud dependencies (local-only!)
- ❌ Modify files you don't own (see TEAM_COLLABORATION_PLAN.md for ownership)
- ❌ Merge without testing (run regression tests first!)

**Do:**
- ✅ Commit frequently (every 30-60 min)
- ✅ Write descriptive commit messages
- ✅ Test before pushing
- ✅ Ask for help early if stuck
- ✅ Keep branches small and focused

---

## 📞 Communication Plan

### Daily Standup (Optional but Recommended)
```
Time: 10 min at start of day
Topics:
- What you did yesterday
- What you're doing today
- Any blockers?
```

### If Stuck
- Post in team chat with: `[BLOCKER] What's wrong`, error message, and what you tried
- Don't wait more than 30 min to ask for help

### Before Merging
- Post: `[REVIEW] Ready for merge: feature/X`
- Team Lead will review within 1 hour

---

## 🎁 What You're Delivered to Yourselves

**You now have:**
1. ✅ Complete GitHub collaboration plan
2. ✅ File ownership map (no merge conflicts by design)
3. ✅ Three role-specific implementation briefs (5 min each to read)
4. ✅ Exact Git commands (copy-paste ready)
5. ✅ Pre-merge test checklist (follow before merging)
6. ✅ Regression test (ipp-mvp-demo.js)
7. ✅ All existing MVP code preserved and ready to extend

**All 7 IPP features already working** in baseline. You're just dividing the integration work across 4 people.

---

## 🚀 READY TO START?

### Team Lead (You):
1. Create GitHub repo (manual step)
2. Run Day 1 setup commands (above)
3. Share GitHub URL with 3 friends

### All Three Friends:
1. Clone repo
2. Checkout your branch
3. Read your role-specific brief
4. Start building!

---

**Questions?** Refer to:
- `TEAM_COLLABORATION_PLAN.md` (complete reference)
- `FRIEND1_WORKSPACE_MODE_BRIEF.md` (Friend 1)
- `FRIEND2_EDUCATION_MODE_BRIEF.md` (Friend 2)
- `FRIEND3_PERSONALIZATION_ENGINE_BRIEF.md` (Friend 3)

**Good luck! 🎉**

