# Join The Weekend Film School

A single page whose only job is to ask one question — learn or teach — and
get the answer into the right WhatsApp community. Scan a code, or tap a
button. Nothing else on it.

This is the page you put behind the link in a bio, a poster, a story or a
video description.

- **Learn a craft** sends people to **The Weekend Film School** community.
- **Teach a craft** sends people to **The Weekend Film Crew** community.
- Both doors stay on screen after a pick, so switching later is one tap.
- Sibling page: [`wfs-join`](../wfs-join) — the three-door gateway with the
  full crew list, sorted by speciality. This page does not touch it and does
  not replace it; the learn panel links out to it for anyone who would rather
  join by what they make.

## The two things you edit

Open `assets/js/school.js`. Near the top:

```js
var LINKS = {
  learn: 'https://chat.whatsapp.com/GbTJUZzTQF5Fo7aFQytjQA',   // The Weekend Film School
  teach: 'https://chat.whatsapp.com/KXw6v5TYQWSKHg8swjQQoO'    // The Weekend Film Crew
};
```

Replace either line and save. That path's button and QR code both update —
the code is drawn in the browser from the same string the button points at,
so the two can never drift apart. Nothing to re-export, no image to
regenerate.

Both URLs are also hard-coded into each door's button `href` in `index.html`
as a fallback, so the page still sends people somewhere with JavaScript
switched off — it just cannot ask which door they want first. **If you change
a link in one file, change it in the other.**

## How the routing works

- The plain address always asks first. Both doors sit open, nothing
  decided, every single time somebody opens it — this is a link that gets
  shared and reopened by lots of different people on the same phone or
  browser, so nothing about a previous visit is remembered. There is no
  "last choice" stored anywhere.
- Tap a door: that path's panel appears below (QR, button, what-you-get
  list), the door gets a heavier rule and a "your pick" tag, the other door
  just steps back slightly — it never disappears, so changing your mind is
  one more tap.
- Tapping a door also writes `?path=learn` or `?path=teach` into the
  address bar, purely so the current tab can be refreshed or the exact URL
  copied and shared as a direct link. A printed QR code can point straight
  at either URL and skip the question entirely, for anyone who already
  knows which one they want — that is the only thing that skips the fork.

## How it is built

Plain HTML, one stylesheet, two small scripts. No build step, no dependencies,
no framework. Open `index.html` and it runs.

| File | What it is |
| --- | --- |
| `index.html` | The page. Both doors and both panels, all the copy. |
| `assets/css/school.css` | The stylesheet. Tokens and the door component are copied verbatim from `wfs-join/assets/css/gateway.css`. |
| `assets/js/qr.js` | Dependency-free QR encoder, copied from the gateway. Do not edit. |
| `assets/js/school.js` | The two links, the routing, and the copy-to-clipboard fallback — wired once per panel so switching paths never redraws anything. |

The identity is the same production-paperwork language as the gateway: paper
stocks, mono labels, hairline rules, zero radius, zero shadow, zero gradient.
Each join card is printed on the same stock as its door — blue for the School,
green for the Crew — matching the colour-coding already used in the gateway's
own config.

## Deploying it

Already live at **https://thoshideveloper-cyber.github.io/wfs-school-join/**
via GitHub Pages, deployed from the `main` branch at root.

To push a change:

```bash
cd wfs-school-join
git add .
git commit -m "Describe the change"
git push
```

Pages redeploys automatically within a minute or two of the push.

## What it does not say

No member count, no dates, no price, no testimonials, no venue address, no
CV requirement for teaching. None of that is verified or true yet, so none of
it is on the page. Same rule as the main site.
