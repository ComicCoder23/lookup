/* All sky positions are calculated locally with the vendored astronomy-engine. */
(() => {
  'use strict';

  const A = window.Astronomy;
  const zone = 'Europe/London';
  const byId = id => document.getElementById(id);
  const fallback = {lat: 55.94, lon: -4.15, name: 'Kirkintilloch · G66'};
  const phases = ['New Moon', 'First quarter', 'Full Moon', 'Last quarter'];
  const showers = [
    ['Quadrantids', 1, 3, '3–4 Jan'],
    ['Lyrids', 4, 22, '22 Apr'],
    ['Eta Aquariids', 5, 6, '6 May'],
    ['Perseids', 8, 12, '12–13 Aug'],
    ['Draconids', 10, 8, '8 Oct'],
    ['Orionids', 10, 21, '21 Oct'],
    ['Leonids', 11, 17, '17 Nov'],
    ['Geminids', 12, 13, '13–14 Dec'],
    ['Ursids', 12, 22, '22 Dec']
  ];
  const fullPostcode = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;
  const outcode = /^[A-Z]{1,2}\d[A-Z\d]?$/i;
  const dayFormat = new Intl.DateTimeFormat('en-GB', {timeZone:zone, day:'numeric', month:'short', year:'numeric'});
  const timeFormat = new Intl.DateTimeFormat('en-GB', {timeZone:zone, hour:'2-digit', minute:'2-digit', hour12:false, timeZoneName:'short'});
  const calendarFormat = new Intl.DateTimeFormat('en-GB', {timeZone:zone, year:'numeric', month:'2-digit', day:'2-digit'});
  // Some browsers label UK winter time "GMT+0"; show plain "GMT".
  function clock(date) { return timeFormat.format(date).replace(/GMT\+0\b/, 'GMT'); }

  function dateOf(time) { return time.date || time; }
  function localParts(date) {
    return Object.fromEntries(calendarFormat.formatToParts(date).filter(p => p.type !== 'literal').map(p => [p.type, Number(p.value)]));
  }
  function localKey(date) {
    const p = localParts(date);
    return p.year * 10000 + p.month * 100 + p.day;
  }
  function observer(place) { return new A.Observer(place.lat, place.lon, 0); }
  function row(list, name, date, detail) {
    const li = document.createElement('li');
    const left = document.createElement('div');
    const label = document.createElement('div');
    label.className = 'name';
    label.textContent = name;
    left.append(label);
    if (detail) {
      const small = document.createElement('div');
      small.className = 'meta';
      small.textContent = detail;
      left.append(small);
    }
    const right = document.createElement('div');
    right.className = 'date';
    right.textContent = date;
    li.append(left, right);
    list.append(li);
  }
  function message(list, text) { row(list, text, '—'); }

  function renderMoon(now) {
    const list = byId('moon-list');
    list.replaceChildren();
    try {
      let q = A.SearchMoonQuarter(now);
      for (let i = 0; i < 8; i++) {
        const date = dateOf(q.time);
        row(list, phases[q.quarter], `${dayFormat.format(date)} · ${clock(date)}`);
        q = A.NextMoonQuarter(q);
      }
    } catch (error) { message(list, 'Moon times unavailable'); console.error(error); }
  }

  function renderMeteors(now) {
    const list = byId('meteor-list');
    list.replaceChildren();
    const p = localParts(now);
    const events = [];
    for (const year of [p.year, p.year + 1]) {
      for (const [name, month, day, label] of showers) {
        const key = year * 10000 + month * 100 + day;
        if (key >= localKey(now)) events.push({name, key, date:`${label} ${year}`});
      }
    }
    events.sort((a, b) => a.key - b.key);
    for (const event of events.slice(0, showers.length)) row(list, event.name, event.date, 'Approximate peak');
  }

  function direction(azimuth) {
    const names = ['N','NE','E','SE','S','SW','W','NW'];
    return names[Math.round(azimuth / 45) % 8];
  }
  function renderPlanets(now, place) {
    const list = byId('planet-list');
    const note = byId('planet-note');
    list.replaceChildren();
    const p = localParts(now);
    const start = new Date(Date.UTC(p.year, p.month - 1, p.day));
    try {
      const obs = observer(place);
      const sunset = A.SearchRiseSet('Sun', obs, -1, start, 2);
      if (!sunset || localKey(dateOf(sunset)) !== localKey(now)) {
        message(list, 'No sunset found for tonight');
        note.textContent = '— Sunset could not be found for this spot and date.';
        return;
      }
      const viewingTime = new Date(dateOf(sunset).getTime() + 60 * 60 * 1000);
      note.textContent = `${dayFormat.format(viewingTime)} at ${clock(viewingTime)}, about an hour after sunset. Heights and directions are for your spot.`;
      for (const body of ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn']) {
        const eq = A.Equator(body, viewingTime, obs, true, true);
        const sky = A.Horizon(viewingTime, obs, eq.ra, eq.dec, 'normal');
        if (sky.altitude > 0) row(list, body, `${Math.round(sky.altitude)}° · ${direction(sky.azimuth)}`);
      }
      if (!list.children.length) message(list, 'None above the horizon');
    } catch (error) {
      message(list, 'Planet positions unavailable');
      note.textContent = '— Could not calculate tonight’s sky.';
      console.error(error);
    }
  }

  function renderEclipse(now, place) {
    const target = byId('eclipse-event');
    target.replaceChildren();
    try {
      const obs = observer(place);
      let event = A.SearchLocalSolarEclipse(now, obs);
      for (let i = 0; i < 30 && event.peak.altitude <= 0; i++) event = A.NextLocalSolarEclipse(event.peak.time, obs);
      if (event.peak.altitude <= 0) throw new Error('No visible eclipse found');
      const title = document.createElement('strong');
      title.textContent = `${dayFormat.format(dateOf(event.peak.time))} · ${event.kind} eclipse`;
      const coverage = document.createElement('p');
      coverage.textContent = `${Math.round(event.obscuration * 100)}% of the Sun covered at the peak.`;
      const times = document.createElement('div');
      times.className = 'times';
      times.textContent = `Starts ${clock(dateOf(event.partial_begin.time))} · Peak ${clock(dateOf(event.peak.time))} · Ends ${clock(dateOf(event.partial_end.time))}`;
      target.append(title, coverage, times);
    } catch (error) {
      target.textContent = '— Eclipse details unavailable for this spot.';
      console.error(error);
    }
  }

  function validPlace(place) {
    return place && Number.isFinite(place.lat) && Number.isFinite(place.lon) &&
      place.lat >= -90 && place.lat <= 90 && place.lon >= -180 && place.lon <= 180 &&
      typeof place.name === 'string' && place.name.length > 0 && place.name.length < 140;
  }
  function savedPlace() {
    try {
      const place = JSON.parse(localStorage.getItem('sky-calendar-place'));
      return validPlace(place) ? place : fallback;
    } catch (_) { return fallback; }
  }
  function setPlace(place) {
    if (!validPlace(place)) return;
    currentPlace = place;
    byId('place').textContent = place.name;
    byId('location-status').textContent = '';
    byId('location-status').classList.remove('error');
    byId('location-input').value = '';
    byId('matches').replaceChildren();
    try { localStorage.setItem('sky-calendar-place', JSON.stringify(place)); } catch (_) {}
    renderPlanets(new Date(), place);
    renderEclipse(new Date(), place);
  }
  function placeFromResult(item, postcode) {
    return {lat:Number(item.latitude), lon:Number(item.longitude),
      name: postcode ? (item.postcode || item.outcode) : `${item.name_1}${item.county_unitary ? ' · ' + item.county_unitary : ''}`};
  }
  async function searchPlace(input) {
    const query = input.trim();
    const postcode = fullPostcode.test(query) || outcode.test(query);
    const path = fullPostcode.test(query) ? `postcodes/${encodeURIComponent(query.replace(/\s+/g, ''))}` :
      outcode.test(query) ? `outcodes/${encodeURIComponent(query.replace(/\s+/g, ''))}` :
      `places?q=${encodeURIComponent(query)}&limit=8`;
    const response = await fetch(`https://api.postcodes.io/${path}`);
    if (!response.ok) throw new Error('Lookup failed');
    const data = await response.json();
    if (data.status !== 200 || !data.result) return [];
    const items = Array.isArray(data.result) ? data.result : [data.result];
    return items.map(item => placeFromResult(item, postcode)).filter(validPlace);
  }

  let currentPlace = savedPlace();
  const matches = document.createElement('div');
  matches.id = 'matches';
  matches.setAttribute('aria-live', 'polite');
  byId('location-status').after(matches);
  byId('place').textContent = currentPlace.name;
  renderMoon(new Date());
  renderMeteors(new Date());
  renderPlanets(new Date(), currentPlace);
  renderEclipse(new Date(), currentPlace);

  byId('location-form').addEventListener('submit', async event => {
    event.preventDefault();
    const query = byId('location-input').value.trim();
    if (!query) return;
    const status = byId('location-status');
    matches.replaceChildren();
    status.classList.remove('error');
    status.textContent = 'Looking up your spot…';
    try {
      const results = await searchPlace(query);
      if (!results.length) {
        status.textContent = 'No match found. Try a full postcode or another town.';
        status.classList.add('error');
      } else if (results.length === 1) {
        setPlace(results[0]);
      } else {
        status.textContent = 'Choose your spot:';
        for (const place of results) {
          const button = document.createElement('button');
          button.type = 'button';
          button.textContent = place.name;
          button.style.cssText = 'display:block;width:100%;text-align:left;margin-top:6px;background:transparent;color:var(--bone);border-color:var(--line)';
          button.addEventListener('click', () => setPlace(place));
          matches.append(button);
        }
      }
    } catch (_) {
      status.textContent = 'Could not look that up. Check your connection. Your saved spot still works.';
      status.classList.add('error');
    }
  });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
