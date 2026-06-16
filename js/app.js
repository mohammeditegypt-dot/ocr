(function () {
  const App = {
    currentImageData: null,
    currentData: null,
    invoiceList: [],
    STORAGE_KEY: 'ocr-invoice-list',

    els: {},

    init() {
      this.cacheElements();
      this.loadList();
      this.bindEvents();
      this.checkServiceWorker();
    },

    cacheElements() {
      const id = s => document.getElementById(s);
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
        btnAddToList: id('btn-add-to-list'),
        btnExportSingle: id('btn-export-single'),
        btnExportAll: id('btn-export-all'),
        btnClearList: id('btn-clear-list'),
        fileUpload: id('image-upload'),
        fieldNumber: id('field-number'),
        fieldDate: id('field-date'),
        fieldTotal: id('field-total'),
        fieldFulltext: id('field-fulltext'),
        itemsBody: id('items-body'),
        noItems: id('no-items'),
        listBody: id('list-body'),
        listEmpty: id('list-empty'),
        listCount: id('list-count'),
        toastContainer: id('toast-container')
      };
    },

    bindEvents() {
      this.els.btnStartCamera.addEventListener('click', () => this.startCamera());
      this.els.btnCapture.addEventListener('click', () => this.capturePhoto());
      this.els.btnSwitch.addEventListener('click', () => this.switchCamera());
      this.els.btnRetake.addEventListener('click', () => this.retake());
      this.els.btnProcess.addEventListener('click', () => this.processOcr());
      this.els.btnAddToList.addEventListener('click', () => this.addToList());
      this.els.btnExportSingle.addEventListener('click', () => this.exportSingle());
      this.els.btnExportAll.addEventListener('click', () => this.exportAll());
      this.els.btnClearList.addEventListener('click', () => this.clearList());
      this.els.fileUpload.addEventListener('change', (e) => this.handleFileUpload(e));
    },

    checkServiceWorker() {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('service-worker.js').catch(() => {});
      }
    },

    loadList() {
      try {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        if (saved) this.invoiceList = JSON.parse(saved);
      } catch (_) {}
      this.renderList();
    },

    saveList() {
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.invoiceList));
      } catch (_) {}
      this.renderList();
    },

    renderList() {
      const tbody = this.els.listBody;
      tbody.innerHTML = '';
      this.els.listCount.textContent = `${this.invoiceList.length} فاتورة`;

      if (this.invoiceList.length === 0) {
        this.els.listEmpty.style.display = 'block';
        return;
      }
      this.els.listEmpty.style.display = 'none';

      this.invoiceList.forEach((inv, i) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${i + 1}</td>
          <td>${this.escapeHtml(inv.number || '—')}</td>
          <td>${this.escapeHtml(inv.date || '—')}</td>
          <td>${this.escapeHtml(inv.total || '—')}</td>
          <td>${inv.addedAt || '—'}</td>
        `;
        tbody.appendChild(tr);
      });
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
        this.showToast('تعذر تشغيل الكاميرا. استخدم رفع صورة.', 'error');
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
          this.els.progressStatus.textContent = msg || 'جارٍ المعالجة...';
          if (pct >= 0) this.els.progressFill.style.width = pct + '%';
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
        this.showToast(err.message || 'حدث خطأ. حاول مرة أخرى.', 'error');
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
      rows.forEach(row => {
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

    addToList() {
      const data = this.getEditedData();
      if (!data.number && !data.fullText) {
        this.showToast('لا توجد بيانات للإضافة', 'error');
        return;
      }
      data.addedAt = new Date().toLocaleString('ar-EG', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
      });
      this.invoiceList.push(data);
      this.saveList();
      this.showToast('✓ تم إضافة الفاتورة إلى القائمة', 'success');
      this.retake();
    },

    exportSingle() {
      const data = this.getEditedData();
      if (!data.number && !data.fullText) {
        this.showToast('لا توجد بيانات للتصدير', 'error');
        return;
      }
      try {
        ExcelExport.downloadSingle(data);
        this.showToast('✓ تم تصدير Excel', 'success');
      } catch (err) {
        console.error('Excel Error:', err);
        this.showToast('فشل في تصدير Excel', 'error');
      }
    },

    exportAll() {
      if (this.invoiceList.length === 0) {
        this.showToast('القائمة فارغة', 'error');
        return;
      }
      try {
        ExcelExport.downloadAll(this.invoiceList);
        this.showToast('✓ تم تصدير جميع الفواتير', 'success');
      } catch (err) {
        console.error('Excel Error:', err);
        this.showToast('فشل في تصدير Excel', 'error');
      }
    },

    clearList() {
      if (this.invoiceList.length === 0) return;
      if (confirm('هل أنت متأكد من مسح جميع الفواتير؟')) {
        this.invoiceList = [];
        this.saveList();
        this.showToast('تم مسح القائمة', 'success');
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
