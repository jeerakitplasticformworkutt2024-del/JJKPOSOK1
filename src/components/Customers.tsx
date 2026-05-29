/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { JirakitDB } from '../db';
import { Customer } from '../types';
import { Search, UserPlus, Phone, ShieldCheck, MapPin, Eye, FileText, CheckCircle, TrendingUp, AlertTriangle, CreditCard, X } from 'lucide-react';
import SignaturePad from './SignaturePad';

interface CustomersProps {
  refreshCount: number;
  triggerRefresh: () => void;
}

// Thai address hierarchical suggestions dataset
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

  // Phrae (แพร่)
  { subdistrict: "ในเมือง", district: "เมืองแพร่", province: "แพร่", zipcode: "54000" },
  { subdistrict: "ร่องฟอง", district: "เมืองแพร่", province: "แพร่", zipcode: "54000" },
  { subdistrict: "สูงเม่น", district: "สูงเม่น", province: "แพร่", zipcode: "54130" },
  { subdistrict: "เด่นชัย", district: "เด่นชัย", province: "แพร่", zipcode: "54110" },

  // Nan (น่าน)
  { subdistrict: "ในเมือง", district: "เมืองน่าน", province: "น่าน", zipcode: "55000" },
  { subdistrict: "ฝายแก้ว", district: "ภูเพียง", province: "น่าน", zipcode: "55000" },
  { subdistrict: "ปัว", district: "ปัว", province: "น่าน", zipcode: "55120" },

  // Chiang Mai (เชียงใหม่)
  { subdistrict: "ศรีภูมิ", district: "เมืองเชียงใหม่", province: "เชียงใหม่", zipcode: "50200" },
  { subdistrict: "สุเทพ", district: "เมืองเชียงใหม่", province: "เชียงใหม่", zipcode: "50200" },
  { subdistrict: "ช้างคลาน", district: "เมืองเชียงใหม่", province: "เชียงใหม่", zipcode: "50100" },

  // Bangkok (กรุงเทพมหานคร)
  { subdistrict: "พระบรมมหาราชวัง", district: "พระนคร", province: "กรุงเทพมหานคร", zipcode: "10200" },
  { subdistrict: "ดินแดง", district: "ดินแดง", province: "กรุงเทพมหานคร", zipcode: "10400" },
  { subdistrict: "ทุ่งมหาเมฆ", district: "สาทร", province: "กรุงเทพมหานคร", zipcode: "10120" },
];

// Presets for Card Scanning & Smart Card Connection Simulations
const SIMULATED_CARDS = [
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
    pdpaConsent: true,
    cardColor: "from-blue-200 to-sky-100",
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
      <rect x="330" y="80" width="85" height="110" rx="4" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1" />
      <circle cx="372.5" cy="115" r="20" fill="#3b82f6" />
      <path d="M342.5 170 c0 -12 15 -20 30 -20 s30 8 30 20" fill="#1e3a8a" />
    </svg>`,
    signatureUrl: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='100'><path d='M10 50 Q 50 10, 100 50 T 200 50 T 290 30' fill='none' stroke='%231e293b' stroke-width='4'/></svg>"
  },
  {
    name: "นางสาวพัชรี สว่างธรรม",
    phone: "089-456-7812",
    idNo: "3530300194881",
    addressNo: "45",
    moo: "3",
    subdistrict: "แม่พูล",
    amphoe: "ลับแล",
    province: "อุตรดิตถ์",
    postalCode: "53130",
    worksite: "โครงการก่อสร้างศูนย์รวมสินค้าเกษตรและโอทอปลับแล",
    pdpaConsent: true,
    cardColor: "from-amber-200 to-amber-50",
    idCardSvg: `<svg viewBox="0 0 450 280" class="w-full h-full rounded-2xl shadow-xl overflow-hidden border border-yellow-200" style="background:#fffdf5;">
      <rect width="100%" height="100%" fill="none" />
      <rect width="100%" height="32" fill="#d97706" />
      <text x="12" y="20" fill="#ffffff" font-family="sans-serif" font-size="10" font-weight="extrabold">บัตรประจำตัวประชาชน (Thai National ID Card)</text>
      <rect x="25" y="52" width="34" height="24" rx="3" fill="#fbbf24" stroke="#d97706" stroke-width="1.5" />
      <text x="80" y="65" fill="#1e3a8a" font-family="monospace" font-size="14" font-weight="950">3 5303 00194 88 1</text>
      <text x="80" y="85" fill="#b45309" font-family="sans-serif" font-size="9" font-weight="bold">ชื่อ: นางสาวพัชรี สว่างธรรม</text>
      <text x="80" y="98" fill="#475569" font-family="sans-serif" font-size="8">Name: Miss Patcharee Sawangtham</text>
      <text x="80" y="115" fill="#b45309" font-family="sans-serif" font-size="8" font-weight="bold">เกิดวันที่: 24 พ.ย. 2529</text>
      <text x="25" y="150" fill="#0f172a" font-family="sans-serif" font-size="8.5" font-weight="bold">ที่อยู่: 45 หมู่ที่ 3 ต.แม่พูล อ.ลับแล จ.อุตรดิตถ์ 53130</text>
      <text x="25" y="185" fill="#15803d" font-family="sans-serif" font-size="8" font-weight="black">✓ คุ้มครองความยินยอม PDPA ครบถ้วน</text>
      <rect x="330" y="80" width="85" height="110" rx="4" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1" />
      <circle cx="372.5" cy="115" r="20" fill="#ec4899" />
      <path d="M342.5 170 c0 -12 15 -20 30 -20 s30 8 30 20" fill="#831843" />
    </svg>`,
    signatureUrl: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='100'><path d='M20 60 C 50 15, 80 85, 120 40 S 200 80, 280 40' fill='none' stroke='%23047857' stroke-width='4.5'/></svg>"
  },
  {
    name: "นายธนาคาร ชุมชนไทย",
    phone: "086-123-4567",
    idNo: "1530400112239",
    addressNo: "88/1",
    moo: "2",
    subdistrict: "บ้านแก่ง",
    amphoe: "ตรอน",
    province: "อุตรดิตถ์",
    postalCode: "53140",
    worksite: "สำนักงานก่อสร้างแคมป์คนงาน ตรอน-อุตรดิตถ์",
    pdpaConsent: true,
    cardColor: "from-emerald-200 to-green-50",
    idCardSvg: `<svg viewBox="0 0 450 280" class="w-full h-full rounded-2xl shadow-xl overflow-hidden border border-emerald-200" style="background:#f6fdfa;">
      <rect width="100%" height="100%" fill="none" />
      <rect width="100%" height="32" fill="#047857" />
      <text x="12" y="20" fill="#ffffff" font-family="sans-serif" font-size="10" font-weight="extrabold">บัตรประจำตัวประชาชน (Thai National ID Card)</text>
      <rect x="25" y="52" width="34" height="24" rx="3" fill="#fbbf24" stroke="#d97706" stroke-width="1.5" />
      <text x="80" y="65" fill="#1e3a8a" font-family="monospace" font-size="14" font-weight="950">1 5304 00112 23 9</text>
      <text x="80" y="85" fill="#047857" font-family="sans-serif" font-size="9" font-weight="bold">ชื่อ: นายธนาคาร ชุมชนไทย</text>
      <text x="80" y="98" fill="#475569" font-family="sans-serif" font-size="8">Name: Mr. Thanakan Chumchontai</text>
      <text x="80" y="115" fill="#047857" font-family="sans-serif" font-size="8" font-weight="bold">เกิดวันที่: 05 มี.ค. 2531</text>
      <text x="25" y="150" fill="#0f172a" font-family="sans-serif" font-size="8.5" font-weight="bold">ที่อยู่: 88/1 หมู่ที่ 2 ต.บ้านแก่ง อ.ตรอน จ.อุตรดิตถ์ 53140</text>
      <text x="25" y="185" fill="#15803d" font-family="sans-serif" font-size="8" font-weight="black">✓ คุ้มครองความยินยอม PDPA ครบถ้วน</text>
      <rect x="330" y="80" width="85" height="110" rx="4" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1" />
      <circle cx="372.5" cy="115" r="20" fill="#059669" />
      <path d="M342.5 170 c0 -12 15 -20 30 -20 s30 8 30 20" fill="#064e3b" />
    </svg>`,
    signatureUrl: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='100'><path d='M10 20 L 80 80 Q 150 10, 200 60 T 290 40' fill='none' stroke='%230284c7' stroke-width='4'/></svg>"
  }
];

export const formatThaiPhone = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
};

export const formatThaiIDCard = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 1) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 1)}-${digits.slice(1)}`;
  if (digits.length <= 10) return `${digits.slice(0, 1)}-${digits.slice(1, 5)}-${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 1)}-${digits.slice(1, 5)}-${digits.slice(5, 10)}-${digits.slice(10)}`;
  return `${digits.slice(0, 1)}-${digits.slice(1, 5)}-${digits.slice(5, 10)}-${digits.slice(10, 12)}-${digits.slice(12, 13)}`;
};

export default function Customers({ refreshCount, triggerRefresh }: CustomersProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [presetIndexCounter, setPresetIndexCounter] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedProfileCustomer, setSelectedProfileCustomer] = useState<Customer | null>(null);

  // Form Fields
  const [cName, setCName] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [cAddress, setCAddress] = useState('');
  const [cWorksite, setCWorksite] = useState('');
  const [cIdNo, setCIdNo] = useState('');
  const [cProvince, setCProvince] = useState('อุตรดิตถ์');
  const [cArea, setCArea] = useState('');
  const [cPdpa, setCPdpa] = useState(false);
  const [cSignature, setCSignature] = useState('');

  // Detailed address fields splits for Thai addressing autocompletion
  const [cAddressNo, setCAddressNo] = useState('');
  const [cMoo, setCMoo] = useState('');
  const [cSubdistrict, setCSubdistrict] = useState('');
  const [cAmphoe, setCAmphoe] = useState('');
  const [cPostalCode, setCPostalCode] = useState('');
  
  // Suggestion list displays
  const [subdistrictSearch, setSubdistrictSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Simulated Hardware connection flows (Smart Card Connection / OCR scan)
  const [readerType, setReaderType] = useState<'smart_card' | 'ocr' | null>(null);
  const [readerConnecting, setReaderConnecting] = useState(false);
  const [readerProgress, setReaderProgress] = useState(0);
  const [readerStatusText, setReaderStatusText] = useState('');

  // ID card image mock state
  const [idCardFile, setIdCardFile] = useState<string>('');
  const [loadingImg, setLoadingImg] = useState(false);

  useEffect(() => {
    setCustomers(JirakitDB.getCustomers().filter(c => c.customer_status === 'Active'));
  }, [refreshCount]);

  // Handle automatic composition of combined raw text cAddress whenever children change
  useEffect(() => {
    if (editingCustomer) {
      const parts = [];
      if (cAddressNo) parts.push(`บ้านเลขที่ ${cAddressNo}`);
      if (cMoo) parts.push(`หมู่ที่ ${cMoo}`);
      if (cSubdistrict) parts.push(`ต.${cSubdistrict}`);
      if (cAmphoe) parts.push(`อ.${cAmphoe}`);
      if (cProvince) parts.push(`จ.${cProvince}`);
      if (cPostalCode) parts.push(cPostalCode);
      
      const combined = parts.join(' ');
      setCAddress(combined);
      setCArea(cAmphoe ? `อ.${cAmphoe}` : '');
    }
  }, [cAddressNo, cMoo, cSubdistrict, cAmphoe, cProvince, cPostalCode, editingCustomer]);

  const filtered = customers.filter(c => {
    const q = searchQuery.toLowerCase();
    return c.customer_name.toLowerCase().includes(q) ||
           c.phone.includes(q) ||
           (c.id_card_no && c.id_card_no.includes(q));
  });

  // Smart Parser for existing database records to split inputs correctly
  const parseThaiAddress = (str: string) => {
    const res = {
      addressNo: '',
      moo: '',
      subdistrict: '',
      amphoe: '',
      province: 'อุตรดิตถ์',
      postalCode: ''
    };
    if (!str) return res;

    // Extract raw zipcode (5 digits at the end preferably)
    const zipMatch = str.match(/(\d{5})$/);
    if (zipMatch) {
      res.postalCode = zipMatch[1];
      str = str.substring(0, zipMatch.index).trim();
    }

    // Extract Province prefix
    const provMatch = str.match(/(?:จ\.|จังหวัด)\s*([^\s]+)/);
    if (provMatch) {
      res.province = provMatch[1].replace(/,+/g, '').trim();
      str = str.replace(provMatch[0], '').trim();
    }

    // Extract District prefix
    const ampMatch = str.match(/(?:อ\.|อำเภอ|เขต)\s*([^\s]+)/);
    if (ampMatch) {
      res.amphoe = ampMatch[1].replace(/,+/g, '').trim();
      str = str.replace(ampMatch[0], '').trim();
    }

    // Extract Sub-district prefix
    const subMatch = str.match(/(?:ต\.|ตำบล|แขวง)\s*([^\s]+)/);
    if (subMatch) {
      res.subdistrict = subMatch[1].replace(/,+/g, '').trim();
      str = str.replace(subMatch[0], '').trim();
    }

    // Extract Moo prefix
    const mooMatch = str.match(/(?:ม\.|หมู่ที่|หมู่)\s*(\d+)/);
    if (mooMatch) {
      res.moo = mooMatch[1].trim();
      str = str.replace(mooMatch[0], '').trim();
    }

    // Rest is house addressNo details
    res.addressNo = str.replace(/^(?:บ้านเลขที่)\s*/, '').replace(/^[,\s\t]+|[,\s\t]+$/g, '').trim();
    return res;
  };

  const handleOpenForm = (c?: Customer) => {
    if (c) {
      setEditingCustomer(c);
      setCName(c.customer_name);
      setCPhone(formatThaiPhone(c.phone || ''));
      setCAddress(c.registered_address || c.address);
      setCWorksite(c.current_worksite || c.delivery_location);
      setCIdNo(formatThaiIDCard(c.id_card_no || ''));
      setCProvince(c.id_card_province || 'อุตรดิตถ์');
      setCArea(c.id_card_area || '');
      setCPdpa(c.pdpa_consent || false);
      setCSignature(c.customer_signature || '');
      setIdCardFile(c.id_card_image_url || '');

      // Parse the composite address to populate form fields
      const parsed = parseThaiAddress(c.registered_address || c.address || '');
      setCAddressNo(parsed.addressNo);
      setCMoo(parsed.moo);
      setCSubdistrict(parsed.subdistrict);
      setCAmphoe(parsed.amphoe);
      setCProvince(parsed.province || 'อุตรดิตถ์');
      setCPostalCode(parsed.postalCode);
      setSubdistrictSearch(parsed.subdistrict);
    } else {
      setEditingCustomer({
        customer_id: '',
        customer_name: '',
        customer_type: 'ลูกค้าทั่วไป',
        phone: '',
        address: '',
        delivery_location: '',
        tax_id: '',
        credit_limit: 0,
        total_debt: 0,
        customer_status: 'Active',
        note: '',
        created_at: '',
        updated_at: '',
        id_card_no: '',
        registered_address: '',
        current_worksite: '',
        id_card_area: '',
        id_card_province: 'อุตรดิตถ์',
        id_card_image_name: '',
        id_card_image_url: ''
      });
      setCName('');
      setCPhone('');
      setCAddress('');
      setCWorksite('');
      setCIdNo('');
      setCProvince('อุตรดิตถ์');
      setCArea('');
      setCPdpa(false);
      setCSignature('');
      setIdCardFile('');

      // Clear splits
      setCAddressNo('');
      setCMoo('');
      setCSubdistrict('');
      setCAmphoe('');
      setCPostalCode('');
      setSubdistrictSearch('');
    }
  };

  // Run mock scanner / Smart Card physical insertion sequence
  const startCardReaderSimulation = (type: 'smart_card' | 'ocr', presetIndex: number) => {
    setReaderType(type);
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
          // Fill form elements
          const preset = SIMULATED_CARDS[presetIndex];
          setCName(preset.name);
          setCPhone(formatThaiPhone(preset.phone));
          setCIdNo(formatThaiIDCard(preset.idNo));
          setCAddressNo(preset.addressNo);
          setCMoo(preset.moo);
          setCSubdistrict(preset.subdistrict);
          setCAmphoe(preset.amphoe);
          setCProvince(preset.province);
          setCPostalCode(preset.postalCode);
          setSubdistrictSearch(preset.subdistrict);
          setCWorksite(preset.worksite);
          setCPdpa(true);
          setCSignature(preset.signatureUrl);
          
          // Generate a data URL of the SVG visual ID card to display
          const svgBase64 = `data:image/svg+xml;utf8,${encodeURIComponent(preset.idCardSvg)}`;
          setIdCardFile(svgBase64);

          setReaderConnecting(false);
          setReaderType(null);
        }, 400);
      }
    }, 450);
  };

  const handleIdCardUploadFake = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoadingImg(true);
    const reader = new FileReader();
    reader.onload = () => {
      setIdCardFile(reader.result as string);
      setLoadingImg(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cName.trim()) return;

    if (idCardFile && !cPdpa) {
      alert('กรณีสแกนเก็บรูปบัตรประชาชน ลูกค้าต้องยินยอมในช่องกฎหมายความยินยอมคุ้มครอง PDPA');
      return;
    }

    const payload: Partial<Customer> = {
      customer_name: cName,
      phone: cPhone,
      address: cAddress,
      registered_address: cAddress,
      delivery_location: cWorksite,
      current_worksite: cWorksite,
      id_card_no: cIdNo,
      id_card_province: cProvince,
      id_card_area: cArea,
      pdpa_consent: cPdpa,
      customer_signature: cSignature,
      id_card_image_url: idCardFile,
      id_card_image_name: idCardFile ? (editingCustomer?.id_card_image_name || `IDCARD_${cName}.png`) : '',
      id_card_read_status: idCardFile ? 'ตรวจสอบข้อมูลบัตรและพิกัดแล้วโดยผู้ส่งมอบเครื่องมือ' : ''
    };

    if (editingCustomer && editingCustomer.customer_id) {
      payload.customer_id = editingCustomer.customer_id;
    }

    try {
      JirakitDB.saveCustomer(payload);
      alert('บันทึกข้อมูลและเซ็นยินยอม PDPA เสร็จสิ้น!');
      setEditingCustomer(null);
      setCustomers(JirakitDB.getCustomers().filter(c => c.customer_status === 'Active'));
      triggerRefresh();
    } catch (err: any) {
      alert(`ไม่สามารถบันทึกได้: ${err?.message || err}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-red-100 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-50 pb-4">
          <div>
            <h2 className="text-xl font-extrabold text-[#38000A]">รายชื่อลูกค้าและสัญญาเช่ากู้ยืม</h2>
            <p className="text-xs text-gray-500 mt-1">จัดเก็บพิกัดหน้างาน ดึงลายเซ็นลูกค้า และเซฟภาพบัตรประชาชน</p>
          </div>
          <button
            onClick={() => handleOpenForm()}
            className="h-11 bg-[#CD1C18] hover:bg-red-800 text-white font-extrabold px-5 rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <UserPlus size={14} /> เพิ่มรายชื่อลูกค้าประจำ
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 text-red-950" size={16} />
          <input
            type="text"
            className="w-full bg-[#FFFBF9] border border-red-50 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-[#9B1313]"
            placeholder="ค้นหาลูกค้าตาม ชื่อ เบอร์โทร เลขประจําตัวผู้เสียภาษี หรือเลขบัตร..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Customer Cards Grid view */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-400 font-bold border border-dashed border-gray-100 rounded-2xl">
              <p>ไม่พบข้อมูลลูกค้า</p>
            </div>
          ) : (
            filtered.map(c => (
              <div 
                key={c.customer_id} 
                className="bg-white border border-gray-100 hover:border-red-200 p-5 rounded-2xl shadow-sm hover:scale-[1.01] transition-all flex flex-col justify-between text-xs font-semibold text-gray-600"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <h4 className="text-sm font-extrabold text-gray-900">{c.customer_name}</h4>
                    <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded font-mono uppercase">{c.customer_id}</span>
                  </div>

                  <p className="flex items-center gap-1.5 text-gray-700">
                    <Phone className="text-[#9B1313]" size={13} /> {c.phone || 'ไม่มีเบอร์โทร'}
                  </p>

                  <p className="flex items-start gap-1.5 font-medium text-gray-500 line-clamp-2">
                    <MapPin className="text-[#9B1313] shrink-0 mt-0.5" size={13} />
                    ที่อยู่: {c.address || c.registered_address || '-'}
                  </p>

                  <p className="text-[11px] text-gray-500 font-bold bg-[#FFFBF9] p-2.5 rounded-lg border border-red-50">
                    จุดส่งของ/หน้างาน: <span className="text-gray-800 font-extrabold">{c.current_worksite || c.delivery_location || 'ไม่ระบุพิกัดชัดเจน'}</span>
                  </p>

                  <div className="flex items-center gap-1">
                    {c.pdpa_consent ? (
                      <span className="flex items-center gap-1 text-emerald-700 font-bold text-[10px] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                        <ShieldCheck size={11} /> คุ้มครองด้วย PDPA
                      </span>
                    ) : (
                      <span className="text-amber-700 font-bold text-[10px] bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                        ⚠ ยังไม่สแกนสิทธิ PDPA
                      </span>
                    )}

                    {c.id_card_image_url && (
                      <span className="flex items-center gap-1 text-[#9B1313] font-bold text-[10px] bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100 ml-auto">
                        <FileText size={11} /> มีสแกนบัตรไว้
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t border-gray-50 text-[11px] font-bold mt-4">
                  <button
                    onClick={() => handleOpenForm(c)}
                    className="flex-1 py-2 bg-gradient-to-r from-red-950 to-red-900 text-white font-extrabold rounded-xl text-center tracking-wide"
                  >
                    ระบุผู้เช่า / อัปเดตข้อมูล
                  </button>
                  <button
                    onClick={() => setSelectedProfileCustomer(c)}
                    className="py-2 px-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 flex items-center justify-center shrink-0"
                    title="ดูประวัติหนี้สิน & วิเคราะห์ความเสี่ยงเครดิต"
                  >
                    <TrendingUp size={13} />
                  </button>
                  {c.id_card_image_url && (
                    <a
                      href={c.id_card_image_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2 px-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-600 flex items-center justify-center border shrink-0"
                      title="ดูสแกนรูปบัตรประชาชน"
                    >
                      <Eye size={13} />
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Editor Drawer Popup Form */}
      {editingCustomer !== null && (
        <div className="fixed inset-0 bg-[#38000A]/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-[#7F1D1D] px-6 py-4 text-white flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <div>
                <h3 className="text-md font-bold flex items-center gap-1.5">
                  <UserPlus size={16} />
                  {editingCustomer.customer_id ? `อัปเดตข้อมูลลูกค้า #${editingCustomer.customer_id}` : 'ลงทะเบียนลูกค้าประจำใหม่'}
                </h3>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    const nextIdx = presetIndexCounter % SIMULATED_CARDS.length;
                    setPresetIndexCounter(prev => prev + 1);
                    startCardReaderSimulation('ocr', nextIdx);
                  }}
                  className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 transition-all shadow-sm cursor-pointer"
                  title="ถ่ายรูปวิเคราะห์ดึงข้อมูลอัตโนมัติ"
                >
                  📸 ปุ่มถ่ายรูป
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const nextIdx = presetIndexCounter % SIMULATED_CARDS.length;
                    setPresetIndexCounter(prev => prev + 1);
                    startCardReaderSimulation('smart_card', nextIdx);
                  }}
                  className="px-2.5 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase flex items-center gap-1 transition-all shadow-sm cursor-pointer"
                  title="เสียบชิปการ์ดอัจฉริยะอัตโนมัติ"
                >
                  💳 (Smart Card) ปุ่มเสียบการ์ด
                </button>
                <button onClick={() => setEditingCustomer(null)} className="text-white hover:text-red-200 text-2xl font-bold ml-2 leading-none" type="button">×</button>
              </div>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs font-semibold text-gray-700">
              {readerConnecting && (
                <div className="bg-[#FFFBF9] border-2 border-dashed border-[#CD1C18] rounded-2xl p-4 text-center space-y-3 shadow-inner my-2 animate-pulse">
                  <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#9B1313] border-t-transparent"></div>
                  </div>
                  <p className="text-xs font-extrabold text-[#7F1D1D] tracking-wide">{readerStatusText}</p>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div className="bg-[#9B1313] h-2.5 rounded-full transition-all duration-300" style={{ width: `${readerProgress}%` }}></div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">ความคืบหน้าระบบประมวลผล {readerProgress}%</span>
                </div>
              )}

              <div>
                <label className="block text-gray-650 mb-1 font-bold">ชื่อสัญญาลูกค้า (บุคคลหรือนิติบุคคล) *</label>
                <input
                  type="text"
                  required
                  className="w-full h-10 border rounded-lg px-3 focus:outline-none focus:border-[#CD1C18]"
                  placeholder="เช่น บจก. พลังรุ่งเรืองก่อสร้าง (สมจิตต์)"
                  value={cName}
                  onChange={e => setCName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-gray-650 mb-1 font-bold">เบอร์โทรศัพท์มือถือ *</label>
                  <input
                    type="text"
                    required
                    maxLength={12}
                    className="w-full h-10 border rounded-lg px-3 focus:outline-none focus:border-[#CD1C18]"
                    placeholder="เช่น 081-234-5678"
                    value={cPhone}
                    onChange={e => setCPhone(formatThaiPhone(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-gray-650 mb-1 font-bold">เลขบัตรประชาชน (13 หลัก)</label>
                  <input
                    type="text"
                    maxLength={17}
                    className="w-full h-10 border rounded-lg px-3 focus:outline-none focus:border-[#CD1C18]"
                    placeholder="เช่น 1-5399-00281-45-6"
                    value={cIdNo}
                    onChange={e => setCIdNo(formatThaiIDCard(e.target.value))}
                  />
                </div>
              </div>

              <input
                type="file"
                id="customerFakeScanner"
                accept="image/*"
                className="hidden"
                onChange={handleIdCardUploadFake}
              />

              {idCardFile && (
                <div className="space-y-2 border border-slate-150 p-3 rounded-2xl bg-slate-50">
                  <span className="text-[10px] text-slate-500 font-extrabold block uppercase tracking-wider">
                    📸 ภาพถ่ายหน้าบัตรจากเซนเซอร์วิเคราะห์ด่วนล่าสุด:
                  </span>
                  <div className="relative border rounded-2xl overflow-hidden bg-slate-900 shadow-sm max-w-sm mx-auto">
                    {idCardFile.startsWith('data:image/svg+xml') ? (
                      <div 
                        className="w-full max-h-[170px]"
                        dangerouslySetInnerHTML={{ __html: decodeURIComponent(idCardFile.split(',')[1] || '') }}
                      />
                    ) : (
                      <img src={idCardFile} alt="Uploaded Card Preview" className="w-full max-h-[160px] object-contain mx-auto bg-white" />
                    )}
                    
                    <button
                      type="button"
                      onClick={() => setIdCardFile('')}
                      className="absolute bottom-1 right-1 px-2 py-0.5 bg-red-800/90 hover:bg-red-900 border border-red-750 text-white rounded text-[9px] font-black uppercase transition-colors cursor-pointer"
                    >
                      ล้างรูปป้ายทะเบียนบัตร
                    </button>
                  </div>
                </div>
              )}

              <label className="flex items-start gap-2 bg-[#FFFBF9] border border-red-100 p-3 rounded-2xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={cPdpa || true}
                  className="mt-0.5 accent-[#9B1313]"
                  onChange={e => setCPdpa(e.target.checked)}
                />
                <span className="text-[10px] text-slate-650 font-semibold leading-relaxed">
                   ข้าพเจ้ายินยอมลงชื่อและมอบอำนาจให้ผู้จัดเก็บข้อมูลในระบบเครือข่าย พ.ร.บ. คุ้มครองความปลอดภัยข้อมูลส่วนบุคคล (PDPA Consent) ตลอดอายุการดำเนินโครงการเช่าวัสดุก่อสร้าง
                </span>
              </label>

              {/* INTEGRATED THAI ADDRESS HIERARCHICAL autocomplete & SEGMENTATION */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-3 shadow-2xs">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider block border-b pb-1">
                  📍 ที่อยู่ทะเบียนบ้านลูกค้า (รายละเอียดแยกส่วน คัดกรองอัตโนมัติ)
                </span>

                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-slate-500 mb-1 font-bold">บ้านเลขที่ / ซอย / ถนน *</label>
                    <input
                      type="text"
                      required
                      className="w-full h-10 border rounded-lg px-3 focus:outline-none focus:border-[#CD1C18]"
                      placeholder="เช่น 123/4 ซอย 2 ถนนวงแหวน"
                      value={cAddressNo}
                      onChange={e => setCAddressNo(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1 font-bold">หมู่ที่ / หมู่บ้าน</label>
                    <input
                      type="text"
                      className="w-full h-10 border rounded-lg px-3 focus:outline-none focus:border-[#CD1C18]"
                      placeholder="เช่น หมู่ 3 บ้านปากเกาะ"
                      value={cMoo}
                      onChange={e => setCMoo(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div className="relative">
                    <label className="block text-slate-500 mb-1 font-bold">ตำบล / แขวง (พิมพ์ค้นหาได้) *</label>
                    <input
                      type="text"
                      required
                      className="w-full h-10 border rounded-lg px-3 focus:outline-none focus:border-[#CD1C18]"
                      placeholder="พิมพ์เพื่อเริ่มค้นหาตำบล..."
                      value={subdistrictSearch}
                      onChange={e => {
                        setSubdistrictSearch(e.target.value);
                        setCSubdistrict(e.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                    />
                    
                    {/* AUTOCOMPLETE DROPDOWN */}
                    {showSuggestions && (
                      <div className="absolute left-0 right-0 top-16 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-[180px] overflow-y-auto divide-y text-[11px] font-bold">
                        {THAI_ADDRESS_DATA.filter(item => {
                          const query = subdistrictSearch.toLowerCase().trim();
                          if (!query) return item.province === cProvince;
                          return item.subdistrict.includes(query) || 
                                 item.district.includes(query) || 
                                 item.province.includes(query) || 
                                 item.zipcode.includes(query);
                        }).length === 0 ? (
                          <div className="p-3 text-slate-400 text-center">
                            ไม่พบข้อมูลในสารบบ (สามารถพิมพ์รอดักเองได้)
                          </div>
                        ) : (
                          THAI_ADDRESS_DATA.filter(item => {
                            const query = subdistrictSearch.toLowerCase().trim();
                            if (!query) return item.province === cProvince;
                            return item.subdistrict.includes(query) || 
                                   item.district.includes(query) || 
                                   item.province.includes(query) || 
                                   item.zipcode.includes(query);
                          }).map((item, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setCSubdistrict(item.subdistrict);
                                setSubdistrictSearch(item.subdistrict);
                                setCAmphoe(item.district);
                                setCProvince(item.province);
                                setCPostalCode(item.zipcode);
                                setShowSuggestions(false);
                              }}
                              className="w-full text-left px-3.5 py-2.5 hover:bg-red-50/50 text-slate-700 hover:text-[#9B1313] transition-colors block shrink-0"
                            >
                              ต. {item.subdistrict} → อ. {item.district} → จ. {item.province} ({item.zipcode})
                            </button>
                          ))
                        )}
                        <button
                          type="button"
                          onClick={() => setShowSuggestions(false)}
                          className="w-full text-center py-2.5 bg-slate-50 hover:bg-slate-100 font-extrabold text-slate-450 border-t"
                        >
                          ปิดหน้าต่างตัวช่วยพิมพ์ [X]
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-slate-500 mb-1 font-bold">อำเภอ / เขต *</label>
                    <input
                      type="text"
                      required
                      className="w-full h-10 border rounded-lg px-3 focus:outline-none focus:border-[#CD1C18]"
                      placeholder="เช่น เมืองอุตรดิตถ์"
                      value={cAmphoe}
                      onChange={e => setCAmphoe(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-slate-500 mb-1 font-bold">จังหวัด *</label>
                    <select 
                      className="w-full h-10 border rounded-lg px-3 bg-white text-gray-800 focus:outline-none focus:border-[#CD1C18]"
                      value={cProvince}
                      onChange={e => setCProvince(e.target.value)}
                    >
                      {['อุตรดิตถ์', 'พิษณุโลก', 'สุโขทัย', 'แพร่', 'น่าน', 'พะเยา', 'เชียงใหม่', 'กรุงเทพมหานคร'].map(prov => (
                        <option key={prov} value={prov}>{prov}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1 font-bold">รหัสไปรษณีย์ *</label>
                    <input
                      type="text"
                      required
                      maxLength={5}
                      className="w-full h-10 border rounded-lg px-3 focus:outline-none focus:border-[#CD1C18]"
                      placeholder="เช่น 53000"
                      value={cPostalCode}
                      onChange={e => setCPostalCode(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="block text-slate-400 mb-1 text-[10px] font-bold uppercase">ที่อยู่รวมจัดส่งด่วนตามกฎหมาย (คำนวณอัตโนมัติ):</label>
                  <p className="bg-slate-50 border rounded-xl p-3 text-slate-800 text-[11px] leading-relaxed font-black min-h-11">
                    {cAddress ? cAddress : 'กรุณากรอกข้อมูลส่วนสำคัญเพื่อเริ่มประมวลผลปลายทาง...'}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-gray-650 mb-1 font-extrabold">หน้างานสำหรับการจัดส่งกองวัสดุ / พิกัดโครงการก่อสร้าง *</label>
                <input
                  type="text"
                  required
                  className="w-full h-10 border rounded-lg px-3 focus:outline-none focus:border-[#CD1C18]"
                  placeholder="เช่น ซอย 2 ข้างวัดท่าเสา ข้างตึกอบจ.อุตรดิตถ์"
                  value={cWorksite}
                  onChange={e => setCWorksite(e.target.value)}
                />
              </div>

              <div>
                <SignaturePad
                  label="ลายเซ็นกำกับสัญญากู้ยืมผู้เช่า (ลงชื่อบนจอสัมผัสหรือเมาส์) *"
                  placeholder="ลงชื่อเช็นตรงนี้เพื่อยินยอมการรับวัตถุก่อสร้าง หรือคลิกปุ่มเสียบการ์ดด้านบนเพื่อตรวจจับลายมือจำลอง..."
                  value={cSignature}
                  onChange={setCSignature}
                />
              </div>

              <div className="flex gap-2.5 pt-4.5 border-t">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="w-1/3 py-2.5 bg-slate-150 hover:bg-slate-200 border text-slate-700 font-extrabold rounded-xl text-xs cursor-pointer transition-colors"
                >
                  ย้อนกลับ
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#9B1313] hover:bg-red-800 text-white font-black rounded-xl shadow-md flex items-center justify-center gap-1 text-xs cursor-pointer transition-colors"
                >
                  <CheckCircle size={14} /> ✓ มอบอำนาจเซฟรายชื่อ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Customer Profile & 6-Month Rental Debt History Modality */}
      {selectedProfileCustomer !== null && (() => {
        const c = selectedProfileCustomer;
        const receipts = JirakitDB.getReceipts().filter(r => r.customer_id === c.customer_id);
        const unpaidReceipts = receipts.filter(r => r.debt_amount > 0);
        const totalUnpaidDebt = unpaidReceipts.reduce((sum, r) => sum + (r.debt_amount || 0), 0);

        const lastFivePayments = (() => {
          const list: { date: string; receipt_no: string; amount_paid: number; type: string }[] = [];
          
          receipts.forEach(r => {
            if (r.paid_amount > 0) {
              list.push({
                date: r.created_at || r.rent_date || '',
                receipt_no: r.receipt_no,
                amount_paid: r.paid_amount,
                type: 'บิลเช่า/ขายวัสดุ'
              });
            }
          });

          const returns = JirakitDB.getReturnEvents().filter(ret => ret.customer_id === c.customer_id);
          returns.forEach(ret => {
            if (ret.paid_amount > 0) {
              list.push({
                date: ret.created_at || ret.return_date || '',
                receipt_no: ret.receipt_no,
                amount_paid: ret.paid_amount,
                type: 'ชำระคืนคลัง/ปรับ'
              });
            }
          });

          list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          return list.slice(0, 5);
        })();
        
        // Assess Credit Risk
        let riskRating = '';
        let riskColor = '';
        let riskBg = '';
        let riskDesc = '';
        if (totalUnpaidDebt === 0) {
          riskRating = 'เสี่ยงต่ำมาก (Low Risk)';
          riskColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
          riskBg = 'bg-emerald-500';
          riskDesc = 'ไม่มียอดค้างชำระ ประวัติการส่งเงินดีเยี่ยม อุปกรณ์เช่าได้รับการดูแลดี';
        } else if (totalUnpaidDebt <= 8000) {
          riskRating = 'เสี่ยงต่ำ (Low Risk)';
          riskColor = 'text-teal-700 bg-teal-50 border-teal-200';
          riskBg = 'bg-teal-500';
          riskDesc = 'มียอดค้างชำระเล็กน้อย ชำระคืนสม่ำเสมอตามกรอบรอบสัญญาเช่า';
        } else if (totalUnpaidDebt <= 30000) {
          riskRating = 'เสี่ยงปานกลาง (Medium Risk)';
          riskColor = 'text-amber-700 bg-amber-50 border-amber-200';
          riskBg = 'bg-amber-500';
          riskDesc = 'ยอดหนี้ค้างเริ่มพุ่งสูง ระดับความเสี่ยงปกติในการกู้ยืม แต่ควรติดตามสัญญาเช่าใกล้ชิด';
        } else {
          riskRating = 'เสี่ยงสูง (High Risk)';
          riskColor = 'text-rose-700 bg-rose-50 border-rose-200 animate-pulse';
          riskBg = 'bg-rose-550';
          riskDesc = 'ยอดค้างชำระเกินเพดานควบคุมระวังการผิดสัญญาส่งมอบ แนะนำจำกัดการเปิดบิลเช่ารอบใหม่ชั่วคราว';
        }

        // 6-Month Rental Debt History Calculation
        const historyData = (() => {
          const months: { label: string; debt: number }[] = [];
          const now = new Date();
          for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const year = d.getFullYear();
            const month = d.getMonth();
            
            const thaiMonthsShort = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
            const label = `${thaiMonthsShort[month]} ${String((year + 543) % 100).padStart(2, '0')}`;
            
            const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);
            const totalDebtAtMonthEnd = receipts
              .filter(r => {
                const rcDate = new Date(r.created_at || r.rent_date);
                return rcDate <= endOfMonth;
              })
              .reduce((sum, r) => sum + (r.debt_amount || 0), 0);
              
            months.push({ label, debt: totalDebtAtMonthEnd });
          }
          return months;
        })();

        const maxDebt = Math.max(...historyData.map(h => h.debt), 1000);
        
        // Coordinates for SVG Areas
        const svgPoints = historyData.map((h, idx) => {
          const x = 50 + idx * 80; // 50, 130, 210, 290, 370, 450
          const y = 180 - (h.debt / maxDebt) * 130; // Scale debt to Y [50, 180]
          return { x, y, debt: h.debt, label: h.label };
        });

        // Generate SVG Path
        let pathString = '';
        if (svgPoints.length > 0) {
          pathString = `M ${svgPoints[0].x} ${svgPoints[0].y} ` + 
            svgPoints.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
        }
        const areaPathString = pathString ? `${pathString} L ${svgPoints[svgPoints.length - 1].x} 180 L ${svgPoints[0].x} 180 Z` : '';

        return (
          <div className="fixed inset-0 bg-[#38000A]/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              
              {/* Header */}
              <div className="bg-[#7F1D1D] px-6 py-4 text-white flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <TrendingUp size={18} />
                  <div>
                    <h3 className="text-md font-bold">ข้อมูลวิเคราะห์เครดิต & หนี้สิน</h3>
                    <p className="text-[10px] text-red-200 font-bold mt-0.5">ลูกค้าพิกัดสัญญาก่อสร้าง: {c.customer_name}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedProfileCustomer(null)} className="text-white hover:text-red-200 p-1">
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-gray-700">
                
                {/* Credit Risk Assessment Panel */}
                <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center ${riskColor}`}>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 font-extrabold text-sm uppercase">
                      <AlertTriangle size={15} />
                      <span>ระดับความเสี่ยงทางการเงิน:</span>
                      <span className="font-extrabold">{riskRating}</span>
                    </div>
                    <p className="text-[11px] font-medium leading-relaxed max-w-md">{riskDesc}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-gray-500 font-bold font-sans">ยอดหนี้ค้างชำระปัจจุบันรวม</p>
                    <p className="text-lg font-black text-red-950 mt-1">฿{totalUnpaidDebt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>

                {/* 6-Month Debt Trend SVG Area Chart Component */}
                <div className="bg-slate-50 border border-gray-150 rounded-2xl p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-extrabold text-gray-800 flex items-center gap-1">
                      <CreditCard size={13} className="text-[#9B1313]" />
                      ประวัติภาระหนี้สินสะสมย้อนหลัง 6 เดือน
                    </h4>
                    <span className="text-[10px] bg-white border px-2 py-0.5 rounded font-mono font-bold text-gray-500">
                      หน่วย: บาท (฿)
                    </span>
                  </div>

                  <div className="w-full overflow-x-auto">
                    <svg width="100%" height="220" viewBox="0 0 500 220" className="mx-auto select-none min-w-[460px]">
                      <defs>
                        <linearGradient id="debtGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Horizontal Grid lines */}
                      {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                        const yVal = 50 + ratio * 130;
                        const labelVal = maxDebt * (1 - ratio);
                        return (
                          <g key={i}>
                            <line 
                              x1="45" 
                              y1={yVal} 
                              x2="465" 
                              y2={yVal} 
                              stroke="#e2e8f0" 
                              strokeDasharray="3 3" 
                            />
                            <text 
                              x="8" 
                              y={yVal + 3} 
                              className="fill-gray-400 font-mono text-[9px] font-bold"
                            >
                              {Math.round(labelVal).toLocaleString()}
                            </text>
                          </g>
                        );
                      })}

                      {/* Area Fill */}
                      {areaPathString && (
                        <path d={areaPathString} fill="url(#debtGrad)" />
                      )}

                      {/* Line Path */}
                      {pathString && (
                        <path 
                          d={pathString} 
                          fill="none" 
                          stroke="#ef4444" 
                          strokeWidth="2.5" 
                          strokeLinecap="round" 
                        />
                      )}

                      {/* Data Points / Circle Nodes */}
                      {svgPoints.map((pt, i) => (
                        <g key={i} className="group cursor-pointer">
                          <circle 
                            cx={pt.x} 
                            cy={pt.y} 
                            r="5" 
                            className="fill-white stroke-red-600 stroke-2 hover:r-7 transition-all"
                          />
                          {/* Point Value tooltip or indicator */}
                          <text 
                            x={pt.x} 
                            y={pt.y - 10} 
                            textAnchor="middle" 
                            className="fill-red-850 font-bold text-[9px] font-mono"
                          >
                            ฿{Math.round(pt.debt).toLocaleString()}
                          </text>
                          {/* X labels */}
                          <text 
                            x={pt.x} 
                            y="202" 
                            textAnchor="middle" 
                            className="fill-gray-500 font-extrabold text-[10px]"
                          >
                            {pt.label}
                          </text>
                        </g>
                      ))}

                      {/* X and Y Axis lines */}
                      <line x1="45" y1="180" x2="465" y2="180" stroke="#94a3b8" strokeWidth="1.5" />
                      <line x1="45" y1="50" x2="45" y2="180" stroke="#94a3b8" strokeWidth="1.5" />
                    </svg>
                  </div>
                </div>

                {/* Last 5 Payments Section */}
                <div className="space-y-3">
                  <h4 className="font-extrabold text-gray-850 flex items-center gap-1">
                    <span className="text-[#9B1313]">💰</span>
                    ประวัติการชำระเงิน 5 รายการล่าสุด
                  </h4>
                  {lastFivePayments.length === 0 ? (
                    <div className="text-center py-6 bg-gray-50 text-gray-400 rounded-xl border border-gray-100">
                      <p className="font-bold font-sans text-xs">ไม่พบประวัติธุรกรรมการรับชำระเงินของลูกค้ารายนี้</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-gray-150 shadow-xs">
                      <table className="w-full text-xs font-bold text-left table-auto">
                        <thead>
                          <tr className="bg-red-50/40 text-gray-700 h-8">
                            <th className="p-2 pl-3">วัน-เวลา ทำรายการ</th>
                            <th className="p-2 text-center">ช่องทางบิล</th>
                            <th className="p-2 text-center">อ้างอิงบิล</th>
                            <th className="p-2 text-right pr-3">จำนวนเงินที่ชำระ (฿)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-gray-650 font-medium">
                          {lastFivePayments.map((p, idx) => (
                            <tr key={idx} className="h-9 hover:bg-[#FFFBF9] transition-colors">
                              <td className="p-2 pl-3 font-mono text-[10.5px]">
                                {p.date ? new Date(p.date).toLocaleString('th-TH').slice(0, 16) : '-'}
                              </td>
                              <td className="p-2 text-center text-[10px]">
                                <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-100 font-bold">
                                  {p.type}
                                </span>
                              </td>
                              <td className="p-2 text-center font-mono text-[#9B1313] text-[10.5px]">
                                {p.receipt_no}
                              </td>
                              <td className="p-2 text-right pr-3 font-mono font-black text-emerald-700 text-[11px]">
                                ฿{p.amount_paid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Unpaid Receipts List Details */}
                <div className="space-y-3">
                  <h4 className="font-extrabold text-gray-850 flex items-center gap-1">
                    <FileText size={13} className="text-[#9B1313]" />
                    รายการบิลคงค้างเดิมที่แนะนำติดตามเก็บเงิน ({unpaidReceipts.length} บิล)
                  </h4>
                  {unpaidReceipts.length === 0 ? (
                    <div className="text-center py-6 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100">
                      <p className="font-bold font-sans">ไม่มีประเด็นบิลค้างส่ง! คืนคลังครบและปิดหนี้หมดจด</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                      {unpaidReceipts.map(r => (
                        <div key={r.receipt_id} className="bg-red-50/45 border border-red-100 p-3 rounded-xl flex justify-between items-center">
                          <div>
                            <p className="font-bold text-gray-900 font-sans">{r.receipt_no} ({r.doc_type === 'receipt' ? 'บิลเสร็จทั่วไป' : r.doc_type === 'invoice' ? 'ใบส่งงวด' : 'ใบแจ้งเก็บหนี้'})</p>
                            <p className="text-[10px] text-gray-500 mt-1">ปล่อยคืน: {r.rent_date} • กำหนดส่งคืนคลัง: {r.due_date || '-'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-gray-400 font-extrabold">ยอดคงค้างหนี้</p>
                            <p className="font-black text-[#CD1C18] text-sm mt-0.5">฿{r.debt_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Footer */}
              <div className="bg-gray-50 border-t px-6 py-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedProfileCustomer(null)}
                  className="px-5 py-2.5 bg-gray-950 text-white font-extrabold rounded-xl transition-all"
                >
                  ปิดหน้ารายละเอียดลูกค้า
                </button>
              </div>

            </div>
          </div>
        );
      })()}
    </div>
  );
}
