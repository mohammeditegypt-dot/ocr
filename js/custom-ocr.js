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

importScripts(corePath);

let Module = null;
let api = null;
let ready = false;

TesseractCore().then(mod => {
  Module = mod;
  send({ status: 'core_ready' });
}).catch(err => {
  send({ status: 'core_error', error: err.message || String(err) });
});

function send(msg) {
  self.postMessage(msg);
}

function recv(evt) {
  const msg = evt.data;
  if (msg.action === 'init') {
    if (!Module) {
      send({ status: 'error', jobId: msg.jobId, error: 'Core not loaded' });
      return;
    }
    try {
      api = new Module.TessBaseAPI();
      api.Init(null, 'ara');
      ready = true;
      send({ status: 'ready', jobId: msg.jobId });
    } catch (e) {
      send({ status: 'error', jobId: msg.jobId, error: e.message || String(e) });
    }
  } else if (msg.action === 'recognize') {
    if (!ready || !api) {
      send({ status: 'error', jobId: msg.jobId, error: 'Not initialized' });
      return;
    }
    try {
      const buf = msg.image;
      const pix = Module._pixReadMem(buf, buf.length);
      if (!pix) {
        send({ status: 'error', jobId: msg.jobId, error: 'Failed to read image' });
        return;
      }
      api.SetImage(pix);
      const textPtr = api.GetUTF8Text();
      const text = Module.UTF8ToString(textPtr);
      Module._free(textPtr);
      pix.destroy();
      send({ status: 'result', jobId: msg.jobId, text: text });
    } catch (e) {
      send({ status: 'error', jobId: msg.jobId, error: e.message || String(e) });
    }
  } else if (msg.action === 'terminate') {
    if (api) {
      api.End();
      api.delete();
      api = null;
    }
    ready = false;
    self.close();
  }
}

self.onmessage = recv;
`;
    const blob = new Blob([code], { type: 'application/javascript' });
    this.workerBlobUrl = URL.createObjectURL(blob);
    return this.workerBlobUrl;
  },

  async processImage(imageData, onProgress) {
    onProgress?.(-1, 'بدء المعالجة...');
    const blobUrl = this.getWorkerBlob();

    if (!this.worker) {
      this.worker = new Worker(blobUrl);
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('انتهت مهلة المعالجة (5 دقائق)'));
      }, this.TIMEOUT_MS);

      const handler = (evt) => {
        const msg = evt.data;
        if (msg.status === 'core_ready') {
          onProgress?.(-1, 'تم تحميل المحرك، جاري تهيئة العربية...');
          this.worker.postMessage({ action: 'init', jobId: 1 });
        } else if (msg.status === 'ready') {
          onProgress?.(-1, 'جارٍ التعرف على النص...');
          this.worker.postMessage({ action: 'recognize', jobId: 2, image: imageData });
        } else if (msg.status === 'result') {
          clearTimeout(timeout);
          this.worker.removeEventListener('message', handler);
          onProgress?.(-1, 'تمت المعالجة بنجاح ✓');
          resolve(msg.text);
        } else if (msg.status === 'error') {
          clearTimeout(timeout);
          this.worker.removeEventListener('message', handler);
          reject(new Error(msg.error));
        } else if (msg.status === 'core_error') {
          clearTimeout(timeout);
          this.worker.removeEventListener('message', handler);
          reject(new Error('فشل تحميل المحرك: ' + msg.error));
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
