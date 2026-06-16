const CustomOcr = {
  worker: null,
  TIMEOUT_MS: 300000,

  getBaseUrl() {
    const path = window.location.href;
    const idx = path.lastIndexOf('/');
    return path.substring(0, idx + 1);
  },

  workerBlobUrl: null,

  getWorkerBlob() {
    if (this.workerBlobUrl) return this.workerBlobUrl;
    const base = this.getBaseUrl();
    const code = `
const corePath = '${base}lib/tesseract-core.wasm.js';
const langDataUrl = 'https://cdn.jsdelivr.net/npm/tesseract.js@4.1.4/tessdata/ara.traineddata.gz';

importScripts(corePath);

let Module = null;
let api = null;
let ready = false;

function send(msg) { self.postMessage(msg); }

async function downloadLanguage() {
  send({ status: 'progress', msg: 'تحميل ملفات العربية...' });
  const resp = await fetch(langDataUrl);
  if (!resp.ok) throw new Error('فشل تحميل ملف اللغة');
  const compressed = await resp.arrayBuffer();
  send({ status: 'progress', msg: 'فك ضغط ملفات العربية...' });
  let data;
  if (typeof DecompressionStream !== 'undefined') {
    const stream = new Response(new Uint8Array(compressed)).body
      .pipeThrough(new DecompressionStream('gzip'));
    const result = await new Response(stream).blob();
    data = new Uint8Array(await result.arrayBuffer());
  } else {
    data = new Uint8Array(compressed);
  }
  return data;
}

async function initCore() {
  send({ status: 'progress', msg: 'تحميل المحرك...' });
  Module = await TesseractCore();
  send({ status: 'progress', msg: 'تهيئة المحرك...' });
  const langData = await downloadLanguage();
  send({ status: 'progress', msg: 'كتابة ملفات اللغة...' });
  try { Module.FS.mkdir('/tesseract'); } catch(e) {}
  try { Module.FS.mkdir('/tesseract/tessdata'); } catch(e) {}
  Module.FS.writeFile('/tesseract/tessdata/ara.traineddata', langData);
  send({ status: 'progress', msg: 'تهيئة اللغة العربية...' });
  api = new Module.TessBaseAPI();
  api.Init('/tesseract/', 'ara');
  ready = true;
  send({ status: 'ready' });
}

initCore().catch(err => {
  send({ status: 'error', error: err.message || String(err) });
});

self.onmessage = function(evt) {
  const msg = evt.data;
  if (msg.action === 'recognize') {
    if (!ready || !api) {
      send({ status: 'error', jobId: msg.jobId, error: 'لم يتم التهيئة بعد' });
      return;
    }
    try {
      const data = msg.image;
      const size = data.length;
      const heapPtr = Module._malloc(size);
      Module.HEAPU8.set(data, heapPtr);
      const pixPtr = Module._pixReadMem(heapPtr, size);
      Module._free(heapPtr);
      if (!pixPtr) {
        send({ status: 'error', jobId: msg.jobId, error: 'فشل قراءة الصورة' });
        return;
      }
      api.SetImage(pixPtr);
      api.Recognize(null);
      const textPtr = Module._emscripten_bind_TessBaseAPI_GetUTF8Text_0(api.If);
      let text = '';
      if (textPtr) {
        let end = textPtr;
        while (Module.HEAPU8[end] !== 0) end++;
        text = new TextDecoder('utf-8').decode(Module.HEAPU8.subarray(textPtr, end));
        Module._free(textPtr);
      }
      const pp = Module._malloc(4);
      Module.HEAPU32[pp >> 2] = pixPtr;
      Module._pixDestroy(pp);
      Module._free(pp);
      send({ status: 'result', jobId: msg.jobId, text: text });
    } catch (e) {
      send({ status: 'error', jobId: msg.jobId, error: e.message || String(e) });
    }
  } else if (msg.action === 'terminate') {
    if (api) { api.End(); api.delete(); api = null; }
    ready = false;
    self.close();
  }
};
`;
    const blob = new Blob([code], { type: 'application/javascript' });
    this.workerBlobUrl = URL.createObjectURL(blob);
    return this.workerBlobUrl;
  },

  async processImage(imageData, onProgress) {
    const blobUrl = this.getWorkerBlob();

    if (!this.worker) {
      this.worker = new Worker(blobUrl);
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('انتهت مهلة المعالجة (5 دقائق)'));
      }, this.TIMEOUT_MS);

      let ocrStarted = false;

      const handler = (evt) => {
        const msg = evt.data;
        if (msg.status === 'progress') {
          onProgress?.(-1, msg.msg);
        } else if (msg.status === 'ready') {
          if (!ocrStarted) {
            ocrStarted = true;
            onProgress?.(-1, 'جارٍ التعرف على النص...');
            this.worker.postMessage({ action: 'recognize', jobId: 1, image: imageData }, [imageData.buffer]);
          }
        } else if (msg.status === 'result') {
          clearTimeout(timeout);
          this.worker.removeEventListener('message', handler);
          onProgress?.(-1, 'تمت المعالجة بنجاح ✓');
          resolve(msg.text);
        } else if (msg.status === 'error') {
          clearTimeout(timeout);
          this.worker.removeEventListener('message', handler);
          reject(new Error(msg.error));
        }
      };

      this.worker.addEventListener('message', handler);
    });
  },

  async terminate() {
    if (this.worker) {
      this.worker.postMessage({ action: 'terminate' });
      this.worker.terminate();
      this.worker = null;
    }
  }
};
