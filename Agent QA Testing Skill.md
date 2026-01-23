---
name: qa-testing
description: Professional QA testing skill for web and mobile applications. Use when testing UI/UX design quality, validating app functionality, checking stability/performance, or conducting comprehensive quality assurance. Triggers include: (1) Testing user interfaces, (2) Validating features and functions, (3) Checking app stability, (4) Running regression tests, (5) Accessibility audits, (6) Performance testing, (7) Cross-browser/device testing.
---

# QA Testing Skill

Comprehensive quality assurance testing for applications covering UI/UX, functionality, and stability.

## Testing Workflow

Execute tests in this order:

1. **UI/UX Testing** → Visual and interaction quality
2. **Functional Testing** → Feature correctness
3. **Stability Testing** → Performance and reliability

## Phase 1: UI/UX Testing

### Visual Design Checklist

| Category | Test Items |
|----------|------------|
| **Typography** | Font consistency, readable sizes (min 14px), proper hierarchy |
| **Colors** | Contrast ratio ≥4.5:1, consistent palette, dark/light mode support |
| **Spacing** | Consistent padding/margins, touch targets ≥44px |
| **Layout** | Responsive breakpoints, no overflow/clipping, proper alignment |
| **Icons** | Consistent style, recognizable meaning, proper sizing |

### Interaction Testing

```
Test each interactive element:
├── Buttons: hover, active, disabled, loading states
├── Forms: focus, error, success, validation feedback
├── Navigation: active states, smooth transitions
├── Modals: open/close animations, backdrop behavior
└── Lists: empty states, loading states, scroll behavior
```

### Responsive Testing

Test at these breakpoints:
- **Mobile**: 320px, 375px, 414px
- **Tablet**: 768px, 1024px
- **Desktop**: 1280px, 1440px, 1920px

### Accessibility (A11y) Quick Checks

1. Keyboard navigation works (Tab, Enter, Escape)
2. Focus indicators visible
3. Alt text on images
4. Proper heading hierarchy (h1 → h2 → h3)
5. Color not sole indicator of state
6. Screen reader compatibility

## Phase 2: Functional Testing

### Core Feature Matrix

For each feature, verify:

| Aspect | Test |
|--------|------|
| **Happy Path** | Normal flow works correctly |
| **Edge Cases** | Empty inputs, max values, special characters |
| **Error Handling** | Invalid inputs show proper messages |
| **Data Persistence** | Data saves and loads correctly |
| **State Management** | UI reflects current state accurately |

### CRUD Operations Testing

```
CREATE  → Verify new item appears, correct data stored
READ    → Data displays correctly, loading states work
UPDATE  → Changes persist, UI updates immediately
DELETE  → Confirmation prompts, item removed, related data handled
```

### Form Validation Tests

Test each input field:
- Required field left empty
- Invalid format (email, phone, date)
- Boundary values (min/max length, numeric ranges)
- XSS attempt (`<script>alert('xss')</script>`)
- SQL injection attempt (`'; DROP TABLE users;--`)

### Navigation Testing

```
Verify:
├── All links navigate to correct destinations
├── Back/forward browser buttons work
├── Deep links work directly
├── Protected routes redirect unauthorized users
├── 404 pages display for invalid routes
└── Scroll position preserved/reset appropriately
```

## Phase 3: Stability Testing

### Performance Metrics

| Metric | Target | Tool |
|--------|--------|------|
| First Contentful Paint | < 1.8s | Lighthouse |
| Largest Contentful Paint | < 2.5s | Lighthouse |
| Time to Interactive | < 3.8s | Lighthouse |
| Cumulative Layout Shift | < 0.1 | Lighthouse |
| Bundle size | < 500KB gzipped | Build output |

### Memory & Resource Testing

```
Monitor during extended use:
├── Memory leaks (heap grows without release)
├── Event listener accumulation
├── Uncleared intervals/timeouts
├── Orphaned DOM nodes
└── Network request accumulation
```

### Error Handling & Recovery

Test these scenarios:
1. **Network failure** → Offline message, retry option
2. **API timeout** → Loading timeout, graceful fallback
3. **Invalid API response** → Error boundary, user feedback
4. **Session expiry** → Re-auth prompt, state preservation
5. **Concurrent operations** → No race conditions, data integrity

### Load Testing Scenarios

```
Simulate:
├── Rapid repeated actions (button mashing)
├── Large dataset rendering (1000+ items)
├── Multiple tabs open simultaneously
├── Background/foreground transitions
└── Low memory conditions
```

## Test Report Template

```markdown
# QA Test Report

**App**: [Name] | **Version**: [X.X.X] | **Date**: [YYYY-MM-DD]
**Tester**: [Name] | **Environment**: [Browser/Device]

## Summary
- ✅ Passed: [X] tests
- ⚠️ Minor Issues: [X]
- ❌ Blockers: [X]

## UI/UX Results
| Area | Status | Notes |
|------|--------|-------|
| Visual Design | ✅/⚠️/❌ | |
| Responsiveness | ✅/⚠️/❌ | |
| Accessibility | ✅/⚠️/❌ | |

## Functional Results
| Feature | Status | Notes |
|---------|--------|-------|
| [Feature 1] | ✅/⚠️/❌ | |
| [Feature 2] | ✅/⚠️/❌ | |

## Stability Results
| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| FCP | Xs | <1.8s | ✅/❌ |
| LCP | Xs | <2.5s | ✅/❌ |

## Issues Found
### Critical
- [Issue description, steps to reproduce]

### Minor
- [Issue description]

## Recommendations
1. [Priority fix]
2. [Enhancement suggestion]
```

## Bug Report Template

```markdown
## Bug: [Short Title]

**Severity**: Critical/High/Medium/Low
**Status**: Open/In Progress/Resolved

### Environment
- Browser/Device: 
- OS: 
- App Version: 

### Steps to Reproduce
1. 
2. 
3. 

### Expected Result
[What should happen]

### Actual Result
[What actually happens]

### Evidence
[Screenshot/video/console logs]

### Additional Context
[Any relevant information]
```

## Quick Commands

### Browser DevTools Testing

```javascript
// Check for console errors
console.log(window.onerror)

// Monitor network failures  
performance.getEntriesByType("resource").filter(r => r.responseStatus >= 400)

// Check memory usage
performance.memory

// Find accessibility issues
document.querySelectorAll('img:not([alt])').length
document.querySelectorAll('button:empty').length
```

### Lighthouse CLI

```bash
# Full audit
npx lighthouse http://localhost:3000 --view

# Performance only
npx lighthouse http://localhost:3000 --only-categories=performance
```

## Severity Classification

| Level | Criteria | Action |
|-------|----------|--------|
| **Critical** | App crashes, data loss, security breach | Block release |
| **High** | Major feature broken, poor UX | Fix before release |
| **Medium** | Feature works with workaround | Schedule fix |
| **Low** | Cosmetic issue, minor inconvenience | Backlog |

## Testing Best Practices

1. **Test early, test often** — Catch issues before they compound
2. **Document everything** — Screenshots, recordings, exact steps
3. **Test like a user** — Not just happy paths
4. **Regression test** — Verify fixes don't break existing features
5. **Automate repetitive tests** — Save manual testing for exploratory work
