# Join The Weekend Film School

A single page whose only job is to get one person into one WhatsApp community.
Scan the code, or tap the button. Nothing else on it.

This is the page you put behind the link in a bio, a poster, a story or a
video description.

- Sends people to: **The Weekend Film School** community
- Sibling page: [`wfs-join`](../wfs-join) — the three-door gateway with the
  full crew list. This page does not touch it and does not replace it.

## The one thing you edit

Open `assets/js/school.js`. The first line of real code is the link:

```js
var JOIN_LINK = 'https://chat.whatsapp.com/GbTJUZzTQF5Fo7aFQytjQA';
```

Replace it and save. The button and the QR code both update — the code is
drawn in the browser from that same string, so the two can never drift apart.
Nothing to re-export, no image to regenerate.

The same URL is also hard-coded into the button's `href` in `index.html` as a
fallback, so the page still works with JavaScript off. **If you change one,
change the other.**

## How it is built

Plain HTML, one stylesheet, two small scripts. No build step, no dependencies,
no framework. Open `index.html` and it runs.

| File | What it is |
| --- | --- |
| `index.html` | The page. All the copy lives here. |
| `assets/css/school.css` | The stylesheet. Tokens at the top are copied verbatim from `wfs-join/assets/css/gateway.css`. |
| `assets/js/qr.js` | Dependency-free QR encoder, copied from the gateway. Do not edit. |
| `assets/js/school.js` | The link, and the twenty lines that use it. |

The identity is the same production-paperwork language as the gateway: paper
stocks, mono labels, hairline rules, zero radius, zero shadow, zero gradient.
The join card is printed on blue stock because blue is this community's stock
in the gateway's config.

## Deploying it

Any static host. For GitHub Pages, the same way `wfs-join` is served:

```bash
cd wfs-school-join
git init
git add .
git commit -m "Join sheet for The Weekend Film School"
git branch -M main
git remote add origin https://github.com/<you>/wfs-school-join.git
git push -u origin main
```

Then in the repo: **Settings → Pages → Source: deploy from branch → `main` /
(root)**. It goes live at `https://<you>.github.io/wfs-school-join/`.

## What it does not say

No member count, no dates, no price, no testimonials, no venue address. None
of that is verified, so none of it is on the page. Same rule as the main site.
