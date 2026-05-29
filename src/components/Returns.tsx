/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { JirakitDB } from '../db';
import { Receipt, Product } from '../types';
import { RefreshCw, Search, Calendar, AlertTriangle, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';

interface ReturnsProps {
  onNavigate: (menu: string) => void;
  triggerRefresh: () => void;
  refreshCount: number;
}

export default function Returns({ onNavigate, triggerRefresh, refreshCount }: ReturnsProps) {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'renting' | 'overdue'>('renting');

  // Return Wizard States
  const [wizardReceipt, setWizardReceipt] = useState<Receipt | null>(null);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [returnDate, setReturnDate] = useState(new Date().toISOString().slice(0, 10));
  
  // Array tracking what is being returned: { line_id, qty_returned_now }
  const [returnItems, setReturnItems] = useState<any[]>([]);
  
  // Financial inputs collected during process
  const [collectedPayment, setCollectedPayment] = useState(0);
  const [note, setNote] = useState('');

  useEffect(() => {
    setReceipts(JirakitDB.getReceipts());
  }, [refreshCount]);

  // Filters
  const rentedReceipts = receipts.filter(r => {
    // only view receipts that have rent items
    const items = JSON.parse(r.items_json || '[]');
    const hasRent = items.some((i: any) => i.line_mode === 'rent');
    if (!hasRent) return false;

    const matchesSearch = r.receipt_no.toLowerCase().includes(searchQuery.toLowerCase()) || r.customer_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const isOverdue = new Date(r.due_date) < new Date() && (r.return_status === 'กำลังเช่า' || r.return_status === 'คืนบางส่วน');
    const matchesFilter = 
      filterMode === 'all' || 
      (filterMode === 'renting' && (r.return_status === 'กำลังเช่า' || r.return_status === 'คืนบางส่วน')) ||
      (filterMode === 'overdue' && isOverdue);

    return matchesSearch && matchesFilter;
  });

  const handleOpenWizard = (r: Receipt) => {
    setWizardReceipt(r);
    setWizardStep(1);
    setReturnDate(new Date().toISOString().slice(0, 10));
    setCollectedPayment(r.debt_amount); // default to remaining debt
    setNote('');

    const items = JSON.parse(r.items_json || '[]');
    const tracked = items
      .filter((i: any) => i.line_mode === 'rent')
      .map((i: any) => ({
        line_id: i.line_id,
        receipt_name: i.receipt_name,
        qty_rented: i.qty,
        qty_returned_already: i.qty_returned || 0,
        qty_open: i.qty - (i.qty_returned || 0),
        qty_now_return: i.qty - (i.qty_returned || 0), // Default to returning everything left
        price: i.price,
        rent_days: i.rent_days || 1,
        unit: i.unit
      }));
    setReturnItems(tracked);
  };

  const handleQtyChange = (idx: number, amount: number) => {
    const next = [...returnItems];
    const item = next[idx];
    item.qty_now_return = Math.max(0, Math.min(item.qty_open, item.qty_now_return + amount));
    setReturnItems(next);
  };

  const handleToggleSelectAll = () => {
    const isAllSelected = returnItems.length > 0 && returnItems.every(i => i.qty_now_return === i.qty_open);
    const next = returnItems.map(i => ({
      ...i,
      qty_now_return: isAllSelected ? 0 : i.qty_open
    }));
    setReturnItems(next);
  };

  const calculateReturnWizardFinance = () => {
    if (!wizardReceipt) return { daysLate: 0, penalty: 0, priorDebt: 0, totalDue: 0, remainingDebt: 0, selectedRentingValue: 0 };

    const selectedReturnRows = returnItems.filter(i => i.qty_now_return > 0);
    const selectedRentingValue = selectedReturnRows.reduce((sum, item) => sum + (item.price * item.qty_now_return * item.rent_days), 0);

    const due = new Date(wizardReceipt.due_date);
    const ret = new Date(returnDate);
    let daysLate = 0;
    if (ret > due) {
      daysLate = Math.max(0, Math.ceil((ret.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)));
    }

    const ratePct = JirakitDB.getSettings().PENALTY_RATE / 100; // e.g. 1.5% -> 0.015
    const penalty = daysLate > 0 ? selectedRentingValue * daysLate * ratePct : 0;
    const priorDebt = wizardReceipt.debt_amount;
    const totalDue = priorDebt + penalty;
    const remainingDebt = Math.max(0, totalDue - collectedPayment);

    return {
      daysLate,
      penalty,
      priorDebt,
      totalDue,
      remainingDebt,
      selectedRentingValue
    };
  };

  const currentWizardFinance = calculateReturnWizardFinance();

  const handleNextStep1 = () => {
    if (!returnItems.some(i => i.qty_now_return > 0)) {
      alert('กรุณาเลือกวัสดุอุปรณ์ที่จะนำส่งกลับคลังอย่างน้อย 1 รายการ');
      return;
    }
    // Update default collected receipt total after penalty
    const { totalDue } = calculateReturnWizardFinance();
    setCollectedPayment(totalDue);
    setWizardStep(2);
  };

  const handleConfirmReturn = () => {
    if (!wizardReceipt) return;

    const payload = {
      receipt_id: wizardReceipt.receipt_id,
      items: returnItems
        .filter(i => i.qty_now_return > 0)
        .map(i => ({
          line_id: i.line_id,
          qty: i.qty_now_return
        })),
      penalty_amount: currentWizardFinance.penalty,
      paid_amount: collectedPayment,
      refund_deposit: 0,
      return_date: returnDate,
      payment_method: 'เงินสด',
      note
    };

    try {
      JirakitDB.processReturn(payload);
      alert('บันทึกการส่งคืนคลังและอัปเดตบัญชี/สต็อกวัสดุสําเร็จเรียบร้อย!');
      setWizardReceipt(null);
      triggerRefresh();
    } catch (err: any) {
      alert(`ไม่สามารถประมวลผลการรับคืนได้: ${err?.message || err}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Return Table List View */}
      <div className="bg-white border border-red-100 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-50 pb-4">
          <div>
            <h2 className="text-xl font-extrabold text-[#38000A]">คืนอุปกรณ์ & รับชำระเงินเพิ่ม</h2>
            <p className="text-xs text-gray-500 mt-1">รับคืนวัสดุก่อสร้าง ตรวจสอบอัตราค่าปรับเลยเวลา และชลอภาระหนี้สิน</p>
          </div>
          <div className="flex bg-gray-100 p-1 rounded-xl">
            {(['all', 'renting', 'overdue'] as const).map(tab => {
              const tabLabels = {
                all: 'ทั้งหมด',
                renting: 'กำลังเช่า',
                overdue: 'เลยกำหนดคืน'
              };
              return (
                <button
                  key={tab}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    filterMode === tab 
                      ? 'bg-[#CD1C18] text-white shadow-sm' 
                      : 'text-gray-600 hover:text-[#38000A]'
                  }`}
                  onClick={() => setFilterMode(tab)}
                >
                  {tabLabels[tab]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 text-red-950" size={16} />
          <input
            type="text"
            className="w-full bg-[#FFFBF9] border border-red-50 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-[#9B1313]"
            placeholder="ค้นหาตามเลขที่บิลเอกสาร หรือ ชื่อลูกค้า..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Database Table */}
        <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-xs">
          <table className="w-full text-xs font-bold text-left table-auto">
            <thead>
              <tr className="bg-[#FFF6F3] text-gray-700 h-10">
                <th className="p-3">เลขที่เอกสาร</th>
                <th className="p-3">พาร์ตเนอร์ / ลูกค้า</th>
                <th className="p-3">กําหนดคืน</th>
                <th className="p-3 text-right">ยอดคงค้าง (฿)</th>
                <th className="p-3 text-center">สถานะรวม</th>
                <th className="p-3 text-center">รับของคืน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-gray-600">
              {rentedReceipts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    <p className="font-semibold text-sm">ไม่พบบิลการเช่าอุปกรณ์ตามการคัดกรอง</p>
                  </td>
                </tr>
              ) : (
                rentedReceipts.map(r => (
                  <tr key={r.receipt_id} className="h-12 hover:bg-red-50/10 transition-colors">
                    <td className="p-3 text-[#9B1313] font-extrabold">{r.receipt_no}</td>
                    <td className="p-3 text-gray-800">{r.customer_name}</td>
                    <td className="p-3">{r.due_date}</td>
                    <td className="p-3 text-right text-rose-700">฿{r.debt_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="p-3 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                        r.return_status === 'คืนครบแล้ว' 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {r.return_status}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleOpenWizard(r)}
                        className="py-1.5 px-3 bg-red-100 hover:bg-[#9B1313] text-red-900 hover:text-white font-extrabold rounded-lg transition-all flex items-center justify-center gap-1 mx-auto"
                      >
                        <RefreshCw size={12} /> ดำเนินการคืน
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Return Wizard Modal Form */}
      {wizardReceipt && (
        <div className="fixed inset-0 bg-[#38000A]/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200 overflow-hidden">
            {/* Wizard Header */}
            <div className="bg-gradient-to-r from-red-950 to-red-900 text-white px-6 py-4 flex justify-between items-center">
              <div>
                <h3 className="text-md font-bold">บันทึกส่งของคืนคลัง — บิล: {wizardReceipt.receipt_no}</h3>
                <p className="text-[11px] text-red-200 mt-1">ผู้ใช้บริการ: {wizardReceipt.customer_name}</p>
              </div>
              <button onClick={() => setWizardReceipt(null)} className="text-white hover:text-red-200 text-2xl font-bold">×</button>
            </div>

            {/* Steps state bar */}
            <div className="bg-[#FFF6F3] border-b border-red-50 p-4 flex justify-around items-center text-xs font-bold">
              <span className={`flex items-center gap-2 ${wizardStep === 1 ? 'text-[#9B1313]' : 'text-gray-400'}`}>
                <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-black ${
                  wizardStep >= 1 ? 'bg-[#9B1313] text-white' : 'bg-gray-200'
                }`}>1</span>
                เลือกจำนวนที่ส่งคืน
              </span>
              <span className="w-12 h-px bg-gray-200"></span>
              <span className={`flex items-center gap-2 ${wizardStep === 2 ? 'text-[#9B1313]' : 'text-gray-400'}`}>
                <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-black ${
                  wizardStep >= 2 ? 'bg-[#9B1313] text-white' : 'bg-gray-200'
                }`}>2</span>
                ตรวจค่าปรับ/ชำระเงิน
              </span>
              <span className="w-12 h-px bg-gray-200"></span>
              <span className={`flex items-center gap-2 ${wizardStep === 3 ? 'text-[#9B1313]' : 'text-gray-400'}`}>
                <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-black ${
                  wizardStep >= 3 ? 'bg-[#9B1313] text-white' : 'bg-gray-200'
                }`}>3</span>
                ยืนยันปิดรายงาน
              </span>
            </div>

            {/* Wizard Body content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <label className="text-xs font-bold text-gray-700">ระบุวันที่เก็บสินค้ากําหนดคืนคลัง</label>
                    <input
                      type="date"
                      className="border border-gray-200 rounded-lg p-1.5 text-xs font-bold text-gray-800 bg-white"
                      value={returnDate}
                      onChange={e => setReturnDate(e.target.value)}
                    />
                  </div>

                  <div className="border border-gray-100 rounded-xl overflow-hidden shadow-xs">
                    <table className="w-full text-xs font-bold text-left table-auto">
                      <thead>
                        <tr className="bg-gray-100 text-gray-700 h-9">
                          <th className="p-2">แบบรายละเอียด</th>
                          <th className="p-2 text-center">ปล่อยเช่า</th>
                          <th className="p-2 text-center">คืนแล้ว</th>
                          <th className="p-2 text-right flex items-center justify-end gap-2">
                            <span>จำนวนคืนรอบนี้</span>
                            <button
                              type="button"
                              onClick={handleToggleSelectAll}
                              className="text-[10px] text-white bg-[#9B1313] hover:bg-black px-2 py-0.5 rounded shadow-sm flex items-center gap-1 font-extrabold uppercase transition-colors"
                            >
                              {returnItems.length > 0 && returnItems.every(i => i.qty_now_return === i.qty_open) ? 'ล้างทั้งหมด' : 'เลือกทั้งหมด'}
                            </button>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 text-gray-600">
                        {returnItems.map((item, idx) => (
                          <tr key={item.line_id} className="h-10">
                            <td className="p-2 text-gray-800">{item.receipt_name}</td>
                            <td className="p-2 text-center">{item.qty_rented}</td>
                            <td className="p-2 text-center text-emerald-700">{item.qty_returned_already}</td>
                            <td className="p-2">
                              <div className="flex items-center justify-end gap-2.5">
                                <button
                                  onClick={() => handleQtyChange(idx, -1)}
                                  className="w-6 h-6 border rounded-lg hover:bg-gray-100 flex items-center justify-center text-sm font-bold"
                                >
                                  -
                                </button>
                                <span className="w-8 text-center text-[#CD1C18] font-black">{item.qty_now_return}</span>
                                <button
                                  onClick={() => handleQtyChange(idx, 1)}
                                  className="w-6 h-6 border rounded-lg hover:bg-gray-100 flex items-center justify-center text-sm font-bold"
                                >
                                  +
                                </button>
                                <span className="text-[10px] text-gray-400 font-normal">/{item.qty_open}</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex gap-3 pt-4 border-t">
                    <button
                      onClick={() => setWizardReceipt(null)}
                      className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs"
                    >
                      ยกเลิก
                    </button>
                    <button
                      onClick={handleNextStep1}
                      className="flex-1 py-2.5 bg-[#9B1313] text-white font-bold rounded-xl text-xs shadow-sm"
                    >
                      ถัดไป: สรุปค่าปรับและเงินค้าง ›
                    </button>
                  </div>
                </div>
              )}

              {wizardStep === 2 && (
                <div className="space-y-4">
                  {/* Highlight alert if late */}
                  {currentWizardFinance.daysLate > 0 ? (
                    <div className="bg-rose-50 border border-rose-200 text-rose-950 p-4 rounded-xl flex items-start gap-2.5">
                      <AlertTriangle className="text-[#CD1C18] shrink-0 mt-0.5" size={16} />
                      <div className="text-xs">
                        <p className="font-extrabold">ตรวจพบการเช่าวัสดุเลยเวลาเกินกำหนด!</p>
                        <p className="text-[11px] text-rose-800 mt-0.5">
                          จำนวนที่เลยกำหนดส่งคืน: <span className="font-bold text-[#CD1C18]">{currentWizardFinance.daysLate} วัน</span> 
                          (เนื่องจากถึงกำหนดตั้งแต่วันที่ {wizardReceipt.due_date}) อัตราเบี้ยปรับคิดตามค่าปรับระบบ {JirakitDB.getSettings().PENALTY_RATE}% ต่อวัน
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-emerald-50 border border-emerald-100 text-emerald-950 p-4 rounded-xl flex items-start gap-2.5">
                      <AlertCircle className="text-emerald-700 shrink-0 mt-0.5" size={16} />
                      <div className="text-xs">
                        <p className="font-extrabold">นำอุปกรณ์คืนคลังตรงตามกำหนดวันเช่า</p>
                        <p className="text-[11px] text-emerald-750 mt-0.5">ไม่มีค่าใช้จ่ายเบี้ยปรับล่าช้าเพิ่มเติมจากการประเมินผลการคืน</p>
                      </div>
                    </div>
                  )}

                  {/* Financial calculation rows */}
                  <div className="bg-[#FFFBF9] border border-red-50 p-5 rounded-2xl text-xs font-bold space-y-3">
                    <h4 className="text-sm font-black text-red-950 border-b border-red-50 pb-2">รายละเอียดทางบัญชี</h4>
                    <div className="flex justify-between text-gray-500">
                      <span>ยอดค้างชำระของบิลหลักเดิม:</span>
                      <span>฿{currentWizardFinance.priorDebt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    {currentWizardFinance.daysLate > 0 && (
                      <div className="flex justify-between text-[#CD1C18]">
                        <span>ค่าปรับเลยกำหนดสูงสุด ({currentWizardFinance.daysLate} วัน):</span>
                        <span>+ ฿{currentWizardFinance.penalty.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-base font-black text-red-950 pt-2 border-t border-dashed border-red-200">
                      <span>รวมภาระเก็บทรัพย์คืนทั้งหมด:</span>
                      <span>฿{currentWizardFinance.totalDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  {/* Payment Collected input field */}
                  <div>
                    <label className="block text-xs font-extrabold text-[#9B1313] mb-1.5">รับยอดชำระเพิ่มเติมรอบนี้ (฿)</label>
                    <input
                      type="number"
                      className="w-full h-11 bg-white border border-gray-200 rounded-xl px-4 py-2 text-right font-black text-red-950 text-base focus:border-[#9B1313] focus:outline-none"
                      value={collectedPayment || ''}
                      onChange={e => setCollectedPayment(Number(e.target.value))}
                    />
                    <p className="text-[10px] text-gray-400 mt-1">มียอดหนี้ค้างชําระต่อในระบบหลังจากตัดชำระนี้: ฿{currentWizardFinance.remainingDebt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">หมายเหตุงานคืน</label>
                    <input
                      type="text"
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs"
                      placeholder="เช่น คืนแบบงอ 2 แผ่น, ตะปูงอ 1 ชุด..."
                      value={note}
                      onChange={e => setNote(e.target.value)}
                    />
                  </div>

                  <div className="flex gap-3 pt-4 border-t">
                    <button
                      onClick={() => setWizardStep(1)}
                      className="py-2.5 px-4 bg-gray-100 text-gray-600 font-bold rounded-xl text-xs"
                    >
                      ย้อนกลับ
                    </button>
                    <button
                      onClick={() => setWizardStep(3)}
                      className="flex-1 py-2.5 bg-[#9B1313] text-white font-bold rounded-xl text-xs shadow-sm"
                    >
                      ถัดไป: ยืนยันตรวจสอบขั้นสุดท้าย ›
                    </button>
                  </div>
                </div>
              )}

              {wizardStep === 3 && (
                <div className="space-y-4">
                  <div className="bg-slate-900 text-white rounded-2xl p-5 text-xs font-bold space-y-4">
                    <h3 className="text-sm font-black text-center text-amber-300">ยืนยันข้อมูลจัดเก็บเข้าสารบบคลัง</h3>
                    <div className="grid grid-cols-2 gap-3 border-b border-white/10 pb-4">
                      <div>
                        <span className="text-gray-400 block text-[10px]">ลูกค้า</span>
                        <span className="text-sm">{wizardReceipt.customer_name}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[10px]">วันที่ทําการคืนคลัง</span>
                        <span className="text-sm">{returnDate}</span>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span>จำนวนวัสดุอุปกรณ์ที่นำส่งคืน:</span>
                        <span className="text-[#FFA896]">{returnItems.reduce((sum, item) => sum + item.qty_now_return, 0)} ชิ้น</span>
                      </div>
                      {currentWizardFinance.penalty > 0 && (
                        <div className="flex justify-between">
                          <span>ค่าปรับประเมินล่าช้า:</span>
                          <span className="text-rose-400">฿{currentWizardFinance.penalty.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>รับเงินสดรับชำระเพิ่มหน้าเคาน์เตอร์:</span>
                        <span className="text-emerald-400">฿{collectedPayment.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between border-t border-white/10 pt-2 font-black text-sm">
                        <span>ยอดภาระหนี้สินหลงเหลือ (ถ้ามี):</span>
                        <span>฿{currentWizardFinance.remainingDebt.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-gray-400 text-center">* สต็อกอุปกรณ์จะบวกคืนคลังพร้อมใช้อัตโนมัติทันทีกดเสร็จสิ้น</p>

                  <div className="flex gap-3 pt-4 border-t">
                    <button
                      onClick={() => setWizardStep(2)}
                      className="py-2.5 px-4 bg-gray-100 text-gray-600 font-bold rounded-xl text-xs"
                    >
                      ย้อนกลับ
                    </button>
                    <button
                      onClick={handleConfirmReturn}
                      className="flex-1 py-3 bg-emerald-700 hover:bg-emerald-900 text-white font-extrabold rounded-xl text-xs shadow-md flex items-center justify-center gap-1"
                    >
                      <CheckCircle size={14} /> ✓ ยืนยันบันทึกคืนและอัปเดตระบบ
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
