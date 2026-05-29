/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  SystemSettings,
  Customer,
  Product,
  Receipt,
  ReturnEvent,
  Expense,
  AlertNotification,
  Appointment,
  NoteItem,
  AuditLog,
  TerminalUser,
  BillItemRef
} from './types';

const defaultSettings: SystemSettings = {
  SHOP_NAME: 'จีรกิตติ์ ไม้แบบพลาสติก อุตรดิตถ์',
  SHOP_ADDRESS: '98/12 หมู่ 3 ต.ท่าเสา อ.เมือง จ.อุตรดิตถ์ 53000',
  SHOP_TELEPHONE: '093-170-3949',
  TAX_ID: '0535567000123',
  LINE_QR_URL: 'https://i.ibb.co/8LW54rQm/IMG-0824.jpg',
  BANK_QR_URL: 'https://i.ibb.co/FkzF4CXD/S-11485187.jpg',
  VAT_RATE: 7,
  VAT_MODE: 'EXCLUDE',
  PENALTY_RATE: 1.5, // 1.5% per day late
  RECEIPT_PAPER_SIZE: 'A4',
  RECEIPT_FOOTNOTE: 'ได้รับสินค้าถูกต้องและครบถ้วนแล้ว ของเสียหาย/สูญหายปรับตามอัตราที่กําหนด',
  RECEIPT_WARNING: 'คำเตือน: โปรดรักษาความสะอาดแบบเหล็ก/แบบพลาสติก ห้ามเคาะด้วยแกนเหล็กหรือพ่นสีทับ'
};

const defaultCustomers: Customer[] = [
  {
    customer_id: 'CUS-1001',
    customer_name: 'ลูกค้าเงินสด (ทั่วไป)',
    customer_type: 'ลูกค้าทั่วไป',
    phone: '',
    address: 'หน้างาน จ.อุตรดิตถ์',
    delivery_location: 'หน้างาน อุตรดิตถ์',
    tax_id: '',
    credit_limit: 0,
    total_debt: 0,
    customer_status: 'Active',
    note: 'ลูกค้าหน้าร้านไม่มีบัญชีสมาชิก',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    id_card_no: '',
    registered_address: '',
    current_worksite: '',
    id_card_area: '',
    id_card_province: '',
    id_card_image_name: '',
    id_card_image_url: '',
    id_card_read_status: '',
    pdpa_consent: false,
    customer_signature: ''
  },
  {
    customer_id: 'CUS-1002',
    customer_name: 'สมเกียรติ พัฒนาก่อสร้าง',
    customer_type: 'ผู้รับเหมาทั่วไป',
    phone: '0894567812',
    address: '123/4 ต.ท่าเสา อ.เมือง จ.อุตรดิตถ์',
    delivery_location: 'หน้างาน สร้างอาคารพานิชย์ ข้างโลตัส',
    tax_id: '1234567890123',
    credit_limit: 50000,
    total_debt: 12500,
    customer_status: 'Active',
    note: 'เครดิตเทอม 30 วัน',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    id_card_no: '3530100234567',
    registered_address: '123/4 ต.ท่าเสา อ.เมือง จ.อุตรดิตถ์',
    current_worksite: 'โครงการข้างโลตัสอุตรดิตถ์',
    id_card_area: 'ต.ท่าเสา อ.เมือง',
    id_card_province: 'อุตรดิตถ์',
    id_card_image_name: 'IDCARD_สมเกียรติ.png',
    id_card_image_url: 'https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?auto=format&fit=crop&q=80&w=400',
    id_card_read_status: 'แนบรูปแล้ว - ตรวจข้อมูลด้วยผู้ใช้งาน',
    pdpa_consent: true,
    customer_signature: 'สมเกียรติ พัฒนา'
  }
];

const rawProductsSeed = [
  // Beams (แบบคาน) - Locked as rentals, measured per round ('round')
  { cat: 'แบบคาน', spec: '40x0.50', unit: 'แผ่น', price: 10, prefix: 'BEAM' },
  { cat: 'แบบคาน', spec: '40x0.60', unit: 'แผ่น', price: 12, prefix: 'BEAM' },
  { cat: 'แบบคาน', spec: '40x0.75', unit: 'แผ่น', price: 15, prefix: 'BEAM' },
  { cat: 'แบบคาน', spec: '40x0.80', unit: 'แผ่น', price: 16, prefix: 'BEAM' },
  { cat: 'แบบคาน', spec: '40x1.00', unit: 'แผ่น', price: 20, prefix: 'BEAM' },
  { cat: 'แบบคาน', spec: '40x1.20', unit: 'แผ่น', price: 24, prefix: 'BEAM' },
  { cat: 'แบบคาน', spec: '40x1.25', unit: 'แผ่น', price: 25, prefix: 'BEAM' },
  { cat: 'แบบคาน', spec: '40x1.30', unit: 'แผ่น', price: 26, prefix: 'BEAM' },
  { cat: 'แบบคาน', spec: '40x1.50', unit: 'แผ่น', price: 30, prefix: 'BEAM' },
  { cat: 'แบบคาน', spec: '40x1.60', unit: 'แผ่น', price: 32, prefix: 'BEAM' },
  { cat: 'แบบคาน', spec: '40x1.75', unit: 'แผ่น', price: 35, prefix: 'BEAM' },
  { cat: 'แบบคาน', spec: '40x1.80', unit: 'แผ่น', price: 36, prefix: 'BEAM' },
  { cat: 'แบบคาน', spec: '40x2.00', unit: 'แผ่น', price: 40, prefix: 'BEAM' },
  { cat: 'แบบคาน', spec: '40x2.20', unit: 'แผ่น', price: 44, prefix: 'BEAM' },
  { cat: 'แบบคาน', spec: '40x2.25', unit: 'แผ่น', price: 45, prefix: 'BEAM' },
  { cat: 'แบบคาน', spec: '40x2.30', unit: 'แผ่น', price: 46, prefix: 'BEAM' },
  { cat: 'แบบคาน', spec: '40x2.75', unit: 'แผ่น', price: 55, prefix: 'BEAM' },
  { cat: 'แบบคาน', spec: '40x2.80', unit: 'แผ่น', price: 56, prefix: 'BEAM' },
  { cat: 'แบบคาน', spec: '40x3.00', unit: 'แผ่น', price: 60, prefix: 'BEAM' },
  { cat: 'แบบคาน', spec: '40x3.25', unit: 'แผ่น', price: 65, prefix: 'BEAM' },
  { cat: 'แบบคาน', spec: '40x3.30', unit: 'แผ่น', price: 66, prefix: 'BEAM' },
  { cat: 'แบบคาน', spec: '40x3.75', unit: 'แผ่น', price: 75, prefix: 'BEAM' },

  // Sides (แบบข้าง)
  { cat: 'แบบข้าง', spec: '25x3.00', unit: 'แผ่น', price: 60, prefix: 'SIDE' },
  { cat: 'แบบข้าง', spec: '25x2.00', unit: 'แผ่น', price: 40, prefix: 'SIDE' },
  { cat: 'แบบข้าง', spec: '25x1.50', unit: 'แผ่น', price: 30, prefix: 'SIDE' },
  { cat: 'แบบข้าง', spec: '25x1.00', unit: 'แผ่น', price: 20, prefix: 'SIDE' },

  // Columns (แบบเสา) - Locked as rentals, measured per round ('round')
  { cat: 'แบบเสา', spec: '15x15x2.00', unit: 'ต้น', price: 80, prefix: 'COLUMN' },
  { cat: 'แบบเสา', spec: '15x15x3.00', unit: 'ต้น', price: 100, prefix: 'COLUMN' },
  { cat: 'แบบเสา', spec: '20x20x1.00', unit: 'ต้น', price: 60, prefix: 'COLUMN' },
  { cat: 'แบบเสา', spec: '20x20x1.50', unit: 'ต้น', price: 80, prefix: 'COLUMN' },
  { cat: 'แบบเสา', spec: '20x20x2.00', unit: 'ต้น', price: 90, prefix: 'COLUMN' },
  { cat: 'แบบเสา', spec: '20x20x3.00', unit: 'ต้น', price: 100, prefix: 'COLUMN' },
  { cat: 'แบบเสา', spec: '20x20x3.50', unit: 'ต้น', price: 150, prefix: 'COLUMN' },
  { cat: 'แบบเสา', spec: '25x25x1.00', unit: 'ต้น', price: 100, prefix: 'COLUMN' },
  { cat: 'แบบเสา', spec: '25x25x2.00', unit: 'ต้น', price: 50, prefix: 'COLUMN' },
  { cat: 'แบบเสา', spec: '25x25x3.00', unit: 'ต้น', price: 75, prefix: 'COLUMN' },

  // Scaffolding (นั่งร้าน) - Rentals measured per day ('day')
  { cat: 'นั่งร้าน', spec: 'ส1.70xก1.20xย1.80 (ชุดเบา)', unit: 'ชุด', price: 10, prefix: 'SCAF' },
  { cat: 'นั่งร้าน', spec: 'ส1.70xก1.20xย1.80 (ชุดกลาง)', unit: 'ชุด', price: 15, prefix: 'SCAF' },
  { cat: 'นั่งร้าน', spec: 'ส1.70xก1.20xย1.80 (ชุดหนา)', unit: 'ชุด', price: 20, prefix: 'SCAF' },

  // Jacks (ขาปรับ)
  { cat: 'ขาปรับ', spec: '0.50 ซม. (เบา)', unit: 'ชิ้น', price: 10, prefix: 'JACK' },
  { cat: 'ขาปรับ', spec: '0.50 ซม. (กลาง)', unit: 'ชิ้น', price: 15, prefix: 'JACK' },
  { cat: 'ขาปรับ', spec: '0.50 ซม. (หนา)', unit: 'ชิ้น', price: 20, prefix: 'JACK' },

  // Footings (แบบฟุตติ้ง)
  { cat: 'แบบฟุตติ้ง', spec: '0.60x0.60', unit: 'หลุม', price: 70, prefix: 'FOOTING' }
];

function generateProductsSeed(): Product[] {
  return rawProductsSeed.map((raw, i) => {
    const isLocked = raw.cat === 'แบบคาน' || raw.cat === 'แบบเสา';
    const isShipping = raw.cat === 'ค่าขนส่ง';
    
    const use_type: 'rent' | 'sale' | 'both' = isShipping ? 'sale' : 'rent';
    const rental_mode: 'day' | 'round' = (raw.cat === 'นั่งร้าน' || raw.cat === 'ขาปรับ') ? 'day' : 'round';
    
    const skuCode = raw.spec.replace(/[^0-9A-Za-zก-ฮ]/g, '').toUpperCase();
    const sku = `${raw.prefix}-${skuCode || 'GEN'}-${raw.price}`;
    
    let defaultStock = 120;
    if (raw.cat === 'แบบเสา') defaultStock = 60;
    if (raw.cat === 'นั่งร้าน') defaultStock = 40;
    if (isShipping) defaultStock = 9999;

    return {
      item_id: `ITM-10${String(i + 1).padStart(2, '0')}`,
      sku,
      item_name: raw.spec ? `${raw.cat} ${raw.spec}` : raw.cat,
      category: raw.cat,
      use_type,
      unit: raw.unit,
      price_rent: isShipping ? 0 : raw.price,
      price_sale: isShipping ? raw.price : 0,
      low_stock_threshold: isShipping ? 0 : (raw.cat === 'นั่งร้าน' ? 10 : 15),
      item_status: 'Active',
      note: isLocked ? 'ล็อกระบบ: เช่าแบบรอบตามเงื่อนไขทางวิศวกรรม' : '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      rental_mode,
      stock: defaultStock,
      qty_total: defaultStock,
      qty_available: defaultStock,
      qty_rented: 0,
      qty_damaged: 0,
      qty_lost: 0
    };
  });
}

function getLocal<T>(key: string, fallback: T): T {
  try {
    const str = localStorage.getItem(key);
    if (!str) return fallback;
    return JSON.parse(str) as T;
  } catch (e) {
    return fallback;
  }
}

function saveLocal<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

// Global cache and state management
export class JirakitDB {
  static getSettings(): SystemSettings {
    const s = getLocal<SystemSettings>('JRK_SETTINGS', defaultSettings);
    let updated = false;
    if (!s.LINE_QR_URL || s.LINE_QR_URL.includes('ใส่_FILE') || s.LINE_QR_URL.includes('drive.google.com')) {
      s.LINE_QR_URL = 'https://i.ibb.co/8LW54rQm/IMG-0824.jpg';
      updated = true;
    }
    if (!s.BANK_QR_URL || s.BANK_QR_URL.includes('ใส่_FILE') || s.BANK_QR_URL.includes('drive.google.com')) {
      s.BANK_QR_URL = 'https://i.ibb.co/FkzF4CXD/S-11485187.jpg';
      updated = true;
    }
    if (updated) {
      saveLocal('JRK_SETTINGS', s);
    }
    return s;
  }

  static saveSettings(settings: Partial<SystemSettings>): SystemSettings {
    const current = this.getSettings();
    const next = { ...current, ...settings };
    saveLocal('JRK_SETTINGS', next);
    this.addAuditLog('SAVE_SETTINGS', 'SETTINGS', '-', JSON.stringify(current), JSON.stringify(next), 'แก้ไขการตั้งค่าระบบ');
    return next;
  }

  static getProducts(): Product[] {
    const cached = localStorage.getItem('JRK_PRODUCTS');
    if (!cached) {
      const seed = generateProductsSeed();
      saveLocal('JRK_PRODUCTS', seed);
      return seed;
    }
    return JSON.parse(cached) as Product[];
  }

  static saveProduct(p: Partial<Product> & { item_id?: string }): Product {
    const products = this.getProducts();
    const now = new Date().toISOString();
    
    // Auto rules calculation per prompt rules
    const category = p.category || 'แบบคาน';
    const name = p.item_name || '';
    const textDesc = `${category} ${name}`.trim();
    
    let use_type: 'rent' | 'sale' | 'both' = p.use_type || 'rent';
    let rental_mode: 'day' | 'round' = p.rental_mode || 'round';
    let note = p.note || '';

    if (textDesc.includes('แบบคาน') || textDesc.includes('แบบเสา')) {
      use_type = 'rent';
      rental_mode = 'round';
      note = (note + ' ล็อกระบบ: เช่าแบบรอบ').trim();
    } else if (textDesc.includes('นั่งร้าน') || textDesc.includes('ขาปรับ')) {
      use_type = 'rent';
      rental_mode = 'day';
    } else if (textDesc.includes('ค่าขนส่ง')) {
      use_type = 'sale';
      rental_mode = 'round';
    }

    if (p.item_id) {
      // update
      const index = products.findIndex(x => x.item_id === p.item_id);
      if (index === -1) throw new Error('ไม่พบสินค้าที่ต้องการแก้ไข');
      const original = products[index];
      
      const updated: Product = {
        ...original,
        ...p,
        item_id: original.item_id,
        use_type,
        rental_mode,
        note,
        updated_at: now,
        qty_total: p.qty_total !== undefined ? p.qty_total : original.qty_total,
        qty_available: p.qty_available !== undefined ? p.qty_available : (p.qty_total !== undefined ? p.qty_total - original.qty_rented - original.qty_damaged - original.qty_lost : original.qty_available),
        stock: p.qty_available !== undefined ? p.qty_available : (p.qty_total !== undefined ? p.qty_total - original.qty_rented - original.qty_damaged - original.qty_lost : original.qty_available)
      };
      
      products[index] = updated;
      saveLocal('JRK_PRODUCTS', products);
      this.addAuditLog('UPDATE_PRODUCT', 'PRODUCT', updated.item_id, JSON.stringify(original), JSON.stringify(updated), `แก้ไขสินค้า ${updated.item_name}`);
      return updated;
    } else {
      // create
      const nextId = `ITM-10${String(products.length + 1).padStart(2, '0')}`;
      const qty_total = p.qty_total ?? 100;
      const newProduct: Product = {
        item_id: nextId,
        sku: p.sku || `SKU-${Date.now().toString().slice(-6)}`,
        item_name: name,
        category,
        use_type,
        unit: p.unit || 'ชิ้น',
        price_rent: p.price_rent ?? 0,
        price_sale: p.price_sale ?? 0,
        low_stock_threshold: p.low_stock_threshold ?? 10,
        item_status: p.item_status || 'Active',
        note,
        created_at: now,
        updated_at: now,
        rental_mode,
        qty_total,
        qty_available: qty_total,
        qty_rented: 0,
        qty_damaged: 0,
        qty_lost: 0,
        stock: qty_total
      };
      products.push(newProduct);
      saveLocal('JRK_PRODUCTS', products);
      this.addAuditLog('CREATE_PRODUCT', 'PRODUCT', newProduct.item_id, '', JSON.stringify(newProduct), `เพิ่มสินค้าใหม่ ${newProduct.item_name}`);
      return newProduct;
    }
  }

  static getCustomers(): Customer[] {
    const cached = localStorage.getItem('JRK_CUSTOMERS');
    if (!cached) {
      saveLocal('JRK_CUSTOMERS', defaultCustomers);
      return defaultCustomers;
    }
    return JSON.parse(cached) as Customer[];
  }

  static saveCustomer(c: Partial<Customer> & { customer_id?: string }): Customer {
    const customers = this.getCustomers();
    const now = new Date().toISOString();

    if (c.customer_id) {
      const idx = customers.findIndex(x => x.customer_id === c.customer_id);
      if (idx === -1) throw new Error('ไม่พบข้อมูลลูกค้า');
      const original = customers[idx];
      const next: Customer = {
        ...original,
        ...c,
        customer_id: original.customer_id,
        updated_at: now
      };
      customers[idx] = next;
      saveLocal('JRK_CUSTOMERS', customers);
      this.addAuditLog('UPDATE_CUSTOMER', 'CUSTOMER', next.customer_id, JSON.stringify(original), JSON.stringify(next), `อัปเดตข้อมูลลูกค้า ${next.customer_name}`);
      return next;
    } else {
      const nextId = `CUS-10${String(customers.length + 1).padStart(2, '0')}`;
      const fresh: Customer = {
        customer_id: nextId,
        customer_name: c.customer_name || 'ลูกค้าใหม่',
        customer_type: c.customer_type || 'ลูกค้าทั่วไป',
        phone: c.phone || '',
        address: c.address || '',
        delivery_location: c.delivery_location || '',
        tax_id: c.tax_id || '',
        credit_limit: c.credit_limit || 0,
        total_debt: c.total_debt || 0,
        customer_status: 'Active',
        note: c.note || '',
        created_at: now,
        updated_at: now,
        id_card_no: c.id_card_no || '',
        registered_address: c.registered_address || c.address || '',
        current_worksite: c.current_worksite || c.delivery_location || '',
        id_card_area: c.id_card_area || '',
        id_card_province: c.id_card_province || '',
        id_card_image_name: c.id_card_image_name || '',
        id_card_image_url: c.id_card_image_url || '',
        id_card_read_status: c.id_card_read_status || '',
        pdpa_consent: c.pdpa_consent ?? false,
        customer_signature: c.customer_signature || ''
      };
      customers.push(fresh);
      saveLocal('JRK_CUSTOMERS', customers);
      this.addAuditLog('CREATE_CUSTOMER', 'CUSTOMER', fresh.customer_id, '', JSON.stringify(fresh), `ลงทะเบียนลูกค้าประจำ ${fresh.customer_name}`);
      return fresh;
    }
  }

  static getReceipts(): Receipt[] {
    return getLocal<Receipt[]>('JRK_RECEIPTS', []);
  }

  static createReceiptNo(docType: string): string {
    const prefixMap: Record<string, string> = {
      invoice: 'IN',
      delivery: 'DN',
      quotation: 'QT',
      delivery_receipt: 'DR',
      debt_notice: 'DB',
      receipt: 'RC'
    };
    const code = prefixMap[docType] || 'RC';
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const currentReceipts = this.getReceipts();
    const countToday = currentReceipts.filter(r => r.receipt_no.startsWith(`${code}${dateStr}`)).length + 1;
    return `${code}${dateStr}-${String(countToday).padStart(4, '0')}`;
  }

  static saveReceipt(p: any): Receipt {
    const receipts = this.getReceipts();
    const now = new Date().toISOString();
    const rid = `RCP-BY-${Date.now()}`;
    const no = p.receipt_no || this.createReceiptNo(p.doc_type || 'receipt');

    // Calculate details and adjust stock
    const products = this.getProducts();
    const items: BillItemRef[] = (p.items || []).map((l: any, i: number) => {
      // Deduct from stock
      if (l.item_id) {
        const prodIdx = products.findIndex(x => x.item_id === l.item_id);
        if (prodIdx !== -1) {
          const product = products[prodIdx];
          const qty = Number(l.qty || 1);
          if (l.line_mode === 'rent') {
            product.qty_rented += qty;
            product.qty_available = Math.max(0, product.qty_available - qty);
            product.stock = product.qty_available;
          } else {
            product.qty_total = Math.max(0, product.qty_total - qty);
            product.qty_available = Math.max(0, product.qty_available - qty);
            product.stock = product.qty_available;
          }
          product.updated_at = now;
        }
      }

      return {
        line_id: `LINE-${Date.now()}-${i}-${Math.floor(Math.random() * 1000)}`,
        receipt_id: rid,
        receipt_no: no,
        item_id: l.item_id || '',
        sku: l.sku || '',
        receipt_name: l.receipt_name || l.item_name || '',
        line_mode: l.line_mode || 'rent',
        qty: Number(l.qty || 1),
        qty_returned: 0,
        unit: l.unit || 'ชิ้น',
        price: Number(l.price || 0),
        rent_days: Number(l.rent_days || l.rounds || 1),
        due_date: l.due_date || p.due_date || '',
        line_total: Number(l.line_total || 0),
        return_status: l.line_mode === 'rent' ? 'กำลังเช่า' : 'ไม่มีของเช่า',
        note: l.note || '',
        sort_order: i + 1
      };
    });

    // Save adjusted products stock
    saveLocal('JRK_PRODUCTS', products);

    const calcSum = receipts.filter(r => r.customer_id === p.customer_id);
    const hasRent = items.some(i => i.line_mode === 'rent');

    const rec: Receipt = {
      receipt_id: rid,
      receipt_no: no,
      receipt_date: p.receipt_date || now,
      receipt_title: p.receipt_title || 'ใบเสร็จรับเงิน',
      doc_type: p.doc_type || 'receipt',
      customer_id: p.customer_id || '',
      customer_name: p.customer_name || 'ลูกค้าทั่วไป',
      phone: p.phone || '',
      address: p.address || '',
      delivery_location: p.delivery_location || '',
      rent_date: p.rent_date || '',
      due_date: p.due_date || '',
      rental_days: Number(p.rental_days || 1),
      subtotal: Number(p.subtotal || 0),
      discount: Number(p.discount || 0),
      delivery_fee: Number(p.delivery_fee || 0),
      vat: Number(p.vat || 0),
      vat_rate: Number(p.vat_rate || 0),
      vat_mode: p.vat_mode || 'NONE',
      deposit: Number(p.deposit || 0),
      grand_total: Number(p.grand_total || 0),
      paid_cash: Number(p.paid_cash || 0),
      paid_transfer: Number(p.paid_transfer || 0),
      paid_amount: Number(p.paid_amount || 0),
      debt_amount: Number(p.debt_amount || 0),
      change_amount: Number(p.change_amount || 0),
      payment_status: p.payment_status || 'ชำระครบ',
      return_status: hasRent ? 'กำลังเช่า' : 'ไม่มีของเช่า',
      penalty_amount: 0,
      return_date: '',
      client_txn_id: p.client_txn_id || `TXN-${Date.now()}`,
      items_json: JSON.stringify(items),
      calculation_json: JSON.stringify({ ...p, items }),
      note: p.note || '',
      created_at: now,
      updated_at: now
    };

    receipts.push(rec);
    saveLocal('JRK_RECEIPTS', receipts);

    // Update customer debt if ledger allows
    if (rec.customer_id && rec.customer_id !== 'CUS-1001') {
      const customers = this.getCustomers();
      const cIdx = customers.findIndex(c => c.customer_id === rec.customer_id);
      if (cIdx !== -1) {
        customers[cIdx].total_debt += rec.debt_amount;
        customers[cIdx].updated_at = now;
        saveLocal('JRK_CUSTOMERS', customers);
      }
    }

    this.addAuditLog('CREATE_RECEIPT', 'RECEIPT', rid, '', JSON.stringify(rec), `ออกบิลเอกสาร ${rec.receipt_no}`);
    return rec;
  }

  static updateReceipt(rec: Receipt) {
    const receipts = this.getReceipts();
    const idx = receipts.findIndex(r => r.receipt_id === rec.receipt_id);
    if (idx !== -1) {
      const oldDebt = receipts[idx].debt_amount || 0;
      const newDebt = rec.debt_amount || 0;
      const diff = newDebt - oldDebt;

      receipts[idx] = rec;
      saveLocal('JRK_RECEIPTS', receipts);

      if (rec.customer_id && rec.customer_id !== 'CUS-1001') {
        const customers = this.getCustomers();
        const cIdx = customers.findIndex(c => c.customer_id === rec.customer_id);
        if (cIdx !== -1) {
          customers[cIdx].total_debt = Math.max(0, customers[cIdx].total_debt + diff);
          customers[cIdx].updated_at = new Date().toISOString();
          saveLocal('JRK_CUSTOMERS', customers);
        }
      }
      this.addAuditLog('UPDATE_RECEIPT', 'RECEIPT', rec.receipt_id, '', JSON.stringify(rec), `อัปเดตบิลเอกสาร ${rec.receipt_no}`);
    }
  }

  static processReturn(p: {
    receipt_id: string;
    items: { line_id: string; qty: number }[];
    penalty_amount: number;
    paid_amount: number;
    refund_deposit: number;
    return_date: string;
    payment_method: string;
    note?: string;
  }): ReturnEvent {
    const receipts = this.getReceipts();
    const rIdx = receipts.findIndex(r => r.receipt_id === p.receipt_id);
    if (rIdx === -1) throw new Error('ไม่พบบิลการเช่า');
    const bill = receipts[rIdx];

    const products = this.getProducts();
    const billItems: BillItemRef[] = JSON.parse(bill.items_json || '[]');

    const now = new Date().toISOString();
    const return_id = `RET-${Date.now()}`;

    // Loop through return items
    const returnedItems = p.items.map(ret => {
      const lineIdx = billItems.findIndex(l => l.line_id === ret.line_id);
      if (lineIdx === -1) throw new Error('ไม่พบแถวรายการเช่าสินค้า');
      
      const line = billItems[lineIdx];
      const qtyToReturn = Number(ret.qty);
      const remaining = line.qty - line.qty_returned;
      
      if (qtyToReturn <= 0 || qtyToReturn > remaining) {
        throw new Error(`จำนวนคืนรายการ ${line.receipt_name} ไม่ถูกต้อง (ระบุคืน: ${qtyToReturn}, คงค้าง: ${remaining})`);
      }

      // Add back to product inventory
      if (line.item_id) {
        const pIdx = products.findIndex(pr => pr.item_id === line.item_id);
        if (pIdx !== -1) {
          const product = products[pIdx];
          product.qty_rented = Math.max(0, product.qty_rented - qtyToReturn);
          product.qty_available = Math.min(product.qty_total, product.qty_available + qtyToReturn);
          product.stock = product.qty_available;
          product.updated_at = now;
        }
      }

      line.qty_returned += qtyToReturn;
      line.return_status = line.qty_returned >= line.qty ? 'คืนครบแล้ว' : 'คืนบางส่วน';
      
      return {
        ...line,
        return_now: qtyToReturn
      };
    });

    saveLocal('JRK_PRODUCTS', products);

    // Calculate overall return status of the bill
    const rentItems = billItems.filter(l => l.line_mode === 'rent');
    const allDone = rentItems.every(l => l.qty_returned >= l.qty);
    const anyDone = rentItems.some(l => l.qty_returned > 0);
    const return_status = allDone ? 'คืนครบแล้ว' : anyDone ? 'คืนบางส่วน' : 'กำลังเช่า';

    // Update financial balance
    const penalty = Number(p.penalty_amount || 0);
    const additionalPaid = Number(p.paid_amount || 0);
    const refund = Number(p.refund_deposit || 0);

    const oldDebt = bill.debt_amount;
    const finalDebtBeforePayment = Math.max(0, oldDebt + penalty - refund);
    const newDebt = Math.max(0, finalDebtBeforePayment - additionalPaid);

    bill.debt_amount = newDebt;
    bill.paid_amount += additionalPaid;
    bill.return_status = return_status;
    bill.payment_status = newDebt <= 0 ? 'ชำระครบ' : bill.paid_amount > 0 ? 'ชำระบางส่วน' : 'ยังไม่ชำระ';
    bill.penalty_amount += penalty;
    bill.return_date = p.return_date;
    bill.items_json = JSON.stringify(billItems);
    bill.updated_at = now;

    receipts[rIdx] = bill;
    saveLocal('JRK_RECEIPTS', receipts);

    // Update customer debt matching
    if (bill.customer_id && bill.customer_id !== 'CUS-1001') {
      const customers = this.getCustomers();
      const cIdx = customers.findIndex(c => c.customer_id === bill.customer_id);
      if (cIdx !== -1) {
        customers[cIdx].total_debt = Math.max(0, customers[cIdx].total_debt + penalty - additionalPaid);
        customers[cIdx].updated_at = now;
        saveLocal('JRK_CUSTOMERS', customers);
      }
    }

    const retEvent: ReturnEvent = {
      return_id,
      receipt_id: p.receipt_id,
      receipt_no: bill.receipt_no,
      return_date: p.return_date || now,
      customer_id: bill.customer_id,
      customer_name: bill.customer_name,
      items_json: JSON.stringify(returnedItems),
      penalty_amount: penalty,
      refund_deposit: refund,
      paid_amount: additionalPaid,
      debt_after: newDebt,
      return_status,
      note: p.note || '',
      client_txn_id: `RET-TXN-${Date.now()}`,
      created_at: now
    };

    const returnEvents = getLocal<ReturnEvent[]>('JRK_RETURNS', []);
    returnEvents.push(retEvent);
    saveLocal('JRK_RETURNS', returnEvents);

    this.addAuditLog('PROCESS_RETURN', 'RETURNS', return_id, '', JSON.stringify(retEvent), `บันทึกการส่งคืนคลังสำหรับบิล ${bill.receipt_no}`);
    return retEvent;
  }

  static getReturnEvents(): ReturnEvent[] {
    return getLocal<ReturnEvent[]>('JRK_RETURNS', []);
  }

  static getExpenses(): Expense[] {
    return getLocal<Expense[]>('JRK_EXPENSES', []).filter(e => e.expense_status !== 'Cancelled');
  }

  static saveExpense(e: Partial<Expense>): Expense {
    const expenses = getLocal<Expense[]>('JRK_EXPENSES', []);
    const now = new Date().toISOString();
    
    const fresh: Expense = {
      expense_id: e.expense_id || `EXP-${Date.now()}`,
      expense_date: e.expense_date || now.slice(0, 10),
      description: e.description || 'ค่าใช้จ่ายทั่วไป',
      category: e.category || 'ค่าใช้จ่ายอื่นๆ',
      amount: Number(e.amount || 0),
      payment_method: e.payment_method || 'เงินสด',
      ref_no: e.ref_no || '',
      expense_status: 'Active',
      note: e.note || '',
      created_at: now,
      updated_at: now
    };

    expenses.push(fresh);
    saveLocal('JRK_EXPENSES', expenses);
    this.addAuditLog('CREATE_EXPENSE', 'EXPENSE', fresh.expense_id, '', JSON.stringify(fresh), `บันทึกรายจ่าย ${fresh.description}`);
    return fresh;
  }

  static cancelExpense(id: string, reason: string): void {
    const expenses = getLocal<Expense[]>('JRK_EXPENSES', []);
    const idx = expenses.findIndex(x => x.expense_id === id);
    if (idx !== -1) {
      expenses[idx].expense_status = 'Cancelled';
      expenses[idx].note = `${expenses[idx].note} (ยกเลิกเนื่องจาก: ${reason})`.trim();
      expenses[idx].updated_at = new Date().toISOString();
      saveLocal('JRK_EXPENSES', expenses);
      this.addAuditLog('CANCEL_EXPENSE', 'EXPENSE', id, '', '', `ยกเลิกค่าใช้จ่ายรหัส ${id}`);
    }
  }

  static getAppointments(): Appointment[] {
    return getLocal<Appointment[]>('JRK_APPOINTMENTS', []).filter(a => a.appointment_status !== 'Cancelled');
  }

  static saveAppointment(a: Partial<Appointment>): Appointment {
    const items = getLocal<Appointment[]>('JRK_APPOINTMENTS', []);
    const now = new Date().toISOString();

    const fresh: Appointment = {
      appointment_id: a.appointment_id || `APT-${Date.now()}`,
      title: a.title || 'นัดหมายด่วน',
      detail: a.detail || '',
      appointment_date: a.appointment_date || now.slice(0, 10),
      customer_id: a.customer_id || '',
      customer_name: a.customer_name || '',
      appointment_status: 'Active',
      created_at: now,
      updated_at: now
    };

    items.push(fresh);
    saveLocal('JRK_APPOINTMENTS', items);
    return fresh;
  }

  static updateAppointmentStatus(id: string, status: 'Active' | 'Done' | 'Cancelled'): void {
    const items = getLocal<Appointment[]>('JRK_APPOINTMENTS', []);
    const idx = items.findIndex(x => x.appointment_id === id);
    if (idx !== -1) {
      items[idx].appointment_status = status;
      items[idx].updated_at = new Date().toISOString();
      saveLocal('JRK_APPOINTMENTS', items);
    }
  }

  static getNotes(): NoteItem[] {
    return getLocal<NoteItem[]>('JRK_NOTES', []).filter(n => n.note_status === 'Active');
  }

  static saveNote(text: string): NoteItem {
    const notes = getLocal<NoteItem[]>('JRK_NOTES', []);
    const now = new Date().toISOString();
    const fresh: NoteItem = {
      note_id: `NOTE-${Date.now()}`,
      note_text: text,
      note_status: 'Active',
      created_at: now,
      updated_at: now
    };
    notes.push(fresh);
    saveLocal('JRK_NOTES', notes);
    return fresh;
  }

  static deleteNote(id: string): void {
    const notes = getLocal<NoteItem[]>('JRK_NOTES', []);
    const idx = notes.findIndex(x => x.note_id === id);
    if (idx !== -1) {
      notes[idx].note_status = 'Deleted';
      notes[idx].updated_at = new Date().toISOString();
      saveLocal('JRK_NOTES', notes);
    }
  }

  static getAuditLogs(): AuditLog[] {
    return getLocal<AuditLog[]>('JRK_AUDIT_LOGS', []);
  }

  static addAuditLog(action: string, type: string, id: string, oldVal: string, newVal: string, note: string): void {
    const logs = this.getAuditLogs();
    const l: AuditLog = {
      log_id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: 'ผู้ใช้ระบบดําเนินการ',
      action,
      target_type: type,
      target_id: id,
      old_value: oldVal,
      new_value: newVal,
      note
    };
    logs.push(l);
    // limit audit logs to last 300 to avoid localStorage crash
    const finalLogs = logs.slice(-300);
    saveLocal('JRK_AUDIT_LOGS', finalLogs);
  }

  static verifyPin(pin: string): boolean {
    const savedPin = localStorage.getItem('JRK_PIN_KEY') || '123456'; // Default default pin is 123456
    return pin === savedPin;
  }

  static savePin(pin: string): void {
    if (!pin || pin.length !== 6 || !/^\d+$/.test(pin)) {
      throw new Error('PIN จะต้องเป็นตัวเลข 6 หลักเท่านั้น');
    }
    localStorage.setItem('JRK_PIN_KEY', pin);
    this.addAuditLog('CHANGE_PIN', 'SECURITY', '-', '', '', 'ผู้ใช้เปลี่ยน PIN บันทึกความปลอดภัย');
  }
}
