/**
 * Receipt Layout and Printing Utility
 * Google AI Studio / React + TypeScript
 * JRK Apps Script A4 Receipt Layout Port
 */
import React from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export type ReceiptPaperSize = 'A4' | 'A5';
export type ReceiptCopyType = 'original' | 'carbon';

export function normalizeCategory(cat: string): string {
  if (!cat) return '';
  const trimmed = cat.trim();
  if (trimmed === 'นั่งร้าน' || trimmed === 'ขาปรับ' || trimmed === 'นั่งร้านและอุปกรณ์') {
    return 'นั่งร้าน/อุปกรณ์';
  }
  return trimmed;
}

export function calculateRentalLineTotal(item: any): number {
  if (item.line_mode === 'sale') {
    return Number(item.price || 0) * Number(item.qty || item.quantity || 0);
  }

  const category = normalizeCategory(item.category || '');
  const price = Number(item.price || 0);
  const qty = Number(item.qty || item.quantity || 0);
  const rentalMode = item.rental_mode || item.rentalMode || 'day';
  const rentDays = Number(item.rent_days || item.rentalDays || 0);
  const rounds = Number(item.rounds || item.rentalRounds || 0);

  if (rentalMode === 'day' || rentalMode === 'แบบวัน') {
    return price * qty * rentDays;
  }

  if (rentalMode === 'round' || rentalMode === 'แบบรอบ') {
    if (
      category === 'แบบคาน' ||
      category === 'แบบเสา' ||
      category === 'แบบข้าง' ||
      category === 'แบบฟุตติ้ง' ||
      category === 'ทั่วไป'
    ) {
      return price * qty * rounds;
    }
  }

  const factor = rentalMode === 'day' || rentalMode === 'แบบวัน' ? rentDays : rounds;
  return price * qty * factor;
}

export const thaiBahtText = (num: number): string => {
  if (isNaN(num) || num === null) return '';
  num = Math.round(num * 100) / 100;
  if (num === 0) return 'ศูนย์บาทถ้วน';

  const thaiNums = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
  const thaiPositions = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

  const convertSegment = (nStr: string): string => {
    let res = '';
    const len = nStr.length;
    for (let i = 0; i < len; i++) {
      const digit = parseInt(nStr[i], 10);
      if (digit !== 0) {
        const pos = len - 1 - i;
        if (pos === 1 && digit === 1) {
          res += 'สิบ';
        } else if (pos === 1 && digit === 2) {
          res += 'ยี่สิบ';
        } else if (pos === 0 && digit === 1 && len > 1) {
          res += 'เอ็ด';
        } else {
          res += thaiNums[digit] + thaiPositions[pos];
        }
      }
    }
    return res;
  };

  const parts = num.toFixed(2).split('.');
  const bahtStr = parts[0];
  const satangStr = parts[1] || '';

  let text = '';
  const bahtNum = parseInt(bahtStr, 10);
  if (bahtNum > 0) {
    if (bahtStr.length > 6) {
      const millionPart = bahtStr.slice(0, -6);
      const remainingPart = bahtStr.slice(-6);
      text += convertSegment(millionPart) + 'ล้าน' + convertSegment(remainingPart);
    } else {
      text += convertSegment(bahtStr);
    }
    text += 'บาท';
  }

  const satangVal = parseInt(satangStr, 10);
  if (satangVal > 0) {
    text += convertSegment(satangVal.toString()) + 'สตางค์';
  } else {
    text += 'ถ้วน';
  }
  return text;
};

export const getReceiptRowLimit = (itemCount: number, paperSize: ReceiptPaperSize): number => {
  if (itemCount === 0) return paperSize === 'A4' ? 18 : 10;
  if (paperSize === 'A4') {
    if (itemCount <= 18) return 18;
    if (itemCount <= 22) return 22;
    if (itemCount <= 26) return 26;
    if (itemCount <= 30) return 30;
    return itemCount;
  }

  if (itemCount <= 10) return 10;
  if (itemCount <= 12) return 12;
  return itemCount;
};

export const formatThaiDate = (dateVal: any): string => {
  if (!dateVal) return '-';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '-';
    const day = d.getDate();
    const monthNames = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    return `${day} ${monthNames[d.getMonth()]} ${d.getFullYear() + 543}`;
  } catch {
    return '-';
  }
};

export const getItemDisplayName = (it: any): string => {
  return (
    it.receipt_name ||
    it.receiptName ||
    it.name ||
    it.product_name ||
    ''
  );
};

export const getRentalPeriodText = (it: any): string => {
  if (it.line_mode === 'sale') return 'ขายขาด';

  const mode = it.rental_mode || it.rentalMode || 'day';
  if (mode === 'day' || mode === 'แบบวัน') {
    const dVal = Number(it.rent_days || it.rentalDays || it.rounds || 1);
    return `${isNaN(dVal) ? 1 : dVal} วัน`;
  }

  if (mode === 'round' || mode === 'แบบรอบ') {
    const rVal = Number(it.rounds || it.rentalRounds || it.rent_days || 1);
    return `${isNaN(rVal) ? 1 : rVal} รอบ`;
  }

  const isScaffold =
    (it.receipt_name && (it.receipt_name.includes('นั่งร้าน') || it.receipt_name.includes('ขาปรับ'))) ||
    it.unit === 'วัน';

  const duration = Number(it.rounds || it.rent_days || 1);
  const safeDuration = isNaN(duration) ? 1 : duration;
  return isScaffold ? `${safeDuration} วัน` : `${safeDuration} รอบ`;
};

export const sanitizeReceiptFilePart = (value: any, fallback = ''): string => {
  const raw = String(value ?? fallback ?? '').trim();
  const safe = raw
    .replace(/[\\/:*?"<>|#%&{}$!'@+`=]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^\.+|\.+$/g, '')
    .replace(/^_+|_+$/g, '');

  return safe || fallback || 'ไม่ระบุ';
};

export const getReceiptFileDateValue = (r: any): any => {
  return r?.receipt_date || r?.receiptDate || r?.created_at || r?.createdAt || r?.date || new Date();
};

export const formatReceiptFileDateCode = (dateVal: any): string => {
  const fallbackDate = new Date();
  const pad2 = (n: number) => String(n).padStart(2, '0');
  const buildCode = (day: number, month: number, year: number) => {
    const beYear = year > 2400 ? year : year + 543;
    return `${pad2(day)}${pad2(month)}${String(beYear).slice(-2)}`;
  };

  if (typeof dateVal === 'string') {
    const trimmed = dateVal.trim();
    const ymd = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (ymd) {
      const year = Number(ymd[1]);
      const month = Number(ymd[2]);
      const day = Number(ymd[3]);
      if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
        return buildCode(day, month, year);
      }
    }

    const dmy = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
    if (dmy) {
      const day = Number(dmy[1]);
      const month = Number(dmy[2]);
      let year = Number(dmy[3]);
      if (year < 100) year = 2500 + year;
      if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
        return buildCode(day, month, year);
      }
    }
  }

  const date = new Date(dateVal);
  const safeDate = isNaN(date.getTime()) ? fallbackDate : date;
  return buildCode(safeDate.getDate(), safeDate.getMonth() + 1, safeDate.getFullYear());
};

export const buildReceiptFileBaseName = (r: any, mode: ReceiptPaperSize): string => {
  const customerName = sanitizeReceiptFilePart(
    r?.customer_name || r?.customerName || r?.customer || r?.name,
    'ลูกค้า'
  );

  const deliveryLocation = sanitizeReceiptFilePart(
    r?.delivery_location || r?.deliveryLocation || r?.shipping_location || r?.shippingLocation || r?.location,
    'ไม่ระบุสถานที่'
  );

  const dateCode = formatReceiptFileDateCode(getReceiptFileDateValue(r));
  return `${customerName}_${deliveryLocation}_${dateCode}_${mode}`;
};

export const buildReceiptFileName = (
  r: any,
  mode: ReceiptPaperSize,
  extension: 'pdf' | 'png'
): string => {
  return `${buildReceiptFileBaseName(r, mode)}.${extension}`;
};

const toNumber = (value: any): number => {
  const n = Number(value || 0);
  return isNaN(n) ? 0 : n;
};

const escapeHtml = (value: any): string => {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
};

const waitForImages = async (targetElement: HTMLElement) => {
  const images = Array.from(targetElement.querySelectorAll('img'));
  await Promise.all(
    images.map((img) => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
    })
  );
};

const createReceiptCaptureElement = (htmlContent: string): HTMLElement => {
  const tempDiv = document.createElement('div');
  tempDiv.style.position = 'fixed';
  tempDiv.style.left = '0';
  tempDiv.style.top = '0';
  tempDiv.style.transform = 'translateX(-220vw)';
  tempDiv.style.zIndex = '-9999';
  tempDiv.style.opacity = '1';
  tempDiv.style.pointerEvents = 'none';
  tempDiv.style.background = '#ffffff';
  tempDiv.innerHTML = htmlContent;
  document.body.appendChild(tempDiv);

  const targetElement = tempDiv.querySelector('.invoice-container') as HTMLElement | null;
  if (!targetElement) {
    document.body.removeChild(tempDiv);
    throw new Error('ไม่พบใบเสร็จสำหรับบันทึก/พิมพ์');
  }

  targetElement.style.boxShadow = 'none';
  targetElement.style.margin = '0';
  targetElement.style.transform = 'none';
  targetElement.style.position = 'relative';

  return targetElement;
};

/**
 * Single source of truth for:
 * - POS live preview
 * - Print
 * - PDF
 * - PNG / image save
 * - Bills history reprint
 */
export const getReceiptPrintHtml = (
  r: any,
  isA4: boolean,
  shopSettings: any = {},
  copyType: ReceiptCopyType = 'original'
): string => {
  let items: any[] = [];
  try {
    items = typeof r.items_json === 'string' ? JSON.parse(r.items_json || '[]') : (r.items || r.lines || []);
  } catch {
    items = r.items || r.lines || [];
  }

  const itemCount = items.length;
  const paperMode: ReceiptPaperSize = isA4 ? 'A4' : 'A5';
  const rowLimit = getReceiptRowLimit(itemCount, paperMode);
  const grandTotal = toNumber(r.grand_total ?? r.grand ?? r.amount_paid ?? r.total ?? 0);
  const thaiBuddhistDate = formatThaiDate(r.created_at || r.receipt_date || new Date());

  const isCarbon = copyType === 'carbon';
  const paperBg = isCarbon ? '#FFF2F5' : '#FFFFFF';
  const printInk = '#000000';
  const writeInk = isCarbon ? '#4338CA' : '#1D4ED8';
  const border = '#333333';

  const scale = isA4 ? 1 : 1 / Math.sqrt(2);
  const px = (a4: number, min = 0) => {
    const v = Math.max(a4 * scale, min);
    const rounded = Math.round(v * 10) / 10;
    return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}px`;
  };
  const mm = (a4: number, min = 0) => {
    const v = Math.max(a4 * scale, min);
    const rounded = Math.round(v * 10) / 10;
    return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}mm`;
  };

  const paperWidth = isA4 ? '210mm' : '148mm';
  const paperHeight = isA4 ? '297mm' : '210mm';
  const pageSizeCss = isA4 ? 'A4 portrait' : 'A5 portrait';
  const padding = isA4 ? '10mm 15mm' : `${mm(10, 6)} ${mm(15, 9)}`;

  // Match Apps Script receipt visual, but slightly guarded for Thai glyph rendering on iPad.
  const shopNameSize = isA4 ? '29px' : px(29, 19.5);
  const shopAddressSize = isA4 ? '12.5px' : px(12.5, 8.8);
  const contactSize = isA4 ? '15px' : px(15, 10);
  const lineIdSize = isA4 ? '16px' : px(16, 10.5);
  const lineIconSize = isA4 ? '13px' : px(13, 9);
  const docTitleSize = isA4 ? '23px' : px(23, 15.5);
  const docDateSize = isA4 ? '14px' : px(14, 9.5);
  const lineQrSize = isA4 ? '75px' : px(75, 52);
  const lineQrBorder = isA4 ? '3px' : px(3, 2);
  const headerGap = isA4 ? '14px' : px(14, 9);

  const boxRadius = isA4 ? '6px' : px(6, 4);
  const serviceFont = isA4 ? '14px' : px(14, 9.5);
const customerFont = isA4 ? '13px' : px(14.5, 10.5);
  const tableHeaderFont = isA4 ? '13px' : px(13, 9);
  const tableBodyFont =
    isA4
      ? rowLimit <= 18 ? '13.5px' : rowLimit <= 22 ? '12.5px' : rowLimit <= 26 ? '11.5px' : rowLimit <= 30 ? '10.5px' : '10px'
      : rowLimit <= 10 ? px(13, 9.2) : px(12, 8.5);
  const tableHeaderHeight = isA4 ? '28px' : px(28, 19);
  const trHeight = isA4
    ? (rowLimit <= 18 ? '21px' : rowLimit <= 22 ? '18px' : rowLimit <= 26 ? '15.5px' : rowLimit <= 30 ? '13px' : `${Math.max(10.0, 370 / rowLimit)}px`)
    : (rowLimit <= 10 ? px(21, 14.5) : px(18, 12.5));

  const footerGrid = '1.6fr 1fr';
  const footerGap = isA4 ? '8px 25px' : `${px(8, 5.5)} ${px(25, 17)}`;
  const footerBottom = isA4 ? '10px' : px(10, 7);

  const beamFont = isA4 ? '13.5px' : px(13.5, 9.5);
  const warnFont = isA4 ? '12.5px' : px(12.5, 9);
  const warnTitleFont = isA4 ? '14px' : px(14, 10.2);
  const totalFont = isA4 ? '15.5px' : px(15.5, 11);
  const totalAmountFont = isA4 ? '20px' : px(20, 14);
  const bankFont = isA4 ? '13px' : px(13, 9);
  const bankNoFont = isA4 ? '14px' : px(14, 10);
  const bankQrSize = isA4 ? '68px' : px(68, 49);

  const promptPayQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=https://promptpay.io/0931703949/${Math.max(0, grandTotal).toFixed(2)}`;

  const BANK_QR_URL =
    shopSettings.BANK_QR_URL && !String(shopSettings.BANK_QR_URL).includes('ใส่_FILE')
      ? shopSettings.BANK_QR_URL
      : 'https://i.ibb.co/cc6X9z6K/S-11485187.jpg';

  const LINE_QR_URL =
    shopSettings.LINE_QR_URL && !String(shopSettings.LINE_QR_URL).includes('ใส่_FILE')
      ? shopSettings.LINE_QR_URL
      : 'https://i.ibb.co/hRCB1cQN/IMG-0824.jpg';

  const customerName = escapeHtml(r.customer_name || r.customerName || 'ลูกค้าเงินสด (ทั่วไป)');
  const customerPhone = escapeHtml(r.phone || r.customer_phone || '-');
  const customerAddress = escapeHtml(r.address || r.customer_address || '-');
  const deliveryLocation = escapeHtml(r.delivery_location || r.deliveryLocation || '-');

  let rows = '';
  for (let i = 0; i < rowLimit; i++) {
    if (i < itemCount) {
      const it = items[i] || {};
      const rowNum = i + 1;
      const displayName = escapeHtml(getItemDisplayName(it));
      const qty = toNumber(it.qty ?? it.quantity);
      const unit = escapeHtml(it.unit || 'ชิ้น');
      const price = toNumber(it.price);
      const rentalPeriod = escapeHtml(getRentalPeriodText(it));
      const total = calculateRentalLineTotal(it);

      rows += `
        <tr style="height: ${trHeight};">
          <td class="c-center c-number">${rowNum}</td>
          <td class="c-item" title="${displayName}">${displayName}</td>
          <td class="c-center c-write">${qty}</td>
          <td class="c-center c-write">${unit}</td>
          <td class="c-center c-write">${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td class="c-center c-write">${rentalPeriod}</td>
          <td class="c-amount">${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
      `;
    } else {
      rows += `
        <tr style="height: ${trHeight};">
          <td></td><td></td><td></td><td></td><td></td><td></td><td></td>
        </tr>
      `;
    }
  }

  return `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="format-detection" content="telephone=no, date=no, address=no, email=no" />
    <title>ใบเสร็จ - ${escapeHtml(r.receipt_no || 'preview')}</title>
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700;800;900&family=Prompt:wght@400;600;700;800;900&display=swap" rel="stylesheet">
    <style>
      @page { size: ${pageSizeCss}; margin: 0; }
      * { box-sizing: border-box; }
      /* Prevent phone/address/bank-no auto-underlining on mobile browsers */
      a, a:hover, a:active, a:focus {
        color: inherit !important;
        text-decoration: none !important;
      }
      .contact, .bank-no {
        text-decoration: none !important;
        border-bottom: none !important;
      }
      html, body {
        margin: 0;
        padding: 0;
        background: #e2e8f0;
        font-family: 'Sarabun', Tahoma, sans-serif;
        color: ${printInk};
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      body {
        padding: 20px;
        display: flex;
        align-items: flex-start;
        justify-content: center;
      }
      .invoice-container {
        width: ${paperWidth};
        height: ${paperHeight};
        padding: ${padding};
        background: ${paperBg};
        color: ${printInk};
        display: flex;
        flex-direction: column;
        position: relative;
        overflow: hidden;
        box-shadow: 0 8px 24px rgba(15,23,42,.20);
      }
      .a4-header {
        display: flex;
        justify-content: space-between;
        align-items: stretch;
        gap: ${isA4 ? '8px' : px(8, 5)};
        margin-bottom: ${isA4 ? '6px' : px(6, 4)};
        flex: 0 0 auto;
      }
      .h-left {
        flex: 1 1 auto;
        min-width: 0;
        overflow: visible;
      }
      .shop-name {
        margin: 0 0 ${isA4 ? '1px' : px(1, .5)} 0;
        padding-top: ${isA4 ? '3px' : px(3, 2)};
        padding-bottom: ${isA4 ? '2px' : px(2, 1)};
        font-family: 'Prompt', 'Sarabun', sans-serif;
        font-size: ${shopNameSize};
        font-weight: 800;
        line-height: 1.22;
        white-space: nowrap;
        letter-spacing: -0.3px;
      }
      .shop-address {
        margin: 0 0 ${isA4 ? '4px' : px(4, 2)} 0;
        font-size: ${shopAddressSize};
        line-height: 1.15;
        font-weight: 500;
        white-space: nowrap;
      }
      .contact-box {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: ${headerGap};
        margin-top: ${isA4 ? '6px' : px(6, 3)};
      }
      .line-qr {
        flex: 0 0 ${lineQrSize};
        width: ${lineQrSize};
        height: ${lineQrSize};
        border: ${lineQrBorder} solid #00c300;
        padding: 2px;
        border-radius: 4px;
        background: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .line-qr img, .bank-qr img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        display: block;
      }
      .contact-lines {
        min-height: ${lineQrSize};
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: ${isA4 ? '5px' : px(5, 3)};
        font-weight: 800;
        line-height: 1;
      }
      .contact {
        color: #b30000;
        font-size: ${contactSize};
        white-space: nowrap;
        display: flex;
        align-items: center;
        gap: ${isA4 ? '5px' : px(5, 3)};
      }
      .line-id {
        color: #00c300;
        font-size: ${lineIdSize};
        white-space: nowrap;
        font-weight: 850;
      }
      .h-right {
        flex: 0 0 ${isA4 ? '42mm' : mm(42, 28)};
        text-align: right;
        font-family: 'Prompt', 'Sarabun', sans-serif;
        padding-top: ${isA4 ? '3px' : px(3, 2)};
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: flex-end;
      }
      .doc-title {
        margin: 0;
        font-size: ${docTitleSize};
        font-weight: 800;
        line-height: 1.1;
        white-space: nowrap;
      }
      .doc-meta-block {
        margin-top: auto;
        font-size: ${docDateSize};
        font-weight: 750;
        white-space: nowrap;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: ${isA4 ? '2px' : px(2, 1)};
        text-align: right;
      }
      .doc-meta-block .write {
        color: ${writeInk};
        font-weight: 850;
      }
      .box {
        border: 1px solid ${border};
        border-radius: ${boxRadius};
        background: #fff;
      }
      .service-box {
        padding: ${isA4 ? '6px 12px' : `${px(6, 4)} ${px(12, 7)}`};
        margin-bottom: ${isA4 ? '6px' : px(6, 4)};
        font-size: ${serviceFont};
        font-weight: 700;
        line-height: 1.35;
      }
      .service-box span { font-weight: 500; }
      .customer-box {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        padding: ${isA4 ? '6px 12px' : `${px(6, 4)} ${px(12, 7)}`};
        margin-bottom: ${isA4 ? '7px' : px(7, 4)};
        font-size: ${customerFont};
        line-height: 1.35;
        font-weight: 800;
      }
      .customer-box > div {
        width: 50%;
        box-sizing: border-box;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .customer-box > div:nth-child(2n-1) {
        width: 58%;
        padding-right: 8px;
      }
      .customer-box > div:nth-child(2n) {
        width: 42%;
      }
      .write { color: ${writeInk}; font-weight: 700; }
      .table-wrap {
        flex: 1 1 auto;
        min-height: 0;
        overflow: hidden;
        border: 1px solid ${border};
        border-radius: 0;
        margin-bottom: ${isA4 ? '8px' : px(8, 5)};
        background: #fff;
      }
      table.receipt-table {
        width: 100%;
        height: 100%;
        border-collapse: collapse;
        table-layout: fixed;
      }
      .receipt-table th,
      .receipt-table td {
        border: 1px solid ${border};
        padding: ${isA4 ? '2px 4px' : `${px(2, 1)} ${px(4, 2)}`};
        vertical-align: middle;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .receipt-table th {
        height: ${tableHeaderHeight};
        background: #f0f0f0;
        text-align: center;
        font-size: ${tableHeaderFont};
        font-weight: 800;
        line-height: 1.15;
      }
      .receipt-table td {
        font-size: ${tableBodyFont};
        line-height: 1.05;
        font-weight: 600;
      }
      .c-center { text-align: center; }
      .c-number { color: ${printInk}; font-weight: 800; }
      .c-write, .c-item, .c-amount { color: ${writeInk}; font-weight: 700; }
      .c-item {
        text-align: center;
        white-space: nowrap;
      }
      .c-amount {
        text-align: right;
        padding-right: ${isA4 ? '8px' : px(8, 5)} !important;
        font-weight: 800;
        white-space: nowrap;
      }
      .footer {
        display: flex;
        flex-direction: row;
        width: 100%;
        gap: ${isA4 ? '16px' : px(16, 12)};
        margin-bottom: ${footerBottom};
        flex: 0 0 auto;
      }
      .footer-left {
        flex: 0 0 61%;
        width: 61%;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: ${isA4 ? '8px' : px(8, 5)};
      }
      .footer-right {
        flex: 0 0 39%;
        width: 39%;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: ${isA4 ? '8px' : px(8, 5)};
      }
      .beam-note {
        min-height: ${isA4 ? '54px' : px(54, 38)};
        border: 2px solid #dc3545;
        border-radius: ${boxRadius};
        background: #f8d7da;
        color: #721c24;
        padding: ${isA4 ? '8px 10px' : `${px(8, 5)} ${px(10, 6)}`};
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        font-size: ${beamFont};
        font-weight: 800;
        line-height: 1.25;
      }
      .warn-note {
        min-height: ${isA4 ? '96px' : px(96, 68)};
        border: 1px solid #666;
        border-radius: ${boxRadius};
        padding: ${isA4 ? '8px 12px' : `${px(8, 5)} ${px(12, 8)}`};
        font-size: ${warnFont};
        line-height: 1.25;
        overflow: hidden;
        background: #fff;
      }
      .warn-note b {
        color: #856404;
        font-size: ${warnTitleFont};
        display: block;
        margin-bottom: ${isA4 ? '2px' : px(2, 1)};
      }
      .total-box {
        min-height: ${isA4 ? '54px' : px(54, 38)};
        border: 2px solid ${border};
        border-radius: ${boxRadius};
        background: #f8f9fa;
        padding: ${isA4 ? '10px' : px(10, 6)};
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        font-size: ${totalFont};
        font-weight: 900;
        line-height: 1.1;
        white-space: nowrap;
      }
      .total-amount {
        color: #b91c1c;
        font-size: ${totalAmountFont};
        font-weight: 900;
        margin: 0 ${isA4 ? '5px' : px(5, 3)};
      }
      .bank-box {
        min-height: ${isA4 ? '96px' : px(96, 68)};
        border: 1px solid ${border};
        border-radius: ${boxRadius};
        padding: ${isA4 ? '8px 12px' : `${px(8, 5)} ${px(12, 8)}`};
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: ${isA4 ? '10px' : px(10, 6)};
        overflow: hidden;
        background: #fff;
      }
      .bank-details {
        flex: 1 1 auto;
        min-width: 0;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: ${isA4 ? '2px' : px(2, 1)};
        line-height: 1.2;
      }
      .bank-details p {
        margin: 0;
        white-space: nowrap;
        font-size: ${bankFont};
        font-weight: 800;
      }
      .bank-details .bank-no {
        font-size: ${bankNoFont};
        letter-spacing: .3px;
        font-family: Arial, 'Sarabun', sans-serif;
        font-weight: 900;
      }
      .bank-details .pink { color: #e3005f; }
      .bank-details .thanks {
        color: #d39e00;
        font-size: ${isA4 ? '13px' : px(13, 9.2)};
        font-weight: 850;
      }
      .bank-qr {
        flex: 0 0 ${bankQrSize};
        width: ${bankQrSize};
        height: ${bankQrSize};
        border: 1px solid ${border};
        padding: 2px;
        border-radius: 4px;
        background: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .signatures {
        display: flex;
        justify-content: space-between;
        margin-top: auto;
        padding-top: ${isA4 ? '8px' : px(8, 5)};
        flex: 0 0 auto;
      }
      .sign-box {
        width: 40%;
        text-align: center;
        font-size: ${isA4 ? '14px' : px(14, 9.5)};
        font-weight: 700;
        line-height: 1.2;
      }
      .sign-line {
        height: ${isA4 ? '26px' : px(26, 18)};
        border-bottom: 1px dashed ${border};
        margin-bottom: ${isA4 ? '5px' : px(5, 3)};
      }
      @media print {
        html, body { background: #fff; padding: 0; margin: 0; display: block; }
        .invoice-container {
          width: ${paperWidth};
          height: ${paperHeight};
          margin: 0;
          box-shadow: none;
          border: none;
          overflow: hidden;
        }
      }
    </style>
  </head>
  <body>
    <div class="invoice-container a4-paper" id="a4Content" data-jrk-template="apps-script-a4-port-v1">
      <div class="a4-header">
        <div class="h-left">
          <h1 class="shop-name">จีรกิตติ์ ไม้แบบพลาสติก อุตรดิตถ์</h1>
          <p class="shop-address">98/12 หมู่ 3 ต.ท่าเสา อ.เมือง จ.อุตรดิตถ์ 53000</p>
          <div class="contact-box">
            <div class="line-qr">
              <img crossorigin="anonymous" src="${LINE_QR_URL}" alt="LINE QR" />
            </div>
            <div class="contact-lines">
              <div class="contact">📞 <span>093-170-3949</span></div>
              <div class="contact">📞 <span>093-282-8517</span></div>
              <div class="line-id">ID Line : ${escapeHtml(shopSettings.LINE_ID || 'Tong_01.')}</div>
            </div>
          </div>
        </div>

        <div class="h-right">
          <div style="display: flex; flex-direction: column; align-items: flex-end;">
            <h2 class="doc-title">ใบส่งของ</h2>
            <h2 class="doc-title">ใบเสร็จรับเงิน</h2>
          </div>
          <div class="doc-meta-block">
            <div>เลขที่: <span class="write" style="font-family: monospace; font-size: ${isA4 ? '14.5px' : px(14.5, 10)}; font-weight: 900;">${escapeHtml(r.receipt_no || '-')}</span></div>
            <div>วันที่: ${thaiBuddhistDate}</div>
          </div>
        </div>
      </div>

      <div class="box service-box">
        <div>บริการให้เช่า : <span>ไม้แบบพลาสติก (แบบเสา, แบบเสาตอม่อ, แบบเสารั้ว, แบบคาน และนั่งร้าน)</span></div>
        <div>การบริการ : <span>- จัดส่งถึงที่ - แกะระยะแบบ(ฟรี) - รูปภาพแปลนระยะไม้แบบ(ฟรี)</span></div>
      </div>

      <div class="box customer-box">
        <div>ชื่อลูกค้า: <span class="write">${customerName}</span></div>
        <div>โทร: <span class="write">${customerPhone}</span></div>
        <div>ที่อยู่: <span class="write">${customerAddress}</span></div>
        <div>สถานที่จัดส่ง: <span class="write">${deliveryLocation}</span></div>
      </div>

      <div class="table-wrap">
        <table class="receipt-table">
          <colgroup>
            <col style="width:8%" />
            <col style="width:35%" />
            <col style="width:10%" />
            <col style="width:10%" />
            <col style="width:12%" />
            <col style="width:12%" />
            <col style="width:13%" />
          </colgroup>
          <thead>
            <tr>
              <th>ลำดับ</th>
              <th>รายการ (ขนาด/ระยะ)</th>
              <th>จำนวน</th>
              <th>หน่วย</th>
              <th>ราคาเช่า</th>
              <th>การเช่า</th>
              <th>จำนวนเงิน</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>

      <div class="footer">
        <div class="footer-left">
          <div class="beam-note">
            หมายเหตุ: ราคาแบบคำนวณตามความยาว (20 บาท/เมตร)<br/>
            แล้ว และแสดงเป็นราคาต่อแผ่น
          </div>
          <div class="warn-note">
            <b>⚠️ หมายเหตุ:</b>
            1. ห้ามดัดแปลง ตัดต่อ หรือเปลี่ยนตำแหน่งชิ้นส่วนเองโดยไม่ได้รับอนุญาต<br/>
            2. หากอุปกรณ์เสียหาย ผู้เช่าต้องรับผิดชอบตามสภาพจริง<br/>
            3. กรุณาไม่ตีตะปูเข้ากับไม้แบบพลาสติกโดยตรง<br/>
            4. โปรดตรวจสอบความสมบูรณ์ของสินค้าและอุปกรณ์ ณ วันที่รับมอบ
          </div>
        </div>

        <div class="footer-right">
          <div class="total-box">
            รวมทั้งสิ้น:<span class="total-amount">${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>บาท
          </div>
          <div class="bank-box">
            <div class="bank-details">
              <p>ธนาคาร: <span class="pink">ออมสิน</span></p>
              <p class="bank-no">020-4754-01020</p>
              <p>ชื่อบัญชี: จักรี เมืองสำนัก</p>
              <p class="thanks">🙏 ขอบคุณที่ใช้บริการ</p>
            </div>
            <div class="bank-qr">
              <img crossorigin="anonymous" src="${BANK_QR_URL || promptPayQrUrl}" alt="QR ธนาคาร" />
            </div>
          </div>
        </div>
      </div>

      <div class="signatures">
        <div class="sign-box">
          <div class="sign-line"></div>
          <div>ผู้รับสินค้า</div>
        </div>
        <div class="sign-box">
          <div class="sign-line"></div>
          <div>ผู้รับเงิน / ผู้อนุมัติ</div>
        </div>
      </div>
    </div>
  </body>
</html>
  `;
};

export const printReceipt = (
  r: any,
  mode: ReceiptPaperSize,
  shopSettings: any,
  copyType: ReceiptCopyType = 'original'
) => {
  const htmlContent = getReceiptPrintHtml(r, mode === 'A4', shopSettings, copyType);

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '10000px';
  iframe.style.bottom = '10000px';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);

  iframe.srcdoc = htmlContent;
  iframe.onload = () => {
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.error('Direct print failed', e);
      } finally {
        setTimeout(() => {
          if (iframe.parentNode) document.body.removeChild(iframe);
        }, 1000);
      }
    }, 350);
  };
};

export const downloadReceiptPdf = async (
  r: any,
  mode: ReceiptPaperSize,
  shopSettings: any,
  copyType: ReceiptCopyType = 'original'
) => {
  const htmlContent = getReceiptPrintHtml(r, mode === 'A4', shopSettings, copyType);
  const targetElement = createReceiptCaptureElement(htmlContent);
  const tempRoot = targetElement.parentElement as HTMLElement;

  await waitForImages(targetElement);

  const canvas = await html2canvas(targetElement, {
    scale: 2.2,
    useCORS: true,
    allowTaint: false,
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: targetElement.scrollWidth,
    windowHeight: targetElement.scrollHeight
  });

  document.body.removeChild(tempRoot);

  const pdfWidth = mode === 'A4' ? 210 : 148;
  const pdfHeight = mode === 'A4' ? 297 : 210;

  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: mode === 'A4' ? 'a4' : [148, 210],
    compress: true
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.94);
  doc.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
  doc.save(buildReceiptFileName(r, mode, 'pdf'));
};

export const downloadReceiptImage = async (
  r: any,
  mode: ReceiptPaperSize,
  shopSettings: any,
  copyType: ReceiptCopyType = 'original'
) => {
  const htmlContent = getReceiptPrintHtml(r, mode === 'A4', shopSettings, copyType);
  const targetElement = createReceiptCaptureElement(htmlContent);
  const tempRoot = targetElement.parentElement as HTMLElement;

  await waitForImages(targetElement);

  const canvas = await html2canvas(targetElement, {
    scale: 2,
    useCORS: true,
    allowTaint: false,
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: targetElement.scrollWidth,
    windowHeight: targetElement.scrollHeight
  });

  document.body.removeChild(tempRoot);

  const fileName = buildReceiptFileName(r, mode, 'png');

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) resolve(result);
      else reject(new Error('ไม่สามารถสร้างไฟล์ภาพ PNG ได้'));
    }, 'image/png');
  });

  const navAny = navigator as any;
  if (navAny.canShare && navAny.share) {
    const file = new File([blob], fileName, { type: 'image/png' });
    if (navAny.canShare({ files: [file] })) {
      await navAny.share({
        files: [file],
        title: fileName,
        text: fileName
      });
      return;
    }
  }

  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
};

export const ReceiptPaper: React.FC<{
  data: any;
  mode: ReceiptPaperSize;
  copyType: ReceiptCopyType;
  shopSettings: any;
}> = ({ data, mode, copyType, shopSettings }) => {
  const htmlDoc = getReceiptPrintHtml(data, mode === 'A4', shopSettings, copyType);
  return (
    <iframe
      srcDoc={htmlDoc}
      title="Live Receipt Preview Frame"
      className="w-full h-full border-0 bg-white pointer-events-auto"
      style={{ display: 'block', margin: '0', padding: '0', overflow: 'hidden' }}
    />
  );
};
