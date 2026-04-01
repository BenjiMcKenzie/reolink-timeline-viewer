let state = {
  dates: [],
  cameras: [],
  events: [],
  selectedEventId: null,
  viewerMode: "image",
  zoomHours: window.innerWidth <= 720 ? 6 : 24,
  visibleStartSec: 0,
};

const dateSelect = document.getElementById("dateSelect");
const cameraSelect = document.getElementById("cameraSelect");
const eventCount = document.getElementById("eventCount");
const eventsFilmstrip = document.getElementById("eventsFilmstrip");
const timelineTrack = document.getElementById("timelineTrack");
const timelineScale = document.getElementById("timelineScale");
const viewerStage = document.getElementById("viewerStage");
const viewerTitle = document.getElementById("viewerTitle");
const viewerMeta = document.getElementById("viewerMeta");
const imageModeButton = document.getElementById("imageModeButton");
const videoModeButton = document.getElementById("videoModeButton");
const refreshButton = document.getElementById("refreshButton");
const selectedMonthLabel = document.getElementById("selectedMonthLabel");
const dayStrip = document.getElementById("dayStrip");
const timelineRangeLabel = document.getElementById("timelineRangeLabel");
const zoomSwitch = document.getElementById("zoomSwitch");

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
  return String(name || "").replaceAll("_", " ");
}

function selectedEvent() {
  return state.events.find((event) => event.id === state.selectedEventId) ?? null;
}

function formatMonthLabel(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  const month = date.toLocaleDateString("de-DE", { month: "2-digit" });
  const year = date.toLocaleDateString("de-DE", { year: "numeric" });
  return `${month}/${year}`;
}

function getDayInfo(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return {
    day: date.getDate(),
    weekday: date.toLocaleDateString("de-DE", { weekday: "short" }).toUpperCase(),
  };
}

function buildEmptyState(message) {
  return `<div class="empty-state">${message}</div>`;
}

function formatTimeFromSeconds(totalSeconds) {
  const sec = Math.max(0, Math.min(86400, Math.floor(totalSeconds)));
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  return `${String(hours).padStart(1, "0")}:${String(minutes).padStart(2, "0")}`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function ensureVisibleStartForSelectedEvent() {
  const event = selectedEvent();
  const zoomSec = state.zoomHours * 3600;

  if (!event) {
    state.visibleStartSec = 0;
    return;
  }

  if (state.zoomHours >= 24) {
    state.visibleStartSec = 0;
    return;
  }

  const center = Number(event.seconds_of_day || 0);
  const proposed = center - zoomSec / 2;
  state.visibleStartSec = clamp(proposed, 0, 86400 - zoomSec);
}

function updateModeButtons() {
  imageModeButton.classList.toggle("active", state.viewerMode === "image");
  videoModeButton.classList.toggle("active", state.viewerMode === "video");
}

function updateZoomButtons() {
  const buttons = zoomSwitch.querySelectorAll(".zoom-button");
  buttons.forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.zoom) === state.zoomHours);
  });
}

function updateTimelineRangeLabel() {
  const end = state.visibleStartSec + state.zoomHours * 3600;
  timelineRangeLabel.textContent = `${formatTimeFromSeconds(state.visibleStartSec)} – ${formatTimeFromSeconds(end >= 86400 ? 86400 : end)}`;
}

function renderTimelineScale() {
  timelineScale.innerHTML = "";

  const steps = state.zoomHours === 24 ? 4 : state.zoomHours === 12 ? 6 : 6;
  const interval = (state.zoomHours * 3600) / steps;

  for (let i = 0; i <= steps; i += 1) {
    const label = document.createElement("span");
    const sec = state.visibleStartSec + interval * i;
    label.textContent = formatTimeFromSeconds(sec >= 86400 ? 86400 : sec);
    timelineScale.appendChild(label);
  }
}

function renderViewer() {
  const event = selectedEvent();

  if (!event) {
    viewerTitle.textContent = "Kein Ereignis ausgewählt";
    viewerMeta.textContent = "Bitte unten ein Ereignis auswählen.";
    viewerStage.innerHTML = buildEmptyState("Keine Daten für diese Auswahl gefunden.");
    updateModeButtons();
    return;
  }

  viewerTitle.textContent = `${formatCameraName(event.camera)} · ${event.time}`;
  viewerMeta.textContent = `${event.date} · ${event.image_rel ? "Foto vorhanden" : "Kein Foto"} · ${event.video_rel ? "Video vorhanden" : "Kein Video"}`;

  let html = "";

  if (state.viewerMode === "image" && event.image_rel) {
    html = `<img src="${mediaUrl(event.image_rel)}" alt="${event.id}" />`;
  } else if (state.viewerMode === "video" && event.video_rel) {
    html = `<video controls preload="metadata" autoplay playsinline src="${mediaUrl(event.video_rel)}"></video>`;
  } else if (event.image_rel) {
    html = `<img src="${mediaUrl(event.image_rel)}" alt="${event.id}" />`;
  } else if (event.video_rel) {
    html = `<video controls preload="metadata" autoplay playsinline src="${mediaUrl(event.video_rel)}"></video>`;
  } else {
    html = buildEmptyState("Für dieses Ereignis wurde weder Bild noch Video gefunden.");
  }

  viewerStage.innerHTML = html;
  updateModeButtons();
}

function renderDayStrip() {
  dayStrip.innerHTML = "";

  if (!state.dates.length) {
    return;
  }

  state.dates.forEach((date) => {
    const info = getDayInfo(date);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `day-pill ${date === dateSelect.value ? "active" : ""}`;
    button.innerHTML = `
      <span class="day-num">${String(info.day).padStart(2, "0")}</span>
      <span class="day-week">${info.weekday}</span>
    `;

    button.addEventListener("click", async () => {
      if (dateSelect.value === date) return;
      dateSelect.value = date;
      selectedMonthLabel.textContent = formatMonthLabel(date);
      renderDayStrip();
      await loadCameras(date);
      await loadEvents();
    });

    dayStrip.appendChild(button);
  });
}

function renderTimeline() {
  timelineTrack.innerHTML = "";
  timelineTrack.classList.toggle("zoomed", state.zoomHours < 24);

  updateZoomButtons();
  updateTimelineRangeLabel();
  renderTimelineScale();

  if (!state.events.length) {
    timelineTrack.innerHTML = `<div class="timeline-empty">Keine Ereignisse vorhanden</div>`;
    return;
  }

  const zoomSec = state.zoomHours * 3600;
  const visibleEnd = state.visibleStartSec + zoomSec;

  const visibleEvents = state.events.filter((event) => {
    const sec = Number(event.seconds_of_day || 0);
    return sec >= state.visibleStartSec && sec <= visibleEnd;
  });

  if (!visibleEvents.length) {
    timelineTrack.innerHTML = `<div class="timeline-empty">Keine Ereignisse im gewählten Zeitfenster</div>`;
    return;
  }

  visibleEvents.forEach((event, index) => {
    const marker = document.createElement("button");
    marker.type = "button";
    marker.className = `timeline-marker ${event.id === state.selectedEventId ? "active" : ""}`;

    const sec = Number(event.seconds_of_day || 0);
    const left = ((sec - state.visibleStartSec) / zoomSec) * 100;
    const baseHeight = state.zoomHours === 24 ? 44 : state.zoomHours === 12 ? 52 : 58;
    const height = baseHeight + (index % 4) * 14;

    marker.style.left = `${left}%`;
    marker.style.height = `${height}px`;
    marker.title = `${event.time} · ${formatCameraName(event.camera)}`;

    marker.addEventListener("click", () => {
      selectEvent(event.id, true, false);
    });

    timelineTrack.appendChild(marker);
  });
}

function buildThumb(event) {
  if (event.image_rel) {
    return `<img class="event-thumb" src="${mediaUrl(event.image_rel)}" alt="${event.id}" loading="lazy" />`;
  }
  return `<div class="event-thumb-fallback">Kein Foto</div>`;
}

function renderFilmstrip() {
  eventsFilmstrip.innerHTML = "";
  eventCount.textContent = `${state.events.length} Ereignisse`;

  if (!state.events.length) {
    eventsFilmstrip.innerHTML = buildEmptyState("Keine Ereignisse gefunden.");
    renderTimeline();
    renderViewer();
    return;
  }

  state.events.forEach((event) => {
    const card = document.createElement("article");
    card.className = `event-tile ${event.id === state.selectedEventId ? "active" : ""}`;
    card.dataset.eventId = event.id;
    card.innerHTML = `
      ${buildThumb(event)}
      <div class="event-caption">
        <div class="event-time">${event.time}</div>
        <div class="event-camera">${formatCameraName(event.camera)}</div>
      </div>
    `;

    card.addEventListener("click", () => {
      selectEvent(event.id, true, true);
    });

    eventsFilmstrip.appendChild(card);
  });

  renderTimeline();
  renderViewer();
}

function scrollSelectedIntoView() {
  const selectedCard = eventsFilmstrip.querySelector(".event-tile.active");
  if (selectedCard) {
    selectedCard.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }
}

function selectEvent(eventId, smoothScroll = false, recenterTimeline = true) {
  state.selectedEventId = eventId;

  if (recenterTimeline) {
    ensureVisibleStartForSelectedEvent();
  }

  renderFilmstrip();

  if (smoothScroll) {
    scrollSelectedIntoView();
  }
}

function setZoom(hours) {
  state.zoomHours = hours;
  ensureVisibleStartForSelectedEvent();
  renderTimeline();
}

async function loadCameras(date) {
  const data = await getJson(`/api/cameras?date=${encodeURIComponent(date)}`);
  state.cameras = Array.isArray(data.cameras) ? data.cameras : [];

  const previousValue = cameraSelect.value;
  cameraSelect.innerHTML = `<option value="">Alle Kameras</option>`;

  state.cameras.forEach((camera) => {
    const option = document.createElement("option");
    option.value = camera;
    option.textContent = formatCameraName(camera);
    if (camera === previousValue) {
      option.selected = true;
    }
    cameraSelect.appendChild(option);
  });
}

async function loadEvents() {
  const date = dateSelect.value;
  const camera = cameraSelect.value;

  if (!date) {
    state.events = [];
    state.selectedEventId = null;
    state.visibleStartSec = 0;
    renderDayStrip();
    renderFilmstrip();
    return;
  }

  const params = new URLSearchParams({ date });
  if (camera) {
    params.set("camera", camera);
  }

  const data = await getJson(`/api/events?${params.toString()}`);
  state.events = Array.isArray(data.events) ? data.events : [];
  state.selectedEventId = state.events[0]?.id ?? null;
  state.viewerMode = "image";
  selectedMonthLabel.textContent = formatMonthLabel(date);

  ensureVisibleStartForSelectedEvent();
  renderDayStrip();
  renderFilmstrip();
}

async function bootstrap() {
  const dateData = await getJson("/api/dates");
  state.dates = Array.isArray(dateData.dates) ? dateData.dates : [];

  dateSelect.innerHTML = "";

  state.dates.forEach((date) => {
    const option = document.createElement("option");
    option.value = date;
    option.textContent = date;
    dateSelect.appendChild(option);
  });

  if (!state.dates.length) {
    selectedMonthLabel.textContent = "—";
    renderDayStrip();
    renderFilmstrip();
    return;
  }

  dateSelect.value = state.dates[0];
  selectedMonthLabel.textContent = formatMonthLabel(state.dates[0]);

  renderDayStrip();
  await loadCameras(state.dates[0]);
  await loadEvents();
}

dateSelect.addEventListener("change", async () => {
  selectedMonthLabel.textContent = formatMonthLabel(dateSelect.value);
  renderDayStrip();
  await loadCameras(dateSelect.value);
  await loadEvents();
});

cameraSelect.addEventListener("change", async () => {
  await loadEvents();
});

imageModeButton.addEventListener("click", () => {
  state.viewerMode = "image";
  renderViewer();
});

videoModeButton.addEventListener("click", () => {
  state.viewerMode = "video";
  renderViewer();
});

refreshButton.addEventListener("click", async () => {
  await bootstrap();
});

zoomSwitch.addEventListener("click", (event) => {
  const button = event.target.closest(".zoom-button");
  if (!button) return;
  const zoom = Number(button.dataset.zoom);
  if (![24, 12, 6].includes(zoom)) return;
  setZoom(zoom);
});

bootstrap().catch((error) => {
  console.error(error);
  viewerTitle.textContent = "Fehler";
  viewerMeta.textContent = "Die Oberfläche konnte nicht geladen werden.";
  viewerStage.innerHTML = buildEmptyState("Fehler beim Laden der Daten. Sieh in die Container-Logs.");
  timelineTrack.innerHTML = `<div class="timeline-empty">Fehler</div>`;
  eventsFilmstrip.innerHTML = buildEmptyState("Keine Daten verfügbar.");
});
