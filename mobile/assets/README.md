# Assets Directory

This directory should contain the following assets for the APC Connect mobile app:

## Required Assets

1. **icon.png** (1024x1024px)
   - App icon shown on home screen
   - Square image with rounded corners applied automatically
   - Should feature the APC logo

2. **splash.png** (1284x2778px for iPhone 13 Pro Max)
   - Splash screen shown while app loads
   - Background color should match app.json: #00A86B (APC green)
   - Should contain APC Connect branding

3. **adaptive-icon.png** (Android, 1024x1024px)
   - Foreground image for Android adaptive icon
   - Background color is set to #00A86B in app.json

4. **favicon.png** (Web, 48x48px)
   - Favicon for web version

## Temporary Placeholder

Until proper branded assets are created, you can use:
- A simple colored square with "APC" text for icon.png
- A gradient with "APC Connect" text for splash.png

## How to Add Assets

1. Create or obtain the branded assets from the design team
2. Place them in this `assets/` directory with the exact names listed above
3. Ensure dimensions match the requirements
4. Run `npx expo start` to verify they load correctly

## Tools for Creating Assets

- **Figma/Adobe XD** - Design the assets
- **Icon Kitchen** - Generate app icons in all required sizes
- **App Icon Generator** - https://www.appicon.co/
