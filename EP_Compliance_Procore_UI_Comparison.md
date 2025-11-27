# Procore → Oblicore UI Design Comparison & Gap Analysis

**Date:** 2025-01-01  
**Status:** Design Alignment Review

---

## Executive Summary

**Objective:** Align Oblicore UI with Procore's proven enterprise construction software design patterns, replacing orange with Industrial Deep Teal (#026A67).

**Key Finding:** Our current design needs **5 critical adjustments** to match Procore's structure and visual hierarchy.

---

## 1. Sidebar Navigation - CRITICAL GAP ❌

| Element | Procore | Current Design | Required Change |
|---------|---------|----------------|-----------------|
| **Background Color** | Dark Charcoal (#101314) | Soft Slate (#E2E6E7) ❌ | **Change to Dark Charcoal** |
| **Text Color** | White/Light (#E2E6E7) | Dark (#101314) ❌ | **Change to Light** |
| **Visibility** | Always visible (default) | Collapsible (ok) | Keep collapsible but default visible |
| **Border** | Subtle dark border | Light border ❌ | **Change to subtle dark border** |
| **Active State** | Teal accent (#026A67) | Needs verification | Use teal for active nav items |

**Impact:** Sidebar is the primary navigation - wrong color breaks enterprise trust pattern.

**Fix Required:** ✅ Update sidebar to dark charcoal with light text.

---

## 2. Main Content Background - NEEDS VERIFICATION ⚠️

| Element | Procore | Current Design | Required Change |
|---------|---------|----------------|-----------------|
| **Background** | Dark/Charcoal (#101314 or darker) | White (assumed) ⚠️ | **Verify: Should be dark with light cards** |
| **Content Cards** | White/Light panels | White cards (ok) | Keep white cards |
| **Contrast** | High contrast (dark bg, light cards) | Unknown ⚠️ | **Ensure high contrast** |

**Impact:** High contrast panels create premium feel and improve scannability.

**Fix Required:** ✅ Specify dark background with white content cards.

---

## 3. Button Styles - NEEDS ADJUSTMENT ⚠️

| Element | Procore | Current Design | Required Change |
|---------|---------|----------------|-----------------|
| **Primary Button** | Teal (#026A67) ✅ | Teal (#026A67) ✅ | Correct |
| **Secondary Button** | Dark grey outline | Soft Slate fill ❌ | **Change to outline style** |
| **Button Weight** | Bold, confident | Standard ⚠️ | **Ensure bold styling** |

**Current Secondary Button:**
```css
secondary: "bg-[#E2E6E7] text-[#101314] hover:bg-[#D1D5DB]"
```

**Procore Style (Recommended):**
```css
secondary: "bg-transparent border-2 border-[#101314] text-[#101314] hover:bg-[#101314] hover:text-white"
```

**Fix Required:** ✅ Update secondary button to outline style.

---

## 4. Header Design - MOSTLY CORRECT ✅

| Element | Procore | Current Design | Status |
|---------|---------|----------------|--------|
| **Background** | Dark Charcoal (#101314) | Dark Charcoal (#101314) ✅ | Correct |
| **Text Color** | White/Light | Needs verification ⚠️ | Should be light |
| **Logo** | Black wordmark + accent | Needs specification ⚠️ | **Specify: Black wordmark + Teal symbol** |
| **Sticky** | Yes | Yes ✅ | Correct |

**Fix Required:** ✅ Verify header text is light colored, specify logo design.

---

## 5. Dashboard Layout - NEEDS SPECIFICATION ⚠️

| Element | Procore | Current Design | Required Change |
|---------|---------|----------------|-----------------|
| **Layout Style** | Table-heavy, dense data | Card-based grid ⚠️ | **Add table-heavy option** |
| **Panel Style** | High contrast white cards | White cards (ok) | Keep but ensure dark bg |
| **Headers** | Large, bold, prominent | Standard ⚠️ | **Ensure large bold headers** |
| **Data Density** | Dense, scannable | Moderate ⚠️ | **Support dense table views** |

**Fix Required:** ✅ Specify table-heavy dashboard layouts, large bold headers.

---

## 6. Status Colors - CORRECT ✅

| Element | Procore | Current Design | Status |
|---------|---------|----------------|--------|
| **Success** | Industrial green | #1E7A50 ✅ | Correct |
| **Warning** | Amber/gold | #CB7C00 ✅ | Correct |
| **Danger** | Deep red | #B13434 ✅ | Correct |
| **Info** | Accent color | #026A67 ✅ | Correct |

**Status:** ✅ All status colors align with Procore's approach.

---

## 7. Typography & Visual Weight - NEEDS VERIFICATION ⚠️

| Element | Procore | Current Design | Required Change |
|---------|---------|----------------|-----------------|
| **Headers** | Large, bold, prominent | Standard ⚠️ | **Ensure large bold headers** |
| **Font Weight** | Bold, confident | Standard ⚠️ | **Verify bold weights** |
| **Hierarchy** | Strong visual hierarchy | Standard ⚠️ | **Ensure strong hierarchy** |

**Fix Required:** ✅ Verify typography uses bold weights for headers.

---

## 8. Logo Usage - NEEDS SPECIFICATION ⚠️

| Element | Procore | Current Design | Required Change |
|---------|---------|----------------|-----------------|
| **Primary Logo** | Black wordmark + Orange symbol | Not specified ⚠️ | **Specify: Black wordmark + Teal motif** |
| **Dark Mode** | White wordmark on charcoal | Not specified ⚠️ | **Specify: White wordmark on charcoal** |
| **Style** | Flat color, no gradient | Not specified ⚠️ | **Specify: Flat color only** |

**Fix Required:** ✅ Add logo specifications to design system.

---

## 9. Brand Personality - NEEDS ALIGNMENT ⚠️

| Attribute | Procore | Current Design | Required Change |
|-----------|---------|----------------|-----------------|
| **Authority** | Strong, confident | Needs verification ⚠️ | **Ensure bold, confident styling** |
| **Precision** | No ambiguity | Needs verification ⚠️ | **Ensure clear, precise UI** |
| **Enterprise** | Professional, serious | Needs verification ⚠️ | **Avoid "app cute" styling** |

**Fix Required:** ✅ Ensure design communicates authority, precision, enterprise feel.

---

## Summary of Required Changes

### Critical (Must Fix) 🔴

1. **Sidebar:** Change from Soft Slate (#E2E6E7) to Dark Charcoal (#101314) with light text
2. **Main Background:** Specify dark background (#101314 or darker) with white content cards
3. **Secondary Buttons:** Change from fill style to outline style

### Important (Should Fix) 🟡

4. **Header Text:** Ensure light colored text on dark header
5. **Logo Design:** Specify black wordmark + teal symbol, flat colors only
6. **Dashboard Tables:** Add table-heavy layout specifications
7. **Typography:** Ensure large, bold headers for prominence

### Nice to Have (Verify) 🟢

8. **Visual Weight:** Verify bold, confident styling throughout
9. **Brand Personality:** Ensure authority and precision in design

---

## Implementation Priority

**Phase 1 (Critical):**
- Sidebar color change
- Main background specification
- Secondary button style

**Phase 2 (Important):**
- Header text color
- Logo specifications
- Dashboard table layouts
- Typography weights

**Phase 3 (Polish):**
- Visual weight verification
- Brand personality alignment

---

## Next Steps

1. ✅ Update Document 2.6 with Procore-aligned design specifications
2. ✅ Create updated color usage guidelines
3. ✅ Add logo specifications
4. ✅ Update component examples with correct colors
5. ✅ Specify dashboard layout patterns

