const ExcelExport = {
  downloadSingle(data) {
    const wb = this.buildWorkbook(data.number || '', data.date || '', data.total || '', data.fullText || '', data.items || []);
    this.triggerDownload(wb, `فاتورة_${data.number || new Date().toISOString().slice(0, 10)}.xlsx`);
  },

  downloadAll(list) {
    const wb = XLSX.utils.book_new();

    const rows = [['م', 'رقم الفاتورة', 'التاريخ', 'المبلغ', 'تاريخ الإضافة', 'النص الكامل']];
    list.forEach((inv, i) => {
      rows.push([
        i + 1,
        inv.number || '',
        inv.date || '',
        inv.total || '',
        inv.addedAt || '',
        inv.fullText || ''
      ]);
    });

    const sheet = XLSX.utils.aoa_to_sheet(rows);
    sheet['!cols'] = [
      { wch: 4 }, { wch: 16 }, { wch: 14 },
      { wch: 14 }, { wch: 18 }, { wch: 50 }
    ];
    XLSX.utils.book_append_sheet(wb, sheet, 'كل الفواتير');

    const allItems = [['رقم الفاتورة', 'م', 'الصنف', 'الكمية', 'السعر', 'الإجمالي']];
    list.forEach(inv => {
      if (inv.items && inv.items.length > 0) {
        inv.items.forEach((item, i) => {
          allItems.push([
            inv.number || '',
            i + 1,
            item.name || '',
            item.quantity || '',
            item.price || '',
            item.total || ''
          ]);
        });
      }
    });
    if (allItems.length > 1) {
      const itemsSheet = XLSX.utils.aoa_to_sheet(allItems);
      itemsSheet['!cols'] = [
        { wch: 16 }, { wch: 4 }, { wch: 25 }, { wch: 10 }, { wch: 12 }, { wch: 12 }
      ];
      XLSX.utils.book_append_sheet(wb, itemsSheet, 'البنود');
    }

    this.triggerDownload(wb, `كل_الفواتير_${new Date().toISOString().slice(0, 10)}.xlsx`);
  },

  buildWorkbook(number, date, total, fullText, items) {
    const wb = XLSX.utils.book_new();

    const headerData = [
      ['الحقل', 'القيمة'],
      ['رقم الفاتورة', number || ''],
      ['التاريخ', date || ''],
      ['المبلغ الإجمالي', total || '']
    ];
    const headerSheet = XLSX.utils.aoa_to_sheet(headerData);
    headerSheet['!cols'] = [{ wch: 18 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, headerSheet, 'الفاتورة');

    if (items && items.length > 0) {
      const itemsData = [['م', 'الصنف', 'الكمية', 'السعر', 'الإجمالي']];
      items.forEach((item, i) => {
        itemsData.push([i + 1, item.name || '', item.quantity || '', item.price || '', item.total || '']);
      });
      const itemsSheet = XLSX.utils.aoa_to_sheet(itemsData);
      itemsSheet['!cols'] = [{ wch: 6 }, { wch: 25 }, { wch: 10 }, { wch: 12 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, itemsSheet, 'البنود');
    }

    const textSheet = XLSX.utils.aoa_to_sheet([
      ['النص المستخرج من OCR'],
      [fullText || '']
    ]);
    textSheet['!cols'] = [{ wch: 60 }];
    XLSX.utils.book_append_sheet(wb, textSheet, 'النص الكامل');

    return wb;
  },

  triggerDownload(wb, filename) {
    const array = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([array], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
};
