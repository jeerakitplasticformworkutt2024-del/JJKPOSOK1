/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { JirakitDB } from '../db';
import { Product } from '../types';
import { Search, Plus, AlertCircle, Edit3, Trash2, Settings, X } from 'lucide-react';

interface ProductsProps {
  refreshCount: number;
  triggerRefresh: () => void;
}

export default function Products({ refreshCount, triggerRefresh }: ProductsProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ทั้งหมด');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);

  // Form fields
  const [pName, setPName] = useState('');
  const [pSku, setPSku] = useState('');
  const [pCategory, setPCategory] = useState('แบบคาน');
  const [pUseType, setPUseType] = useState<'rent' | 'sale' | 'both'>('rent');
  const [pUnit, setPUnit] = useState('ชิ้น');
  const [pPriceRent, setPPriceRent] = useState(0);
  const [pPriceSale, setPPriceSale] = useState(0);
  const [pStockTotal, setPStockTotal] = useState(100);
  const [pThreshold, setPThreshold] = useState(10);
  const [pStatus, setPStatus] = useState<'Active' | 'Inactive'>('Active');
  const [pNote, setPNote] = useState('');

  useEffect(() => {
    // Show active items by default
    const list = JirakitDB.getProducts().filter(p => p.item_status !== 'Deleted');
    setProducts(list);

    // Auto-open restock modal if there's a quick restock request in localStorage
    const itemIdToRestock = localStorage.getItem('JRK_QUICK_RESTOCK_ITEM_ID');
    if (itemIdToRestock) {
      const found = list.find(p => p.item_id === itemIdToRestock);
      if (found) {
        setEditingProduct(found);
        setPName(found.item_name);
        setPSku(found.sku);
        setPCategory(found.category);
        setPUseType(found.use_type);
        setPUnit(found.unit);
        setPPriceRent(found.price_rent);
        setPPriceSale(found.price_sale);
        setPStockTotal(found.qty_total);
        setPThreshold(found.low_stock_threshold);
        setPStatus(found.item_status as any);
        setPNote(found.note);
      }
      localStorage.removeItem('JRK_QUICK_RESTOCK_ITEM_ID');
    }
  }, [refreshCount]);

  const categories = ['ทั้งหมด', 'แบบคาน', 'แบบเสา', 'แบบข้าง', 'แบบฟุตติ้ง', 'นั่งร้าน/อุปกรณ์'];

  const filtered = products.filter(p => {
    const q = searchQuery.toLowerCase();
    const matchSearch = p.item_name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
    
    let matchCat = false;
    if (selectedCategory === 'ทั้งหมด') {
      matchCat = true;
    } else if (selectedCategory === 'นั่งร้าน/อุปกรณ์') {
      matchCat = p.category === 'นั่งร้าน' || p.category === 'ขาปรับ' || p.category === 'นั่งร้าน/อุปกรณ์' || p.category === 'นั่งร้านและอุปกรณ์';
    } else {
      matchCat = p.category === selectedCategory;
    }
    
    return matchSearch && matchCat;
  });

  const handleOpenForm = (p?: Product) => {
    if (p) {
      setEditingProduct(p);
      setPName(p.item_name);
      setPSku(p.sku);
      setPCategory(p.category);
      setPUseType(p.use_type);
      setPUnit(p.unit);
      setPPriceRent(p.price_rent);
      setPPriceSale(p.price_sale);
      setPStockTotal(p.qty_total);
      setPThreshold(p.low_stock_threshold);
      setPStatus(p.item_status as any);
      setPNote(p.note);
    } else {
      setEditingProduct(null);
      setPName('');
      setPSku('');
      setPCategory('แบบคาน');
      setPUseType('rent');
      setPUnit('ชิ้น');
      setPPriceRent(0);
      setPPriceSale(0);
      setPStockTotal(100);
      setPThreshold(10);
      setPStatus('Active');
      setPNote('');
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pName.trim()) return;

    const payload: Partial<Product> = {
      item_name: pName,
      sku: pSku || `SKU-${Date.now().toString().slice(-6)}`,
      category: pCategory,
      use_type: pUseType,
      unit: pUnit,
      price_rent: pPriceRent,
      price_sale: pPriceSale,
      qty_total: pStockTotal,
      low_stock_threshold: pThreshold,
      item_status: pStatus as any,
      note: pNote
    };

    if (editingProduct) {
      payload.item_id = editingProduct.item_id;
    }

    try {
      JirakitDB.saveProduct(payload);
      alert('บันทึกปรับข้อมูลคลังสินค้าสำเร็จเรียบร้อย!');
      setEditingProduct(null);
      setProducts(JirakitDB.getProducts().filter(p => p.item_status !== 'Deleted'));
      triggerRefresh();
    } catch (err: any) {
      alert(`ไม่สามารถเซฟข้อมูลสินค้าได้: ${err?.message || err}`);
    }
  };

  const handleDeleteProduct = (productId: string) => {
    if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรายการสินค้านี้ออกจากระบบ?')) {
      try {
        JirakitDB.saveProduct({ item_id: productId, item_status: 'Deleted' });
        setProducts(JirakitDB.getProducts().filter(p => p.item_status !== 'Deleted'));
        triggerRefresh();
        alert('ลบข้อมูลสินค้าเรียบร้อยแล้ว!');
      } catch (err: any) {
        alert(`ไม่สามารถลบข้อมูลสินค้าได้: ${err?.message || err}`);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#1e293b] border border-slate-800/80 rounded-xl p-5 shadow-md space-y-4">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800/60 pb-4">
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-tight">ระบบฐานข้อมูล & สต็อกวัสดุก่อสร้าง</h2>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">เพิ่มลดยอดคลัง ตกแต่งพารามิเตอร์ราคา และตรวจสต็อกที่เช่าค้างนอกร้าน</p>
          </div>
          <button
            onClick={() => handleOpenForm()}
            className="h-11 bg-[#fbbf24] hover:bg-amber-500 text-black font-black uppercase tracking-wider px-5 rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow-md cursor-pointer"
          >
            <Plus size={14} /> เพิ่มรหัสสินค้าและบริการ
          </button>
        </div>

        {/* Filter and Search Bars */}
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
            <input
              type="text"
              className="w-full bg-[#0f172a] border border-slate-750 rounded-lg pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#fbbf24] placeholder-slate-500 h-10 font-bold"
              placeholder="สืบค้นวัสดุตาม ชื่อ / SKU / ตัวคีย์..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex overflow-x-auto gap-1 w-full md:w-auto p-1 bg-[#0f172a] border border-slate-800 rounded-lg shrink-0">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-md text-xs font-black whitespace-nowrap transition-all uppercase ${
                  selectedCategory === cat 
                    ? 'bg-[#fbbf24] text-black shadow-sm' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Master Stock Grid */}
        <div className="overflow-x-auto rounded-xl border border-slate-800 shadow-sm bg-[#0f172a]/30">
          <table className="w-full text-xs font-bold text-left table-auto">
            <thead>
              <tr className="bg-[#0f172a] text-slate-400 h-11 border-b border-slate-805">
                <th className="p-3 pl-4">สินค้า / SKU</th>
                <th className="p-3 text-center">วิธีคำนวณบิล</th>
                <th className="p-3 text-right">ราคาเช่า (รอบ)</th>
                <th className="p-3 text-right">ราคาขายส่ง</th>
                <th className="p-3 text-center">สถานะคลัง (พร้อม/รวม)</th>
                <th className="p-3 text-center">ปรับแต่ง</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 text-slate-300">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500 font-bold">
                    ไม่พบคู่สัญญาหรือพิกัดอุปกรณ์ตามการค้นหา
                  </td>
                </tr>
              ) : (
                filtered.map(p => {
                  const ruleLocked = p.category === 'แบบคาน' || p.category === 'แบบเสา';
                  const isLow = p.qty_available <= p.low_stock_threshold;
                  return (
                    <tr key={p.item_id} className="h-13 hover:bg-slate-800/30 transition-colors">
                      <td className="p-3 pl-4">
                        <span className="text-white font-black block text-[13px]">{p.item_name}</span>
                        <span className="text-[10px] text-slate-500 font-mono font-bold mt-0.5 block">{p.sku}</span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="text-slate-400 font-bold block">
                          {p.rental_mode === 'day' ? 'คิดรายวัน' : 'เช่าแบบรอบ'}
                        </span>
                      </td>
                      <td className="p-3 text-right text-[#fbbf24] font-black text-xs">
                        ฿{p.price_rent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-right text-slate-100 font-black text-xs">
                        ฿{p.price_sale.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex flex-col items-center">
                          <span className={`text-xs font-black px-2.5 py-0.5 rounded ${
                            isLow ? 'bg-rose-950/40 text-rose-400 border border-rose-900/60' : 'bg-emerald-950/40 text-emerald-450 border border-emerald-900/60'
                          }`}>
                            {p.qty_available} {p.unit}
                          </span>
                          <span className="text-[9.5px] text-slate-550 font-bold mt-1">รวมในร้าน: {p.qty_total}</span>
                        </div>
                      </td>
                      <td className="p-3 text-center relative">
                        <div className="flex justify-center items-center">
                          {expandedProductId === p.item_id && (
                            <div className="absolute bottom-[44px] right-1/2 translate-x-1/2 bg-[#0f172a] border border-slate-750 rounded-lg p-1.5 shadow-2xl flex gap-1.5 items-center z-30 animate-in fade-in slide-in-from-bottom-2 duration-150 min-w-[155px] justify-center">
                              <button
                                onClick={() => {
                                  handleOpenForm(p);
                                  setExpandedProductId(null);
                                }}
                                className="p-1.5 px-2 bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-800 text-emerald-450 rounded text-[10px] font-black cursor-pointer flex items-center gap-1 transition-all"
                              >
                                <Edit3 size={11} className="text-[#fbbf24]" /> แก้ไข
                              </button>
                              <button
                                onClick={() => {
                                  handleDeleteProduct(p.item_id);
                                  setExpandedProductId(null);
                                }}
                                className="p-1.5 px-2 bg-rose-950/90 hover:bg-rose-900 border border-rose-800 text-rose-400 rounded text-[10px] font-black cursor-pointer flex items-center gap-1 transition-all"
                              >
                                <Trash2 size={11} className="text-rose-400" /> ลบ
                              </button>
                              <button
                                onClick={() => setExpandedProductId(null)}
                                className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-all cursor-pointer"
                                title="ปิด"
                              >
                                <X size={12} />
                              </button>
                              {/* Popover Arrow */}
                              <div className="absolute -bottom-1.5 right-1/2 translate-x-1/2 w-3 h-3 bg-[#0f172a] border-r border-b border-slate-750 rotate-45"></div>
                            </div>
                          )}
                          <button
                            onClick={() => setExpandedProductId(expandedProductId === p.item_id ? null : p.item_id)}
                            className={`p-1.5 px-3 rounded border font-black text-[10.5px] transition-all cursor-pointer flex items-center gap-1 shadow-sm ${
                              expandedProductId === p.item_id 
                                ? 'bg-[#fbbf24] text-black border-[#fbbf24]' 
                                : 'bg-[#1e293b] hover:bg-slate-850 hover:text-white border-slate-750 text-slate-300'
                            }`}
                          >
                            <Settings size={11} /> จัดการ
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Editor Drawer Popup Form Modal */}
      {editingProduct !== null && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-[#1e293b] border border-slate-800 rounded-xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-[#0f172a] px-6 py-4.5 text-white flex justify-between items-center border-b border-slate-800">
              <div>
                <h3 className="text-md font-black uppercase tracking-wide text-white">
                  {editingProduct.item_id ? `แก้ไขพารามิเตอร์วัสดุ #${editingProduct.item_id}` : 'สร้างรายการอุปกรณ์ชิ้นใหม่'}
                </h3>
              </div>
              <button onClick={() => setEditingProduct(null)} className="text-[#fbbf24] hover:text-white text-2xl font-black cursor-pointer">×</button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs font-bold text-slate-300">
              
              {/* Locked Information Warning Display */}
              {(pCategory === 'แบบคาน' || pCategory === 'แบบเสา') && (
                <div className="bg-amber-950/20 border border-amber-900/50 p-4 rounded-lg text-amber-200 flex items-start gap-2.5 animate-in fade-in slide-in-from-top-1">
                  <AlertCircle className="text-[#fbbf24] shrink-0 mt-0.5" size={16} />
                  <p className="text-[10px] leading-relaxed font-bold">
                    <b>แจ้งเตือนกฎวิศวกรรมสต็อก:</b> ผลิตภัณฑ์กลุ่ม "แบบคาน" และ "แบบเสา" ถูกกำหนดให้เป็นแบบ <b>เช่าเหมาจ่าย / คิดมูลค่าเป็นรอบ</b> โดยสารบบ ERP สิทธิ์นี้จะไม่สามารถแก้ไขแบบบิลรายวันได้ตามพิกัดร้านอุตรดิตถ์
                  </p>
                </div>
              )}

              <div>
                <label className="block text-slate-400 mb-1.5 uppercase tracking-wide">ชื่อสินค้าหรือรายละเอียดความยาว *</label>
                <input
                  type="text"
                  required
                  className="w-full h-10 bg-[#0f172a] border border-slate-750 rounded-lg px-3.5 text-white text-xs focus:outline-none focus:border-[#fbbf24] font-bold"
                  placeholder="เช่น แบบคาน 40x1.00 หรือ ขาปรับ 0.50 ซม."
                  value={pName}
                  onChange={e => setPName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-400 mb-1.5 uppercase tracking-wide">รหัสบาร์โค้ด / SKU</label>
                  <input
                    type="text"
                    className="w-full h-10 bg-[#0f172a] border border-slate-750 rounded-lg px-3.5 text-white text-xs focus:outline-none focus:border-[#fbbf24] font-mono"
                    placeholder="เช่น BEAM-40100-30"
                    value={pSku}
                    onChange={e => setPSku(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1.5 uppercase tracking-wide">หมวดหมู่สินค้าหลัก *</label>
                  <select
                    className="w-full h-10 bg-[#0f172a] border border-slate-750 rounded-lg px-2 text-white font-bold text-xs focus:outline-none focus:border-[#fbbf24] h-10"
                    value={pCategory}
                    onChange={e => setPCategory(e.target.value)}
                  >
                    {['แบบคาน', 'แบบเสา', 'แบบข้าง', 'แบบฟุตติ้ง', 'นั่งร้าน/อุปกรณ์'].map(cat => (
                      <option key={cat} value={cat} className="bg-[#1e293b] text-white font-bold">{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-400 mb-1.5 uppercase tracking-wide">วัตถุประสงค์งานประมวลผล</label>
                  <select
                    className="w-full h-10 bg-[#0f172a] border border-slate-750 rounded-lg px-2 text-white font-bold text-xs focus:outline-none focus:border-[#fbbf24] h-10"
                    value={pUseType}
                    onChange={e => setPUseType(e.target.value as any)}
                  >
                    <option value="rent" className="bg-[#1e293b] text-white">ให้บริการปล่อยเช่ารายสัปดาห์</option>
                    <option value="sale" className="bg-[#1e293b] text-white">ขายขาด/สั่งซื้ออุปกรณ์</option>
                    <option value="both" className="bg-[#1e293b] text-white">เปิดบริการทั้งสองระบบ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1.5 uppercase tracking-wide">หน่วยนับอุปกรณ์ *</label>
                  <input
                    type="text"
                    required
                    className="w-full h-10 bg-[#0f172a] border border-slate-750 rounded-lg px-3.5 text-white text-xs focus:outline-none focus:border-[#fbbf24] font-bold"
                    placeholder="เช่น แผ่น / ชุด / ท่อน / ต้น"
                    value={pUnit}
                    onChange={e => setPUnit(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-400 mb-1.5 uppercase tracking-wide">ราคาเช่า / ชิ้น / รอบ (฿)</label>
                  <input
                    type="number"
                    className="w-full h-10 bg-[#0f172a] border border-slate-755 rounded-lg px-3.5 text-right font-black text-[#fbbf24] focus:outline-none focus:border-[#fbbf24] text-xs h-10"
                    value={pPriceRent || ''}
                    placeholder="0"
                    onChange={e => setPPriceRent(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1.5 uppercase tracking-wide">ราคาขายปลีก / ชิ้น (฿)</label>
                  <input
                    type="number"
                    className="w-full h-10 bg-[#0f172a] border border-slate-755 rounded-lg px-3.5 text-right font-black text-slate-100 focus:outline-none focus:border-[#fbbf24] text-xs h-10"
                    value={pPriceSale || ''}
                    placeholder="0"
                    onChange={e => setPPriceSale(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-400 mb-1.5 uppercase tracking-wide">ปริมาณรวมของคลังในร้าน *</label>
                  <input
                    type="number"
                    className="w-full h-10 bg-[#0f172a] border border-slate-755 rounded-lg px-3.5 text-right font-black text-slate-200 focus:outline-none focus:border-[#fbbf24] text-xs h-10"
                    value={pStockTotal || ''}
                    onChange={e => setPStockTotal(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1.5 uppercase tracking-wide">เกณฑ์เตือนสต็อกขั้นต่ำต่ำเตือน *</label>
                  <input
                    type="number"
                    className="w-full h-10 bg-[#0f172a] border border-slate-755 rounded-lg px-3.5 text-right font-black text-rose-400 focus:outline-none focus:border-rose-500 text-xs h-10"
                    value={pThreshold || ''}
                    onChange={e => setPThreshold(Number(e.target.value))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1.5 uppercase tracking-wide">สถานะวางใช้เครื่องมือ</label>
                <select
                  className="w-full h-10 bg-[#0f172a] border border-slate-750 rounded-lg px-2 text-white text-xs font-bold focus:outline-none focus:border-[#fbbf24] h-10"
                  value={pStatus}
                  onChange={e => setPStatus(e.target.value as any)}
                >
                  <option value="Active" className="bg-[#1e293b] text-white">เปิดปล่อยปกติเข้ารายการ</option>
                  <option value="Inactive" className="bg-[#1e293b] text-white">ปิดปล่อยชั่วคราว (ชำรุด/ไม่พร้อม)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1.5 uppercase tracking-wide">บันทึกช่วยจำเพิ่มเติม</label>
                <input
                  type="text"
                  className="w-full h-10 bg-[#0f172a] border border-slate-750 rounded-lg px-3.5 text-white text-xs focus:outline-none focus:border-[#fbbf24]"
                  placeholder="เช่น มอก.เกรดพรีเมียมหนาพิเศษ"
                  value={pNote}
                  onChange={e => setPNote(e.target.value)}
                />
              </div>

              <div className="flex gap-3.5 pt-4.5 border-t border-slate-805">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="w-1/3 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 font-black rounded-lg cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#fbbf24] hover:bg-amber-500 text-black font-black uppercase tracking-wider rounded-lg shadow-md cursor-pointer"
                >
                  ✓ คอนเฟิร์มเพิ่มพารามิเตอร์คลัง
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
