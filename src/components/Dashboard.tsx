/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { JirakitDB } from '../db';
import { NoteItem, Appointment, Receipt, AlertNotification, BillItemRef } from '../types';
import { Bell, Calendar, FileText, Plus, Check, AlertTriangle, TrendingUp, Coins, DollarSign, ArrowUpRight, ShoppingCart, Clipboard, X, Download, PackageOpen } from 'lucide-react';

interface DashboardProps {
  onNavigate: (menu: string) => void;
  triggerRefresh: () => void;
  refreshCount: number;
}

export default function Dashboard({ 
  onNavigate, 
  triggerRefresh, 
  refreshCount 
}: DashboardProps) {
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [alerts, setAlerts] = useState<AlertNotification[]>([]);
  const [newNote, setNewNote] = useState('');
  const [activeTab, setActiveTab] = useState<'notes' | 'appointments' | 'alerts' | 'recent' | 'income'>('notes');
  const [showOnlyZeroStock, setShowOnlyZeroStock] = useState(false);

  // Stock Replenishment Requisition states
  const [requisitionModalOpen, setRequisitionModalOpen] = useState(false);
  const [requisitionList, setRequisitionList] = useState<any[]>([]);
  const [requisitionSuccessMessage, setRequisitionSuccessMessage] = useState('');
  const [requisitionCopied, setRequisitionCopied] = useState(false);

  // Real-time Receipts polling state (Updates every 5s)
  const [pollsReceipts, setPollsReceipts] = useState<Receipt[]>(() => JirakitDB.getReceipts());
  const [lastPolledTime, setLastPolledTime] = useState<string>(() => new Date().toLocaleTimeString());
  const [reminderModalData, setReminderModalData] = useState<{
    customerName: string;
    phone: string;
    billNo: string;
    debtAmount: number;
    dueDate: string;
    messageText: string;
  } | null>(null);

  // Quick Debt reminder state setter
  const handleOpenReminder = (rName: string, phone: string, billNo: string, debtAmount: number, dueDate: string) => {
    const formattedMsg = `เรียนคุณ ${rName},\n\nห้างหุ้นส่วนจำกัด จีรกิตติ์ ไม้แบบแพร่ ขอแจ้งเตือนยอดค้างชำระบิลจำนวน ฿${debtAmount.toLocaleString(undefined, {minimumFractionDigits: 2})} สำหรับบิลเลขที่ ${billNo} (กำหนดส่งเดิม: ${dueDate}) เพื่อรักษาสิทธิ์การใช้งานวัสดุกรุณาชำระยอดหรือติดต่อธุรการด่วนที่เบอร์ 088-xxx-xxxx ครับ\n\nขอแสดงความนับถือ,\nจีรกิตติ์ ไม้แบบแพร่`;
    setReminderModalData({
      customerName: rName,
      phone: phone || '',
      billNo: billNo,
      debtAmount: debtAmount,
      dueDate: dueDate,
      messageText: formattedMsg
    });
  };

  // Appointment states
  const [apTitle, setApTitle] = useState('');
  const [apDetail, setApDetail] = useState('');
  const [apDate, setApDate] = useState(new Date().toISOString().slice(0, 10));
  const [apCustomer, setApCustomer] = useState('');
  const [isAddingAp, setIsAddingAp] = useState(false);

  useEffect(() => {
    setNotes(JirakitDB.getNotes());
    setAppointments(JirakitDB.getAppointments());
    const rcsInit = JirakitDB.getReceipts();
    setReceipts(rcsInit.slice(-8).reverse());
    setPollsReceipts(rcsInit);
    setLastPolledTime(new Date().toLocaleTimeString());
    
    // Auto alerts calculation
    const prods = JirakitDB.getProducts();
    const rcs = JirakitDB.getReceipts();
    const calculatedAlerts: AlertNotification[] = [];
    
    // Out of Stock / Low Stock
    prods.forEach(p => {
      if (p.qty_available <= p.low_stock_threshold && p.item_status === 'Active') {
        calculatedAlerts.push({
          alert_id: `L-${p.item_id}`,
          alert_type: 'LOW_STOCK',
          severity: p.qty_available === 0 ? 'สูง' : 'กลาง',
          title: `สต็อกระดับเตือน: ${p.item_name}`,
          detail: `คงเหลือเพียง ${p.qty_available} ${p.unit} (เกณฑ์ต่ำสุด ${p.low_stock_threshold})`,
          target_type: 'PRODUCT',
          target_id: p.item_id,
          target_menu: 'products',
          alert_status: 'Open',
          due_date: '',
          created_at: new Date().toISOString()
        });
      }
    });

    // Overdue returns or unpaid debt
    rcs.forEach(r => {
      if (r.debt_amount > 0) {
        calculatedAlerts.push({
          alert_id: `D-${r.receipt_id}`,
          alert_type: 'UNPAID',
          severity: r.debt_amount > 20000 ? 'สูง' : 'กลาง',
          title: `บิลค้างชำระ: ${r.receipt_no}`,
          detail: `ลูกค้า ${r.customer_name} มียอดค้างชำระ ฿${r.debt_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
          target_type: 'RECEIPT',
          target_id: r.receipt_id,
          target_menu: 'returns',
          alert_status: 'Open',
          due_date: r.due_date,
          created_at: r.created_at
        });
      }

      // Check rentals where 'due_date' is today or overdue by less than 3 days
      if (r.return_status === 'กำลังเช่า' || r.return_status === 'คืนบางส่วน') {
        if (r.due_date) {
          const parts = r.due_date.slice(0, 10).split('-');
          if (parts.length === 3) {
            const y = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10) - 1;
            const dVal = parseInt(parts[2], 10);
            const target = new Date(y, m, dVal);
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const diffTime = today.getTime() - target.getTime();
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays >= 0 && diffDays < 3) {
              const overdueText = diffDays === 0 
                ? 'ครบกำหนดส่งคืนวันนี้' 
                : `เกินกำหนดส่งคืน ${diffDays} วัน`;

              calculatedAlerts.push({
                alert_id: `R-${r.receipt_id}`,
                alert_type: 'OVERDUE_RETURN',
                severity: diffDays === 0 ? 'กลาง' : 'สูง',
                title: `${overdueText}: สัญญาเช่า ${r.receipt_no}`,
                detail: `ลูกค้า ${r.customer_name} (โทร: ${r.phone || '-'}) มีอุปกรณ์เช่าค้างส่งคืน กำหนดเดิม: ${r.due_date}`,
                target_type: 'RECEIPT',
                target_id: r.receipt_id,
                target_menu: 'returns',
                alert_status: 'Open',
                due_date: r.due_date,
                created_at: r.created_at
              });
            }
          }
        }
      }
    });

    setAlerts(calculatedAlerts);
  }, [refreshCount]);

  // Poll receipts and update polling states every 5 seconds for streaming effect
  useEffect(() => {
    const handlePoll = () => {
      const freshRc = JirakitDB.getReceipts();
      setPollsReceipts(freshRc);
      setLastPolledTime(new Date().toLocaleTimeString());
      
      // Keep main receipts feed fresh as well
      setReceipts(freshRc.slice(-8).reverse());
    };
    const interval = setInterval(handlePoll, 5000);
    return () => clearInterval(interval);
  }, []);

  // Dashboard Stats
  const todayStr = new Date().toISOString().slice(0,10);
  const receiptsToday = receipts.filter(r => r.receipt_date.slice(0, 10) === todayStr);
  const revenueToday = receiptsToday.reduce((sum, r) => sum + r.paid_amount, 0);
  const totalUnpaidCount = JirakitDB.getReceipts().filter(r => r.debt_amount > 0).length;
  const activeRentalsCount = JirakitDB.getReceipts().filter(r => r.return_status === 'กำลังเช่า' || r.return_status === 'คืนบางส่วน').length;
  const lowStockCount = JirakitDB.getProducts().filter(p => p.qty_available <= p.low_stock_threshold && p.item_status === 'Active').length;
  const dueRentalsAlerts = alerts.filter(a => a.alert_type === 'OVERDUE_RETURN');

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    JirakitDB.saveNote(newNote);
    setNewNote('');
    setNotes(JirakitDB.getNotes());
    triggerRefresh();
  };

  const handleDeleteNote = (id: string) => {
    JirakitDB.deleteNote(id);
    setNotes(JirakitDB.getNotes());
    triggerRefresh();
  };

  const handleAddAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apTitle.trim()) return;
    JirakitDB.saveAppointment({
      title: apTitle,
      detail: apDetail,
      appointment_date: apDate,
      customer_name: apCustomer
    });
    setApTitle('');
    setApDetail('');
    setApCustomer('');
    setAppointments(JirakitDB.getAppointments());
    setIsAddingAp(false);
    triggerRefresh();
  };

  const handleCompleteAppointment = (id: string) => {
    JirakitDB.updateAppointmentStatus(id, 'Done');
    setAppointments(JirakitDB.getAppointments());
    triggerRefresh();
  };

  // Generate Automatic Stock Replenishment Requisition List
  const handleGenerateRequisition = () => {
    const lowStockProducts = JirakitDB.getProducts().filter(
      p => p.qty_available <= p.low_stock_threshold && p.item_status === 'Active'
    );
    
    const items = lowStockProducts.map(p => {
      // Automatic replenishment quantity logic:
      // Fill stock to standard level (e.g. low_stock_threshold * 2) or ensure a minimum of 20
      const calculatedQty = Math.max(20, (p.low_stock_threshold * 2.5) - p.qty_available);
      return {
        item_id: p.item_id,
        item_name: p.item_name,
        sku: p.sku || '',
        qty_available: p.qty_available,
        low_stock_threshold: p.low_stock_threshold,
        unit: p.unit || 'ชิ้น',
        category: p.category || '',
        qty_to_order: Math.ceil(calculatedQty)
      };
    });

    setRequisitionList(items);
    setRequisitionCopied(false);
    setRequisitionSuccessMessage('');
    setRequisitionModalOpen(true);
  };

  const handleUpdateRequisitionQty = (itemId: string, qty: number) => {
    setRequisitionList(prev => 
      prev.map(item => item.item_id === itemId ? { ...item, qty_to_order: Math.max(1, qty) } : item)
    );
    setRequisitionCopied(false);
  };

  const handleCopyRequisitionText = () => {
    if (requisitionList.length === 0) return;
    
    const dateStr = new Date().toLocaleString('th-TH');
    let text = `=== ใบจัดสรรความต้องการสั่งซื้อและเติมสต็อกสินค้า ===\n`;
    text += `วันที่จัดระเบียบรายงาน: ${dateStr}\n`;
    text += `ผู้ดำเนินโครงการ: ระบบคำนวณคลังพลาสติกอัตโนมัติ (Jirakit AI Engine)\n`;
    text += `ติดต่อร้าน: 98/12 หมู่ 3 ต.ท่าเสา อ.เมือง จ.อุตรดิตถ์ (093-170-3949)\n`;
    text += `==================================================\n\n`;
    text += `รายการนำส่งจัดหาด่วน (รวมทั้งหมด ${requisitionList.length} รายการ):\n`;
    
    requisitionList.forEach((it, idx) => {
      text += `${idx + 1}. [${it.category}] ${it.item_name} (SKU: ${it.sku || '-'})\n`;
      text += `   - สต็อกคงเหลือปัจจุบัน: ${it.qty_available} ${it.unit} (เกณฑ์ต่ำสุด: ${it.low_stock_threshold} ${it.unit})\n`;
      text += `   - **จำนวนที่เสนอสั่งจัดซื้อเพิ่ม**: ${it.qty_to_order} ${it.unit}\n\n`;
    });
    
    text += `==================================================\n`;
    text += `กรุณาพิจารณาอนุมัติสั่งซื้อและขนส่งลงคลังเพื่อรองรับงานเช่าของฤดูกาลนี้ด้วยครับ\n`;

    navigator.clipboard.writeText(text);
    setRequisitionCopied(true);
    setTimeout(() => setRequisitionCopied(false), 3000);
  };

  const handleDownloadRequisitionText = () => {
    if (requisitionList.length === 0) return;

    const dateStr = new Date().toLocaleString('th-TH');
    let text = `=== ใบจัดสรรความต้องการสั่งซื้อและเติมสต็อกสินค้า ===\r\n`;
    text += `วันที่จัดระเบียบรายงาน: ${dateStr}\r\n`;
    text += `ผู้ดำเนินโครงการ: ระบบคำนวณคลังพลาสติกอัตโนมัติ (Jirakit AI Engine)\r\n`;
    text += `ติดต่อร้าน: 98/12 หมู่ 3 ต.ท่าเสา อ.เมือง จ.อุตรดิตถ์ (093-170-3949)\r\n`;
    text += `==================================================\r\n\r\n`;
    text += `รายการนำส่งจัดหาด่วน (รวมทั้งหมด ${requisitionList.length} รายการ):\r\n`;
    
    requisitionList.forEach((it, idx) => {
      text += `${idx + 1}. [${it.category}] ${it.item_name} (SKU: ${it.sku || '-'})\r\n`;
      text += `   - สต็อกคงเหลือปัจจุบัน: ${it.qty_available} ${it.unit} (เกณฑ์ต่ำสุด: ${it.low_stock_threshold} ${it.unit})\r\n`;
      text += `   - จำนวนที่เสนอสั่งจัดซื้อเพิ่ม: ${it.qty_to_order} ${it.unit}\r\n\r\n`;
    });
    
    text += `==================================================\r\n`;
    text += `กรุณาพิจารณาอนุมัติสั่งซื้อและขนส่งลงคลังเพื่อรองรับงานเช่าของฤดูกาลนี้ด้วยครับ\r\n`;

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const dateFileStr = new Date().toISOString().slice(0, 10);
    link.setAttribute('download', `Low_Stock_Replenishment_List_${dateFileStr}.txt`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveRequisitionToDB = () => {
    if (requisitionList.length === 0) return;

    // Save to audit logs as permanent log in the system
    JirakitDB.addAuditLog(
      'GEN_REQUISITION',
      'PRODUCT',
      '-',
      '',
      JSON.stringify(requisitionList),
      `สร้างใบความต้องการจัดเพื่อเติมคลังสินค้าสต็อกต่ำรวม ${requisitionList.length} ชนิดสินค้าอัตโนมัติ`
    );

    setRequisitionSuccessMessage('บันทึกใบจัดหาและยื่นเสนอจัดซื้อในฐานข้อมูลระบบสำเร็จ! (Audit Log Reflected)');
    setTimeout(() => {
      setRequisitionSuccessMessage('');
      setRequisitionModalOpen(false);
    }, 4000);
  };

  return (
    <div className="space-y-6">
      {/* Due / Overdue Rentals Notification Banner */}
      {dueRentalsAlerts.length > 0 && (
        <div className="bg-[#F3EDF7] border-2 border-[#D0BCFF] rounded-xl p-4 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all">
          <div className="flex items-start gap-3">
            <div className="bg-[#EADDFF] p-2.5 rounded-lg border border-[#D0BCFF] mt-0.5 animate-pulse">
              <Bell className="stroke-[#21005D]" size={20} />
            </div>
            <div>
              <h4 className="text-sm font-black text-[#21005D] uppercase tracking-wider">
                แจ้งเตือน: อุปกรณ์เช่าครบกำหนดวันนี้ / เกินกำหนดส่งคืน (ไม่เกิน 3 วัน)
              </h4>
              <p className="text-xs text-[#49454F] mt-1">
                ตรวจพบสัญญาเช่า <span className="text-[#1D1B20] font-bold">{dueRentalsAlerts.length} รายการ</span> ที่ถึงกำหนดส่งคืนหรือเกินกำหนดส่งคืนไม่เกิน 3 วัน กรุณาติดต่อลูกค้าหรือบันทึกรับคืนสินค้าเพื่อป้องกันสินค้าค้างคืน
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setActiveTab('alerts');
              const element = document.getElementById('dashboard-tabs');
              if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className="px-4 py-2 bg-[#21005D] hover:bg-[#381E72] text-white font-black uppercase text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-sm whitespace-nowrap self-stretch md:self-auto justify-center"
          >
            ดูแจ้งเตือนทั้งหมด ({dueRentalsAlerts.length})
          </button>
        </div>
      )}

      {/* 4 Cards Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div 
          onClick={() => onNavigate('bills')}
          className="group bg-white p-5 rounded-xl border border-[#CAC4D0] border-l-4 border-l-emerald-600 shadow-sm text-[#1D1B20] cursor-pointer transition-all hover:scale-[1.01] hover:shadow-md hover:bg-slate-50/50 active:scale-[0.99] text-left"
        >
          <p className="text-[#49454F] text-xs font-black uppercase tracking-wider">รายได้รวมวันนี้</p>
          <h3 className="text-3xl font-black mt-1 text-[#21005D]">
            ฿{revenueToday.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-emerald-750 text-[11px] mt-2 font-black uppercase tracking-widest group-hover:underline">คลิกเพื่อดูและจัดการบิล</p>
        </div>

        <div 
          onClick={() => onNavigate('returns')}
          className="group bg-white p-5 rounded-xl border border-[#CAC4D0] border-l-4 border-l-amber-600 shadow-sm text-[#1D1B20] cursor-pointer transition-all hover:scale-[1.01] hover:shadow-md hover:bg-slate-50/50 active:scale-[0.99] text-left"
        >
          <p className="text-[#49454F] text-xs font-black uppercase tracking-wider">ยอดบิลค้างชำระ</p>
          <h3 className="text-3xl font-black mt-1 text-[#21005D]">{totalUnpaidCount} บิล</h3>
          <p className="text-amber-700 text-[11px] mt-2 font-black uppercase tracking-widest group-hover:underline">คลิกเพื่อติดตามหนี้ค้าง</p>
        </div>

        <div 
          onClick={() => onNavigate('returns')}
          className="group bg-white p-5 rounded-xl border border-[#CAC4D0] border-l-4 border-l-[#4F378B] shadow-sm text-[#1D1B20] cursor-pointer transition-all hover:scale-[1.01] hover:shadow-md hover:bg-slate-50/50 active:scale-[0.99] text-left"
        >
          <p className="text-[#49454F] text-xs font-black uppercase tracking-wider">อุปกรณ์กำลังเช่า</p>
          <h3 className="text-3xl font-black mt-1 text-[#21005D]">{activeRentalsCount} สัญญา</h3>
          <p className="text-[#4F378B] text-[11px] mt-2 font-black uppercase tracking-widest group-hover:underline">คลิกเพื่อบันทึกการรับคืน</p>
        </div>

        <div 
          onClick={() => onNavigate('products')}
          className="group bg-white p-5 rounded-xl border border-[#CAC4D0] border-l-4 border-l-rose-500 shadow-sm text-[#1D1B20] cursor-pointer transition-all hover:scale-[1.01] hover:shadow-md hover:bg-slate-50/50 active:scale-[0.99] text-left"
        >
          <p className="text-[#49454F] text-xs font-black uppercase tracking-wider">สินค้าสต็อกต่ำเตือน</p>
          <h3 className="text-3xl font-black mt-1 text-rose-600">{lowStockCount} ชิ้น</h3>
          <p className="text-rose-600 text-[11px] mt-2 font-black uppercase tracking-widest group-hover:underline">คลิกเพื่อดูสินค้าคลัง</p>
        </div>
      </div>

      {/* Low Stock Alerts Specialized Widget */}
      {lowStockCount > 0 && (() => {
        const lowStockProducts = JirakitDB.getProducts().filter(p => p.qty_available <= p.low_stock_threshold && p.item_status === 'Active');
        if (lowStockProducts.length === 0) return null;
        
        return (
          <div className="bg-white border-2 border-rose-500/85 rounded-xl p-5 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#CAC4D0]">
              <div className="flex items-start gap-3">
                <div className="bg-rose-50 p-2.5 rounded-lg border border-rose-200 shrink-0">
                  <AlertTriangle className="stroke-rose-600" size={18} />
                </div>
                <div className="text-left">
                  <h4 className="text-sm font-black text-rose-600 uppercase tracking-widest">
                    ⚠️ รายการสินค้าที่ระดับคลังต่ำกว่าเกณฑ์ความปลอดภัย (Low Stock Alert)
                  </h4>
                  <p className="text-[11px] text-[#49454F] font-semibold uppercase mt-0.5">
                    พบอุปกรณ์จำนวน {lowStockProducts.length} รายการที่ต่ำกว่าระดับเกณฑ์การเตือนภัย กรุณาพิจารณาจัดซื้อหรือหมุนเวียนเพื่อเติมคลังให้พร้อมใช้งาน!
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2.5 shrink-0">
                <button 
                  onClick={handleGenerateRequisition}
                  className="px-4 py-2 bg-gradient-to-r from-rose-700 to-rose-600 hover:opacity-90 text-white font-extrabold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5 uppercase tracking-wide cursor-pointer"
                >
                  <ShoppingCart size={13} className="stroke-white" />
                  <span>📝 เจนใบขอสั่งเติมคลังทันที</span>
                </button>
                <button 
                  onClick={() => onNavigate('products')}
                  className="px-4 py-2 bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 font-extrabold text-xs rounded-xl transition-all shadow-sm shrink-0 uppercase tracking-wide cursor-pointer"
                >
                  แก้ไขสต็อกคลังมือถือ →
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {lowStockProducts.map(p => (
                <div 
                  key={p.item_id} 
                  onClick={() => onNavigate('products')}
                  className="bg-[#F3EDF7] border border-[#CAC4D0] hover:border-[#D0BCFF] rounded-xl p-3 flex justify-between items-center cursor-pointer transition-all hover:scale-[1.01] hover:bg-[#ECE6F0] group"
                >
                  <div className="text-left space-y-1">
                    <p className="text-xs font-black text-[#1D1B20] group-hover:text-[#21005D] transition-colors">{p.item_name}</p>
                    <p className="text-[10px] text-[#49454F] font-bold">เกณฑ์ขั้นต่ำ: {p.low_stock_threshold} {p.unit}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2.5 py-1 text-xs font-black rounded-lg ${
                      p.qty_available === 0 ? 'bg-red-150 text-red-700 border border-red-300 animate-pulse' : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}>
                      {p.qty_available} {p.unit}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Main interactive tabs & lists */}
      <div id="dashboard-tabs" className="bg-white border border-[#CAC4D0] rounded-xl shadow-md">
        <div className="border-b border-[#CAC4D0] p-2">
          <div className="grid grid-cols-5 bg-[#F3EDF7] p-1 rounded-lg border border-[#CAC4D0] gap-1 w-full">
            {(['notes', 'appointments', 'alerts', 'recent', 'income'] as const).map(tab => {
              const tabLabels = {
                notes: 'สมุดโน้ตเด่น',
                appointments: 'นัดหมายหน้างาน',
                alerts: `แจ้งเตือนด่วน (${alerts.length})`,
                recent: 'บิลออกล่าสุด',
                income: 'รายได้'
              };
              return (
                <button
                  key={tab}
                  className={`py-2 px-1 rounded-md text-[11px] sm:text-xs font-black uppercase transition-all text-center whitespace-nowrap overflow-hidden text-ellipsis ${
                    activeTab === tab 
                      ? 'bg-[#21005D] text-white shadow-sm font-black' 
                      : 'text-[#4F378B] hover:text-[#21005D] hover:bg-[#EADDFF]'
                  }`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tabLabels[tab]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-6">
          {/* Notes Tab */}
          {activeTab === 'notes' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-[#CAC4D0] p-5">
                <h3 className="text-md font-bold text-[#21005D] flex items-center gap-2 mb-3">
                  <FileText className="inline-block stroke-[#21005D]" size={18} />
                  เพิ่มโน้ตด่วน / บันทึกหน้างาน
                </h3>
                <form onSubmit={handleSaveNote} className="space-y-4">
                  <textarea
                    className="w-full bg-[#FFFBFE] border border-[#CAC4D0] rounded-lg p-3 text-sm focus:outline-none focus:border-[#6750A4] min-height-[100px] text-[#1D1B20]"
                    placeholder="พิมพ์บันทึกเพื่อจดจําด่วนที่นี่..."
                    value={newNote}
                    onChange={e => setNewNote(e.target.value)}
                    rows={4}
                  />
                  <button
                    type="submit"
                    className="w-full h-11 bg-[#21005D] hover:bg-[#381E72] text-white font-black uppercase tracking-wider rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md"
                  >
                    <Plus size={14} /> บันทึกโน้ตหน้างาน
                  </button>
                </form>
              </div>

              <div>
                <h3 className="text-md font-bold text-[#49454F] mb-3">บันทึกทั้งหมด ({notes.length})</h3>
                {notes.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-[#CAC4D0] rounded-xl">
                    <p className="text-[#49454F] text-sm font-semibold">ไม่มีบันทึกโน้ตเปิดไว้</p>
                  </div>
                ) : (
                  <div className="max-h-[300px] overflow-y-auto space-y-3 pr-1">
                    {notes.map(note => (
                      <div key={note.note_id} className="bg-[#F3EDF7] border border-[#CAC4D0] p-4 rounded-xl hover:bg-[#ECE6F0] transition-colors shadow-sm relative border-l-2 border-l-[#21005D]">
                        <p className="text-sm text-[#1D1B20] font-medium whitespace-pre-wrap">{note.note_text}</p>
                        <div className="flex justify-between items-center mt-3 pt-2 border-t border-[#CAC4D0]/60">
                          <span className="text-[10px] text-[#49454F] font-semibold uppercase">{new Date(note.created_at).toLocaleDateString('th-TH')}</span>
                          <button
                            onClick={() => handleDeleteNote(note.note_id)}
                            className="text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors bg-rose-50 px-2 py-1 rounded border border-rose-200"
                          >
                            ลบออก
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Appointments Tab */}
          {activeTab === 'appointments' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-md font-bold text-[#49454F] flex items-center gap-2">
                    <Calendar className="stroke-[#21005D]" size={18} />
                    ปฏิทินและกําหนดส่ง / เก็บวัสดุ
                  </h3>
                  <button
                    onClick={() => setIsAddingAp(!isAddingAp)}
                    className="py-1.5 px-3 rounded-md border border-[#CAC4D0] hover:bg-[#ECE6F0] text-xs font-bold text-[#21005D] transition-colors bg-[#F3EDF7]"
                  >
                    {isAddingAp ? 'ซ่อนฟอร์ม' : '+ เพิ่มนัดส่งของ'}
                  </button>
                </div>

                {isAddingAp && (
                  <form onSubmit={handleAddAppointment} className="bg-[#F3EDF7] border border-[#CAC4D0] p-4 rounded-xl space-y-3 mb-4 transition-all animate-in fade-in zoom-in-95 animate-none">
                    <div>
                      <label className="block text-xs font-bold text-[#49454F] mb-1">หัวข้อนัดหมาย / นัดส่งด่วน *</label>
                      <input
                        type="text"
                        required
                        className="w-full bg-[#FFFBFE] border border-[#CAC4D0] rounded-lg p-2 text-xs text-[#1D1B20] focus:outline-none focus:border-[#6750A4]"
                        placeholder="เช่น จัดส่งนั่งร้าน 40 ชุด โครงการสร้างตึก"
                        value={apTitle}
                        onChange={e => setApTitle(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-bold text-[#49454F] mb-1">วันที่ต้องการ</label>
                        <input
                          type="date"
                          className="w-full bg-[#FFFBFE] border border-[#CAC4D0] rounded-lg p-2 text-xs text-[#1D1B20] focus:outline-none focus:border-[#6750A4]"
                          value={apDate}
                          onChange={e => setApDate(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#49454F] mb-1">ลูกค้าเกี่ยวข้อง</label>
                        <input
                          type="text"
                          className="w-full bg-[#FFFBFE] border border-[#CAC4D0] rounded-lg p-2 text-xs text-[#1D1B20] focus:outline-none focus:border-[#6750A4]"
                          placeholder="บจก. ก่อสร้างมั่นคง"
                          value={apCustomer}
                          onChange={e => setApCustomer(e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#49454F] mb-1">คําอธิบายหรือพิกัดจัดส่ง</label>
                      <textarea
                        className="w-full bg-[#FFFBFE] border border-[#CAC4D0] rounded-lg p-2 text-xs text-[#1D1B20] focus:outline-none focus:border-[#6750A4] h-[60px]"
                        placeholder="เช่น หน้างานตรงข้ามปั๊มปตท. ท่าเสา เลือกรุ่นสีก่อสร้าง"
                        value={apDetail}
                        onChange={e => setApDetail(e.target.value)}
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2 bg-[#21005D] text-white font-black uppercase text-xs rounded-lg hover:bg-[#381E72] transition-colors"
                    >
                      ✓ บันทึกกําหนดการนัดหมาย
                    </button>
                  </form>
                )}

                {/* Minimal calendar preview */}
                <div className="bg-[#F3EDF7] border border-[#CAC4D0] rounded-xl p-4">
                  <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-extrabold text-[#21005D] mb-2 uppercase tracking-wide">
                    {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map(d => <div key={d}>{d}</div>)}
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {Array.from({ length: 30 }, (_, i) => {
                      const dayVal = i + 1;
                      const isToday = dayVal === new Date().getDate();
                      const hasApt = appointments.some(ap => {
                        const apD = new Date(ap.appointment_date).getDate();
                        const apM = new Date(ap.appointment_date).getMonth();
                        return apD === dayVal && apM === new Date().getMonth();
                      });
                      return (
                        <div
                          key={i}
                          className={`aspect-square flex flex-col justify-center items-center rounded-lg text-xs font-bold ${
                            isToday 
                              ? 'bg-[#21005D] text-white shadow-sm' 
                              : 'bg-white hover:bg-[#ECE6F0] text-[#1D1B20] border border-[#CAC4D0]'
                          } relative`}
                        >
                          {dayVal}
                          {hasApt && (
                            <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[#6750A4]"></span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-md font-bold text-[#49454F] mb-3 flex items-center justify-between">
                  <span>รายการนัดหมายทั้งหมด ({appointments.length})</span>
                </h3>
                {appointments.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-[#CAC4D0] rounded-xl">
                    <p className="text-[#49454F] text-sm font-semibold">ไม่มีกําหนดการคงค้าง</p>
                  </div>
                ) : (
                  <div className="max-h-[350px] overflow-y-auto space-y-3 pr-1">
                    {appointments.map(ap => (
                      <div key={ap.appointment_id} className="bg-[#F3EDF7] border border-[#CAC4D0] p-4 rounded-xl hover:border-[#D0BCFF] transition-colors shadow-sm relative border-l-2 border-l-[#21005D]">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="font-extrabold text-sm text-[#1D1B20]">{ap.title}</h4>
                          <span className="text-[10px] font-extrabold bg-[#EADDFF] text-[#21005D] border border-[#D0BCFF] px-2 py-0.5 rounded whitespace-nowrap">
                            {ap.appointment_date}
                          </span>
                        </div>
                        <p className="text-xs text-[#49454F] mt-2 font-semibold">
                          ลูกค้า: <span className="text-[#21005D] font-bold">{ap.customer_name || 'ลูกค้าทั่วไป'}</span>
                        </p>
                        {ap.detail && <p className="text-xs text-[#49454F] mt-1 whitespace-pre-wrap">{ap.detail}</p>}
                        <div className="flex justify-end mt-3 pt-2 border-t border-[#CAC4D0]/60">
                          <button
                            onClick={() => handleCompleteAppointment(ap.appointment_id)}
                            className="text-xs font-bold text-[#21005D] hover:bg-[#EADDFF] transition-colors bg-white px-2.5 py-1 rounded flex items-center gap-1 border border-[#CAC4D0]"
                          >
                            <Check size={12} /> ทำภารกิจเสร็จเรียบร้อยแล้ว
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Alerts Tab */}
          {activeTab === 'alerts' && (
            <div className="space-y-3">
              <h3 className="text-md font-bold text-[#21005D] mb-2 flex items-center gap-2">
                <Bell className="stroke-[#21005D]" size={18} />
                รายการคัดกรองปัญหารองรับ Health Check
              </h3>

              {/* Zero Stock vs All filter toggle */}
              <div className="flex bg-[#F3EDF7] border border-[#CAC4D0] p-1 rounded-xl w-fit mb-3 text-xs font-bold gap-1">
                <button
                  type="button"
                  onClick={() => setShowOnlyZeroStock(false)}
                  className={`px-3.5 py-1.5 rounded-lg transition-all ${
                    !showOnlyZeroStock 
                      ? 'bg-[#21005D] text-white font-black' 
                      : 'text-[#4F378B] hover:text-[#21005D]'
                  }`}
                >
                  แจ้งเตือนทั้งหมด
                </button>
                <button
                  type="button"
                  onClick={() => setShowOnlyZeroStock(true)}
                  className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    showOnlyZeroStock 
                      ? 'bg-rose-600 text-white font-black shadow-sm' 
                      : 'text-rose-705 hover:text-rose-900 hover:bg-rose-50'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-red-200 animate-pulse"></span>
                  เฉพาะสินค้าหมด (Zero Stock)
                </button>
              </div>

              {(() => {
                const displayedAlerts = alerts.filter(a => {
                  if (showOnlyZeroStock) {
                    if (a.alert_type === 'LOW_STOCK') {
                      const prodCheck = JirakitDB.getProducts().find(p => p.item_id === a.target_id);
                      return prodCheck ? prodCheck.qty_available === 0 : false;
                    }
                    return false;
                  }
                  return true;
                });

                if (displayedAlerts.length === 0) {
                  return (
                    <div className="text-center py-16 bg-[#F3EDF7] text-[#21005D] rounded-xl border border-[#CAC4D0]">
                      <p className="font-extrabold text-lg">คลังและระบบการชำระเงินทำงานปกติครบถ้วน!</p>
                      <p className="text-xs text-[#49454F] mt-1">
                        {showOnlyZeroStock ? 'ไม่มีสินค้าคลังที่สินค้าหมดเกลี้ยง (Zero Stock) ในห้วงเวลานี้' : 'คลังไม่มีสินค้าตํ่ากว่าเกณฑ์ด่วน และยอดรับเงินไม่มีการค้างบิลเลยกำหนดเกณฑ์'}
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {displayedAlerts.map(a => {
                      const isLowStock = a.alert_type === 'LOW_STOCK';
                      const prod = isLowStock ? JirakitDB.getProducts().find(p => p.item_id === a.target_id) : null;
                      
                      const associatedReceipt = (a.target_type === 'RECEIPT')
                        ? JirakitDB.getReceipts().find(r => r.receipt_id === a.target_id)
                        : null;

                      let isOverdueMoreThan7Days = false;
                      let overdueDays = 0;
                      if (associatedReceipt && associatedReceipt.due_date) {
                        try {
                          const parts = associatedReceipt.due_date.slice(0, 10).split('-');
                          if (parts.length === 3) {
                            const y = parseInt(parts[0], 10);
                            const m = parseInt(parts[1], 10) - 1;
                            const dVal = parseInt(parts[2], 10);
                            const dued = new Date(y, m, dVal);
                            const now = new Date();
                            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                            const diffTime = today.getTime() - dued.getTime();
                            overdueDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                            if (overdueDays > 7 && (associatedReceipt.debt_amount > 0 || associatedReceipt.return_status === 'กำลังเช่า' || associatedReceipt.return_status === 'คืนบางส่วน')) {
                              isOverdueMoreThan7Days = true;
                            }
                          }
                        } catch (e) {}
                      }

                      return (
                        <div 
                          key={a.alert_id} 
                          className={`p-4 rounded-xl border flex flex-col justify-between hover:scale-[1.01] transition-all shadow-sm ${
                            isOverdueMoreThan7Days
                              ? 'bg-red-50 border-red-500 text-red-955 ring-2 ring-red-300 animate-[pulse_2.5s_infinite]'
                              : a.severity === 'สูง' 
                              ? 'bg-rose-50 border-rose-250 text-rose-950' 
                              : 'bg-white border border-[#CAC4D0] text-[#1D1B20]'
                          }`}
                        >
                          <div>
                            <div className="flex justify-between items-start gap-2 mb-2">
                              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                                 isOverdueMoreThan7Days ? 'bg-red-600 text-white border border-red-700 font-black' : a.severity === 'สูง' ? 'bg-rose-200 text-rose-900 border border-rose-300' : 'bg-amber-100 text-amber-900 border border-amber-200'
                              }`}>
                                {isOverdueMoreThan7Days ? 'วิกฤตเกิน 7 วัน' : `ปัญหาระดับ ${a.severity}`}
                              </span>
                              <span className="text-[10px] font-mono text-[#49454F] font-semibold">
                                {a.alert_type}
                              </span>
                            </div>

                            {isLowStock && prod ? (
                              <>
                                <h4 className="font-extrabold text-sm text-[#1D1B20]">
                                  สต็อกระดับเตือน: <span className="text-[#21005D] underline text-md font-black">{prod.item_name}</span>
                                </h4>
                                <p className="text-xs mt-1.5 font-semibold text-[#49454F]">
                                  สินค้าคงเหลือเพียง <strong className="text-red-700 font-black text-sm pr-0.5">{prod.qty_available}</strong> {prod.unit}
                                  <span className="text-[#49454F] font-normal block mt-0.5">
                                    (เกณฑ์แจ้งเตือนต่ำสุดในระบบที่กำหนดไว้: {prod.low_stock_threshold} {prod.unit})
                                  </span>
                                </p>
                                
                                {/* Quick Restock Button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    localStorage.setItem('JRK_QUICK_RESTOCK_ITEM_ID', prod.item_id);
                                    onNavigate('products');
                                  }}
                                  className="mt-3.5 px-3 py-1 bg-rose-650 hover:bg-rose-700 text-white rounded-lg text-[11px] font-black w-fit transition-colors flex items-center gap-1 border border-rose-300"
                                >
                                  ⚡ ป้อนสต็อกด่วน (Quick Restock)
                                </button>
                              </>
                            ) : (
                              <>
                                <h4 className="font-extrabold text-sm text-[#1D1B20] flex items-center gap-1.5">
                                  {isOverdueMoreThan7Days && <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping inline-block"></span>}
                                  {a.title}
                                </h4>
                                <p className="text-xs mt-1 font-medium text-[#49454F]">
                                  {a.detail}
                                  {overdueDays > 0 && (
                                    <span className="block mt-1 text-red-700 font-black">
                                      ⚠️ เกินกำหนดมานานถึง {overdueDays} วันในระบบ
                                    </span>
                                  )}
                                </p>

                                {associatedReceipt && (associatedReceipt.debt_amount > 0 || associatedReceipt.return_status === 'กำลังเช่า' || associatedReceipt.return_status === 'คืนบางส่วน') && (
                                  <div className="mt-3 bg-[#F3EDF7] p-2.5 rounded-lg border border-[#CAC4D0] text-left">
                                    <p className="text-[9px] text-[#49454F] uppercase font-black mb-1">หน้าต่างทวงถามบิลและสัญญาเช่า</p>
                                    <div className="flex flex-wrap justify-between text-[11px] gap-x-2 text-[#49454F] font-semibold">
                                      <span>ลูกค้า: <strong className="text-[#21005D] font-black">{associatedReceipt.customer_name}</strong></span>
                                      {associatedReceipt.phone && <span>โทร: <strong className="text-[#1D1B20] font-bold">{associatedReceipt.phone}</strong></span>}
                                      {associatedReceipt.debt_amount > 0 && <span>ค้าง: <strong className="text-red-700 font-black">฿{associatedReceipt.debt_amount.toLocaleString()}</strong></span>}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenReminder(
                                        associatedReceipt.customer_name,
                                        associatedReceipt.phone,
                                        associatedReceipt.receipt_no,
                                        associatedReceipt.debt_amount,
                                        associatedReceipt.due_date
                                      )}
                                      className="mt-2.5 w-full flex items-center justify-center gap-1 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded font-black text-[10px] transition-colors shadow-md uppercase tracking-wider"
                                    >
                                      📢 ส่งข้อความทวงหนี้ (คลิกเดียว)
                                    </button>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                          <div className="mt-4 pt-2 border-t border-[#CAC4D0]/60 flex justify-end">
                            <button 
                              onClick={() => onNavigate(a.target_menu)}
                              className="text-[11px] font-bold text-white bg-[#21005D] px-3 py-1.5 rounded hover:bg-[#381E72] transition-colors shadow-sm"
                            >
                              เปิดดูหน้า {a.target_menu === 'returns' ? 'จัดการคืนของ/ตามหนี้' : 'จัดการสินค้าคลัง'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Recent Receipts */}
          {activeTab === 'recent' && (
            <div className="space-y-4">
              <h3 className="text-md font-bold text-[#21005D] mb-3 flex items-center gap-2">
                <FileText className="stroke-[#21005D]" size={18} />
                บิลที่มีรายการออกล่าสุด 8 รายการถัดไป
              </h3>
              {receipts.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-[#CAC4D0] rounded-xl bg-[#F3EDF7]">
                  <p className="text-[#49454F] text-sm font-semibold">ยังไม่มีรายการชำระเงินหรือออกบิล</p>
                  <button 
                    onClick={() => onNavigate('pos')}
                    className="mt-3 px-4 py-2 bg-[#21005D] text-white text-xs font-bold rounded-lg hover:bg-[#381E72] transition-colors"
                  >
                    ออกบิลขาย/เช่าวัสดุชิ้นแรก
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse font-bold">
                    <thead>
                      <tr className="border-b border-[#CAC4D0] text-[#49454F] uppercase tracking-wider h-10">
                        <th className="pb-2">เลขที่เอกสาร</th>
                        <th className="pb-2">ลูกค้า</th>
                        <th className="pb-2">ประเภทเอกสาร</th>
                        <th className="pb-2 text-right">ยอดสุทธิ (฿)</th>
                        <th className="pb-2 text-right">สถานะชำระ</th>
                        <th className="pb-2 text-right">ใบส่งของ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#CAC4D0]/60 text-[#1D1B20]">
                      {receipts.map(r => (
                        <tr key={r.receipt_id} className="h-11 hover:bg-[#F3EDF7]/50 transition-colors">
                          <td className="text-[#21005D] font-extrabold">{r.receipt_no}</td>
                          <td>{r.customer_name}</td>
                          <td>{r.receipt_title}</td>
                          <td className="text-right text-[#1D1B20]">฿{r.grand_total.toLocaleString()}</td>
                          <td className="text-right">
                            <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-extrabold ${
                              r.payment_status === 'ชำระครบ' 
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                                : r.payment_status === 'ชำระบางส่วน' 
                                ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {r.payment_status}
                            </span>
                          </td>
                          <td className="text-right">
                            <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-extrabold transition-all duration-300 ${
                              r.return_status === 'คืนครบแล้ว' 
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                                : r.return_status === 'คืนบางส่วน' 
                                ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                                : r.return_status === 'กำลังเช่า'
                                ? 'bg-rose-55 border-red-500 text-rose-700 animate-pulse shadow-sm'
                                : 'bg-[#EADDFF] text-[#21005D] border border-[#D0BCFF]'
                            }`}>
                              {r.return_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Income Tab (Real-Time Metrics) */}
          {activeTab === 'income' && (() => {
            const allDbReceipts = pollsReceipts;
            const totalBilling = allDbReceipts.reduce((sum, r) => sum + r.grand_total, 0);
            const totalPaid = allDbReceipts.reduce((sum, r) => sum + r.paid_amount, 0);
            const totalCash = allDbReceipts.reduce((sum, r) => sum + (r.paid_cash || 0), 0);
            const totalTransfer = allDbReceipts.reduce((sum, r) => sum + (r.paid_transfer || 0), 0);
            const totalDebt = allDbReceipts.reduce((sum, r) => sum + (r.debt_amount || 0), 0);
            const totalPenalty = allDbReceipts.reduce((sum, r) => sum + (r.penalty_amount || 0), 0);

            let rentSubtotal = 0;
            let saleSubtotal = 0;
            allDbReceipts.forEach(r => {
              try {
                const items = JSON.parse(r.items_json || '[]') as BillItemRef[];
                items.forEach(itm => {
                  if (itm.line_mode === 'rent') {
                    rentSubtotal += (itm.line_total || 0);
                  } else {
                    saleSubtotal += (itm.line_total || 0);
                  }
                });
              } catch (_) {}
            });
            const totalSubtotal = rentSubtotal + saleSubtotal || 1;
            const rentPercent = Math.round((rentSubtotal / totalSubtotal) * 100);
            const salePercent = Math.max(0, 100 - rentPercent);

            const monthlyIncomes: { [key: string]: { total: number, paid: number, debt: number, cash: number, transfer: number } } = {};
            allDbReceipts.forEach(r => {
              const month = (r.receipt_date || r.created_at || '').slice(0, 7);
              if (!month) return;
              if (!monthlyIncomes[month]) {
                monthlyIncomes[month] = { total: 0, paid: 0, debt: 0, cash: 0, transfer: 0 };
              }
              monthlyIncomes[month].total += r.grand_total;
              monthlyIncomes[month].paid += r.paid_amount;
              monthlyIncomes[month].debt += r.debt_amount;
              monthlyIncomes[month].cash += (r.paid_cash || 0);
              monthlyIncomes[month].transfer += (r.paid_transfer || 0);
            });
            const sortedMonths = Object.keys(monthlyIncomes).sort().reverse();

            return (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <h3 className="text-md font-bold text-[#21005D] mb-1 flex items-center gap-2">
                      <TrendingUp className="stroke-[#21005D]" size={18} />
                      สรุปผลการดำเนินงานและสถิติรายได้ทั้งหมดในระบบ
                    </h3>
                    <p className="text-xs text-[#49454F] uppercase font-semibold">อัปเดตข้อมูลทางการเงินสดและเงินโอนอัตโนมัติจากทุกการทำรายการขายและเช่า</p>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-250 text-emerald-800 text-xs font-black tracking-wider uppercase">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping"></span>
                    <span>Streaming Live (Polled {lastPolledTime})</span>
                  </div>
                </div>

                {/* Grid stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-xl text-left relative overflow-hidden">
                    <p className="text-[10px] text-emerald-800 uppercase font-black tracking-wider mb-1">รายรับที่ได้รับแล้วสะสม (Paid)</p>
                    <h4 className="text-2xl font-black text-emerald-950">฿{totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h4>
                    <p className="text-[10px] text-[#49454F] mt-2 font-bold">จากยอดเรียกเก็บรวม ฿{totalBilling.toLocaleString()}</p>
                    <Coins className="absolute top-4 right-4 stroke-emerald-900 opacity-20" size={36} />
                  </div>

                  <div className="bg-sky-50 border border-sky-205 p-5 rounded-xl text-left relative overflow-hidden">
                    <p className="text-[10px] text-sky-850 uppercase font-black tracking-wider mb-1">รับชำระผ่านเงินสด (Cash)</p>
                    <h4 className="text-2xl font-black text-sky-950">฿{totalCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h4>
                    <p className="text-[10px] text-[#49454F] mt-2 font-bold">คิดเป็น {totalPaid > 0 ? Math.round((totalCash / totalPaid) * 100) : 0}% ของเครื่องรับเงิน</p>
                    <DollarSign className="absolute top-4 right-4 stroke-sky-900 opacity-20" size={36} />
                  </div>

                  <div className="bg-[#F3EDF7] border border-[#D0BCFF] p-5 rounded-xl text-left relative overflow-hidden">
                    <p className="text-[10px] text-[#4F378B] uppercase font-black tracking-wider mb-1">รับโอนผ่านบัญชีธนาคาร (Transfer)</p>
                    <h4 className="text-2xl font-black text-[#21005D]">฿{totalTransfer.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h4>
                    <p className="text-[10px] text-[#49454F] mt-2 font-bold">คิดเป็น {totalPaid > 0 ? Math.round((totalTransfer / totalPaid) * 100) : 0}% ของเครื่องรับเงิน</p>
                    <ArrowUpRight className="absolute top-4 right-4 stroke-[#21005D] opacity-20" size={36} />
                  </div>

                  <div className="bg-rose-50 border border-rose-200 p-5 rounded-xl text-left relative overflow-hidden">
                    <p className="text-[10px] text-rose-800 uppercase font-black tracking-wider mb-1">ลูกหนี้/ยอดค้างชำระทั้งหมด (Debt)</p>
                    <h4 className="text-2xl font-black text-rose-950">฿{totalDebt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h4>
                    <p className="text-[10px] text-[#49454F] mt-2 font-bold">จากลูกหนี้รวมสัญญาเช่าทั้งหมด</p>
                    <AlertTriangle className="absolute top-4 right-4 stroke-rose-900 opacity-25" size={36} />
                  </div>
                </div>

                {/* Rent vs Sale ratio bar */}
                <div className="bg-[#F3EDF7] p-4 rounded-xl border border-[#CAC4D0] text-left">
                  <div className="flex justify-between items-center mb-1.5 text-xs text-[#49454F] font-extrabold uppercase">
                    <span>ประเภทสัญญาย่อย: เช่าวัสดุ ({rentPercent}%)</span>
                    <span>ประเภทสินค้าสำเร็จรูป: ซื้อขาด ({salePercent}%)</span>
                  </div>
                  <div className="w-full bg-[#EADDFF] h-2.5 rounded-full overflow-hidden flex">
                    <div className="bg-[#6750A4] h-full transition-all duration-300" style={{ width: `${rentPercent}%` }} />
                    <div className="bg-[#D0BCFF] h-full transition-all duration-300 flex-1" />
                  </div>
                  <div className="flex justify-between items-center mt-2 text-[10px] text-[#49454F] font-bold">
                    <span>มูลค่าก่อนปรับหักส่วนลดเช่า: ฿{rentSubtotal.toLocaleString()}</span>
                    <span>มูลค่าสินค้าขายสำเร็จรูป: ฿{saleSubtotal.toLocaleString()}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  {/* Monthly Income summary */}
                  <div className="xl:col-span-1 bg-white border border-[#CAC4D0] p-5 rounded-xl shadow-sm">
                    <h4 className="text-sm font-bold text-[#21005D] mb-4 uppercase tracking-wider">สรุปรายรับแยกตามเดือน (Monthly Incomes)</h4>
                    {sortedMonths.length === 0 ? (
                      <p className="text-xs text-[#49454F] font-bold py-6 text-center">ยังไม่มีข้อมูลรายเดือนสะสม</p>
                    ) : (
                      <div className="space-y-3">
                        {sortedMonths.map(m => {
                          const data = monthlyIncomes[m];
                          const [year, month] = m.split('-');
                          const monthNamesTH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
                          const name = `${monthNamesTH[parseInt(month) - 1]} ${parseInt(year) + 543}`;
                          return (
                            <div key={m} className="bg-[#F3EDF7] p-3 rounded-lg border border-[#CAC4D0] hover:border-[#D0BCFF] transition-colors">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-black text-[#21005D]">{name}</span>
                                <span className="text-xs font-bold text-[#1D1B20]">บิลรวม: ฿{data.total.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between items-center text-[10px] text-[#49454F] mt-1">
                                <span>รับชำระแล้ว: <strong className="text-emerald-700 font-bold">฿{data.paid.toLocaleString()}</strong></span>
                                <span>ค้างชำระ: <strong className="text-rose-700 font-bold">฿{data.debt.toLocaleString()}</strong></span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Transaction breakdown details */}
                  <div className="xl:col-span-2 bg-white border border-[#CAC4D0] p-5 rounded-xl shadow-sm">
                    <h4 className="text-sm font-bold text-[#21005D] mb-4 uppercase tracking-wider">บันทึกประวัติการรับชำระและค่าปรับเฉลี่ย</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[11px] border-collapse font-bold">
                        <thead>
                          <tr className="border-b border-[#CAC4D0] text-[#49454F] uppercase h-9">
                            <th className="pb-2">วันที่ออกบิล</th>
                            <th className="pb-2">ลูกค้า</th>
                            <th className="pb-2 text-right">ยอดรับจริง (฿)</th>
                            <th className="pb-2 text-right">เงินสด (฿)</th>
                            <th className="pb-2 text-right">เงินโอน (฿)</th>
                            <th className="pb-2 text-right">ค่าขนส่ง/เบ็ดเตล็ด</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#CAC4D0]/60 text-[#1D1B20]">
                          {allDbReceipts.slice(0, 15).map(r => (
                            <tr key={r.receipt_id} className="h-10 hover:bg-[#F3EDF7]/50 transition-colors">
                              <td className="text-[#49454F] font-mono">{(r.receipt_date || '').slice(0, 10)}</td>
                              <td className="text-[#1D1B20] font-medium">{r.customer_name}</td>
                              <td className="text-right text-emerald-700">฿{r.paid_amount.toLocaleString()}</td>
                              <td className="text-right text-[#49454F]">฿{(r.paid_cash || 0).toLocaleString()}</td>
                              <td className="text-right text-[#49454F]">฿{(r.paid_transfer || 0).toLocaleString()}</td>
                              <td className="text-right text-[#4F378B]">฿{(r.delivery_fee || 0).toLocaleString()}</td>
                            </tr>
                          ))}
                          {allDbReceipts.length === 0 && (
                            <tr>
                              <td colSpan={6} className="text-center py-6 text-[#49454F] font-bold">ไม่มีรายการธุรกรรมการเงินในระะบบ</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Debt Reminder Dialog Modal */}
      {reminderModalData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#CAC4D0] p-6 rounded-2xl w-full max-w-lg shadow-2xl relative text-left">
            <h3 className="text-md font-extrabold text-[#1D1B20] flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
              ประมวลระบบทวงหนี้และข้อความแจ้งเตือน (One-Click Reminder)
            </h3>
            <p className="text-xs text-[#49454F] mb-4 font-semibold uppercase tracking-wide">
              คุณกำลังร่างแบบข้อเตือนใจกรณีบิลยังไม่ชำระค่าไม้แบบ/วัสดุก่อสร้าง เพื่อส่งต่อให้ลูกค้ารับทราบ
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] text-[#49454F] uppercase font-black mb-1">ชื่อผู้ติดต่อ / และเบอร์</label>
                <div className="bg-[#F3EDF7] border border-[#CAC4D0] p-2.5 rounded-lg text-[#21005D] text-xs font-bold font-sans">
                  {reminderModalData.customerName} {reminderModalData.phone ? `(${reminderModalData.phone})` : '(ไม่มีเบอร์โทรในระบบ)'}
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-[#49454F] uppercase font-black mb-1">ร่างชุดข้อความทางการ (Official Template)</label>
                <textarea
                  className="w-full bg-white border border-[#CAC4D0] rounded-lg p-3 text-xs font-sans font-medium text-[#1D1B20] h-40 outline-none focus:border-[#21005D] resize-none leading-relaxed"
                  value={reminderModalData.messageText}
                  onChange={e => setReminderModalData({ ...reminderModalData, messageText: e.target.value })}
                />
              </div>

              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(reminderModalData.messageText);
                    alert('คัดลอกร่างข้อความทวงหนี้ของคุณลงคลิปบอร์ดแล้ว!');
                  }}
                  className="flex-1 py-2.5 bg-[#21005D] hover:bg-[#381E72] text-white rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow animate-none"
                >
                  📥 คัดลอกข้อเตือนใจ (Copy Message)
                </button>
                <button
                  type="button"
                  onClick={() => setReminderModalData(null)}
                  className="px-4 py-2.5 bg-[#F3EDF7] hover:bg-[#ECE6F0] text-[#21005D] border border-[#CAC4D0] rounded-lg text-xs font-bold transition-all"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Replenishment Requisition Modal */}
      {requisitionModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-rose-200 rounded-3xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl relative text-left overflow-hidden">
            {/* Modal Header */}
            <div className="bg-[#38000A] text-white p-5 shrink-0 flex justify-between items-center">
              <div className="space-y-1">
                <h3 className="text-md font-extrabold flex items-center gap-2">
                  <ShoppingCart size={18} className="stroke-rose-400" />
                  ใบคำขอจัดส่งตรวจสอบความต้องการสั่งจัดซื้อพลาสติกและคลังวัสดุ (Replenishment Requisition)
                </h3>
                <p className="text-[10px] text-gray-300 font-medium select-none">ระบบคำนวณสัดส่วนสินค้าสต็อกต่ำอัตโนมัติ เพื่อจัดสรรและเติมคลังคงไว้สำหรับการใช้งานเช่า</p>
              </div>
              <button
                type="button"
                className="text-white hover:text-rose-200 p-1 rounded-full hover:bg-white/10 transition-colors"
                onClick={() => setRequisitionModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {requisitionSuccessMessage && (
                <div className="bg-emerald-50 border border-emerald-250 text-emerald-800 p-3.5 rounded-xl text-xs font-bold">
                  ✅ {requisitionSuccessMessage}
                </div>
              )}

              <div className="space-y-1 select-none">
                <span className="text-[11px] font-black uppercase text-gray-400">รายการหมุนเวียนวัสดุเกรดสแตนดาร์ด ({requisitionList.length} รายการสต็อกตํ่า)</span>
                <p className="text-[10px] text-gray-500 font-medium">คุณสามารถตรวจสอบ ปรับเปลี่ยนค่าสัดส่วนสั่งและเป้าหมายผู้ผลิตก่อนทำการบันทึกข้อมูลและนำคัดลอกร่างจัดซื้อ</p>
              </div>

              {requisitionList.length === 0 ? (
                <div className="text-center py-12 border border-dashed rounded-xl bg-gray-50">
                  <PackageOpen className="mx-auto text-gray-300 mb-2" size={32} />
                  <p className="text-xs font-bold text-gray-500">ไม่พบสินค้าคลังตํ่ากว่าเกณฑ์ในการเจาะลึกจัดซื้อใบนี้</p>
                </div>
              ) : (
                <div className="border border-gray-150 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-xs text-left text-gray-700 border-collapse table-auto font-bold">
                    <thead>
                      <tr className="bg-[#FFF6F3] text-gray-700 h-9">
                        <th className="p-2 border-b">หมวดหมู่/วัสดุ</th>
                        <th className="p-2 border-b text-center">คงเหลือปัจจุบัน</th>
                        <th className="p-2 border-b text-center">เกณฑ์เตือนภัย</th>
                        <th className="p-2 border-b text-center w-28">สั่งจัดซื้อเพิ่ม</th>
                        <th className="p-2 border-b text-center">หน่วย</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-105">
                      {requisitionList.map(it => (
                        <tr key={it.item_id} className="h-11 hover:bg-red-50/10 transition-colors">
                          <td className="p-2">
                            <div className="font-extrabold text-gray-900">{it.item_name}</div>
                            {it.sku && <div className="text-[9px] text-gray-400 font-mono">SKU: {it.sku}</div>}
                          </td>
                          <td className="p-2 text-center text-rose-700 font-extrabold">
                            {it.qty_available}
                          </td>
                          <td className="p-2 text-center text-gray-500 font-semibold font-sans">
                            {it.low_stock_threshold}
                          </td>
                          <td className="p-2 text-center">
                            <input
                              type="number"
                              min="1"
                              className="w-20 bg-white border border-gray-300 rounded px-2 py-0.5 text-center text-xs font-bold outline-none focus:border-red-650"
                              value={it.qty_to_order}
                              onChange={e => handleUpdateRequisitionQty(it.item_id, parseInt(e.target.value) || 1)}
                            />
                          </td>
                          <td className="p-2 text-center text-gray-400">
                            {it.unit}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="bg-[#FFFBF9] border border-red-100 rounded-xl p-3.5 space-y-1 text-[11px] leading-relaxed select-none">
                <span className="font-bold text-rose-850 uppercase block">💡 แนะนำสัดส่วน:</span>
                <p className="text-gray-650 font-semibold">
                  ปริมาณจัดเติมสต็อกประเมินจากสูตร <code className="bg-rose-50 px-1 py-0.5 rounded text-rose-700 font-black font-mono">Math.ceil(low_stock_threshold * 2.5 - qty_available)</code> ยืดหยุ่นสูงสุด ซึ่งช่วยรักษารอบจำนวนสินค้าเช่าให้สูงเพียงพอแก่ยอดนัดส่งมอบที่จองล่วงหน้าเข้ามาในคลัง
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4.5 border-t border-gray-150 shrink-0 flex flex-wrap justify-between items-center gap-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCopyRequisitionText}
                  className={`px-4 py-2 bg-gradient-to-r text-xs font-black rounded-xl transition-all flex items-center gap-1.5 shadow ${
                    requisitionCopied 
                      ? 'from-emerald-600 to-emerald-700 text-white' 
                      : 'from-[#9B1313] to-[#CD1C18] text-white hover:opacity-90'
                  }`}
                >
                  <Clipboard size={14} />
                  <span>{requisitionCopied ? '✓ คัดลอกสำเร็จ!' : '📋 คัดลอกข้อความเป็นข้อร่างจัดสั่ง'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadRequisitionText}
                  className="px-4 py-2 bg-white border hover:bg-gray-50 text-gray-700 text-xs font-extrabold rounded-xl transition-colors flex items-center gap-1"
                >
                  <Download size={14} />
                  <span>ดาวน์โหลดใบคำขอ (.TXT)</span>
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveRequisitionToDB}
                  className="px-4 py-2 bg-gray-950 hover:bg-black text-white text-xs font-black rounded-xl transition-colors shadow flex items-center gap-1"
                >
                  <Check size={14} />
                  <span>💾 บันทึกสิทธิประเมิน</span>
                </button>

                <button
                  type="button"
                  className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-bold rounded-xl transition-colors"
                  onClick={() => setRequisitionModalOpen(false)}
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

