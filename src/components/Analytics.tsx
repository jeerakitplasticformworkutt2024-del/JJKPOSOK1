/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { JirakitDB } from '../db';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Landmark, TrendingUp, TrendingDown, ClipboardList } from 'lucide-react';

export default function Analytics() {
  const [period, setPeriod] = useState<'this_month' | 'last_month' | 'this_year'>('this_month');
  const [metrics, setMetrics] = useState<any>({
    totalRevenue: 0,
    salesCount: 0,
    rentalRevenue: 0,
    salesRevenue: 0,
    debtTotal: 0,
    billingTotal: 0,
    chartData: [],
    pieData: []
  });

  useEffect(() => {
    // Math engine replicating sheets report
    const bills = JirakitDB.getReceipts();
    const today = new Date();
    
    let filtered = bills;
    if (period === 'this_month') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      filtered = bills.filter(r => new Date(r.created_at) >= start);
    } else if (period === 'last_month') {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      filtered = bills.filter(r => {
        const d = new Date(r.created_at);
        return d >= start && d <= end;
      });
    } else if (period === 'this_year') {
      const start = new Date(today.getFullYear(), 0, 1);
      filtered = bills.filter(r => new Date(r.created_at) >= start);
    }

    const totalRevenue = filtered.reduce((s, r) => s + r.paid_amount, 0);
    const debtTotal = filtered.reduce((s, r) => s + r.debt_amount, 0);
    const billingTotal = filtered.reduce((s, r) => s + r.grand_total, 0);

    let salesRevenue = 0;
    let rentalRevenue = 0;

    filtered.forEach(r => {
      const items = JSON.parse(r.items_json || '[]');
      items.forEach((it: any) => {
        if (it.line_mode === 'sale') {
          salesRevenue += it.line_total || 0;
        } else {
          rentalRevenue += it.line_total || 0;
        }
      });
    });

    // Make beautiful daily trend charts
    const dayMap: Record<string, number> = {};
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().slice(0, 10);
    }).reverse();

    last7Days.forEach(day => {
      dayMap[day] = 0;
    });

    bills.forEach(r => {
      const day = r.created_at.slice(0, 10);
      if (dayMap[day] !== undefined) {
        dayMap[day] += r.paid_amount;
      }
    });

    const chartData = Object.entries(dayMap).map(([date, total]) => {
      const jsD = new Date(date);
      const label = jsD.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
      return {
        date: label,
        'รายได้': total
      };
    });

    setMetrics({
      totalRevenue,
      salesCount: filtered.length,
      rentalRevenue,
      salesRevenue,
      debtTotal,
      billingTotal,
      chartData,
      pieData: [
        { name: 'สถิติยอดขนส่ง/ขายขาด', value: salesRevenue || 1 },
        { name: 'สถิติเช่าวัสดุปั้นเสา/คาน', value: rentalRevenue || 1 }
      ]
    });
  }, [period]);

  const COLORS = ['#FFA896', '#9B1313'];

  return (
    <div className="space-y-6">
      <div className="bg-white border rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-50 pb-4">
          <div>
            <h2 className="text-xl font-extrabold text-[#38000A]">วิเคราะห์สถิติและการดําเนินงาน</h2>
            <p className="text-xs text-gray-500 mt-1">ประมวลผลกระแสรายได้ เปรียบเทียบสัดส่วนเช่าวัสดุยึดเสารุ่นพลาสติก</p>
          </div>

          <div className="flex bg-gray-100 p-1 rounded-xl">
            {(['this_month', 'last_month', 'this_year'] as const).map(p => {
              const pLabel = {
                this_month: 'ประมวลผลเดือนนี้',
                last_month: 'ประมวลผลเดือนก่อน',
                this_year: 'ประมวลผลปีนี้'
              };
              return (
                <button
                  key={p}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    period === p 
                      ? 'bg-[#CD1C18] text-white shadow-xs' 
                      : 'text-gray-600 hover:text-[#38000A]'
                  }`}
                  onClick={() => setPeriod(p)}
                >
                  {pLabel[p]}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4 Cards metrics analysis */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#FFFBF9] border border-red-50 p-5 rounded-2xl flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#CD1C18] flex items-center justify-center font-bold">
              <TrendingUp size={20} />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-extrabold uppercase uppercase-wider">ยอดเก็บกระแสจริง</p>
              <h3 className="text-lg font-black text-gray-900">
                ฿{metrics.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h3>
            </div>
          </div>

          <div className="bg-[#FFFBF9] border border-red-50 p-5 rounded-2xl flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-red-100 text-[#CD1C18] flex items-center justify-center font-bold">
              <ClipboardList size={20} />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-extrabold uppercase uppercase-wider">ปริมาณบิลที่ออก</p>
              <h3 className="text-lg font-black text-gray-900">{metrics.salesCount} ฉบับ</h3>
            </div>
          </div>

          <div className="bg-[#FFFBF9] border border-red-50 p-5 rounded-2xl flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#CD1C18] flex items-center justify-center font-bold">
              <Landmark size={20} />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-extrabold uppercase uppercase-wider">สัดส่วนค่าเช่ารวม</p>
              <h3 className="text-lg font-black text-gray-900">
                ฿{metrics.rentalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h3>
            </div>
          </div>

          <div className="bg-[#FFFBF9] border border-red-50 p-5 rounded-2xl flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-800 flex items-center justify-center font-bold">
              <TrendingDown size={20} />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-extrabold uppercase uppercase-wider">หนี้ค้างสุทธิระยะสั้น</p>
              <h3 className="text-lg font-black text-rose-700">
                ฿{metrics.debtTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h3>
            </div>
          </div>
        </div>

        {/* Charts using recharts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-[#FFFBF9] border border-red-50 p-5 rounded-2xl">
            <h3 className="text-sm font-extrabold text-[#38000A] mb-4">แนวโน้มรายรับรวม 7 วันล่าสุด</h3>
            <div className="h-64 font-bold text-xs" style={{ width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffd8cf" />
                  <XAxis dataKey="date" stroke="#904B3E" fontWeight="bold" />
                  <YAxis stroke="#904B3E" fontWeight="bold" />
                  <Tooltip formatter={(value) => [`฿${Number(value).toLocaleString()}`, 'กระแสรายรับ']} />
                  <Bar dataKey="รายได้" fill="#9B1313" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-[#FFFBF9] border border-red-50 p-5 rounded-2xl flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-[#38000A] mb-4">อัตราส่วนผลิตภัณฑ์ เช่า VS ขาย</h3>
              <div className="h-44 flex items-center justify-center font-bold text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={metrics.pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {metrics.pieData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `฿${Number(value).toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="space-y-2 border-t pt-4 text-xs font-semibold text-gray-600">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-[#9B1313] inline-block shrink-0"></span>
                <span>อัตราการเช่าไม้แบบคานเสากลาง: ฿{metrics.rentalRevenue.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-[#FFA896] inline-block shrink-0"></span>
                <span>อัตราสั่งซื้อเครื่องจัดส่ง/อื่นๆ: ฿{metrics.salesRevenue.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
