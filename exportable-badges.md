# Exportable Badges Feature

## Overview

Based on user input, we will implement client-side image generation. If a user has a badge, they (or admins) can click on a user's name inside the badge holders list (ONLY for achieved badges), opening a modal. This modal displays a highly stylized, shareable badge card containing the user's avatar, the badge icon, the player's name, and their specific stats/date. Using `html2canvas`, the user can download this card as a PNG.

## Project Type

WEB

## Success Criteria

- Clicking a player's name in `BadgesPage.jsx` opens an `ExportableBadgeCard` modal only if they have achieved the badge.
- The modal renders a beautifully styled DOM element including the user's avatar.
- A user can click "Save Image" to download a PNG locally.
- The image object/DOM is cleaned up when the modal closes.

## Tech Stack

- Frontend: React / Vite (existing)
- Image Capture: `html2canvas`

## File Structure

- `src/components/analytics/ExportableBadgeCard.jsx` (NEW)
- `src/components/analytics/ExportableBadgeCard.css` (NEW)
- `src/pages/BadgesPage.jsx` (MODIFY)
- `package.json` (MODIFY - add html2canvas)

## Task Breakdown

1. **Setup html2canvas Dependency**
   - **Agent**: `frontend-specialist`
   - **Skill**: `app-builder`
   - **Priority**: P0
   - **Dependencies**: None
   - **INPUT**: `npm install html2canvas`
   - **OUTPUT**: Updated `package.json` and `package-lock.json`
   - **VERIFY**: Application builds and `html2canvas` can be imported.

2. **Create ExportableBadgeCard Component & CSS**
   - **Agent**: `frontend-specialist`
   - **Skill**: `frontend-design`
   - **Priority**: P1
   - **Dependencies**: Task 1
   - **INPUT**: User object, Badge object
   - **OUTPUT**: `ExportableBadgeCard.jsx` and `ExportableBadgeCard.css`
   - **VERIFY**: The component beautifully renders the badge and player info with premium styling (gradients, good typography).

3. **Implement Download Logic**
   - **Agent**: `frontend-specialist`
   - **Skill**: `react-best-practices`
   - **Priority**: P1
   - **Dependencies**: Task 2
   - **INPUT**: React Ref of the card component
   - **OUTPUT**: Download handler using `html2canvas` to trigger a PNG file download.
   - **VERIFY**: Clicking the save button triggers a browser download dialogue offering a correct `.png` image.

4. **Integrate Component with BadgesPage**
   - **Agent**: `frontend-specialist`
   - **Skill**: `react-best-practices`
   - **Priority**: P2
   - **Dependencies**: Task 3
   - **INPUT**: Modified `BadgesPage.jsx` state
   - **OUTPUT**: Clicking a user's name in the badge modal transitions to the `ExportableBadgeCard` view.
   - **VERIFY**: Navigation between the badge list and the specific user card works correctly.

## Phase X: Verification

- [ ] `npm run lint` & `npx tsc --noEmit`
- [ ] `python .agent/skills/vulnerability-scanner/scripts/security_scan.py .`
- [ ] `python .agent/skills/frontend-design/scripts/ux_audit.py .`
- [ ] `npm run build`
- [ ] `npm run dev` and Manually Test Download.
