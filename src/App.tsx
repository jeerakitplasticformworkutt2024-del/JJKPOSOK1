/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { JirakitDB } from './db';
import Dashboard from './components/Dashboard';
import POS from './components/POS';
import Returns from './components/Returns';
import Bills from './components/Bills';
import Customers from './components/Customers';
import Products from './components/Products';
import Analytics from './components/Analytics';
import Accounting from './components/Accounting';
import Settings from './components/Settings';
import Security from './components/Security';
import Contracts from './components/Contracts';

import { 
  Home, 
  ShoppingCart, 
  RefreshCw, 
  FileText, 
  Users, 
  Package, 
  TrendingUp, 
  Wallet, 
  Settings as SettingsIcon, 
  Lock, 
  Menu, 
  X,
  Bell,
  HardDrive,
  QrCode,
  CheckCircle2,
  ArrowLeft,
  AlertTriangle,
  CreditCard,
  FileCheck
} from 'lucide-react';

type MenuID = 'dashboard' | 'pos' | 'returns' | 'bills' | 'customers' | 'products' | 'analytics' | 'accounting' | 'settings' | 'security' | 'contracts';

export default function App() {
  const [currentMenu, setCurrentMenu] = useState<MenuID>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    return typeof window !== 'undefined' ? window.innerWidth >= 1280 : false;
  });
  const [refreshCount, setRefreshCount] = useState(0);
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [unreadAlertsCount, setUnreadAlertsCount] = useState(0);

  // Unified Date Range state persisted across Dashboard and Bills tabs
  const [applyDateFilter, setApplyDateFilter] = useState(true);
  const [sharedStartDate, setSharedStartDate] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 2); // default range: 2 months back
    return d.toISOString().slice(0, 10);
  });
  const [sharedEndDate, setSharedEndDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });

  // Check if we have public payment URL query ?pay=
  const [payReceiptId, setPayReceiptId] = useState<string | null>(null);
  const [paySuccess, setPaySuccess] = useState(false);
  const [proofFile, setProofFile] = useState<string>('');
  const [payingAmountVal, setPayingAmountVal] = useState<number>(0);

  // Check if we have public contract URL query ?contract_id= or ?ctr=
  const [viewContractId, setViewContractId] = useState<string | null>(null);

  const triggerRefresh = () => {
    setRefreshCount(prev => prev + 1);
  };

  useEffect(() => {
    // Sync clock updates matching the real live UTC/Thai hour
    const updateTime = () => {
      const d = new Date();
      setTimeStr(d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setDateStr(d.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);

    // Hydrate parameters
    const params = new URLSearchParams(window.location.search);
    
    const payId = params.get('pay');
    if (payId) {
      setPayReceiptId(payId);
      const rcList = JirakitDB.getReceipts();
      const match = rcList.find(r => r.receipt_id === payId);
      if (match) {
        setPayingAmountVal(match.debt_amount || 0);
      }
    }

    const ctrId = params.get('contract_id') || params.get('ctr') || params.get('contract');
    if (ctrId) {
      setViewContractId(ctrId);
    }

    return () => clearInterval(interval);
  }, []);

  // Global Button Press Glow & Ripple Effect Setup (Global Button Press Glow Interaction)
  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      const selector = 'button, .btn, .btn-del, .btn-preview, .cat-btn, .ctrl-btn, .rent-all-btn, .day-chip, .modal-actions button, .global-press-glow';
      const button = target.closest(selector);
      if (!button) return;

      // Dynamically assign the CSS glow transitions to the button if not set
      if (!button.classList.contains('global-press-glow')) {
        button.classList.add('global-press-glow');
      }

      const rect = button.getBoundingClientRect();
      const ripple = document.createElement('span');

      const size = Math.max(rect.width, rect.height);
      const x = event.clientX - rect.left - size / 2;
      const y = event.clientY - rect.top - size / 2;

      ripple.className = 'button-ripple';
      ripple.style.width = `${size}px`;
      ripple.style.height = `${size}px`;
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;

      // Clean up previous ripple if still active on the button
      const oldRipple = button.querySelector('.button-ripple');
      if (oldRipple) oldRipple.remove();

      button.appendChild(ripple);

      setTimeout(() => {
        ripple.remove();
      }, 500);
    };

    document.addEventListener('pointerdown', handlePointerDown, { passive: true });

    // Define globally for dynamic views or direct calls
    (window as any).installGlobalButtonRippleEffect = () => {
      try {
        const selector = 'button, .btn, .btn-del, .btn-preview, .cat-btn, .ctrl-btn, .rent-all-btn, .day-chip, .modal-actions button';
        const buttons = document.querySelectorAll(selector);
        buttons.forEach((btn) => {
          if (!btn.classList.contains('global-press-glow')) {
            btn.classList.add('global-press-glow');
          }
        });
      } catch (e) {
        console.warn('Manual ripple install warning:', e);
      }
    };

    // Run trigger once for initially rendered elements
    (window as any).installGlobalButtonRippleEffect();

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, []);

  useEffect(() => {
    // Simple count of alerts
    const prods = JirakitDB.getProducts();
    const rcs = JirakitDB.getReceipts();
    
    let lowStock = prods.filter(p => p.qty_available <= p.low_stock_threshold && p.item_status === 'Active').length;
    let unpaid = rcs.filter(r => r.debt_amount > 0).length;
    
    setUnreadAlertsCount(lowStock + unpaid);
  }, [refreshCount, currentMenu]);

  const MENUS: { id: MenuID; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'หน้าแรก', icon: <Home size={18} /> },
    { id: 'pos', label: 'ขาย/เช่า POS', icon: <ShoppingCart size={18} /> },
    { id: 'returns', label: 'คืนอุปกรณ์', icon: <RefreshCw size={18} /> },
    { id: 'bills', label: 'ประวัติบิล', icon: <FileText size={18} /> },
    { id: 'contracts', label: 'สัญญาเช่า', icon: <FileCheck size={18} /> },
    { id: 'customers', label: 'ข้อมูลลูกค้า', icon: <Users size={18} /> },
    { id: 'products', label: 'จัดการสินค้า', icon: <Package size={18} /> },
    { id: 'analytics', label: 'วิเคราะห์รายได้', icon: <TrendingUp size={18} /> },
    { id: 'accounting', label: 'บัญชี & สเตทเม้นท์', icon: <Wallet size={18} /> },
    { id: 'settings', label: 'ตั้งค่าระบบ', icon: <SettingsIcon size={18} /> },
    { id: 'security', label: 'ความปลอดภัย', icon: <Lock size={18} /> }
  ];

  const handleFakeSlipUploader = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofFile(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCustomerSubmitPayment = (e: React.FormEvent, rc: any) => {
    e.preventDefault();
    if (!rc) return;
    if (!proofFile) {
      alert('กรุณาเลือกไฟล์รูปภาพหลักฐานการโอนเงิน (สลิป)');
      return;
    }
    
    const amt = Number(payingAmountVal || 0);
    if (amt <= 0 || amt > rc.debt_amount) {
      alert(`กรุณากรอกยอดโอนเงินระหว่าง 1 ถึง ${rc.debt_amount} บาท`);
      return;
    }

    const updatedDebt = Math.max(0, rc.debt_amount - amt);
    const updatedPaid = rc.paid_amount + amt;
    
    const updatedRc = {
      ...rc,
      debt_amount: updatedDebt,
      paid_amount: updatedPaid,
      payment_status: updatedDebt <= 0 ? 'ชำระครบ' : 'ชำระบางส่วน',
      payment_proof_url: proofFile,
      payment_confirmed_at: new Date().toISOString(),
      note: rc.note ? `${rc.note}\n[ชำระออนไลน์ผ่านลิงก์ ฿${amt}]` : `[ชำระออนไลน์ผ่านลิงก์ ฿${amt}]`
    };
    
    JirakitDB.updateReceipt(updatedRc);
    setPaySuccess(true);
    triggerRefresh();
  };

  if (payReceiptId) {
    const rc = JirakitDB.getReceipts().find(r => r.receipt_id === payReceiptId);
    const shopSettings = JirakitDB.getSettings();

    return (
      <div className="min-h-screen bg-[#F3EDF7] text-[#1D1B20] flex items-center justify-center p-4 sm:p-6 font-sans antialiased">
        <div className="w-full max-w-2xl bg-[#FFFBFE] rounded-3xl border border-[#CAC4D0] shadow-2xl overflow-hidden flex flex-col">
          {/* Header Portal banner */}
          <div className="bg-gradient-to-r from-[#21005D] to-[#4F378B] px-6 py-5 border-b border-[#CAC4D0]/60 flex items-center justify-between">
            <div className="flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-xl bg-[#EADDFF] text-[#21005D] flex items-center justify-center font-black text-2xl">J</div>
              <div>
                <h1 className="text-sm font-black tracking-tight text-white uppercase">{shopSettings.SHOP_NAME}</h1>
                <p className="text-[10px] text-[#D0BCFF] font-bold mt-0.5 uppercase tracking-wider">ระบบแจ้งเรียกเก็บหนี้ / สแกนรับเงินด่วน</p>
              </div>
            </div>
            
            <button 
              onClick={() => {
                const cleanUrl = window.location.origin + window.location.pathname;
                window.history.replaceState({}, document.title, cleanUrl);
                setPayReceiptId(null);
                setPaySuccess(false);
                setProofFile('');
              }}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#EADDFF] hover:bg-[#D0BCFF] text-[#21005D] rounded-lg text-xs font-bold border border-[#CAC4D0] transition-colors"
            >
              <ArrowLeft size={12} /> ย้อนกลับ POS
            </button>
          </div>

          {!rc ? (
            <div className="p-12 text-center space-y-4">
              <AlertTriangle className="text-rose-500 mx-auto" size={40} />
              <p className="text-md font-bold text-[#1D1B20]">ไม่พบรหัสใบเสร็จนี้ในฐานระบบจัดเก็บ</p>
              <p className="text-xs text-[#49454F]">กรุณาตรวจสอบลิงก์การชำระเงินที่ทางคลังวัสดุแชร์ให้อีกครั้ง</p>
            </div>
          ) : paySuccess ? (
            <div className="p-8 sm:p-12 text-center space-y-6">
              <div className="w-16 h-16 bg-[#EADDFF] text-[#21005D] border border-[#CAC4D0] rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={36} />
              </div>
              <div className="space-y-4">
                <h2 className="text-xl font-black text-[#21005D]">ส่งหลักฐานโอนเงินเรียบร้อยแล้ว!</h2>
                <p className="text-xs text-[#49454F] font-bold">ระบบได้ตัดยอดหนี้ คืนประวัติ ยื่นสลิปโอนเงินเสร็จสมบูรณ์</p>
              </div>

              <div className="bg-[#F3EDF7] border border-[#CAC4D0] p-4 rounded-2xl max-w-sm mx-auto space-y-2 text-xs font-semibold text-left text-[#1D1B20]">
                <p className="flex justify-between">
                  <span className="text-[#49454F]">เลขอ้างอิงบิลคลัง:</span>
                  <span className="text-[#1D1B20] font-mono font-bold">{rc.receipt_no}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-[#49454F]">ลูกค้าผู้ดูแลสัญญา:</span>
                  <span className="text-[#21005D] font-bold">{rc.customer_name}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-[#49454F]">ยอดที่ชำระเพิ่มเติม:</span>
                  <span className="text-[#21005D] font-extrabold font-mono">฿{payingAmountVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-[#49454F]">ยอดหนี้ค้างชำระคงเหลือ:</span>
                  <span className="text-[#1D1B20] font-extrabold font-mono">฿{(Math.max(0, rc.debt_amount - payingAmountVal)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </p>
              </div>

              <button 
                onClick={() => {
                  setPaySuccess(false);
                  setProofFile('');
                  const freshRc = JirakitDB.getReceipts().find(r => r.receipt_id === payReceiptId);
                  if (freshRc) setPayingAmountVal(freshRc.debt_amount || 0);
                }}
                className="px-6 py-2.5 bg-[#21005D] text-white font-extrabold text-xs rounded-xl hover:bg-[#381E72] transition-colors"
              >
                ดูสรุปสัญญาระยะยอดหนี้ที่เหลือ
              </button>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {/* Receipt short info card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#F3EDF7] border border-[#CAC4D0] p-4 rounded-2xl text-xs font-semibold text-[#1D1B20] text-left">
                <div className="space-y-1">
                  <p className="text-[#49454F] text-[10px]">บิลคลังอ้างอิง</p>
                  <p className="text-sm font-black text-[#21005D]">{rc.receipt_no}</p>
                  <p className="text-[10px] text-[#4F378B] font-bold mt-1">ประเภทเอกสาร: {rc.receipt_title}</p>
                </div>
                <div className="space-y-1 sm:text-right">
                  <p className="text-[#49454F] text-[10px]">ชื่อผู้ดำเนินการสัญญา</p>
                  <p className="text-sm font-black text-[#21005D]">{rc.customer_name}</p>
                  <p className="text-[10px] text-[#49454F] mt-1">วันที่ปล่อยไม้แบบ: {rc.rent_date || '-'}</p>
                </div>
              </div>

              {/* Amount unpaid callout */}
              <div className="border border-[#D0BCFF] bg-[#EADDFF] rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-left">
                <div className="space-y-1">
                  <p className="text-xs font-extrabold text-[#21005D] uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#6750A4] shrink-0"></span> ยอดรอเรียกเก็บค้างจ่าย (Debt Amount)
                  </p>
                  <p className="text-[11px] text-[#4F378B] leading-normal font-medium">เพื่อปิดสัญญาเช่าและรับเครดิตเพิ่มในการสั่งปล่อยของค่ายปกติ</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-2xl font-black text-[#21005D] font-mono">฿{rc.debt_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
              </div>

              <form onSubmit={(e) => handleCustomerSubmitPayment(e, rc)} className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                {/* PromptPay scanning widget */}
                <div className="border border-[#CAC4D0] bg-[#FFFBFE] p-5 rounded-2xl flex flex-col justify-between text-[#1D1B20] text-center space-y-4">
                  <div className="space-y-1">
                    <p className="text-xs font-black text-[#1D1B20]">สแกนจ่ายทันทีเพื่อปิดยอดหนี้</p>
                    <p className="text-[10px] text-[#49454F] font-medium">แอปธนาคารตรวจลายเซ็นบัญชีชำระได้ตามปกติ</p>
                  </div>

                  <div className="border border-[#CAC4D0] p-2 bg-white rounded-2xl w-[160px] h-[160px] mx-auto flex items-center justify-center">
                    <img 
                      src={shopSettings.BANK_QR_URL || 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://promptpay.io/0812345678/0'} 
                      alt="PromptPay QR" 
                      className="w-full h-full object-contain" 
                    />
                  </div>

                  <div className="text-xs space-y-1">
                    <p className="font-extrabold text-[#1D1B20]">ออมสิน: <span className="font-mono text-[#21005D]">020-4754-01020</span></p>
                    <p className="font-bold text-[#49454F]">ชื่อบัญชี: จักรี เมืองสำนัก</p>
                  </div>
                </div>

                {/* Proof Uploader and Actions */}
                <div className="flex flex-col justify-between space-y-4 text-left">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-extrabold text-[#49454F] mb-1.5">จำนวนเงินที่จะโอนจริง (฿):</label>
                      <input 
                        type="number" 
                        required
                        className="w-full bg-[#FFFBFE] border border-[#CAC4D0] rounded-xl px-3 h-10 text-xs font-mono font-bold text-[#21005D] outline-none focus:border-[#6750A4]"
                        value={payingAmountVal || ''}
                        onChange={e => setPayingAmountVal(Math.min(rc.debt_amount, Number(e.target.value)))}
                      />
                    </div>

                    <div className="border border-dashed border-[#CAC4D0] p-4 rounded-2xl bg-[#F3EDF7] space-y-3 flex flex-col items-center text-center">
                      <p className="text-[10px] text-[#49454F] leading-normal font-bold">
                        อัปโหลดหลักฐานแจ้งโอนเงินสลิปเพื่อตัดยอดคลังค้ำค้างในสัญญาเช่า
                      </p>
                      
                      <input
                        type="file"
                        id="customerPaymentUploader"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFakeSlipUploader}
                      />
                      
                      <button
                        type="button"
                        onClick={() => document.getElementById('customerPaymentUploader')?.click()}
                        className="py-1.5 px-4 bg-[#EADDFF] hover:bg-[#D0BCFF] text-[#21005D] rounded-lg font-bold text-center text-xs transition-colors border border-[#CAC4D0]"
                      >
                        {proofFile ? '✓ แนบรูปภาพแล้ว (เปลี่ยนไฟล์)' : 'แนบรูปภาพสลิปโอนเงินคลัง'}
                      </button>

                      {proofFile && (
                        <div className="w-20 h-20 border border-[#CAC4D0] rounded-lg bg-white overflow-hidden mt-2">
                          <img src={proofFile} alt="Upload receipt" className="w-full h-full object-contain" />
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 bg-[#21005D] hover:bg-[#381E72] text-white font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5"
                  >
                    <QrCode size={14} /> ส่งตรวจสอบยอดพร้อมอัปเดตบิลโอน
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Footer warning */}
          <div className="bg-[#F3EDF7] px-6 py-4 border-t border-[#CAC4D0] text-center text-[10px] text-[#49454F] font-extrabold uppercase tracking-wide">
            {shopSettings.SHOP_ADDRESS} • โทร {shopSettings.SHOP_TELEPHONE}
          </div>
        </div>
      </div>
    );
  }

  if (viewContractId) {
    const cachedHistory = localStorage.getItem('JRK_SAVED_CONTRACTS');
    let contractsTemp: any[] = [];
    if (cachedHistory) {
      try {
        contractsTemp = JSON.parse(cachedHistory);
      } catch (e) {}
    }
    const contract = contractsTemp.find(c => c.contract_id === viewContractId || c.contract_no === viewContractId);
    const shopSettings = JirakitDB.getSettings();

    return (
      <div className="min-h-screen bg-[#F3EDF7] text-[#1D1B20] flex items-center justify-center p-4 sm:p-6 font-sans antialiased">
        <div className="w-full max-w-3xl bg-[#FFFBFE] rounded-3xl border border-[#CAC4D0] shadow-2xl overflow-hidden flex flex-col">
          {/* Header Portal banner */}
          <div className="bg-gradient-to-r from-[#21005D] to-[#4F378B] px-6 py-5 border-b border-[#CAC4D0]/60 flex items-center justify-between animate-none">
            <div className="flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-xl bg-[#EADDFF] text-[#21005D] flex items-center justify-center font-black text-2xl">J</div>
              <div>
                <h1 className="text-sm font-black tracking-tight text-white uppercase">{shopSettings.SHOP_NAME}</h1>
                <p className="text-[10px] text-[#D0BCFF] font-black mt-0.5 uppercase tracking-wider">ระบบตรวจสอบและและดูสัญญาเช่าออนไลน์ (Digital Verification)</p>
              </div>
            </div>
            
            <button 
              onClick={() => {
                const cleanUrl = window.location.origin + window.location.pathname;
                window.history.replaceState({}, document.title, cleanUrl);
                setViewContractId(null);
              }}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#EADDFF] hover:bg-[#D0BCFF] text-[#21005D] rounded-lg text-xs font-bold border border-[#CAC4D0] transition-colors cursor-pointer"
            >
              <ArrowLeft size={12} /> ปิดหน้านี้
            </button>
          </div>

          {!contract ? (
            <div className="p-12 text-center space-y-4">
              <AlertTriangle className="text-rose-500 mx-auto" size={40} />
              <p className="text-md font-bold text-[#1D1B20]">ไม่พบรหัสสัญญาเช่านี้ในสารระบบจัดเก็บ</p>
              <p className="text-xs text-[#49454F] font-semibold">ขออภัย สัญญาเช่าอาจได้รับเปลี่ยนเลขที่ สิ้นสุดความคุ้มครอง หรือยังไม่ได้บันทึกเสร็จสิ้น</p>
            </div>
          ) : (
            <div className="p-6 space-y-6 text-left">
              {/* Short status card */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#F3EDF7] border border-[#CAC4D0] p-4.5 rounded-2xl">
                <div>
                  <p className="text-[10px] uppercase font-black tracking-wider text-[#49454F]">เลขอ้างอิงสัญญาคลัง (Contract No.)</p>
                  <p className="text-lg font-black text-[#21005D] font-mono">{contract.contract_no}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-500">สถานะตามสิทธิกฎหมาย:</span>
                  {contract.status === 'Draft' ? (
                    <span className="bg-amber-100 text-amber-850 border border-amber-250/50 px-3 py-1 rounded-full text-xs font-black">ฉบับร่าง (Draft - รอลายเซ็น)</span>
                  ) : contract.status === 'Signed' ? (
                    <span className="bg-emerald-100 text-emerald-850 border border-emerald-250/50 px-3 py-1 rounded-full text-xs font-black">เปิดสิทธิใช้การ (Signed)</span>
                  ) : (
                    <span className="bg-indigo-100 text-indigo-850 border border-indigo-250/50 px-3 py-1 rounded-full text-xs font-black">พิมพ์หนังสือสัญญาแล้ว (Printed)</span>
                  )}
                </div>
              </div>

              {/* Dynamic contract print view or static fields */}
              <div className="border border-[#CAC4D0] rounded-2xl p-5 bg-white space-y-5 shadow-sm">
                <h3 className="text-xs font-black uppercase tracking-wider text-[#21005D] border-b border-dashed border-[#CAC4D0] pb-2 flex items-center gap-2">
                  <FileCheck size={16} /> ข้อมูลประวัติและคู่สัญญากู้เช่าวัสดุ
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold">
                  <div>
                    <span className="text-[#49454F] block text-[10px] uppercase font-black">ชื่อกู้ยอมรับสัญญา:</span>
                    <span className="text-sm text-[#21005D] font-black">{contract.customer_name}</span>
                  </div>
                  <div>
                    <span className="text-[#49454F] block text-[10px] uppercase font-black">ทะเบียนบัตรประชาชน:</span>
                    <span className="text-sm text-[#1D1B20] font-mono font-black">{contract.id_card_no || 'ไม่ระบุ'}</span>
                  </div>
                  <div>
                    <span className="text-[#49454F] block text-[10px] uppercase font-black">เบอร์ติดต่อโครงการ:</span>
                    <span className="text-sm text-[#1D1B20] font-mono font-black">{contract.phone || 'ไม่ระบุ'}</span>
                  </div>
                  <div>
                    <span className="text-[#49454F] block text-[10px] uppercase font-black">ลงวันที่ร่างสัญญาเช่า:</span>
                    <span className="text-sm text-[#21005D] font-mono font-black">{contract.contract_date}</span>
                  </div>
                  <div className="md:col-span-2">
                    <span className="text-[#49454F] block text-[10px] uppercase font-black">สถานที่ทำงานจัดส่งพิทักษ์:</span>
                    <span className="text-xs text-[#1D1B20] font-semibold leading-relaxed block bg-[#F3EDF7]/40 p-3 rounded-xl border border-[#CAC4D0]/60 mt-1">{contract.address || 'ไม่ระบุสถานที่'}</span>
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className="text-xs font-black text-[#21005D] mb-3 flex items-center gap-1.5 uppercase tracking-wide">
                    <Package size={14} /> ตารางจัดเตรียมพัสดุและไม้แบบในสัญญา (Checklist)
                  </h4>
                  <div className="border border-[#CAC4D0] rounded-xl overflow-hidden shadow-xs">
                    <table className="w-full text-xs text-left font-bold text-slate-700">
                      <thead className="bg-[#F3EDF7]">
                        <tr className="h-9 border-b border-[#CAC4D0] text-[#49454F] font-black text-[10px] tracking-wider uppercase">
                          <th className="p-3 text-center w-12">ลำดับ</th>
                          <th className="p-3">รายการอุปกรณ์สินค้าประกอบแบบ</th>
                          <th className="p-3 text-center w-36">จำนวนเช่า (ชิ้น/หน่วย)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#CAC4D0]/60">
                        {contract.rental_items && contract.rental_items.map((rit: any, idx: number) => (
                          <tr key={idx} className="h-10 hover:bg-[#F3EDF7]/20">
                            <td className="p-3 text-center text-slate-400 font-mono font-medium">{idx + 1}</td>
                            <td className="p-3 text-[#1D1B20] font-extrabold">{rit.item_name}</td>
                            <td className="p-3 text-center font-black font-mono text-rose-600 bg-rose-50/20">{rit.qty} ชิ้น</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-4 border-t border-dashed border-[#CAC4D0]">
                  {/* Deposit Info */}
                  <div className="bg-[#EADDFF] p-4.5 rounded-2xl border border-[#CAC4D0] flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] uppercase text-[#4F378B] font-black tracking-widest block">เงินสดมัดจำค้ำสัญญารวม</span>
                      <p className="text-[11px] font-semibold text-[#21005D] mt-1 opacity-80">มีผลคุ้มครองค่าใช้จ่ายวัสดุพังทลายเสียหาย</p>
                    </div>
                    <p className="text-2xl font-mono font-black text-[#21005D] mt-3">
                      {contract.has_deposit ? `฿${contract.deposit_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : 'ได้รับยกเว้นมัดจำวงเงิน'}
                    </p>
                  </div>

                  {/* Customer Signature Verification */}
                  <div className="border border-[#CAC4D0] bg-[#F3EDF7]/30 p-4.5 rounded-2xl flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] uppercase text-[#49454F] font-black tracking-widest mb-2.5">ตรวจสอบลายมือชื่อคู่สัญญา</span>
                    {contract.customer_signature_base64 ? (
                      <div className="bg-white border border-[#CAC4D0] p-1.5 rounded-xl h-14 w-full flex items-center justify-center shadow-inner">
                        <img src={contract.customer_signature_base64} alt="Digital Signature Audit" className="max-h-full object-contain" />
                      </div>
                    ) : (
                      <p className="text-xs text-[#49454F] italic font-black">ยังไม่ได้บันทึกรับสิทธิลายมือชื่อรับประทานคู่สัญญา</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Terms of Lease */}
              <div className="bg-[#FFF8E1] border border-[#FFE082] p-4.5 rounded-2xl text-[11px] font-medium text-[#795548] space-y-2 leading-relaxed text-left">
                <p className="font-extrabold text-[#5D4037] flex items-center gap-1">
                  📄 ระเบียบสัญญากลางและระเบียบปฏิบัติ:
                </p>
                <ol className="list-decimal pl-4 space-y-1 font-semibold text-[#5D4037]">
                  <li>โปรดดูแลรักษาสินค้าและล้างน้ำทำความสะอาดแบบพลาสติกและนั่งร้านเหล็กก่อนส่งมอบคืน</li>
                  <li>ห้ามเคาะด้วยแกนเหล็ก งัด บินเบี้ยว หรือสับด้วยค้อน แข็งกระด้างจนผิวเสียหาย</li>
                  <li>กรณีส่งล่าช้าอาจมีผลกับการเรียกเก็บยอดหนี้สะสม และได้รับการจำกัดเบี้ยปรับ {shopSettings.PENALTY_RATE}% ต่อวันตามเกณฑ์</li>
                </ol>
              </div>

              {/* Print option */}
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    const printWindow = window.open('', '_blank');
                    if (!printWindow) {
                      alert('พ็อพัพถูกบล็อก กรุณาอนุญาตให้ระบบเปิดแท็บใหม่เพื่อพิมพ์');
                      return;
                    }
                    const targetHtml = contract.contract_html_edited || `
                      <div style="font-family: 'Sarabun', sans-serif; padding: 20px; color: #1e293b; max-width: 100%;">
                        <div style="text-align: center; margin-bottom: 24px;">
                          <h2 style="font-size: 22px; font-weight: 800; margin: 0; color: #0f172a;">${shopSettings.SHOP_NAME}</h2>
                          <p style="font-size: 13px; color: #64748b; margin: 4px 0 0 0;">โทร: ${shopSettings.SHOP_TELEPHONE} • ${shopSettings.SHOP_ADDRESS}</p>
                          <div style="width: 150px; height: 1.5px; background-color: #cbd5e1; margin: 12px auto;"></div>
                          <h3 style="font-size: 18px; font-weight: 700; border-bottom: 1px solid #cbd5e1; padding-bottom: 8px;">ใบสัญญาเช่าพัสดุก่อสร้างพลาสติกและเหล็กแบบรับรอง</h3>
                        </div>
                        <div style="font-size: 13px; line-height: 1.8;">
                          <strong>เลขที่สัญญาเช่า:</strong> ${contract.contract_no}<br/>
                          <strong>ผู้เช่า:</strong> ${contract.customer_name}<br/>
                          <strong>รหัสบัตรประชาชน:</strong> ${contract.id_card_no}<br/>
                          <strong>เบอร์โทรติดต่อ:</strong> ${contract.phone}<br/>
                          <strong>ที่อยู่หน้างาน:</strong> ${contract.address}<br/>
                          <strong>วันที่เริ่มทำสัญญา:</strong> ${contract.contract_date}<br/>
                          <br/>
                          <strong>ยอดประกันมัดจำ:</strong> ${contract.has_deposit ? contract.deposit_amount + ' บาท' : 'ไม่มีเงินมัดจำ'}<br/>
                          <br/>
                          <strong>รายการพัสดุ:</strong>
                          <ul style="padding-left: 20px;">
                            ${contract.rental_items ? contract.rental_items.map((it: any) => `<li>${it.item_name} — <strong>${it.qty}</strong> ชิ้น</li>`).join('') : ''}
                          </ul>
                        </div>
                      </div>
                    `;
                    printWindow.document.write(`
                      <html>
                        <head>
                          <title>สัญญาเช่าอิเล็กทรอนิกส์ - ${contract.contract_no}</title>
                          <meta charset="utf-8"/>
                          <style>
                            @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700;800&display=swap');
                            body { font-family: 'Sarabun', sans-serif; padding: 40px; color: #1e293b; background: white; }
                          </style>
                        </head>
                        <body>
                          <div style="width: 100%; max-width: 800px; margin: 0 auto;">
                            ${targetHtml}
                          </div>
                          <script>
                            window.onload = function() {
                              window.print();
                            }
                          </script>
                        </body>
                      </html>
                    `);
                    printWindow.document.close();
                  }}
                  className="px-6 py-3.5 bg-[#21005D] text-white rounded-2xl text-xs font-black shadow-lg hover:bg-[#381E72] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FileText size={14} /> ดาวน์โหลด PDF / ตรวจกระดาษสั่งพิมพ์
                </button>
              </div>
            </div>
          )}

          {/* Footer warning */}
          <div className="bg-[#F3EDF7] px-6 py-4 border-t border-[#CAC4D0] text-center text-[10px] text-[#49454F] font-extrabold uppercase tracking-wide">
            {shopSettings.SHOP_ADDRESS} • โทร {shopSettings.SHOP_TELEPHONE}
          </div>
        </div>
      </div>
    );
  }

  const handleNavigate = (menu: MenuID) => {
    setCurrentMenu(menu);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#FFFBFE] text-[#1D1B20] font-sans antialiased flex flex-col xl:flex-row">
      
      {/* Sidebar Navigation */}
      <aside className={`fixed inset-y-0 left-0 z-50 bg-[#F3EDF7] text-[#1D1B20] p-5 transform transition-all duration-300 xl:relative ${
        sidebarOpen 
          ? 'w-64 translate-x-0 border-r border-[#CAC4D0] opacity-100' 
          : 'w-0 -translate-x-full p-0 overflow-hidden opacity-0 select-none xl:w-0'
      } shadow-2xl flex flex-col justify-between shrink-0`}>
        <div>
          {/* Brand header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-[#21005D] text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-[#21005D]/10">
              J
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight text-[#21005D] uppercase">จีรกิตติ์ ไม้แบบ</h1>
              <p className="text-[10px] text-[#4F378B] font-black mt-0.5 uppercase tracking-wider">POS & ERP SYSTEM</p>
            </div>
          </div>

          {/* Menus List */}
          <nav className="space-y-1.5">
            {MENUS.map(m => {
              const active = currentMenu === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => handleNavigate(m.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-xs font-extrabold uppercase transition-all tracking-wide ${
                    active 
                      ? 'bg-[#21005D] text-white shadow-md font-black border-l-4 border-[#6750A4]' 
                      : 'text-[#4F378B] hover:bg-[#EADDFF] hover:text-[#21005D]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={active ? 'text-white font-black' : 'text-[#4F378B]'}>
                      {m.icon}
                    </span>
                    <span>{m.label}</span>
                  </div>
                  
                  {m.id === 'dashboard' && unreadAlertsCount > 0 && (
                    <span className={`text-[9.5px] font-black w-5 h-5 flex items-center justify-center rounded-full ${
                      active ? 'bg-[#FFFBFE] text-[#21005D]' : 'bg-[#ef4444] text-white'
                    }`}>
                      {unreadAlertsCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Real-time Update Links */}
        <div className="border-t border-[#CAC4D0] pt-4 mt-6 space-y-2">
          <p className="text-[10px] font-black uppercase text-[#4F378B] tracking-wider">ลิงก์อัปเดตเรียลไทม์ (Live)</p>
          <div className="space-y-1">
            <a 
              href="https://ais-dev-k66hhplqxst7rkt2p3rzfl-818237646017.asia-southeast1.run.app" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-between px-3 py-1.5 rounded-lg text-[10px] font-black text-white bg-indigo-600 hover:bg-indigo-700 transition"
            >
              <span>Development App</span>
              <span className="bg-indigo-400 text-white px-1.5 py-0.5 rounded text-[8px] uppercase font-bold">Dev</span>
            </a>
            <a 
              href="https://ais-pre-k66hhplqxst7rkt2p3rzfl-818237646017.asia-southeast1.run.app" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-between px-3 py-1.5 rounded-lg text-[10px] font-black text-slate-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 transition"
            >
              <span>Shared App</span>
              <span className="bg-emerald-600 text-white px-1.5 py-0.5 rounded text-[8px] uppercase font-bold">Prod</span>
            </a>
          </div>
        </div>

        {/* Footer info lock indicator */}
        <div className="border-t border-[#CAC4D0] pt-4 mt-4">
          <div className="flex items-center gap-2.5 text-[10px] text-[#49454F] font-bold">
            <HardDrive size={13} className="text-[#21005D]" />
            <div>
              <p className="font-extrabold text-[#21005D]">คลังอุตรดิตถ์: เชื่อมต่อปกติ</p>
              <p className="text-[9px] text-[#4F378B] font-mono mt-0.5 tracking-wider">LOCAL PERSIST SYSTEM</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay to close sidebar on mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-[#21005D]/20 backdrop-blur-xs z-40 xl:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Content wrapper */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header */}
        <header className="sticky top-0 bg-[#FFFBFE]/95 backdrop-blur-md border-b border-[#CAC4D0] px-6 py-4 flex justify-between items-center z-30">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 -ml-1 rounded-lg text-[#21005D] border border-[#CAC4D0] bg-[#EADDFF] hover:bg-[#D0BCFF] animate-none cursor-pointer hover:scale-105 transition-transform shrink-0"
              title="เปิด/ปิด แถบเมนู"
            >
              <Menu size={18} />
            </button>
            <div>
              <h2 className="text-xl font-extrabold text-[#21005D] tracking-tight uppercase flex items-center gap-2">
                {MENUS.find(m => m.id === currentMenu)?.label}
              </h2>
              <p className="text-[10px] text-[#49454F] font-extrabold uppercase tracking-wider mt-0.5">ระบบ POS & ERP จัดเตรียมวัสดุก่อสร้าง จีรกิตติ์ ไม้แบบพลาสติก</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Clock */}
            <div className="text-right hidden sm:block">
              <p className="text-xs font-black text-[#1D1B20] uppercase tracking-wider">{dateStr || '--'}</p>
              <p className="text-[10px] font-black text-[#21005D] mt-0.5 font-mono tracking-widest">{timeStr || '--'}</p>
            </div>

            {/* Notifications icon */}
            <button 
              onClick={() => handleNavigate('dashboard')}
              className="w-10 h-10 rounded-xl border border-[#CAC4D0] bg-white hover:bg-[#ECE6F0] flex items-center justify-center text-[#21005D] relative transition-colors shadow-sm"
            >
              <Bell size={16} />
              {unreadAlertsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#ef4444] text-white text-[9px] font-black flex items-center justify-center rounded-full animate-pulse">
                  {unreadAlertsCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Dynamic content scrollable area */}
        <main className="flex-1 p-6 overflow-y-auto max-w-7xl w-full mx-auto">
          {currentMenu === 'dashboard' && (
            <Dashboard 
              onNavigate={handleNavigate} 
              triggerRefresh={triggerRefresh} 
              refreshCount={refreshCount} 
            />
          )}

          {currentMenu === 'pos' && (
            <POS 
              onNavigate={handleNavigate} 
              triggerRefresh={triggerRefresh} 
              refreshCount={refreshCount} 
            />
          )}

          {currentMenu === 'returns' && (
            <Returns 
              onNavigate={handleNavigate} 
              triggerRefresh={triggerRefresh} 
              refreshCount={refreshCount} 
            />
          )}

          {currentMenu === 'bills' && (
            <Bills 
              refreshCount={refreshCount} 
              applyDateFilter={applyDateFilter}
              setApplyDateFilter={setApplyDateFilter}
              startDate={sharedStartDate}
              setStartDate={setSharedStartDate}
              endDate={sharedEndDate}
              setEndDate={setSharedEndDate}
            />
          )}

          {currentMenu === 'customers' && (
            <Customers 
              refreshCount={refreshCount} 
              triggerRefresh={triggerRefresh} 
            />
          )}

          {currentMenu === 'products' && (
            <Products 
              refreshCount={refreshCount} 
              triggerRefresh={triggerRefresh} 
            />
          )}

          {currentMenu === 'analytics' && (
            <Analytics />
          )}

          {currentMenu === 'accounting' && (
            <Accounting />
          )}

          {currentMenu === 'contracts' && (
            <Contracts />
          )}

          {currentMenu === 'settings' && (
            <Settings 
              refreshCount={refreshCount} 
              triggerRefresh={triggerRefresh} 
            />
          )}

          {currentMenu === 'security' && (
            <Security />
          )}
        </main>
      </div>

    </div>
  );
}
