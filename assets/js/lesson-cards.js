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
      // Parse heading: "N · form-name" or "⭐ · anchor-name"
      var text = h3.textContent.trim();
      var match = text.match(/^(⭐[\s\d]*|\d+)\s*·\s*(.+)$/);
      if (!match) return; // skip non-verse h3s

      var num = match[1].trim();
      var form = match[2].trim();
      var isAnchor = num.indexOf('⭐') >= 0;

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
      var tamilP = null;
      var hookP = null;
      var hookTaP = null;
      var pairAudioP = null;
      var extras = [];
      var pairTable = null;

      siblings.forEach(function (sib) {
        if (sib.tagName === 'TABLE' && sib.classList.contains('pair-table')) {
          pairTable = sib;
          return;
        }
        // Skip non-paragraph elements (but allow div.lang-ta, div.hook-ta)
        if (sib.tagName === 'DIV' && sib.classList.contains('hook-ta')) {
          hookTaP = sib;
          return;
        }
        if (sib.tagName !== 'P') return;

        // Pair audio (Arabic + translation) — marked with .pair-audio class
        if (sib.classList.contains('pair-audio')) {
          pairAudioP = sib;
          return;
        }
        // Tamil translation (marked with .ta class by Kramdown IAL)
        if (sib.classList.contains('ta')) {
          tamilP = sib;
          return;
        }
        // Tamil hook (marked with .hook-ta class)
        if (sib.classList.contains('hook-ta')) {
          hookTaP = sib;
          return;
        }

        if (!refP && sib.querySelector('audio')) {
          refP = sib;
        } else if (!pairTable && !englishP && isQuoted(sib.textContent)) {
          englishP = sib;
        } else if (!pairTable && !arabicP && hasArabic(sib.textContent)) {
          arabicP = sib;
        } else if (!hookP) {
          hookP = sib;
        } else {
          extras.push(sib);
        }
      });

      // ── Build card ──────────────────────────────────────────────

      var card = document.createElement('div');
      card.className = isAnchor ? 'verse-card anchor-card' : 'verse-card';

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
      card.appendChild(headerRow);

      // Pair table (replaces separate arabic + english for anchor cards)
      if (pairTable) {
        card.appendChild(pairTable);
      }

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

      // Tamil translation
      if (tamilP) {
        var taDiv = document.createElement('div');
        taDiv.className = 'verse-tamil';
        taDiv.innerHTML = tamilP.innerHTML;
        card.appendChild(taDiv);
      }

      // Memory hook (English)
      if (hookP) {
        var hookDiv = document.createElement('div');
        hookDiv.className = 'verse-hook hook-en';
        hookDiv.innerHTML = hookP.innerHTML;
        card.appendChild(hookDiv);
      }

      // Memory hook (Tamil)
      if (hookTaP) {
        var hookTaDiv = document.createElement('div');
        hookTaDiv.className = 'verse-hook hook-ta';
        hookTaDiv.innerHTML = hookTaP.innerHTML;
        card.appendChild(hookTaDiv);
      }

      // Reference + audio at the bottom
      if (refP) {
        ref.className = 'verse-ref-bottom';
        card.appendChild(ref);
      }

      // Pair audio (Arabic + translation) at the bottom
      if (pairAudioP) {
        var pairDiv = document.createElement('div');
        pairDiv.className = 'verse-pair-audio';
        pairDiv.innerHTML = pairAudioP.innerHTML;
        card.appendChild(pairDiv);
      }

      // ── Swap into DOM ───────────────────────────────────────────

      h3.parentNode.insertBefore(card, h3);
      h3.remove();
      if (arabicP) arabicP.remove();
      if (refP) refP.remove();
      if (englishP) englishP.remove();
      if (tamilP) tamilP.remove();
      if (hookP) hookP.remove();
      if (hookTaP) hookTaP.remove();
      if (pairAudioP) pairAudioP.remove();
      extras.forEach(function (p) { p.remove(); });
      if (trailingHr) trailingHr.remove();
    });
  });

  // ── Mutual-exclusion: playing one audio pauses all others ──────────

  document.addEventListener('play', function (e) {
    if (e.target.tagName !== 'AUDIO') return;
    var audios = document.querySelectorAll('audio');
    for (var i = 0; i < audios.length; i++) {
      if (audios[i] !== e.target) {
        audios[i].pause();
      }
    }
  }, true); // capture phase — catches all audio elements in the DOM

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
