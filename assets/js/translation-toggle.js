/**
 * translation-toggle.js — Global translation hide/show toggle for lessons.
 *
 * Adds a toggle button to the lesson map that lets students hide all
 * English translations for self-testing. Individual translations can
 * be revealed by clicking on them.
 *
 * State is persisted in localStorage so returning students keep their preference.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'lqwg-translations-hidden';

  document.addEventListener('DOMContentLoaded', function () {
    var lessonBody = document.querySelector('.lesson-body');
    if (!lessonBody) return;

    // Create floating container
    var float = document.createElement('div');
    float.className = 'translation-toggle-float';

    // Create toggle button
    var btn = document.createElement('button');
    btn.className = 'translation-toggle';
    btn.setAttribute('type', 'button');
    btn.setAttribute('aria-pressed', 'false');
    updateButtonText(btn, false);

    float.appendChild(btn);
    document.body.appendChild(float);

    // Check saved state
    var saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'true') {
      toggleState(btn, true);
    }

    // Toggle on click
    btn.addEventListener('click', function () {
      var isHidden = document.body.classList.contains('translations-hidden');
      toggleState(btn, !isHidden);
    });

    // Individual reveal on click (when translations are hidden)
    document.addEventListener('click', function (e) {
      if (!document.body.classList.contains('translations-hidden')) return;

      // Check if click is on a hidden translation element or its ::after pseudo
      var el = e.target;

      // verse-english or verse-tamil
      if ((el.classList.contains('verse-english') || el.classList.contains('verse-tamil'))
          && !el.classList.contains('revealed')) {
        el.classList.add('revealed');
        return;
      }

      // pair-table td
      if (el.tagName === 'TD' && el.parentElement &&
          el.parentElement.parentElement &&
          el.parentElement.parentElement.parentElement &&
          el.parentElement.parentElement.parentElement.classList.contains('pair-table')) {
        var cells = Array.from(el.parentElement.children);
        var idx = cells.indexOf(el);
        if (idx === 1 && !el.classList.contains('revealed')) {
          el.classList.add('revealed');
          return;
        }
      }
    });
  });

  function toggleState(btn, hide) {
    if (hide) {
      document.body.classList.add('translations-hidden');
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      updateButtonText(btn, true);
    } else {
      document.body.classList.remove('translations-hidden');
      btn.classList.remove('active');
      btn.setAttribute('aria-pressed', 'false');
      updateButtonText(btn, false);
      // Remove all individual reveals
      var revealed = document.querySelectorAll('.revealed');
      for (var i = 0; i < revealed.length; i++) {
        revealed[i].classList.remove('revealed');
      }
    }
    try {
      localStorage.setItem(STORAGE_KEY, hide ? 'true' : 'false');
    } catch (e) { /* ignore */ }
  }

  function updateButtonText(btn, hidden) {
    btn.textContent = hidden ? '🔓 Show translations' : '🔒 Hide translations';
  }
})();
