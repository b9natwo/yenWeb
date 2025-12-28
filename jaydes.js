const audio = document.getElementById('audio');
const playPauseBtn = document.getElementById('play-pause-btn');
const progress = document.getElementById('progress');
const currentTimeEl = document.getElementById('current-time');
const durationEl = document.getElementById('duration');
const currentTitle = document.getElementById('current-title');
const currentAlbum = document.getElementById('current-album');
const currentArt = document.getElementById('current-art');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const queueBtn = document.getElementById('queue-btn');
const queueModal = document.getElementById('queue-modal');
const queueList = document.getElementById('queue-list');
const closeQueue = document.getElementById('close-queue');
const searchInput = document.getElementById('search');
const randomBtn = document.getElementById('random-btn');
const mainContent = document.getElementById('main-content');

let albums = [];
let allTracks = [];
let queue = [];
let currentIndex = -1;
let isPlaying = false;

// Load JSON data
fetch('songs.json')
  .then(response => response.json())
  .then(data => {
    albums = data.albums;
    renderAlbums();
    allTracks = albums.flatMap(album => album.tracks.map(track => ({
      ...track,
      albumTitle: album.title,
      albumArt: album.art,
      moods: track.moods
    })));
  })
  .catch(error => console.error('Error loading JSON:', error));

function renderAlbums() {
  albums.forEach(album => {
    const albumSection = document.createElement('section');
    albumSection.className = 'album';
    albumSection.id = album.id;

    const header = `
      <div class="album-header">
        <img src="${album.art}" alt="${album.title}" class="album-art"/>
        <div class="album-info">
          <h2>${album.title}</h2>
          <p class="year">${album.year}</p>
        </div>
      </div>
      <div class="track-list"></div>
    `;

    albumSection.innerHTML = header;
    const trackListEl = albumSection.querySelector('.track-list');

    album.tracks.forEach(track => {
      const trackEl = document.createElement('div');
      trackEl.className = 'track';
      trackEl.dataset.title = track.title;
      trackEl.dataset.moods = track.moods.join(' ');
      trackEl.dataset.src = track.src;
      trackEl.dataset.preview = track.preview;
      trackEl.innerHTML = `
        <span class="track-title">${track.title}</span>
        <span class="track-duration">${track.duration}</span>
      `;
      trackEl.addEventListener('click', () => addToQueueAndPlay(trackEl));
      trackListEl.appendChild(trackEl);
    });

    mainContent.appendChild(albumSection);
  });
}

function addToQueueAndPlay(trackEl) {
  const trackData = allTracks.find(t => t.title === trackEl.dataset.title && t.albumTitle === trackEl.closest('.album').querySelector('h2').textContent);
  if (!trackData) return;

  // Add to queue if not already there
  if (!queue.some(q => q.title === trackData.title && q.albumTitle === trackData.albumTitle)) {
    queue.push(trackData);
  }

  currentIndex = queue.findIndex(q => q.title === trackData.title && q.albumTitle === trackData.albumTitle);
  playCurrentTrack();
  updateQueueUI();
}

// Shuffle
const shuffleBtn = document.getElementById('shuffle-btn');
let shuffleMode = false;

shuffleBtn.addEventListener('click', () => {
  shuffleMode = !shuffleMode;
  shuffleBtn.classList.toggle('active', shuffleMode);
});

// Volume
const volumeSlider = document.getElementById('volume-slider');
const volumeBtn = document.getElementById('volume-btn');

volumeSlider.addEventListener('input', () => {
  audio.volume = volumeSlider.value / 100;
  updateVolumeIcon();
});

function updateVolumeIcon() {
  if (audio.volume === 0) {
    volumeBtn.textContent = '🔇';
  } else if (audio.volume < 0.5) {
    volumeBtn.textContent = '🔉';
  } else {
    volumeBtn.textContent = '🔊';
  }
}

volumeBtn.addEventListener('click', () => {
  if (audio.volume > 0) {
    audio.volume = 0;
    volumeSlider.value = 0;
  } else {
    audio.volume = 1;
    volumeSlider.value = 100;
  }
  updateVolumeIcon();
});

// Initial icon
updateVolumeIcon();

function playCurrentTrack() {
  if (currentIndex < 0 || currentIndex >= queue.length) return;

  const track = queue[currentIndex];
  audio.src = track.src;
  audio.play().then(() => {
    isPlaying = true;
    playPauseBtn.textContent = '❚❚';
  }).catch(error => console.error('Playback error:', error));

  updatePlayerUI(track);
  highlightPlayingTrack();
}

function updatePlayerUI(track) {
  currentTitle.textContent = track.title;
  currentAlbum.textContent = track.albumTitle;
  currentArt.src = track.albumArt || 'https://via.placeholder.com/54/111/222?text=';
}

function highlightPlayingTrack() {
  document.querySelectorAll('.track').forEach(t => t.classList.remove('playing'));
  const playingTrackEl = [...document.querySelectorAll('.track')].find(t => t.dataset.title === queue[currentIndex].title);
  if (playingTrackEl) playingTrackEl.classList.add('playing');
}

function updateQueueUI() {
  queueList.innerHTML = '';
  queue.forEach((track, idx) => {
    const li = document.createElement('li');
    li.textContent = `${track.title} - ${track.albumTitle}`;
    if (idx === currentIndex) li.style.fontWeight = 'bold';
    li.addEventListener('click', () => {
      currentIndex = idx;
      playCurrentTrack();
      updateQueueUI();
    });
    queueList.appendChild(li);
  });
}

function formatTime(seconds) {
  if (isNaN(seconds)) return '0:00';
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

// Audio events
audio.addEventListener('timeupdate', () => {
  if (!audio.duration) return;
  const percent = (audio.currentTime / audio.duration) * 100;
  progress.value = percent;
  progress.style.setProperty('--progress', `${percent}%`);
  currentTimeEl.textContent = formatTime(audio.currentTime);
});

audio.addEventListener('loadedmetadata', () => {
  durationEl.textContent = formatTime(audio.duration);
});

audio.addEventListener('ended', () => {
  nextTrack();
});

audio.addEventListener('play', () => {
  isPlaying = true;
  playPauseBtn.textContent = '❚❚';
});

audio.addEventListener('pause', () => {
  isPlaying = false;
  playPauseBtn.textContent = '▶';
});

// Controls
playPauseBtn.addEventListener('click', () => {
  if (isPlaying) {
    audio.pause();
  } else {
    audio.play();
  }
});

progress.addEventListener('input', () => {
  if (!audio.duration) return;
  audio.currentTime = (progress.value / 100) * audio.duration;
});

prevBtn.addEventListener('click', prevTrack);
nextBtn.addEventListener('click', nextTrack);

function prevTrack() {
  if (currentIndex > 0) {
    currentIndex--;
    playCurrentTrack();
  }
}

function nextTrack() {
  if (currentIndex < queue.length - 1) {
    currentIndex++;
    playCurrentTrack();
  }
}

// Queue modal
queueBtn.addEventListener('click', () => {
  queueModal.style.display = 'flex';
  updateQueueUI();
});

closeQueue.addEventListener('click', () => {
  queueModal.style.display = 'none';
});

queueModal.addEventListener('click', (e) => {
  if (e.target === queueModal) queueModal.style.display = 'none';
});

// Filters
document.querySelectorAll('.mood-filters button[data-mood]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mood-filters button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filterTracks();
  });
});

searchInput.addEventListener('input', filterTracks);

function filterTracks() {
  const query = searchInput.value.toLowerCase();
  const mood = document.querySelector('.mood-filters button.active').dataset.mood;

  document.querySelectorAll('.track').forEach(track => {
    const titleMatch = track.dataset.title.toLowerCase().includes(query);
    const moodMatch = mood === 'all' || track.dataset.moods.split(' ').includes(mood);
    track.style.display = titleMatch && moodMatch ? 'flex' : 'none';
  });

  // Hide albums if no visible tracks
  document.querySelectorAll('.album').forEach(album => {
    const visibleTracks = album.querySelectorAll('.track:not([style*="display: none"])').length;
    album.style.display = visibleTracks > 0 ? 'block' : 'none';
  });
}

// Random
randomBtn.addEventListener('click', () => {
  const visibleTracks = document.querySelectorAll('.track:not([style*="display: none"])');
  if (visibleTracks.length === 0) return;
  const randomEl = visibleTracks[Math.floor(Math.random() * visibleTracks.length)];
  addToQueueAndPlay(randomEl);
});

// Add fade animation on track change
document.querySelector('.player-left').style.animation = 'none';
setTimeout(() => {
  document.querySelector('.player-left').style.animation = 'fadeIn 0.4s ease';
}, 10);
