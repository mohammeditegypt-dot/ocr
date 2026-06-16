const Ocr = {
  worker: null,
  TIMEOUT_MS: 300000,

  async ensureWorker(onProgress) {
    if (!this.worker) {
      onProgress?.(-1, 'جارٍ تحميل محرك OCR...');
      this.worker = await Tesseract.createWorker('ara', 1, {
        logger: m => {
          if (m.status === 'loading tesseract core') {
            onProgress?.(-1, 'تحميل المحرك...');
          } else if (m.status === 'initializing tesseract') {
            onProgress?.(-1, 'تهيئة المحرك...');
          } else if (m.status === 'loading language traineddata') {
            const pct = Math.round((m.progress || 0) * 100);
            onProgress?.(pct, `تحميل ملفات العربية... ${pct > 0 ? pct + '%' : 'قد يستغرق دقيقة'}`);
          } else if (m.status === 'initializing language') {
            onProgress?.(-1, 'تهيئة اللغة العربية...');
          }
        }
      });
    }
    return this.worker;
  },

  async processImage(imageData, onProgress) {
    const worker = await this.ensureWorker(onProgress);
    onProgress?.(-1, 'بدء التعرف على النص...');

    const result = await Promise.race([
      worker.recognize(imageData, {
        logger: m => {
          if (m.status === 'recognizing text') {
            const pct = Math.round((m.progress || 0) * 100);
            onProgress?.(pct, `معالجة النص... ${pct}%`);
          }
        }
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('انتهت مهلة المعالجة (5 دقائق)')), this.TIMEOUT_MS)
      )
    ]);

    return result.data.text;
  },

  async terminate() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
};
