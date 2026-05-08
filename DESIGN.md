# ProofPack DESIGN.md

## 1. Visual Theme & Atmosphere

Security Workbench: a precise, high-trust product UI for engineers inspecting cryptographic evidence. The surface should feel like a calibrated instrument, not a terminal skin and not a generic SaaS dashboard.

Use restrained depth, exact alignment, dense but readable tables, compact navigation, and proof-focused visual anchors. The first viewport must always make the verifier usable.

## 2. Color Palette & Roles

Use OKLCH tokens in CSS. Never use pure black or pure white.

- `paper`: `oklch(0.975 0.006 95)` for light text-on-paper areas and docs.
- `ink`: `oklch(0.165 0.014 250)` for primary text.
- `carbon`: `oklch(0.205 0.018 250)` for the app shell.
- `panel`: `oklch(0.245 0.018 250)` for raised tool panels.
- `line`: `oklch(0.38 0.018 250)` for separators.
- `signal`: `oklch(0.74 0.16 158)` for verified and active proof states.
- `amber`: `oklch(0.79 0.15 78)` for warnings and hold decisions.
- `danger`: `oklch(0.66 0.18 28)` for failed checks.
- `blueprint`: `oklch(0.68 0.11 232)` for informational focus.

Avoid one-note green. Green is the proof signal, not the whole brand.

## 3. Typography Rules

Use a high-quality sans stack for product UI: `Geist`, `Satoshi`, `ui-sans-serif`, `system-ui`. Use `Geist Mono`, `JetBrains Mono`, `SF Mono`, monospace for hashes, signatures, event IDs, counts, and command examples.

- H1: compact, 2 lines max, strong weight, no decorative gradient text.
- Section headings: functional labels, short and scannable.
- Tables and timelines: tabular numbers, mono IDs, clear status chips.
- Body copy: 65 to 75 character line length.

## 4. Component Styling

- App shell: compact desktop rail plus top evidence status; mobile uses a bottom navigation.
- Verifier panel: single strong drop zone with profile/trust controls beside or below it.
- Status chips: proof state first, color plus text, never color alone.
- Cards: use only for concrete repeated evidence items or panels. No nested cards.
- Buttons: icon plus label for primary actions; icon-only only when the icon is familiar and has a title.
- Hash displays: mono, truncated by default, expandable/copyable.

## 5. Layout Principles

The first screen is a workbench, not a landing page. Orient, show status, enable action.

Desktop layout:

- Left navigation: 248px max, compact labels, current pack status.
- Main pane: constrained readable width for upload/report, full available width for timeline.
- Right detail drawer: event/proof inspection when useful.

Mobile layout:

- Single column.
- Bottom navigation.
- No horizontal overflow.
- Toolbars wrap into segmented controls.

## 6. Depth & Elevation

Use background steps, borders, and small inner highlights before shadows. Shadows must be soft and rare. Avoid glass blur except for command palette overlays.

## 7. Do's and Don'ts

Do:

- Make failure reasons obvious.
- Show profile, trust, signature count, and derivation status near the top.
- Preserve keyboard navigation.
- Use real proof data from the loaded pack.
- Prefer dense lists and drawers over decorative cards.

Do not:

- Use purple AI gradients.
- Use Inter as the visual identity.
- Put proof metrics in a marketing hero.
- Hide the verifier below brand copy.
- Use fake logos, fake customers, or generic avatars.

## 8. Responsive Behavior

Desktop targets repeated inspection. Mobile targets quick verification and share/export. Every table needs a compact stacked fallback or horizontal-free row layout at 375px.

## 9. Agent Prompt Guide

When changing ProofPack UI, preserve the Security Workbench direction. Build the real workflow first. Use restrained color, exact spacing, compact typography, and strong proof-state feedback. If a design starts looking like generic AI SaaS, reduce decoration and increase evidence clarity.
