/* ==========================================================================
   THE WEEKEND FILM SCHOOL — JOIN SHEET
   --------------------------------------------------------------------------
   Two WhatsApp links, one for each door, live here. To change where a path's
   community sends people:
     1. Open that WhatsApp community, tap its name, then Invite via link, Copy.
     2. Paste it over the matching line below. Save.
     3. That path's button AND its QR code both update. Nothing to re-export.

   The same two links are also written into the `href` of each door's button
   in index.html, so the page still sends people somewhere with JavaScript
   switched off — it just cannot ask which path they want first. If you
   change a link here, change it there too.

   The two Google Form links live below too, in FORM_LINKS. Each gets its own
   small QR code (in the left column, next to "What you get" / "What we
   handle") drawn the same way as the WhatsApp ones. The link text itself is
   also hard-coded into index.html as a fallback for JavaScript-off — if you
   change a form link here, change its `href` in index.html too.
   ========================================================================== */

var LINKS = {
  learn: 'https://chat.whatsapp.com/GbTJUZzTQF5Fo7aFQytjQA',   // The Weekend Film School
  teach: 'https://chat.whatsapp.com/KXw6v5TYQWSKHg8swjQQoO'    // The Weekend Film Crew
};

var FORM_LINKS = {
  learn: 'https://docs.google.com/forms/d/e/1FAIpQLSdpRnH24970r-5Zwq8WYI8o2U5vJpVnZ1Z1SFYgEYhqgZWcxA/viewform',
  teach: 'https://docs.google.com/forms/d/e/1FAIpQLSefMZm4ve4mkfsarF7DjXRnFBhzgi0AOFbWg-zg3KgFxbV7Iw/viewform'
};

var QR_LABELS = {
  learn: 'QR code to join The Weekend Film School on WhatsApp',
  teach: 'QR code to join The Weekend Film Crew on WhatsApp'
};

var FORM_QR_LABELS = {
  learn: 'QR code to open the craft form',
  teach: 'QR code to open the teaching form'
};

/* ecc: "L" | "M" | "Q" | "H". Higher survives more damage and makes a denser
   code. M is right for a screen. Use Q if this gets printed onto a poster
   that will live outdoors. */
var QR_ECC = 'M';

(function () {
  'use strict';

  var STORE_KEY = 'wfs-school-join:path';

  var fork  = document.getElementById('fork');
  var hint  = document.getElementById('fork-hint');
  var doors = Array.prototype.slice.call(document.querySelectorAll('.door[data-path]'));
  var panels = {
    learn: document.getElementById('path-learn'),
    teach: document.getElementById('path-teach')
  };

  /* --- Wire one panel's QR, button and copy fallback to its link. Runs once
         per panel, up front. Switching paths later never redraws anything —
         it only shows what is already built. --------------------------- */
  function wirePanel(path) {
    var panel = panels[path];
    if (!panel) return;

    var link    = LINKS[path];
    var go      = panel.querySelector('[data-role="go"]');
    var qr      = panel.querySelector('[data-role="qr"]');
    var code    = panel.querySelector('[data-role="qr-code"]');
    var copy    = panel.querySelector('[data-role="copy"]');
    var urlLine = panel.querySelector('[data-role="url"]');
    var urlText = panel.querySelector('[data-role="url-text"]');
    var formLink = FORM_LINKS[path];
    var form     = panel.querySelector('[data-role="form"]');
    var formQr   = panel.querySelector('[data-role="form-qr"]');

    if (go) go.href = link;
    if (form) form.href = formLink;

    if (code && window.QR) {
      try {
        code.innerHTML = window.QR.toSvg(link, { ecc: QR_ECC, label: QR_LABELS[path] });
      } catch (err) {
        /* A missing code is better than a broken one: hide the block and
           let the button carry the panel on its own. */
        if (qr) qr.hidden = true;
      }
    }

    /* The small form QR sits in plain sight from the start — no reveal
       animation, no scan caption. It's a thumbnail beside a link, not the
       page's main event. */
    if (formQr && window.QR) {
      try {
        formQr.innerHTML = window.QR.toSvg(formLink, { ecc: QR_ECC, label: FORM_QR_LABELS[path] });
      } catch (err) {
        formQr.hidden = true;
      }
    }

    if (copy) {
      var label = copy.textContent;
      var timer;

      var flash = function (text) {
        clearTimeout(timer);
        copy.textContent = text;
        timer = setTimeout(function () { copy.textContent = label; }, 2400);
      };

      /* Prints the link on the page so it can be selected by hand — the
         last resort once both copy methods below have been refused. */
      var reveal = function () {
        if (urlText) urlText.textContent = link;
        if (urlLine) urlLine.hidden = false;
        flash('Copy it from below');
      };

      /* Selects the link in an off-screen field and asks the document to
         copy it. Deprecated, but it still works where the async API is
         blocked — an insecure origin, an in-app browser, a webview. */
      var legacyCopy = function () {
        var field = document.createElement('textarea');
        field.value = link;
        field.setAttribute('readonly', '');
        field.style.cssText = 'position:fixed;top:-1000px;opacity:0';
        document.body.appendChild(field);
        field.select();
        var ok = false;
        try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
        document.body.removeChild(field);
        return ok;
      };

      copy.addEventListener('click', function () {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(link).then(
            function () { flash('Copied'); },
            function () { legacyCopy() ? flash('Copied') : reveal(); }
          );
        } else {
          legacyCopy() ? flash('Copied') : reveal();
        }
      });
    }
  }

  /* --- Show one path, remember the choice, and keep the URL shareable. -- */
  function showPath(path, opts) {
    opts = opts || {};
    if (!panels[path]) return;

    Object.keys(panels).forEach(function (key) {
      var panel = panels[key];
      if (!panel) return;
      var picked = key === path;
      panel.hidden = !picked;

      /* Let the code feed out like paper from a printer, same as the QR
         reveal everywhere else on this site. Only on the panel being
         shown — the hidden one just waits, already drawn. */
      if (picked) {
        var qr = panel.querySelector('[data-role="qr"]');
        if (qr) {
          qr.removeAttribute('data-revealed');
          setTimeout(function () { qr.setAttribute('data-revealed', ''); }, 160);
        }
      }
    });

    doors.forEach(function (door) {
      door.setAttribute('aria-pressed', door.getAttribute('data-path') === path ? 'true' : 'false');
    });

    if (fork) fork.setAttribute('data-chosen', path);
    if (hint) hint.hidden = true;

    try { localStorage.setItem(STORE_KEY, path); } catch (err) { /* private mode, ignore */ }

    /* So the choice survives a refresh or a paste into a chat — the QR on
       a printed poster can point straight at ?path=teach and skip the ask
       entirely for someone who already knows which door they want. */
    if (!opts.skipHistory && window.history && window.history.replaceState) {
      try {
        var url = new URL(window.location.href);
        url.searchParams.set('path', path);
        window.history.replaceState(null, '', url);
      } catch (err) { /* ignore */ }
    }

    if (!opts.skipFocus) {
      var heading = panels[path].querySelector('h2, h3');
      if (heading) {
        heading.setAttribute('tabindex', '-1');
        heading.focus({ preventScroll: false });
      }
    }
  }

  Object.keys(panels).forEach(wirePanel);

  doors.forEach(function (door) {
    door.addEventListener('click', function () {
      showPath(door.getAttribute('data-path'));
    });
  });

  /* --- On arrival: a query string wins — that is what a printed QR or a
         shared link would carry — then whatever this browser picked last
         time. Neither present, and both doors stay open, nothing decided
         for them yet. -------------------------------------------------- */
  var params = null;
  try { params = new URLSearchParams(window.location.search); } catch (err) { /* ignore */ }
  var fromQuery = params ? params.get('path') : null;

  var fromStore = null;
  try { fromStore = localStorage.getItem(STORE_KEY); } catch (err) { /* private mode, ignore */ }

  var initial = (fromQuery === 'learn' || fromQuery === 'teach') ? fromQuery
              : (fromStore === 'learn' || fromStore === 'teach') ? fromStore
              : null;

  if (initial) showPath(initial, { skipFocus: true, skipHistory: fromQuery === initial });
})();
