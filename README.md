# kopkascanvas.com

Christoph Kopka's personal hub. The whole page is one playable handheld, the CK-1 Pocket Lab, running a tiny top-down adventure.

- Plain static files, no build step, no cookies or tracking. Open `index.html` to preview.
- All text lives once, in `<main id="content">` inside `index.html`. The CK-1 screens are generated from it, and it doubles as the readable version for search engines and screen readers.
  - `<section data-page="id" data-label="Name" data-kind="battle|slides|text|warp">` = one page
  - `h3` = heading, `p` = line, `p class="dim"` = faded line, `p class="lead"` = card text, `a` = selectable link, `img` = photo
  - In `slides`, each `<article>` is one card; `data-art` draws a built-in animation when there is no photo.
- The map links pages by id: castle = `career`, workshop = `projects`, theater = `talks`, shrine = `channel`, post office = `contact`, Chris in the meadow = `about` (a battle that ends on the profile). START opens a warp menu with every page.
- All pixel art is original and drawn in code (sprite strings in the script). Photos in `img/` are 176 px wide.

Domain: kopkascanvas.com (registered at Porkbun, DNS managed at Hostinger; `CNAME` file is for GitHub Pages).

Hosting: any static host (Cloudflare Pages, Netlify or GitHub Pages). Publish the repo root, then point the domain at it.
