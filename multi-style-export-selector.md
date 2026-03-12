# Multi-Style Export Selector

## Goal
Implement a cover-flow carousel allowing users to choose between 4 distinct badge card styles (Classic, Holographic Trading Card, Minimalist Vinyl, and Cyberpunk ID) before exporting the image.

## Context
Project Type: WEB
Primary Agent: `frontend-specialist`

## Tasks

- [ ] **Task 1: Refactor ExportableBadgeCard Structure** 
  - **Action**: Extract the current design into a `<ClassicBadgeCard />` sub-component. Update `<ExportableBadgeCard />` to act as a stateful wrapper maintaining a `selectedTheme` state.
  - **Verify**: The export modal still opens and successfully renders/exports the classic layout.

- [ ] **Task 2: Implement Cover-Flow Carousel UI**
  - **Action**: Add a 3D-transform CSS carousel (or lightweight library like Swiper if preferred) inside the modal. Add left/right navigation controls. The centered card should be active and scaled up.
  - **Verify**: Users can smoothly navigate left/right between placeholder cards, with visual feedback for the active card.

- [ ] **Task 3: Build Holographic Trading Card Style**
  - **Action**: Create `<TradingBadgeCard />` and its CSS. Implement the metallic border, character window, and bottom stat block based on the brainstorm design. 
  - **Verify**: The card renders correctly in the carousel and exports accurately via `html2canvas`.

- [ ] **Task 4: Build Minimalist Vinyl Sleeve Style**
  - **Action**: Create `<VinylBadgeCard />` and its CSS. Implement the square aspect ratio, abstract backdrop, and Swiss-style typography.
  - **Verify**: The card respects its square aspect ratio in the carousel and exports properly.

- [ ] **Task 5: Build Cyberpunk ID Style**
  - **Action**: Create `<CyberpunkBadgeCard />` and its CSS. Implement the vertical layout, neon monospaced text, and scanning line overlays.
  - **Verify**: The card renders tech-styled typography correctly and exports seamlessly.

- [ ] **Task 6: Connect Export Logic to Active Card**
  - **Action**: Ensure the "Save" and "Copy" functions capture *only* the currently active card in the carousel, handling any `html2canvas` quirks related to CSS 3D transforms.
  - **Verify**: Clicking export on any selected style produces a perfect PNG of that specific style.

## Done When
- [ ] Users can open the badge export modal and swipe/click through 4 unique badge styles.
- [ ] Visually, the carousel uses a premium "cover flow" depth effect.
- [ ] Exporting accurately captures the selected style without capturing the carousel UI or adjacent cards.
- [ ] `ux_audit.py` and `lint` verification complete.
