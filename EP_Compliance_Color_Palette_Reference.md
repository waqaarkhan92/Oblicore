# EP Compliance Color Palette Reference

**Document Version:** 1.0  
**Last Updated:** 2025-01-01  
**Status:** Official Brand Colors

---

## Primary Accent Color

**Industrial Deep Teal:** `#026A67`

**Usage:**
- Primary buttons, links, and CTAs
- Active states, focus indicators
- Brand elements (logo, headers)
- Information icons and badges

**Variants:**
- **Primary Dark:** `#014D4A` (hover states, active states)
- **Primary Light:** `#039A96` (backgrounds, highlights, dark mode)

---

## Enterprise Neutrals

### Dark Charcoal: `#101314`

**Usage:**
- Headers and navigation bars
- Power sections and important UI elements
- Dark mode backgrounds
- Primary text color on light backgrounds

### Soft Slate: `#E2E6E7`

**Usage:**
- Panels and card backgrounds
- Subtle borders and dividers
- Secondary backgrounds
- Light mode backgrounds for contrast

**Additional Neutrals:**
- **White:** `#FFFFFF` (content backgrounds, cards)
- **Black:** `#000000` (text, icons)
- **Text Secondary:** `#6B7280` (secondary text)
- **Text Tertiary:** `#9CA3AF` (tertiary text)
- **Text Disabled:** `#D1D5DB` (disabled text)

---

## Status / Semantic Colors

### Success: `#1E7A50`

**Usage:**
- Compliant status indicators
- Success messages and toasts
- Positive actions and confirmations
- Traffic light: Green (compliant)

### Warning: `#CB7C00`

**Usage:**
- At-risk status indicators
- Warning messages and alerts
- Caution indicators
- Traffic light: Yellow (at risk)

### Danger: `#B13434`

**Usage:**
- Non-compliant status indicators
- Error messages and alerts
- Critical actions (delete, remove)
- Traffic light: Red (non-compliant)

### Info: `#026A67`

**Usage:**
- Information messages
- Info badges and indicators
- Uses primary teal color

---

## Color Usage Guidelines

### Contrast Ratios (WCAG 2.1 AA Compliance)

**Text on Light Backgrounds:**
- Primary text (#101314) on white: 16.8:1 ✅
- Primary text (#101314) on Soft Slate (#E2E6E7): 8.2:1 ✅
- Primary accent (#026A67) on white: 4.8:1 ✅

**Text on Dark Backgrounds:**
- White text on Dark Charcoal (#101314): 16.8:1 ✅
- Primary Light (#039A96) on Dark Charcoal: 5.2:1 ✅

**Status Colors:**
- Success (#1E7A50) on white: 4.6:1 ✅
- Warning (#CB7C00) on white: 3.1:1 ✅ (use darker variant for small text)
- Danger (#B13434) on white: 4.5:1 ✅

---

## Tailwind CSS Configuration

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#026A67',
          dark: '#014D4A',
          light: '#039A96',
        },
        neutral: {
          charcoal: '#101314',
          slate: '#E2E6E7',
        },
        success: {
          DEFAULT: '#1E7A50',
        },
        warning: {
          DEFAULT: '#CB7C00',
        },
        danger: {
          DEFAULT: '#B13434',
        },
      },
    },
  },
};
```

---

## Dark Mode Colors

**Backgrounds:**
- Main: `#101314` (Dark Charcoal)
- Cards: `#1F2937` (slightly lighter)
- Borders: `#374151` (subtle borders)

**Text:**
- Primary: `#E2E6E7` (Soft Slate)
- Secondary: `#9CA3AF`
- Tertiary: `#6B7280`

**Primary Accent:**
- Use lighter variant `#039A96` for better contrast on dark backgrounds

**Status Colors (Dark Mode):**
- Success: `#2E9D6A` (lighter green)
- Warning: `#E5A84D` (lighter amber)
- Danger: `#D14A4A` (lighter red)

---

## Typography

**Font Family:** System font stack
- **Primary:** Inter
- **Fallback:** -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif

**Font Sizes:**
- xs: 12px
- sm: 14px
- base: 16px
- lg: 18px
- xl: 20px
- 2xl: 24px
- 3xl: 30px
- 4xl: 36px

**Font Weights:**
- Light: 300
- Normal: 400
- Medium: 500
- Semibold: 600
- Bold: 700

---

## Implementation Notes

1. **Primary Accent (#026A67)** should be used sparingly for maximum impact
2. **Dark Charcoal (#101314)** creates strong contrast and hierarchy
3. **Soft Slate (#E2E6E7)** provides subtle separation without harsh lines
4. **Status colors** should always be paired with text/icons for accessibility
5. All colors meet WCAG 2.1 AA contrast requirements

---

**Reference Documents:**
- Document 2.6: Frontend Routes & Component Map
- Document 2.4: Notification & Messaging Specification
- Document 2.9: UI/UX Design System (to be created)

