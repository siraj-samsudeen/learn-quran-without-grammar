/**
 * review-flags.js — In-page issue flagging for lesson review.
 *
 * Adds a flag button to each .verse-card. Clicking it opens a compact
 * inline form with category chips (Arabic, Eng, Audio, Hook, Other)
 * and a free-text note. Flagged issues persist in localStorage and can
 * be exported as YAML for processing.
 *
 * Loads AFTER language-toggle.js (which creates .translation-toggle-float).
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'lqwg-review-flags';
  var CATEGORIES = ['Arabic', 'Eng', 'Audio', 'Hook', 'Other'];
  var CHIP_COLORS = {
    Arabic:  { bg: '#e8f5ee', border: '#1a6b3a', text: '#1a6b3a' },
    Eng:     { bg: '#e8f0fe', border: '#1a56db', text: '#1a56db' },
    Audio:   { bg: '#fef3c7', border: '#b8930a', text: '#92740a' },
    Hook:    { bg: '#fce7f3', border: '#be185d', text: '#be185d' },
    Other:   { bg: '#f3f4f6', border: '#636366', text: '#636366' }
  };

  document.addEventListener('DOMContentLoaded', function () {
    var lessonBody = document.querySelector('.lesson-body');
    if (!lessonBody) return;

    var lessonSlug = getLessonSlug();
    var allFlags = loadFlags();
    var lessonFlags = allFlags[lessonSlug] || {};

    var cards = Array.from(document.querySelectorAll('.verse-card'));
    if (!cards.length) return;

    // Inject flag UI into each card
    cards.forEach(function (card, idx) {
      var cardId = getCardId(card, idx);
      setupCard(card, cardId, lessonFlags[cardId]);
    });

    // Add export button to floating container
    setupExportButton(lessonSlug, lessonFlags);
  });

  // ── Card Setup ────────────────────────────────────────────────

  function setupCard(card, cardId, existingFlag) {
    // Flag button (top-right of card)
    var flagBtn = document.createElement('button');
    flagBtn.className = 'review-flag-btn';
    flagBtn.setAttribute('type', 'button');
    flagBtn.setAttribute('title', 'Flag issue on this card');
    flagBtn.textContent = existingFlag ? '\u2691' : '\u2690'; // filled vs outline flag
    if (existingFlag) flagBtn.classList.add('flagged');
    card.appendChild(flagBtn);

    // Issue summary (visible when flagged)
    var summary = document.createElement('div');
    summary.className = 'review-flag-summary';
    if (existingFlag) {
      summary.innerHTML = buildSummaryHTML(existingFlag);
      summary.style.display = 'block';
    }
    card.appendChild(summary);

    // Inline form (hidden by default)
    var form = document.createElement('div');
    form.className = 'review-flag-form';
    form.innerHTML = buildFormHTML(existingFlag);
    card.appendChild(form);

    // If flagged, add border highlight
    if (existingFlag) card.classList.add('review-flagged');

    // ── Event: flag button click ──
    flagBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var isOpen = form.style.display === 'block';
      if (isOpen) {
        form.style.display = 'none';
        summary.style.display = lessonFlags()[cardId] ? 'block' : 'none';
      } else {
        form.style.display = 'block';
        summary.style.display = 'none';
        // Pre-select chip if editing
        var saved = lessonFlags()[cardId];
        if (saved) {
          activateChip(form, saved.type);
        }
      }
    });

    // ── Event: chip selection ──
    var chips = form.querySelectorAll('.review-chip');
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        chips.forEach(function (c) { c.classList.remove('active'); });
        chip.classList.add('active');
      });
    });

    // ── Event: save button ──
    form.querySelector('.review-save-btn').addEventListener('click', function () {
      var activeChip = form.querySelector('.review-chip.active');
      var noteInput = form.querySelector('.review-note-input');
      if (!activeChip) {
        noteInput.setAttribute('placeholder', 'Pick a category first!');
        return;
      }
      var type = activeChip.getAttribute('data-type');
      var note = noteInput.value.trim();

      var flags = loadFlags();
      var lessonSlug = getLessonSlug();
      if (!flags[lessonSlug]) flags[lessonSlug] = {};
      flags[lessonSlug][cardId] = { type: type, note: note };
      saveFlags(flags);

      // Update UI
      flagBtn.textContent = '\u2691';
      flagBtn.classList.add('flagged');
      card.classList.add('review-flagged');
      summary.innerHTML = buildSummaryHTML({ type: type, note: note });
      summary.style.display = 'block';
      form.style.display = 'none';
      updateExportButton(lessonSlug);
    });

    // ── Event: clear button ──
    form.querySelector('.review-clear-btn').addEventListener('click', function () {
      var flags = loadFlags();
      var lessonSlug = getLessonSlug();
      if (flags[lessonSlug]) {
        delete flags[lessonSlug][cardId];
        if (Object.keys(flags[lessonSlug]).length === 0) {
          delete flags[lessonSlug];
        }
      }
      saveFlags(flags);

      // Update UI
      flagBtn.textContent = '\u2690';
      flagBtn.classList.remove('flagged');
      card.classList.remove('review-flagged');
      summary.innerHTML = '';
      summary.style.display = 'none';
      form.style.display = 'none';
      // Reset form
      form.innerHTML = buildFormHTML(null);
      rebindFormEvents(form, card, flagBtn, summary, cardId);
      updateExportButton(lessonSlug);
    });

    // Helper: get current lesson flags (live from storage)
    function lessonFlags() {
      var flags = loadFlags();
      return flags[getLessonSlug()] || {};
    }
  }

  // Re-bind events after form innerHTML reset
  function rebindFormEvents(form, card, flagBtn, summary, cardId) {
    var chips = form.querySelectorAll('.review-chip');
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        chips.forEach(function (c) { c.classList.remove('active'); });
        chip.classList.add('active');
      });
    });

    form.querySelector('.review-save-btn').addEventListener('click', function () {
      var activeChip = form.querySelector('.review-chip.active');
      var noteInput = form.querySelector('.review-note-input');
      if (!activeChip) {
        noteInput.setAttribute('placeholder', 'Pick a category first!');
        return;
      }
      var type = activeChip.getAttribute('data-type');
      var note = noteInput.value.trim();

      var flags = loadFlags();
      var lessonSlug = getLessonSlug();
      if (!flags[lessonSlug]) flags[lessonSlug] = {};
      flags[lessonSlug][cardId] = { type: type, note: note };
      saveFlags(flags);

      flagBtn.textContent = '\u2691';
      flagBtn.classList.add('flagged');
      card.classList.add('review-flagged');
      summary.innerHTML = buildSummaryHTML({ type: type, note: note });
      summary.style.display = 'block';
      form.style.display = 'none';
      updateExportButton(lessonSlug);
    });

    form.querySelector('.review-clear-btn').addEventListener('click', function () {
      var flags = loadFlags();
      var lessonSlug = getLessonSlug();
      if (flags[lessonSlug]) {
        delete flags[lessonSlug][cardId];
        if (Object.keys(flags[lessonSlug]).length === 0) {
          delete flags[lessonSlug];
        }
      }
      saveFlags(flags);

      flagBtn.textContent = '\u2690';
      flagBtn.classList.remove('flagged');
      card.classList.remove('review-flagged');
      summary.innerHTML = '';
      summary.style.display = 'none';
      form.style.display = 'none';
      form.innerHTML = buildFormHTML(null);
      rebindFormEvents(form, card, flagBtn, summary, cardId);
      updateExportButton(lessonSlug);
    });
  }

  // ── Export Button ─────────────────────────────────────────────

  function setupExportButton(lessonSlug, lessonFlags) {
    var float = document.querySelector('.translation-toggle-float');
    if (!float) return;

    var count = Object.keys(lessonFlags).length;

    // Copy button
    var copyBtn = document.createElement('button');
    copyBtn.className = 'review-export-btn review-copy-btn';
    copyBtn.setAttribute('type', 'button');
    copyBtn.style.display = count > 0 ? 'inline-flex' : 'none';
    updateCopyBtnText(copyBtn, count);
    copyBtn.addEventListener('click', function () {
      copyIssuesToClipboard(lessonSlug);
    });

    // Download button
    var dlBtn = document.createElement('button');
    dlBtn.className = 'review-export-btn review-download-btn';
    dlBtn.setAttribute('type', 'button');
    dlBtn.textContent = '\u2913';  // downwards arrow
    dlBtn.setAttribute('title', 'Download issues as YAML file');
    dlBtn.style.display = count > 0 ? 'inline-flex' : 'none';
    dlBtn.addEventListener('click', function () {
      downloadAsJSON(lessonSlug);
    });

    // Insert: [download] [copy] [lang toggle] [translation toggle]
    float.insertBefore(dlBtn, float.firstChild);
    float.insertBefore(copyBtn, float.firstChild);

    // Create toast element
    var toast = document.createElement('div');
    toast.className = 'review-toast';
    toast.id = 'review-toast';
    document.body.appendChild(toast);
  }

  function updateCopyBtnText(btn, count) {
    btn.textContent = count > 0 ? 'Copy ' + count + ' issue' + (count > 1 ? 's' : '') : '';
  }

  function updateExportButton(lessonSlug) {
    var copyBtn = document.querySelector('.review-copy-btn');
    var dlBtn = document.querySelector('.review-download-btn');
    var flags = loadFlags();
    var lessonFlags = flags[lessonSlug] || {};
    var count = Object.keys(lessonFlags).length;
    if (copyBtn) {
      updateCopyBtnText(copyBtn, count);
      copyBtn.style.display = count > 0 ? 'inline-flex' : 'none';
    }
    if (dlBtn) {
      dlBtn.style.display = count > 0 ? 'inline-flex' : 'none';
    }
  }

  function buildPayload(lessonSlug) {
    var flags = loadFlags();
    var lessonFlags = flags[lessonSlug] || {};
    if (!Object.keys(lessonFlags).length) return null;

    var issues = [];
    var keys = Object.keys(lessonFlags).sort(function (a, b) {
      return a.localeCompare(b);
    });

    keys.forEach(function (cardId) {
      var flag = lessonFlags[cardId];
      var entry = { card: cardId, type: flag.type.toLowerCase() };
      if (flag.note) entry.note = flag.note;
      issues.push(entry);
    });

    var payload = {
      lesson: lessonSlug,
      date: new Date().toISOString().slice(0, 10),
      issues: issues
    };
    var username = getUsername();
    if (username) payload.username = username;
    return payload;
  }

  function downloadAsJSON(lessonSlug) {
    var payload = buildPayload(lessonSlug);
    if (!payload) return;
    var json = JSON.stringify(payload, null, 2);
    var blob = new Blob([json], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = lessonSlug + '-review.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function copyIssuesToClipboard(lessonSlug) {
    var payload = buildPayload(lessonSlug);
    if (!payload) return;
    var json = JSON.stringify(payload, null, 2);

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(json).then(function () {
        showReviewToast('Copied! Paste into WhatsApp or email.');
      }).catch(function () {
        fallbackCopy(json);
      });
    } else {
      fallbackCopy(json);
    }
  }

  function fallbackCopy(text) {
    var textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      showReviewToast('Copied! Paste into WhatsApp or email.');
    } catch (e) {
      showReviewToast('Could not copy — try again.');
    }
    document.body.removeChild(textarea);
  }

  function showReviewToast(message) {
    var toast = document.getElementById('review-toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(function () {
      toast.classList.remove('show');
    }, 2500);
  }

  // ── HTML Builders ─────────────────────────────────────────────

  function buildFormHTML(existing) {
    var html = '<div class="review-chips">';
    CATEGORIES.forEach(function (cat) {
      var isActive = existing && existing.type === cat ? ' active' : '';
      html += '<button type="button" class="review-chip' + isActive + '" data-type="' + cat + '">' + cat + '</button>';
    });
    html += '</div>';
    html += '<input type="text" class="review-note-input" placeholder="What\'s wrong?" value="' + (existing ? escapeAttr(existing.note) : '') + '">';
    html += '<div class="review-form-actions">';
    html += '<button type="button" class="review-save-btn">Save</button>';
    html += '<button type="button" class="review-clear-btn">Clear</button>';
    html += '</div>';
    return html;
  }

  function buildSummaryHTML(flag) {
    var colors = CHIP_COLORS[flag.type] || CHIP_COLORS.Other;
    var html = '<span class="review-summary-badge" style="background:' + colors.bg + ';color:' + colors.text + ';border-color:' + colors.border + '">' + flag.type + '</span>';
    if (flag.note) {
      html += ' <span class="review-summary-note">' + escapeHTML(flag.note) + '</span>';
    }
    return html;
  }

  // ── Username ──────────────────────────────────────────────────

  var USERNAME_KEY = 'lqwg-username';

  function getUsername() {
    var name = localStorage.getItem(USERNAME_KEY);
    if (name) return name;
    name = prompt('Enter your name (saved for future reviews):');
    if (name && name.trim()) {
      name = name.trim();
      localStorage.setItem(USERNAME_KEY, name);
      return name;
    }
    return null;
  }

  // ── Helpers ───────────────────────────────────────────────────

  function getLessonSlug() {
    // Extract from URL path: /lessons/lesson-01-allahu-akbar/ → lesson-01-allahu-akbar
    var path = window.location.pathname;
    var match = path.match(/lessons\/([^/]+)/);
    return match ? match[1] : 'unknown-lesson';
  }

  function getCardId(card, idx) {
    // Try to extract verse reference (e.g., "59:22") from the card
    var refEl = card.querySelector('.verse-ref-bottom') || card.querySelector('.verse-ref');
    if (refEl) {
      var refText = refEl.textContent.trim();
      // Match patterns like "59:22" or "2:34"
      var verseMatch = refText.match(/(\d+:\d+)/);
      if (verseMatch) return verseMatch[1];
    }
    // For anchor/teaching phrases without a standard verse ref, use position
    if (card.classList.contains('anchor-card')) return 'anchor-phrase';
    return 'teaching-phrase-' + (idx + 1);
  }

  function activateChip(form, type) {
    var chips = form.querySelectorAll('.review-chip');
    chips.forEach(function (c) {
      c.classList.toggle('active', c.getAttribute('data-type') === type);
    });
  }

  function loadFlags() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }

  function saveFlags(flags) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(flags));
    } catch (e) { /* ignore */ }
  }

  function escapeHTML(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return str ? str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
  }
})();
