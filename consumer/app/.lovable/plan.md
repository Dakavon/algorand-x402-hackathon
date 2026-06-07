## Header Redesign

Refresh `src/components/ev/Header.tsx` to feel more crafted and on-brand with the app's solar/EV theme, keeping the slim top-bar height.

### Direction (v3 — High-tech solar pulse, adapted to tokens)

- **Brand mark**: dark `bg-foreground` rounded-xl tile (size-10) containing a sharp amber lightning SVG (replaces the ⚡ emoji), with a soft amber glow halo behind it and a subtle shimmer sweep.
- **Wordmark**: "EV Charge" tightened (text-base, font-bold, tracking-tight).
- **Meta line**: mono font (JetBrains Mono via existing font stack or system mono) with two pill tags — `Algorand TestNet` and `x402` — small, uppercase, low-contrast, separated by an amber dot.
- **Right side**:
  - Keep `StateChip` when a lifecycle state exists.
  - Replace plain status dot with a refined pill: animated emerald ping + "Live" label when online; muted "Offline" when not.
  - Keep `Demo data` chip behavior (restyled to match pill shape).

### Implementation notes

- Edit only `src/components/ev/Header.tsx`. No prop/API changes.
- Use existing semantic tokens (`foreground`, `background`, `solar`, `energy`, `hint`) — no raw hex. Amber glow via `bg-solar/20 blur-md`.
- Add a small `@keyframes shimmer` either inline `<style>` or via a utility in `src/styles.css` (prefer styles.css for reuse).
- Keep header height roughly the same (py-3, size-10 mark) so layout below is unaffected.
