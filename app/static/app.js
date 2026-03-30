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
const eventsGrid = document.getElementById('eventsGrid');
const timelineTrack = document.getElementById('timelineTrack');
const viewerStage = document.getElementById('viewerStage');
const viewerTitle = document.getElementById('viewerTitle');
const viewerMeta = document.getElementById('viewerMeta');
const imageModeButton = document.getElementById('imageModeButton');
const videoModeButton = document.getElementById('videoModeButton');
const refreshButton = document.getElementById('refreshButton');

async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return await response.json();
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

function renderViewer() {
  const event = selectedEvent();
  if (!event) {
    viewerTitle.textContent = 'Kein Ereignis ausgewählt';
    viewerMeta.textContent = 'Bitte unten ein Ereignis auswählen.';
    viewerStage.innerHTML = '<div class="empty-state">Keine Daten für diese Auswahl gefunden.</div>';
    return;
  }

  viewerTitle.textContent = `${formatCameraName(event.camera)} · ${event.time}`;
  viewerMeta.textContent = `${event.date} · ${event.image_rel ? 'Foto' : 'Kein Foto'} · ${event.video_rel ? 'Video' : 'Kein Video'}`;

  let html = '';
  if (state.viewerMode === 'image' && event.image_rel) {
    html = `<img src="${mediaUrl(event.image_rel)}" alt="${event.id}" />`;
  } else if (state.viewerMode === 'video' && event.video_rel) {
    html = `<video controls preload="metadata" src="${mediaUrl(event.video_rel)}"></video>`;
  } else if (event.image_rel) {
    html = `<img src="${mediaUrl(event.image_rel)}" alt="${event.id}" />`;
  } else if (event.video_rel) {
    html = `<video controls preload="metadata" src="${mediaUrl(event.video_rel)}"></video>`;
  } else {
    html = '<div class="empty-state">Für dieses Ereignis wurde weder Bild noch Video gefunden.</div>';
  }

  viewerStage.innerHTML = html;
  imageModeButton.classList.toggle('active', state.viewerMode === 'image');
  videoModeButton.classList.toggle('active', state.viewerMode === 'video');
}

function renderTimeline() {
  timelineTrack.innerHTML = '';

  state.events.forEach((event) => {
    const marker = document.createElement('button');
    marker.className = `timeline-marker ${event.id === state.selectedEventId ? 'active' : ''}`;
    marker.style.left = `calc(${(event.seconds_of_day / 86400) * 100}% - 2px)`;
    marker.title = `${event.time} · ${formatCameraName(event.camera)}`;
    marker.addEventListener('click', () => selectEvent(event.id));
    timelineTrack.appendChild(marker);
  });
}

function renderEvents() {
  eventsGrid.innerHTML = '';
  eventCount.textContent = `${state.events.length} Ereignisse`;

  if (!state.events.length) {
    eventsGrid.innerHTML = '<div class="empty-state">Keine Ereignisse gefunden.</div>';
    renderTimeline();
    renderViewer();
    return;
  }

  state.events.forEach((event) => {
    const card = document.createElement('article');
    card.className = `event-card ${event.id === state.selectedEventId ? 'active' : ''}`;
    card.addEventListener('click', () => selectEvent(event.id));

    const thumb = event.image_rel
      ? `<img class="event-thumb" src="${mediaUrl(event.image_rel)}" alt="${event.id}" loading="lazy" />`
      : '<div class="event-fallback">Kein Foto</div>';

    card.innerHTML = `
      ${thumb}
      <div class="event-body">
        <div class="event-time">${event.time}</div>
        <div class="event-camera">${formatCameraName(event.camera)}</div>
      </div>
    `;
    eventsGrid.appendChild(card);
  });

  renderTimeline();
  renderViewer();
}

function selectEvent(eventId) {
  state.selectedEventId = eventId;
  renderEvents();
}

async function loadCameras(date) {
  const data = await getJson(`/api/cameras?date=${encodeURIComponent(date)}`);
  state.cameras = data.cameras;

  const currentValue = cameraSelect.value;
  cameraSelect.innerHTML = '<option value="">Alle Kameras</option>';
  for (const camera of state.cameras) {
    const option = document.createElement('option');
    option.value = camera;
    option.textContent = formatCameraName(camera);
    if (camera === currentValue) {
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
  renderEvents();
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
    renderEvents();
    return;
  }

  await loadCameras(state.dates[0]);
  await loadEvents();
}

dateSelect.addEventListener('change', async () => {
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
