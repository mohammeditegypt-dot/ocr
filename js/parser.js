const Parser = {
  parse(text) {
    const result = {
      number: '',
      date: '',
      total: '',
      items: [],
      fullText: text.trim()
    };

    if (!text.trim()) return result;

    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    result.number = this.extractField(text, [
      /رقم\s*(?:الفاتورة|الفواتير|فاتورة|الأمر)?\s*[:\-–.]?\s*([\w\d\-/]+)/i,
      /فاتورة\s*رقم\s*[:\-–.]?\s*([\w\d\-/]+)/i,
      /#\s*(\d+)/,
      /invoice\s*(?:no|number|#)\s*[:\-–.]?\s*([\w\d\-/]+)/i
    ]);

    result.date = this.extractField(text, [
      /(?:تاريخ|التاريخ|بتاريخ)\s*[:\-–.]?\s*([\d\/\-\.]+)/i,
      /(\d{1,4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,4})/,
      /date\s*[:\-–.]?\s*([\d\/\-\.]+)/i
    ]);

    result.total = this.extractField(text, [
      /(?:الإجمالي|المجموع|المبلغ)\s*(?:الكلي|النهائي|الإجمالي)?\s*[:\-–.]?\s*([\d\.,]+)/i,
      /total\s*[:\-–.]?\s*([\d\.,]+)/i,
      /(?:ريال|د.ك|دينار|جنيه|ل\.س|شيكل|دولار)\s*([\d\.,]+)/i,
      /([\d\.,]+)\s*(?:ريال|د\.ك|دينار|جنيه)/i
    ]);

    result.items = this.extractItems(lines);

    return result;
  },

  extractField(text, patterns) {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    return '';
  },

  extractItems(lines) {
    const items = [];
    let inItemsSection = false;
    const sectionKeywords = /(?:م|رقم|البيان|الصنف|المنتج|الوصف|البند|الكمية|العدد|السعر|المبلغ|الإجمالي)/;

    for (const line of lines) {
      if (sectionKeywords.test(line) && /\d/.test(line)) {
        inItemsSection = true;
        continue;
      }

      if (!inItemsSection) continue;
      if (/^(?:الإجمالي|المجموع|total|شكر|ملاحظات)/i.test(line)) break;

      const parts = line.split(/\s{2,}|\t+|,+/).filter(Boolean);
      if (parts.length >= 2) {
        const nums = parts.map(p => parseFloat(p.replace(/[^\d\.]/g, ''))).filter(n => !isNaN(n));
        const texts = parts.filter(p => isNaN(parseFloat(p.replace(/[^\d\.]/g, ''))));

        if (nums.length >= 1) {
          items.push({
            name: texts[0] || `بند ${items.length + 1}`,
            quantity: nums.length >= 2 ? String(nums[0]) : '1',
            price: nums.length >= 2 ? String(nums[1]) : String(nums[0]),
            total: nums.length >= 2 ? String(nums[nums.length - 1]) : String(nums[0])
          });
        }
      }
    }

    return items.slice(0, 50);
  }
};
