const Ocr = {
  async processImage(imageData, onProgress) {
    return CustomOcr.processImage(imageData, onProgress);
  },

  async terminate() {
    return CustomOcr.terminate();
  }
};
