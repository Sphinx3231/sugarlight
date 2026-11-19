# Sugarlight: a journey through blood sugar

A plain-language blood sugar awareness site for adults. Behind the content is a 3D scene: a ball-and-stick glucose molecule among drifting red blood cells. Six tabs:
- Basics
- Warning signs (with the 15-15 rule)
- Test results (an interactive CDC range gauge)
- Global facts (IDF statistics and a regional chart)
- Risk & prevention (CDC risk factors; USPSTF screening guidance)
- Sources

## Run
```bash
npm install
npm run dev        # or: npm run build && npm run preview
```
Add `?lite` to the URL for the low-power tier (fewer particles, no antialiasing). Phones use it automatically.

## Facts
Every number comes from WHO, the IDF Diabetes Atlas (11th ed., 2025) or the CDC. Each was checked on 2026-11-19 and is listed with its source URL in `docs/FACTS.md`. The "day of blood sugar" chart is labeled as an illustration, not real readings.

## Assets and licenses
- The 3D scene, icons and charts are drawn in code. No photos or third-party images are used.
- Fonts: Newsreader and Public Sans from Google Fonts (SIL Open Font License).
- Libraries: three.js (MIT), GSAP 3.12.5 (standard no-charge license).

## Accessibility
- Tabs follow the WAI-ARIA tabs pattern: arrows, Home and End move between tabs, and each tab has a deep link (`#signs`, `#numbers`, `#world`…).
- Skip link and landmarks.
- The slider reads its value and range aloud (`aria-valuetext`).
- Charts have text alternatives and a table view.
- Status colors always come with an icon and a label.
- Reduced motion swaps movement for fades and slows the scene.

Not medical advice.
