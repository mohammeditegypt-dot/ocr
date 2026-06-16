const ExcelExport = {
  downloadSingle(data) {
    const wb = XLSX.utils.book_new();

    const infoData = [
      ['الحقل', 'القيمة'],
      ['الاسم', data.name || ''],
      ['الموبايل', data.mobile || ''],
      ['العنوان', data.address || ''],
      ['المحافظة', data.governorate || ''],
      ['التاريخ', data.date || ''],
      ['رقم الايصال', data.receiptNumber || ''],
      ['الباركود', data.barcode || '']
    ];
    const infoSheet = XLSX.utils.aoa_to_sheet(infoData);
    infoSheet['!cols'] = [{ wch: 16 }, { wch: 35 }];
    XLSX.utils.book_append_sheet(wb, infoSheet, 'الايصال');

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

    const filename = data.receiptNumber
      ? `ايصال_${data.receiptNumber.replace(/[\/\\]/g, '-')}.xlsx`
      : `ايصال_${new Date().toISOString().slice(0, 10)}.xlsx`;
    this.triggerDownload(wb, filename);
  },

  downloadAll(list) {
    const wb = XLSX.utils.book_new();

    const rows = [[
      'م', 'الاسم', 'الموبايل', 'العنوان', 'المحافظة',
      'التاريخ', 'رقم الايصال', 'الباركود', 'النص الكامل'
    ]];
    list.forEach((inv, i) => {
      rows.push([
        i + 1,
        inv.name || '',
        inv.mobile || '',
        inv.address || '',
        inv.governorate || '',
        inv.date || '',
        inv.receiptNumber || '',
        inv.barcode || '',
        inv.fullText || ''
      ]);
    });

    const sheet = XLSX.utils.aoa_to_sheet(rows);
    sheet['!cols'] = [
      { wch: 4 }, { wch: 20 }, { wch: 16 }, { wch: 30 }, { wch: 14 },
      { wch: 14 }, { wch: 16 }, { wch: 20 }, { wch: 50 }
    ];
    XLSX.utils.book_append_sheet(wb, sheet, 'كل الإيصالات');

    const allItems = [['رقم الايصال', 'م', 'الصنف', 'الكمية', 'السعر', 'الإجمالي']];
    list.forEach(inv => {
      if (inv.items && inv.items.length > 0) {
        inv.items.forEach((item, i) => {
          allItems.push([
            inv.receiptNumber || '',
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
      itemsSheet['!cols'] = [{ wch: 16 }, { wch: 4 }, { wch: 25 }, { wch: 10 }, { wch: 12 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, itemsSheet, 'البنود');
    }

    this.triggerDownload(wb, `كل_الإيصالات_${new Date().toISOString().slice(0, 10)}.xlsx`);
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
