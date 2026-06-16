const Parser = {
  parse(text) {
    const result = {
      name: '',
      mobile: '',
      address: '',
      governorate: '',
      date: '',
      receiptNumber: '',
      barcode: '',
      items: [],
      fullText: text.trim()
    };

    if (!text.trim()) return result;

    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    result.name = this.extractField(text, [
      /(?:الاسم|اسم العميل|اسم المرسل|اسم المستلم|المرسل|المستلم|اسم)\s*[:\-–.]?\s*([\u0600-\u06FF\s]{3,50})/i,
      /(?:Name|Customer|Sender|Receiver)\s*[:\-–.]?\s*([a-zA-Z\s]{3,50})/i
    ]);

    result.mobile = this.extractField(text, [
      /(?:الموبايل|الجوال|التليفون|التلفون|تليفون|تلفون|موبايل|رقم الهاتف|الهاتف|هاتف)\s*[:\-–.]?\s*([\d\s\+\-\(\)]{7,20})/i,
      /(?:Mobile|Phone|Tel|Phone Number|Phone No)\s*[:\-–.]?\s*([\d\s\+\-\(\)]{7,20})/i,
      /(?:01[0125]\d{8}|01\d{9}|\+20\d{10}|0020\d{10})/
    ]);

    result.address = this.extractField(text, [
      /(?:العنوان|عنوان)\s*[:\-–.]?\s*([\u0600-\u06FF\s\d,.\/#\-]{5,100})/i,
      /(?:Address|Adress)\s*[:\-–.]?\s*([a-zA-Z\s\d,.\/#\-]{5,100})/i
    ]);

    result.governorate = this.extractField(text, [
      /(?:المحافظة|المدينة|المنطقة|البلدة|الولاية)\s*[:\-–.]?\s*([\u0600-\u06FF\s]{3,30})/i,
      /(?:Governorate|City|Region|Governorate|State)\s*[:\-–.]?\s*([a-zA-Z\s]{3,30})/i
    ]);

    result.date = this.extractField(text, [
      /(?:التاريخ|تاريخ|بتاريخ)\s*[:\-–.]?\s*([\d\/\-\.]+)/i,
      /(\d{1,4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,4})/,
      /(?:Date)\s*[:\-–.]?\s*([\d\/\-\.]+)/i
    ]);

    result.receiptNumber = this.extractField(text, [
      /(?:رقم الايصال|ايصال رقم|رقم الإيصال|رقم الوصل|وصل رقم|الايصال|الإيصال)\s*[:\-–.]?\s*([\w\d\-/]+)/i,
      /(?:Receipt No|Receipt Number|Receipt#|Receipt)\s*[:\-–.]?\s*([\w\d\-/]+)/i,
      /ايصال\s*رقم\s*([\w\d\-/]+)/i
    ]);

    result.barcode = this.extractField(text, [
      /(?:الباركود|باركود|بارコード|رمز)\s*[:\-–.]?\s*([\d]{5,20})/i,
      /(?:Barcode|باركود|بارコード)\s*[:\-–.]?\s*([\dA-Z\-]{5,30})/i,
      /رقم البوليصة|بوليصة\s*رقم\s*([\d\-]+)/i,
      /([\d]{8,20})/
    ]);

    result.items = this.extractItems(lines);

    return result;
  },

  extractField(text, patterns) {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1] && match[1].trim().length > 1) {
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
      if (/^(?:الإجمالي|المجموع|total|شكر|ملاحظات|الاسم|العنوان|المحمافظ|التاريخ)/i.test(line)) break;

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
