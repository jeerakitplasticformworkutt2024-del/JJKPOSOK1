/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { JirakitDB } from '../db';
import { Product, Customer } from '../types';
import html2canvas from 'html2canvas';
import { Search, ShoppingCart, Trash2, Calendar, FileText, User, PlusCircle, CheckCircle, Printer, AlertCircle, Download, Plus, MapPin, Eye } from 'lucide-react';
import SignaturePad from './SignaturePad';
import { 
  getReceiptRowLimit, 
  formatThaiDate, 
  getItemDisplayName, 
  getRentalPeriodText, 
  getReceiptPrintHtml,
  printReceipt,
  downloadReceiptImage,
  calculateRentalLineTotal,
  normalizeCategory
} from '../utils/receiptHelper';

interface ThaiAddressPreset {
  subdistrict: string;
  district: string;
  province: string;
  zipcode: string;
}

const THAI_ADDRESS_DATA: ThaiAddressPreset[] = [
  // Uttaradit (อุตรดิตถ์)
  { subdistrict: "ท่าเสา", district: "เมืองอุตรดิตถ์", province: "อุตรดิตถ์", zipcode: "53000" },
  { subdistrict: "ป่าเซ่า", district: "เมืองอุตรดิตถ์", province: "อุตรดิตถ์", zipcode: "53000" },
  { subdistrict: "บ้านเกาะ", district: "เมืองอุตรดิตถ์", province: "อุตรดิตถ์", zipcode: "53000" },
  { subdistrict: "ทุ่งยั้ง", district: "กันทรารมย์", province: "อุตรดิตถ์", zipcode: "53140" },
  { subdistrict: "คุ้งตะเภา", district: "เมืองอุตรดิตถ์", province: "อุตรดิตถ์", zipcode: "53000" },
  { subdistrict: "งิ้วงาม", district: "เมืองอุตรดิตถ์", province: "อุตรดิตถ์", zipcode: "53000" },
  { subdistrict: "ผาจุก", district: "เมืองอุตรดิตถ์", province: "อุตรดิตถ์", zipcode: "53000" },
  { subdistrict: "วังแดง", district: "ตรอน", province: "อุตรดิตถ์", zipcode: "53140" },
  { subdistrict: "หาดสองแคว", district: "ตรอน", province: "อุตรดิตถ์", zipcode: "53140" },
  { subdistrict: "บ้านแก่ง", district: "ตรอน", province: "อุตรดิตถ์", zipcode: "53140" },
  { subdistrict: "ศรีพนมมาศ", district: "ลับแล", province: "อุตรดิตถ์", zipcode: "53130" },
  { subdistrict: "แม่พูล", district: "ลับแล", province: "อุตรดิตถ์", zipcode: "53130" },
  { subdistrict: "ชัยจุมพล", district: "ลับแล", province: "อุตรดิตถ์", zipcode: "53130" },
  { subdistrict: "ไผ่ล้อม", district: "ลับแล", province: "อุตรดิตถ์", zipcode: "53210" },
  { subdistrict: "แสนตอ", district: "น้ำปาด", province: "อุตรดิตถ์", zipcode: "53110" },
  { subdistrict: "บ้านโคก", district: "บ้านโคก", province: "อุตรดิตถ์", zipcode: "53180" },
  { subdistrict: "ฟากท่า", district: "ฟากท่า", province: "อุตรดิตถ์", zipcode: "53160" },
  { subdistrict: "ในเมือง", district: "พิชัย", province: "อุตรดิตถ์", zipcode: "53120" },
  { subdistrict: "พญาแมน", district: "พิชัย", province: "อุตรดิตถ์", zipcode: "53120" },
  { subdistrict: "ท่าปลา", district: "ท่าปลา", province: "อุตรดิตถ์", zipcode: "53150" },
  { subdistrict: "บ่อทอง", district: "ทองแสนขัน", province: "อุตรดิตถ์", zipcode: "53230" },

  // Phitsanulok (พิษณุโลก)
  { subdistrict: "ในเมือง", district: "เมืองพิษณุโลก", province: "พิษณุโลก", zipcode: "65000" },
  { subdistrict: "พลายชุมพล", district: "เมืองพิษณุโลก", province: "พิษณุโลก", zipcode: "65000" },
  { subdistrict: "หัวรอ", district: "เมืองพิษณุโลก", province: "พิษณุโลก", zipcode: "65000" },
  { subdistrict: "อรัญญิก", district: "เมืองพิษณุโลก", province: "พิษณุโลก", zipcode: "65000" },
  { subdistrict: "วังทอง", district: "วังทอง", province: "พิษณุโลก", zipcode: "65130" },
  { subdistrict: "บางระกำ", district: "บางระกำ", province: "พิษณุโลก", zipcode: "65140" },

  // Sukhothai (สุโขทัย)
  { subdistrict: "ธานี", district: "เมืองสุโขทัย", province: "สุโขทัย", zipcode: "64000" },
  { subdistrict: "บ้านกล้วย", district: "เมืองสุโขทัย", province: "สุโขทัย", zipcode: "64000" },
  { subdistrict: "เมืองเก่า", district: "เมืองสุโขทัย", province: "สุโขทัย", zipcode: "64210" },
  { subdistrict: "สวรรคโลก", district: "สวรรคโลก", province: "สุโขทัย", zipcode: "64110" },
];

interface POSProps {
  onNavigate: (menu: string) => void;
  triggerRefresh: () => void;
  refreshCount: number;
}

export default function POS({ onNavigate, triggerRefresh, refreshCount }: POSProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ทั้งหมด');

  // Swipe gesture detection to change categories
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);
  const [touchEndY, setTouchEndY] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEndX(null);
    setTouchEndY(null);
    setTouchStartX(e.targetTouches[0].clientX);
    setTouchStartY(e.targetTouches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
    setTouchEndY(e.targetTouches[0].clientY);
  };

  const handleTouchEnd = () => {
    if (touchStartX === null || touchStartY === null || touchEndX === null || touchEndY === null) return;
    const distanceX = touchStartX - touchEndX;
    const distanceY = touchStartY - touchEndY;
    const minSwipeDistance = 60;
    const isSwipeHorizontal = Math.abs(distanceX) > Math.abs(distanceY);

    if (isSwipeHorizontal && Math.abs(distanceX) > minSwipeDistance) {
      const currentIndex = categories.indexOf(selectedCategory);
      if (currentIndex !== -1) {
        if (distanceX > 0) {
          // Swipe left -> next category
          const nextIndex = (currentIndex + 1) % categories.length;
          setSelectedCategory(categories[nextIndex]);
        } else {
          // Swipe right -> previous category
          const prevIndex = (currentIndex - 1 + categories.length) % categories.length;
          setSelectedCategory(categories[prevIndex]);
        }
      }
    }
  };

  // Order Fields
  const [docType, setDocType] = useState<'receipt' | 'invoice' | 'delivery' | 'quotation' | 'delivery_receipt' | 'debt_notice'>('receipt');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [rentDate, setRentDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30); // Default 30 days rental period
    return d.toISOString().slice(0, 10);
  });
  const [note, setNote] = useState('');
  const [customDeliveryLocation, setCustomDeliveryLocation] = useState('');

  // Cart Option States
  const [discountOn, setDiscountOn] = useState(false);
  const [discountVal, setDiscountVal] = useState(0);
  const [depositOn, setDepositOn] = useState(false);
  const [depositVal, setDepositVal] = useState(0);
  const [deliveryOn, setDeliveryOn] = useState(false);
  const [deliveryVal, setDeliveryVal] = useState(0);
  const [vatOn, setVatOn] = useState(false);

  // Modal selector helpers
  const [qtyModalProduct, setQtyModalProduct] = useState<Product | null>(null);
  const [qtyVal, setQtyVal] = useState(1);
  const [roundsVal, setRoundsVal] = useState(1);
  const [scaffoldPriceOverride, setScaffoldPriceOverride] = useState(10);
  const [qtyStartDate, setQtyStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [qtyEndDate, setQtyEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [qtyLineMode, setQtyLineMode] = useState<'rent' | 'sale'>('rent');
  const [modalRentalMode, setModalRentalMode] = useState<'day' | 'round'>('day');

  // Transport card state
  const [customShippingInput, setCustomShippingInput] = useState<Record<string, number>>({});

  // Payment states
  const [isPaying, setIsPaying] = useState(false);
  const [cashOn, setCashOn] = useState(false);
  const [cashAmount, setCashAmount] = useState(0);
  const [transferOn, setTransferOn] = useState(false);
  const [transferAmount, setTransferAmount] = useState(0);
  const [debtOn, setDebtOn] = useState(false);
  const [activePaper, setActivePaper] = useState<'A4' | 'A5'>('A4');
  const [copyType, setCopyType] = useState<'original' | 'carbon'>('original');
  const [isReceiptPreviewImageOpen, setIsReceiptPreviewImageOpen] = useState(false);

  // Customer Inline Register States
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustIdNo, setNewCustIdNo] = useState('');
  const [newCustAddressNo, setNewCustAddressNo] = useState('');
  const [newCustMoo, setNewCustMoo] = useState('');
  const [newCustSubdistrictSearch, setNewCustSubdistrictSearch] = useState('');
  const [newCustSubdistrict, setNewCustSubdistrict] = useState('');
  const [newCustDistrict, setNewCustDistrict] = useState('');
  const [newCustProvince, setNewCustProvince] = useState('อุตรดิตถ์');
  const [newCustZipcode, setNewCustZipcode] = useState('');
  const [newCustWork, setNewCustWork] = useState('');
  const [newCustSignature, setNewCustSignature] = useState('');
  const [newCustPdpa, setNewCustPdpa] = useState(true);
  const [idCardFile, setIdCardFile] = useState('');
  const [readerConnecting, setReaderConnecting] = useState(false);
  const [readerStatusText, setReaderStatusText] = useState('');
  const [readerProgress, setReaderProgress] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [presetIndexCounter, setPresetIndexCounter] = useState(0);

  useEffect(() => {
    setProducts(JirakitDB.getProducts().filter(p => p.item_status === 'Active'));
    const custs = JirakitDB.getCustomers().filter(c => c.customer_status === 'Active');
    setCustomers(custs);
    if (custs.length > 0 && !selectedCustomerId) {
      // Default to "cash customer" CUS-1001 if exists
      const fallback = custs.find(c => c.customer_id === 'CUS-1001');
      if (fallback) setSelectedCustomerId(fallback.customer_id);
    }
  }, [refreshCount]);

  useEffect(() => {
    const cust = customers.find(c => c.customer_id === selectedCustomerId);
    if (cust) {
      setCustomDeliveryLocation(cust.delivery_location || cust.current_worksite || '');
    } else {
      setCustomDeliveryLocation('');
    }
  }, [selectedCustomerId, customers]);

  // Categories Calculation
  const categories = ['ทั้งหมด', 'แบบคาน', 'แบบเสา', 'แบบข้าง', 'แบบฟุตติ้ง', 'นั่งร้าน/อุปกรณ์'];

  // Filtering products
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.item_name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesCat = false;
    if (selectedCategory === 'ทั้งหมด') {
      matchesCat = true;
    } else if (selectedCategory === 'นั่งร้าน/อุปกรณ์') {
      matchesCat = p.category === 'นั่งร้าน' || p.category === 'ขาปรับ' || p.category === 'นั่งร้าน/อุปกรณ์' || p.category === 'นั่งร้านและอุปกรณ์';
    } else {
      matchesCat = p.category === selectedCategory;
    }
    
    return matchesSearch && matchesCat && p.item_status === 'Active';
  });

  const cartCalculations = () => {
    const lines = cart.map(i => {
      const line_total = calculateRentalLineTotal(i);
      return {
        ...i,
        line_total
      };
    });

    const subtotal = lines.reduce((sum, item) => sum + item.line_total, 0);
    const discount = discountOn ? Math.min(Number(discountVal || 0), subtotal) : 0;
    const deposit = depositOn ? Number(depositVal || 0) : 0;
    const delivery = deliveryOn ? Number(deliveryVal || 0) : 0;
    const base = Math.max(0, subtotal + delivery - discount);
    const vat = vatOn ? base * 0.07 : 0;
    const grand = Math.max(0, base + vat - deposit);

    return {
      subtotal,
      discount,
      deposit,
      delivery,
      vat,
      grand,
      lines
    };
  };

  const currentCalcs = cartCalculations();

  const handleOpenQtyModal = (p: Product) => {
    const ruleLocked = p.category === 'แบบคาน' || p.category === 'แบบเสา';
    
    setQtyModalProduct(p);
    setQtyVal(1);
    const initialMode = ruleLocked ? 'rent' : p.use_type === 'sale' ? 'sale' : 'rent';
    setQtyLineMode(initialMode);
    
    // Initialize rental mode based on product default or standard logic
    const initialRentalMode = p.rental_mode || 'day';
    setModalRentalMode(initialRentalMode);
    
    const defaultRounds = Math.max(1, Math.ceil((new Date(dueDate).getTime() - new Date(rentDate).getTime()) / (1000 * 60 * 60 * 24)));
    setRoundsVal(initialMode === 'rent' ? (initialRentalMode === 'day' ? defaultRounds : 1) : 1);
    
    setScaffoldPriceOverride(p.price_rent || p.price_sale || 10);
    setQtyStartDate(rentDate);
    setQtyEndDate(dueDate);
  };

  const syncDatesFromDays = (days: number, customStart?: string) => {
    const activeStart = customStart || qtyStartDate;
    setRoundsVal(days);
    const startD = new Date(activeStart);
    startD.setDate(startD.getDate() + days);
    setQtyEndDate(startD.toISOString().slice(0, 10));
  };

  const syncDaysFromDates = (start: string, end: string) => {
    setQtyStartDate(start);
    setQtyEndDate(end);
    const s = new Date(start);
    const e = new Date(end);
    const diffMs = e.getTime() - s.getTime();
    const diffDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    setRoundsVal(diffDays);
  };

  const handleAddShippingItem = (p: Product) => {
    const value = customShippingInput[p.item_id] || p.price_sale || 500;
    if (value <= 0) return;

    const newItem = {
      item_id: p.item_id,
      sku: p.sku,
      receipt_name: p.item_name,
      category: p.category,
      size: p.item_name.match(/[\d.]+/)?.[0] || '',
      unit: p.unit,
      line_mode: 'sale' as const,
      rental_mode: 'round' as const,
      qty: 1,
      price: value,
      rent_days: 1,
      rounds: 1,
      start_date: rentDate,
      due_date: dueDate,
      qty_returned: 0,
      line_total: value
    };

    setCart([...cart, newItem]);
    // Clear value input
    setCustomShippingInput(prev => ({ ...prev, [p.item_id]: 0 }));
  };

  const handleConfirmQtyModal = () => {
    if (!qtyModalProduct) return;
    const p = qtyModalProduct;
    const isScafGroup = p.category === 'นั่งร้าน' || p.category === 'ขาปรับ' || p.category === 'นั่งร้าน/อุปกรณ์' || p.category === 'นั่งร้านและอุปกรณ์';
    
    const unitPrice = qtyLineMode === 'rent' ? (isScafGroup ? scaffoldPriceOverride : p.price_rent) : p.price_sale;

    // VALIDATION
    const quantity = Number(qtyVal);
    const price = Number(unitPrice);

    if (isNaN(quantity) || quantity <= 0) {
      alert('⚠️ จำนวนสินค้าต้องเป็นตัวเลขที่มากกว่า 0 ชิ้น');
      return;
    }
    if (isNaN(price) || price < 0) {
      alert('⚠️ ราคาสินค้าต่อหน่วยต้องไม่น้อยกว่า 0 บาท');
      return;
    }

    let itemRentalMode: 'day' | 'round' = 'day';
    let rentDays = 1;
    let rounds = 1;

    if (qtyLineMode === 'rent') {
      itemRentalMode = modalRentalMode;
      // If it is scaffolding, we override/force Day mode as required
      if (isScafGroup) {
        itemRentalMode = 'day';
      }

      if (itemRentalMode === 'day') {
        rentDays = roundsVal;
        if (isNaN(rentDays) || rentDays <= 0) {
          alert('⚠️ จำนวนวันเช่าสำหรับประเภท "เช่าแบบวัน" ต้องมากกว่า 0 วัน');
          return;
        }
      } else if (itemRentalMode === 'round') {
        rounds = roundsVal;
        if (isNaN(rounds) || rounds <= 0) {
          alert('⚠️ จำนวนรอบเช่าสำหรับประเภท "เช่าแบบรอบ" ต้องมากกว่า 0 รอบ');
          return;
        }
      }
    }

    const tempItem = {
      category: p.category,
      price: price,
      qty: quantity,
      line_mode: qtyLineMode,
      rental_mode: itemRentalMode,
      rent_days: rentDays,
      rounds: rounds
    };

    const calculatedTotal = calculateRentalLineTotal(tempItem);

    if (isNaN(calculatedTotal)) {
      alert('⚠️ เกิดข้อผิดพลาดในการคำนวณราคา (ผลลัพธ์เป็น NaN) กรุณาตรวจสอบข้อมูล');
      return;
    }

    const newItem = {
      item_id: p.item_id,
      sku: p.sku,
      receipt_name: p.item_name,
      category: p.category, // store real product category!
      size: p.item_name.match(/[\d.]+/)?.[0] || '',
      unit: p.unit,
      line_mode: qtyLineMode,
      rental_mode: qtyLineMode === 'rent' ? itemRentalMode : ('round' as const),
      qty: quantity,
      price: price,
      rent_days: rentDays,
      rounds: rounds,
      start_date: qtyStartDate,
      due_date: qtyEndDate,
      qty_returned: 0,
      line_total: calculatedTotal
    };

    setCart([...cart, newItem]);
    setQtyModalProduct(null);
  };

  const handleRemoveCartItem = (idx: number) => {
    const next = [...cart];
    next.splice(idx, 1);
    setCart(next);
  };

  const formatThaiPhone = (val: string) => {
    const raw = val.replace(/\D/g, '');
    if (raw.length <= 3) return raw;
    if (raw.length <= 6) return `${raw.slice(0, 3)}-${raw.slice(3)}`;
    return `${raw.slice(0, 3)}-${raw.slice(3, 6)}-${raw.slice(6, 10)}`;
  };

  const formatThaiIDCard = (val: string) => {
    const raw = val.replace(/\D/g, '');
    if (raw.length <= 1) return raw;
    if (raw.length <= 5) return `${raw.slice(0, 1)}-${raw.slice(1)}`;
    if (raw.length <= 10) return `${raw.slice(0, 1)}-${raw.slice(1, 5)}-${raw.slice(5)}`;
    if (raw.length <= 12) return `${raw.slice(0, 1)}-${raw.slice(1, 5)}-${raw.slice(5, 10)}-${raw.slice(10)}`;
    return `${raw.slice(0, 1)}-${raw.slice(1, 5)}-${raw.slice(5, 10)}-${raw.slice(10, 12)}-${raw.slice(12, 13)}`;
  };

  const startCardReaderSimulation = (type: 'smart_card' | 'ocr', presetIdx: number) => {
    setReaderConnecting(true);
    setReaderProgress(0);
    
    const messages = type === 'smart_card' 
      ? [
          '🔋 กำลังเชื่อมต่อเครื่องอ่านชิป Smart card (ผ่านช่องสัญญาณ RF/NFC USB)...',
          '⚡ จ่ายกำลังไฟเข้าสมาร์ทการ์ดทองเหลืองสำเร็จ...',
          '📡 ดึงพิกัด ข้อมูลลายเซ็น และถอดรหัสรหัสผ่านกรมการปกครอง...',
          '✓ ซิงค์ฐานข้อมูลและเก็บภาพถ่ายความละเอียดสูงสำเร็จเรียบร้อย!'
        ]
      : [
          '📷 กำลังปรับความคมชัดกล้องถ่ายภาพความละเอียดสูง...',
          '🔍 ตรวจพบมุมขอบบัตรประชาชน และทำการประมวลผล OCR ท้องถิ่น...',
          '🤖 เทคโนโลยีวิเคราะห์รูปทรงใบหน้า และดึงลายลักษณ์อักษรสำเร็จ...',
          '✓ อ่านข้อความและวิเคราะห์รอยลายเซ็นลุล่วงแล้ว!'
        ];
    
    setReaderStatusText(messages[0]);

    let step = 0;
    const interval = setInterval(() => {
      step += 1;
      setReaderProgress(step * 25);
      if (step < 4) {
        setReaderStatusText(messages[step]);
      } else {
        clearInterval(interval);
        setTimeout(() => {
          const preset = [
            {
              name: "นายสมจิตต์ พัฒนากร",
              phone: "081-345-6789",
              idNo: "1539900281456",
              addressNo: "112/5 ซอย 3",
              moo: "4",
              subdistrict: "ท่าเสา",
              amphoe: "เมืองอุตรดิตถ์",
              province: "อุตรดิตถ์",
              postalCode: "53000",
              worksite: "โครงการหน้างานปรับหน้าดิน ข้างโรงพยาบาลอุตรดิตถ์",
              signatureUrl: "data:image/svg+xml;utf8,<svg viewBox='0 0 100 30'><path d='M10 15 Q30 5, 50 15 T90 15' fill='none' stroke='black' stroke-width='2'/></svg>",
              idCardSvg: `<svg viewBox="0 0 450 280" class="w-full h-full rounded-2xl shadow-xl overflow-hidden border border-blue-200" style="background:#f0f7ff;">
                <rect width="100%" height="100%" fill="none" />
                <rect width="100%" height="32" fill="#0284c7" />
                <text x="12" y="20" fill="#ffffff" font-family="sans-serif" font-size="10" font-weight="extrabold">บัตรประจำตัวประชาชน (Thai National ID Card)</text>
                <rect x="25" y="52" width="34" height="24" rx="3" fill="#fbbf24" stroke="#d97706" stroke-width="1.5" />
                <text x="80" y="65" fill="#1e3a8a" font-family="monospace" font-size="14" font-weight="950">1 5399 00281 45 6</text>
                <text x="80" y="85" fill="#0369a1" font-family="sans-serif" font-size="9" font-weight="bold">ชื่อ: นายสมจิตต์ พัฒนากร</text>
                <text x="80" y="98" fill="#475569" font-family="sans-serif" font-size="8">Name: Mr. Somjit Pattanakorn</text>
                <text x="80" y="115" fill="#0369a1" font-family="sans-serif" font-size="8" font-weight="bold">เกิดวันที่: 12 ต.ค. 2518</text>
                <text x="25" y="150" fill="#0f172a" font-family="sans-serif" font-size="8.5" font-weight="bold">ที่อยู่: 112/5 หมู่ที่ 4 ต.ท่าเสา อ.เมืองอุตรดิตถ์ จ.อุตรดิตถ์ 53000</text>
                <text x="25" y="185" fill="#15803d" font-family="sans-serif" font-size="8" font-weight="black">✓ คุ้มครองความยินยอม PDPA ครบถ้วน</text>
              </svg>`
            },
            {
              name: "นางสาวมณีรัตน์ ศรีสวัสดิ์",
              phone: "095-888-9912",
              idNo: "3530100445218",
              addressNo: "45/1 หมู่บ้านสันทราย",
              moo: "2",
              subdistrict: "ป่าเซ่า",
              amphoe: "เมืองอุตรดิตถ์",
              province: "อุตรดิตถ์",
              postalCode: "53000",
              worksite: "หน้างานถมดิน ก่อสร้างอาคารพาณิชย์ 3 ชั้น ตรงข้ามกสิกร",
              signatureUrl: "data:image/svg+xml;utf8,<svg viewBox='0 0 100 30'><path d='M15 10 Q40 25, 60 10 T85 20' fill='none' stroke='black' stroke-width='2'/></svg>",
              idCardSvg: `<svg viewBox="0 0 450 280" class="w-full h-full rounded-2xl shadow-xl overflow-hidden border border-rose-200" style="background:#fffafa;">
                <rect width="100%" height="100%" fill="none" />
                <rect width="100%" height="32" fill="#be123c" />
                <text x="12" y="20" fill="#ffffff" font-family="sans-serif" font-size="10" font-weight="extrabold">บัตรประจำตัวประชาชน (Thai National ID Card)</text>
                <rect x="25" y="52" width="34" height="24" rx="3" fill="#fbbf24" stroke="#d97706" stroke-width="1.5" />
                <text x="80" y="65" fill="#881337" font-family="monospace" font-size="14" font-weight="950">3 5301 00445 21 8</text>
                <text x="80" y="85" fill="#9f1239" font-family="sans-serif" font-size="9" font-weight="bold">ชื่อ: นางสาวมณีรัตน์ ศรีสวัสดิ์</text>
                <text x="80" y="98" fill="#475569" font-family="sans-serif" font-size="8">Name: Ms. Maneerat Srisawat</text>
                <text x="80" y="115" fill="#9f1239" font-family="sans-serif" font-size="8" font-weight="bold">เกิดวันที่: 25 มี.ค. 2529</text>
                <text x="25" y="150" fill="#0f172a" font-family="sans-serif" font-size="8.5" font-weight="bold">ที่อยู่: 45/1 หมู่ที่ 2 ต.ป่าเซ่า อ.เมืองอุตรดิตถ์ จ.อุตรดิตถ์ 53000</text>
                <text x="25" y="185" fill="#15803d" font-family="sans-serif" font-size="8" font-weight="black">✓ คุ้มครองความยินยอม PDPA ครบถ้วน</text>
              </svg>`
            }
          ][presetIdx % 2];

          setNewCustName(preset.name);
          setNewCustPhone(formatThaiPhone(preset.phone));
          setNewCustIdNo(formatThaiIDCard(preset.idNo));
          setNewCustAddressNo(preset.addressNo);
          setNewCustMoo(preset.moo);
          setNewCustSubdistrict(preset.subdistrict);
          setNewCustDistrict(preset.amphoe);
          setNewCustProvince(preset.province);
          setNewCustZipcode(preset.postalCode);
          setNewCustSubdistrictSearch(preset.subdistrict);
          setNewCustWork(preset.worksite);
          setNewCustPdpa(true);
          setNewCustSignature(preset.signatureUrl);

          const svgBase64 = `data:image/svg+xml;utf8,${encodeURIComponent(preset.idCardSvg)}`;
          setIdCardFile(svgBase64);

          setReaderConnecting(false);
        }, 400);
      }
    }, 450);
  };

  const handleIdCardUploadFake = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setIdCardFile(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Quick custom register of a customer
  const handleInlineRegisterCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;

    const combinedAddress = [
      newCustAddressNo ? `${newCustAddressNo}` : '',
      newCustMoo ? `หมู่ที่ ${newCustMoo}` : '',
      newCustSubdistrict ? `ต. ${newCustSubdistrict}` : '',
      newCustDistrict ? `อ. ${newCustDistrict}` : '',
      newCustProvince ? `จ. ${newCustProvince}` : '',
      newCustZipcode ? `${newCustZipcode}` : ''
    ].filter(Boolean).join(' ');

    const added = JirakitDB.saveCustomer({
      customer_name: newCustName,
      phone: newCustPhone,
      address: combinedAddress,
      delivery_location: newCustWork,
      id_card_no: newCustIdNo,
      customer_signature: newCustSignature,
      pdpa_consent: newCustPdpa,
      id_card_image_url: idCardFile || undefined
    });

    setNewCustName('');
    setNewCustPhone('');
    setNewCustAddressNo('');
    setNewCustMoo('');
    setNewCustSubdistrict('');
    setNewCustSubdistrictSearch('');
    setNewCustDistrict('');
    setNewCustProvince('อุตรดิตถ์');
    setNewCustZipcode('');
    setNewCustWork('');
    setNewCustIdNo('');
    setNewCustSignature('');
    setIdCardFile('');
    setIsAddingCustomer(false);
    
    // Auto select the new customer
    setCustomers(JirakitDB.getCustomers().filter(c => c.customer_status === 'Active'));
    setSelectedCustomerId(added.customer_id);
    triggerRefresh();
  };

  const handleProcessPayment = () => {
    if (!selectedCustomerId) {
      alert('กรุณาเลือกรายชื่อลูกค้าสั่งซื้อก่อน');
      return;
    }
    // Pre-populate cash and transfer amounts with totals
    setCashAmount(currentCalcs.grand);
    setTransferAmount(0);
    setCashOn(true);
    setTransferOn(false);
    setDebtOn(false);
    setIsPaying(true);
  };

  const buildLiveReceiptPreviewPayload = () => {
    const customer = customers.find(c => c.customer_id === selectedCustomerId);
    const expectedNo = JirakitDB.createReceiptNo(docType);

    return {
      doc_type: docType,
      receipt_no: expectedNo,
      created_at: new Date(),
      receipt_date: new Date().toISOString(),
      customer_name: customer ? customer.customer_name : 'ลูกค้าเงินสด (ทั่วไป)',
      phone: customer ? customer.phone || '-' : '-',
      address: customer ? customer.address || customer.registered_address || '-' : '-',
      delivery_location: customDeliveryLocation || '-',
      items: currentCalcs.lines,
      items_json: JSON.stringify(currentCalcs.lines),
      subtotal: currentCalcs.subtotal,
      discount: currentCalcs.discount,
      delivery_fee: currentCalcs.delivery,
      deposit: currentCalcs.deposit,
      vat: currentCalcs.vat,
      grand_total: currentCalcs.grand,
      paid_amount: 0,
      debt_amount: 0,
      note
    };
  };

  const handlePrintReceiptPreview = () => {
    const shopSettings = JirakitDB.getSettings();
    const receiptPayload = buildLiveReceiptPreviewPayload();
    printReceipt(receiptPayload, activePaper, {
      ...shopSettings,
      RECEIPT_PAPER_SIZE: activePaper
    });
  };

  const handleSaveReceiptImage = async () => {
    try {
      const shopSettings = JirakitDB.getSettings();
      const receiptPayload = buildLiveReceiptPreviewPayload();

      await downloadReceiptImage(receiptPayload, activePaper, {
        ...shopSettings,
        RECEIPT_PAPER_SIZE: activePaper
      });
    } catch (err) {
      console.error('Failed to save receipt image:', err);
      alert('ไม่สามารถบันทึกภาพได้');
    }
  };

  const handleConfirmOrder = () => {
    const customer = customers.find(c => c.customer_id === selectedCustomerId);
    if (!customer) return;

    const total = currentCalcs.grand;
    const paidCash = cashOn ? cashAmount : 0;
    const paidTransfer = transferOn ? transferAmount : 0;
    const actualPaid = Math.min(total, paidCash + paidTransfer);
    const debt = debtOn ? Math.max(0, total - actualPaid) : 0;
    const change = Math.max(0, paidCash + paidTransfer - total);

    const expectedNo = JirakitDB.createReceiptNo(docType);

    const receiptPayload = {
      doc_type: docType,
      receipt_no: expectedNo,
      receipt_title: {
        receipt: 'ใบเสร็จรับเงิน',
        invoice: 'ใบแจ้งหนี้ / ใบเชิญใบเสร็จ',
        delivery: 'ใบส่งของ',
        quotation: 'ใบเสนอราคา',
        delivery_receipt: 'ใบส่งของ / ใบเสร็จรับเงิน',
        debt_notice: 'ใบแจ้งภาระหนี้สิน'
      }[docType],
      customer_id: customer.customer_id,
      customer_name: customer.customer_name,
      phone: customer.phone,
      address: customer.address || customer.registered_address,
      delivery_location: customDeliveryLocation || '',
      rent_date: rentDate,
      due_date: dueDate,
      subtotal: currentCalcs.subtotal,
      discount: currentCalcs.discount,
      delivery_fee: currentCalcs.delivery,
      deposit: currentCalcs.deposit,
      vat: currentCalcs.vat,
      vat_rate: vatOn ? 7 : 0,
      vat_mode: vatOn ? 'EXCLUDE' : 'NONE',
      grand_total: total,
      paid_cash: paidCash - (change > 0 ? change : 0),
      paid_transfer: paidTransfer,
      paid_amount: actualPaid,
      debt_amount: debt,
      change_amount: change,
      payment_status: debt <= 0 ? 'ชำระครบ' : actualPaid > 0 ? 'ชำระบางส่วน' : 'ยังไม่ชำระ',
      note,
      items: currentCalcs.lines,
      client_txn_id: `TXN-${Date.now()}`
    };

    const executeSave = async () => {
      try {
        const savedReceipt = JirakitDB.saveReceipt(receiptPayload);
        const shopSettings = JirakitDB.getSettings();

        // Auto-download file to the device
        try {
          await downloadReceiptImage(savedReceipt, activePaper, shopSettings);
        } catch (imgErr) {
          console.error('Failed to auto-download receipt image:', imgErr);
        }

        alert('บันทึกและตัดคลังสินค้าสำเร็จเรียบร้อยแล้ว!');
        setCart([]);
        setIsPaying(false);
        triggerRefresh();
        onNavigate('bills');
      } catch(err: any) {
        alert(`ไม่สามารถทำการบันทึกบิลได้: ${err?.message || err}`);
      }
    };

    executeSave();
  };

  return (
    <div className="space-y-6">
      <style>{`
        @keyframes blinkRedCard {
          0%, 100% {
            background-color: #fff;
            border-color: #fee2e2;
            box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
          }
          50% {
            background-color: #fef2f2;
            border-color: #ef4444;
            box-shadow: 0 4px 15px rgba(239, 68, 68, 0.25);
          }
        }
        .blink-red-card-active {
          animation: blinkRedCard 1.2s infinite ease-in-out !important;
          border-width: 2px !important;
        }
      `}</style>
      <div className="flex flex-col xl:flex-row gap-6 pos-layout">
        {/* Left Side: Products Grid */}
        <div className="flex-1 space-y-4">
          <div className="bg-white p-4 border border-red-100 rounded-2xl flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 text-red-900" size={18} />
              <input
                type="text"
                className="w-full bg-[#FFFBF9] border border-red-100 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-[#9B1313]"
                placeholder="ค้นหารหัส SKU หรือชื่อตัววัสดุก่อสร้าง..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            
            {/* Horizontal Categorization */}
            <div className="flex overflow-x-auto gap-1.5 w-full md:w-auto p-1 bg-gray-50 rounded-xl shrink-0">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                    selectedCategory === cat 
                      ? 'bg-[#9B1313] text-white shadow-sm' 
                      : 'text-gray-600 hover:text-[#38000A]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div 
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-5 xl:grid-cols-5 gap-3 product-grid select-none"
          >
            {filteredProducts.map(p => {
              const ruleLocked = p.category === 'แบบคาน' || p.category === 'แบบเสา';
              const isLowStock = p.qty_available <= p.low_stock_threshold && p.item_status === 'Active';
  
              // Extract product name and size
              const category = p.category;
              let namePart = category;
              let sizePart = '';
  
              if (p.item_name.startsWith(category)) {
                sizePart = p.item_name.substring(category.length).trim();
              } else {
                const firstSpaceIndex = p.item_name.indexOf(' ');
                if (firstSpaceIndex !== -1) {
                  namePart = p.item_name.substring(0, firstSpaceIndex);
                  sizePart = p.item_name.substring(firstSpaceIndex + 1);
                } else {
                  namePart = p.item_name;
                  sizePart = p.unit || '';
                }
              }
  
              return (
                <button
                  key={p.item_id}
                  onClick={() => handleOpenQtyModal(p)}
                  className={`${
                    isLowStock 
                      ? 'blink-red-card-active border-red-500 hover:border-red-600' 
                      : 'bg-white border border-gray-100 hover:border-[#9B1313]/30'
                  } rounded-xl p-2 sm:p-3 flex flex-col justify-between items-center text-center transition-all active:scale-[0.98] shadow-sm focus:outline-none aspect-square w-full`}
                >
                  <div className="w-full flex justify-center items-center">
                    {isLowStock && (
                      <span className="text-[8px] font-black bg-red-600 text-white px-2 py-0.5 rounded animate-pulse">
                        สต็อกใกล้หมด!
                      </span>
                    )}
                  </div>
  
                  <div className="flex-1 flex flex-col items-center justify-center text-center w-full my-auto text-wrap break-all px-0.5">
                    <h4 className="font-extrabold text-[#38000A] text-xl line-clamp-2 uppercase tracking-wide">
                      {namePart}
                    </h4>
                    {sizePart && (
                      <p className="text-xl font-extrabold text-gray-400 mt-1 line-clamp-2 leading-tight">
                        {sizePart}
                      </p>
                    )}
                  </div>
  
                  <div className="w-full border-t border-gray-50 pt-2 flex flex-col items-center justify-center text-center">
                    <span className={`text-xs sm:text-sm ${isLowStock ? 'text-red-700 font-extrabold' : 'text-gray-400'} font-extrabold`}>
                      คงเหลือ {p.qty_available} / {p.qty_total}
                    </span>
                    <div className="mt-0.5">
                      {p.use_type === 'sale' ? (
                        <p className="text-xs sm:text-sm font-black text-[#CD1C18]">{p.price_sale} บาท</p>
                      ) : (
                        <p className="text-xs sm:text-sm font-black text-[#CD1C18]">{p.price_rent} บาท</p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Order list and Options */}
        <div className="w-full xl:w-[420px] bg-white border border-red-100 rounded-2xl p-5 shadow-sm space-y-4 shrink-0 cart-panel">
          <div className="flex justify-between items-center border-b border-gray-100 pb-3">
            <h3 className="text-md font-bold text-[#38000A] flex items-center gap-2">
              <ShoppingCart className="stroke-[#9B1313]" size={18} />
              ตะกร้าออกบิล ({cart.length} แถว)
            </h3>
            {cart.length > 0 && (
              <button onClick={() => setCart([])} className="text-xs font-semibold text-rose-600 flex items-center gap-1 hover:underline">
                <Trash2 size={13} /> ล้างตะกร้า
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {cart.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-gray-100 rounded-xl">
                <p className="text-gray-400 text-xs font-semibold">กรุณาคลิกเลือกวัสดุเพื่อออกใบเสร็จ</p>
              </div>
            ) : (
              cart.map((item, idx) => {
                const prod = products.find(p => p.item_id === item.item_id);
                const isUnderThreshold = prod ? (prod.qty_available <= prod.low_stock_threshold) : false;
                const isExceededAvailable = prod ? (item.qty > prod.qty_available) : false;

                return (
                  <div key={idx} className="bg-[#FFFBF9] border border-red-50 p-3 rounded-lg flex justify-between items-center text-xs">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h5 className="font-bold text-gray-800">{item.receipt_name}</h5>
                        {isExceededAvailable ? (
                          <span className="bg-red-600 text-white font-extrabold text-[8px] px-1.5 py-0.5 rounded animate-pulse">
                            เกินคงคลัง! (เหลือ {prod?.qty_available})
                          </span>
                        ) : isUnderThreshold ? (
                          <span className="bg-amber-100 text-amber-900 font-extrabold text-[8px] px-1.5 py-0.5 rounded border border-amber-300 animate-pulse">
                            ใกล้หมดคลัง!
                          </span>
                        ) : null}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {item.line_mode === 'rent' ? 'เช่า' : 'ขาย'} • {item.qty} {item.unit} x ฿{item.price} • {item.rent_days} {item.rental_mode === 'day' ? 'วัน' : 'รอบ'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-[#CD1C18]">฿{item.line_total.toLocaleString()}</span>
                      <button onClick={() => handleRemoveCartItem(idx)} className="text-rose-600 hover:bg-rose-50 p-1 rounded">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Low-Stock items alert summary for current cart items */}
          {(() => {
            const list: { item_name: string; qty_available: number; threshold: number; requested_qty: number; type: 'low_stock' | 'exceeded' }[] = [];
            cart.forEach(item => {
              const prod = products.find(p => p.item_id === item.item_id);
              if (prod) {
                if (item.qty > prod.qty_available) {
                  list.push({
                    item_name: prod.item_name,
                    qty_available: prod.qty_available,
                    threshold: prod.low_stock_threshold,
                    requested_qty: item.qty,
                    type: 'exceeded'
                  });
                } else if (prod.qty_available <= prod.low_stock_threshold) {
                  list.push({
                    item_name: prod.item_name,
                    qty_available: prod.qty_available,
                    threshold: prod.low_stock_threshold,
                    requested_qty: item.qty,
                    type: 'low_stock'
                  });
                }
              }
            });

            if (cart.length > 0 && list.length > 0) {
              return (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4.5 space-y-2 mt-2">
                  <div className="flex items-center gap-1.5 text-rose-800 text-[11px] font-black uppercase">
                    <AlertCircle size={14} className="stroke-rose-600 animate-bounce" />
                    <span>แจ้งเตือนสินค้าสต็อกเหลือน้อยสะสมในตะกร้า</span>
                  </div>
                  <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
                    {list.map((alertItem, idx) => {
                      const isExceeded = alertItem.type === 'exceeded';
                      return (
                        <div key={idx} className={`p-2 rounded-xl text-[10px] font-bold border transition-all ${
                          isExceeded 
                            ? 'bg-rose-100/50 border-rose-200 text-rose-800 animate-pulse' 
                            : 'bg-amber-50 border-amber-200 text-amber-805'
                        }`}>
                          <p className="font-extrabold">{alertItem.item_name}</p>
                          <div className="flex justify-between items-center mt-1 text-[9px] font-semibold">
                            <span>คงเหลือในคลัง: <strong className="font-mono">{alertItem.qty_available}</strong> หน่วย</span>
                            <span>
                              {isExceeded 
                                ? `⚠️ ขอเบิก: ${alertItem.requested_qty} (สินค้าไม่พอปล่อย!)` 
                                : `เกณฑ์เตือนสต็อกต่ำ: < ${alertItem.threshold}`
                              }
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }
            return null;
          })()}

          {/* Customer and Document select */}
          <div className="space-y-3 pt-3 border-t border-gray-100">
            <div>
              <label className="block text-xs font-extrabold text-[#9B1313] mb-1">ประเภทเอกสารบิล</label>
              <select
                className="w-full bg-[#FFFBF9] border border-gray-200 rounded-xl p-2.5 text-xs text-gray-800 font-bold focus:outline-none focus:border-[#9B1313]"
                value={docType}
                onChange={e => setDocType(e.target.value as any)}
              >
                <option value="receipt">ใบเสร็จรับเงิน (Receipt)</option>
                <option value="invoice">ใบแจ้งหนี้ (Invoice)</option>
                <option value="delivery">ใบส่งของ (Delivery Order)</option>
                <option value="quotation">ใบเสนอราคา (Quotation)</option>
                <option value="delivery_receipt">ใบส่งของ / ใบเสร็จรับเงิน</option>
                <option value="debt_notice">ใบแจ้งเก็บเงินค้างชำระ</option>
              </select>
            </div>

            <div>
              <div className="grid grid-cols-2 gap-2.5 mr-[46px] mb-1">
                <label className="text-xs font-extrabold text-[#9B1313]">ชื่อผู้เช่า / ลูกค้าประจำ</label>
                <label className="text-xs font-extrabold text-[#9B1313]">สถานที่จัดส่งสำหรับบิลนี้</label>
              </div>
              
              <div className="flex items-center gap-1.5">
                <div className="grid grid-cols-2 gap-2.5 flex-1 min-w-0">
                  <div className="relative">
                    <User className="absolute left-3 top-3 text-red-950" size={14} />
                    <select
                      className="w-full h-[40px] bg-[#FFFBF9] border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-xs text-gray-800 font-bold focus:outline-none focus:border-[#9B1313]"
                      value={selectedCustomerId}
                      onChange={e => setSelectedCustomerId(e.target.value)}
                    >
                      <option value="">-- ดึงรายชื่อลูกค้าที่บันทึกแล้ว --</option>
                      {customers.map(c => (
                        <option key={c.customer_id} value={c.customer_id}>
                          {c.customer_name} {c.phone ? `(${c.phone})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 text-red-950" size={14} />
                    <input
                      type="text"
                      placeholder="สถานที่จัดส่ง / หน้างาน"
                      className="w-full h-[40px] bg-[#FFFBF9] border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-xs text-gray-800 font-bold focus:outline-none focus:border-[#9B1313]"
                      value={customDeliveryLocation}
                      onChange={e => setCustomDeliveryLocation(e.target.value)}
                    />
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={() => setIsAddingCustomer(!isAddingCustomer)}
                  className={`w-[40px] h-[40px] bg-white hover:bg-red-50 border ${isAddingCustomer ? 'border-[#9B1313] text-[#9B1313]' : 'border-gray-250 text-gray-700'} rounded-xl flex items-center justify-center shrink-0 transition-all cursor-pointer`}
                  title="ลงทะเบียนสดด่วน"
                >
                  <Plus size={18} className="stroke-current" />
                </button>
              </div>

              {isAddingCustomer && (
                <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
                  <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-2xl w-full max-h-[92vh] flex flex-col text-left overflow-hidden">
                    
                    {/* Header */}
                    <div className="bg-gradient-to-r from-[#9B1313] to-[#7A0D0D] px-6 py-4 flex items-center justify-between text-white">
                      <div>
                        <h3 className="font-extrabold text-sm sm:text-base tracking-wide">ลงทะเบียนลูกค้าใหม่ลัดด่วน (POS Express)</h3>
                        <p className="text-[10px] text-red-100 mt-0.5 font-sans">กรอกข้อมูลด่วนด้วย Smart Card Reader / ถ่ายภาพ OCR หรือกรอกแมนนวล</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            startCardReaderSimulation('ocr', presetIndexCounter);
                            setPresetIndexCounter(prev => prev + 1);
                          }}
                          disabled={readerConnecting}
                          className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-400 active:bg-yellow-600 disabled:opacity-50 text-slate-950 text-xs font-black rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                        >
                          📸 ถ่ายรูป/OCR
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            startCardReaderSimulation('smart_card', presetIndexCounter);
                            setPresetIndexCounter(prev => prev + 1);
                          }}
                          disabled={readerConnecting}
                          className="px-3 py-1.5 bg-blue-650 hover:bg-blue-600 active:bg-blue-800 disabled:opacity-50 text-white text-xs font-black rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                        >
                          💳 เสียบการ์ดชิป
                        </button>
                      </div>
                    </div>

                    {/* Progress Connecting indicator */}
                    {readerConnecting && (
                      <div className="bg-amber-50 border-b border-amber-200 p-4 shrink-0 transition-all">
                        <div className="flex items-center justify-between text-xs font-extrabold text-amber-900 mb-2">
                          <span className="flex items-center gap-1.5 animate-pulse">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>
                            {readerStatusText}
                          </span>
                          <span className="font-mono text-xs">{readerProgress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full transition-all duration-300"
                            style={{ width: `${readerProgress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* Form Scroll Container */}
                    <form onSubmit={handleInlineRegisterCustomer} className="flex-1 overflow-y-auto p-6 space-y-4">
                      
                      {/* Flex ID card preview side-by-side with inputs */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        
                        {/* Core text inputs (8 cols) */}
                        <div className="md:col-span-8 space-y-3.5">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 mb-1">ชื่อสมาคม - ชื่อคู่สัญญาค้าขายวัสดุก่อสร้าง *</label>
                            <input
                              type="text"
                              required
                              placeholder="เช่น นายบุญส่ง แสนดี"
                              className="w-full h-10 border border-slate-200 rounded-xl px-3 text-xs text-slate-800 font-bold focus:outline-none focus:border-[#9B1313] focus:ring-1 focus:ring-[#9B1313]"
                              value={newCustName}
                              onChange={e => setNewCustName(e.target.value)}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 mb-1">โทรศัพท์มือถือ *</label>
                              <input
                                type="text"
                                required
                                maxLength={12}
                                placeholder="000-000-0000"
                                className="w-full h-10 border border-slate-200 rounded-xl px-3 text-xs text-slate-800 font-bold focus:outline-none focus:border-[#9B1313] focus:ring-1 focus:ring-[#9B1313]"
                                value={newCustPhone}
                                onChange={e => setNewCustPhone(formatThaiPhone(e.target.value))}
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 mb-1">เลขบัตร ปชช. 13 หลัก *</label>
                              <input
                                type="text"
                                required
                                maxLength={17}
                                placeholder="0-0000-00000-00-0"
                                className="w-full h-10 border border-slate-200 rounded-xl px-3 text-xs text-slate-800 font-bold focus:outline-none focus:border-[#9B1313] focus:ring-1 focus:ring-[#9B1313]"
                                value={newCustIdNo}
                                onChange={e => setNewCustIdNo(formatThaiIDCard(e.target.value))}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-3">
                            <div className="col-span-2">
                              <label className="block text-[11px] font-bold text-slate-500 mb-1">บ้านเลขที่ / ตรอก / ซอย *</label>
                              <input
                                type="text"
                                required
                                placeholder="เช่น 112/5 ซอย 3"
                                className="w-full h-10 border border-slate-200 rounded-xl px-3 text-xs text-slate-800 font-bold focus:outline-none focus:border-[#9B1313] focus:ring-1 focus:ring-[#9B1313]"
                                value={newCustAddressNo}
                                onChange={e => setNewCustAddressNo(e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 mb-1">หมู่ที่ *</label>
                              <input
                                type="text"
                                required
                                placeholder="เช่น 4"
                                className="w-full h-10 border border-slate-200 rounded-xl px-3 text-xs text-slate-800 font-bold focus:outline-none focus:border-[#9B1313] focus:ring-1 focus:ring-[#9B1313]"
                                value={newCustMoo}
                                onChange={e => setNewCustMoo(e.target.value)}
                              />
                            </div>
                          </div>

                          {/* Address Autocompleter */}
                          <div className="relative">
                            <label className="block text-[11px] font-bold text-slate-400 mb-1">ตำบล / แขวง (พิมพ์เพื่อกรองหาอัตโนมัติ) *</label>
                            <input
                              type="text"
                              required
                              placeholder="🔎 พิมพ์ชื่อตำบล เช่น ท่าเสา, ป่าเซ่า"
                              className="w-full h-10 border border-slate-200 rounded-xl px-3 text-xs text-slate-800 font-bold bg-[#FAF9F6] focus:outline-none focus:border-[#9B1313] focus:ring-1 focus:ring-[#9B1313]"
                              value={newCustSubdistrictSearch}
                              onChange={e => {
                                setNewCustSubdistrictSearch(e.target.value);
                                setNewCustSubdistrict(e.target.value);
                                setShowSuggestions(true);
                              }}
                              onFocus={() => setShowSuggestions(true)}
                            />

                            {/* Dropdown helper popup */}
                            {showSuggestions && (
                              <div className="absolute left-0 right-0 z-[120] bg-white border border-slate-200 rounded-xl shadow-xl mt-1 max-h-[180px] overflow-y-auto font-sans flex flex-col shrink-0">
                                {(() => {
                                  const query = newCustSubdistrictSearch.trim();
                                  const filtered = THAI_ADDRESS_DATA.filter(item => 
                                    item.subdistrict.includes(query) ||
                                    item.district.includes(query) ||
                                    item.province.includes(query)
                                  );

                                  if (filtered.length === 0) {
                                    return (
                                      <div className="px-4 py-3 text-xs text-slate-400 font-bold text-center">
                                        ❌ ไม่พบข้อมูลตำบลที่ค้นหา ลองกรอกแบบกำหนดเองด้านล่าง
                                      </div>
                                    );
                                  }

                                  return filtered.slice(0, 10).map((item, id) => (
                                    <button
                                      key={id}
                                      type="button"
                                      onClick={() => {
                                        setNewCustSubdistrict(item.subdistrict);
                                        setNewCustSubdistrictSearch(item.subdistrict);
                                        setNewCustDistrict(item.district);
                                        setNewCustProvince(item.province);
                                        setNewCustZipcode(item.zipcode);
                                        setShowSuggestions(false);
                                      }}
                                      className="w-full text-left px-4 py-2 hover:bg-slate-50 text-xs text-slate-700 hover:text-[#9B1313] transition-colors font-semibold"
                                    >
                                      ตำบล {item.subdistrict} → อำเภอ {item.district} → จังหวัด {item.province} ({item.zipcode})
                                    </button>
                                  ));
                                })()}
                                <button
                                  type="button"
                                  onClick={() => setShowSuggestions(false)}
                                  className="w-full text-center py-2 bg-slate-50 hover:bg-slate-100 text-[10px] font-extrabold text-[#9B1313] border-t"
                                >
                                  ปิดหน้าต่างตัวกรองอัตโนมัติ [X]
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 mb-1">อำเภอ / เขต *</label>
                              <input
                                type="text"
                                required
                                placeholder="เช่น เมืองอุตรดิตถ์"
                                className="w-full h-10 border border-slate-200 rounded-xl px-3 text-xs text-slate-800 font-bold focus:outline-none focus:border-[#9B1313] focus:ring-1 focus:ring-[#9B1313]"
                                value={newCustDistrict}
                                onChange={e => setNewCustDistrict(e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 mb-1">จังหวัด *</label>
                              <select
                                className="w-full h-10 border border-slate-200 rounded-xl px-3 bg-white text-xs text-slate-800 font-bold focus:outline-none focus:border-[#9B1313] focus:ring-1 focus:ring-[#9B1313]"
                                value={newCustProvince}
                                onChange={e => setNewCustProvince(e.target.value)}
                              >
                                {['อุตรดิตถ์', 'พิษณุโลก', 'สุโขทัย', 'แพร่', 'น่าน', 'พะเยา', 'เชียงใหม่', 'กรุงเทพมหานคร'].map(p => (
                                  <option key={p} value={p}>{p}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 mb-1">รหัสไปรษณีย์ *</label>
                              <input
                                type="text"
                                required
                                maxLength={5}
                                placeholder="เช่น 53000"
                                className="w-full h-10 border border-slate-200 rounded-xl px-3 text-xs text-slate-800 font-bold focus:outline-none focus:border-[#9B1313] focus:ring-1 focus:ring-[#9B1313]"
                                value={newCustZipcode}
                                onChange={e => setNewCustZipcode(e.target.value)}
                              />
                            </div>
                          </div>
                        </div>

                        {/* ID preview container (4 cols) */}
                        <div className="md:col-span-4 flex flex-col justify-start">
                          <label className="block text-[11px] font-bold text-slate-400 mb-1">รูปบัตรประจำตัว ปชช. (สแกน/สแน็ปช็อต)</label>
                          <div className="relative border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 aspect-[85.6/54] w-full flex items-center justify-center overflow-hidden h-[130px] sm:h-[150px] shrink-0">
                            {idCardFile ? (
                              <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: idCardFile.startsWith('data:image/svg+xml') ? decodeURIComponent(idCardFile.split(',')[1]) : `<img src="${idCardFile}" class="w-full h-full object-contain" />` }}></div>
                            ) : (
                              <div className="text-center p-3">
                                <span className="text-2xl">🪪</span>
                                <p className="text-[9px] text-slate-400 mt-1.5 font-sans">ยังไม่มีข้อมูลสแกนบัตรคู่สัญญา</p>
                              </div>
                            )}
                          </div>
                          <div className="mt-2 flex gap-1 justify-center">
                            <label className="px-2 py-1 bg-slate-200 hover:bg-slate-300 rounded text-[9px] font-bold cursor-pointer transition-colors">
                              📁 อัปโหลดรูปภาพ
                              <input type="file" accept="image/*" onChange={handleIdCardUploadFake} className="hidden" />
                            </label>
                            {idCardFile && (
                              <button
                                type="button"
                                onClick={() => setIdCardFile('')}
                                className="px-2 py-1 bg-red-100 hover:bg-red-200 rounded text-[9px] font-bold text-red-700 transition-colors"
                              >
                                ลบรูป
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Worksite address location */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">หน้างานสำหรับการจัดส่งกองวัสดุ / พิกัดโครงการก่อสร้าง</label>
                        <input
                          type="text"
                          placeholder="ระบุสถานที่ทำงานจริง เช่น โครงการหมู่บ้านพฤกษา ซอย 5 แปลง 4"
                          className="w-full h-10 border border-slate-200 rounded-xl px-3 text-xs text-slate-800 font-bold focus:outline-none focus:border-[#9B1313] focus:ring-1 focus:ring-[#9B1313]"
                          value={newCustWork}
                          onChange={e => setNewCustWork(e.target.value)}
                        />
                      </div>

                      {/* Signature SignaturePad panel */}
                      <div className="bg-red-50/20 border border-slate-150 rounded-2xl p-3.5 space-y-2">
                        <SignaturePad
                          label="ลายลักษณ์อักษรเซ็นสัญญาเช่า-ยืม / ลายมือชื่อผู้กู้ยืมนิ้ว/เมาส์ *"
                          placeholder="เซ็นลายมือชื่อสั้นๆ แทนพยานยืนยันที่นี่..."
                          value={newCustSignature}
                          onChange={setNewCustSignature}
                        />
                      </div>

                      {/* PDPA checkbox */}
                      <label className="flex items-center gap-2.5 bg-sky-50/50 p-2.5 rounded-xl border border-sky-100 text-slate-700 select-none cursor-pointer">
                        <input
                          type="checkbox"
                          required
                          checked={newCustPdpa}
                          onChange={(e) => setNewCustPdpa(e.target.checked)}
                          className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 accent-[#9B1313]"
                        />
                        <span className="text-[10px] sm:text-xs">
                          ความยินยอมผู้รับการเปิดเผยข้อมูลตามหลักเกณฑ์ <strong className="text-slate-900">PDPA</strong> ยินยอมเปิดเผยข้อมูลเพื่อสัญญาเช่าซื้อวัสดุ
                        </span>
                      </label>

                      {/* Actions */}
                      <div className="bg-slate-50 -mx-6 -mb-6 px-6 py-4 flex justify-end gap-3.5 border-t mt-4">
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingCustomer(false);
                            setNewCustName('');
                            setNewCustPhone('');
                            setNewCustAddressNo('');
                            setNewCustMoo('');
                            setNewCustSubdistrict('');
                            setNewCustSubdistrictSearch('');
                            setNewCustDistrict('');
                            setNewCustProvince('อุตรดิตถ์');
                            setNewCustZipcode('');
                            setNewCustWork('');
                            setNewCustIdNo('');
                            setNewCustSignature('');
                            setIdCardFile('');
                          }}
                          className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 active:bg-slate-400 text-slate-800 text-xs font-bold rounded-xl transition-all cursor-pointer"
                        >
                          ยกเลิกปิดหน้าต่าง
                        </button>
                        <button
                          type="submit"
                          className="px-6 py-2.5 bg-[#9B1313] hover:bg-[#801010] active:bg-red-950 text-white text-xs font-extrabold rounded-xl transition-all shadow-md flex items-center gap-1 cursor-pointer"
                        >
                          ✓ ยืนยันเซฟเข้าฐานข้อมูลและเลือกใช้งานทันที
                        </button>
                      </div>

                    </form>

                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-extrabold text-[#9B1313] mb-1">วันที่ปล่อยวัสดุก่อสร้าง</label>
                <input
                  type="date"
                  className="w-full border border-gray-200 rounded-xl p-2 text-xs font-bold focus:outline-none focus:border-[#9B1313]"
                  value={rentDate}
                  onChange={e => setRentDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold text-[#9B1313] mb-1">วันที่กําหนดเก็บคืนคลัง</label>
                <input
                  type="date"
                  className="w-full border border-gray-200 rounded-xl p-2 text-xs font-bold focus:outline-none focus:border-[#9B1313]"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Add-on options sliders checkable */}
          <div className="pt-3 border-t border-gray-100 text-xs font-bold text-gray-755 text-gray-700 space-y-3">
            {/* Discount */}
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-700">เปิดส่วนลด</span>
              <div className="flex items-center gap-2">
                {discountOn && (
                  <input
                    type="number"
                    placeholder="0"
                    className="w-24 text-right border border-gray-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-[#9B1313]"
                    value={discountVal || ''}
                    onChange={e => setDiscountVal(Number(e.target.value))}
                  />
                )}
                <button
                  type="button"
                  onClick={() => {
                    const next = !discountOn;
                    setDiscountOn(next);
                    if (!next) setDiscountVal(0);
                  }}
                  className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    discountOn ? 'bg-[#CD1C18]' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                      discountOn ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Deposit */}
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-700">หักเงินมัดจำ</span>
              <div className="flex items-center gap-2">
                {depositOn && (
                  <input
                    type="number"
                    placeholder="0"
                    className="w-24 text-right border border-gray-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-[#9B1313]"
                    value={depositVal || ''}
                    onChange={e => setDepositVal(Number(e.target.value))}
                  />
                )}
                <button
                  type="button"
                  onClick={() => {
                    const next = !depositOn;
                    setDepositOn(next);
                    if (!next) setDepositVal(0);
                  }}
                  className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    depositOn ? 'bg-[#CD1C18]' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                      depositOn ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Delivery Charge */}
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-700">ค่าขนส่งเพิ่มเติม</span>
              <div className="flex items-center gap-2">
                {deliveryOn && (
                  <input
                    type="number"
                    placeholder="0"
                    className="w-24 text-right border border-gray-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-[#9B1313]"
                    value={deliveryVal || ''}
                    onChange={e => setDeliveryVal(Number(e.target.value))}
                  />
                )}
                <button
                  type="button"
                  onClick={() => {
                    const next = !deliveryOn;
                    setDeliveryOn(next);
                    if (!next) setDeliveryVal(0);
                  }}
                  className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    deliveryOn ? 'bg-[#CD1C18]' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                      deliveryOn ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* VAT 7% option */}
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-700">เปิดใช้งานภาษี VAT 7%</span>
              <button
                type="button"
                onClick={() => setVatOn(!vatOn)}
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  vatOn ? 'bg-[#CD1C18]' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                    vatOn ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Pricing Totals display preview */}
          <div className="bg-[#FFF6F3] p-4 rounded-xl border border-red-100 text-xs font-bold space-y-2">
            <div className="flex justify-between text-gray-500">
              <span>มูลค่ายอดค้าอุปกรณ์รวม:</span>
              <span>฿{currentCalcs.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            {discountOn && (
              <div className="flex justify-between text-rose-600">
                <span>ส่วนลด:</span>
                <span>- ฿{currentCalcs.discount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            {depositOn && (
              <div className="flex justify-between text-teal-600">
                <span>หักลบมัดจําก่อนหน้านี้:</span>
                <span>- ฿{currentCalcs.deposit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            {deliveryOn && (
              <div className="flex justify-between text-gray-500">
                <span>ค่าขนส่ง:</span>
                <span>+ ฿{currentCalcs.delivery.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            {vatOn && (
              <div className="flex justify-between text-gray-500">
                <span>ภาษีมูลค่าเพิ่ม (VAT 7%):</span>
                <span>+ ฿{currentCalcs.vat.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-black text-red-950 pt-2 border-t border-dashed border-red-200">
              <span>ยอดรวมสุทธิ:</span>
              <span>฿{currentCalcs.grand.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <button
            onClick={handleProcessPayment}
            className="w-full py-4 bg-[#CD1C18] hover:bg-rose-900 active:scale-[0.98] transition-all text-white font-extrabold text-sm rounded-2xl shadow-sm flex items-center justify-center gap-2"
          >
            <ShoppingCart size={16} />
            พิมพ์บิลใบส่งของ / ชำระเงินสด
          </button>
        </div> {/* Closes right sidebar */}
      </div> {/* Closes flex container */}

      {qtyModalProduct && (
        <div className="fixed inset-0 bg-[#38000A]/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setQtyModalProduct(null)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-655 text-2xl font-bold font-mono"
            >
              ×
            </button>
            <div className="pr-8 pb-3 border-b border-gray-100">
              <div className="flex justify-between items-center mt-1 flex-wrap gap-2">
                <h3 className="text-[27px] font-black text-[#38000A]">{qtyModalProduct.item_name}</h3>
                <span className="text-[27px] font-black text-emerald-700">
                  จำนวนที่เลือก {qtyVal} {qtyModalProduct.unit}
                </span>
              </div>
            </div>

            <div className="space-y-4 mt-4">
              {/* Rental vs Buyout Row Mode selector */}
              {qtyModalProduct.use_type === 'both' && (
                <div className="flex gap-2 p-1 bg-gray-50 border border-gray-150 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setQtyLineMode('rent');
                      setRoundsVal(1);
                    }}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                      qtyLineMode === 'rent'
                        ? 'bg-[#CD1C18] text-white shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    บริการเช่าใช้งาน (Rental)
                  </button>
                  <button
                    type="button"
                    onClick={() => setQtyLineMode('sale')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                      qtyLineMode === 'sale'
                        ? 'bg-[#CD1C18] text-white shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    ขายขาดทันที (Outright Buyout)
                  </button>
                </div>
              )}

              {/* Quantity 1-50 Grid buttons and manual input */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-black text-gray-700">เลือกจำนวนวัสดุก่อสร้าง (1 - 50 {qtyModalProduct.unit})</label>
                  <span className="text-[11px] font-bold text-slate-500">คลังคงเหลือพร้อมใช้: {qtyModalProduct.qty_available} {qtyModalProduct.unit}</span>
                </div>
                
                {/* 1-50 Quick Selection Grid */}
                <div className="grid grid-cols-10 gap-1.5 p-2.5 bg-slate-50 border border-slate-200 rounded-2xl">
                  {Array.from({ length: 50 }, (_, i) => i + 1).map(num => {
                    const exceedsStock = num > qtyModalProduct.qty_available;
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setQtyVal(num)}
                        disabled={exceedsStock}
                        className={`h-11 text-sm font-black rounded-xl transition-all ${
                          qtyVal === num
                            ? 'bg-[#CD1C18] text-white font-black scale-105 shadow-md ring-2 ring-red-300'
                            : exceedsStock
                              ? 'bg-gray-100 text-gray-300 cursor-not-allowed text-xs'
                              : 'bg-white text-gray-750 hover:bg-gray-100 border border-gray-150 active:scale-95'
                        }`}
                      >
                        {num}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Duration calculation for Rent - ONLY for Scaffold/Equipment group */}
              {qtyLineMode === 'rent' && (
                qtyModalProduct.category === 'นั่งร้าน' || 
                qtyModalProduct.category === 'ขาปรับ' || 
                qtyModalProduct.category === 'นั่งร้าน/อุปกรณ์' || 
                qtyModalProduct.category === 'นั่งร้านและอุปกรณ์'
              ) && (() => {
                const isSpecialScafGroup = qtyModalProduct.category === 'นั่งร้าน' || qtyModalProduct.category === 'ขาปรับ' || qtyModalProduct.category === 'นั่งร้าน/อุปกรณ์' || qtyModalProduct.category === 'นั่งร้านและอุปกรณ์';
                return (
                  <div className="space-y-3 p-3 bg-red-50/40 border border-red-100 rounded-xl">
                    {isSpecialScafGroup && (
                      <div className="bg-amber-500/10 text-[#38000A] p-2 border border-amber-500/20 rounded-lg text-[10px] font-bold leading-normal animate-in fade-in">
                        📢 หมวดหมู่{qtyModalProduct.category}:  ตั้งค่าราคาพิเศษ รายวัน/รอบ ด้านล่าง
                      </div>
                    )}

                    {/* Date fields with bi-directional sync */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 mb-1">วันที่เริ่มเช่า (ปฏิทิน)</label>
                        <input
                          type="date"
                          className="w-full bg-white border border-gray-200 rounded-lg p-1.5 text-[11px] font-bold outline-none focus:border-[#9B1313]"
                          value={qtyStartDate}
                          onChange={e => syncDaysFromDates(e.target.value, qtyEndDate)}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 mb-1">วันที่ครบกำหนดคืน (ปฏิทิน)</label>
                        <input
                          type="date"
                          className="w-full bg-white border border-gray-200 rounded-lg p-1.5 text-[11px] font-bold outline-none focus:border-[#9B1313]"
                          value={qtyEndDate}
                          onChange={e => syncDaysFromDates(qtyStartDate, e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        จำนวนระยะเวลาเช่าคิดตามจริง (ช่องกรอกตัวเลขกำหนดวัน)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="1"
                          className="flex-1 bg-white border border-gray-200 rounded-lg p-2 text-xs font-bold text-right outline-none focus:border-[#9B1313]"
                          value={roundsVal}
                          onChange={e => {
                            const val = Math.max(1, Number(e.target.value));
                            syncDatesFromDays(val);
                          }}
                        />
                        <span className="p-2 bg-slate-100 border rounded-lg text-xs font-black text-gray-600 shrink-0">วันเช่า</span>
                      </div>
                    </div>

                    {/* Custom pricing select override (Only for Scaffold/Jack Category group) */}
                    {isSpecialScafGroup && (
                      <div className="animate-in fade-in">
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          กำหนดราคาเช่าต่อชิ้นต่อวัน (ปกติ ฿{qtyModalProduct.price_rent})
                        </label>
                        <div className="grid grid-cols-5 gap-2">
                          {Array.from(new Set([qtyModalProduct.price_rent, 5, 10, 15, 20])).filter(Boolean).sort((a,b)=>a-b).map(pVal => (
                            <button
                              key={pVal}
                              type="button"
                              className={`py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                scaffoldPriceOverride === pVal ? 'bg-amber-100 border-[#9B1313] text-[#38000A] font-black scale-105' : 'bg-white text-gray-650'
                              }`}
                              onClick={() => setScaffoldPriceOverride(pVal)}
                            >
                              ฿{pVal}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}



              {/* Live Preview calculation banner */}
              {(() => {
                const isScafGroup = qtyModalProduct.category === 'นั่งร้าน' || qtyModalProduct.category === 'ขาปรับ' || qtyModalProduct.category === 'นั่งร้าน/อุปกรณ์' || qtyModalProduct.category === 'นั่งร้านและอุปกรณ์';
                if (!isScafGroup) return null;

                const unitPrice = qtyLineMode === 'rent' ? scaffoldPriceOverride : qtyModalProduct.price_sale;
                const quantity = qtyVal;
                const currentRentalMode = qtyLineMode === 'rent' ? 'day' : 'sale';

                const tempItem = {
                  category: qtyModalProduct.category,
                  price: unitPrice,
                  qty: quantity,
                  line_mode: qtyLineMode,
                  rental_mode: currentRentalMode,
                  rent_days: currentRentalMode === 'day' ? roundsVal : 1,
                  rounds: 1
                };

                const lineTotal = calculateRentalLineTotal(tempItem);

                return (
                  <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 text-[#38000A] rounded-2xl flex justify-between items-center text-xs">
                    <div className="space-y-0.5">
                      <span className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider">พรีวิวรวมเฉพาะรายการนี้</span>
                      <div className="font-extrabold text-[#38000A]">
                        {qtyLineMode === 'rent' ? (
                          <>
                            {unitPrice.toLocaleString()} บ. × {quantity} {qtyModalProduct.unit} × {roundsVal} {currentRentalMode === 'day' ? 'วัน' : 'รอบ'}
                          </>
                        ) : (
                          <>
                            {unitPrice.toLocaleString()} บ. × {quantity} {qtyModalProduct.unit}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="block text-[10px] text-gray-500 font-bold">ราคารวม (Line Total)</span>
                      <span className="text-base font-black text-[#CD1C18]">฿{lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setQtyModalProduct(null)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-250 text-gray-700 font-bold rounded-xl text-xs transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmQtyModal}
                className="flex-1 py-2.5 bg-[#CD1C18] hover:bg-red-800 text-white font-bold rounded-xl text-xs transition-colors shadow-sm"
              >
                เพิ่มลงตะกร้าวัสดุ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Side-by-Side Modal */}
      {isPaying && (
        <div className="fixed inset-0 bg-[#38000A]/55 backdrop-blur-sm flex items-stretch justify-stretch z-50 p-0 md:p-2">
          <div className="bg-white w-[100dvw] h-[100dvh] md:w-[calc(100dvw-16px)] md:h-[calc(100dvh-16px)] max-w-none max-h-none md:rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="border-b border-gray-100 px-4 sm:px-6 py-3 flex justify-between items-center no-print shrink-0">
              <div>
                <h3 className="text-lg font-extrabold text-[#38000A]">ตรวจสอบชำระเงินและพรีวิวบิล</h3>
                <p className="text-xs text-gray-500 mt-1">คลังและสเตทเม้นท์จะอัปเดตแบบเรียลไทม์หลังบันทึก</p>
              </div>
              <button onClick={() => setIsPaying(false)} className="text-gray-400 hover:text-gray-600 text-2xl font-bold">×</button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 flex flex-col xl:flex-row gap-3 sm:gap-4 bg-[#F8FAFC]">
              {/* Receipt Visual Paper (A4/A5 Size layout emulator) */}
              <div className="w-full xl:flex-[1.65] min-w-0 bg-gradient-to-br from-slate-100 via-slate-50 to-white border border-gray-200 rounded-2xl p-3 flex flex-col items-center shadow-inner overflow-visible">
                <div className="shrink-0 flex flex-wrap gap-2 mb-3 w-full justify-start no-print">
                  <button 
                    onClick={() => setActivePaper('A4')}
                    className={`min-h-[36px] px-4 py-2 rounded-xl text-xs font-black transition-all ${
                      activePaper === 'A4' ? 'bg-[#9B1313] text-white shadow-sm' : 'bg-white text-gray-650'
                    }`}
                  >
                    บิลขนาด A4
                  </button>
                  <button 
                    onClick={() => setActivePaper('A5')}
                    className={`min-h-[36px] px-4 py-2 rounded-xl text-xs font-black transition-all ${
                      activePaper === 'A5' ? 'bg-[#9B1313] text-white shadow-sm' : 'bg-white text-gray-650'
                    }`}
                  >
                    บิลย่อส่วน A5
                  </button>
                  
                  <span className="hidden sm:inline text-gray-300">|</span>
                  <span className="inline-flex items-center rounded-full bg-white border border-slate-200 px-3 py-1.5 text-[11px] font-black text-slate-600 shadow-xs">
                    พรีวิวสมจริง: {activePaper}
                  </span>

                  <div className="ml-auto flex flex-wrap gap-2">
                    <button
                      onClick={() => setIsReceiptPreviewImageOpen(true)}
                      className="inline-flex items-center gap-1.5 min-h-[36px] px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-black rounded-xl text-xs shadow-sm transition-all cursor-pointer"
                    >
                      <Eye size={13} /> ดูรูปพรีวิว
                    </button>
                    <button
                      onClick={handlePrintReceiptPreview}
                      className="inline-flex items-center gap-1.5 min-h-[36px] px-4 py-2 bg-sky-650 hover:bg-sky-750 text-white font-black rounded-xl text-xs shadow-sm transition-all cursor-pointer"
                    >
                      <Printer size={13} /> สั่งพิมพ์บิล
                    </button>
                    <button
                      onClick={handleSaveReceiptImage}
                      className="inline-flex items-center gap-1.5 min-h-[36px] px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs shadow-sm transition-all cursor-pointer"
                    >
                      <Download size={13} /> บันทึกภาพบิล
                    </button>
                  </div>
                </div>

                {(() => {
                  const previewReceiptPayload = buildLiveReceiptPreviewPayload();
                  const shopSettings = JirakitDB.getSettings();
                  const generatedHtml = getReceiptPrintHtml(previewReceiptPayload, activePaper === 'A4', {
                    ...shopSettings,
                    RECEIPT_PAPER_SIZE: activePaper
                  }, copyType);

                  const frameW = activePaper === 'A4' ? 840 : 610;
                  const frameH = activePaper === 'A4' ? 1168 : 830;
                  // Full-page preview: show the whole paper, not only the top part.
                  // iPad Air 11 portrait works best around 0.54 for A4.
                  const frameScale = activePaper === 'A4' ? 0.54 : 0.76;
                  const shellW = Math.round(frameW * frameScale);
                  const shellH = Math.round(frameH * frameScale);

                  return (
                    <div className="w-full flex justify-center overflow-x-auto overflow-y-visible rounded-2xl bg-[#CBD5E1]/70 border border-slate-200 p-4 shadow-inner">
                      <div
                        key={`${activePaper}-${copyType}-receipt-helper-preview`}
                        className="bg-white overflow-hidden shadow-2xl ring-1 ring-black/10 shrink-0"
                        style={{
                          width: `${shellW}px`,
                          height: `${shellH}px`,
                          position: 'relative',
                          borderRadius: activePaper === 'A4' ? '6px' : '5px'
                        }}
                      >
                        <iframe
                          srcDoc={generatedHtml}
                          title="POS Live Receipt Preview From receiptHelper"
                          className="border-0 bg-white"
                          scrolling="no"
                          style={{
                            width: `${frameW}px`,
                            height: `${frameH}px`,
                            transform: `scale(${frameScale})`,
                            transformOrigin: 'top left',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            pointerEvents: 'none'
                          }}
                        />
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Payment Settings Controller Inputs */}
              <div className="w-full xl:w-[420px] shrink-0 bg-white border border-gray-200 rounded-2xl p-4 space-y-4 shadow-sm">
                <h4 className="font-extrabold text-sm text-[#38000A] sticky top-0 bg-white/95 backdrop-blur py-1 z-10">ตั้งค่าบัญชีทรัพย์การรับเงิน</h4>

                <div className="space-y-4">
                  {/* Cash Receipt option */}
                  <div className="bg-gray-50 p-4 border rounded-xl space-y-3 shadow-xs">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={cashOn} 
                        onChange={e => {
                          setCashOn(e.target.checked);
                          if(e.target.checked) setCashAmount(currentCalcs.grand - (transferOn ? transferAmount : 0));
                          else setCashAmount(0);
                        }} 
                      />
                      <span className="text-xs font-extrabold text-gray-800">ชำระด้วยเงินสด</span>
                    </label>
                    {cashOn && (
                      <input
                        type="number"
                        className="w-full text-right h-10 bg-white border border-gray-200 rounded-xl px-3 font-extrabold text-red-900 focus:outline-none"
                        value={cashAmount || ''}
                        onChange={e => {
                          const val = Number(e.target.value);
                          setCashAmount(val);
                        }}
                      />
                    )}
                  </div>

                  {/* Transfer Receipt option */}
                  <div className="bg-gray-50 p-4 border rounded-xl space-y-3 shadow-xs">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={transferOn} 
                        onChange={e => {
                          setTransferOn(e.target.checked);
                          if(e.target.checked) setTransferAmount(currentCalcs.grand - (cashOn ? cashAmount : 0));
                          else setTransferAmount(0);
                        }} 
                      />
                      <span className="text-xs font-extrabold text-gray-800">โอนเงินด้วยระบบคิวอาร์ (PromptPay)</span>
                    </label>
                    {transferOn && (
                      <>
                        <input
                          type="number"
                          className="w-full text-right h-10 bg-white border border-gray-200 rounded-xl px-3 font-extrabold text-red-900 focus:outline-none"
                          value={transferAmount || ''}
                          onChange={e => {
                            const val = Number(e.target.value);
                            setTransferAmount(val);
                          }}
                        />
                        <div className="flex flex-col items-center p-3 bg-white rounded-lg border">
                          <img 
                            src={JirakitDB.getSettings().BANK_QR_URL} 
                            alt="Promptpay" 
                            className="w-32 h-32 object-contain" 
                          />
                          <p className="text-[10px] text-gray-400 mt-2">สแกนจ่ายเงิน ฿{transferAmount.toLocaleString()}</p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Debt Unpaid options */}
                  <div className="bg-gray-50 p-4 border rounded-xl flex items-center justify-between shadow-xs">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={debtOn} onChange={e => setDebtOn(e.target.checked)} />
                      <span className="text-xs font-extrabold text-gray-800">เปิดยอดค้างชำระ (อนุญาตให้ติดหนี้)</span>
                    </label>
                  </div>

                  <div className="p-3 bg-red-50/100 border border-red-100 rounded-xl space-y-1.5 text-xs font-semibold text-gray-700">
                    <div className="flex justify-between">
                      <span>ยอดที่ต้องจ่าย:</span>
                      <span>฿{currentCalcs.grand.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>ยอดจ่ายรวม:</span>
                      <span>฿{((cashOn ? cashAmount : 0) + (transferOn ? transferAmount : 0)).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-red-950 font-black">
                      <span>ยอดค้างลงทะเบียนหนี้สิน:</span>
                      <span>฿{Math.max(0, currentCalcs.grand - (cashOn ? cashAmount : 0) - (transferOn ? transferAmount : 0)).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-emerald-800 font-black">
                      <span>เงินทอนลูกค้า:</span>
                      <span>฿{Math.max(0, (cashOn ? cashAmount : 0) + (transferOn ? transferAmount : 0) - currentCalcs.grand).toLocaleString()}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">หมายเหตุเอกสารท้ายบิล</label>
                    <input
                      type="text"
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs"
                      placeholder="เช่น ขนส่งเสร็จแล้ว ตรวจนับครบชิ้น"
                      value={note}
                      onChange={e => setNote(e.target.value)}
                    />
                  </div>

                  <button
                    onClick={handleConfirmOrder}
                    className="w-full py-3 bg-[#CD1C18] hover:bg-black/95 text-white font-extrabold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle size={15} /> บันทึกปิดบิลและตัดคลังทันที
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isPaying && isReceiptPreviewImageOpen && (() => {
        const previewReceiptPayload = buildLiveReceiptPreviewPayload();
        const shopSettings = JirakitDB.getSettings();
        const generatedHtml = getReceiptPrintHtml(previewReceiptPayload, activePaper === 'A4', {
          ...shopSettings,
          RECEIPT_PAPER_SIZE: activePaper
        }, copyType);

        const frameW = activePaper === 'A4' ? 840 : 610;
        const frameH = activePaper === 'A4' ? 1168 : 830;
        // Full preview viewer scale: bigger than inline preview but still fits iPad Air 11-inch portrait.
        const frameScale = activePaper === 'A4' ? 0.78 : 1.05;
        const shellW = Math.round(frameW * frameScale);
        const shellH = Math.round(frameH * frameScale);

        return (
          <div className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-md flex flex-col">
            <div className="shrink-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm sm:text-base font-black text-[#38000A]">ดูรูปพรีวิวใบเสร็จเต็มหน้า</h3>
                <p className="text-[11px] text-slate-500 font-bold">โหมด: {activePaper} / ใช้รูปแบบเดียวกับบันทึกภาพ PDF และพิมพ์</p>
              </div>
              <button
                type="button"
                onClick={() => setIsReceiptPreviewImageOpen(false)}
                className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-700 text-2xl font-black flex items-center justify-center"
                aria-label="ปิดหน้าดูพรีวิว"
              >
                ×
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-auto bg-[#CBD5E1] p-4">
              <div className="w-full min-h-full flex items-start justify-center">
                <div
                  className="bg-white overflow-hidden shadow-2xl ring-1 ring-black/15 shrink-0"
                  style={{
                    width: `${shellW}px`,
                    height: `${shellH}px`,
                    maxWidth: '100%',
                    position: 'relative',
                    borderRadius: activePaper === 'A4' ? '6px' : '5px'
                  }}
                >
                  <iframe
                    srcDoc={generatedHtml}
                    title="Receipt Full Preview Image Viewer"
                    className="border-0 bg-white"
                    scrolling="no"
                    style={{
                      width: `${frameW}px`,
                      height: `${frameH}px`,
                      transform: `scale(${frameScale})`,
                      transformOrigin: 'top left',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      pointerEvents: 'none'
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="shrink-0 bg-white border-t border-slate-200 p-3 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={handlePrintReceiptPreview}
                className="min-h-[42px] px-5 py-2 bg-sky-650 hover:bg-sky-750 text-white font-black rounded-xl text-xs shadow-sm flex items-center gap-1.5"
              >
                <Printer size={14} /> สั่งพิมพ์ {activePaper}
              </button>
              <button
                type="button"
                onClick={handleSaveReceiptImage}
                className="min-h-[42px] px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs shadow-sm flex items-center gap-1.5"
              >
                <Download size={14} /> บันทึกภาพ {activePaper}
              </button>
              <button
                type="button"
                onClick={() => setIsReceiptPreviewImageOpen(false)}
                className="min-h-[42px] px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-xl text-xs shadow-sm"
              >
                กลับหน้าชำระเงิน
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
