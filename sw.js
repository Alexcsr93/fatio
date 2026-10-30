// Fatiô – service worker: app funciona offline. Login/sincronização vão direto para a rede.
const CACHE='fatio-v2';
const ARQS=['./','./index.html','./manifest.json','./config.js','./icon-192.png','./icon-512.png','./icon-maskable-512.png','./icon-180.png','./icon-despesa.png','./icon-receita.png','./privacidade.html'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>Promise.all(ARQS.map(a=>c.add(a).catch(()=>{})))));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  const meu=u.origin===location.origin, sdk=u.hostname==='www.gstatic.com'&&u.pathname.startsWith('/firebasejs/');
  if(!meu&&!sdk)return;
  if(meu&&u.pathname.includes('/__/'))return;
  e.respondWith(fetch(e.request).then(r=>{if(r.ok&&!u.search){const c=r.clone();caches.open(CACHE).then(x=>x.put(e.request,c))}return r})
    .catch(()=>caches.match(e.request,{ignoreSearch:true}).then(r=>r||(meu?caches.match('./index.html'):undefined))));
});
