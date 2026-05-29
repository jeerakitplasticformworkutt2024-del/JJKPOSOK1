/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { JirakitDB } from '../db';
import { Receipt } from '../types';
import { Search, Printer, FileText, CheckCircle, Clock, Share2, Link, X, Download, Calendar, Eye } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { printReceipt, downloadReceiptPdf, downloadReceiptImage, getReceiptPrintHtml } from '../utils/receiptHelper';

interface BillsProps {
  refreshCount: number;
  applyDateFilter: boolean;
  setApplyDateFilter: (val: boolean) => void;
  startDate: string;
  setStartDate: (val: string) => void;
  endDate: string;
  setEndDate: (val: string) => void;
}

export default function Bills({ 
  refreshCount, 
  applyDateFilter, 
  setApplyDateFilter, 
  startDate, 
  setStartDate, 
  endDate, 
  setEndDate 
}: BillsProps) {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [sharingReceipt, setSharingReceipt] = useState<Receipt | null>(null);

  // Document Preview Feature States
  const [previewReceipt, setPreviewReceipt] = useState<Receipt | null>(null);
  const [previewIsA4, setPreviewIsA4] = useState<boolean>(true);
  const [isSavingPreviewImage, setIsSavingPreviewImage] = useState(false);
  const [isSavingPreviewPdf, setIsSavingPreviewPdf] = useState(false);
  const [isPrintingPreview, setIsPrintingPreview] = useState(false);
  const [previewActionMessage, setPreviewActionMessage] = useState('');

  const getPreviewMode = (): 'A4' | 'A5' => (previewIsA4 ? 'A4' : 'A5');
  const isPreviewActionBusy = isSavingPreviewImage || isSavingPreviewPdf || isPrintingPreview;

  // Dynamic reprint feature states
  const [reprintModalOpen, setReprintModalOpen] = useState(false);
  const [reprintReceiptId, setReprintReceiptId] = useState<string>('');
  const [reprintPaperSize, setReprintPaperSize] = useState<'A4' | 'A5'>('A4');
  const [reprintSearchQuery, setReprintSearchQuery] = useState('');

  useEffect(() => {
    // Show newest first
    setReceipts(JirakitDB.getReceipts().slice().reverse());
  }, [refreshCount]);

  const filteredBills = receipts.filter(r => {
    const query = searchQuery.toLowerCase();
    
    // Apply shared date filter conditions matching receipt dates
    const docDateStr = (r.created_at || r.receipt_date || '').slice(0, 10);
    const inDateRange = !applyDateFilter || (startDate <= docDateStr && docDateStr <= endDate);
    if (!inDateRange) return false;

    return r.receipt_no.toLowerCase().includes(query) ||
           r.customer_name.toLowerCase().includes(query) ||
           (r.phone && r.phone.includes(query));
  });

  const handleDownloadPDF = async (r: Receipt, paperMode?: 'A4' | 'A5') => {
    try {
      const shopSettings = JirakitDB.getSettings();
      const mode = paperMode || (shopSettings.RECEIPT_PAPER_SIZE === 'A4' ? 'A4' : 'A5');
      await downloadReceiptPdf(r, mode, shopSettings);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('เกิดข้อผิดพลาดในการสร้างไฟล์ PDF กรุณาลองใหม่อีกครั้ง');
    }
  };

  const handleSavePreviewImage = async () => {
    if (!previewReceipt) return;

    const mode = getPreviewMode();

    try {
      setIsSavingPreviewImage(true);
      setPreviewActionMessage(`กำลังบันทึกภาพบิล ${mode}...`);

      const shopSettings = JirakitDB.getSettings();

      await downloadReceiptImage(previewReceipt, mode, shopSettings);

      setPreviewActionMessage(`บันทึกภาพบิล ${mode} สำเร็จ`);
    } catch (err) {
      console.error('Error saving receipt image:', err);
      setPreviewActionMessage('บันทึกภาพบิลไม่สำเร็จ กรุณาลองใหม่');
      alert('เกิดข้อผิดพลาดในการบันทึกภาพบิล กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSavingPreviewImage(false);
      setTimeout(() => setPreviewActionMessage(''), 2200);
    }
  };

  const handleSavePreviewPdf = async () => {
    if (!previewReceipt) return;

    const mode = getPreviewMode();

    try {
      setIsSavingPreviewPdf(true);
      setPreviewActionMessage(`กำลังบันทึก PDF ${mode}...`);

      const shopSettings = JirakitDB.getSettings();

      await downloadReceiptPdf(previewReceipt, mode, shopSettings);

      setPreviewActionMessage(`บันทึก PDF ${mode} สำเร็จ`);
    } catch (err) {
      console.error('Error saving receipt PDF:', err);
      setPreviewActionMessage('บันทึก PDF ไม่สำเร็จ กรุณาลองใหม่');
      alert('เกิดข้อผิดพลาดในการบันทึก PDF กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSavingPreviewPdf(false);
      setTimeout(() => setPreviewActionMessage(''), 2200);
    }
  };

  const handlePrintPreviewReceipt = async () => {
    if (!previewReceipt) return;

    const mode = getPreviewMode();

    try {
      setIsPrintingPreview(true);
      setPreviewActionMessage(`กำลังเปิดหน้าพิมพ์ ${mode}...`);

      const shopSettings = JirakitDB.getSettings();

      await new Promise(resolve => setTimeout(resolve, 250));
      printReceipt(previewReceipt, mode, shopSettings);

      setPreviewActionMessage(`ส่งคำสั่งพิมพ์ ${mode} แล้ว`);
    } catch (err) {
      console.error('Error printing receipt:', err);
      setPreviewActionMessage('พิมพ์ใบเสร็จไม่สำเร็จ กรุณาลองใหม่');
      alert('เกิดข้อผิดพลาดในการพิมพ์ใบเสร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setTimeout(() => {
        setIsPrintingPreview(false);
        setPreviewActionMessage('');
      }, 1200);
    }
  };

  const handleExportBillsToPDF = async () => {
    if (filteredBills.length === 0) {
      alert('ไม่พบรายการบิลที่ต้องการส่งออกเอกสารในช่วงเวลาหรือคำค้นนี้');
      return;
    }

    try {
      const shopSettings = JirakitDB.getSettings();
      
      const totalGrand = filteredBills.reduce((sum, r) => sum + r.grand_total, 0);
      const totalPaid = filteredBills.reduce((sum, r) => sum + r.paid_amount, 0);
      const totalDebt = filteredBills.reduce((sum, r) => sum + r.debt_amount, 0);

      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'fixed';
      tempDiv.style.left = '-10000px';
      tempDiv.style.top = '-10000px';
      tempDiv.style.zIndex = '-9999';
      tempDiv.style.opacity = '0';
      tempDiv.style.pointerEvents = 'none';
      tempDiv.style.width = '1000px';
      tempDiv.style.backgroundColor = '#ffffff';

      const tableRowsHtml = filteredBills.map((r, idx) => {
        const dateStr = new Date(r.created_at || r.receipt_date || '').toLocaleDateString('th-TH');
        const hasDebt = r.debt_amount > 0;
        
        return `
          <tr style="border-bottom: 1px solid #e2e8f0; font-size: 13px; height: 48px;">
            <td style="padding: 10px 15px; text-align: center; color: #64748b; font-weight: bold;">${idx + 1}</td>
            <td style="padding: 10px; font-weight: 800; color: #1e293b;">
              <div style="font-size: 14px; text-transform: uppercase;">${r.receipt_no}</div>
              <div style="font-size: 10px; color: #94a3b8; margin-top: 2px;">ประเภท: ${r.doc_type || 'บิลขาย'}</div>
            </td>
            <td style="padding: 10px; color: #334155; font-size: 13px;">${dateStr}</td>
            <td style="padding: 10px; color: #1e293b; font-weight: 750;">
              <div>${r.customer_name}</div>
              ${r.phone ? `<div style="font-size: 10px; color: #64748b; font-family: monospace; font-weight: normal; margin-top: 2px;">โทร: ${r.phone}</div>` : ''}
            </td>
            <td style="padding: 10px; text-align: right; font-weight: bold; font-size: 14px; color: #0f172a;">
              ฿${r.grand_total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
            <td style="padding: 10px; text-align: right; font-weight: bold; font-size: 14px; color: #059669;">
              ฿${r.paid_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
            <td style="padding: 10px 15px; text-align: right; font-weight: 800; font-size: 14px; color: ${hasDebt ? '#dc2626' : '#64748b'};">
              ฿${r.debt_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
          </tr>
        `;
      }).join('');

      const filterDescription = applyDateFilter 
        ? `ช่วงวันที่ ${startDate} ถึง ${endDate}` 
        : 'ทั้งหมด (ทุกช่วงเวลานำส่ง)';

      const searchDescription = searchQuery 
        ? `ระบุคำค้นหา: "${searchQuery}"` 
        : 'ไม่ได้ระบุคำค้นหาเพิ่มเติม';

      tempDiv.innerHTML = `
        <div style="padding: 50px 60px; font-family: 'Sarabun', 'Inter', system-ui, sans-serif; background-color: #ffffff; color: #1e293b; line-height: 1.5; -webkit-print-color-adjust: exact; print-color-adjust: exact; width: 1000px; box-sizing: border-box;">
          
          <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #9b1313; padding-bottom: 30px; margin-bottom: 35px;">
            <div style="text-align: left;">
              <h1 style="font-size: 28px; font-weight: 800; color: #9b1313; margin: 0 0 8px 0; letter-spacing: -0.5px;">รายงานสรุปประวัติการออกบิลและยอดค้างชำระ</h1>
              <p style="font-size: 15px; font-weight: 700; color: #475569; margin: 0 0 6px 0;">ผู้ประกอบการ: ${shopSettings.SHOP_NAME || 'จิรกิตติ์ แบบเหล็กพลาสติก'}</p>
              <p style="font-size: 12px; color: #64748b; margin: 0 0 4px 0;">ที่อยู่ติดต่อ: ${shopSettings.SHOP_ADDRESS || '-'}</p>
              <p style="font-size: 12px; color: #64748b; margin: 0;">โทร: ${shopSettings.SHOP_TELEPHONE || '-'}</p>
            </div>
            
            <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end;">
              <div style="background-color: #9b1313; color: white; border-radius: 12px; padding: 10px 20px; font-size: 15px; font-weight: bold; box-shadow: 0 4px 6px -1px rgba(155, 19, 19, 0.1);">
                บิลทั้งหมด: ${filteredBills.length} รายการ
              </div>
              <p style="font-size: 11px; color: #94a3b8; font-weight: 700; margin-top: 10px; margin-bottom: 0;">วันที่ประมวลผลคำสั่ง: ${new Date().toLocaleString('th-TH')}</p>
            </div>
          </div>

          <div style="background-color: #fffbfb; border: 1.5px dashed #feca34; border-radius: 12px; padding: 16px 20px; margin-bottom: 35px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div style="text-align: left;">
              <span style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #94a3b8; display: block; margin-bottom: 4px;">ขอบเขตตามการคัดเลือกตัวกรองเวลา (Date Filter)</span>
              <span style="font-size: 13px; font-weight: 750; color: #334155;">${filterDescription}</span>
            </div>
            <div style="text-align: left;">
              <span style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #94a3b8; display: block; margin-bottom: 4px;">ขอบเขตตามรหัสบิลหรือชื่อสินค้า (Search Terms)</span>
              <span style="font-size: 13px; font-weight: 750; color: #334155;">${searchDescription}</span>
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px; text-align: left;">
            <thead>
              <tr style="background-color: #9b1313; color: #ffffff; height: 45px;">
                <th style="padding: 10px 15px; border-top-left-radius: 10px; border-bottom-left-radius: 10px; text-align: center; font-size: 13px; font-weight: bold; width: 60px;">ลำดับ</th>
                <th style="padding: 10px; font-size: 13px; font-weight: bold;">เลขที่ใบเสร็จ / บิล</th>
                <th style="padding: 10px; font-size: 13px; font-weight: bold; width: 110px;">วันที่ออกบิล</th>
                <th style="padding: 10px; font-size: 13px; font-weight: bold;">ชื่อข้อมูลคู่สัญญาลูกค้าคู่ค้า</th>
                <th style="padding: 10px; text-align: right; font-size: 13px; font-weight: bold; width: 140px;">ยอดรวมสุทธิ</th>
                <th style="padding: 10px; text-align: right; font-size: 13px; font-weight: bold; width: 140px;">ยอดรับเงินชำระ</th>
                <th style="padding: 10px 15px; text-align: right; font-size: 13px; font-weight: bold; border-top-right-radius: 10px; border-bottom-right-radius: 10px; width: 140px;">ยอดค้างจ่าย</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>

          <div style="display: flex; justify-content: flex-end; margin-bottom: 40px;">
            <div style="width: 450px; background-color: #fafafa; border: 1px solid #f1f5f9; border-radius: 16px; padding: 22px; box-shadow: 0 1px 3px 0 rgba(0,0,0,0.05);">
              <h3 style="font-size: 14px; font-weight: 800; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; margin: 0 0 14px 0; text-transform: uppercase;">สรุปมูลค่ารวมรอบรายงานนี้</h3>
              
              <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: bold; color: #475569; margin-bottom: 10px;">
                <span>ยอดเงินบิลรวมทั้งหมด:</span>
                <span style="color: #0f172a; font-size: 15px;">฿${totalGrand.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              
              <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: bold; color: #475569; margin-bottom: 10px;">
                <span>ยอดเงินชำระแล้วเสร็จรวม:</span>
                <span style="color: #059669; font-size: 15px;">฿${totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              
              <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 850; color: #dc2626; border-top: 1px dashed #cbd5e1; padding-top: 14px; margin-top: 4px;">
                <span>ยอดค้างรวมที่ต้องติดตามเก็บ:</span>
                <span style="font-size: 17px;">฿${totalDebt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e2e8f0; padding-top: 25px; margin-top: 50px; font-size: 11px; color: #94a3b8; font-weight: bold;">
            <div>รายงานออกโดยระบบ Jirakit ERP & POS (iPad Cloud-Native Workbench)</div>
            <div>ลงนามผู้ตรวจสอบ: ___________________________</div>
          </div>

        </div>
      `;

      document.body.appendChild(tempDiv);
      await new Promise(resolve => setTimeout(resolve, 150));

      const canvas = await html2canvas(tempDiv, {
        scale: 2.0,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      document.body.removeChild(tempDiv);

      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= 297;

      while (heightLeft > 0) {
        position -= 297;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= 297;
      }

      const safeDateStr = new Date().toISOString().slice(0, 10);
      pdf.save(`Bills_Report_Summary_${safeDateStr}.pdf`);
    } catch (err: any) {
      console.error('Failed to export bills report to pdf:', err);
      alert(`มีปัญหาความไม่เข้ากันในการแปลงไฟล์เอกสาร: ${err?.message || err}`);
    }
  };

  const handlePrint = (r: Receipt) => {
    const shopSettings = JirakitDB.getSettings();
    const mode: 'A4' | 'A5' = shopSettings.RECEIPT_PAPER_SIZE === 'A4' ? 'A4' : 'A5';
    printReceipt(r, mode, shopSettings);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-red-100 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="border-b border-gray-50 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-[#38000A]">ประวัติการออกบิลเอกสาร</h2>
            <p className="text-xs text-gray-500 mt-1">สืบค้นบิล พิมพ์เอกสารสําคัญย้อนหลัง และตรวจสอบประวัติผู้ชำระเงิน</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportBillsToPDF}
              className="px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all hover:scale-[1.02]"
            >
              <FileText size={14} className="stroke-white" />
              <span>📥 ส่งออกรายการบิลมีผลกรอง (PDF LIST)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setReprintModalOpen(true);
                if (receipts.length > 0) {
                  setReprintReceiptId(receipts[0].receipt_id);
                }
              }}
              className="px-4 py-2 bg-gradient-to-r from-[#9B1313] to-[#CD1C18] hover:from-red-800 hover:to-red-750 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all hover:scale-[1.02]"
            >
              <Printer size={14} className="stroke-white" />
              <span>📑 พิมพ์บิลย้อนหลัง (Reprint Historic Bill)</span>
            </button>
          </div>
        </div>

        {/* Unified Date Range Filter Panel */}
        <div className="bg-[#FFFBF9] border border-red-50 p-4 rounded-xl flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 text-gray-700">
          <div className="space-y-0.5 text-left">
            <h4 className="text-xs font-black text-[#9B1313] flex items-center gap-1.5 uppercase tracking-wide">
              <Calendar size={14} className="stroke-[#9B1313]" />
              ตัวกรองช่วงเวลาจัดเก็บข้อมูลบิลเอกสาร (Date-Range)
            </h4>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">
              ช่วงเวลานี้ส่งผลต่อทั้งระบบในหน้าโฮมแดชบอร์ดเพื่อให้ตรวจสอบข้อมูลทางการเงินได้สอดคล้องกัน
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-black text-gray-400">เริ่มต้น:</span>
              <input 
                type="date" 
                className="bg-white border border-gray-200 rounded-lg p-1.5 text-xs font-mono font-bold text-gray-800 outline-none focus:border-[#9B1313] h-8"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-black text-gray-400">สิ้นสุด:</span>
              <input 
                type="date" 
                className="bg-white border border-gray-200 rounded-lg p-1.5 text-xs font-mono font-bold text-gray-800 outline-none focus:border-[#9B1313] h-8"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
            </div>
            
            <button
              onClick={() => setApplyDateFilter(!applyDateFilter)}
              className={`px-3 py-1.5 text-[10px] font-black rounded-lg tracking-wider uppercase transition-all h-8 flex items-center ${
                applyDateFilter 
                  ? 'bg-[#CD1C18] hover:bg-red-800 text-white shadow-xs' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600 border border-gray-200'
              }`}
            >
              {applyDateFilter ? '✕ เคลียร์การกรองเวลา' : '📅 กรองเวลานัด'}
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 text-red-950" size={16} />
          <input
            type="text"
            className="w-full bg-[#FFFBF9] border border-red-50 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-[#9B1313]"
            placeholder="ค้นหาบิลตามรหัสเลขที่ใบเสร็จ หรือ ชื่อลูกค้า..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {/* List of bills */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBills.length === 0 ? (
            <div className="col-span-full text-center py-16 text-gray-400 font-bold border border-dashed rounded-2xl">
              <p>ยังไม่มีข้อมูลเอกสารบิลบันทึกในคลัง</p>
            </div>
          ) : (
            filteredBills.map(r => {
              const hasDebt = r.debt_amount > 0;
              return (
                <div 
                  key={r.receipt_id} 
                  className="bg-[#FFFBF9] border border-red-50 rounded-2xl p-5 hover:border-red-200 transition-colors shadow-sm relative flex flex-col justify-between space-y-4 text-xs font-semibold text-gray-700"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-extrabold text-[#9B1313]">{r.receipt_no}</span>
                      <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full uppercase">{r.doc_type}</span>
                    </div>

                    <h4 className="text-sm font-extrabold text-gray-800">{r.customer_name}</h4>
                    <p className="text-gray-400 text-[10px]">ออกบิลวันที่: {new Date(r.created_at).toLocaleDateString('th-TH')}</p>
                    
                    <div className="flex justify-between items-baseline pt-2 border-t border-gray-100">
                      <span>ยอดสุทธิรวม:</span>
                      <span className="text-sm font-black text-gray-900">฿{r.grand_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>

                    <div className="flex justify-between items-baseline">
                      <span>ชำระแล้ว:</span>
                      <span className="text-emerald-700">฿{r.paid_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>

                    <div className="flex justify-between items-baseline">
                      <span>ยอดค้างรวม:</span>
                      <span className={hasDebt ? 'text-rose-700 font-extrabold' : 'text-gray-400'}>
                        ฿{r.debt_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-3 border-t border-gray-50 text-[11px] font-bold">
                    <button
                      onClick={() => setSelectedReceipt(r)}
                      className="flex-1 py-2 rounded-xl bg-white border border-gray-200 hover:border-red-300 text-gray-850 text-center uppercase tracking-wide"
                    >
                      รายการของ
                    </button>
                    <button
                      onClick={() => {
                        setPreviewReceipt(r);
                        setPreviewActionMessage('');
                        const shopSettings = JirakitDB.getSettings();
                        setPreviewIsA4(shopSettings.RECEIPT_PAPER_SIZE === 'A4');
                      }}
                      className="py-2 px-3 rounded-xl bg-amber-50 hover:bg-[#FFE082] border border-[#FFD54F] text-[#5D4037] flex items-center justify-center gap-1 shrink-0 cursor-pointer"
                      title="พรีวิวประเมินก่อนพิมพ์บิลจริง"
                    >
                      <Eye size={13} /> พรีวิวบิล
                    </button>
                    {hasDebt && (
                      <button
                        onClick={() => setSharingReceipt(r)}
                        className="py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center gap-1 shrink-0"
                        title="แชร์ลิงก์จ่ายเงิน (PromptPay)"
                      >
                        <Share2 size={13} />
                      </button>
                    )}
                    <button
                      onClick={() => handlePrint(r)}
                      className="py-2 px-3 rounded-xl bg-[#CD1C18] hover:bg-red-800 text-white flex items-center justify-center gap-1 shrink-0"
                      title="พิมพ์บิลงานพิมพ์"
                    >
                      <Printer size={13} /> พิมพ์บิล
                    </button>
                    <button
                      onClick={() => handleDownloadPDF(r)}
                      className="py-2 px-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white flex items-center justify-center gap-1 shrink-0"
                      title="ดาวน์โหลดไฟล์ PDF"
                    >
                      <Download size={13} /> PDF
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Bill detail overlay viewer */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-[#38000A]/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border rounded-2xl p-6 max-w-xl w-full shadow-2xl relative animate-in zoom-in-95 duration-150 overflow-hidden">
            <h3 className="text-base font-extrabold text-gray-950 flex items-center gap-1.5 pb-2 border-b border-gray-100">
              <FileText className="stroke-[#9B1313]" size={18} />
              รายการย่อย บิล: {selectedReceipt.receipt_no}
            </h3>

            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-gray-500">
                <p>ผู้ชำระเงิน: <span className="text-gray-800 font-bold">{selectedReceipt.customer_name}</span></p>
                <p className="text-right">เบอร์โทร: {selectedReceipt.phone || '-'}</p>
                <p>เริ่มเช่า: {selectedReceipt.rent_date || '-'}</p>
                <p className="text-right">วันส่งคืน: {selectedReceipt.due_date || '-'}</p>
              </div>

              <div className="max-h-[220px] overflow-y-auto rounded-xl border border-gray-100 shadow-xs">
                <table className="w-full text-xs font-bold text-left table-auto">
                  <thead>
                    <tr className="bg-[#FFF6F3] text-gray-700 h-9">
                      <th className="p-2">รายการวัสดุ</th>
                      <th className="p-2 text-right">จำนวน</th>
                      <th className="p-2 text-right">เช่า/รอบ</th>
                      <th className="p-2 text-right">รวมเงิน (฿)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-gray-600">
                    {JSON.parse(selectedReceipt.items_json || '[]').map((it: any, idx: number) => (
                      <tr key={idx} className="h-9">
                        <td className="p-2 text-gray-800">{it.receipt_name}</td>
                        <td className="p-2 text-right">{it.qty} {it.unit}</td>
                        <td className="p-2 text-right">฿{it.price}</td>
                        <td className="p-2 text-right text-red-950 font-black">฿{it.line_total.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-red-50/40 p-4 rounded-xl border border-red-100 text-xs font-bold space-y-2">
                <div className="flex justify-between text-gray-500">
                  <span>มูลค่าสินค้าในบิล:</span>
                  <span>฿{selectedReceipt.subtotal.toLocaleString()}</span>
                </div>
                {selectedReceipt.discount > 0 && (
                  <div className="flex justify-between text-[#9B1313]">
                    <span>ส่วนลด:</span>
                    <span>- ฿{selectedReceipt.discount.toLocaleString()}</span>
                  </div>
                )}
                {selectedReceipt.deposit > 0 && (
                  <div className="flex justify-between text-teal-700">
                    <span>จ่ายมัดจำไว้:</span>
                    <span>- ฿{selectedReceipt.deposit.toLocaleString()}</span>
                  </div>
                )}
                {selectedReceipt.delivery_fee > 0 && (
                  <div className="flex justify-between">
                    <span>ค่าขนส่งรวม:</span>
                    <span>+ ฿{selectedReceipt.delivery_fee.toLocaleString()}</span>
                  </div>
                )}
                {selectedReceipt.vat > 0 && (
                  <div className="flex justify-between">
                    <span>ภาษี VAT 7%:</span>
                    <span>+ ฿{selectedReceipt.vat.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-[#CD1C18] font-black border-t border-dashed border-red-200 pt-2 text-sm">
                  <span>ยอดสุทธิเรียกเก็บ:</span>
                  <span>฿{selectedReceipt.grand_total.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setSelectedReceipt(null)}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs"
              >
                ปิดหน้าต่างรายละเอียด
              </button>
              <button
                onClick={() => {
                  handlePrint(selectedReceipt);
                  setSelectedReceipt(null);
                }}
                className="flex-1 py-2.5 bg-gray-800 hover:bg-black text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 shadow-sm"
              >
                <Printer size={13} /> สั่งพิมพ์ใบเก็บหน้างาน
              </button>
              <button
                onClick={() => {
                  handleDownloadPDF(selectedReceipt);
                  setSelectedReceipt(null);
                }}
                className="flex-1 py-2.5 bg-[#9B1313] hover:bg-red-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 shadow-sm"
              >
                <Download size={13} /> ดาวน์โหลดเอกสาร PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Payment Link Dialog Component */}
      {sharingReceipt && (() => {
        const payUrl = `${window.location.origin}?pay=${sharingReceipt.receipt_id}`;
        return (
          <div className="fixed inset-0 bg-[#38000A]/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
              <button 
                onClick={() => setSharingReceipt(null)} 
                className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 font-bold"
              >
                <X size={18} />
              </button>
              
              <div className="text-center space-y-3">
                <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-600 border border-emerald-100 mb-2">
                  <Share2 size={24} />
                </div>
                <h3 className="text-md font-extrabold text-gray-900">แชร์ลิงก์แจ้งยอดค้างชำระ & สแกนจ่าย</h3>
                <p className="text-xs text-gray-500 font-semibold leading-relaxed">
                  ส่ง URL ข้างล่างนี้ให้ลูกค้าเพื่อดูรายละเอียดบิลยอดคงเหลือ {sharingReceipt.receipt_no} พร้อมสแกนรูป QR รับเงินยอดที่ต้องชำระทันที
                </p>
              </div>

              <div className="space-y-4 mt-6">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">ลิงก์แจ้งเก็บเงินสำหรับแชร์:</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      readOnly 
                      value={payUrl} 
                      className="flex-1 bg-gray-50 border rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none border-gray-200 select-all text-xs"
                    />
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(payUrl);
                        alert('คัดลอกลิงก์การชำระเงินลงคลิปบอร์ดแล้ว!');
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md"
                    >
                      คัดลอก
                    </button>
                  </div>
                </div>

                <div className="border border-dashed border-gray-150 p-3 rounded-2xl bg-gray-50 flex items-center gap-3">
                  <div className="border p-1 bg-white rounded-lg">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(payUrl)}`} 
                      className="w-16 h-16" 
                      alt="Payment QR Link"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-gray-800">QR สแกนเข้าหน้าชำระ</p>
                    <p className="text-[10px] text-gray-500 leading-normal font-medium">ลูกค้าสามารถใช้วิธีนำกล้องสแกน QR Code นี้เพื่อเปิดหน้าตรวจสอบภาระหนี้สินได้โดยตรง</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end gap-2">
                <button 
                  onClick={() => setSharingReceipt(null)}
                  className="w-full py-2.5 bg-gray-900 hover:bg-slate-850 text-white rounded-xl text-xs font-extrabold"
                >
                  ปิดหน้าแชร์
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Reprint Historic Bill Workbench Modal */}
      {reprintModalOpen && (() => {
        const activeReprintReceipt = receipts.find(r => r.receipt_id === reprintReceiptId) || receipts[0] || null;
        const shopSettings = JirakitDB.getSettings();
        
        const modalFilteredReceipts = receipts.filter(r => 
          r.receipt_no.toLowerCase().includes(reprintSearchQuery.toLowerCase()) ||
          r.customer_name.toLowerCase().includes(reprintSearchQuery.toLowerCase())
        );

        // Generate dynamic HTML layout for the selected receipt using the chosen paper size
        const generatedHtml = activeReprintReceipt 
          ? getReceiptPrintHtml(activeReprintReceipt, reprintPaperSize === 'A4', {
              ...shopSettings,
              RECEIPT_PAPER_SIZE: reprintPaperSize
            })
          : '';

        const handleConfirmPrint = () => {
          if (!activeReprintReceipt) return;
          printReceipt(activeReprintReceipt, reprintPaperSize, {
            ...shopSettings,
            RECEIPT_PAPER_SIZE: reprintPaperSize
          });
        };

        return (
          <div className="fixed inset-0 bg-[#38000A]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl max-w-5xl w-full h-[85vh] shadow-2xl flex flex-col overflow-hidden border border-red-100 text-xs font-semibold text-gray-700">
              {/* Header */}
              <div className="bg-[#38000A] text-white p-5 flex justify-between items-center shrink-0">
                <div className="space-y-0.5 text-left">
                  <h3 className="text-md font-extrabold flex items-center gap-2">
                    <Printer size={18} className="stroke-[#fbbf24] fill-none" />
                    เครื่องมือถอดประวัติพิมพ์ซ้ำใบเสร็จ (Dynamic Historic Reprint Workbench)
                  </h3>
                  <p className="text-[10px] text-gray-300 font-medium font-sans">สืบค้นบิล ใบเสร็จใบส่งสินค้าที่บันทึกไว้ในฐานคลัง และถอดแปลนสร้าง Layout หน้าเอกสารใหม่ทั้งหมดทันที บายพาสไฟล์ PDF เดิม!</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setReprintModalOpen(false)} 
                  className="text-gray-300 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Workbench workspace split container */}
              <div className="flex-1 min-h-0 flex flex-col md:flex-row">
                
                {/* Left side: Bill selection feed */}
                <div className="w-full md:w-80 border-r border-gray-100 p-4 flex flex-col min-h-0 bg-gray-50/50 shrink-0 select-none">
                  <div className="space-y-2 mb-3">
                    <label className="block text-[10px] font-black uppercase text-gray-500 tracking-wider">สืบค้นบิลประวัติศาสตร์</label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 text-gray-400" size={14} />
                      <input 
                        type="text"
                        placeholder="เลขบิล, ชื่อลูกค้า..."
                        className="w-full bg-white border border-gray-200 rounded-xl pl-8 pr-3 py-2 text-xs focus:outline-none focus:border-[#CD1C18] outline-none"
                        value={reprintSearchQuery}
                        onChange={e => setReprintSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Scrollable feed list */}
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-left min-h-0">
                    {modalFilteredReceipts.map(r => {
                      const isActive = r.receipt_id === reprintReceiptId;
                      return (
                        <button
                          type="button"
                          key={r.receipt_id}
                          onClick={() => setReprintReceiptId(r.receipt_id)}
                          className={`w-full p-3 rounded-xl border text-left transition-all ${
                            isActive 
                              ? 'bg-[#FFF6F3] border-red-300 text-red-950 font-extrabold ring-1 ring-red-350 shadow-xs' 
                              : 'bg-white border-gray-200 hover:border-gray-300 text-gray-700'
                          }`}
                        >
                          <div className="flex justify-between items-center text-[10px] font-mono mb-1">
                            <span className={isActive ? 'text-[#9B1313]' : 'text-gray-400'}>{r.receipt_no}</span>
                            <span className="text-gray-400">{(r.receipt_date || r.created_at || '').slice(0, 10)}</span>
                          </div>
                          <div className="text-xs truncate font-bold text-gray-900">{r.customer_name}</div>
                          <div className="flex justify-between items-baseline text-[10px] font-normal mt-1 text-gray-500">
                            <span>ยอดเรียกเก็บ:</span>
                            <span className="font-extrabold text-gray-800">฿{r.grand_total.toLocaleString()}</span>
                          </div>
                        </button>
                      );
                    })}
                    {modalFilteredReceipts.length === 0 && (
                      <div className="text-center py-10 text-gray-400 font-bold border border-dashed rounded-xl">
                        ไม่พบบิลตามค้นหา
                      </div>
                    )}
                  </div>
                </div>

                {/* Right side: Live Dynamic Document Layout Generator Preview */}
                <div className="flex-1 min-h-0 p-4 flex flex-col bg-slate-100">
                  {activeReprintReceipt ? (
                    <div className="flex-1 flex flex-col min-h-0 space-y-3">
                      
                      {/* Top Bar Config Controls */}
                      <div className="bg-white p-3.5 rounded-xl border border-gray-150 flex flex-wrap justify-between items-center gap-3 shadow-xs select-none">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-black uppercase text-gray-400">ขนาดหน้าเอกสารพิมพ์ย้อนหลัง:</span>
                          <div className="flex bg-gray-100 p-0.5 rounded-lg text-[10px] font-black gap-1 border">
                            <button
                              type="button"
                              onClick={() => setReprintPaperSize('A4')}
                              className={`px-3 py-1 rounded transition-colors ${
                                reprintPaperSize === 'A4' 
                                  ? 'bg-[#CD1C18] text-white shadow-xs' 
                                  : 'text-gray-500 hover:text-black'
                              }`}
                            >
                              Standard A4 ขนาดเต็ม
                            </button>
                            <button
                              type="button"
                              onClick={() => setReprintPaperSize('A5')}
                              className={`px-3 py-1 rounded transition-colors ${
                                reprintPaperSize === 'A5' 
                                  ? 'bg-[#CD1C18] text-white shadow-xs' 
                                  : 'text-gray-500 hover:text-black'
                              }`}
                            >
                              Standard A5 ครึ่งแผงพิมพ์
                            </button>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              handleDownloadPDF({
                                ...activeReprintReceipt,
                                due_date: activeReprintReceipt.due_date
                              }, reprintPaperSize);
                            }}
                            className="px-3.5 py-1.5 bg-sky-900/10 text-sky-800 hover:bg-sky-900/20 border border-sky-300 rounded-lg text-xs font-black flex items-center gap-1 transition-colors"
                          >
                            <Download size={13} /> ดาวน์โหลด PDF คืนร่าง
                          </button>
                          
                          <button
                            type="button"
                            onClick={handleConfirmPrint}
                            className="px-4 py-1.5 bg-[#CD1C18] hover:bg-red-800 text-white rounded-lg text-xs font-black flex items-center gap-1.5 transition-colors shadow-sm"
                          >
                            <Printer size={13} /> ยืนยันออกพิมพ์เอกซภาพ (Printer)
                          </button>
                        </div>
                      </div>

                      {/* Live Sandbox Interactive iFrame representation containing the Dynamic Printed HTML */}
                      <div className="flex-1 bg-white border border-gray-250 rounded-xl overflow-hidden shadow-inner relative flex justify-center items-center">
                        <iframe 
                          srcDoc={generatedHtml} 
                          title="Dynamic Reprint Preview Sandbox"
                          className="w-full h-full border-0 bg-white font-sans pointer-events-auto"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 bg-white border border-dashed rounded-xl flex flex-col justify-center items-center p-10 text-center">
                      <Printer size={48} className="text-gray-300 mb-3" />
                      <p className="text-gray-500 text-sm font-bold">กรุณาเลือกหรือค้นหาเลขที่บิลที่คุณต้องการถอดและพิมพ์ซ้ำ</p>
                    </div>
                  )}
                </div>

              </div>
              
            </div>
          </div>
        );
      })()}

      {/* Dynamic Receipt Preview Modal */}
      {previewReceipt && (() => {
        const shopSettings = JirakitDB.getSettings();
        const generatedHtml = getReceiptPrintHtml(previewReceipt, previewIsA4, shopSettings);

        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-gray-150 rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl relative text-left overflow-hidden">
              
              {/* Modal Top Bar header */}
              <div className="bg-[#38000A] text-white p-5 shrink-0 flex justify-between items-center">
                <div className="space-y-1">
                  <h3 className="text-md font-extrabold flex items-center gap-2">
                    <Eye size={18} className="stroke-amber-400 font-black" />
                    พรีวิวตรวจสอบบิลจริงก่อนพิมพ์: {previewReceipt.receipt_no}
                  </h3>
                  <p className="text-[10px] text-gray-300 font-semibold select-none">
                    เรนเดอร์เอกสารโครงสร้าง ‘receiptHelper’ และข้อมูลการเช่าหลักของระบบเพื่อยืนยันค่า
                  </p>
                </div>
                <button
                  type="button"
                  className="text-white hover:text-red-200 p-1 rounded-full hover:bg-white/10 transition-colors"
                  onClick={() => setPreviewReceipt(null)}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Dynamic Toolbar Configuration */}
              <div className="bg-[#FFFBF9] border-b border-gray-150 px-4 sm:px-6 py-3 shrink-0 select-none text-xs font-bold text-gray-700 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 overflow-x-auto">
                    <span className="text-[10px] uppercase font-black text-[#9B1313] shrink-0">ขนาดกระดาษบิลพรีวิว:</span>
                    <div className="flex bg-gray-100 border p-0.5 rounded-lg text-[10px] font-black gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={isPreviewActionBusy}
                        onClick={() => {
                          setPreviewIsA4(true);
                          setPreviewActionMessage('เลือกขนาดบิล A4 แล้ว');
                        }}
                        className={`min-h-[34px] px-3 py-1 rounded transition-colors cursor-pointer ${
                          previewIsA4 
                            ? 'bg-[#CD1C18] text-white shadow-xs' 
                            : 'text-gray-500 hover:text-black hover:bg-white/50'
                        } ${isPreviewActionBusy ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        บิลขนาด A4
                      </button>
                      <button
                        type="button"
                        disabled={isPreviewActionBusy}
                        onClick={() => {
                          setPreviewIsA4(false);
                          setPreviewActionMessage('เลือกบิลย่อส่วน A5 แล้ว');
                        }}
                        className={`min-h-[34px] px-3 py-1 rounded transition-colors cursor-pointer ${
                          !previewIsA4 
                            ? 'bg-[#CD1C18] text-white shadow-xs' 
                            : 'text-gray-500 hover:text-black hover:bg-white/50'
                        } ${isPreviewActionBusy ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        บิลย่อส่วน A5
                      </button>
                    </div>
                  </div>

                  <div className="text-[11px] font-black text-slate-500 bg-white border border-gray-100 rounded-lg px-3 py-1">
                    โหมดปัจจุบัน: <span className="text-[#CD1C18]">{getPreviewMode()}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    disabled={isPreviewActionBusy}
                    onClick={handlePrintPreviewReceipt}
                    className={`min-h-[44px] w-full px-4 py-2 bg-[#CD1C18] hover:bg-red-800 text-white rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm ${
                      isPreviewActionBusy ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                  >
                    <Printer size={14} />
                    <span>{isPrintingPreview ? `กำลังพิมพ์ ${getPreviewMode()}...` : `พิมพ์ใบเสร็จ ${getPreviewMode()}`}</span>
                  </button>

                  <button
                    type="button"
                    disabled={isPreviewActionBusy}
                    onClick={handleSavePreviewPdf}
                    className={`min-h-[44px] w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer ${
                      isPreviewActionBusy ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                  >
                    <Download size={14} />
                    <span>{isSavingPreviewPdf ? `กำลังบันทึก PDF ${getPreviewMode()}...` : `บันทึก PDF ${getPreviewMode()}`}</span>
                  </button>

                  <button
                    type="button"
                    disabled={isPreviewActionBusy}
                    onClick={handleSavePreviewImage}
                    className={`min-h-[44px] w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer ${
                      isPreviewActionBusy ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                  >
                    <Download size={14} />
                    <span>{isSavingPreviewImage ? `กำลังบันทึกภาพ ${getPreviewMode()}...` : `บันทึกภาพบิล ${getPreviewMode()}`}</span>
                  </button>
                </div>

                {previewActionMessage ? (
                  <div className="text-[11px] font-bold text-slate-600 bg-white border border-gray-100 rounded-lg px-3 py-1.5">
                    {previewActionMessage}
                  </div>
                ) : null}
              </div>

              {/* Sandbox iframe representation */}
              <div className="flex-1 bg-gray-100 p-4 border-inner relative overflow-hidden flex justify-center items-center">
                <div className="w-full h-full bg-white border border-gray-200 rounded-xl overflow-hidden shadow-md flex">
                  <iframe
                    srcDoc={generatedHtml}
                    title="Live Bill Receipt Document Preview Frame"
                    className="w-full h-full border-0 bg-white pointer-events-auto"
                  />
                </div>
              </div>

              {/* Close Bottom Control */}
              <div className="bg-gray-55 px-6 py-3.5 border-t border-gray-150 shrink-0 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setPreviewReceipt(null)}
                  className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-750 text-xs font-bold border border-gray-200 rounded-xl transition-colors"
                >
                  ปิดหน้าต่างการพรีวิว
                </button>
              </div>

            </div>
          </div>
        );
      })()}
    </div>
  );
}
