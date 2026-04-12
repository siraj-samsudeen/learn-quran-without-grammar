/**
 * section-feedback.js — Thumbs up / down / flag for lesson content sections.
 *
 * Adds a compact feedback bar to every prose section (delimited by H2
 * headings) and every verse card. Students can signal what they find
 * valuable (👍), what feels like filler (👎), or flag an issue (🚩).
 *
 * Data is stored in localStorage and included in the JSON export
 * alongside review-flags data.
 *
 * Loads AFTER lesson-cards.js (needs .verse-card elements) and
 * AFTER review-flags.js (shares the floating export container).
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'lqwg-section-feedback';
  var USERNAME_KEY = 'lqwg-username';

  // Sections we skip — they don't have meaningful prose to rate
  var SKIP_SECTIONS = { 'review-shuffled': true, 'lesson-map': true };

  document.addEventListener('DOMContentLoaded', function () {
    var body = document.querySelector('.lesson-body');
    if (!body) return;

    var lessonSlug = getLessonSlug();
    var allFeedback = loadFeedback();
    var lessonFb = allFeedback[lessonSlug] || {};

    // ── Prose sections (between H2 headings) ──────────────────
    var h2s = Array.from(body.querySelectorAll('h2'));
    h2s.forEach(function (h2) {
      var sectionId = h2.id || slugify(h2.textContent);
      if (SKIP_SECTIONS[sectionId]) return;

      // Collect elements in this section (up to next H2)
      var sectionEls = [];
      var el = h2.nextElementSibling;
      while (el && el.tagName !== 'H2') {
        sectionEls.push(el);
        el = el.nextElementSibling;
      }

      // Only add feedback if section has visible prose content
      // (skip if it only has verse cards and nothing else)
      var hasProse = sectionEls.some(function (s) {
        return s.tagName === 'P' || s.tagName === 'DIV' || s.tagName === 'TABLE' ||
               (s.tagName === 'UL' || s.tagName === 'OL');
      });
      if (!hasProse) return;

      // Find last non-HR, non-back-to-top element to insert after
      var insertPoint = findInsertPoint(sectionEls, el);
      if (!insertPoint) return;

      var bar = buildFeedbackBar(sectionId, lessonFb[sectionId], lessonSlug);
      insertPoint.parentNode.insertBefore(bar, insertPoint.nextSibling);
    });

    // ── Opening content (before first H2) ─────────────────────
    var firstH2 = h2s[0];
    if (firstH2) {
      var openingEls = [];
      var node = body.firstElementChild;
      while (node && node !== firstH2) {
        openingEls.push(node);
        node = node.nextElementSibling;
      }
      var hasOpeningProse = openingEls.some(function (s) {
        return s.tagName === 'P' || s.tagName === 'DIV';
      });
      if (hasOpeningProse && openingEls.length > 0) {
        var lastOpening = openingEls[openingEls.length - 1];
        var openBar = buildFeedbackBar('opening', lessonFb['opening'], lessonSlug);
        lastOpening.parentNode.insertBefore(openBar, lastOpening.nextSibling);
      }
    }

    // ── Verse cards ───────────────────────────────────────────
    var cards = Array.from(body.querySelectorAll('.verse-card'));
    cards.forEach(function (card, idx) {
      var cardId = 'card:' + getCardId(card, idx);
      var bar = buildFeedbackBar(cardId, lessonFb[cardId], lessonSlug);
      card.appendChild(bar);
    });

    // Refresh export button visibility (may now have feedback data)
    if (typeof window.refreshReviewExportButtons === 'function') {
      window.refreshReviewExportButtons();
    }
  });

  // ── Build feedback bar ─────────────────────────────────────

  function buildFeedbackBar(sectionId, existing, lessonSlug) {
    var bar = document.createElement('div');
    bar.className = 'section-feedback-bar';
    bar.setAttribute('data-section', sectionId);

    var currentValue = existing ? existing.value : null;

    // Thumbs up
    var upBtn = document.createElement('button');
    upBtn.type = 'button';
    upBtn.className = 'sfb-btn sfb-up' + (currentValue === 'up' ? ' active' : '');
    upBtn.textContent = '\uD83D\uDC4D';
    upBtn.title = 'Helpful';

    // Thumbs down
    var downBtn = document.createElement('button');
    downBtn.type = 'button';
    downBtn.className = 'sfb-btn sfb-down' + (currentValue === 'down' ? ' active' : '');
    downBtn.textContent = '\uD83D\uDC4E';
    downBtn.title = 'Not helpful';

    // Flag
    var flagBtn = document.createElement('button');
    flagBtn.type = 'button';
    flagBtn.className = 'sfb-btn sfb-flag' + (currentValue === 'flag' ? ' active' : '');
    flagBtn.textContent = '\uD83D\uDEA9';
    flagBtn.title = 'Flag an issue';

    // Note display (shown when flagged with a note)
    var noteDisplay = document.createElement('span');
    noteDisplay.className = 'sfb-note-display';
    if (existing && existing.note) {
      noteDisplay.textContent = existing.note;
      noteDisplay.style.display = 'inline';
    }

    // Note input (hidden, shown on flag click)
    var noteInput = document.createElement('input');
    noteInput.type = 'text';
    noteInput.className = 'sfb-note-input';
    noteInput.placeholder = "What's the issue?";
    if (existing && existing.note) noteInput.value = existing.note;

    // Save note button
    var saveNoteBtn = document.createElement('button');
    saveNoteBtn.type = 'button';
    saveNoteBtn.className = 'sfb-btn sfb-save-note';
    saveNoteBtn.textContent = 'Save';

    bar.appendChild(upBtn);
    bar.appendChild(downBtn);
    bar.appendChild(flagBtn);
    bar.appendChild(noteDisplay);
    bar.appendChild(noteInput);
    bar.appendChild(saveNoteBtn);

    // ── Events ──

    upBtn.addEventListener('click', function () {
      toggleFeedback(sectionId, 'up', null, lessonSlug, bar);
    });

    downBtn.addEventListener('click', function () {
      toggleFeedback(sectionId, 'down', null, lessonSlug, bar);
    });

    flagBtn.addEventListener('click', function () {
      if (flagBtn.classList.contains('active')) {
        // Un-flag
        toggleFeedback(sectionId, 'flag', null, lessonSlug, bar);
      } else {
        // Show note input
        noteInput.style.display = 'inline-block';
        saveNoteBtn.style.display = 'inline-block';
        noteDisplay.style.display = 'none';
        noteInput.focus();
      }
    });

    saveNoteBtn.addEventListener('click', function () {
      var note = noteInput.value.trim();
      toggleFeedback(sectionId, 'flag', note, lessonSlug, bar);
      noteInput.style.display = 'none';
      saveNoteBtn.style.display = 'none';
    });

    noteInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        saveNoteBtn.click();
      }
    });

    return bar;
  }

  function toggleFeedback(sectionId, value, note, lessonSlug, bar) {
    var feedback = loadFeedback();
    if (!feedback[lessonSlug]) feedback[lessonSlug] = {};

    var current = feedback[lessonSlug][sectionId];
    var isSame = current && current.value === value;

    if (isSame) {
      // Toggle off
      delete feedback[lessonSlug][sectionId];
      if (Object.keys(feedback[lessonSlug]).length === 0) {
        delete feedback[lessonSlug];
      }
    } else {
      var entry = { value: value };
      if (note) entry.note = note;
      feedback[lessonSlug][sectionId] = entry;
    }
    saveFeedback(feedback);
    updateBarUI(bar, isSame ? null : value, isSame ? null : note);
    if (typeof window.refreshReviewExportButtons === 'function') {
      window.refreshReviewExportButtons();
    }
  }

  function updateBarUI(bar, value, note) {
    var upBtn = bar.querySelector('.sfb-up');
    var downBtn = bar.querySelector('.sfb-down');
    var flagBtn = bar.querySelector('.sfb-flag');
    var noteDisplay = bar.querySelector('.sfb-note-display');
    var noteInput = bar.querySelector('.sfb-note-input');
    var saveNoteBtn = bar.querySelector('.sfb-save-note');

    upBtn.classList.toggle('active', value === 'up');
    downBtn.classList.toggle('active', value === 'down');
    flagBtn.classList.toggle('active', value === 'flag');

    noteInput.style.display = 'none';
    saveNoteBtn.style.display = 'none';

    if (value === 'flag' && note) {
      noteDisplay.textContent = note;
      noteDisplay.style.display = 'inline';
    } else {
      noteDisplay.textContent = '';
      noteDisplay.style.display = 'none';
    }
  }

  // ── Insert point: find last prose element before HR or next H2 ──

  function findInsertPoint(sectionEls, nextH2) {
    // Walk backwards from end to find last substantive element
    for (var i = sectionEls.length - 1; i >= 0; i--) {
      var el = sectionEls[i];
      if (el.tagName === 'HR') continue;
      if (el.classList && el.classList.contains('back-to-top')) continue;
      return el;
    }
    return null;
  }

  // ── Public API for review-flags.js to read feedback ─────────

  window.getSectionFeedbackPayload = function (lessonSlug) {
    var feedback = loadFeedback();
    var lessonFb = feedback[lessonSlug] || {};
    if (!Object.keys(lessonFb).length) return null;

    var items = [];
    Object.keys(lessonFb).sort().forEach(function (sectionId) {
      var fb = lessonFb[sectionId];
      var entry = { section: sectionId, value: fb.value };
      if (fb.note) entry.note = fb.note;
      items.push(entry);
    });
    return items;
  };

  // ── Helpers ─────────────────────────────────────────────────

  function getLessonSlug() {
    var path = window.location.pathname;
    var match = path.match(/lessons\/([^/]+)/);
    return match ? match[1] : 'unknown-lesson';
  }

  function getCardId(card, idx) {
    var refEl = card.querySelector('.verse-ref-bottom') || card.querySelector('.verse-ref');
    if (refEl) {
      var verseMatch = refEl.textContent.trim().match(/(\d+:\d+)/);
      if (verseMatch) return verseMatch[1];
    }
    if (card.classList.contains('anchor-card')) return 'anchor-phrase';
    return 'phrase-' + (idx + 1);
  }

  function slugify(text) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  function loadFeedback() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }

  function saveFeedback(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) { /* ignore */ }
  }
})();
