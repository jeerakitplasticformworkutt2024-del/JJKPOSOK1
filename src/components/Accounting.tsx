/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { JirakitDB } from '../db';
import { Expense, Receipt } from '../types';
import { Landmark, TrendingUp, TrendingDown, ClipboardCheck, Search, Download, Trash, Printer, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function Accounting() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth());
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());

  // Expense form state
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [exDesc, setExDesc] = useState('');
  const [exAmt, setExAmt] = useState(0);
  const [exDate, setExDate] = useState(new Date().toISOString().slice(0, 10));
  const [exCat, setExCat] = useState('ค่าแรงหน่วยงาน');
  const [exNote, setExNote] = useState('');

  useEffect(() => {
    setExpenses(JirakitDB.getExpenses());
    setReceipts(JirakitDB.getReceipts());
  }, []);

  // Filter bills & expenses matching selected month/year
  const filteredReceipts = receipts.filter(r => {
    const d = new Date(r.created_at);
    return d.getMonth() === filterMonth && d.getFullYear() === filterYear;
  });

  const filteredExpenses = expenses.filter(e => {
    const d = new Date(e.expense_date);
    return d.getMonth() === filterMonth && d.getFullYear() === filterYear;
  });

  // LEDGER Compilation: Union of income (bills) and outcomes (expenses) sorted by date
  const ledger: any[] = [];
  
  filteredReceipts.forEach(r => {
    ledger.push({
      date: r.created_at,
      ref: r.receipt_no,
      desc: `[รายรับ] รับค่าเช่า/ค่าสินค้าจากคุณคุฯ ${r.customer_name}`,
      income: r.paid_amount,
      outcome: 0,
      type: 'INCOME'
    });
  });

  filteredExpenses.forEach(e => {
    ledger.push({
      date: e.expense_date,
      ref: e.expense_id,
      desc: `[รายจ่าย: ${e.category}] ${e.description}`,
      income: 0,
      outcome: e.amount,
      type: 'EXPENSE',
      raw_id: e.expense_id
    });
  });

  // Sort by date ascending to compute running cumulative sum
  ledger.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let runningSum = 0;
  const finalLedger = ledger.map(item => {
    runningSum += (item.income - item.outcome);
    return {
      ...item,
      running_sum: runningSum
    };
  });

  const totalIncome = filteredReceipts.reduce((sum, r) => sum + r.paid_amount, 0);
  const totalOutcome = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netEarnings = totalIncome - totalOutcome;

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!exDesc.trim() || exAmt <= 0) return;

    JirakitDB.saveExpense({
      description: exDesc,
      amount: exAmt,
      expense_date: exDate,
      category: exCat,
      note: exNote
    });

    setExDesc('');
    setExAmt(0);
    setExNote('');
    setExpenses(JirakitDB.getExpenses());
    setIsAddingExpense(false);
  };

  const handleCancelExpense = (id: string) => {
    if (!confirm('ยืนยันยกเลิกและคืนสต็อกรายจ่ายแถวนี้ใช่หรือไม่?')) return;
    JirakitDB.cancelExpense(id, 'ผู้ควบคุมยกเลิกจากจุดบริการหน้าเคาน์เตอร์');
    setExpenses(JirakitDB.getExpenses());
  };

  const handleDownloadCSV = () => {
    const headers = ['วันที่สลิป', 'เลขอ้างอิง', 'รายการบัญชี', 'นำเข้ากระแส (฿)', 'ส่งออกรายจ่าย (฿)', 'ดุลคงเหลือสะสม (฿)'];
    const rows = finalLedger.map(item => [
      new Date(item.date).toLocaleDateString('th-TH'),
      item.ref,
      item.desc,
      item.income,
      item.outcome,
      item.running_sum
    ]);

    const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `JRK_LEDGER_REPORT_${filterYear}_${filterMonth + 1}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportXLSX = () => {
    // Generate official title headers and columns
    const title = [
      ["รายงานบัญชีแยกประเภทและบัญชีรับพึงประเมินภาษีประจำเดือน (Official Monthly Ledger & Tax Report)"],
      ["ร้านจีรกิตติ์ ไม้แบบพลาสติก (สำนักงานใหญ่ อ.เมือง จ.อุตรดิตถ์)"],
      [`แผ่นรายงานประจำเดือน: ${thMonths[filterMonth]} พ.ศ. ${filterYear + 543}`],
      ["ผู้พิมพ์รายงาน: ผู้จัดการคลังสินค้าด้านการเงินและภาษีปละปลายทาง"],
      [],
      [
        'ชุดวันที่เดินสเตทเม้นท์', 
        'เลขอ้างอิงเอกสาร', 
        'รายละเอียดรายการสลิป', 
        'สัญญารับ/จ่าย', 
        'ยอดรายรับเข้า (฿)', 
        'ยอดจ่ายสุทธิออก (฿)', 
        'ยอดดุลคงเหลือสะสมสุทธิ (฿)',
        'ฐานรายรับประเมินก่อนภาษี (Tax Base - 7% EX)', 
        'ภาษีมูลค่าเพิ่ม (VAT 7%)', 
        'หัก ณ ที่จ่าย 3% (WHT)',
        'ยอดรับเงินรวมหลังคำนวณภาษี (Net After Taxes)'
      ]
    ];

    const rows = finalLedger.map(item => {
      const isIncome = item.type === 'INCOME';
      const incomeAmt = item.income || 0;
      const outcomeAmt = item.outcome || 0;
      
      // Detailed tax calculations for income entries
      const baseBeforeTax = isIncome ? Number((incomeAmt / 1.07).toFixed(2)) : 0;
      const vatVal = isIncome ? Number((incomeAmt - baseBeforeTax).toFixed(2)) : 0;
      const whtVal = isIncome ? Number((baseBeforeTax * 0.03).toFixed(2)) : 0;
      const netAfterTax = isIncome ? Number((incomeAmt - whtVal).toFixed(2)) : 0;

      return [
        new Date(item.date).toLocaleDateString('th-TH'),
        item.ref,
        item.desc,
        isIncome ? 'รายรับ (Income)' : 'รายจ่าย (Outcome)',
        incomeAmt || 0,
        outcomeAmt || 0,
        item.running_sum,
        baseBeforeTax || 0,
        vatVal || 0,
        whtVal || 0,
        netAfterTax || 0
      ];
    });

    // Sum totals for tax calculations
    const totalInc = finalLedger.reduce((sum, item) => sum + (item.income || 0), 0);
    const totalOut = finalLedger.reduce((sum, item) => sum + (item.outcome || 0), 0);
    const totalBal = totalInc - totalOut;
    const totalBase = finalLedger.reduce((sum, item) => sum + (item.type === 'INCOME' ? Number((item.income / 1.07).toFixed(2)) : 0), 0);
    const totalVAT = finalLedger.reduce((sum, item) => sum + (item.type === 'INCOME' ? Number((item.income - (item.income / 1.07)).toFixed(2)) : 0), 0);
    const totalWHT = finalLedger.reduce((sum, item) => sum + (item.type === 'INCOME' ? Number(((item.income / 1.07) * 0.03).toFixed(2)) : 0), 0);
    const totalNet = finalLedger.reduce((sum, item) => sum + (item.type === 'INCOME' ? Number((item.income - ((item.income / 1.07) * 0.03)).toFixed(2)) : 0), 0);

    const footerRow = [
      'รวมสะสมยอดสุทธิทั้งสิ้น (Total Summaries)',
      '',
      '',
      '',
      totalInc,
      totalOut,
      totalBal,
      Number(totalBase.toFixed(2)),
      Number(totalVAT.toFixed(2)),
      Number(totalWHT.toFixed(2)),
      Number(totalNet.toFixed(2))
    ];

    const finalData = [...title, ...rows, [], footerRow];

    // Create a worksheet and write workbook
    const ws = XLSX.utils.aoa_to_sheet(finalData);
    
    // Auto-fit or set manual optimal column widths for better design
    ws['!cols'] = [
      { wch: 14 }, // Date
      { wch: 18 }, // Reference
      { wch: 45 }, // Description
      { wch: 18 }, // Flow type
      { wch: 16 }, // In
      { wch: 16 }, // Out
      { wch: 18 }, // Balance Sum
      { wch: 22 }, // Base before VAT
      { wch: 18 }, // VAT 7%
      { wch: 18 }, // WHT 3%
      { wch: 24 }  // Net After Tax
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Statement-Tax-Ledger");
    XLSX.writeFile(wb, `JRK_OFFICIAL_TAX_LEDGER_${filterYear}_${filterMonth + 1}.xlsx`);
  };

  const thMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

  return (
    <div className="space-y-6">
      <div className="bg-white border border-red-100 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-50 pb-4">
          <div>
            <h2 className="text-xl font-extrabold text-[#38000A]">สมุดบัญชีรายวันและสเตทเม้นท์</h2>
            <p className="text-xs text-gray-500 mt-1">คัดกรองรายรับ-จ่าย ตรวจรายงานรายรับสะสม และบันทึกค่าแรง</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              className="h-10 border rounded-xl px-3 bg-white text-xs font-bold text-gray-800"
              value={filterMonth}
              onChange={e => setFilterMonth(Number(e.target.value))}
            >
              {thMonths.map((m, idx) => (
                <option key={idx} value={idx}>{m}</option>
              ))}
            </select>

            <select
              className="h-10 border rounded-xl px-3 bg-white text-xs font-bold text-gray-800"
              value={filterYear}
              onChange={e => setFilterYear(Number(e.target.value))}
            >
              {[2025, 2026, 2027].map(y => (
                <option key={y} value={y}>พ.ศ. {y + 543}</option>
              ))}
            </select>

            <button
              onClick={handleDownloadCSV}
              className="h-10 border border-gray-200 hover:border-red-400 bg-white text-gray-800 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 shrink-0 shadow-xs"
              title="ดาวน์โหลดรายงานสมุดบัญชีรายวันและสเตท์เม้นต์ในรูปแบบไฟล์ CSV"
            >
              <Download size={14} /> นำออกเป็น CSV
            </button>

            <button
              onClick={handleExportXLSX}
              className="h-10 border border-emerald-250 hover:bg-emerald-50 bg-[#e6f4ea] text-emerald-800 px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shrink-0 shadow-sm transition-all hover:scale-[1.02]"
              title="ดาวน์โหลดรายงานแยกประเภทรายวันแบบละเอียด พร้อมคอลัมน์การคิดภาษีอากรและมูลค่าเพิ่มในรูปแบบไฟล์ XLSX (Excel)"
            >
              <FileSpreadsheet size={14} className="stroke-emerald-800" />
              <span>นำเข้าใบเสร็จเสียภาษี (Excel XLSX)</span>
            </button>

            <button
              onClick={() => setIsAddingExpense(!isAddingExpense)}
              className="h-10 bg-[#CD1C18] hover:bg-black/95 text-white px-4 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 shadow-sm"
            >
              + บันทึกรายจ่ายรวม
            </button>
          </div>
        </div>

        {isAddingExpense && (
          <form onSubmit={handleCreateExpense} className="bg-red-50/40 border border-red-100 p-5 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold text-gray-700 animate-in fade-in slide-in-from-top-1">
            <div>
              <label className="block text-gray-600 mb-1">รายการสําแดงรายจ่าย *</label>
              <input
                type="text"
                required
                className="w-full h-10 border rounded-xl px-3 bg-white"
                placeholder="เช่น จ่ายค่าน้ํามันรถพ่วงส่งของให้คุณสมศักดิ์"
                value={exDesc}
                onChange={e => setExDesc(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-gray-600 mb-1">จำนวนเงินชำระมูลค่า (฿) *</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                className="w-full h-10 border rounded-xl px-3 bg-white text-right"
                value={exAmt || ''}
                placeholder="0.00"
                onChange={e => setExAmt(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-gray-600 mb-1">วันที่ชำระเสร็จสิ้น</label>
              <input
                type="date"
                className="w-full h-10 border rounded-xl px-3 bg-white"
                value={exDate}
                onChange={e => setExDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-gray-600 mb-1">ประเภทหมวดหมู่หลักสากล</label>
              <select
                className="w-full h-10 border rounded-xl px-2 bg-white text-[#38000A]"
                value={exCat}
                onChange={e => setExCat(e.target.value)}
              >
                <option>ค่าแรงหน่วยงาน / จ้างคนยกเหล็ก</option>
                <option>ค่าน้ํามันและเบี้ยเลี้ยงขนส่ง</option>
                <option>อะไหล่ซ่อมบำรุงวัสดุชำรุด</option>
                <option>ค่าภาษียื่นส่ง / สาธารณูปโภค</option>
                <option>ค่าใช้จ่ายจิปาถะทั่วไป</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-gray-600 mb-1">ข้อยึดประเมินช่วยจําเพิ่มเติม</label>
              <input
                type="text"
                className="w-full h-10 border rounded-xl px-3 bg-white"
                placeholder="ระบุเบอร์หรือผู้เบิกรหัสใบส่งน้ำมัน..."
                value={exNote}
                onChange={e => setExNote(e.target.value)}
              />
            </div>
            <div className="md:col-span-2 flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingExpense(false)}
                className="py-2 px-4 bg-gray-150 text-gray-600 rounded-lg text-xs"
              >
                ละทิ้ง
              </button>
              <button
                type="submit"
                className="py-2 px-5 bg-[#CD1C18] text-white rounded-lg text-xs font-extrabold"
              >
                ✓ ลงบันทึกประมวลผล
              </button>
            </div>
          </form>
        )}

        {/* Aggregate Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#FFFBF9] border border-red-50 p-5 rounded-2xl flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold">
              <TrendingUp size={20} />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-extrabold uppercase uppercase-wider">รวมผลรายรับ (Income)</p>
              <h3 className="text-xl font-black text-emerald-800">
                ฿{totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h3>
            </div>
          </div>

          <div className="bg-[#FFFBF9] border border-red-50 p-5 rounded-2xl flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-800 flex items-center justify-center font-bold">
              <TrendingDown size={20} />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-extrabold uppercase uppercase-wider">รวมผลรายจ่าย (Outcome)</p>
              <h3 className="text-xl font-black text-rose-700">
                ฿{totalOutcome.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h3>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-950 text-white p-5 rounded-2xl flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center font-bold">
              <Landmark size={20} />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-extrabold uppercase uppercase-wider">ยอดดุลสุทธิ (Net Profit)</p>
              <h3 className={`text-xl font-black ${netEarnings >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                ฿{netEarnings.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h3>
            </div>
          </div>
        </div>

        {/* Ledger table */}
        <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-xs">
          <table className="w-full text-xs font-bold text-left table-auto">
            <thead>
              <tr className="bg-[#FFF6F3] text-gray-700 h-10">
                <th className="p-3">วัน / เวลา</th>
                <th className="p-3 font-mono">เลขอ้างอิง</th>
                <th className="p-3">รายละเอียดเงินสดหมุนเวียน</th>
                <th className="p-3 text-right">นำเข้า (In)</th>
                <th className="p-3 text-right">ส่งออก (Out)</th>
                <th className="p-3 text-right">ดุลสะสม (Balance)</th>
                <th className="p-3 text-center">คําสั่ง</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-gray-600">
              {finalLedger.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    ไม่พลายพบรายการเดินยอดสเตทเม้นท์ในเดือนและปีที่กําหนด
                  </td>
                </tr>
              ) : (
                finalLedger.map((row, idx) => {
                  const isExp = row.type === 'EXPENSE';
                  return (
                    <tr key={idx} className="h-11 hover:bg-red-50/10 transition-colors">
                      <td className="p-3">{new Date(row.date).toLocaleDateString('th-TH')}</td>
                      <td className="p-3 font-mono font-bold text-gray-400">{row.ref.slice(-12)}</td>
                      <td className="p-3 font-medium text-gray-800">{row.desc}</td>
                      <td className="p-3 text-right text-emerald-700">
                        {row.income > 0 ? `฿${row.income.toLocaleString()}` : '—'}
                      </td>
                      <td className="p-3 text-right text-rose-700">
                        {row.outcome > 0 ? `฿${row.outcome.toLocaleString()}` : '—'}
                      </td>
                      <td className="p-3 text-right text-slate-900 font-extrabold">
                        ฿{row.running_sum.toLocaleString()}
                      </td>
                      <td className="p-3 text-center">
                        {isExp ? (
                          <button
                            onClick={() => handleCancelExpense(row.raw_id)}
                            className="p-1 text-rose-700 hover:bg-rose-50 rounded"
                            title="ลบรายจ่ายนี้"
                          >
                            <Trash size={12} />
                          </button>
                        ) : '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
