# kopkascanvas.com

Christoph Kopka's portfolio. The page opens with the CK-1 Pocket Lab, a handheld that runs a short jump and run through his career. Scrolling down shows the same story as a normal portfolio, so nobody has to play.

- Plain static files, no build step, no cookies or tracking. Open `index.html` to preview (or run `python3 -m http.server` in this folder).
- `index.html` holds all content. `style.css` is the design, `main.js` adds the sky, scroll reveals, the video player and the game.
- **The story has one source.** Every `<article class="chapter">` in `#story` is one game level:
  - `data-zone` picks the pixel world (`canada`, `vienna`, `startup`, `hongkong`, `ethics`, `sap`, `postal`, `cloud`, `security`, `beyond`; worlds are drawn in `THEMES` in `main.js`)
  - `data-year` and `data-name` label the level, `data-short` is the line on the game card, `data-skills="A|B"` are the two skill orbs
  - `style="--zc:#hex"` is the chapter colour. A `.media img` becomes the card photo, otherwise the card shows the pixel world.
- Videos are YouTube links (`a.vid[data-yt]`, optional `data-start` in seconds, `data-vertical` for Shorts). They play in a youtube-nocookie player only after a click.
- Fonts are self-hosted in `fonts/` (Inter, Bricolage Grotesque, Press Start 2P, all SIL Open Font License), so no request goes to Google.
- `cv/Christoph-Kopka-CV.pdf` is the public CV (no phone number). `img/og.jpg` is the link preview image.
- All pixel art is original and drawn in code; sprite strings are in `main.js`.

Domain: kopkascanvas.com (registered at Porkbun, DNS managed at Hostinger; `CNAME` file is for GitHub Pages).

Hosting: GitHub Pages from `main`. Pushing to `main` publishes the site.
