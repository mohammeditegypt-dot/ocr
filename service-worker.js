const CACHE_NAME = 'ocr-invoice-v3';
const STATIC_ASSETS = [
  'index.html',
  'css/style.css',
  'js/app.js',
  'js/camera.js',
  'js/ocr.js',
  'js/parser.js',
  'js/excel.js',
  'manifest.json'
];

const CDN_URLS = [
  'https://unpkg.com/tesseract.js@3.0.3/dist/tesseract.min.js',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(STATIC_ASSETS);
      for (const url of CDN_URLS) {
        try {
          const res = await fetch(url, { mode: 'cors' });
          if (res.ok) cache.put(url, res);
        } catch (_) {}
      }
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => res || fetch(e.request).then((fetchRes) => {
      if (fetchRes.ok && /tesseract|jsdelivr/.test(e.request.url)) {
        const copy = fetchRes.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, copy));
      }
      return fetchRes;
    }).catch(() => {
      try {
        const title = 'قارئ الفواتير - OCR';
        return new Response(
          `<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body style="font-family:sans-serif;text-align:center;padding:40px;background:#f0f2f5"><h1 style="color:#1a73e8">${title}</h1><p>لا يوجد اتصال بالإنترنت. تم فتح النسخة المخزنة.</p></body></html>`,
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      } catch (_) { return new Response('Offline'); }
    }))
  );
});
