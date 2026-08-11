/* Offline shell. Rural viewing spots have no signal. */
const V='lookup-v2';
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(['./','./index.html'])));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))));self.clients.claim();});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  if(u.hostname.includes('open-meteo'))return;            // always live, app handles failure
  e.respondWith(
    caches.match(e.request).then(hit=>hit||fetch(e.request).then(res=>{
      const cp=res.clone(); caches.open(V).then(c=>c.put(e.request,cp)); return res;
    }).catch(()=>caches.match('./index.html')))
  );
});
