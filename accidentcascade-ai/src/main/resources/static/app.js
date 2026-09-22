const metrics = document.querySelector('#metrics');
const zones = document.querySelector('#zones');
const result = document.querySelector('#result');
const globalCenter = [20, 0];
const globalZoom = 2;
const regionalBounds = [[25, 75], [31.5, 90]];
let disasterMap;
let disasterMarkers;
let routeLayer;
let selectedStart;
let selectedDestination;
let displayedRisks = [];
const knownLocations = [
  {name: 'Kathmandu Valley, Nepal', latitude: 27.7172, longitude: 85.3240},
  {name: 'Pokhara, Nepal', latitude: 28.2096, longitude: 83.9856},
  {name: 'Biratnagar, Nepal', latitude: 26.4525, longitude: 87.2718},
  {name: 'Dharan, Nepal', latitude: 26.8122, longitude: 87.2836},
  {name: 'Siliguri, West Bengal', latitude: 26.7271, longitude: 88.3953},
  {name: 'Gangtok, Sikkim', latitude: 27.3389, longitude: 88.6065},
  {name: 'Pithoragarh, Uttarakhand', latitude: 29.5829, longitude: 80.2182}
];
const safePlaces = [
  {id: 'ktm', name: 'Kathmandu coordination point (sample)', latitude: 27.7110, longitude: 85.3200},
  {id: 'pkh', name: 'Pokhara coordination point (sample)', latitude: 28.2140, longitude: 83.9840},
  {id: 'btn', name: 'Biratnagar coordination point (sample)', latitude: 26.4580, longitude: 87.2750},
  {id: 'slg', name: 'Siliguri coordination point (sample)', latitude: 26.7250, longitude: 88.4010},
  {id: 'gtk', name: 'Gangtok coordination point (sample)', latitude: 27.3400, longitude: 88.6100}
];

if (!sessionStorage.getItem('accidentcascade-user')) location.replace('/login.html');
document.querySelector('#logout').addEventListener('click', () => {
  sessionStorage.removeItem('accidentcascade-user');
  location.assign('/login.html');
});

function populateRouteControls() {
  const places = document.querySelector('#known-places');
  const safeSelect = document.querySelector('#safe-place');
  places.innerHTML = knownLocations.map(place => `<option value="${place.name}"></option>`).join('');
  safeSelect.innerHTML = safePlaces.map(place => `<option value="${place.id}">${place.name}</option>`).join('');
}

function routeSummary(title, message) {
  document.querySelector('#route-summary').innerHTML = `<strong>${title}</strong><small>${message}</small>`;
}

function setStartLocation(location) {
  selectedStart = location;
  document.querySelector('#location-query').value = location.name;
  routeSummary('Start point set', `${location.name} is ready. Select a sample coordination point and trace the planning route.`);
}

function findLocation() {
  const query = document.querySelector('#location-query').value.trim().toLowerCase();
  const found = knownLocations.find(place => place.name.toLowerCase().includes(query) || query.includes(place.name.toLowerCase().split(',')[0].toLowerCase()));
  if (!query || !found) {
    routeSummary('Location not found', 'Search one of the supported Nepal or North India locations shown in the suggestions, or use your browser location.');
    return;
  }
  setStartLocation(found);
  if (disasterMap) disasterMap.flyTo([found.latitude, found.longitude], 11);
}

function useMyLocation() {
  if (!navigator.geolocation) {
    routeSummary('Location unavailable', 'Your browser does not support location access. Search a place or click the map instead.');
    return;
  }
  routeSummary('Finding your location', 'Approve the browser location request to set your start point.');
  navigator.geolocation.getCurrentPosition(
    position => {
      setStartLocation({name: 'Your browser location', latitude: position.coords.latitude, longitude: position.coords.longitude});
      if (disasterMap) disasterMap.flyTo([position.coords.latitude, position.coords.longitude], 11);
    },
    () => routeSummary('Location permission unavailable', 'Search a supported place or click the map to set a start point instead.'),
    {enableHighAccuracy: false, timeout: 10000, maximumAge: 300000}
  );
}

function haversineKm(a, b) {
  const radians = degrees => degrees * Math.PI / 180;
  const dLat = radians(b.latitude - a.latitude);
  const dLon = radians(b.longitude - a.longitude);
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function traceSafeRoute() {
  const destination = safePlaces.find(place => place.id === document.querySelector('#safe-place').value);
  if (!selectedStart) {
    const latitude = Number(document.querySelector('[name="latitude"]').value);
    const longitude = Number(document.querySelector('[name="longitude"]').value);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      selectedStart = {name: 'Selected coordinates', latitude, longitude};
    } else {
      routeSummary('Set your start point', 'Search a location, use browser location, or click the map before tracing a route.');
      return;
    }
  }
  selectedDestination = destination;
  const distance = haversineKm(selectedStart, destination);
  routeSummary(`Route prepared to ${destination.name}`, `${selectedStart.name} → ${destination.name} · Approximate direct distance: ${distance.toFixed(1)} km. This is a planning line, not turn-by-turn navigation; follow local authority evacuation instructions.`);
  if (!disasterMap || !routeLayer) {
    renderFallbackMap(displayedRisks);
    return;
  }
  routeLayer.clearLayers();
  L.circleMarker([selectedStart.latitude, selectedStart.longitude], {radius: 8, color: '#ffffff', weight: 2, fillColor: '#34d2d0', fillOpacity: 1}).bindTooltip('Your start point').addTo(routeLayer);
  L.circleMarker([destination.latitude, destination.longitude], {radius: 9, color: '#ffffff', weight: 2, fillColor: '#25c786', fillOpacity: 1}).bindTooltip(destination.name).addTo(routeLayer);
  L.polyline([[selectedStart.latitude, selectedStart.longitude], [destination.latitude, destination.longitude]], {color: '#34d2d0', weight: 4, opacity: .9, dashArray: '8 8'}).addTo(routeLayer);
  disasterMap.fitBounds([[selectedStart.latitude, selectedStart.longitude], [destination.latitude, destination.longitude]], {padding: [45, 45]});
}

function pinStatus(score) {
  if (score >= 80) return {color: 'red', label: 'Critical response'};
  if (score >= 60) return {color: 'yellow', label: 'Watch status'};
  return {color: 'green', label: 'Monitored'};
}

function hazardIcon(hazard) {
  if (hazard === 'Earthquake') return '⌁';
  if (hazard === 'Landslide') return '▲';
  if (hazard === 'Flood') return '≈';
  return '•';
}

function impactLabel(score) {
  if (score >= 80) return 'Immediate regional action';
  if (score >= 60) return 'Heightened response readiness';
  return 'Active monitoring';
}

function showMapDetail(risk) {
  const state = pinStatus(risk.score);
  document.querySelector('#map-detail').innerHTML = `<strong>${risk.road}</strong><br>${risk.hazard || 'Unclassified hazard'} · <b>${state.label}</b> · Risk score: <b>${risk.score}/100</b><small>${risk.recommendation}</small>`;
}

function fallbackPoint(location) {
  return {
    x: Math.max(14, Math.min(88, 31 + (location.longitude - 76) * 7)),
    y: Math.max(18, Math.min(82, 82 - (location.latitude - 25) * 12))
  };
}

function renderFallbackMap(risks) {
  const mapElement = document.querySelector('#global-map');
  const pins = risks.map((risk, index) => {
    const state = pinStatus(risk.score);
    const point = fallbackPoint(risk);
    return `<button type="button" class="fallback-pin ${state.color}" data-risk="${index}" style="left:${point.x}%;top:${point.y}%" aria-label="${risk.hazard || 'Hazard'} at ${risk.road}"><span>${hazardIcon(risk.hazard)}</span></button>`;
  }).join('');
  let route = '';
  if (selectedStart && selectedDestination) {
    const start = fallbackPoint(selectedStart);
    const destination = fallbackPoint(selectedDestination);
    route = `<svg class="fallback-route" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><line x1="${start.x}" y1="${start.y}" x2="${destination.x}" y2="${destination.y}"/></svg><span class="route-dot start" style="left:${start.x}%;top:${start.y}%" aria-label="Route start"></span><span class="route-dot destination" style="left:${destination.x}%;top:${destination.y}%" aria-label="Route destination"></span>`;
  }
  mapElement.classList.add('fallback-map');
  mapElement.innerHTML = `<div class="world-fallback"><svg viewBox="0 0 1000 500" aria-hidden="true"><path class="grid" d="M0 100H1000M0 200H1000M0 300H1000M0 400H1000M125 0V500M250 0V500M375 0V500M500 0V500M625 0V500M750 0V500M875 0V500"/><path class="land" d="M95 115l95-47 68 23 32 54-30 42-74-12-50 48-52-26zM310 74l95 12 53 42-14 58-49 10-23 47-49-33-35-68zM410 248l56 30 18 85-31 93-44-14-21-94zM510 105l120-51 112 35 93-11 80 62-28 46-90 12-44 52-99-23-58 28-62-50zM680 245l70 27 35 82-39 93-65-24-27-74zM850 314l87 18 34 45-47 43-87-25z"/></svg><div class="fallback-title">GLOBAL DISASTER MAP · REGIONAL FOCUS</div><div class="fallback-region"><b>Nepal &amp; North India</b>Embedded map view with active disaster pins</div>${route}${pins}</div>`;
  mapElement.querySelectorAll('.fallback-pin').forEach(pin => pin.addEventListener('click', () => showMapDetail(risks[Number(pin.dataset.risk)])));
  mapElement.querySelector('.world-fallback').addEventListener('click', event => {
    if (event.target.closest('.fallback-pin')) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width * 100;
    const y = (event.clientY - bounds.top) / bounds.height * 100;
    setStartLocation({name: 'Fallback map-selected location', latitude: 25 + (82 - y) / 12, longitude: 76 + (x - 31) / 7});
  });
}

function initMap() {
  const mapElement = document.querySelector('#global-map');
  if (!window.L) return false;
  if (disasterMap) return true;
  mapElement.classList.remove('fallback-map');
  mapElement.innerHTML = '';
  disasterMap = L.map('global-map', {minZoom: 2});
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; OpenStreetMap contributors'
  }).addTo(disasterMap);
  disasterMarkers = L.layerGroup().addTo(disasterMap);
  routeLayer = L.layerGroup().addTo(disasterMap);
  disasterMap.fitBounds(regionalBounds, {padding: [24, 24]});
  disasterMap.on('click', event => {
    setStartLocation({name: 'Map-selected location', latitude: event.latlng.lat, longitude: event.latlng.lng});
  });
  return true;
}

function renderMap(risks) {
  displayedRisks = risks;
  if (!initMap()) {
    renderFallbackMap(risks);
    return;
  }
  disasterMarkers.clearLayers();
  risks.forEach(risk => {
    if (typeof risk.latitude !== 'number' || typeof risk.longitude !== 'number') return;
    const state = pinStatus(risk.score);
    const marker = L.marker([risk.latitude, risk.longitude], {icon: L.divIcon({
      className: '', iconSize: [25, 25], iconAnchor: [12, 24],
      html: `<div class="disaster-pin ${state.color}"><span>${hazardIcon(risk.hazard)}</span></div>`
    })});
    marker.bindTooltip(`${risk.hazard || 'Hazard'} · ${risk.road}`, {direction: 'top'});
    marker.bindPopup(`<strong>${risk.road}</strong><br>${risk.hazard || 'Hazard'} · ${state.label}<br>Risk score: ${risk.score}/100<br><small>${risk.recommendation}</small>`);
    marker.on('click', () => showMapDetail(risk));
    marker.addTo(disasterMarkers);
  });
}

function draw(data) {
  const criticalAlerts = data.risks.filter(risk => risk.score >= 80).length;
  metrics.innerHTML = [
    ['◌', 'Active hazard events', data.activeIncidents, 'regional events under watch'],
    ['!', 'Critical alerts', criticalAlerts, 'requiring immediate action'],
    ['⌖', 'Monitored locations', data.risks.length, 'across Nepal and North India']
  ].map(item => `<article class="metric"><span class="metric-icon">${item[0]}</span><span>${item[1]}</span><strong>${item[2]}</strong><small>${item[3]}</small></article>`).join('');
  zones.innerHTML = data.risks.slice(0, 8).map(risk => {
    const state = pinStatus(risk.score);
    return `<div class="zone severity-${state.color}"><div><strong>${risk.road}</strong><div class="advice">${hazardIcon(risk.hazard)} ${risk.hazard || 'Unclassified hazard'} · ${state.label}</div></div><div><span class="badge ${risk.level.toLowerCase()}">${risk.level}</span><div class="score">${risk.score}/100</div></div><div class="advice">${risk.recommendation}</div></div>`;
  }).join('');
  renderMap(data.risks);
}

const demo = {activeIncidents: 2, highRiskZones: 4, averageLeadTimeMinutes: 7.8, interventions: [], risks: [
  {road:'Kathmandu Valley, Nepal', score:88, level:'Critical', recommendation:'Activate emergency response and issue public warning', model:'EGNN-IHHO-MVICP', hazard:'Earthquake', latitude:27.7172, longitude:85.3240},
  {road:'Pokhara, Nepal', score:81, level:'Critical', recommendation:'Evacuate exposed slopes and restrict hillside routes', model:'EGNN-IHHO-MVICP', hazard:'Landslide', latitude:28.2096, longitude:83.9856},
  {road:'Biratnagar, Nepal', score:72, level:'High', recommendation:'Deploy flood alerts and prepare evacuation support', model:'HPSGWO-AGRU-SARE', hazard:'Flood', latitude:26.4525, longitude:87.2718},
  {road:'Dharan, Nepal', score:64, level:'High', recommendation:'Monitor hillside movement and close exposed roads', model:'HPSGWO-AGRU-SARE', hazard:'Landslide', latitude:26.8122, longitude:87.2836},
  {road:'Siliguri, West Bengal', score:55, level:'Moderate', recommendation:'Issue river-level advisory and monitor low-lying areas', model:'IWOFS-BiLSTM-SAP', hazard:'Flood', latitude:26.7271, longitude:88.3953},
  {road:'Gangtok, Sikkim', score:42, level:'Moderate', recommendation:'Inspect vulnerable slopes and maintain travel advisory', model:'IWOFS-BiLSTM-SAP', hazard:'Landslide', latitude:27.3389, longitude:88.6065},
  {road:'Pithoragarh, Uttarakhand', score:35, level:'Moderate', recommendation:'Continue rainfall and seismic activity observation', model:'IWOFS-BiLSTM-SAP', hazard:'Earthquake', latitude:29.5829, longitude:80.2182}
]};

async function load() {
  try {
    const response = await fetch('/api/dashboard');
    if (!response.ok) throw new Error();
    draw(await response.json());
  } catch {
    draw(demo);
  }
}

document.querySelector('#refresh').addEventListener('click', load);
populateRouteControls();
document.querySelector('#show-global').addEventListener('click', () => {
  if (disasterMap) disasterMap.setView(globalCenter, globalZoom);
  else routeSummary('Global view unavailable offline', 'The embedded regional planning map remains available with all local hazard pins and route tracing.');
});
document.querySelector('#focus-region').addEventListener('click', () => {
  if (disasterMap) disasterMap.fitBounds(regionalBounds, {padding: [24, 24]});
  else {
    renderFallbackMap(displayedRisks);
    routeSummary('Regional focus', 'The embedded map is focused on Nepal and North India. Select a place or click the map to set a start point.');
  }
});
document.querySelector('#find-location').addEventListener('click', findLocation);
document.querySelector('#use-my-location').addEventListener('click', useMyLocation);
document.querySelector('#trace-route').addEventListener('click', traceSafeRoute);
document.querySelector('#clear-route').addEventListener('click', () => {
  selectedStart = undefined;
  selectedDestination = undefined;
  if (routeLayer) routeLayer.clearLayers();
  if (!disasterMap) renderFallbackMap(displayedRisks);
  document.querySelector('#location-query').value = '';
  routeSummary('Route cleared', 'Search a supported location, use browser location, or click the map to set a new start point.');
});
document.querySelector('#risk-form').addEventListener('submit', async event => {
  event.preventDefault();
  const body = Object.fromEntries(new FormData(event.target));
  ['relativeVelocity', 'gapDistance', 'timeToCollision', 'laneChangeFrequency', 'latitude', 'longitude'].forEach(key => body[key] = Number(body[key]));
  try {
    const response = await fetch('/api/risks', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)});
    if (!response.ok) throw new Error();
    const risk = await response.json();
    result.textContent = `${risk.level}: ${risk.score}/100`;
    await load();
  } catch {
    const score = Math.round(Math.min(100,
      Math.min(body.relativeVelocity / 60, 1) * 30 +
      Math.max(0, (20 - body.gapDistance) / 20) * 25 +
      Math.max(0, (5 - body.timeToCollision) / 5) * 30 +
      Math.min(body.laneChangeFrequency / 8, 1) * 15));
    const level = score >= 80 ? 'Critical' : score >= 60 ? 'High' : score >= 35 ? 'Moderate' : 'Low';
    const recommendation = score >= 80 ? 'Activate emergency response and issue public warning' : score >= 60 ? 'Prepare regional response teams and monitor conditions' : 'Continue active observation';
    demo.risks.unshift({road: body.road, score, level, recommendation, model: 'Preview risk scorer', hazard: body.hazard, latitude: body.latitude, longitude: body.longitude});
    demo.highRiskZones = demo.risks.filter(risk => risk.score >= 60).length;
    result.textContent = `${level}: ${score}/100`;
    draw(demo);
  }
});

load();
