# PWA Icon Generation

The PWA requires icon files in the `public` directory. Currently, placeholder files exist.

## Option 1: Use an Online Tool

1. Create a 512x512px icon image (PNG format)
2. Use an online PWA icon generator like:
   - https://realfavicongenerator.net/
   - https://www.pwabuilder.com/imageGenerator
3. Download the generated icons
4. Place `pwa-192x192.png` and `pwa-512x512.png` in the `public/` directory

## Option 2: Create Manually

Create two PNG files:
- `public/pwa-192x192.png` (192x192 pixels)
- `public/pwa-512x512.png` (512x512 pixels)

You can use any image editing tool (Photoshop, GIMP, Figma, etc.) to create these icons.

## Option 3: Use a Simple SVG Converter

If you have an SVG logo, you can convert it to PNG using:
- Online converters
- ImageMagick: `convert logo.svg -resize 512x512 pwa-512x512.png`
- Node.js script with sharp or canvas

## Temporary Solution

For now, the app will work without icons, but PWA installation may not show a proper icon.
