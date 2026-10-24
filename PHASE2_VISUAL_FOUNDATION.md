# PHASE 2: VISUAL FOUNDATION — Implementation Plan

**Status:** 🚀 STARTING NOW  
**Date:** October 24, 2026  
**Duration:** 1-2 days  
**Objective:** Fix contrast, improve typography, standardize layout, remove data-centric clutter

---

## PHASE 2 GOALS

1. ✅ **Branding:** All LumiLearn/OnYou references removed (DONE in Phase 1)
2. **Contrast:** Audit every screen, fix WCAG AA violations
3. **Typography:** Improve readability for dyslexic learners
4. **Layout:** Reduce cognitive load, prioritize learning
5. **Consistency:** Standardize components, spacing, visual hierarchy
6. **Accessibility:** Improve keyboard navigation, focus indicators

---

## CONTRAST AUDIT & FIXES

### Current Color System

**Design Tokens (tokens.css):**
```
--color-text-primary: #2D3748 (dark gray)
--color-text-secondary: #4A5568 (medium gray)
--color-bg-primary: #FDFBF7 (warm parchment)
--color-bg-surface: #FFFFFF (white)
--color-bg-card: #F7F3EB (off-white)
--color-border: #E2D9CC (muted tan)
```

### Contrast Analysis

**Primary Text on Primary Background:**
- Text: #2D3748, Background: #FDFBF7
- Ratio: ~10:1 ✅ EXCELLENT

**Secondary Text on Surfaces:**
- Text: #4A5568, Background: #FFFFFF
- Ratio: ~7.5:1 ✅ GOOD
- Ratio: ~6.2:1 ✅ GOOD (on #F7F3EB)

**Borders and Muted Elements:**
- Border: #E2D9CC on #FDFBF7
- Ratio: ~2.8:1 ⚠️ POOR (needs 3:1 for graphics)
- Badge text: #4A5568 on #F7F3EB
- Ratio: ~6.2:1 ✅ GOOD

### Issues to Fix

1. **Border contrast too low** (2.8:1 < 3:1)
   - Solution: Use #D4C4B0 instead (darker tan)
   
2. **Disabled button states** (likely too light)
   - Solution: Add explicit disabled styling with sufficient contrast

3. **Focus indicators** (may be too subtle)
   - Solution: Ensure 4px blue ring (#2563EB) with offset

4. **Form placeholders** (browser defaults often gray)
   - Solution: Apply color token to placeholders

### Implementation

**Update tokens.css:**
```css
--color-border: #D4C4B0;  /* Improved from #E2D9CC */
--color-border-subtle: #E8DFD0;  /* For very subtle dividers */
--focus-ring-color: #2563EB;
--focus-ring-width: 4px;
--focus-ring-offset: 2px;
```

**Test Plan:**
- [ ] Measure contrast on every screen with WebAIM Contrast Checker
- [ ] Test dark mode variant colors
- [ ] Verify focus indicators visible on keyboard navigation
- [ ] Test with Windows High Contrast mode

---

## TYPOGRAPHY IMPROVEMENTS

### Current State

**Base Settings (tokens.css):**
- Font size: 22px (good baseline)
- Line height: 1.9 (generous)
- Letter spacing: 0.12em (wide)
- Font family: Lexend (dyslexia-friendly)

**Issues Identified:**
1. Inconsistent heading sizes across screens
2. Some text still using fallback sans-serif
3. Line length sometimes exceeds readable maximum
4. No scalable font sizing (fixed pixels)

### Improvements to Implement

1. **Establish Semantic Typography Scale:**

```css
/* Headings */
.heading-1 {
  font-size: 40px;
  line-height: 1.2;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.heading-2 {
  font-size: 32px;
  line-height: 1.3;
  font-weight: 700;
}

.heading-3 {
  font-size: 28px;
  line-height: 1.4;
  font-weight: 600;
}

/* Body text */
.body-large {
  font-size: 22px;
  line-height: 1.9;
  letter-spacing: 0.12em;
}

.body-normal {
  font-size: 18px;
  line-height: 1.9;
  letter-spacing: 0.08em;
}

.body-small {
  font-size: 16px;
  line-height: 1.7;
  letter-spacing: 0.04em;
}

/* Captions */
.caption {
  font-size: 14px;
  line-height: 1.6;
  color: var(--color-text-secondary);
}
```

2. **Apply to Screens:**
   - Welcome screen: heading-1 (title), body-large (subtitle)
   - Quest intro: heading-2 (welcome), body-large (instructions)
   - Task screen: heading-2 (task prompt), body-normal (options)
   - Learning activity: heading-2 (question), body-large (answer buttons)
   - Parent screens: heading-2 or heading-3 consistently

3. **Constrain Line Length:**
   - Max-width: 720px for body text (60-70 characters)
   - Currently some screens exceed this

---

## LAYOUT STANDARDIZATION

### Problem: Data-Centric, Cluttered Screens

**Current Issues:**
- Quest intro: Companion + large text + instructions all fighting for attention
- Learning activity: Question + feedback + help options + progress all visible
- My Day: Competing sections (materials, schoolwork, progress stats)
- Parent overview: Many cards, unclear visual hierarchy

### Solution: Question-Centric, Progressive Disclosure

**Principle:** Show only what's needed at each step. Hide secondary content.

**Revised Learning Activity Screen:**

```
┌──────────────────────────────────────────┐
│          [Companion widget, top]         │
├──────────────────────────────────────────┤
│                                          │
│        "What is a synonym for 'big'?"   │  ← Focus: Large, centered
│                                          │
├──────────────────────────────────────────┤
│                                          │
│    ┌─ A) Enormous              ┐        │
│    │                           │        │
│    ├─ B) Tiny                  ┤        │  ← Answer buttons, large hit targets
│    │                           │        │
│    ├─ C) Small                 ┤        │
│    │                           │        │
│    └─ D) Tall                  ┘        │
│                                          │
├──────────────────────────────────────────┤
│   [Help?]  [Skip]  [Progress: 4/8] →   │  ← Secondary actions, small
└──────────────────────────────────────────┘
```

**Before (Current - Cluttered):**
- Question text
- Answer buttons with detailed descriptions
- Progress circle (size indicator)
- Companion taking space
- Help tier buttons (3 options)
- Visual explanation panel
- Feedback message

**After (Improved - Clean):**
- Large, centered question
- Spacious answer buttons (64px min touch target)
- Companion off to side (or above)
- Help/Skip actions small, bottom
- Progress subtle (progress bar or chip)
- Feedback appears after answer briefly
- Visual explanations on-demand only

### Implementation Steps

1. **Refactor learning-activity-screen.js:**
   - [ ] Reduce visible elements on initial render
   - [ ] Move help tier to expandable panel
   - [ ] Hide visual explanation until requested
   - [ ] Increase button sizes (64px minimum)
   - [ ] Center question prominently

2. **Refactor my-day-screen.js:**
   - [ ] Separate schoolwork from self-practice
   - [ ] Show "What's next?" prominently
   - [ ] Hide statistics by default (collapse section)
   - [ ] Improve card visual hierarchy

3. **Refactor profile-overview-screen.js:**
   - [ ] Group controls into sections (Profile, Materials, Settings, Progress)
   - [ ] Collapse sections initially (expandable)
   - [ ] Highlight primary actions (Start Learning, Upload Material)

---

## COMPONENT STANDARDIZATION

### Button Styles

**Primary Button (Learning CTA):**
```css
.btn-primary {
  min-height: 64px;
  padding: 16px 24px;
  font-size: 20px;
  font-weight: 600;
  border-radius: 12px;
  background-color: #3B82F6;
  color: white;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-primary:hover {
  background-color: #2563EB;
}

.btn-primary:focus {
  outline: 4px solid #2563EB;
  outline-offset: 2px;
}

.btn-primary:disabled {
  background-color: #D1D5DB;
  color: #6B7280;
  cursor: not-allowed;
}
```

**Secondary Button (Cancel, Skip):**
```css
.btn-secondary {
  min-height: 48px;
  padding: 12px 20px;
  font-size: 18px;
  background-color: transparent;
  color: #3B82F6;
  border: 2px solid #3B82F6;
  border-radius: 12px;
  cursor: pointer;
}
```

**Apply to all screens:**
- [ ] Quest intro: "Let's Start!" → primary
- [ ] Task screen: "Next" → primary, "Previous" → secondary
- [ ] Learning activity: "Submit" → primary, "Skip" → secondary
- [ ] Forms: "Save Profile" → primary, "Cancel" → secondary

### Card Styles

**Standard Card:**
```css
.card {
  background-color: var(--color-bg-surface);
  border: 2px solid var(--color-border);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
}

.card:focus-within {
  border-color: #3B82F6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}
```

**Apply consistently:**
- [ ] Profile cards
- [ ] Material cards
- [ ] Schoolwork cards
- [ ] Statistics cards

### Spacing

**Establish scale:**
```css
--space-xs: 8px;
--space-sm: 16px;
--space-md: 24px;
--space-lg: 36px;
--space-xl: 48px;
--space-2xl: 64px;
```

**Apply to all screens:**
- Margin-bottom between sections: `--space-lg` (36px)
- Padding within cards: `--space-lg` (36px)
- Gap between buttons: `--space-md` (24px)
- Margin between form fields: `--space-md` (24px)

---

## ACCESSIBILITY IMPROVEMENTS

### Keyboard Navigation

**Current State:** Basic support, needs testing

**Required:**
- [ ] Tab order is logical (top-to-bottom, left-to-right)
- [ ] All interactive elements keyboard accessible
- [ ] Focus indicator visible (4px ring)
- [ ] Skip links work (not critical for learning app)
- [ ] Dialogs trap focus

**Test:**
```
1. Launch app
2. Press Tab repeatedly
3. Verify focus ring visible on every element
4. Verify order makes sense
5. Verify Enter/Space activate buttons
6. Verify Escape closes modals
```

### Screen Reader Support

**Required ARIA Labels:**
- [ ] Companion widget: `role="status"` for announcements
- [ ] Learning activity: `role="region"` for question area
- [ ] Progress indicator: `aria-label="Progress: 4 of 8 activities"`
- [ ] Form fields: `<label for="...">` linked
- [ ] Buttons: Clear text or `aria-label`

**Example:**
```html
<div role="status" aria-live="polite" aria-label="Companion message">
  Great work! You got that one right! 🎉
</div>
```

### Reduced Motion

**Current:** CSS media query exists

**Verify:**
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Test:**
1. macOS: System Preferences > Accessibility > Display > Reduce motion
2. Verify animations don't play
3. Verify interactions still responsive

### Color Contrast Validation

**Add to CI/Build:**
```bash
npx pa11y-ci --url http://localhost:3000
# or
npm install --save-dev axe-core pa11y
```

---

## SCREEN-BY-SCREEN IMPROVEMENTS

### Welcome Screen
**Current Issues:** Dense form, unclear disclaimer
**Fixes:**
- [ ] Increase form field sizes (48px height min)
- [ ] Add helper text below PIN field ("e.g., 1234")
- [ ] Break disclaimer into bullet points
- [ ] Improve spacing between form sections

### Quest Intro Screen
**Current Issues:** Companion competes with text
**Fixes:**
- [ ] Reduce companion size to 60px (docked variant)
- [ ] Move to top-right corner instead of center
- [ ] Increase instruction text size to 20px
- [ ] Add visual separator between intro and companion

### Task Screen
**Current Issues:** Option order not clear, feedback timing
**Fixes:**
- [ ] Emphasize "tap your answer" instruction
- [ ] Increase button size to 64px
- [ ] Add visual feedback (highlight) on selection
- [ ] Delay showing "next" button by 300ms

### Learning Activity Screen
**Current Issues:** Too much information, help system incomplete
**Fixes:**
- [ ] Hide visual explanation by default (collapsible)
- [ ] Hide help tier options initially ("Need help?" button)
- [ ] Increase question size to 32px
- [ ] Reduce answer button descriptions (or move to "hint" action)
- [ ] Move progress to subtle footer

### My Day Screen
**Current Issues:** Data overload, unclear priorities
**Fixes:**
- [ ] Lead with "What's next?" message
- [ ] Separate "Assigned Work" from "Practice"
- [ ] Collapse statistics section by default
- [ ] Add "Start Learning" CTA
- [ ] Improve card visual hierarchy

### Parent Profile Overview
**Current Issues:** Many competing controls
**Fixes:**
- [ ] Group into tabbed sections (Profile, Curriculum, Materials, Settings, Progress)
- [ ] Or: Use expandable sections
- [ ] Highlight "Upload IEP" and "Start Learning" CTAs
- [ ] Hide advanced settings by default

---

## IMPLEMENTATION SEQUENCE

### Day 1: Contrast & Typography
- [ ] Update tokens.css with improved colors
- [ ] Measure contrast on all screens
- [ ] Create typography scale (h1-h3, body, caption)
- [ ] Apply to 5 highest-traffic screens (welcome, quest-intro, task, learning-activity, my-day)
- [ ] Test with contrast checker

### Day 2: Layout & Components
- [ ] Refactor learning-activity-screen layout
- [ ] Standardize button styles across all screens
- [ ] Standardize card styles
- [ ] Apply spacing scale consistently
- [ ] Improve keyboard navigation

### Day 3: Accessibility & Polish
- [ ] Add ARIA labels to key regions
- [ ] Test keyboard navigation on all screens
- [ ] Verify reduced-motion support
- [ ] Add accessibility testing to build process
- [ ] Final visual review

---

## TESTING CHECKLIST

### Visual Testing
- [ ] All text readable (no low-contrast text)
- [ ] Button sizes adequate (min 48px height)
- [ ] Spacing consistent throughout
- [ ] Heading hierarchy clear
- [ ] Focus indicators visible
- [ ] Responsive on 800x600 (minimum)
- [ ] Dark mode colors verified

### Accessibility Testing
- [ ] Keyboard-only navigation works
- [ ] Tab order logical
- [ ] Focus indicator visible
- [ ] Screen reader announces key elements
- [ ] Reduced motion respected
- [ ] High contrast mode legible
- [ ] WCAG AA contrast ratio met on all text

### Usability Testing
- [ ] Can complete onboarding flow
- [ ] Can start and answer screening tasks
- [ ] Can start learning mission
- [ ] Can see progress clearly
- [ ] Help/Skip actions work
- [ ] Parent can upload materials
- [ ] No unexpected errors

---

## SUCCESS CRITERIA

Phase 2 is complete when:

1. ✅ **Branding:** All "LumiLearn" and "On You" references gone
2. ✅ **Contrast:** All text meets WCAG AA (4.5:1 for normal, 3:1 for large)
3. ✅ **Typography:** Consistent heading and body styles applied
4. ✅ **Layout:** Learning screens prioritize questions, secondary content hidden
5. ✅ **Components:** Buttons, cards, forms standardized
6. ✅ **Spacing:** Consistent use of spacing scale
7. ✅ **Accessibility:** Keyboard navigation works, focus indicators visible
8. ✅ **Polish:** App feels cohesive and learner-friendly

---

## RISKS & MITIGATIONS

| Risk | Mitigation |
|------|-----------|
| Too many CSS changes break screens | Test each screen after changes, commit incrementally |
| Contrast changes affect dark mode | Test both light and dark variants |
| Spacing changes affect mobile | Test at 800x600 minimum |
| Accessibility features incomplete | Use pa11y to validate, manual keyboard test |

---

## DELIVERABLES

By end of Phase 2:

1. ✅ Updated tokens.css (improved colors, spacing scale)
2. ✅ Updated screen stylesheets (applied typography scale, improved spacing)
3. ✅ Refactored learner screens (less cluttered, question-focused)
4. ✅ Standardized components (buttons, cards, forms)
5. ✅ Accessibility improvements (keyboard navigation, focus indicators, ARIA labels)
6. ✅ Contrast validated on all screens
7. ✅ Testing checklist completed
8. ✅ Final visual review passed

---

**Phase 2 Status:** 🚀 READY TO START  
**Estimated Duration:** 1-2 days  
**Next Phase:** Phase 3 - Core Learning Experience (Themes, Companion, Education Mode Integration)
