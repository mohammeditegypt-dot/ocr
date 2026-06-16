const Camera = {
  stream: null,
  facingMode: 'environment',
  MAX_WIDTH: 1000,

  async start(videoEl) {
    this.stop();
    const constraints = {
      video: {
        facingMode: this.facingMode,
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    };
    this.stream = await navigator.mediaDevices.getUserMedia(constraints);
    videoEl.srcObject = this.stream;
    await videoEl.play();
  },

  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
  },

  capture(videoEl, canvasEl) {
    const ctx = canvasEl.getContext('2d');
    let w = videoEl.videoWidth || 640;
    let h = videoEl.videoHeight || 480;
    if (w > this.MAX_WIDTH) {
      h = Math.round(h * this.MAX_WIDTH / w);
      w = this.MAX_WIDTH;
    }
    canvasEl.width = w;
    canvasEl.height = h;
    ctx.drawImage(videoEl, 0, 0, w, h);
    return canvasEl.toDataURL('image/jpeg', 0.7);
  },

  switchFacing() {
    this.facingMode = this.facingMode === 'environment' ? 'user' : 'environment';
  },

  async loadFile(file) {
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    return this.resizeDataUrl(dataUrl);
  },

  resizeDataUrl(dataUrl) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width;
        let h = img.height;
        if (w > this.MAX_WIDTH) {
          h = Math.round(h * this.MAX_WIDTH / w);
          w = this.MAX_WIDTH;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = dataUrl;
    });
  },

  async enumerateCameras() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(d => d.kind === 'videoinput');
  }
};
