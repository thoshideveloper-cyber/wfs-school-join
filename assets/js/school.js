/* ==========================================================================
   THE WEEKEND FILM SCHOOL — JOIN SHEET
   --------------------------------------------------------------------------
   The only line you ever need to edit is JOIN_LINK, directly below.

   To change where this page sends people:
     1. Open the WhatsApp community, tap its name, then Invite via link, Copy.
     2. Paste it over the link below. Save.
     3. The button AND the QR code both update. Nothing to re-export.

   The same link is also written into the href of the button in index.html,
   so the page still works with JavaScript switched off. If you change one,
   change the other.
   ========================================================================== */

var JOIN_LINK = 'https://chat.whatsapp.com/GbTJUZzTQF5Fo7aFQytjQA';

/* ecc: "L" | "M" | "Q" | "H". Higher survives more damage and makes a denser
   code. M is right for a screen. Use Q if this gets printed onto a poster
   that will live outdoors. */
var QR_ECC = 'M';

(function () {
  'use strict';

  var go   = document.getElementById('go');
  var qr   = document.getElementById('qr');
  var code = document.getElementById('qr-code');
  var copy = document.getElementById('copy');

  /* --- The button. Kept in sync with the config above. ------------------- */
  if (go) go.href = JOIN_LINK;

  /* --- The code. Drawn from the same string the button points at, so the
         two can never drift apart. ------------------------------------- */
  if (code && window.QR) {
    try {
      code.innerHTML = window.QR.toSvg(JOIN_LINK, {
        ecc: QR_ECC,
        label: 'QR code to join The Weekend Film School on WhatsApp'
      });
      /* Let it feed out like paper once the sheet has settled. */
      setTimeout(function () { qr.setAttribute('data-revealed', ''); }, 160);
    } catch (err) {
      /* A missing code is better than a broken one: hide the block and let
         the button carry the page on its own. */
      qr.hidden = true;
    }
  }

  /* --- Copy. For anyone pasting the link into a message or a description.
         Three levels, because the clipboard is refused more often than you
         would think — an insecure origin, an in-app browser, a webview:
           1. The clipboard API.
           2. The old execCommand trick.
           3. Print the link on the page so it can be selected by hand.    */
  if (copy) {
    var label   = copy.textContent;
    var urlLine = document.getElementById('url');
    var urlText = document.getElementById('url-text');
    var timer;

    function flash(text) {
      clearTimeout(timer);
      copy.textContent = text;
      timer = setTimeout(function () { copy.textContent = label; }, 2400);
    }

    function reveal() {
      if (urlText) urlText.textContent = JOIN_LINK;
      if (urlLine) urlLine.hidden = false;
      flash('Copy it from below');
    }

    /* Selects the link in an off-screen field and asks the document to copy
       it. Deprecated, but it still works where the async API is blocked. */
    function legacyCopy() {
      var field = document.createElement('textarea');
      field.value = JOIN_LINK;
      field.setAttribute('readonly', '');
      field.style.cssText = 'position:fixed;top:-1000px;opacity:0';
      document.body.appendChild(field);
      field.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
      document.body.removeChild(field);
      return ok;
    }

    copy.addEventListener('click', function () {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(JOIN_LINK).then(
          function () { flash('Copied'); },
          function () { legacyCopy() ? flash('Copied') : reveal(); }
        );
      } else {
        legacyCopy() ? flash('Copied') : reveal();
      }
    });
  }
})();
