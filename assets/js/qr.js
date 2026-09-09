/* ==========================================================================
   qr.js — a small, dependency-free QR encoder.
   --------------------------------------------------------------------------
   Why this exists: every join link in config.js has to show a scannable code,
   and those links change. Generating the code in the browser means editing a
   URL in config.js updates the QR too. Nothing to re-export, nothing to host.

   Supports byte mode (UTF-8), versions 1 to 40, error correction L/M/Q/H.
   Renders to an SVG string that inherits colour from CSS `currentColor`.

   Algorithm follows the public-domain reference design by Project Nayuki.

   Usage:  QR.toSvg("https://example.com", { ecc: "M", quiet: 2 })
   ========================================================================== */

var QR = (function () {
  'use strict';

  /* --- Spec tables. Index 0 is unused; versions are 1-indexed. ------------ */

  var ECC_CODEWORDS_PER_BLOCK = {
    L: [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    M: [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
    Q: [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    H: [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30]
  };

  var NUM_ERROR_CORRECTION_BLOCKS = {
    L: [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
    M: [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
    Q: [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
    H: [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81]
  };

  /* The 2-bit code each ECC level uses inside the format information. */
  var ECC_FORMAT_BITS = { L: 1, M: 0, Q: 3, H: 2 };

  var PENALTY_N1 = 3, PENALTY_N2 = 3, PENALTY_N3 = 40, PENALTY_N4 = 10;

  /* --- Small helpers ------------------------------------------------------ */

  function getBit(x, i) { return ((x >>> i) & 1) !== 0; }

  function toUtf8(str) {
    var out = [];
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      if (c < 0x80) {
        out.push(c);
      } else if (c < 0x800) {
        out.push(0xC0 | (c >> 6), 0x80 | (c & 0x3F));
      } else if (c >= 0xD800 && c < 0xDC00 && i + 1 < str.length) {
        var cp = 0x10000 + ((c - 0xD800) << 10) + (str.charCodeAt(++i) - 0xDC00);
        out.push(0xF0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3F), 0x80 | ((cp >> 6) & 0x3F), 0x80 | (cp & 0x3F));
      } else {
        out.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 0x3F), 0x80 | (c & 0x3F));
      }
    }
    return out;
  }

  function getNumRawDataModules(ver) {
    var result = (16 * ver + 128) * ver + 64;
    if (ver >= 2) {
      var numAlign = Math.floor(ver / 7) + 2;
      result -= (25 * numAlign - 10) * numAlign - 55;
      if (ver >= 7) result -= 36;
    }
    return result;
  }

  function getNumDataCodewords(ver, ecc) {
    return Math.floor(getNumRawDataModules(ver) / 8)
      - ECC_CODEWORDS_PER_BLOCK[ecc][ver] * NUM_ERROR_CORRECTION_BLOCKS[ecc][ver];
  }

  function getAlignmentPatternPositions(ver) {
    if (ver === 1) return [];
    var numAlign = Math.floor(ver / 7) + 2;
    var step = (ver === 32) ? 26 : Math.ceil((ver * 4 + 4) / (numAlign * 2 - 2)) * 2;
    var result = [6];
    for (var pos = ver * 4 + 10; result.length < numAlign; pos -= step) result.splice(1, 0, pos);
    return result;
  }

  /* --- Reed-Solomon over GF(256), primitive polynomial 0x11D -------------- */

  function rsMultiply(x, y) {
    var z = 0;
    for (var i = 7; i >= 0; i--) {
      z = (z << 1) ^ ((z >>> 7) * 0x11D);
      z ^= ((y >>> i) & 1) * x;
    }
    return z & 0xFF;
  }

  function rsComputeDivisor(degree) {
    var result = [];
    for (var i = 0; i < degree - 1; i++) result.push(0);
    result.push(1);
    var root = 1;
    for (var j = 0; j < degree; j++) {
      for (var k = 0; k < degree; k++) {
        result[k] = rsMultiply(result[k], root);
        if (k + 1 < degree) result[k] ^= result[k + 1];
      }
      root = rsMultiply(root, 0x02);
    }
    return result;
  }

  function rsComputeRemainder(data, divisor) {
    var result = divisor.map(function () { return 0; });
    for (var i = 0; i < data.length; i++) {
      var factor = data[i] ^ result.shift();
      result.push(0);
      for (var j = 0; j < divisor.length; j++) result[j] ^= rsMultiply(divisor[j], factor);
    }
    return result;
  }

  /* --- Data encoding ------------------------------------------------------ */

  /* Byte mode only. URLs are the whole use case here and byte mode covers
     every character; the denser numeric/alphanumeric modes would save a few
     modules on a link that is mostly lowercase anyway. */
  function encodeToCodewords(bytes, version, ecc) {
    var bits = [];
    function append(val, len) {
      for (var i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1);
    }

    append(4, 4);                                        // byte mode indicator
    append(bytes.length, version <= 9 ? 8 : 16);         // character count
    for (var i = 0; i < bytes.length; i++) append(bytes[i], 8);

    var capacityBits = getNumDataCodewords(version, ecc) * 8;
    append(0, Math.min(4, capacityBits - bits.length));  // terminator
    append(0, (8 - bits.length % 8) % 8);                // pad to a whole byte

    for (var pad = 0xEC; bits.length < capacityBits; pad ^= 0xEC ^ 0x11) append(pad, 8);

    var codewords = [];
    for (var j = 0; j < bits.length; j += 8) {
      var b = 0;
      for (var k = 0; k < 8; k++) b = (b << 1) | bits[j + k];
      codewords.push(b);
    }
    return codewords;
  }

  /* Split into blocks, add error correction, then interleave as the spec
     requires so a scratch across the code damages every block a little
     rather than one block fatally. */
  function addEccAndInterleave(data, version, ecc) {
    var numBlocks = NUM_ERROR_CORRECTION_BLOCKS[ecc][version];
    var blockEccLen = ECC_CODEWORDS_PER_BLOCK[ecc][version];
    var rawCodewords = Math.floor(getNumRawDataModules(version) / 8);
    var numShortBlocks = numBlocks - rawCodewords % numBlocks;
    var shortBlockLen = Math.floor(rawCodewords / numBlocks);

    var blocks = [];
    var rsDiv = rsComputeDivisor(blockEccLen);
    for (var i = 0, k = 0; i < numBlocks; i++) {
      var dat = data.slice(k, k + shortBlockLen - blockEccLen + (i < numShortBlocks ? 0 : 1));
      k += dat.length;
      var eccBytes = rsComputeRemainder(dat, rsDiv);
      if (i < numShortBlocks) dat.push(0);   // placeholder, skipped when interleaving
      blocks.push(dat.concat(eccBytes));
    }

    var result = [];
    for (var idx = 0; idx < blocks[0].length; idx++) {
      for (var b = 0; b < blocks.length; b++) {
        if (idx !== shortBlockLen - blockEccLen || b >= numShortBlocks) result.push(blocks[b][idx]);
      }
    }
    return result;
  }

  /* --- Matrix construction ------------------------------------------------ */

  function buildMatrix(version, ecc, allCodewords) {
    var size = version * 4 + 17;
    var modules = [], isFunction = [];
    for (var i = 0; i < size; i++) {
      modules.push(new Array(size).fill(false));
      isFunction.push(new Array(size).fill(false));
    }

    function setFn(x, y, dark) {
      modules[y][x] = dark;
      isFunction[y][x] = true;
    }

    function drawFinder(cx, cy) {
      for (var dy = -4; dy <= 4; dy++) {
        for (var dx = -4; dx <= 4; dx++) {
          var dist = Math.max(Math.abs(dx), Math.abs(dy));
          var x = cx + dx, y = cy + dy;
          if (x >= 0 && x < size && y >= 0 && y < size) setFn(x, y, dist !== 2 && dist !== 4);
        }
      }
    }

    function drawAlignment(cx, cy) {
      for (var dy = -2; dy <= 2; dy++) {
        for (var dx = -2; dx <= 2; dx++) {
          setFn(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
        }
      }
    }

    function drawFormatBits(mask) {
      var data = (ECC_FORMAT_BITS[ecc] << 3) | mask;
      var rem = data;
      for (var i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
      var bits = ((data << 10) | rem) ^ 0x5412;

      for (var j = 0; j <= 5; j++) setFn(8, j, getBit(bits, j));
      setFn(8, 7, getBit(bits, 6));
      setFn(8, 8, getBit(bits, 7));
      setFn(7, 8, getBit(bits, 8));
      for (var k = 9; k < 15; k++) setFn(14 - k, 8, getBit(bits, k));

      for (var m = 0; m < 8; m++) setFn(size - 1 - m, 8, getBit(bits, m));
      for (var n = 8; n < 15; n++) setFn(8, size - 15 + n, getBit(bits, n));
      setFn(8, size - 8, true);   // always dark
    }

    /* Function patterns first: timing, then finders, then alignment. */
    for (var t = 0; t < size; t++) {
      setFn(6, t, t % 2 === 0);
      setFn(t, 6, t % 2 === 0);
    }
    drawFinder(3, 3);
    drawFinder(size - 4, 3);
    drawFinder(3, size - 4);

    var align = getAlignmentPatternPositions(version);
    for (var a = 0; a < align.length; a++) {
      for (var b = 0; b < align.length; b++) {
        var corner = (a === 0 && b === 0) || (a === 0 && b === align.length - 1) || (a === align.length - 1 && b === 0);
        if (!corner) drawAlignment(align[a], align[b]);
      }
    }

    drawFormatBits(0);   // placeholder, rewritten once the mask is chosen

    if (version >= 7) {
      var vrem = version;
      for (var v = 0; v < 12; v++) vrem = (vrem << 1) ^ ((vrem >>> 11) * 0x1F25);
      var vbits = (version << 12) | vrem;
      for (var w = 0; w < 18; w++) {
        var bit = getBit(vbits, w);
        var p = size - 11 + w % 3, q = Math.floor(w / 3);
        setFn(p, q, bit);
        setFn(q, p, bit);
      }
    }

    /* Codewords, laid out in the two-module-wide zigzag from bottom right. */
    var ci = 0;
    for (var right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (var vert = 0; vert < size; vert++) {
        for (var col = 0; col < 2; col++) {
          var x = right - col;
          var upward = ((right + 1) & 2) === 0;
          var y = upward ? size - 1 - vert : vert;
          if (!isFunction[y][x] && ci < allCodewords.length * 8) {
            modules[y][x] = getBit(allCodewords[ci >>> 3], 7 - (ci & 7));
            ci++;
          }
        }
      }
    }

    return { size: size, modules: modules, isFunction: isFunction, drawFormatBits: drawFormatBits };
  }

  function maskBit(mask, x, y) {
    switch (mask) {
      case 0: return (x + y) % 2 === 0;
      case 1: return y % 2 === 0;
      case 2: return x % 3 === 0;
      case 3: return (x + y) % 3 === 0;
      case 4: return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
      case 5: return x * y % 2 + x * y % 3 === 0;
      case 6: return (x * y % 2 + x * y % 3) % 2 === 0;
      default: return ((x + y) % 2 + x * y % 3) % 2 === 0;
    }
  }

  function applyMask(m, mask) {
    for (var y = 0; y < m.size; y++) {
      for (var x = 0; x < m.size; x++) {
        if (!m.isFunction[y][x] && maskBit(mask, x, y)) m.modules[y][x] = !m.modules[y][x];
      }
    }
  }

  /* --- Mask selection ----------------------------------------------------- */

  function finderPenaltyAddHistory(runLength, history, size) {
    if (history[0] === 0) runLength += size;   // pad the leading white border
    history.pop();
    history.unshift(runLength);
  }

  function finderPenaltyCountPatterns(history) {
    var n = history[1];
    var core = n > 0 && history[2] === n && history[3] === n * 3 && history[4] === n && history[5] === n;
    return (core && history[0] >= n * 4 && history[6] >= n ? 1 : 0)
      + (core && history[6] >= n * 4 && history[0] >= n ? 1 : 0);
  }

  function finderPenaltyTerminate(runColor, runLength, history, size) {
    if (runColor) {
      finderPenaltyAddHistory(runLength, history, size);
      runLength = 0;
    }
    finderPenaltyAddHistory(runLength + size, history, size);
    return finderPenaltyCountPatterns(history);
  }

  function getPenaltyScore(m) {
    var size = m.size, mod = m.modules, result = 0, x, y;

    for (y = 0; y < size; y++) {
      var runColor = false, runLen = 0, history = [0, 0, 0, 0, 0, 0, 0];
      for (x = 0; x < size; x++) {
        if (mod[y][x] === runColor) {
          runLen++;
          if (runLen === 5) result += PENALTY_N1;
          else if (runLen > 5) result++;
        } else {
          finderPenaltyAddHistory(runLen, history, size);
          if (!runColor) result += finderPenaltyCountPatterns(history) * PENALTY_N3;
          runColor = mod[y][x];
          runLen = 1;
        }
      }
      result += finderPenaltyTerminate(runColor, runLen, history, size) * PENALTY_N3;
    }

    for (x = 0; x < size; x++) {
      var cColor = false, cLen = 0, cHistory = [0, 0, 0, 0, 0, 0, 0];
      for (y = 0; y < size; y++) {
        if (mod[y][x] === cColor) {
          cLen++;
          if (cLen === 5) result += PENALTY_N1;
          else if (cLen > 5) result++;
        } else {
          finderPenaltyAddHistory(cLen, cHistory, size);
          if (!cColor) result += finderPenaltyCountPatterns(cHistory) * PENALTY_N3;
          cColor = mod[y][x];
          cLen = 1;
        }
      }
      result += finderPenaltyTerminate(cColor, cLen, cHistory, size) * PENALTY_N3;
    }

    for (y = 0; y < size - 1; y++) {
      for (x = 0; x < size - 1; x++) {
        var c = mod[y][x];
        if (c === mod[y][x + 1] && c === mod[y + 1][x] && c === mod[y + 1][x + 1]) result += PENALTY_N2;
      }
    }

    var dark = 0;
    for (y = 0; y < size; y++) for (x = 0; x < size; x++) if (mod[y][x]) dark++;
    var total = size * size;
    var k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
    return result + k * PENALTY_N4;
  }

  /* --- Public API --------------------------------------------------------- */

  function encode(text, eccLevel) {
    var ecc = ECC_CODEWORDS_PER_BLOCK[eccLevel] ? eccLevel : 'M';
    var bytes = toUtf8(String(text));

    var version = 0;
    for (var v = 1; v <= 40; v++) {
      var bitsNeeded = 4 + (v <= 9 ? 8 : 16) + bytes.length * 8;
      if (bitsNeeded <= getNumDataCodewords(v, ecc) * 8) { version = v; break; }
    }
    if (version === 0) throw new Error('QR: text is too long to encode');

    var data = encodeToCodewords(bytes, version, ecc);
    var all = addEccAndInterleave(data, version, ecc);
    var m = buildMatrix(version, ecc, all);

    var bestMask = 0, bestScore = Infinity;
    for (var mask = 0; mask < 8; mask++) {
      applyMask(m, mask);
      m.drawFormatBits(mask);
      var score = getPenaltyScore(m);
      if (score < bestScore) { bestScore = score; bestMask = mask; }
      applyMask(m, mask);   // XOR again to undo
    }
    applyMask(m, bestMask);
    m.drawFormatBits(bestMask);

    return { size: m.size, modules: m.modules, version: version, mask: bestMask, ecc: ecc };
  }

  /* Renders one <path> of merged horizontal runs. Fewer nodes than a rect per
     module, and it scales to any print size without resampling. */
  function toSvg(text, options) {
    var opts = options || {};
    var quiet = opts.quiet == null ? 2 : opts.quiet;   // spec says 4; 2 is enough on screen
    var code = encode(text, opts.ecc || 'M');
    var dim = code.size + quiet * 2;
    var d = '';

    for (var y = 0; y < code.size; y++) {
      var x = 0;
      while (x < code.size) {
        if (!code.modules[y][x]) { x++; continue; }
        var run = 0;
        while (x + run < code.size && code.modules[y][x + run]) run++;
        d += 'M' + (x + quiet) + ' ' + (y + quiet) + 'h' + run + 'v1h-' + run + 'z';
        x += run;
      }
    }

    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + dim + ' ' + dim + '" '
      + 'shape-rendering="crispEdges" role="img" aria-label="' + (opts.label || 'QR code') + '">'
      + '<rect width="' + dim + '" height="' + dim + '" fill="var(--qr-paper, #fff)"/>'
      + '<path d="' + d + '" fill="currentColor"/></svg>';
  }

  return { encode: encode, toSvg: toSvg };
})();

if (typeof window !== 'undefined') window.QR = QR;
/* Node-friendly export so the round-trip test can require this file. */
if (typeof module !== 'undefined' && module.exports) module.exports = QR;
