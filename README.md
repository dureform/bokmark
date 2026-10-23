# bokmark

Static local bookmark manager for bookmark-files in .json format.

**App:** https://dureform.github.io/bokmark/

```bash
npm install
npm run dev      # develop
npm run build    # → dist/index.html (single file; open/bookmark in Chrome)
```

Chrome/Edge: in-place save via File System Access API. Other browsers / `file://`: downloads on save.

Import: convert a `bookmarks.html`, export to JSON on the start screen and open the downloaded file.
