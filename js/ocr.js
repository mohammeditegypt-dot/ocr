const Ocr = {
  TIMEOUT_MS: 300000,

  async processImage(imageData, onProgress) {
    onProgress?.(-1, 'بدء المعالجة...');

    const result = await Promise.race([
      Tesseract.recognize(imageData, 'ara', {
        logger: m => {
          if (m.status === 'loading tesseract core') {
            onProgress?.(-1, 'تحميل المحرك...');
          } else if (m.status === 'initializing tesseract') {
            onProgress?.(-1, 'تهيئة المحرك...');
          } else if (m.status === 'loading language traineddata') {
            const pct = Math.round((m.progress || 0) * 100);
            onProgress?.(pct, `تحميل ملفات العربية... ${pct > 0 ? pct + '%' : ''}`);
          } else if (m.status === 'initializing api') {
            onProgress?.(-1, 'تهيئة اللغة العربية...');
          } else if (m.status === 'recognizing text') {
            const pct = Math.round((m.progress || 0) * 100);
            onProgress?.(pct, `معالجة النص... ${pct}%`);
          } else {
            onProgress?.(-1, m.status || 'جارٍ التحميل...');
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
  }
};
