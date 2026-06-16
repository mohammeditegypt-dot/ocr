const Ocr = {
  worker: null,

  async ensureWorker() {
    if (!this.worker) {
      this.worker = await Tesseract.createWorker('ara');
    }
    return this.worker;
  },

  async processImage(imageData, onProgress) {
    const worker = await this.ensureWorker();
    onProgress?.(-1, 'تحميل المحرك...');
    const { data } = await worker.recognize(imageData, undefined, {
      logger: m => {
        if (m.status === 'loading tesseract core') {
          onProgress?.(-1, 'تحميل المحرك...');
        } else if (m.status === 'initializing tesseract') {
          onProgress?.(-1, 'تهيئة المحرك...');
        } else if (m.status === 'loading language traineddata') {
          onProgress?.(-1, 'تحميل ملفات العربية...');
        } else if (m.status === 'initializing language') {
          onProgress?.(-1, 'تهيئة اللغة العربية...');
        } else if (m.status === 'recognizing text') {
          const pct = Math.round((m.progress || 0) * 100);
          onProgress?.(pct, `معالجة النص... ${pct}%`);
        }
      }
    });
    return data.text;
  },

  async terminate() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
};
