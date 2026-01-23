---
name: ui-ux-design-audit
description: Professional UI/UX design audit skill for comprehensive design quality assessment. Use when auditing design components, checking design consistency, validating light/dark mode implementations, reviewing user flows, or conducting design system reviews. Triggers include: (1) Design component audits, (2) Design consistency checks, (3) Theme/mode validation, (4) User flow analysis, (5) Design system compliance, (6) Visual hierarchy review, (7) Interaction pattern assessment.
---

# UI/UX Design Audit Skill

Comprehensive design quality assessment for web applications covering components, consistency, theming, and user flows.

## Audit Workflow

Execute audits in this order:

1. **Design System Audit** → Components and tokens
2. **Consistency Audit** → Visual uniformity
3. **Theme Audit** → Light/dark mode
4. **Flow Audit** → Page-by-page UX

---

## Phase 1: Design System Audit

### Component Inventory

Catalog all UI components:

```
├── Navigation
│   ├── Header/Navbar
│   ├── Bottom Menu/Tab Bar
│   ├── Sidebar
│   └── Breadcrumbs
├── Content
│   ├── Cards
│   ├── Lists
│   ├── Tables
│   ├── Modals/Dialogs
│   └── Empty States
├── Forms
│   ├── Input fields
│   ├── Buttons
│   ├── Selects/Dropdowns
│   ├── Checkboxes/Radios
│   └── Date pickers
├── Feedback
│   ├── Loaders/Spinners
│   ├── Toast/Notifications
│   ├── Progress indicators
│   └── Error states
└── Data Display
    ├── Charts/Graphs
    ├── Badges/Tags
    ├── Avatars
    └── Icons
```

### Design Token Checklist

| Token Type | Check Items |
|------------|-------------|
| **Colors** | Primary, secondary, success, warning, error, neutral scale |
| **Typography** | Font family, sizes (xs→2xl), weights, line heights |
| **Spacing** | Consistent scale (4px, 8px, 12px, 16px, 24px, 32px, 48px) |
| **Borders** | Radius scale, border widths, border colors |
| **Shadows** | Elevation levels (sm, md, lg, xl) |
| **Transitions** | Duration standards, easing functions |

### Component State Matrix

For each component, verify states exist:

| State | Visual Treatment |
|-------|------------------|
| **Default** | Base appearance |
| **Hover** | Subtle highlight (desktop) |
| **Active/Pressed** | Stronger feedback |
| **Focus** | Visible ring/outline |
| **Disabled** | Reduced opacity (0.5-0.6) |
| **Loading** | Spinner or skeleton |
| **Error** | Error color + message |
| **Success** | Success color + feedback |

---

## Phase 2: Design Consistency Audit

### Visual Consistency Checklist

```markdown
## Typography
- [ ] Heading sizes consistent across pages
- [ ] Body text uses same font/size
- [ ] Line heights uniform for same text types
- [ ] Font weights follow hierarchy (bold for emphasis)

## Colors
- [ ] Primary color used consistently for CTAs
- [ ] Error states all use same red
- [ ] Success states all use same green
- [ ] Text colors match (primary, secondary, muted)

## Spacing
- [ ] Card padding consistent (e.g., always 16px or 24px)
- [ ] Section margins uniform
- [ ] Gap between elements follows scale
- [ ] Page margins consistent

## Borders & Shadows
- [ ] Border radius matches (e.g., all cards use 12px)
- [ ] Shadow intensity consistent for same elevation
- [ ] Border colors uniform

## Icons
- [ ] Same icon set throughout (Lucide, Heroicons, etc.)
- [ ] Consistent sizing (16px, 20px, 24px)
- [ ] Stroke width uniform
```

### Pattern Consistency Matrix

| Pattern | Check |
|---------|-------|
| **Page Headers** | Same structure, spacing, back button position |
| **Card Layouts** | Consistent internal padding, title placement |
| **List Items** | Same height, icon alignment, text truncation |
| **Form Layouts** | Label position, input heights, button placement |
| **Modal Structure** | Header, body, footer consistency |
| **Empty States** | Icon + message + action pattern |

### Interaction Consistency

```
Verify same interactions behave identically:
├── Tap/click feedback timing
├── Transition durations (recommend 200-300ms)
├── Animation easing (recommend ease-out)
├── Scroll behaviors
├── Gesture responses
└── Loading patterns
```

---

## Phase 3: Theme Audit (Light/Dark Mode)

### Color Mapping Table

| Semantic Name | Light Mode | Dark Mode | Ratio Check |
|---------------|------------|-----------|-------------|
| Background | #FFFFFF | #0A0A0F | — |
| Surface | #F5F5F5 | #1A1A2E | — |
| Surface Highlight | #EBEBEB | #2A2A40 | — |
| Text Primary | #1A1A1A | #FFFFFF | ≥7:1 |
| Text Secondary | #666666 | #A0A0A0 | ≥4.5:1 |
| Border | #E0E0E0 | #2A2A2E | — |
| Primary | #007AFF | #007AFF | Check both |
| Error | #FF3B30 | #FF453A | Check both |
| Success | #34C759 | #30D158 | Check both |

### Theme Validation Checklist

```markdown
## Contrast (WCAG AA Minimum)
- [ ] Normal text: 4.5:1 contrast ratio
- [ ] Large text (18px+): 3:1 contrast ratio
- [ ] UI components: 3:1 against background
- [ ] Focus indicators: 3:1 minimum

## Readability
- [ ] Text clearly readable on all backgrounds
- [ ] Important info not lost in either mode
- [ ] Charts/graphs visible in both modes
- [ ] Image contrast appropriate

## Consistency
- [ ] All screens support both modes
- [ ] No hardcoded colors bypassing theme
- [ ] Icons visible in both modes
- [ ] Shadows appropriate for each mode

## Transitions
- [ ] Smooth theme switching (no flash)
- [ ] State preserved during switch
- [ ] User preference remembered
```

### Common Theme Issues

| Issue | Detection | Fix |
|-------|-----------|-----|
| Hardcoded colors | Search for `#` in styles | Use CSS variables |
| Missing dark variant | Component looks wrong in dark | Add dark mode styles |
| Poor contrast | Text hard to read | Adjust color values |
| Invisible icons | Icons disappear | Use currentColor or theme-aware colors |
| White flash | FOUC on theme change | Set theme before render |

---

## Phase 4: User Flow Audit

### Page-by-Page Assessment Template

```markdown
## [Page Name]

### Purpose
[What is the primary goal of this page?]

### Entry Points
- [How users arrive at this page]

### Key Actions
1. [Primary action]
2. [Secondary actions]

### Exit Points
- [Where users go next]

### UX Checklist
- [ ] Clear page title/header
- [ ] Primary action is obvious
- [ ] Loading states implemented
- [ ] Empty states handled
- [ ] Error states handled
- [ ] Navigation is clear
- [ ] Back/escape path exists
```

### Critical User Flows

Audit these end-to-end journeys:

```
1. Onboarding Flow
   Landing → Sign Up → Verification → Profile Setup → Dashboard

2. Core Action Flow
   Dashboard → [Primary Feature] → Confirmation → Success

3. Settings Flow
   Dashboard → Settings → [Change] → Save → Confirmation

4. Error Recovery Flow
   Any Page → Error → Error Message → Recovery Action → Success
```

### Flow Quality Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Steps to complete | Minimize | Count clicks/taps to goal |
| Cognitive load | Low | Count decisions per screen |
| Error recovery | Easy | Test wrong inputs |
| Progress visibility | Clear | Check progress indicators |
| Reversibility | Possible | Test undo/back actions |

### Navigation Hierarchy Audit

```
Verify clear navigation structure:
├── Primary Nav (always visible)
│   ├── Dashboard
│   ├── Core Feature 1
│   ├── Core Feature 2
│   └── Settings
├── Secondary Nav (contextual)
│   └── Sub-pages within features
└── Tertiary Nav (modals/overlays)
    └── Quick actions, confirmations
```

---

## Audit Report Template

```markdown
# UI/UX Design Audit Report

**App**: [Name] | **Version**: [X.X.X] | **Date**: [YYYY-MM-DD]
**Auditor**: [Name]

## Executive Summary
- Overall Score: [X/10]
- Critical Issues: [X]
- Improvements Needed: [X]
- Best Practices Followed: [X]

---

## Design System

### Component Coverage
| Component | Exists | States Complete | Consistent |
|-----------|--------|-----------------|------------|
| Buttons | ✅/❌ | ✅/❌ | ✅/❌ |
| Inputs | ✅/❌ | ✅/❌ | ✅/❌ |
| Cards | ✅/❌ | ✅/❌ | ✅/❌ |
| [etc.] | | | |

### Design Tokens
- Colors: [Complete/Partial/Missing]
- Typography: [Complete/Partial/Missing]
- Spacing: [Consistent/Inconsistent]
- Shadows: [Defined/Ad-hoc]

---

## Consistency Score

| Area | Score | Notes |
|------|-------|-------|
| Typography | /10 | |
| Colors | /10 | |
| Spacing | /10 | |
| Components | /10 | |
| Interactions | /10 | |

---

## Theme Implementation

### Light Mode
- Contrast: [Pass/Fail]
- Readability: [Good/Fair/Poor]
- Issues: [List]

### Dark Mode
- Contrast: [Pass/Fail]
- Readability: [Good/Fair/Poor]
- Issues: [List]

---

## User Flows

| Flow | Steps | Friction Points | Rating |
|------|-------|-----------------|--------|
| Onboarding | X | [List] | /10 |
| [Core Flow] | X | [List] | /10 |
| Settings | X | [List] | /10 |

---

## Issues Found

### Critical (Must Fix)
1. [Issue + Location + Impact]

### High Priority
1. [Issue + Location + Impact]

### Medium Priority
1. [Issue + Location + Impact]

### Low Priority (Polish)
1. [Issue + Location + Impact]

---

## Recommendations

### Immediate Actions
1. [Action item]

### Short-term Improvements
1. [Action item]

### Long-term Enhancements
1. [Action item]
```

---

## Quick Reference: Design Quality Signals

### ✅ Good Design Signs
- Consistent spacing rhythm
- Clear visual hierarchy
- Obvious interactive elements
- Smooth transitions
- Proper loading states
- Helpful empty states
- Clear error messages

### ❌ Poor Design Signs
- Inconsistent padding/margins
- Competing visual elements
- Hidden or unclear CTAs
- Jarring animations
- Missing loading states
- "No data" without guidance
- Technical error messages

---

## Tools & Commands

### Contrast Checking
```javascript
// Get computed color values
getComputedStyle(element).color
getComputedStyle(element).backgroundColor

// Online tools
// - WebAIM Contrast Checker
// - Stark (Figma plugin)
```

### Design Token Extraction
```javascript
// Extract CSS custom properties
Array.from(document.styleSheets)
  .flatMap(sheet => Array.from(sheet.cssRules))
  .filter(rule => rule.style?.cssText?.includes('--'))
```

### Component Inventory Script
```javascript
// Count unique component classes
[...new Set(
  [...document.querySelectorAll('[class]')]
    .flatMap(el => [...el.classList])
)].sort()
```
