# Accessibility

Sample Mods aims to meet [WCAG 2.2 AA](https://www.w3.org/TR/WCAG22/).

## What's in place

- A **Skip to content** link and a keyboard tab order that reaches entry content before the sidebar.
- A visible focus outline, with a dark inner ring on light surfaces.
- Minimum 24px target heights on primary navigation and search clear controls. Filter reset controls use 44px targets for touch input.
- A **Read more** button for long READMEs. Find-in-page can open the collapsed text in browsers that support this feature.
- Reduced motion for buttons and cards when the device requests it, plus alt text for catalog screenshots.

## Known limitations

White text on some blue buttons and the red footer wordmark fall below AA text contrast. These colours match the Akai MPC Sample hardware. Third-party screenshots and READMEs come from their authors, and their accessibility varies.

## Testing and feedback

The 21 November 2026 review used Chromium for keyboard navigation, forced-colours emulation, and layout checks at 1280px and 390px wide.

To report an accessibility barrier, [open a GitHub issue](https://github.com/2wenty2wo/samplemods/issues/new/choose) and choose a blank issue. Include the page, what you were trying to do, and any relevant browser or assistive technology details.
