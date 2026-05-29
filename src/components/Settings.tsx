/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { JirakitDB } from '../db';
import { SystemSettings, Receipt } from '../types';
import { 
  Save, 
  Wrench, 
  BookOpen, 
  AlertCircle, 
  QrCode, 
  Copy, 
  Download, 
  Printer, 
  Check, 
  ExternalLink,
  ChevronRight,
  User,
  DollarSign
} from 'lucide-react';
import QRCode from 'qrcode';

interface SettingsProps {
  refreshCount: number;
  triggerRefresh: () => void;
}

export default function Settings({ refreshCount, triggerRefresh }: SettingsProps) {
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  // Form Fields
  const [shopName, setShopName] = useState('');
  const [shopAddr, setShopAddr] = useState('');
  const [shopPhone, setShopPhone] = useState('');
  const [taxId, setTaxId] = useState('');
  const [vatRate, setVatRate] = useState(7);
  const [penaltyRate, setPenaltyRate] = useState(1.5);
  const [lineQr, setLineQr] = useState('');
  const [bankQr, setBankQr] = useState('');
  const [warningText, setWarningText] = useState('');
  const [footnote, setFootnote] = useState('');

  // Interactive QR Generator State
  const [allReceipts, setAllReceipts] = useState<Receipt[]>([]);
  const [selectedReceiptNo, setSelectedReceiptNo] = useState<string>('');
  const [qrType, setQrType] = useState<'contract' | 'payment' | 'line'>('contract');
  const [customUrl, setCustomUrl] = useState<string>('');
  const [qrData, setQrData] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const s = JirakitDB.getSettings();
    setSettings(s);
    setShopName(s.SHOP_NAME);
    setShopAddr(s.SHOP_ADDRESS);
    setShopPhone(s.SHOP_TELEPHONE);
    setTaxId(s.TAX_ID);
    setVatRate(s.VAT_RATE);
    setPenaltyRate(s.PENALTY_RATE);
    setLineQr(s.LINE_QR_URL);
    setBankQr(s.BANK_QR_URL);
    setWarningText(s.RECEIPT_WARNING);
    setFootnote(s.RECEIPT_FOOTNOTE);

    // Load receipts for generator selection
    const receipts = JirakitDB.getReceipts();
    setAllReceipts(receipts);
    if (receipts.length > 0) {
      setSelectedReceiptNo(receipts[0].receipt_no);
    }
  }, [refreshCount]);

  // Handle auto generation of QR payload
  useEffect(() => {
    let data = '';
    if (qrType === 'line') {
      data = lineQr || 'https://line.me/R/ti/p/@jirakit';
    } else if (qrType === 'contract') {
      if (selectedReceiptNo) {
        data = `https://jirakit-biz-flow.base44.app/contracts?no=${selectedReceiptNo}`;
      } else {
        data = `https://jirakit-biz-flow.base44.app/contracts`;
      }
    } else if (qrType === 'payment') {
      const selectedRec = allReceipts.find(r => r.receipt_no === selectedReceiptNo);
      const amount = selectedRec ? selectedRec.grand_total : 0;
      // Generate promptpay payload format
      data = `https://promptpay.io/0812345678/${amount}`;
    }

    if (customUrl) {
      data = customUrl;
    }
    setQrData(data);
  }, [selectedReceiptNo, qrType, customUrl, allReceipts, lineQr]);

  // Redraw QR Code Canvas
  useEffect(() => {
    if (qrCanvasRef.current && qrData) {
      QRCode.toCanvas(
        qrCanvasRef.current,
        qrData,
        {
          width: 220,
          margin: 1.5,
          color: {
            dark: '#020617', // Very dark slate for excellent readability
            light: '#ffffff' // Crisp white background
          }
        },
        (err) => {
          if (err) console.error('Error generating QR Canvas:', err);
        }
      );
    }
  }, [qrData]);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    JirakitDB.saveSettings({
      SHOP_NAME: shopName,
      SHOP_ADDRESS: shopAddr,
      SHOP_TELEPHONE: shopPhone,
      TAX_ID: taxId,
      VAT_RATE: Number(vatRate),
      PENALTY_RATE: Number(penaltyRate),
      LINE_QR_URL: lineQr,
      BANK_QR_URL: bankQr,
      RECEIPT_WARNING: warningText,
      RECEIPT_FOOTNOTE: footnote,
      VAT_MODE: settings.VAT_MODE,
      RECEIPT_PAPER_SIZE: settings.RECEIPT_PAPER_SIZE
    });
    alert('บันทึกค่าระบบ ERP จีรกิตติ์ ไม้แบบสำเร็จเรียบร้อย!');
    triggerRefresh();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(qrData);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQr = () => {
    if (qrCanvasRef.current) {
      const link = document.createElement('a');
      link.download = `QR_${qrType}_${selectedReceiptNo || 'custom'}.png`;
      link.href = qrCanvasRef.current.toDataURL('image/png');
      link.click();
    }
  };

  const handlePrintCoupon = () => {
    const selectedRec = allReceipts.find(r => r.receipt_no === selectedReceiptNo);
    const win = window.open('', '_blank');
    if (!win) return;

    const qrImageSrc = qrCanvasRef.current ? qrCanvasRef.current.toDataURL('image/png') : '';

    win.document.write(`
      <html>
        <head>
          <title>คูปอง คิวอาร์โค้ด - ${selectedReceiptNo}</title>
          <style>
            body { font-family: 'Prompt', 'Noto Sans Thai', sans-serif; text-align: center; padding: 20px; color: #333; }
            .coupon { border: 2px dashed #333; padding: 25px; max-width: 380px; margin: 0 auto; border-radius: 10px; }
            h1 { font-size: 18px; margin: 0 0 5px 0; font-weight: bold; }
            p { font-size: 11px; color: #666; margin: 2px 0; }
            .qr-container { margin: 15px 0; }
            .qr-img { width: 180px; height: 180px; }
            .details { font-size: 12px; font-weight: bold; text-align: left; background: #f9f9f9; padding: 10px; margin-top: 15px; border-radius: 6px; }
            .line { border-bottom: 1px dotted #ccc; margin: 8px 0; }
            .footer { font-size: 9px; color: #a0a0a0; margin-top: 15px; text-transform: uppercase; }
          </style>
        </head>
        <body onload="window.print()">
          <div class="coupon">
            <h1>${shopName}</h1>
            <p>ระบบ POS & ERP จัดเตรียมและเช่าอุปกรณ์ก่อสร้าง</p>
            <p>โทร. ${shopPhone}</p>
            <div class="line"></div>
            
            <p style="font-weight: bold; color: #000; font-size: 13px; margin: 10px 0 5px 0;">
              ${qrType === 'contract' ? 'ตรวจสอบสัญญาเช่า' : qrType === 'payment' ? 'สแกนเพื่อชำระค่าเช่าวัสดุ' : 'แอดไลน์เพื่อส่งงานคลัง'}
            </p>
            
            <div class="qr-container">
              <img class="qr-img" src="${qrImageSrc}" />
            </div>
            
            <p style="font-size: 10px; color: #555; word-break: break-all;">${qrData}</p>
            
            ${selectedRec ? `
              <div class="details">
                <div>ลูกค้า: ${selectedRec.customer_name}</div>
                <div>เลขที่เอกสาร: ${selectedRec.receipt_no}</div>
                <div class="line"></div>
                <div>ยอดรวมทั้งสิ้น: ฿${selectedRec.grand_total.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</div>
                <div>ยอดค้างชำระ: ฿${selectedRec.debt_amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</div>
              </div>
            ` : ''}
            
            <div class="footer">
              ขอบคุณที่เลือกใช้บริการ จีรกิตติ์ ไม้แบบพลาสติก
            </div>
          </div>
        </body>
      </html>
    `);
    win.document.close();
  };

  const selectedRec = allReceipts.find(r => r.receipt_no === selectedReceiptNo);

  return (
    <div className="space-y-6">
      <div className="bg-[#1e293b] border border-slate-800/85 rounded-xl p-6 shadow-md space-y-6">
        
        {/* Header Title */}
        <div className="border-b border-slate-805 pb-4">
          <h2 className="text-xl font-black text-[#f8fafc] uppercase tracking-tight flex items-center gap-2">
            <Wrench className="stroke-[#fbbf24]" size={22} />
            ตั้งค่าระบบ POS & ERP จีรกิตติ์ ไม้แบบ
          </h2>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">
            กำหนดข้อมูลพารามิเตอร์ค้ำประกันของสัญญาจดเช่า และ QR Code ในใบเสร็จของระบบจัดส่งแบบเหล็ก/แบบพลาสติก
          </p>
        </div>

        {/* Input Form Fields */}
        <form onSubmit={handleSaveSettings} className="space-y-6 text-xs font-bold text-slate-300">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Store Information */}
            <div className="p-5 border border-slate-800/90 rounded-xl bg-[#0f172a]/45 space-y-4">
              <h3 className="text-sm font-black text-[#fbbf24] flex items-center gap-1.5 pb-2.5 border-b border-slate-800">
                <Wrench className="stroke-[#fbbf24]" size={15} /> ข้อมูลร้านค้าหลักและทะเบียนสากล
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-slate-400 mb-1.5 uppercase tracking-wide">ชื่อร้านปล่อยเช่าหลัก *</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-[#1e293b] border border-slate-750 rounded-lg px-3.5 h-10 text-white focus:outline-none focus:border-[#fbbf24]"
                    value={shopName}
                    onChange={e => setShopName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1.5 uppercase tracking-wide">ที่อยู่วางจัดตั้งร้านดั้งเดิม *</label>
                  <textarea
                    required
                    className="w-full bg-[#1e293b] border border-slate-750 rounded-lg p-3 h-20 text-white focus:outline-none focus:border-[#fbbf24] resize-none"
                    value={shopAddr}
                    onChange={e => setShopAddr(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-slate-400 mb-1.5 uppercase tracking-wide">เบอร์ติดต่อกรณีด่วน</label>
                    <input
                      type="text"
                      className="w-full bg-[#1e293b] border border-slate-750 rounded-lg px-3.5 h-10 text-white focus:outline-none focus:border-[#fbbf24]"
                      value={shopPhone}
                      onChange={e => setShopPhone(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1.5 uppercase tracking-wide">เลขจดทะเบียนพาณิชย์/ภาษี</label>
                    <input
                      type="text"
                      className="w-full bg-[#1e293b] border border-slate-750 rounded-lg px-3.5 h-10 text-white focus:outline-none focus:border-[#fbbf24]"
                      value={taxId}
                      onChange={e => setTaxId(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Multipliers */}
            <div className="p-5 border border-slate-800/90 rounded-xl bg-[#0f172a]/45 space-y-4">
              <h3 className="text-sm font-black text-[#fbbf24] flex items-center gap-1.5 pb-2.5 border-b border-slate-800">
                <AlertCircle className="stroke-[#fbbf24]" size={15} /> พารามิเตอร์คํานวณดอกเบี้ยหนี้สิน
              </h3>

              <div className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-slate-400 mb-1.5 uppercase tracking-wide">อัตราภาษีมูลค่าเพิ่ม (%) *</label>
                    <input
                      type="number"
                      required
                      className="w-full bg-[#1e293b] border border-slate-755 rounded-lg px-3.5 h-10 text-right font-black text-[#fbbf24] focus:outline-none focus:border-[#fbbf24]"
                      value={vatRate}
                      onChange={e => setVatRate(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1.5 uppercase tracking-wide">ค่าปรับเลยกำหนดต่อวัน (%) *</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      className="w-full bg-[#1e293b] border border-slate-755 rounded-lg px-3.5 h-10 text-right font-black text-rose-450 focus:outline-none focus:border-rose-500"
                      value={penaltyRate}
                      onChange={e => setPenaltyRate(Number(e.target.value))}
                    />
                  </div>
                </div>
                <div className="text-[10px] text-slate-450 italic font-medium -mt-1.5">
                  * โดยทั่วไปคิดเทียบเป็น 1.5% ของมูลค่าสินค้าที่เช่าต่อชิ้น เพื่อความสมเหตุสมผลเชิงพาณิชย์
                </div>

                <div>
                  <label className="block text-slate-400 mb-1.5 uppercase tracking-wide">ลิงก์และไอดีไลน์ร้าน (สแกนเพื่อสั่งของ / คืนส่งงาน)</label>
                  <input
                    type="text"
                    className="w-full bg-[#1e293b] border border-slate-750 rounded-lg px-3.5 h-10 text-white font-mono text-xs focus:outline-none focus:border-[#fbbf24]"
                    placeholder="https://line.me/ti/p/..."
                    value={lineQr}
                    onChange={e => setLineQr(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1.5 uppercase tracking-wide">ลิงก์ธนาคาร / พร้อมเพย์สยาม สำหรับชำระเงินด่วน</label>
                  <input
                    type="text"
                    className="w-full bg-[#1e293b] border border-slate-750 rounded-lg px-3.5 h-10 text-white font-mono text-xs focus:outline-none focus:border-[#fbbf24]"
                    placeholder="https://promptpay.io/..."
                    value={bankQr}
                    onChange={e => setBankQr(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Contract Footers */}
            <div className="lg:col-span-2 p-5 border border-slate-800/90 rounded-xl bg-[#0f172a]/45 space-y-4">
              <h3 className="text-sm font-black text-[#fbbf24] flex items-center gap-1.5 pb-2.5 border-b border-slate-800">
                <BookOpen className="stroke-[#fbbf24]" size={15} /> เงื่อนไขกฎระเบียบและข้อความท้ายใบส่งมอบ
              </h3>

              <div className="space-y-3.5">
                <div>
                  <label className="block text-slate-400 mb-1.5 uppercase tracking-wide">ข้อความเตือนหัวใจสำคัญของสัญญาการเช่า (พิมพ์เน้นสีแดง)</label>
                  <input
                    type="text"
                    className="w-full bg-[#1e293b] border border-slate-750 rounded-lg px-3.5 h-10 text-rose-400 font-extrabold focus:outline-none focus:border-[#fbbf24]"
                    value={warningText}
                    onChange={e => setWarningText(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1.5 uppercase tracking-wide">หมายเหตุทั่วไปและกฎทางปฏิบัติหลังรับวัสดุเช่า</label>
                  <textarea
                    className="w-full bg-[#1e293b] border border-slate-750 rounded-lg p-3 h-20 text-white focus:outline-none focus:border-[#fbbf24] resize-none"
                    value={footnote}
                    onChange={e => setFootnote(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-805">
            <button
              type="submit"
              className="py-3 px-8 bg-[#fbbf24] hover:bg-amber-500 text-black font-black rounded-lg text-xs tracking-wider uppercase shadow-md flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.01]"
            >
              <Save size={14} /> ✓ บันทึกปรับตั้งค่าระบบ ERP
            </button>
          </div>
        </form>
      </div>

      {/* DYNAMIC QR CODE INTERACTIVE CLIENT MULTI-TOOL */}
      <div className="bg-[#1e293b] border border-slate-800/85 rounded-xl p-6 shadow-md space-y-6">
        <div className="border-b border-slate-805 pb-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black text-[#f8fafc] uppercase tracking-tight flex items-center gap-2">
              <QrCode className="stroke-[#fbbf24]" size={22} />
              เครื่องมือสร้าง QR Code สัญญา & แบบพิมพ์ฟอร์มชำระเงิน
            </h2>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">
              บริการรองรับลูกค้าหน้างานด่วน: เลือกบิลในระบบแล้วสร้าง QR ดึงรายละเอียดชำระเงินหรือสถานะรับของได้ทันที
            </p>
          </div>
          <span className="text-[10px] bg-slate-900 border border-slate-850 px-2.5 py-1 text-[#fbbf24] font-mono rounded tracking-widest font-black uppercase">
            CLIENT QR HUB
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Controls side */}
          <div className="md:col-span-7 bg-[#0f172a]/50 p-5 rounded-xl border border-slate-800/70 space-y-4 text-xs font-bold text-slate-350">
            <div>
              <label className="block text-slate-400 mb-1.5 uppercase tracking-wide">1. เลือกประเภทการทำงานคิวอาร์</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => { setQrType('contract'); setCustomUrl(''); }}
                  className={`py-2 px-3 rounded text-center font-bold tracking-wide transition-all uppercase border cursor-pointer ${
                    qrType === 'contract'
                      ? 'bg-[#fbbf24] text-black border-[#fbbf24]'
                      : 'bg-[#1e293b] text-slate-300 border-slate-750 hover:bg-slate-800'
                  }`}
                >
                  ลิงก์ตรวจสอบสัญญา
                </button>
                <button
                  type="button"
                  onClick={() => { setQrType('payment'); setCustomUrl(''); }}
                  className={`py-2 px-3 rounded text-center font-bold tracking-wide transition-all uppercase border cursor-pointer ${
                    qrType === 'payment'
                      ? 'bg-[#fbbf24] text-black border-[#fbbf24]'
                      : 'bg-[#1e293b] text-slate-300 border-slate-750 hover:bg-slate-800'
                  }`}
                >
                  พร้อมเพย์ชำระค่าเช่า
                </button>
                <button
                  type="button"
                  onClick={() => { setQrType('line'); setCustomUrl(''); }}
                  className={`py-2 px-3 rounded text-center font-bold tracking-wide transition-all uppercase border cursor-pointer ${
                    qrType === 'line'
                      ? 'bg-[#fbbf24] text-black border-[#fbbf24]'
                      : 'bg-[#1e293b] text-slate-300 border-slate-750 hover:bg-slate-800'
                  }`}
                >
                  แอดไลน์ติดต่อร้าน
                </button>
              </div>
            </div>

            {qrType !== 'line' && (
              <div>
                <label className="block text-slate-400 mb-1.5 uppercase tracking-wide">2. เลือกสัญญา / บิลเช่าเอกสารปลายทาง</label>
                {allReceipts.length === 0 ? (
                  <div className="p-3 bg-rose-950/20 text-rose-350 border border-rose-900 text-[11px] rounded">
                    ไม่พบประวัติบิลในระบบ กรุณาสร้างสัญญาเช่าใหม่ในหน้า [ขาย/เช่า POS] เพื่อประมวลผลคิวอาร์โค้ดสากล
                  </div>
                ) : (
                  <select
                    className="w-full bg-[#1e293b] border border-slate-750 rounded-lg p-2.5 text-white text-xs focus:outline-none focus:border-[#fbbf24] h-10 font-bold"
                    value={selectedReceiptNo}
                    onChange={e => {
                      setSelectedReceiptNo(e.target.value);
                      setCustomUrl('');
                    }}
                  >
                    {allReceipts.map(r => (
                      <option key={r.receipt_id} value={r.receipt_no} className="bg-[#1e293b] text-white">
                        {r.receipt_no} - {r.customer_name} ({r.payment_status} | ฿{r.grand_total.toLocaleString()})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-slate-400 uppercase tracking-wide">3. ลิงก์จุดเชื่อมต่อข้อมูลคิวอาร์โค้ด (QR Payload Link)</label>
                <span className="text-[9.5px] italic text-[#fbbf24] font-medium">คลังอัพเดทอัตโนมัติ</span>
              </div>
              <input
                type="text"
                className="w-full bg-[#1e293b] border border-slate-750 rounded-lg px-3 h-10 text-slate-320 font-mono text-xs focus:outline-none focus:border-[#fbbf24]"
                placeholder="พิมพ์ลิงก์กำหนดเองที่นี่ หากไม่ใช้ตัวช่วยสร้างหลัก..."
                value={customUrl || qrData}
                onChange={e => setCustomUrl(e.target.value)}
              />
            </div>

            {/* Contract info card snippet */}
            {selectedRec && qrType !== 'line' && (
              <div className="p-3.5 bg-slate-900 rounded-lg border border-slate-850 space-y-2 mt-4">
                <div className="text-[10px] uppercase font-black tracking-wider text-[#fbbf24] border-b border-slate-800 pb-1 flex items-center justify-between">
                  <span>ข้อมูลลูกค้าและการค้างรับ</span>
                  <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-bold ${
                    selectedRec.payment_status === 'ชำระครบ' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/40' : 'bg-rose-950 text-rose-450 border border-rose-900/40'
                  }`}>
                    {selectedRec.payment_status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-300">
                  <div className="flex items-center gap-1">
                    <User size={12} className="text-slate-500" />
                    <span>ลูกค้า: <strong className="text-white">{selectedRec.customer_name}</strong></span>
                  </div>
                  <div>
                    <span>เลขที่บิล: <strong className="text-slate-200 font-mono">{selectedRec.receipt_no}</strong></span>
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign size={12} className="text-emerald-500" />
                    <span>ยอดรวมสุทธิ: <strong className="text-[#fbbf24]">฿{selectedRec.grand_total.toLocaleString()}</strong></span>
                  </div>
                  <div>
                    <span>ค้างบิล: <strong className="text-rose-400">฿{selectedRec.debt_amount.toLocaleString()}</strong></span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* QR Display bento side */}
          <div className="md:col-span-5 flex flex-col items-center justify-center bg-[#1e293b] p-5 rounded-xl border border-slate-800/80 shadow-inner space-y-4">
            <div className="text-[11px] font-black uppercase text-[#fbbf24] text-center tracking-widest">
              {qrType === 'contract' ? 'คิวอาร์ดูสัญญาเช่า' : qrType === 'payment' ? 'สแกนจ่ายผ่านพร้อมเพย์' : 'LINE OFFICIAL QR CODE'}
            </div>

            <div className="p-4 bg-white rounded-xl shadow-lg border border-slate-200 flex items-center justify-center">
              <canvas ref={qrCanvasRef} className="w-[180px] h-[180px]" />
            </div>

            <div className="text-center space-y-1 w-full px-2">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">เนื้อหาโค้ดปัจจุบัน:</div>
              <p className="text-[10.5px] font-mono text-slate-200 break-all bg-slate-900/60 py-1.5 px-2.5 rounded border border-slate-850 truncate max-w-full">
                {qrData}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 w-full pt-1">
              <button
                type="button"
                onClick={handleCopyLink}
                className="py-2.5 px-3 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white rounded text-[11px] font-extrabold flex items-center justify-center gap-1 transition-all cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check size={12} className="text-emerald-400" />
                    <span>✓ คัดลอกแล้ว</span>
                  </>
                ) : (
                  <>
                    <Copy size={12} className="text-[#fbbf24]" />
                    <span>คัดลอกลิงก์</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDownloadQr}
                className="py-2.5 px-3 bg-slate-950 border border-slate-800 hover:bg-slate-800 text-white rounded text-[11px] font-extrabold flex items-center justify-center gap-1 transition-all cursor-pointer"
              >
                <Download size={12} className="text-[#fbbf24]" />
                <span>ดาวน์โหลด QR</span>
              </button>

              <button
                type="button"
                onClick={handlePrintCoupon}
                className="col-span-2 py-2.5 px-4 bg-[#fbbf24] hover:bg-amber-500 text-black rounded text-[11px] font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer uppercase tracking-wider shadow-sm"
              >
                <Printer size={13} className="text-black" />
                พิมพ์คูปองคิวอาร์โค้ดหน้าร้าน
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
