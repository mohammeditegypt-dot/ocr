const Ocr = {
  worker: null,

  async ensureWorker() {
    if (!this.worker) {
      this.worker = await Tesseract.createWorker('ara', 1, {
        logger: () => {}
      });
    }
    return this.worker;
  },

  async processImage(imageData, onProgress) {
    const worker = await this.ensureWorker();
    const { data } = await worker.recognize(imageData, {
      logger: m => {
        if (m.status === 'recognizing text') {
          onProgress?.(Math.round((m.progress || 0) * 100));
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
