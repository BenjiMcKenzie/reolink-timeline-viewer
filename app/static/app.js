let state = {
  dates: [],
  cameras: [],
  events: [],
  selectedEventId: null,
  viewerMode: 'image',
};

const dateSelect = document.getElementById('dateSelect');
const cameraSelect = document.getElementById('cameraSelect');
const eventCount = document.getElementById('eventCount');
const eventsFilmstrip = document.getElementById('eventsFilmstrip');
const timelineTrack = document.getElementById('timelineTrack');
const viewerStage = document.getElementById('viewerStage');
const viewerTitle = document.getElementById('viewerTitle');
const viewerMeta = document.getElementById('viewerMeta');
const imageModeButton = document.getElementById('imageModeButton');
const videoModeButton = document.getElementById('videoModeButton');
const refreshButton = document.getElementById('refreshButton');
const selectedMonthLabel = document.getElementById('selectedMonthLabel');
const dayStrip = document.getElementById('dayStrip');

async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
}

function mediaUrl(relPath) {
  return `/media/${encodeURI(relPath)}`;
}

function formatCameraName(name) {
  return name.replaceAll('_', ' ');
}

function selectedEvent() {
  return state.events.find((event) => event.id === state.selectedEventId) ?? null;
}

function formatMonthLabel(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString('de-DE', { year: 'numeric', month: '2-digit' }).replace('.', '-');
}

function getDayInfo(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return {
    day: date.getDate(),
    weekday: date.toLocaleDateString('de-DE', { weekday: 'short' }).toUpperCase(),
  };
}

function renderDayStrip() {
  dayStrip.innerHTML = '';
  if (!state.dates.length) return;

  state.dates.forEach((date) => {
    const info = getDayInfo(date);
    const btn = document.createElement('button');
    btn.className = `day-pill ${date === dateSelect.value ? 'active' : ''}`;
    btn.innerHTML = `
      <span class="day-num">${String(info.day).padStart(2, '0')}</span>
      <span class="day-week">${info.weekday}</span>
    `;
    btn.addEventListener('click', async () => {
      if (dateSelect.value === date) return;
      dateSelect.value = date;
      selectedMonthLabel.textContent = formatMonthLabel(date);
      renderDayStrip();
      await loadCameras(date);
      await loadEvents();
    });
    dayStrip.appendChild(btn);
  });
}

function renderViewer() {
  const event = selectedEvent();

  if (!event) {
    viewerTitle.textContent = 'Kein Ereignis ausgewählt';
    viewerMeta.textContent = 'Bitte unten ein Ereignis auswählen.';
    viewerStage.innerHTML = '<div class="empty-state">Keine Daten für diese Auswahl gefunden.</div>';
    return;
  }

  viewerTitle.textContent = `${formatCameraName(event.camera)} · ${event.time}`;
  viewerMeta.textContent = `${event.date} · ${event.image_rel ? 'Foto vorhanden' : 'Kein Foto'} · ${event.video_rel ? 'Video vorhanden' : 'Kein Video'}`;

  let html = '';

  if (state.viewerMode === 'image' && event.image_rel) {
    html = `<img src="${mediaUrl(event.image_rel)}" alt="${event.id}" />`;
  } else if (state.viewerMode === 'video' && event.video_rel) {
    html = `<video controls preload="metadata" autoplay src="${mediaUrl(event.video_rel)}"></video>`;
  } else if (event.image_rel) {
    html = `<img src="${mediaUrl(event.image_rel)}" alt="${event.id}" />`;
  } else if (event.video_rel) {
    html = `<video controls preload="metadata" autoplay src="${mediaUrl(event.video_rel)}"></video>`;
  } else {
    html = '<div class="empty-state">Für dieses Ereignis wurde weder Bild noch Video gefunden.</div>';
  }

  viewerStage.innerHTML = html;
  imageModeButton.classList.toggle('active', state.viewerMode === 'image');
  videoModeButton.classList.toggle('active', state.viewerMode === 'video');
}

function renderTimeline() {
  timelineTrack.innerHTML = '';

  if (!state.events.length) {
    timelineTrack.innerHTML = '<div class="timeline-empty">Keine Ereignisse vorhanden</div>';
    return;
  }

  state.events.forEach((event, index) => {
    const marker = document.createElement('button');
    marker.className = `timeline-marker ${event.id === state.selectedEventId ? 'active' : ''}`;

    const left = (event.seconds_of_day / 86400) * 100;
    const height = 52 + (index % 3) * 16;

    marker.style.left = `${left}%`;
    marker.style.height = `${height}px`;
    marker.title = `${event.time} · ${formatCameraName(event.camera)}`;

    marker.addEventListener('click', () => {
      selectEvent(event.id, true);
    });

    timelineTrack.appendChild(marker);
  });
}

function buildThumb(event) {
  if (event.image_rel) {
    return `<img class="event-thumb" src="${mediaUrl(event.image_rel)}" alt="${event.id}" loading="lazy" />`;
  }
  return '<div class="event-thumb-fallback">Kein Foto</div>';
}

function renderFilmstrip() {
  eventsFilmstrip.innerHTML = '';
  eventCount.textContent = `${state.events.length} Ereignisse`;

  if (!state.events.length) {
    eventsFilmstrip.innerHTML = '<div class="empty-state">Keine Ereignisse gefunden.</div>';
    renderTimeline();
    renderViewer();
    return;
  }

  state.events.forEach((event) => {
    const card = document.createElement('article');
    card.className = `event-tile ${event.id === state.selectedEventId ? 'active' : ''}`;
    card.dataset.eventId = event.id;
    card.innerHTML = `
      ${buildThumb(event)}
      <div class="event-caption">
        <div class="event-time">${event.time}</div>
        <div class="event-camera">${formatCameraName(event.camera)}</div>
      </div>
    `;
    card.addEventListener('click', () => {
      selectEvent(event.id, true);
    });
    eventsFilmstrip.appendChild(card);
  });

  renderTimeline();
  renderViewer();
}

function scrollSelectedIntoView() {
  const selectedCard = eventsFilmstrip.querySelector('.event-tile.active');
  if (selectedCard) {
    selectedCard.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    });
  }
}

function selectEvent(eventId, smoothScroll = false) {
  state.selectedEventId = eventId;
  renderFilmstrip();
  if (smoothScroll) {
    scrollSelectedIntoView();
  }
}

async function loadCameras(date) {
  const data = await getJson(`/api/cameras?date=${encodeURIComponent(date)}`);
  state.cameras = data.cameras;

  const previous = cameraSelect.value;
  cameraSelect.innerHTML = '<option value="">Alle Kameras</option>';

  for (const camera of state.cameras) {
    const option = document.createElement('option');
    option.value = camera;
    option.textContent = formatCameraName(camera);
    if (camera === previous) {
      option.selected = true;
    }
    cameraSelect.appendChild(option);
  }
}

async function loadEvents() {
  const date = dateSelect.value;
  const camera = cameraSelect.value;
  const params = new URLSearchParams({ date });
  if (camera) params.set('camera', camera);

  const data = await getJson(`/api/events?${params.toString()}`);
  state.events = data.events;
  state.selectedEventId = state.events[0]?.id ?? null;
  state.viewerMode = 'image';
  selectedMonthLabel.textContent = formatMonthLabel(date);
  renderDayStrip();
  renderFilmstrip();
}

async function bootstrap() {
  const dateData = await getJson('/api/dates');
  state.dates = dateData.dates;
  dateSelect.innerHTML = '';

  for (const date of state.dates) {
    const option = document.createElement('option');
    option.value = date;
    option.textContent = date;
    dateSelect.appendChild(option);
  }

  if (!state.dates.length) {
    renderDayStrip();
    renderFilmstrip();
    return;
  }

  selectedMonthLabel.textContent = formatMonthLabel(state.dates[0]);
  renderDayStrip();
  await loadCameras(state.dates[0]);
  await loadEvents();
}

dateSelect.addEventListener('change', async () => {
  selectedMonthLabel.textContent = formatMonthLabel(dateSelect.value);
  renderDayStrip();
  await loadCameras(dateSelect.value);
  await loadEvents();
});

cameraSelect.addEventListener('change', async () => {
  await loadEvents();
});

imageModeButton.addEventListener('click', () => {
  state.viewerMode = 'image';
  renderViewer();
});

videoModeButton.addEventListener('click', () => {
  state.viewerMode = 'video';
  renderViewer();
});

refreshButton.addEventListener('click', bootstrap);

bootstrap().catch((error) => {
  console.error(error);
  viewerStage.innerHTML = '<div class="empty-state">Fehler beim Laden der Daten. Sieh in die Container-Logs.</div>';
});
