/**
 * language-toggle.js — Language switcher for lesson pages.
 *
 * Adds a toggle button (EN ↔ தமிழ்) that switches between English
 * and Tamil content on the page. The active language is saved to
 * localStorage and restored on page load.
 *
 * How it works:
 *   - Adds/removes the 'lang-active-ta' class on <body>
 *   - CSS rules in style.css show/hide .lang-en / .lang-ta elements
 *   - The shuffle player reads the same localStorage key to pick audio
 *
 * Storage key: 'lqwg-language' → 'en' (default) or 'ta'
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'lqwg-language';
  var DEFAULT_LANG = 'en';

  document.addEventListener('DOMContentLoaded', function () {
    var lessonBody = document.querySelector('.lesson-body');
    if (!lessonBody) return;

    // Check if Tamil content exists on this page
    var hasTamil = lessonBody.querySelector('.lang-ta, .verse-tamil, .ta');
    if (!hasTamil) return;

    // Create language toggle button
    var toggleContainer = document.createElement('div');
    toggleContainer.className = 'lang-toggle-container';

    var btnEn = document.createElement('button');
    btnEn.className = 'lang-toggle-btn';
    btnEn.setAttribute('data-lang', 'en');
    btnEn.textContent = 'EN';

    var btnTa = document.createElement('button');
    btnTa.className = 'lang-toggle-btn';
    btnTa.setAttribute('data-lang', 'ta');
    btnTa.textContent = 'தமிழ்';

    toggleContainer.appendChild(btnEn);
    toggleContainer.appendChild(btnTa);

    // Place inside the floating container alongside the Hide translations button
    // translation-toggle.js creates .translation-toggle-float first (loaded before this script)
    var floatContainer = document.querySelector('.translation-toggle-float');
    if (floatContainer) {
      // Insert before the translation toggle button so lang toggle is on the left
      floatContainer.insertBefore(toggleContainer, floatContainer.firstChild);
    } else {
      // Fallback: create own floating container
      var float = document.createElement('div');
      float.className = 'translation-toggle-float';
      float.appendChild(toggleContainer);
      document.body.appendChild(float);
    }

    // Read saved preference
    var saved = DEFAULT_LANG;
    try {
      saved = localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG;
    } catch (e) { /* ignore */ }

    setLanguage(saved);

    // Click handlers
    btnEn.addEventListener('click', function () { setLanguage('en'); });
    btnTa.addEventListener('click', function () { setLanguage('ta'); });

    function setLanguage(lang) {
      if (lang === 'ta') {
        document.body.classList.add('lang-active-ta');
      } else {
        document.body.classList.remove('lang-active-ta');
      }

      // Update button active states
      btnEn.classList.toggle('active', lang === 'en');
      btnTa.classList.toggle('active', lang === 'ta');

      // Save preference
      try {
        localStorage.setItem(STORAGE_KEY, lang);
      } catch (e) { /* ignore */ }

      // Dispatch custom event so other scripts (shuffle player) can react
      document.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang: lang } }));
    }
  });
})();
