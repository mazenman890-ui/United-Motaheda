// src/services/catalogParser.ts

export interface SheetProductRow {
  barcode: string;
  name_en: string;
  name_ar: string;
  category_en: string;
  category_ar: string;
  price: number;
  stock_quantity: number;
  is_variation: boolean;
  parent_barcode?: string; // لربط الأقراص والشراب بنفس الدواء الأساسي
}

/**
 * دالة لتحليل وتنظيف ملفات CSV الخاصة بكتالوج الصيدلية
 * وتجهيزها للإرسال إلى Google Sheets
 */
export const parsePharmacyCatalogCSV = (csvText: string): SheetProductRow[] => {
  const lines = csvText.split('\n').filter(line => line.trim() !== '');
  if (lines.length === 0) return [];
  
  // استخراج أسماء الأعمدة من السطر الأول وتحويلها لحروف صغيرة للمطابقة
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const products: SheetProductRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    // تعبير رياضي (Regex) ذكي لتجاهل الفواصل الموجودة داخل علامات التنصيص
    const currentLine = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
    
    if (!currentLine) continue;

    // تنظيف القيم من علامات التنصيص الزائدة والمسافات
    const values = currentLine.map(val => val.replace(/^"|"$/g, '').trim());

    try {
      const price = parseFloat(values[headers.indexOf('price')]) || 0;
      const barcode = values[headers.indexOf('barcode')] || '';

      // يجب أن يحتوي المنتج على باركود وسعر صالح لتجنب إدخال بيانات تالفة
      if (price > 0 && barcode) {
        products.push({
          barcode,
          name_en: values[headers.indexOf('name_english')] || 'Unknown',
          name_ar: values[headers.indexOf('name_arabic')] || 'غير معروف',
          category_en: values[headers.indexOf('category_english')] || 'General',
          category_ar: values[headers.indexOf('category_arabic')] || 'عام',
          price,
          stock_quantity: parseInt(values[headers.indexOf('stock')]) || 0,
          is_variation: values[headers.indexOf('is_variation')] === 'true' || false,
          parent_barcode: values[headers.indexOf('parent_barcode')] || undefined,
        });
      }
    } catch (error) {
      console.error(`Error parsing row ${i}:`, error);
    }
  }

  return products;
};