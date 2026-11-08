// Fatiô – service worker: app funciona offline. Login/sincronização vão direto para a rede.
const CACHE='fatio-v12';
const ARQS=['./','./index.html','./manifest.json','./config.js','./icon-192.png','./icon-512.png','./icon-maskable-512.png','./icon-180.png','./icon-despesa.png','./icon-receita.png','./privacidade.html'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>Promise.all(ARQS.map(a=>c.add(a).catch(()=>{})))));self.skipWaiting()});
// apaga caches antigos, mas mantém 'fatio-dados' (agenda dos lembretes)
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE&&k!=='fatio-dados').map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  const meu=u.origin===location.origin, sdk=u.hostname==='www.gstatic.com'&&u.pathname.startsWith('/firebasejs/');
  if(!meu&&!sdk)return;
  if(meu&&(u.pathname.includes('/__/')||u.pathname.endsWith('/lembretes.json')))return;
  e.respondWith(fetch(e.request).then(r=>{if(r.ok&&!u.search){const c=r.clone();caches.open(CACHE).then(x=>x.put(e.request,c))}return r})
    .catch(()=>caches.match(e.request,{ignoreSearch:true}).then(r=>r||(meu?caches.match('./index.html'):undefined))));
});
// ===== Lembretes com o app fechado (Android, app instalado, quando o sistema permitir) =====
const dataLocal=()=>{const d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,10)};
const somaDias=(s,n)=>{const d=new Date(s+'T12:00');d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)};
const brl=v=>'R$ '+Number(v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
async function checaLembretes(){
  const c=await caches.open('fatio-dados');const r=await c.match('./lembretes.json');if(!r)return;
  const ag=await r.json();if(!ag.on)return;
  const h=dataLocal(),ult=await c.match('./lembrete-dia');if(ult&&(await ult.text())===h)return;
  const lim=somaDias(h,ag.dias||0),it=(ag.lista||[]).filter(x=>x.venc<=lim&&x.venc>=somaDias(h,-31));
  if(!it.length)return;
  const txt=it.slice(0,4).map(x=>ag.oculto?x.d:`${x.d} ${brl(x.v)} ${x.venc<h?'venceu':x.venc===h?'vence hoje':x.venc===somaDias(h,1)?'vence amanhã':'vence '+x.venc.slice(8)+'/'+x.venc.slice(5,7)}`).join(' · ');
  await self.registration.showNotification(it.length===1?'🔔 1 conta para pagar':'🔔 '+it.length+' contas para pagar',{body:txt,icon:'icon-192.png',badge:'icon-192.png',tag:'fatio-lembrete',data:{url:'./?aba=contas'}});
  await c.put('./lembrete-dia',new Response(h));
}
self.addEventListener('periodicsync',e=>{if(e.tag==='fatio-lembretes')e.waitUntil(checaLembretes())});
self.addEventListener('notificationclick',e=>{
  e.notification.close();const url=(e.notification.data&&e.notification.data.url)||'./';
  e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(ws=>{
    for(const w of ws){if('focus' in w){w.navigate(url).catch(()=>{});return w.focus()}}
    return clients.openWindow(url);
  }));
});
