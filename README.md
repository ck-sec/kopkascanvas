# kopkascanvas.com

Christoph Kopka's portfolio. The page opens with the CK-1 Pocket Lab, a handheld with five short minigames, one per big chapter of his life, plus a video channel that plays his talks right on the handheld's screen. Scrolling down shows the same story as a normal portfolio (Work, On stage, Life), so nobody has to play.

- Plain static files, no build step, no cookies or tracking. Open `index.html` to preview (or run `python3 -m http.server` in this folder).
- `index.html` holds all content. `style.css` is the design, `main.js` adds the sky, scroll reveals, the video player and the game.
- **The game** lives in `main.js`: a title menu (Story mode, Videos, About me), an island map and five minigames in `GAMES`:
  - `homestead` (Canada: garden, woodpile, fishing), `parcels` (SAP postal: sort parcels), `flight` (SAP public cloud: fly to four markets), `dodge` (Team Austria dodgeball), `boss` (Microsoft Security: a small bullet-hell boss, unlocks after two islands).
  - Each game has its card text (story, how to play, the real result) and points at the portfolio with `pic` (a photo id like `#p-upu`), `read` (the section "Read more" scrolls to) and `vids` (YouTube ids).
  - Best stars are kept in `localStorage` (`ck1-best`), nothing else is stored.
- **Videos have one source.** Every `a.vid[data-yt]` on the page (optional `data-start` in seconds, `data-vertical` for Shorts) shows up in the game's video channel, with its `.cap` title and its poster. On the page they play in a youtube-nocookie player only after a click.
- Video posters are self-hosted in `img/posters/` (drawn with the site's pixel kit) or photos in `img/photos/`, so no request goes to YouTube before a click.
- Fonts are self-hosted in `fonts/` (Inter, Bricolage Grotesque, Press Start 2P, all SIL Open Font License), so no request goes to Google.
- `cv/Christoph-Kopka-CV.pdf` is the public CV (no phone number). `img/og.jpg` is the link preview image.
- All pixel art is original and drawn in code; sprite strings are in `main.js`.

Domain: kopkascanvas.com (registered at Porkbun, DNS managed at Hostinger; `CNAME` file is for GitHub Pages).

Hosting: GitHub Pages from `main`. Pushing to `main` publishes the site.
