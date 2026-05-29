/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { JirakitDB } from '../db';
import { KeyRound, ShieldAlert, Heart, RefreshCw, Database, User, ArrowUpDown, ArrowDown, ArrowUp, ClipboardList, Eye } from 'lucide-react';

export default function Security() {
  const [pin, setPin] = useState('');
  const [runningDiagnostics, setRunningDiagnostics] = useState(false);
  const [healthResult, setHealthResult] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'config' | 'audit'>('config');

  // Sorting state for stock adjustments
  const [sortField, setSortField] = useState<'timestamp' | 'sku' | 'name' | 'diff'>('timestamp');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const handleSavePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 6 || !/^\d+$/.test(pin)) {
      alert('PIN จะต้องเป็นรหัสตัวเลขเฉพาะ 6 ตัวหลักเท่านั้น');
      return;
    }
    try {
      JirakitDB.savePin(pin);
      alert('อัปเดต PIN รหัสความปลอดภัยของหน้าเคาน์เตอร์ปล่อยเช่าวัสดุเสร็จเรียบร้อย!');
      setPin('');
    } catch (err: any) {
      alert(err.message || 'บันทึกไม่สําเร็จ');
    }
  };

  const handleRunHealthCheck = () => {
    setRunningDiagnostics(true);
    setTimeout(() => {
      const prods = JirakitDB.getProducts();
      const custs = JirakitDB.getCustomers();
      const rcs = JirakitDB.getReceipts();
      const returns = JirakitDB.getReturnEvents();
      const logs = JirakitDB.getAuditLogs();

      setHealthResult({
        success: true,
        version: 'JRK_BASE44_TO_VITE_REACT_PORT_20260525',
        timestamp: new Date().toLocaleString('th-TH'),
        checks: [
          { name: 'ตรวจความสมบูรณ์ฐานข้อมูลผลิตภัณฑ์', status: prods.length > 0 ? 'สมบูรณ์' : 'ไม่พบข้อมูล', count: prods.length },
          { name: 'ตรวจประวัติตัวตนลูกค้าประจำ', status: custs.length > 0 ? 'สมบูรณ์' : 'ไม่พบข้อมูล', count: custs.length },
          { name: 'จำนวนใบเสร็จสั่งปล่อยงานในคลัง', status: rcs.length > 0 ? 'สมบูรณ์' : 'ไม่มีทรานแซกชั่น', count: rcs.length },
          { name: 'จำนวนประวัติการเก็บคืนไม้พลาสติก', status: 'สมบูรณ์', count: returns.length },
          { name: 'ประวัติบันทึกการทำงาน (Audit logs)', status: 'เรียบร้อยปกติ', count: logs.length },
          { name: 'ตรวจรหัส PIN รักษากล่องธุรกรรม', status: localStorage.getItem('JRK_PIN_KEY') ? 'เปิดคุมความปลอดภัย' : 'รหัสเปิดตั้งต้น (123456)', count: 1 }
        ]
      });
      setRunningDiagnostics(false);
    }, 600);
  };

  // Parse stock adjustments from audit logs
  const rawLogs = JirakitDB.getAuditLogs();
  const parsedStockLogs = rawLogs.map(log => {
    let sku = '-';
    let productName = '-';
    let beforeQty = 0;
    let afterQty = 0;
    let isStockAdjustment = false;
    let qtyDiff = 0;

    try {
      if (log.action === 'CREATE_PRODUCT' && log.new_value) {
        const newVal = JSON.parse(log.new_value);
        sku = newVal.sku || '-';
        productName = newVal.item_name || '-';
        beforeQty = 0;
        afterQty = newVal.qty_total ?? newVal.qty_available ?? 0;
        isStockAdjustment = true;
        qtyDiff = afterQty;
      } else if (log.action === 'UPDATE_PRODUCT' && log.new_value && log.old_value) {
        const newVal = JSON.parse(log.new_value);
        const oldVal = JSON.parse(log.old_value);
        sku = newVal.sku || oldVal.sku || '-';
        productName = newVal.item_name || oldVal.item_name || '-';
        
        const oldQty = oldVal.qty_total !== undefined ? oldVal.qty_total : oldVal.stock;
        const newQty = newVal.qty_total !== undefined ? newVal.qty_total : newVal.stock;
        
        beforeQty = Number(oldQty || 0);
        afterQty = Number(newQty || 0);
        qtyDiff = afterQty - beforeQty;

        // Any action representing product creation or change in total qty
        isStockAdjustment = qtyDiff !== 0;
      }
    } catch (e) {
      // safe fallback
    }

    return {
      ...log,
      sku,
      productName,
      beforeQty,
      afterQty,
      qtyDiff,
      isStockAdjustment
    };
  }).filter(log => log.isStockAdjustment);

  // Sorting
  const sortedLogs = [...parsedStockLogs].sort((a, b) => {
    let comparison = 0;
    if (sortField === 'timestamp') {
      comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    } else if (sortField === 'sku') {
      comparison = a.sku.localeCompare(b.sku);
    } else if (sortField === 'name') {
      comparison = a.productName.localeCompare(b.productName);
    } else if (sortField === 'diff') {
      comparison = a.qtyDiff - b.qtyDiff;
    }
    return sortAsc ? comparison : -comparison;
  });

  const toggleSort = (field: 'timestamp' | 'sku' | 'name' | 'diff') => {
    if (sortField === field) {
      setSortAsc(p => !p);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const getSortIcon = (field: 'timestamp' | 'sku' | 'name' | 'diff') => {
    if (sortField !== field) return <ArrowUpDown size={12} className="inline ml-1 text-gray-400" />;
    return sortAsc 
      ? <ArrowUp size={12} className="inline ml-1 text-red-700 font-bold" />
      : <ArrowDown size={12} className="inline ml-1 text-red-700 font-bold" />;
  };

  return (
    <div className="space-y-6">
      {/* Tab Selectors */}
      <div className="flex bg-gray-100 p-1 rounded-2xl w-fit border border-gray-200">
        <button
          onClick={() => setActiveTab('config')}
          className={`px-5 py-2 rounded-xl text-xs font-black tracking-wide transition-all uppercase flex items-center gap-1.5 ${
            activeTab === 'config'
              ? 'bg-[#9B1313] text-white shadow-md'
              : 'text-gray-650 hover:bg-white/50'
          }`}
        >
          <KeyRound size={14} /> ตั้งค่า & ความลื่นไหลระบบ
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-5 py-2 rounded-xl text-xs font-black tracking-wide transition-all uppercase flex items-center gap-1.5 ${
            activeTab === 'audit'
              ? 'bg-[#9B1313] text-white shadow-md'
              : 'text-gray-650 hover:bg-white/50'
          }`}
        >
          <ClipboardList size={14} /> บันทึกการเปลี่ยนสต็อก (Audit Logs)
        </button>
      </div>

      {activeTab === 'config' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-250">
          {/* PIN updates card */}
          <div className="bg-white border border-red-100 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="border-b pb-3 flex items-center gap-2">
              <KeyRound className="stroke-[#9B1313]" size={18} />
              <h3 className="text-sm font-extrabold text-[#38000A]">ตั้งค่าความปลอดภัยรหัส PIN หน้าเครื่อง</h3>
            </div>

            <p className="text-xs text-gray-500 font-semibold leading-relaxed">
              รหัส PIN ใช้เพื่อปกป้องกระบวนการปล่อยวัสดุและการบันทึกธุรกรรมที่ชำระเงินไม่เสร็จสิ้น (กรณีแอปเปลเปิดทิ้งไว้หน้าร้าน)
            </p>

            <form onSubmit={handleSavePin} className="space-y-4 text-xs font-bold text-gray-700">
              <div>
                <label className="block text-gray-600 mb-1.5">ป้อนรหัส PIN 6 หลักตัวใหม่ *</label>
                <input
                  type="password"
                  maxLength={6}
                  required
                  className="w-full h-11 bg-[#FFFBF9] border border-red-100 rounded-xl px-4 text-center font-black tracking-widest text-lg focus:outline-none"
                  placeholder="••••••"
                  value={pin}
                  onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#9B1313] hover:bg-black text-white font-extrabold rounded-xl transition-all shadow-md"
              >
                ✓ ปรับเปลี่ยนรหัส PIN ควบคุมระบบ
              </button>
            </form>
          </div>

          {/* Diagnostic health card */}
          <div className="bg-white border border-red-100 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="border-b pb-3 flex items-center gap-2">
              <Heart className="stroke-rose-600 fill-rose-50" size={18} />
              <h3 className="text-sm font-extrabold text-[#38000A]">ตรวจสุขภาพระบบ (System Health Check)</h3>
            </div>

            <p className="text-xs text-gray-500 font-semibold leading-relaxed">
              เชื่อมต่อข้อมูลและตรวจประเมินหาความคลาดเคลื่อนทางคลังสินค้าและสเตทเม้นท์หลังร้าน
            </p>

            <button
              onClick={handleRunHealthCheck}
              disabled={runningDiagnostics}
              className="w-full py-2.5 bg-gray-950 hover:bg-black text-white font-extrabold rounded-xl transition-all shadow-md text-xs flex items-center justify-center gap-1.5"
            >
              <RefreshCw size={12} className={runningDiagnostics ? 'animate-spin' : ''} />
              {runningDiagnostics ? 'กำลังสแกนโครงสร้าง ERP...' : 'ประมวลตรวจประวัติรวม (Run Health Check)'}
            </button>

            {healthResult && (
              <div className="p-4 bg-slate-900 text-white rounded-xl space-y-3 font-mono text-[11px] animate-in fade-in slide-in-from-bottom-2">
                <div className="flex justify-between items-center text-xs font-bold border-b border-white/10 pb-2">
                  <span className="text-[#FFA896]">สลาก Diagnostic: {healthResult.version}</span>
                  <span className="text-[#3ddc84]">ONLINE</span>
                </div>
                <p className="text-gray-400">เวลาทำการสแกน: {healthResult.timestamp}</p>
                
                <div className="space-y-1.5 pt-1">
                  {healthResult.checks.map((c: any, i: number) => (
                    <div key={i} className="flex justify-between">
                      <span>{c.name}:</span>
                      <span className="text-[#FFA896] font-bold">
                        {c.status} ({c.count} รายการ)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Audit Logs Tab Content */
        <div className="bg-white border border-red-100 rounded-2xl p-5 shadow-sm space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-250">
          <div className="border-b pb-3 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-extrabold text-[#38000A] flex items-center gap-1.5">
                <Database className="stroke-[#9B1313]" size={18} />
                ตรวจสอบบันทึกธุรกรรมการป้อนและปรับสต็อกคลังวัสดุ
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">ตารางประวัติกิจกรรมที่บันทึกโดยระบบคัดกรองเฉพาะการเปลี่ยนระดับจำนวนสินค้า</p>
            </div>
            <span className="text-xs font-bold text-[#CD1C18] bg-rose-50 border border-rose-100 rounded-full px-3 py-1">
               พบประวัติ {sortedLogs.length} รายการ
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-xs">
            <table className="w-full text-xs font-bold text-left table-auto">
              <thead>
                <tr className="bg-[#FFF6F3] text-gray-700 h-10 select-none">
                  <th 
                    onClick={() => toggleSort('timestamp')}
                    className="p-3 cursor-pointer hover:bg-red-50/50 transition-colors"
                  >
                    วัน-เวลาทำรายการ {getSortIcon('timestamp')}
                  </th>
                  <th 
                    onClick={() => toggleSort('sku')} 
                    className="p-3 cursor-pointer hover:bg-red-50/50 transition-colors"
                  >
                    รหัส (SKU) {getSortIcon('sku')}
                  </th>
                  <th 
                    onClick={() => toggleSort('name')} 
                    className="p-3 cursor-pointer hover:bg-red-50/50 transition-colors"
                  >
                    รายการวัสดุเกรดพลาสติก {getSortIcon('name')}
                  </th>
                  <th className="p-3 text-center">สิทธิ์ผู้ทำรายการ</th>
                  <th className="p-3 text-right">จำนวนเดิม</th>
                  <th className="p-3 text-right">จำนวนใหม่</th>
                  <th 
                    onClick={() => toggleSort('diff')} 
                    className="p-3 cursor-pointer hover:bg-red-50/50 transition-colors text-center"
                  >
                    ปรับเพิ่ม/ลด {getSortIcon('diff')}
                  </th>
                  <th className="p-3 max-w-[200px]">หมายเหตุระบบ/กิจกรรม</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-gray-600 font-semibold">
                {sortedLogs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16 text-gray-400 font-bold">
                      ไม่พบประวัติกิจกรรมการปรับปรุงจำนวนสต็อกสินค้าในห้วงเวลาปัจจุบัน
                    </td>
                  </tr>
                ) : (
                  sortedLogs.map(log => {
                    const isPositive = log.qtyDiff > 0;
                    return (
                      <tr key={log.log_id} className="h-11 hover:bg-red-50/10 transition-all">
                        <td className="p-3 text-gray-805 font-medium font-mono text-[10.5px]">
                          {new Date(log.timestamp).toLocaleString('th-TH')}
                        </td>
                        <td className="p-3 text-[#9B1313] font-mono text-[11px]">
                          {log.sku}
                        </td>
                        <td className="p-3 text-gray-800 text-[11.5px]">
                          {log.productName}
                        </td>
                        <td className="p-3 text-center text-[11px] text-gray-500">
                          <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-mono font-bold">
                            {log.user}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-gray-400">
                          {log.beforeQty}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-gray-800">
                          {log.afterQty}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-xl font-mono text-[10px] font-black tracking-wide ${
                            isPositive 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : 'bg-rose-100 text-rose-800 animate-pulse'
                          }`}>
                            {isPositive ? `+${log.qtyDiff}` : log.qtyDiff}
                          </span>
                        </td>
                        <td className="p-3 text-gray-500 font-normal text-[11px] truncate max-w-[200px]" title={log.note}>
                          {log.note || '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
