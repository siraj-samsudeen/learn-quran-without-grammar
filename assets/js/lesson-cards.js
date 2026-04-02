/**
 * lesson-cards.js — Transforms markdown-rendered verse sections into Option A cards.
 *
 * The lesson markdown produces a predictable HTML pattern per verse:
 *
 *   <h3>N · form-name</h3>
 *   <p>Arabic verse text with <strong>root word</strong></p>
 *   <p>Surah Name N:N · <audio ...></audio></p>
 *   <p>"English translation"</p>
 *   <p>Memory hook text</p>
 *   <hr>
 *
 * This script detects that pattern and wraps each group into a .verse-card
 * div with the proper inner structure. Progressive enhancement — if JS
 * fails, the markdown still renders perfectly readable.
 */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    var body = document.querySelector('.lesson-body');
    if (!body) return;

    var h3s = Array.from(body.querySelectorAll('h3'));

    h3s.forEach(function (h3) {
      // Parse heading: "N · form-name"
      var text = h3.textContent.trim();
      var match = text.match(/^(\d+)\s*·\s*(.+)$/);
      if (!match) return; // skip non-verse h3s (e.g. hadith heading)

      var num = match[1];
      var form = match[2].trim();

      // Collect sibling elements until next section boundary
      var siblings = [];
      var el = h3.nextElementSibling;
      while (el && !isBoundary(el)) {
        siblings.push(el);
        el = el.nextElementSibling;
      }
      var trailingHr = (el && el.tagName === 'HR') ? el : null;

      // Classify paragraphs by content (order-independent detection)
      var refP = null;
      var arabicP = null;
      var englishP = null;
      var hookP = null;
      var extras = [];

      siblings.forEach(function (sib) {
        if (sib.tagName !== 'P') return;

        if (!refP && sib.querySelector('audio')) {
          refP = sib;
        } else if (!englishP && isQuoted(sib.textContent)) {
          englishP = sib;
        } else if (!arabicP && hasArabic(sib.textContent)) {
          arabicP = sib;
        } else if (!hookP) {
          hookP = sib;
        } else {
          extras.push(sib);
        }
      });

      // ── Build card ──────────────────────────────────────────────

      var card = document.createElement('div');
      card.className = 'verse-card';

      // Header row: label (left) + ref with audio (right)
      var headerRow = document.createElement('div');
      headerRow.className = 'header-row';

      var label = document.createElement('div');
      label.className = 'verse-label';
      label.innerHTML =
        '<span class="verse-num">' + num + '</span> ' +
        '<span class="verse-form">' + form + '</span>';

      var ref = document.createElement('span');
      ref.className = 'verse-ref';

      if (refP) {
        // Extract audio elements, then get the remaining text
        var audios = Array.from(refP.querySelectorAll('audio'));
        audios.forEach(function (a) { a.remove(); });
        var refText = refP.textContent.replace(/\s*·\s*$/, '').trim();
        ref.textContent = refText + ' ';
        audios.forEach(function (a) { ref.appendChild(a); });
      }

      headerRow.appendChild(label);
      headerRow.appendChild(ref);
      card.appendChild(headerRow);

      // Arabic text
      if (arabicP) {
        var arabicDiv = document.createElement('div');
        arabicDiv.className = 'verse-arabic';
        arabicDiv.innerHTML = arabicP.innerHTML;
        card.appendChild(arabicDiv);
      }

      // English translation
      if (englishP) {
        var engDiv = document.createElement('div');
        engDiv.className = 'verse-english';
        engDiv.innerHTML = englishP.innerHTML;
        card.appendChild(engDiv);
      }

      // Memory hook
      if (hookP) {
        var hookDiv = document.createElement('div');
        hookDiv.className = 'verse-hook';
        hookDiv.innerHTML = hookP.innerHTML;
        card.appendChild(hookDiv);
      }

      // ── Swap into DOM ───────────────────────────────────────────

      h3.parentNode.insertBefore(card, h3);
      h3.remove();
      if (arabicP) arabicP.remove();
      if (refP) refP.remove();
      if (englishP) englishP.remove();
      if (hookP) hookP.remove();
      extras.forEach(function (p) { p.remove(); });
      if (trailingHr) trailingHr.remove();
    });
  });

  // ── Helpers ─────────────────────────────────────────────────────────

  function isBoundary(el) {
    return el.tagName === 'HR' || el.tagName === 'H2' || el.tagName === 'H3';
  }

  function hasArabic(text) {
    return /[\u0600-\u06FF]/.test(text);
  }

  function isQuoted(text) {
    var ch = text.trim().charAt(0);
    return ch === '"' || ch === '\u201C' || ch === '\u2018';
  }
})();
