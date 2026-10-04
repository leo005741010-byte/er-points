// 急診點數 Service Worker
// 改版後手機還看到舊畫面：把 CACHE 版本號 +1 再推（或在 App「其他設定 → 強制更新」）
const CACHE='er-points-v1';
const CORE=['./','./index.html','./me.html','./manifest.json','./manifest-me.json','./icon-192.png','./icon-512.png','./apple-touch-icon.png'];

self.addEventListener('install', e=>{
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE).catch(()=>{})));
});

self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch', e=>{
  const req=e.request;
  if(req.method!=='GET') return;
  const url=new URL(req.url);
  if(url.origin!==location.origin) return; // 試算表、Firebase 等跨網域請求直通，不快取

  // HTML：network-first（優先拿最新版），離線退回快取。
  // 一定要 no-store：GitHub Pages 的 HTML 帶 max-age=600，不繞過瀏覽器快取的話改版後 10 分鐘內還是舊畫面
  // （me.html 是用 fetch 去抓 index.html 的，不算頁面導覽，所以 .html 結尾的也要算進來，否則會一直拿到快取裡的舊程式）
  if(req.mode==='navigate' || (req.headers.get('accept')||'').includes('text/html') || /\.html$/.test(url.pathname)){
    e.respondWith(
      fetch(req.url,{cache:'no-store'}).then(res=>{
        const copy=res.clone();
        caches.open(CACHE).then(c=>c.put(req,copy));
        return res;
      }).catch(()=>caches.match(req).then(r=>r||caches.match('./index.html')))
    );
    return;
  }

  // 其他靜態資源（圖示、xlsx 函式庫）：cache-first
  e.respondWith(
    caches.match(req).then(cached=>cached || fetch(req).then(res=>{
      if(res.ok){ const copy=res.clone(); caches.open(CACHE).then(c=>c.put(req,copy)); }
      return res;
    }).catch(()=>cached))
  );
});
