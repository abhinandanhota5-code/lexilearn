# Friend 2: Education Mode Integration Brief

**Role:** Education Mode Integration & LexiLearn Connection  
**Branch:** `feature/education-mode`  
**Team Lead:** Will handle main/integration  
**Timeline:** Hackathon sprint  

---

## Your Mission (In 3 Sentences)

Connect the existing LexiLearn learning engine to the IPP profile system. Your job is NOT to rewrite anything—just add a `mode` parameter and ensure education mode still works perfectly. Reuse all existing activity builders, validators, and screens.

---

## What You're Doing

### Add Mode Parameter to Learning Flow (That's It!)
1. Update `src/services/learning/learning-flow.js`:
   - Accept `mode` parameter in `getMission(learnerId, mode)`
   - Route to education objectives when `mode === 'education'`
   - Keep ALL existing logic unchanged
2. Ensure activity judging works for both modes (should already work)
3. Test that education mode still works end-to-end

### What You're NOT Doing
❌ Rewriting activity builders  
❌ Changing curriculum registry  
❌ Modifying activity contract  
❌ Touching any existing education screens (they work as-is)

---

## What You Can Reuse (Everything!)

✅ **All existing education screens** — `src/renderer/screens/learner/`  
✅ **All existing activity builders** — `src/services/learning/activity-registry.js`  
✅ **All existing curriculum registry** — `src/services/curriculum/curriculum-registry.js`  
✅ **All existing difficulty model** — `src/services/curriculum/grade-difficulty.js`  
✅ **All existing activity judging** — `src/services/learning/activity-contract.js`  

**Copy nothing. Modify minimally. Everything already works.**

---

## File Structure (Minimal Changes)

```
src/services/learning/
├── learning-flow.js               (MODIFY — add mode parameter)
└── activity-contract.js           (NO CHANGE — or verify mode-awareness)

src/renderer/screens/learner/
└── learning-activity-screen.js    (OPTIONAL — show mode in UI header)

ALL OTHER FILES: NO CHANGES
```

---

## Quick Implementation Guide

### Step 1: Update `learning-flow.js`

```javascript
// src/services/learning/learning-flow.js

// ADD mode parameter to existing getMission function:
export async function getMission(learnerId, mode = 'education') {
  // mode: 'education' | 'workspace'
  
  // If education mode: use existing education objectives
  if (mode === 'education') {
    const profile = await getProfile(learnerId);
    const educationObjectives = curriculumRegistry.getEducationObjectives();
    // ... rest of existing logic unchanged
  }
  
  // If workspace mode: let Friend 1's workspace service handle it
  if (mode === 'workspace') {
    // Team Lead defines how workspace activities flow here
    // For now: return a workspace task
  }
  
  // Rest of function: UNCHANGED
}
```

### Step 2: Verify Activity Contract

Open `src/services/learning/activity-contract.js`:
- Check if `judgeActivity()` already works for any mode ✅ (it should)
- If not, make judging logic mode-agnostic
- NO rewrite needed, just verify

### Step 3: Test Integration

```bash
# Run existing learning flow without mode parameter
# Should default to 'education'
const mission = await getMission(learnerId);
// ✅ Should work as before

# Run with explicit mode
const mission = await getMission(learnerId, 'education');
// ✅ Should work as before
```

---

## Testing Checklist (Before Merge)

Run these checks:
```bash
npm start  # Electron app should launch without errors

# Manual regression tests:
□ Education mode activities still load
□ Can select curriculum and start mission
□ Activity judging works
□ No console errors in DevTools
□ Original learning screens render correctly
□ Difficulty model still applies
□ Profile updates flow correctly

# Integration test:
□ Run: node ipp-mvp-demo.js (should still work)
□ Test with Friend 1: Do workspace screens load? (they should)
□ Test with Friend 3: Do profile updates work? (they should)
```

---

## Git Workflow

```bash
# Start work
git checkout feature/education-mode
git pull origin feature/education-mode

# Make minimal changes
# ... edit learning-flow.js, verify activity-contract.js ...

# Commit when done (should be small!)
git add src/services/learning/
git commit -m "feat(education): add mode parameter to learning flow

- Add mode parameter to getMission function
- Route to education objectives when mode='education'
- Verify activity contract works for both modes
- All existing education functionality preserved

Co-Authored-By: [Your Name] <your.email>"

git push origin feature/education-mode

# When done: Tell Team Lead you're ready for PR review
```

---

## Why This Is Simple

The IPP MVP already has:
- ✅ Mode-aware profile schema (Team Lead owns)
- ✅ Working activity judging logic (already mode-agnostic)
- ✅ Working education learning flow (don't touch it)
- ✅ Working curriculum registry (don't touch it)

**Your job:** Just pass the `mode` parameter through, verify nothing broke.

---

## Common Questions

**Q: What if I break something?**  
A: You can't! You're only adding one parameter. If tests fail, you can revert easily:
```bash
git reset --hard origin/main
git rebase origin/main
```

**Q: Should I add more education objectives?**  
A: No. Reuse existing objectives. If time allows, test with different grades, but don't add new features.

**Q: What's the difference between 'education' and 'workspace' mode?**  
A: Education mode uses existing learning objectives (phoneme awareness, letter sounds, etc.). Workspace mode uses Friend 1's task types (summarize, explain, etc.). You just ensure education mode still works.

**Q: Do I need to touch the UI?**  
A: No. Optional: show "Mode: Education" in the activity screen header, but not required.

---

## Success Criteria

By end of hackathon:
- ✅ Education mode activities still load
- ✅ Mode parameter passes through learning flow
- ✅ Activity judging works
- ✅ Profile updates on activity outcome
- ✅ No regression tests failed
- ✅ Works on both macOS and Windows

---

## The Bottom Line

**You're adding one parameter. Don't rewrite anything. Trust the existing code.**

If something doesn't work, it's probably not your changes—it's likely integration between Friend 1 and Friend 3. Team Lead will help debug.

---

**Team Lead will help** if integration issues arise.  
**Friend 1 owns** workspace mode UI.  
**Friend 3 owns** profile updates.  
**You own** ensuring education mode still works perfectly.

**Ready to start?** Checkout your branch and update learning-flow.js.

