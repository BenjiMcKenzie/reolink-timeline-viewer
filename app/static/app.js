let state = {
  dates: [],
  cameras: [],
  events: [],
  selectedEventId: null,
  viewerMode: "image",
  zoomHours: window.innerWidth <= 720 ? 6 : 24,
  visibleStartSec: 0,
};

// Globale Funktionen SOFORT registrieren,
// damit inline onclick immer etwas findet.
window.setTimelineZoom = function (hours) {
  state.zoomHours = Number(hours);
  ensureVisibleStartForSelectedEvent();
  renderTimeline();
};

window.timelinePrev = function () {
  shiftTimelineWindow(-1);
};

window.timelineNext = function () {
  shiftTimelineWindow(1);
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

const zoom24Button = document.getElementById("zoom24Button");
const zoom12Button = document.getElementById("zoom12Button");
const zoom6Button = document.getElementById("zoom6Button");
const timelinePrevButton = document.getElementById("timelinePrevButton");
const timelineNextButton = document.getElementById("timelineNextButton");

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
  return `${hours}:${String(minutes).padStart(2, "0")}`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getZoomSeconds() {
  return state.zoomHours * 3600;
}

function ensureVisibleStartForSelectedEvent() {
  const event = selectedEvent();
  const zoomSec = getZoomSeconds();

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

function shiftTimelineWindow(direction) {
  if (state.zoomHours >= 24) return;

  const zoomSec = getZoomSeconds();
  const step = zoomSec / 2;
  const nextStart = state.visibleStartSec + direction * step;
  state.visibleStartSec = clamp(nextStart, 0, 86400 - zoomSec);
  renderTimeline();
}

function updateModeButtons() {
  if (imageModeButton) {
    imageModeButton.classList.toggle("active", state.viewerMode === "image");
  }
  if (videoModeButton) {
    videoModeButton.classList.toggle("active", state.viewerMode === "video");
  }
}

function updateZoomButtons() {
  if (zoom24Button) zoom24Button.classList.toggle("active", state.zoomHours === 24);
  if (zoom12Button) zoom12Button.classList.toggle("active", state.zoomHours === 12);
  if (zoom6Button) zoom6Button.classList.toggle("active", state.zoomHours === 6);

  const disabled = state.zoomHours >= 24;

  if (timelinePrevButton) {
    timelinePrevButton.disabled = disabled;
    timelinePrevButton.style.opacity = disabled ? "0.5" : "1";
  }

  if (timelineNextButton) {
    timelineNextButton.disabled = disabled;
    timelineNextButton.style.opacity = disabled ? "0.5" : "1";
  }
}

function updateTimelineRangeLabel() {
  if (!timelineRangeLabel) return;
  const end = state.visibleStartSec + getZoomSeconds();
  timelineRangeLabel.textContent = `${formatTimeFromSeconds(state.visibleStartSec)} – ${formatTimeFromSeconds(Math.min(end, 86400))}`;
}

function renderTimelineScale() {
  if (!timelineScale) return;
  timelineScale.innerHTML = "";

  const steps = 6;
  const interval = getZoomSeconds() / steps;

  for (let i = 0; i <= steps; i += 1) {
    const label = document.createElement("span");
    const sec = state.visibleStartSec + interval * i;
    label.textContent = formatTimeFromSeconds(Math.min(sec, 86400));
    timelineScale.appendChild(label);
  }
}

function renderViewer() {
  const event = selectedEvent();

  if (!viewerTitle || !viewerMeta || !viewerStage) return;

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
  if (!dayStrip) return;
  dayStrip.innerHTML = "";

  if (!state.dates.length) return;

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
      if (selectedMonthLabel) {
        selectedMonthLabel.textContent = formatMonthLabel(date);
      }
      renderDayStrip();
      await loadCameras(date);
      await loadEvents();
    });

    dayStrip.appendChild(button);
  });
}

function renderTimeline() {
  if (!timelineTrack) return;

  timelineTrack.innerHTML = "";
  timelineTrack.classList.toggle("zoomed", state.zoomHours < 24);

  updateZoomButtons();
  updateTimelineRangeLabel();
  renderTimelineScale();

  if (!state.events.length) {
    timelineTrack.innerHTML = `<div class="timeline-empty">Keine Ereignisse vorhanden</div>`;
    return;
  }

  const zoomSec = getZoomSeconds();
  const visibleEnd = state.visibleStartSec + zoomSec;

  const visibleEvents = state.events.filter((event) => {
    const sec = Number(event.seconds_of_day || 0);
    if (state.zoomHours >= 24) return true;
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
    const left = state.zoomHours >= 24
      ? (sec / 86400) * 100
      : ((sec - state.visibleStartSec) / zoomSec) * 100;

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
  if (!eventsFilmstrip || !eventCount) return;

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
  if (!eventsFilmstrip) return;
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

async function loadCameras(date) {
  const data = await getJson(`/api/cameras?date=${encodeURIComponent(date)}`);
  state.cameras = Array.isArray(data.cameras) ? data.cameras : [];

  if (!cameraSelect) return;

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
  const date = dateSelect?.value;
  const camera = cameraSelect?.value;

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

  if (selectedMonthLabel) {
    selectedMonthLabel.textContent = formatMonthLabel(date);
  }

  ensureVisibleStartForSelectedEvent();
  renderDayStrip();
  renderFilmstrip();
}

async function bootstrap() {
  const dateData = await getJson("/api/dates");
  state.dates = Array.isArray(dateData.dates) ? dateData.dates : [];

  if (!dateSelect) return;
  dateSelect.innerHTML = "";

  state.dates.forEach((date) => {
    const option = document.createElement("option");
    option.value = date;
    option.textContent = date;
    dateSelect.appendChild(option);
  });

  if (!state.dates.length) {
    if (selectedMonthLabel) selectedMonthLabel.textContent = "—";
    renderDayStrip();
    renderFilmstrip();
    return;
  }

  dateSelect.value = state.dates[0];
  if (selectedMonthLabel) {
    selectedMonthLabel.textContent = formatMonthLabel(state.dates[0]);
  }

  renderDayStrip();
  await loadCameras(state.dates[0]);
  await loadEvents();
}

if (dateSelect) {
  dateSelect.addEventListener("change", async () => {
    if (selectedMonthLabel) {
      selectedMonthLabel.textContent = formatMonthLabel(dateSelect.value);
    }
    renderDayStrip();
    await loadCameras(dateSelect.value);
    await loadEvents();
  });
}

if (cameraSelect) {
  cameraSelect.addEventListener("change", async () => {
    await loadEvents();
  });
}

if (imageModeButton) {
  imageModeButton.addEventListener("click", () => {
    state.viewerMode = "image";
    renderViewer();
  });
}

if (videoModeButton) {
  videoModeButton.addEventListener("click", () => {
    state.viewerMode = "video";
    renderViewer();
  });
}

if (refreshButton) {
  refreshButton.addEventListener("click", async () => {
    await bootstrap();
  });
}

bootstrap().catch((error) => {
  console.error(error);
  if (viewerTitle) viewerTitle.textContent = "Fehler";
  if (viewerMeta) viewerMeta.textContent = "Die Oberfläche konnte nicht geladen werden.";
  if (viewerStage) viewerStage.innerHTML = buildEmptyState("Fehler beim Laden der Daten. Sieh in die Container-Logs.");
  if (timelineTrack) timelineTrack.innerHTML = `<div class="timeline-empty">Fehler</div>`;
  if (eventsFilmstrip) eventsFilmstrip.innerHTML = buildEmptyState("Keine Daten verfügbar.");
});
