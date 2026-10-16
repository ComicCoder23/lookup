# Look Up — sky calendar

**Live:** [comiccoder23.github.io/lookup](https://comiccoder23.github.io/lookup/)

A small UK sky calendar. It shows the next eight Moon quarter events, approximate meteor shower peaks, planets above the horizon about an hour after sunset, and the next solar eclipse visible from your spot. Dates and times use UK local time.

It starts at Kirkintilloch (G66), so the sky calculations work offline. Search for a UK postcode or town to change the spot; that lookup needs a connection and uses [postcodes.io](https://postcodes.io). The last spot is saved on your device. There is no account or tracking.

When upgrading from the eclipse page, its saved spot is reused unless you have already chosen a calendar location. The eclipse page keeps its original saved data.

The [12 August 2026 eclipse page](eclipse-2026.html) remains available as a record, with its location picker, share card and eclipse-day helpers. Its network features still need a connection: weather and elevation requests send coordinates to Open-Meteo, town searches go to Open-Meteo, and postcode searches go to postcodes.io. The clearer-sky helper also sends nearby coordinates to Open-Meteo and place-name coordinates to BigDataCloud. Opening a directions link shares its destination with Google Maps or OpenStreetMap. These helpers retain their August 2026 event date; they are not current forecasts for a future eclipse.

Plain HTML, CSS and JavaScript. No build step or framework. Astronomy calculations use the vendored [astronomy-engine](https://github.com/cosinekitty/astronomy) 2.1.19 by Don Cross (MIT). `sw.js` caches the pages and astronomy code for offline use after the first load. Web fonts come from Google Fonts when available; system fallbacks are provided.
