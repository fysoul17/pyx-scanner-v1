# Design Style: Chalk Voltage

> Raw, flat editorial energy — monospaced precision meets bold display type on warm parchment, electrified by orange accents.

**Platform**: web

---

## Implementation Note

This document defines the visual design language—HOW things should look.

When implementing:

1. Use your **feature spec** for page structure (WHAT sections/components to build)
2. Use **this document** for styling those components (HOW they should look)
3. Apply values using syntax appropriate for your framework

## Implementation Warnings

- **Tailwind v4 `@theme` vs `@theme inline`**: Use `@theme` (NOT `@theme inline`) when ANY raw CSS rule (body styles, pseudo-elements, keyframes) references tokens via `var()`. `@theme inline` only inlines values into utility classes — it does NOT create `:root` custom properties, so `var(--color-*)` / `var(--font-*)` in CSS rules will silently fail with no visible error.
- **CSS Grid + wrapper components**: When a React wrapper component (e.g. ScrollReveal, motion div) sits between a CSS Grid container and the grid-spanning child, grid layout classes (`col-span-*`, `row-span-*`) must go on the wrapper element (the direct grid child), not the inner component.
- **CSS `block` vs `inline-block` for underlines/overlays**: When a pseudo-element (like a decorative underline) uses `width: 100%`, the parent must be `display: block` (full container width), not `inline-block` (content width only).

---

## Colors

| Role          | Value                  |
| ------------- | ---------------------- |
| Background    | `#f5f0ea`              |
| Surface       | `#ebe5dd`              |
| Text          | `#1a1612`              |
| Text Muted    | `#8a8078`              |
| Accent        | `#ff4d00`              |
| Accent Hover  | `#ff6622`              |
| Verified      | `#16a34a`              |
| Failed        | `#dc2626`              |
| Warning       | `#ca8a04`              |
| Scanning      | `#6366f1`              |
| Border Light  | `rgba(0,0,0,0.06)`     |
| Failed Tag BG | `rgba(220,38,38,0.08)` |

**Gradients**: None — this design is intentionally flat.

## Typography

**Font Family (Display)**: Outfit (Google Fonts)
**Font Family (Body/Mono)**: Azeret Mono (Google Fonts)
**Weights (Outfit)**: 100, 400, 800, 900
**Weights (Azeret Mono)**: 300, 500, 700

| Element          | Font        | Size | Weight | Letter-spacing | Line-height | Transform |
| ---------------- | ----------- | ---- | ------ | -------------- | ----------- | --------- |
| H1 (Hero)        | Outfit      | 80px | 900    | -0.05em        | 0.92        | uppercase |
| H2 (CTA)         | Outfit      | 48px | 900    | -0.04em        | —           | uppercase |
| H3 (Card Name)   | Outfit      | 18px | 900    | -0.02em        | —           | —         |
| H3 Featured      | Outfit      | 28px | 900    | -0.02em        | —           | —         |
| Body (Hero)      | Azeret Mono | 12px | 300    | —              | 1.8         | —         |
| Body (Card Desc) | Azeret Mono | 11px | 300    | —              | 1.6         | —         |
| Label (Section)  | Outfit      | 14px | 800    | 0.06em         | —           | uppercase |
| Label (Card)     | Outfit      | 10px | 800    | 0.1em          | —           | uppercase |
| Nav Link         | Azeret Mono | 11px | 500    | 0.08em         | —           | uppercase |
| Caption          | Azeret Mono | 10px | 500    | 0.1em          | —           | uppercase |
| Footer           | Azeret Mono | 10px | 300    | —              | —           | —         |
| Stat Number      | Outfit      | 28px | 900    | -0.03em        | —           | —         |
| Score (Card)     | Outfit      | 32px | 100    | -0.03em        | —           | —         |
| Score (Featured) | Outfit      | 56px | 100    | -0.03em        | —           | —         |
| Score (Failed)   | Outfit      | 24px | 900    | —              | —           | —         |
| Logo             | Outfit      | 18px | 900    | -0.03em        | —           | uppercase |
| CTA Button       | Azeret Mono | 13px | 500    | —              | —           | —         |
| Button           | Outfit      | 13px | 800    | 0.06em         | —           | uppercase |
| Tag              | Azeret Mono | 9px  | 700    | 0.08em         | —           | uppercase |
| Status           | Azeret Mono | 10px | 700    | 0.06em         | —           | uppercase |

## Spacing

| Context                      | Value                                      |
| ---------------------------- | ------------------------------------------ |
| Page max-width               | 1200px                                     |
| Nav padding                  | 28px vertical, 40px horizontal             |
| Hero padding                 | 60px top, 80px bottom, 40px horizontal     |
| Section padding              | 0px top, 80px bottom, 40px horizontal      |
| CTA section padding          | 40px top, 100px bottom, 40px horizontal    |
| CTA box padding              | 64px                                       |
| Card padding (standard)      | 24px                                       |
| Card padding (featured)      | 36px                                       |
| Failed row padding           | 20px vertical, 24px horizontal             |
| Bento grid gap               | 4px                                        |
| Nav link gap                 | 28px                                       |
| Hero grid gap                | 60px                                       |
| Failed list gap              | 4px                                        |
| Marquee item gap             | 60px (between groups), 12px (number-label) |
| Marquee padding              | 16px vertical                              |
| Button padding               | 14px vertical, 28px horizontal             |
| Button gap (icon+text)       | 8px                                        |
| Status dot gap               | 6px                                        |
| Section header margin-bottom | 24px                                       |
| Card label margin-bottom     | 8px                                        |
| Card name margin-bottom      | 4px                                        |
| Card owner margin-bottom     | 12px                                       |
| Card desc margin-bottom      | 16px                                       |
| Footer padding               | 32px vertical, 40px horizontal             |

## Shape

| Context          | Radius       |
| ---------------- | ------------ |
| Cards/Containers | 2px          |
| CTA Box          | 4px          |
| Buttons          | 4px          |
| Logo Dot         | 50% (circle) |
| Status Dots      | 50% (circle) |
| Tags/Badges      | 2px          |

## Shadows

| Name             | Value                            |
| ---------------- | -------------------------------- |
| Card Hover       | `0 12px 32px rgba(0,0,0,0.06)`   |
| Button Hover     | `0 8px 24px rgba(255,77,0,0.2)`  |
| CTA Button Hover | `0 8px 32px rgba(255,77,0,0.25)` |

**Note**: This design uses no default/resting shadows — elements are flat until hovered. This is a core design principle.

## Motion

| Property              | Value                               |
| --------------------- | ----------------------------------- |
| Easing (bounce)       | `cubic-bezier(0.34, 1.56, 0.64, 1)` |
| Easing (smooth-out)   | `cubic-bezier(0.16, 1, 0.3, 1)`     |
| Base hover duration   | 0.3s                                |
| Nav link transition   | 0.2s (color only)                   |
| Button hover duration | 0.25s                               |
| Enter/reveal duration | 0.5s                                |
| Reveal stagger        | 0.05s → 0.1s → 0.2s → 0.3s          |
| Scroll reveal offset  | translateY(24px) → translateY(0)    |
| Voltage pulse cycle   | 1.5s (ease-in-out, infinite)        |
| Voltage flicker cycle | 3s (ease-in-out, infinite)          |
| Marquee scroll cycle  | 20s (linear, infinite)              |

## Effects

**Paper Texture Overlay**:

- SVG noise filter applied via `body::before` as fixed full-screen overlay
- fractalNoise, baseFrequency 0.8, numOctaves 4, opacity 0.025
- `pointer-events: none`, `z-index: 9999`

**CTA Background Orb**:

- 400px circle of accent color at 5% opacity
- Positioned top-right (top: -50%, right: -20%)
- Static (no animation)

**Marquee Borders**:

- 2px solid `var(--text)` top and bottom borders framing the scrolling stats

---

## Component Patterns

Reusable patterns that define how components should look, regardless of page structure.

### Icon Approach

- **Type**: None — this design uses **no icons**. Visual hierarchy is achieved entirely through typography weight contrast, color, and spatial relationships.
- **Status indicators**: Small colored dots (8px circles) with colored text labels
- **Logo accent**: 10px animated dot

### Navigation

- **Position**: Static top (not fixed or sticky)
- **Style**: Transparent — no background, border, or shadow
- **Layout**: Flex, space-between
- **Elements**:
  - Logo: Outfit 18px/900, uppercase, with animated accent dot
  - Links: Azeret Mono 11px/500, uppercase, muted color → text on hover
  - No CTA button in nav

### Card: Bento (Standard)

- **Use for**: Skill cards, content items in a grid
- **Structure**: Name (Outfit 18px/900) → Owner (11px/300 muted) → Description (11px/300 muted) → Bottom row [Status dot + Score]
- **Background**: Surface color, 2px radius
- **Padding**: 24px
- **Hover**: translateY(-4px), shadow `0 12px 32px rgba(0,0,0,0.06)`, 0.3s bounce easing
- **Grid**: Part of 4-column bento grid with 4px gaps

### Card: Bento (Featured)

- **Use for**: Highlighted/promoted items
- **Structure**: Label (10px/800 colored uppercase) → Name (Outfit 28px/900) → Owner → Description → Bottom row [Status + Score (56px/100)]
- **Span**: 2 columns, 2 rows in bento grid
- **Padding**: 36px
- **Layout**: Flex column, justify space-between
- **Hover**: Same as standard bento card

### Row: Failed Item

- **Use for**: Failed/flagged items in a list
- **Structure**: 3-column grid [Name + Reason | Tag | Score]
- **Background**: Surface color, 2px radius
- **Padding**: 20px 24px
- **Hover**: translateX(4px) — horizontal slide, not vertical lift
- **Duration**: 0.3s bounce easing

### Button: Primary (Voltage)

- **Font**: Outfit 13px/800, uppercase
- **Background**: Accent solid (`#ff4d00`)
- **Text color**: Background color (`#f5f0ea`)
- **Padding**: 14px 28px
- **Radius**: 4px
- **Hover**: translateY(-3px) scale(1.02), background changes to accent-hover, shadow `0 8px 24px rgba(255,77,0,0.2)`
- **Duration**: 0.25s bounce easing

### Button: CTA Command

- **Font**: Azeret Mono 13px/500 (monospaced, not display)
- **Background**: Accent solid
- **Text color**: Background color
- **Padding**: 14px 36px
- **Radius**: 4px
- **Hover**: scale(1.04), shadow `0 8px 32px rgba(255,77,0,0.25)`
- **Duration**: 0.3s bounce easing

### Badge: Failed Banner

- **Style**: Solid rectangle (not pill)
- **Background**: Failed color (`#dc2626`)
- **Text**: Background color, Outfit 10px/800, uppercase, 0.1em spacing
- **Padding**: 4px 12px
- **Radius**: 2px

### Badge: Failed Tag

- **Style**: Inline tag
- **Background**: `rgba(220,38,38,0.08)`
- **Text**: Failed color, Azeret Mono 9px/700, uppercase, 0.08em spacing
- **Padding**: 4px 10px
- **Radius**: 2px

### Status Dot

- **Layout**: Inline-flex, gap 6px
- **Dot**: 8px circle, color matches status
- **Text**: 10px/700, uppercase, 0.06em spacing, color matches status
- **Scanning variant**: Dot has voltagePulse animation (1.5s scale 1→1.4→1)
- **Colors**: Verified `#16a34a`, Failed `#dc2626`, Outdated `#ca8a04`, Scanning `#6366f1`

### Section Header

- **Pattern**: Title (Outfit 14px/800 uppercase) + optional count/subtitle (10px/300 muted)
- **Layout**: Flex, space-between, baseline aligned
- **Spacing**: 24px margin-bottom

### Marquee Stats

- **Layout**: Horizontal scrolling strip with 2px solid borders top/bottom
- **Items**: Number (Outfit 28px/900) + Label (10px/500 uppercase muted), separated by accent-colored `/`
- **Animation**: Linear 20s infinite scroll, duplicated content for seamless loop
- **Padding**: 16px vertical

### CTA Section

- **Background**: Inverted — text color as bg (`#1a1612`), bg color as text (`#f5f0ea`)
- **Radius**: 4px
- **Padding**: 64px
- **Alignment**: Center
- **Accent orb**: 400px circle, 5% opacity, top-right positioned
- **Structure**: H2 (48px/900 uppercase) → Description (12px/300 muted) → Command button

### Footer

- **Layout**: Flex, space-between
- **Style**: Minimal — 10px/300 muted, 1px top border (`rgba(0,0,0,0.06)`)
- **Padding**: 32px vertical, 40px horizontal

---

## Interactive States

| Component        | Trigger | Property   | From      | To                             | Duration | Easing                            |
| ---------------- | ------- | ---------- | --------- | ------------------------------ | -------- | --------------------------------- |
| Bento Card       | hover   | transform  | none      | translateY(-4px)               | 0.3s     | cubic-bezier(0.34, 1.56, 0.64, 1) |
| Bento Card       | hover   | box-shadow | none      | 0 12px 32px rgba(0,0,0,0.06)   | 0.3s     | cubic-bezier(0.34, 1.56, 0.64, 1) |
| Failed Row       | hover   | transform  | none      | translateX(4px)                | 0.3s     | cubic-bezier(0.34, 1.56, 0.64, 1) |
| Button Primary   | hover   | transform  | none      | translateY(-3px) scale(1.02)   | 0.25s    | cubic-bezier(0.34, 1.56, 0.64, 1) |
| Button Primary   | hover   | background | #ff4d00   | #ff6622                        | 0.25s    | cubic-bezier(0.34, 1.56, 0.64, 1) |
| Button Primary   | hover   | box-shadow | none      | 0 8px 24px rgba(255,77,0,0.2)  | 0.25s    | cubic-bezier(0.34, 1.56, 0.64, 1) |
| CTA Command      | hover   | transform  | none      | scale(1.04)                    | 0.3s     | cubic-bezier(0.34, 1.56, 0.64, 1) |
| CTA Command      | hover   | box-shadow | none      | 0 8px 32px rgba(255,77,0,0.25) | 0.3s     | cubic-bezier(0.34, 1.56, 0.64, 1) |
| Nav Link         | hover   | color      | #8a8078   | #1a1612                        | 0.2s     | ease (default)                    |
| Logo Dot         | cycle   | transform  | scale(1)  | scale(1.4)                     | 1.5s     | ease-in-out                       |
| Logo Dot         | cycle   | opacity    | 1         | 0.7                            | 1.5s     | ease-in-out                       |
| Accent Underline | cycle   | opacity    | 1         | 0.3 (flicker)                  | 3s       | ease-in-out                       |
| Accent Underline | cycle   | transform  | scaleX(1) | scaleX(0.95) (flicker)         | 3s       | ease-in-out                       |

---

## Character

- **Theme**: Light (warm parchment tones)
- **Shape**: Angular (2-4px radius, sharp edges, flat surfaces)
- **Density**: Spacious (generous padding, breathing room)
- **Energy**: Dynamic (bold type, animated accents, marquee, flicker effects)
- **Mood**: Editorial / brutalist-lite — raw monospaced body copy contrasts with massive display headlines

---

## Token Reference

Quick reference for implementation.

### Colors

```
color-bg: #f5f0ea
color-surface: #ebe5dd
color-text: #1a1612
color-text-muted: #8a8078
color-accent: #ff4d00
color-accent-hover: #ff6622
color-verified: #16a34a
color-failed: #dc2626
color-warning: #ca8a04
color-scanning: #6366f1
color-border-light: rgba(0,0,0,0.06)
```

### Typography

```
font-display: 'Outfit', sans-serif
font-body: 'Azeret Mono', monospace
font-weight-thin: 100
font-weight-light: 300
font-weight-regular: 400
font-weight-medium: 500
font-weight-bold: 700
font-weight-extrabold: 800
font-weight-black: 900
```

### Spacing

```
space-page-max: 1200px
space-section-y: 80px
space-section-x: 40px
space-card: 24px
space-card-featured: 36px
space-grid-gap: 4px
space-element: 12px
space-tight: 4px
space-nav-gap: 28px
space-button-y: 14px
space-button-x: 28px
```

### Shape

```
radius-card: 2px
radius-button: 4px
radius-cta: 4px
radius-tag: 2px
radius-circle: 50%
```

### Motion

```
ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1)
ease-smooth-out: cubic-bezier(0.16, 1, 0.3, 1)
duration-hover: 0.3s
duration-button: 0.25s
duration-reveal: 0.5s
duration-pulse: 1.5s
duration-flicker: 3s
duration-marquee: 20s
```

---

_Generated from: `docs/design/style_5_chalk_voltage.html`_
