// ── DOM refs ──────────────────────────────────────────────────
const audio         = document.getElementById('audio');
const playPauseBtn  = document.getElementById('play-pause-btn');
const playIcon      = document.getElementById('play-icon');
const pauseIcon     = document.getElementById('pause-icon');
const progress      = document.getElementById('progress');
const progressFill  = document.getElementById('progress-fill');
const currentTimeEl = document.getElementById('current-time');
const durationEl    = document.getElementById('duration');
const currentTitle  = document.getElementById('current-title');
const currentAlbum  = document.getElementById('current-album');
const currentArt    = document.getElementById('current-art');
const artRing       = document.getElementById('art-ring');
const prevBtn       = document.getElementById('prev-btn');
const nextBtn       = document.getElementById('next-btn');
const queueBtn      = document.getElementById('queue-btn');
const queueModal    = document.getElementById('queue-modal');
const queueList     = document.getElementById('queue-list');
const closeQueue    = document.getElementById('close-queue');
const clearQueueBtn = document.getElementById('clear-queue');
const searchInput   = document.getElementById('search');
const randomBtn     = document.getElementById('random-btn');
const mainContent   = document.getElementById('main-content');
const shuffleBtn    = document.getElementById('shuffle-btn');
const volumeSlider  = document.getElementById('volume-slider');
const volumeBtn     = document.getElementById('volume-btn');

// ── State ─────────────────────────────────────────────────────
let albums    = [];
let allTracks = [];
let queue     = [];
let currentIndex = -1;
let isPlaying    = false;

// Active release filter ("all-release" | "released" | "unreleased")
let releaseFilter = 'all-release';

// ── Load JSON ─────────────────────────────────────────────────
fetch('songs.json')
  .then(r => r.json())
  .then(data => {
    albums = data.albums;
    allTracks = albums.flatMap(album =>
      album.tracks.map(track => ({
        ...track,
        albumTitle: album.title,
        albumId:    album.id,
        albumArt:   track.art || album.art,
      }))
    );
    renderAlbums();
  })
  .catch(err => console.error('Error loading JSON:', err));

// ── Render albums ─────────────────────────────────────────────
function renderAlbums() {
  albums.forEach(album => {
    const section = document.createElement('section');
    section.className = 'album';
    section.id = album.id;

    const isArchive = album.id === 'archive';

    section.innerHTML = `
      <div class="album-header">
        <img src="${album.art}" alt="${album.title}" class="album-art" loading="lazy"/>
        <div class="album-info">
          <h2>${album.title}</h2>
          <p class="year">${album.year}</p>
        </div>
      </div>
      <div class="track-list"></div>
    `;

    const trackListEl = section.querySelector('.track-list');

    album.tracks.forEach(track => {
      const div = document.createElement('div');
      div.className = 'track';
      div.dataset.title  = track.title;
      div.dataset.moods  = (track.moods || []).join(' ');
      div.dataset.src    = track.src;
      div.dataset.albumId = album.id;

      div.innerHTML = `
        <img src="${track.art || album.art}" alt="" class="track-art" loading="lazy"/>
        <span class="track-title">${track.title}</span>
        <div class="track-playing-indicator">
          <div class="bar"></div>
          <div class="bar"></div>
          <div class="bar"></div>
          <div class="bar"></div>
        </div>
        <span class="track-duration">${track.duration}</span>
      `;

      div.addEventListener('click', () => addToQueueAndPlay(div));
      trackListEl.appendChild(div);
    });

    mainContent.appendChild(section);
  });
}

// ── Add to queue & play ───────────────────────────────────────
function addToQueueAndPlay(trackEl) {
  const trackData = allTracks.find(t =>
    t.title === trackEl.dataset.title &&
    t.albumId === trackEl.dataset.albumId
  );
  if (!trackData) return;

  const exists = queue.findIndex(q =>
    q.title === trackData.title && q.albumId === trackData.albumId
  );

  if (exists === -1) {
    queue.push(trackData);
    currentIndex = queue.length - 1;
  } else {
    currentIndex = exists;
  }

  playCurrentTrack();
  updateQueueUI();
}

// ── Playback ──────────────────────────────────────────────────
function playCurrentTrack() {
  if (currentIndex < 0 || currentIndex >= queue.length) return;
  const track = queue[currentIndex];

  audio.src = track.src;
  audio.play()
    .then(() => setPlayingState(true))
    .catch(err => console.error('Playback error:', err));

  updatePlayerUI(track);
  highlightPlayingTrack();
}

function updatePlayerUI(track) {
  currentTitle.textContent = track.title;
  currentAlbum.textContent = track.albumTitle;
  currentArt.src = track.albumArt || '';
}

function highlightPlayingTrack() {
  document.querySelectorAll('.track').forEach(t => t.classList.remove('playing'));
  const playing = queue[currentIndex];
  if (!playing) return;
  const el = [...document.querySelectorAll('.track')].find(t =>
    t.dataset.title === playing.title && t.dataset.albumId === playing.albumId
  );
  if (el) el.classList.add('playing');
}

function setPlayingState(playing) {
  isPlaying = playing;
  playIcon.style.display  = playing ? 'none'  : '';
  pauseIcon.style.display = playing ? ''       : 'none';
  artRing.classList.toggle('active', playing);
}

function prevTrack() {
  if (currentIndex > 0) { currentIndex--; playCurrentTrack(); updateQueueUI(); }
}

function nextTrack() {
  if (currentIndex < queue.length - 1) { currentIndex++; playCurrentTrack(); updateQueueUI(); }
}

// ── Queue UI ──────────────────────────────────────────────────
function updateQueueUI() {
  queueList.innerHTML = '';

  queue.forEach((track, idx) => {
    const li = document.createElement('li');
    if (idx === currentIndex) li.classList.add('current');

    li.innerHTML = `
      <span class="queue-track-num">${idx === currentIndex ? '▶' : idx + 1}</span>
      <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${track.title}</span>
      <span style="font-size:0.76rem; color:var(--muted); flex-shrink:0;">${track.albumTitle}</span>
      <button class="remove-btn" title="Remove">×</button>
    `;

    li.querySelector('.remove-btn').addEventListener('click', e => {
      e.stopPropagation();
      removeFromQueue(idx);
    });

    li.addEventListener('click', e => {
      if (e.target.classList.contains('remove-btn')) return;
      currentIndex = idx;
      playCurrentTrack();
      updateQueueUI();
    });

    queueList.appendChild(li);
  });

  // Drag-to-reorder
  Sortable.create(queueList, {
    animation: 150,
    handle: 'li',
    onEnd: evt => {
      const moved = queue.splice(evt.oldIndex, 1)[0];
      queue.splice(evt.newIndex, 0, moved);
      if (evt.oldIndex === currentIndex) {
        currentIndex = evt.newIndex;
      } else if (evt.oldIndex < currentIndex && evt.newIndex >= currentIndex) {
        currentIndex--;
      } else if (evt.oldIndex > currentIndex && evt.newIndex <= currentIndex) {
        currentIndex++;
      }
      updateQueueUI();
    }
  });
}

function removeFromQueue(idx) {
  queue.splice(idx, 1);
  if (idx === currentIndex) {
    currentIndex = Math.min(currentIndex, queue.length - 1);
    if (currentIndex >= 0) playCurrentTrack();
    else { audio.pause(); setPlayingState(false); }
  } else if (idx < currentIndex) {
    currentIndex--;
  }
  updateQueueUI();
  highlightPlayingTrack();
}

// ── Audio events ──────────────────────────────────────────────
audio.addEventListener('timeupdate', () => {
  if (!audio.duration) return;
  const pct = (audio.currentTime / audio.duration) * 100;
  progress.value = pct;
  progressFill.style.width = pct + '%';
  currentTimeEl.textContent = formatTime(audio.currentTime);
});

audio.addEventListener('loadedmetadata', () => {
  durationEl.textContent = formatTime(audio.duration);
});

audio.addEventListener('ended', nextTrack);

audio.addEventListener('play',  () => setPlayingState(true));
audio.addEventListener('pause', () => setPlayingState(false));

// ── Controls ──────────────────────────────────────────────────
playPauseBtn.addEventListener('click', () => {
  if (queue.length === 0) return;
  isPlaying ? audio.pause() : audio.play();
});

progress.addEventListener('input', () => {
  if (!audio.duration) return;
  audio.currentTime = (progress.value / 100) * audio.duration;
  progressFill.style.width = progress.value + '%';
});

prevBtn.addEventListener('click', prevTrack);
nextBtn.addEventListener('click', nextTrack);

// Shuffle btn → download current track
shuffleBtn.addEventListener('click', () => {
  if (!audio.src) return;
  const a = document.createElement('a');
  a.href = audio.src;
  a.download = queue[currentIndex]?.title || 'track';
  a.click();
});

// ── Volume ────────────────────────────────────────────────────
volumeSlider.addEventListener('input', () => {
  audio.volume = volumeSlider.value / 100;
});

let prevVolume = 1;
volumeBtn.addEventListener('click', () => {
  if (audio.volume > 0) {
    prevVolume = audio.volume;
    audio.volume = 0;
    volumeSlider.value = 0;
  } else {
    audio.volume = prevVolume;
    volumeSlider.value = prevVolume * 100;
  }
});

// ── Queue modal ───────────────────────────────────────────────
queueBtn.addEventListener('click', () => {
  updateQueueUI();
  queueModal.style.display = 'flex';
});

closeQueue.addEventListener('click', () => { queueModal.style.display = 'none'; });

queueModal.addEventListener('click', e => {
  if (e.target === queueModal) queueModal.style.display = 'none';
});

clearQueueBtn.addEventListener('click', () => {
  queue = [];
  currentIndex = -1;
  audio.pause();
  setPlayingState(false);
  updateQueueUI();
  document.querySelectorAll('.track').forEach(t => t.classList.remove('playing'));
});

// ── Filters ───────────────────────────────────────────────────
// Mood filter
document.querySelectorAll('.mood-filters button[data-mood]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mood-filters button[data-mood]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filterTracks();
  });
});

// Release filter
document.querySelectorAll('.toggle-btn[data-mood]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    releaseFilter = btn.dataset.mood;
    filterTracks();
  });
});

searchInput.addEventListener('input', filterTracks);

function filterTracks() {
  const query = searchInput.value.toLowerCase();
  const mood  = document.querySelector('.mood-filters button[data-mood].active')?.dataset.mood || 'all';

  document.querySelectorAll('.track').forEach(track => {
    const moods = track.dataset.moods.split(' ');
    const titleMatch   = track.dataset.title.toLowerCase().includes(query);
    const moodMatch    = mood === 'all' || moods.includes(mood);
    const releaseMatch = releaseFilter === 'all-release' ||
                         moods.includes(releaseFilter);
    track.style.display = titleMatch && moodMatch && releaseMatch ? '' : 'none';
  });

  document.querySelectorAll('.album').forEach(album => {
    const visible = album.querySelectorAll('.track:not([style*="display: none"])').length +
                    album.querySelectorAll('.track[style=""]').length;
    // count tracks not explicitly hidden
    const any = [...album.querySelectorAll('.track')].some(t => t.style.display !== 'none');
    album.style.display = any ? '' : 'none';
  });
}

// ── Random ────────────────────────────────────────────────────
randomBtn.addEventListener('click', () => {
  const visible = [...document.querySelectorAll('.track')].filter(t => t.style.display !== 'none');
  if (!visible.length) return;
  const pick = visible[Math.floor(Math.random() * visible.length)];
  addToQueueAndPlay(pick);
});

// ── Helpers ───────────────────────────────────────────────────
function formatTime(s) {
  if (isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}
