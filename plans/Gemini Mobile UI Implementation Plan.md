# Mobile Navigation Refactor

This plan outlines the steps to make the app more mobile-friendly using native app patterns (a bottom app bar and a "More" menu) without introducing heavy external libraries.

## Proposed Changes

### 1. `src/components/NavBar.jsx`

- **Mobile vs Desktop Layout:** Update the component to render a bottom app bar on mobile screens.
- **Icons:** We will use simple inline SVG icons for navigation items (Songs, Playlists, Analytics, My Stats).
- **"More" Menu:** Add a new button for mobile that opens a `BottomSheet` menu. This menu will contain secondary links: Badges, Rounds, Profile, and Theme Selection.
- **Desktop:** The desktop view will remain functionally the same (top navigation), but we may refactor the JSX to accommodate the responsive CSS easily.

### 2. `src/components/NavBar.css`

- **Bottom App Bar Styles:** Apply `@media (max-width: 768px)` rules to fix `.nav-bar` to the `bottom: 0`, give it a height of `60-64px`, and layout `.nav-links` with `justify-content: space-around`.
- **Hide Elements:** Hide the `.nav-brand` on mobile to make room for the link icons.
- **Link Styling:** Style `.nav-link` on mobile to display the SVG icon centered with tiny text below it.

### 3. `src/App.css` Global Layout Adjustments

- **Padding:** Add `padding-bottom: 64px` to `.app` (or appropriate container elements) on mobile screens to ensure the core content isn't obscured by the new bottom app bar.
- **Floating Elements:** Ensure elements like the mobile generic filter button (`.mobile-filter-button`) are raised above the bottom navigation bar (`bottom: calc(1.5rem + 64px)`).

### 4. `src/App.jsx`

- We’ll pass down `selectedTheme` and `setSelectedTheme` into the `NavBar` so that the Theme Selector can be rendered inside the mobile "More" menu. Currently, the theme selector is hidden on mobile entirely.

---

## Verification Plan

### Automated / Local Testing

1. Ensure the development server is running (`npm run dev`).
2. I will use the `browser_subagent` to open `http://localhost:5173`.
3. Resize the window to mobile dimensions (e.g., width 375px) ensuring:
   - The navigation bar attaches to the bottom.
   - The primary icons are visible and evenly spaced.
   - Clicking "More" opens the BottomSheet menu with the secondary routes.
   - The page content can be fully scrolled without being permanently hidden behind the app bar.

### Manual Verification

- The user can open the app on their physical mobile device / local network to verify the tactile feel of the bottom navigation and hamburger menu interactions.
