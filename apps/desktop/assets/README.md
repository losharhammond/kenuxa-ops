# Desktop Agent — App Icons

Place these files here before running `electron-builder`:

| File              | Size      | Used for              |
|-------------------|-----------|-----------------------|
| `icon.ico`        | 256×256   | Windows installer + tray |
| `icon.icns`       | 512×512   | macOS installer       |
| `icon.png`        | 512×512   | Linux AppImage + tray |
| `trayTemplate.png`| 16×16     | macOS tray (dark mode compatible) |

## Quick icon generation

If you have ImageMagick installed:

```bash
# From a 512x512 PNG source image:
magick icon-source.png -resize 256x256 icon.ico
magick icon-source.png icon.icns
cp icon-source.png icon.png
magick icon-source.png -resize 16x16 trayTemplate.png
```

Or use https://www.electron.build/icons to generate all formats from one source image.
