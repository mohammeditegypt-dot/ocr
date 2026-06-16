const ExcelExport = {
  generate(data) {
    const wb = XLSX.utils.book_new();

    const headerData = [
      ['الحقل', 'القيمة'],
      ['رقم الفاتورة', data.number || ''],
      ['التاريخ', data.date || ''],
      ['المبلغ الإجمالي', data.total || '']
    ];
    const headerSheet = XLSX.utils.aoa_to_sheet(headerData);
    headerSheet['!cols'] = [{ wch: 18 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, headerSheet, 'الفاتورة');

    if (data.items && data.items.length > 0) {
      const itemsData = [['م', 'الصنف', 'الكمية', 'السعر', 'الإجمالي']];
      data.items.forEach((item, i) => {
        itemsData.push([i + 1, item.name || '', item.quantity || '', item.price || '', item.total || '']);
      });
      const itemsSheet = XLSX.utils.aoa_to_sheet(itemsData);
      itemsSheet['!cols'] = [{ wch: 6 }, { wch: 25 }, { wch: 10 }, { wch: 12 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, itemsSheet, 'البنود');
    }

    const textSheet = XLSX.utils.aoa_to_sheet([
      ['النص المستخرج من OCR'],
      [data.fullText || '']
    ]);
    textSheet['!cols'] = [{ wch: 60 }];
    XLSX.utils.book_append_sheet(wb, textSheet, 'النص الكامل');

    return XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  },

  download(data) {
    const array = this.generate(data);
    const blob = new Blob([array], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const filename = data.number
      ? `فاتورة_${data.number.replace(/[\/\\]/g, '-')}.xlsx`
      : `فاتورة_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
};
