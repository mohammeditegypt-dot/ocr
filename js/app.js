(function () {
  const App = {
    currentImageData: null,
    currentData: null,

    els: {},

    init() {
      this.cacheElements();
      this.bindEvents();
      this.checkServiceWorker();
    },

    cacheElements() {
      const id = s => document.getElementById(s);
      const q = s => document.querySelector(s);
      this.els = {
        video: id('video'),
        canvas: id('canvas'),
        preview: id('preview'),
        previewSection: id('preview-section'),
        cameraPlaceholder: id('camera-placeholder'),
        cameraSection: id('camera-section'),
        resultsSection: id('results-section'),
        progressSection: id('progress-section'),
        progressFill: id('progress-fill'),
        progressStatus: id('progress-status'),
        btnStartCamera: id('btn-start-camera'),
        btnCapture: id('btn-capture'),
        btnSwitch: id('btn-switch-camera'),
        btnRetake: id('btn-retake'),
        btnProcess: id('btn-process'),
        btnExport: id('btn-export-excel'),
        fileUpload: id('image-upload'),
        fieldNumber: id('field-number'),
        fieldDate: id('field-date'),
        fieldTotal: id('field-total'),
        fieldFulltext: id('field-fulltext'),
        itemsBody: id('items-body'),
        noItems: id('no-items'),
        toastContainer: id('toast-container')
      };
    },

    bindEvents() {
      this.els.btnStartCamera.addEventListener('click', () => this.startCamera());
      this.els.btnCapture.addEventListener('click', () => this.capturePhoto());
      this.els.btnSwitch.addEventListener('click', () => this.switchCamera());
      this.els.btnRetake.addEventListener('click', () => this.retake());
      this.els.btnProcess.addEventListener('click', () => this.processOcr());
      this.els.btnExport.addEventListener('click', () => this.exportExcel());
      this.els.fileUpload.addEventListener('change', (e) => this.handleFileUpload(e));
    },

    checkServiceWorker() {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('service-worker.js').catch(() => {});
      }
    },

    async startCamera() {
      try {
        await Camera.start(this.els.video);
        this.els.cameraPlaceholder.style.display = 'none';
        this.els.video.style.display = 'block';
        this.els.btnStartCamera.style.display = 'none';
        this.els.btnCapture.style.display = 'inline-flex';
        this.els.btnSwitch.style.display = 'inline-flex';
      } catch (e) {
        this.showToast('تعذر تشغيل الكاميرا. يرجى السماح بالصلاحية أو رفع صورة.', 'error');
      }
    },

    async switchCamera() {
      Camera.switchFacing();
      await this.startCamera();
    },

    capturePhoto() {
      const dataUrl = Camera.capture(this.els.video, this.els.canvas);
      this.showPreview(dataUrl);
    },

    async handleFileUpload(e) {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const dataUrl = await Camera.loadFile(file);
        this.showPreview(dataUrl);
      } catch (err) {
        this.showToast('فشل في قراءة الملف', 'error');
      }
      e.target.value = '';
    },

    showPreview(dataUrl) {
      this.currentImageData = dataUrl;
      this.els.preview.src = dataUrl;
      this.els.previewSection.style.display = 'block';
      this.els.resultsSection.style.display = 'none';
      this.els.progressSection.style.display = 'none';
      Camera.stop();
      this.els.btnCapture.style.display = 'none';
      this.els.btnSwitch.style.display = 'none';
      this.els.btnStartCamera.style.display = 'inline-flex';
      this.els.video.style.display = 'none';
      this.els.cameraPlaceholder.style.display = 'flex';

      this.els.previewSection.scrollIntoView({ behavior: 'smooth' });
    },

    retake() {
      this.currentImageData = null;
      this.currentData = null;
      this.els.previewSection.style.display = 'none';
      this.els.resultsSection.style.display = 'none';
      this.els.progressSection.style.display = 'none';
      this.els.btnStartCamera.style.display = 'inline-flex';

      this.els.cameraSection.scrollIntoView({ behavior: 'smooth' });
    },

    async processOcr() {
      if (!this.currentImageData) return;

      this.els.resultsSection.style.display = 'none';
      this.els.progressSection.style.display = 'block';
      this.els.progressFill.style.width = '0%';
      this.els.progressStatus.textContent = 'جارٍ التجهيز...';
      this.els.btnProcess.disabled = true;
      this.els.btnProcess.innerHTML = '<span class="spinner"></span> جاري المعالجة...';

      this.els.progressSection.scrollIntoView({ behavior: 'smooth' });

      try {
        const text = await Ocr.processImage(this.currentImageData, (pct, msg) => {
          if (pct < 0 || msg) {
            this.els.progressStatus.textContent = msg || 'جارٍ المعالجة...';
            if (pct >= 0) this.els.progressFill.style.width = pct + '%';
          } else {
            this.els.progressFill.style.width = pct + '%';
            this.els.progressStatus.textContent = msg || `معالجة النص... ${pct}%`;
          }
        });

        this.els.progressFill.style.width = '100%';
        this.els.progressStatus.textContent = 'تمت المعالجة بنجاح ✓';

        this.currentData = Parser.parse(text);
        this.displayResults(this.currentData);
        this.els.progressSection.style.display = 'none';
        this.els.resultsSection.style.display = 'block';
        this.els.resultsSection.scrollIntoView({ behavior: 'smooth' });
        this.showToast('تم استخراج البيانات بنجاح', 'success');
      } catch (err) {
        console.error('OCR Error:', err);
        this.els.progressSection.style.display = 'none';
        this.showToast('حدث خطأ أثناء المعالجة. حاول مرة أخرى.', 'error');
      } finally {
        this.els.btnProcess.disabled = false;
        this.els.btnProcess.innerHTML = '🔍 معالجة OCR';
      }
    },

    displayResults(data) {
      this.els.fieldNumber.textContent = data.number;
      this.els.fieldDate.textContent = data.date;
      this.els.fieldTotal.textContent = data.total;
      this.els.fieldFulltext.value = data.fullText;

      const tbody = this.els.itemsBody;
      tbody.innerHTML = '';

      if (data.items && data.items.length > 0) {
        this.els.noItems.style.display = 'none';
        data.items.forEach((item, i) => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${i + 1}</td>
            <td>${this.escapeHtml(item.name)}</td>
            <td>${item.quantity}</td>
            <td>${item.price}</td>
            <td>${item.total}</td>
          `;
          tbody.appendChild(tr);
        });
      } else {
        this.els.noItems.style.display = 'block';
      }
    },

    getEditedData() {
      const items = [];
      const rows = this.els.itemsBody.querySelectorAll('tr');
      rows.forEach((row, i) => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 5) {
          items.push({
            name: cells[1].textContent,
            quantity: cells[2].textContent,
            price: cells[3].textContent,
            total: cells[4].textContent
          });
        }
      });

      return {
        number: this.els.fieldNumber.textContent.trim(),
        date: this.els.fieldDate.textContent.trim(),
        total: this.els.fieldTotal.textContent.trim(),
        fullText: this.els.fieldFulltext.value.trim(),
        items: items
      };
    },

    exportExcel() {
      const data = this.getEditedData();
      if (!data.number && !data.fullText) {
        this.showToast('لا توجد بيانات للتصدير', 'error');
        return;
      }
      try {
        ExcelExport.download(data);
        this.showToast('تم تصدير Excel بنجاح ✓', 'success');
      } catch (err) {
        console.error('Excel Error:', err);
        this.showToast('فشل في تصدير Excel', 'error');
      }
    },

    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    },

    showToast(message, type) {
      const toast = document.createElement('div');
      toast.className = `toast ${type || ''}`;
      toast.textContent = message;
      this.els.toastContainer.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    }
  };

  document.addEventListener('DOMContentLoaded', () => App.init());
})();
