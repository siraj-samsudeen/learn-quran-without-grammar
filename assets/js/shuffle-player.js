/**
 * shuffle-player.js — Random-order Quranic sentence player
 *
 * Plays sentence-pair audio files (Arabic → pause → English) in
 * shuffled order. Designed for the "Learn Quran Without Grammar" project.
 *
 * Features:
 *   - Loads sentences from one or more lesson manifest.json files
 *   - Shuffles playback order (re-shuffles each cycle)
 *   - Play / Pause / Next / Previous controls
 *   - Shows current sentence info (Arabic text, English, reference)
 *   - Continuous loop through all loaded sentences
 *   - Filter by role (learn / practice / all)
 *
 * Usage:
 *   <div id="shuffle-player"></div>
 *   <script src="/assets/js/shuffle-player.js"></script>
 *   <script>
 *     ShufflePlayer.init('shuffle-player', {
 *       manifests: [
 *         '/assets/audio/lessons/lesson-01/manifest.json'
 *       ]
 *     });
 *   </script>
 */

const ShufflePlayer = (() => {
  // ── State ────────────────────────────────────────────────────────────

  let sentences = [];       // all loaded sentences (flat array)
  let playlist = [];        // shuffled indices into sentences[]
  let currentIndex = 0;     // position in playlist
  let audio = null;         // HTMLAudioElement
  let containerEl = null;   // DOM container
  let baseUrls = [];        // base URLs for resolving audio file paths
  let isPlaying = false;
  let roleFilter = 'all';   // 'all', 'learn', 'practice'

  // ── Shuffle (Fisher-Yates) ───────────────────────────────────────────

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ── Playlist Management ──────────────────────────────────────────────

  function buildPlaylist() {
    const indices = [];
    for (let i = 0; i < sentences.length; i++) {
      if (roleFilter === 'all' || sentences[i].role === roleFilter) {
        indices.push(i);
      }
    }
    playlist = shuffle(indices);
    currentIndex = 0;
  }

  function currentSentence() {
    if (playlist.length === 0) return null;
    return sentences[playlist[currentIndex]];
  }

  function audioUrl(sentence) {
    return sentence._baseUrl + '/' + sentence.file;
  }

  // ── Playback ─────────────────────────────────────────────────────────

  function playCurrent() {
    const s = currentSentence();
    if (!s) return;

    audio.src = audioUrl(s);
    audio.play().catch(() => {});
    isPlaying = true;
    updateUI();
  }

  function playPause() {
    if (!audio.src || playlist.length === 0) {
      playCurrent();
      return;
    }

    if (isPlaying) {
      audio.pause();
      isPlaying = false;
    } else {
      audio.play().catch(() => {});
      isPlaying = true;
    }
    updateUI();
  }

  function next() {
    currentIndex++;
    if (currentIndex >= playlist.length) {
      // Re-shuffle for the next cycle
      buildPlaylist();
    }
    playCurrent();
  }

  function previous() {
    currentIndex--;
    if (currentIndex < 0) {
      currentIndex = playlist.length - 1;
    }
    playCurrent();
  }

  function onEnded() {
    // Auto-advance to next sentence after a brief pause
    setTimeout(() => next(), 1500);
  }

  // ── Filter ───────────────────────────────────────────────────────────

  function setFilter(role) {
    roleFilter = role;
    buildPlaylist();
    updateUI();
  }

  // ── UI ───────────────────────────────────────────────────────────────

  function render() {
    containerEl.innerHTML = `
      <div class="sp-player">
        <div class="sp-info">
          <div class="sp-arabic" dir="rtl"></div>
          <div class="sp-english"></div>
          <div class="sp-meta"></div>
        </div>
        <div class="sp-controls">
          <button class="sp-btn sp-prev" title="Previous">⏮</button>
          <button class="sp-btn sp-play" title="Play / Pause">▶</button>
          <button class="sp-btn sp-next" title="Next">⏭</button>
        </div>
        <div class="sp-progress">
          <div class="sp-progress-bar"></div>
        </div>
        <div class="sp-filters">
          <button class="sp-filter-btn" data-role="all">All</button>
          <button class="sp-filter-btn" data-role="learn">Learn</button>
          <button class="sp-filter-btn" data-role="practice">Practice</button>
        </div>
        <div class="sp-counter"></div>
      </div>
    `;

    // Attach event listeners
    containerEl.querySelector('.sp-play').addEventListener('click', playPause);
    containerEl.querySelector('.sp-next').addEventListener('click', next);
    containerEl.querySelector('.sp-prev').addEventListener('click', previous);

    containerEl.querySelectorAll('.sp-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => setFilter(btn.dataset.role));
    });

    // Inject styles if not already present
    if (!document.getElementById('sp-styles')) {
      const style = document.createElement('style');
      style.id = 'sp-styles';
      style.textContent = SP_STYLES;
      document.head.appendChild(style);
    }
  }

  function updateUI() {
    const s = currentSentence();

    // Info
    const arabicEl = containerEl.querySelector('.sp-arabic');
    const englishEl = containerEl.querySelector('.sp-english');
    const metaEl = containerEl.querySelector('.sp-meta');

    if (s) {
      arabicEl.textContent = s.arabic_text || '';
      englishEl.textContent = s.english || '';
      const roleLabel = s.role ? s.role.charAt(0).toUpperCase() + s.role.slice(1) : '';
      metaEl.textContent = `${s.ref || ''} · ${roleLabel} · ${s.root || ''}`;
    } else {
      arabicEl.textContent = 'No sentences loaded';
      englishEl.textContent = '';
      metaEl.textContent = '';
    }

    // Play button
    const playBtn = containerEl.querySelector('.sp-play');
    playBtn.textContent = isPlaying ? '⏸' : '▶';

    // Counter
    const counterEl = containerEl.querySelector('.sp-counter');
    const filtered = playlist.length;
    const total = sentences.length;
    counterEl.textContent = filtered > 0
      ? `${currentIndex + 1} / ${filtered} sentences` + (filtered < total ? ` (${total} total)` : '')
      : 'No sentences';

    // Filter buttons
    containerEl.querySelectorAll('.sp-filter-btn').forEach(btn => {
      btn.classList.toggle('sp-active', btn.dataset.role === roleFilter);
    });
  }

  function updateProgress() {
    if (!audio || !audio.duration) return;
    const pct = (audio.currentTime / audio.duration) * 100;
    const bar = containerEl.querySelector('.sp-progress-bar');
    if (bar) bar.style.width = pct + '%';
  }

  // ── Loading ──────────────────────────────────────────────────────────

  async function loadManifest(url) {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Failed to load manifest: ${url}`);
    const data = await resp.json();

    // Base URL for audio files = directory containing manifest.json
    const baseUrl = url.substring(0, url.lastIndexOf('/'));

    // Attach base URL to each sentence
    const lessonSentences = data.sentences.map(s => ({
      ...s,
      _baseUrl: baseUrl,
      _lessonId: data.lesson_id,
      _lessonTitle: data.title,
    }));

    return lessonSentences;
  }

  async function loadManifests(urls) {
    const results = await Promise.all(urls.map(loadManifest));
    sentences = results.flat();
    buildPlaylist();
    updateUI();
  }

  // ── Init ─────────────────────────────────────────────────────────────

  async function init(containerId, options = {}) {
    containerEl = document.getElementById(containerId);
    if (!containerEl) {
      console.error(`ShufflePlayer: container #${containerId} not found`);
      return;
    }

    // Create audio element
    audio = new Audio();
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('pause', () => { isPlaying = false; updateUI(); });
    audio.addEventListener('play', () => { isPlaying = true; updateUI(); });

    // Render UI
    render();

    // Load manifests
    const manifests = options.manifests || [];
    if (manifests.length > 0) {
      try {
        await loadManifests(manifests);
      } catch (err) {
        console.error('ShufflePlayer: failed to load manifests', err);
        containerEl.querySelector('.sp-english').textContent = 'Error loading audio data';
      }
    }
  }

  // ── Styles ───────────────────────────────────────────────────────────

  const SP_STYLES = `
    .sp-player {
      background: #1a1a2e;
      border-radius: 12px;
      padding: 1.5rem;
      max-width: 600px;
      margin: 1.5rem auto;
      color: #e0e0e0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }

    .sp-info {
      text-align: center;
      margin-bottom: 1.2rem;
      min-height: 100px;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .sp-arabic {
      font-size: 1.5rem;
      line-height: 2.2;
      color: #f0c040;
      font-family: 'Amiri', 'Scheherazade New', 'Traditional Arabic', serif;
      margin-bottom: 0.6rem;
    }

    .sp-english {
      font-size: 1rem;
      color: #c0c0c0;
      line-height: 1.5;
      margin-bottom: 0.4rem;
    }

    .sp-meta {
      font-size: 0.8rem;
      color: #808080;
    }

    .sp-controls {
      display: flex;
      justify-content: center;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .sp-btn {
      background: #16213e;
      border: 1px solid #0f3460;
      color: #e0e0e0;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      font-size: 1.2rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;
    }

    .sp-btn:hover {
      background: #0f3460;
    }

    .sp-btn.sp-play {
      width: 56px;
      height: 56px;
      font-size: 1.4rem;
      background: #0f3460;
    }

    .sp-progress {
      height: 4px;
      background: #16213e;
      border-radius: 2px;
      margin-bottom: 1rem;
      overflow: hidden;
    }

    .sp-progress-bar {
      height: 100%;
      background: #e94560;
      border-radius: 2px;
      width: 0%;
      transition: width 0.3s;
    }

    .sp-filters {
      display: flex;
      justify-content: center;
      gap: 0.5rem;
      margin-bottom: 0.6rem;
    }

    .sp-filter-btn {
      background: transparent;
      border: 1px solid #333;
      color: #808080;
      padding: 0.3rem 0.8rem;
      border-radius: 16px;
      font-size: 0.8rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .sp-filter-btn:hover {
      border-color: #555;
      color: #c0c0c0;
    }

    .sp-filter-btn.sp-active {
      background: #0f3460;
      border-color: #0f3460;
      color: #e0e0e0;
    }

    .sp-counter {
      text-align: center;
      font-size: 0.75rem;
      color: #606060;
    }
  `;

  // ── Public API ───────────────────────────────────────────────────────

  return {
    init,
    next,
    previous,
    playPause,
    setFilter,
  };
})();
