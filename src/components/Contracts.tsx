import React, { useState, useEffect, useRef } from 'react';
import { JirakitDB } from '../db';
import { Customer, Receipt, BillItemRef } from '../types';

// Definitions for local persistence
interface ContractItem {
  item_name: string;
  qty: number;
}

interface RentContract {
  contract_id: string;
  contract_no: string;
  customer_id?: string;
  customer_name: string;
  phone: string;
  address: string;
  id_card_no: string;
  deposit_amount: number;
  has_deposit: boolean;
  rental_items: ContractItem[];
  customer_signature_base64: string;
  contract_html_edited: string; // Stored rich text override
  contract_date: string;
  receipt_id?: string;
  receipt_no?: string;
  status: 'Draft' | 'Signed' | 'Printed';
  created_at: string;
  updated_at: string;
}

export default function Contracts() {
  // Tab control: history, input, preview, edit
  const [tab, setTab] = useState<'history' | 'input' | 'preview' | 'edit'>('history');
  
  // Database datasets
  const [systemCustomers, setSystemCustomers] = useState<Customer[]>([]);
  const [systemReceipts, setSystemReceipts] = useState<Receipt[]>([]);
  const [savedContracts, setSavedContracts] = useState<RentContract[]>([]);
  const [shareContract, setShareContract] = useState<RentContract | null>(null);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  // Filter & Search state for history
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>('all');
  
  // Active editing state
  const [activeContractId, setActiveContractId] = useState<string | null>(null);

  // Form elements with real-time binding
  const [contractId, setContractId] = useState('');
  const [contractDate, setContractDate] = useState('');
  
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [idCardNo, setIdCardNo] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  
  // Linked Receipt
  const [selectedReceiptId, setSelectedReceiptId] = useState('');
  
  // Dynamic list of items
  const [contractItems, setContractItems] = useState<ContractItem[]>([
    { item_name: 'นั่งร้านเหล็กชุด 1.7m', qty: 20 },
    { item_name: 'เครื่องสลัดคอนกรีตขนาดกลาง', qty: 1 }
  ]);
  
  const [hasDeposit, setHasDeposit] = useState<boolean>(true);
  const [depositAmount, setDepositAmount] = useState<number>(5000);
  const [signatureData, setSignatureData] = useState<string>('');
  
  // Custom Editor Content editable state
  const [editorHtml, setEditorHtml] = useState<string>('');
  const [useCustomHtml, setUseCustomHtml] = useState<boolean>(false);
  const [contractStatus, setContractStatus] = useState<'Draft' | 'Signed' | 'Printed'>('Draft');

  // OCR Scan variables
  const [isScanning, setIsScanning] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);

  // For Signature Pad drawing
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Load and inject CDN fonts/icons dynamically & populate data
  useEffect(() => {
    // Inject FontAwesome Web Icons
    if (!document.getElementById('font-awesome-contract-cdn')) {
      const link = document.createElement('link');
      link.id = 'font-awesome-contract-cdn';
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
      document.head.appendChild(link);
    }
    
    // Inject custom Google Fonts Sarabun + Inter
    if (!document.getElementById('google-fonts-contract-cdn')) {
      const link = document.createElement('link');
      link.id = 'google-fonts-contract-cdn';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Sarabun:ital,wght@0,350;0,400;0,500;0,600;0,700;0,800;1,350;1,400&display=swap';
      document.head.appendChild(link);
    }

    // Load data from DB
    try {
      setSystemCustomers(JirakitDB.getCustomers());
      // Filter receipts that contain items to associate with contracts
      const allRcs = JirakitDB.getReceipts();
      setSystemReceipts(allRcs);
    } catch (e) {
      console.error('Error loading DB data', e);
    }

    // Load saved contracts history
    const cachedHistory = localStorage.getItem('JRK_SAVED_CONTRACTS');
    if (cachedHistory) {
      try {
        setSavedContracts(JSON.parse(cachedHistory));
      } catch (e) {
        console.error('Error parsing saved contracts', e);
      }
    } else {
      // Create some default history to simulate system
      const mockHistory: RentContract[] = [
        {
          contract_id: 'CTR-260525-001',
          contract_no: 'CTR-250525-001',
          customer_name: 'นายสมเกียรติ พัฒนาก่อสร้าง',
          id_card_no: '3530100234567',
          phone: '0894567812',
          address: '123/4 ต.ท่าเสา อ.เมือง จ.อุตรดิตถ์ โครงการข้างโลตัสอุตรดิตถ์',
          deposit_amount: 15000,
          has_deposit: true,
          rental_items: [
            { item_name: 'แบบเหล็กมาตรฐาน 40x1.20m', qty: 50 },
            { item_name: 'นั่งร้านเหล็กชุด 1.70m', qty: 15 }
          ],
          customer_signature_base64: '',
          contract_html_edited: '',
          contract_date: '25 พฤษภาคม 2569',
          status: 'Draft',
          created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
          updated_at: new Date(Date.now() - 3600000 * 24).toISOString()
        },
        {
          contract_id: 'CTR-260525-002',
          contract_no: 'CTR-250525-002',
          customer_name: 'นายสมชาย ใจดี',
          id_card_no: '1-2345-67890-12-3',
          phone: '081-234-5678',
          address: '123/45 หมู่ 8 ต.ท่าเสา อ.เมือง จ.อุตรดิตถ์ 53000',
          deposit_amount: 5000,
          has_deposit: true,
          rental_items: [
            { item_name: 'นั่งร้านเหล็กชุด 1.7m', qty: 20 },
            { item_name: 'เครื่องสลัดคอนกรีตขนาดกลาง', qty: 1 }
          ],
          customer_signature_base64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAfQAAACgCAYAAACF0LqXAAAAP0lEQVR42u3BAQ0AAADCoPdPbQ43oAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADwBp9XAAHNrPlwAAAAAElFTkSuQmCC',
          contract_html_edited: '',
          contract_date: '26 พฤษภาคม 2569',
          status: 'Signed',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      setSavedContracts(mockHistory);
      localStorage.setItem('JRK_SAVED_CONTRACTS', JSON.stringify(mockHistory));
    }
  }, []);

  // Hook to handle Canvas configuration on tab switch or active drawing state
  useEffect(() => {
    if (tab === 'input') {
      setTimeout(setupCanvas, 150);
    }
  }, [tab, activeContractId]);

  // Touch & Mouse drawing helpers for signature pads
  const setupCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear & Resize support
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#0284c7'; // Sky Blue 600 logo tint
  };

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
  };

  const drawMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDraw = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureData('');
  };

  const confirmSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !isDrawing) {
      // Fallback fallback if user drew anything
    }
    const dataUrl = canvas.toDataURL('image/png');
    setSignatureData(dataUrl);
    setContractStatus('Signed');
    alert('ยืนยันบันทึกพิกัดสลักลายเซ็นแล้ว! ลายมือชื่อจะปรากฏในสัญญาโดยอัตโนมัติ');
  };

  // Run dynamic simulated high-speed OCR card scanning
  const handleSimulateOCR = () => {
    setIsScanning(true);
    setHasScanned(false);
    setTimeout(() => {
      setIsScanning(false);
      setHasScanned(true);
      setCustomerName('นายสมชาย ใจดี');
      setIdCardNo('1-2345-67890-12-3');
      setPhone('081-234-5678');
      setAddress('123/45 หมู่ 8 ต.ท่าเสา อ.เมือง จ.อุตรดิตถ์ 53000');
    }, 1200);
  };

  // Reset/Clear mock OCR
  const handleResetOCR = () => {
    setHasScanned(false);
    setSelectedCustomerId('');
    setCustomerName('');
    setIdCardNo('');
    setPhone('');
    setAddress('');
  };

  // When selected system customer changes, fill info automatically
  const handleSystemCustomerSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cid = e.target.value;
    setSelectedCustomerId(cid);
    if (!cid) return;

    const match = systemCustomers.find(c => c.customer_id === cid);
    if (match) {
      setCustomerName(match.customer_name);
      setIdCardNo(match.id_card_no || '');
      setPhone(match.phone || '');
      setAddress(match.address || match.registered_address || '');
      setHasScanned(true);
    }
  };

  // When selected system receipt changes, populate items & values
  const handleSystemReceiptSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const rid = e.target.value;
    setSelectedReceiptId(rid);
    if (!rid) return;

    const match = systemReceipts.find(r => r.receipt_id === rid);
    if (match) {
      setHasDeposit(match.deposit > 0);
      setDepositAmount(match.deposit);
      setContractId(`CTR-${match.receipt_no}`);
      
      // Auto fill customer if matched
      if (match.customer_name) {
        setCustomerName(match.customer_name);
        setPhone(match.phone || '');
        setAddress(match.address || match.delivery_location || '');
      }

      // Populate items
      try {
        const itemsArr: BillItemRef[] = JSON.parse(match.items_json || '[]');
        const filteredRent = itemsArr.filter(i => i.line_mode === 'rent');
        if (filteredRent.length > 0) {
          setContractItems(filteredRent.map(ri => ({
            item_name: ri.receipt_name || 'วัสดุไม้แบบเช่า',
            qty: ri.qty
          })));
        } else {
          setContractItems([{ item_name: `พัสดุเช่าตามใบเสร็จ ${match.receipt_no}`, qty: 1 }]);
        }
      } catch (err) {
        console.error('Error decoding receipt items JSON', err);
        setContractItems([{ item_name: `พัสดุเช่าตามใบเสร็จ ${match.receipt_no}`, qty: 1 }]);
      }
    }
  };

  // Item List builders
  const handleAddItemRow = () => {
    setContractItems([...contractItems, { item_name: 'แบบพลาสติกเพิ่มพิเศษ', qty: 10 }]);
  };

  const handleRemoveItemRow = (index: number) => {
    const updated = contractItems.filter((_, idx) => idx !== index);
    setContractItems(updated.length > 0 ? updated : [{ item_name: 'นั่งร้านเหล็ก', qty: 1 }]);
  };

  const handleChangeItemName = (index: number, val: string) => {
    const updated = [...contractItems];
    updated[index].item_name = val;
    setContractItems(updated);
  };

  const handleChangeItemQty = (index: number, val: number) => {
    const updated = [...contractItems];
    updated[index].qty = Math.max(1, val);
    setContractItems(updated);
  };

  // Action: Launch edit or create dynamic contract draft
  const handleInitCreateNewContract = () => {
    const nextNo = `CTR-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${String(savedContracts.length + 1).padStart(3, '0')}`;
    const todayText = new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
    
    // Set form fields for brand new
    setActiveContractId('new');
    setContractId(nextNo);
    setContractDate(todayText);
    
    setSelectedCustomerId('');
    setCustomerName('');
    setIdCardNo('');
    setPhone('');
    setAddress('');
    
    setSelectedReceiptId('');
    setContractItems([
      { item_name: 'นั่งร้านเหล็กชุด 1.7m', qty: 20 },
      { item_name: 'เครื่องสลัดคอนกรีตขนาดกลาง', qty: 1 }
    ]);
    setHasDeposit(true);
    setDepositAmount(3000);
    setSignatureData('');
    setContractStatus('Draft');
    setUseCustomHtml(false);
    setEditorHtml('');
    setHasScanned(false);

    setTab('input');
  };

  // Action: Select contract for edit
  const handleEditSelectedContract = (c: RentContract) => {
    setActiveContractId(c.contract_id);
    setContractId(c.contract_no);
    setContractDate(c.contract_date);
    setCustomerName(c.customer_name);
    setIdCardNo(c.id_card_no);
    setPhone(c.phone);
    setAddress(c.address);
    setHasDeposit(c.has_deposit);
    setDepositAmount(c.deposit_amount);
    setContractItems(c.rental_items || []);
    setSignatureData(c.customer_signature_base64 || '');
    setContractStatus(c.status);
    
    if (c.contract_html_edited) {
      setEditorHtml(c.contract_html_edited);
      setUseCustomHtml(true);
    } else {
      setUseCustomHtml(false);
      setEditorHtml('');
    }
    setHasScanned(true);
    setTab('input');
  };

  // Action: Save changes to the lists
  const handleSaveContractToHistory = (silent = false) => {
    if (!customerName) {
      alert('กรุณากรอกชื่อลูกค้าคู่สัญญากลางก่อนทำการบันทึกประวัติ!');
      return null;
    }

    const matchedReceipt = systemReceipts.find(r => r.receipt_id === selectedReceiptId);

    const nowStr = new Date().toISOString();
    const targetId = (!activeContractId || activeContractId === 'new') 
      ? `CTR-${Date.now()}` 
      : activeContractId;

    const newSchema: RentContract = {
      contract_id: targetId,
      contract_no: contractId,
      customer_id: selectedCustomerId || undefined,
      customer_name: customerName,
      phone,
      address,
      id_card_no: idCardNo,
      deposit_amount: depositAmount,
      has_deposit: hasDeposit,
      rental_items: contractItems,
      customer_signature_base64: signatureData,
      contract_html_edited: useCustomHtml ? editorHtml : '',
      contract_date: contractDate,
      receipt_id: selectedReceiptId || undefined,
      receipt_no: matchedReceipt ? matchedReceipt.receipt_no : undefined,
      status: contractStatus,
      created_at: (!activeContractId || activeContractId === 'new') ? nowStr : (savedContracts.find(x => x.contract_id === targetId)?.created_at || nowStr),
      updated_at: nowStr
    };

    // Update in history array
    let nextList: RentContract[] = [];
    const exists = savedContracts.some(x => x.contract_id === targetId);
    if (exists) {
      nextList = savedContracts.map(x => x.contract_id === targetId ? newSchema : x);
    } else {
      nextList = [newSchema, ...savedContracts];
    }

    setSavedContracts(nextList);
    localStorage.setItem('JRK_SAVED_CONTRACTS', JSON.stringify(nextList));
    setActiveContractId(targetId);

    // Save in DB audit log if possible
    try {
      JirakitDB.addAuditLog('AUTO_SAVE_CONTRACT', 'CONTRACT', targetId, '', JSON.stringify(newSchema), `บันทึก/อัปเดตสัญญาเช่าเลขที่ ${contractId}`);
    } catch (_) {}

    if (!silent) {
      alert(`บันทึกสัญญา ${contractId} ลงในฐานประวัติคลังเรียบร้อยแล้ว!`);
    }
    return newSchema;
  };

  const handleDeleteContract = (cid: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบสัญญานี้ออกจากสารระบบประวัติ?')) return;
    const nextList = savedContracts.filter(x => x.contract_id !== cid);
    setSavedContracts(nextList);
    localStorage.setItem('JRK_SAVED_CONTRACTS', JSON.stringify(nextList));
  };

  // Standard interactive document print helper
  const handlePrintDocument = () => {
    // Auto save with 'Printed' status on print trigger
    setContractStatus('Printed');
    // Save state changes first
    const freshContract = handleSaveContractToHistory(true);
    
    const targetHtml = useCustomHtml ? editorHtml : generateDocumentHtml();

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('เบราว์เซอร์บล็อกหน้าต่างพ็อพัพ กรุณาอนุญาตเปิดลิงก์ป๊อปอัพเพื่อดูไฟล์พิมพ์ A4');
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>สัญญาเช่าอย่างเป็นทางการ - ${contractId}</title>
          <meta charset="utf-8"/>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700;800&display=swap');
            body { 
              font-family: 'Sarabun', sans-serif; 
              background: white; 
              padding: 40px; 
              color: #1e293b;
            }
            @media print {
              body { padding: 0; }
              @page { size: A4; margin: 15mm; }
            }
          </style>
        </head>
        <body>
          <div style="width: 100%; max-width: 800px; margin: 0 auto;">
            ${targetHtml}
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // A4 Document Template Generator 
  const generateDocumentHtml = () => {
    return `
      <div style="font-family: 'Sarabun', sans-serif; padding: 20px; line-height: 1.6; color: #1e293b; max-width: 100%;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="font-size: 22px; font-weight: 800; margin: 0; color: #0f172a;">จีรกิตติ์ ไม้แบบพลาสติก อุตรดิตถ์</h2>
          <p style="font-size: 13px; color: #64748b; margin: 4px 0 0 0;">โทร: 093-170-3949 • 98/12 หมู่ 3 ต.ท่าเสา อ.เมือง จ.อุตรดิตถ์ 53000</p>
          <div style="width: 150px; height: 1.5px; background-color: #cbd5e1; margin: 12px auto;"></div>
          <h3 style="font-size: 18px; font-weight: 700; margin: 0; text-decoration: underline; letter-spacing: 0.5px;">หนังสือยืนยันตรวจรับสัญญาเช่าวัสดุอุปกรณ์พลาสติก</h3>
        </div>

        <div style="display: flex; justify-content: space-between; font-size: 13px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 12px; margin-bottom: 16px;">
          <div>
            <strong>เลขที่หนังสือสัญญา (Contract ID):</strong> <span style="font-family: monospace; font-weight: bold; color: #0284c7;">${contractId}</span><br/>
            <strong>วันที่ลงบันทึก:</strong> ${contractDate}<br/>
            <strong>อ้างอิงใบปล่อยของPOS:</strong> ${selectedReceiptId ? systemReceipts.find(r => r.receipt_id === selectedReceiptId)?.receipt_no : 'ไม่มีเลขอ้างอิง'}
          </div>
          <div style="text-align: right;">
            <strong>ประเภทระบบ:</strong> สัญญาเช่าตามกำหนดระเบียบแพทเทิร์นกลาง<br/>
            <strong>ผู้ควบคุมสิทธิ:</strong> จีรกิตติ์คริปโต POS/ERP
          </div>
        </div>

        <p style="font-size: 13px; text-indent: 30px; margin: 0 0 16px 0; text-align: justify;">
          ข้อตกลงและหนังสือยินยอมตามระเบียบนี้ทำขึ้นระหว่าง **คลังผู้ให้เช่า จีรกิตติ์ ไม้แบบพลาสติก** (เรียกว่าผู้ให้เช่า) ฝ่ายหนึ่ง และ 
          ผู้ขอเช่าใช้สิทธิ **<span style="background-color: #fef08a; padding: 2px 6px; border-radius: 4px; font-weight: bold; color: #0f172a;">${customerName || '..........................................................'}</span>** 
          เลขประจําตัวประชาชน **<span style="background-color: #fef08a; padding: 2px 6px; border-radius: 4px; font-weight: bold; color: #0f172a;">${idCardNo || '...........................................'}</span>** 
          เบอร์โทรติดต่อ **<span style="font-weight: 600;">${phone || '...........................................'}</span>** 
          ที่อยู่หน้างานตึกก่อสร้างตามระเบียบเอกสาร **<span>${address || '......................................................................................................................................................'}</span>** 
          (เรียกว่าผู้เช่าสัญญา) อีกฝ่ายหนึ่ง โดยสองฝ่ายตกลงตระเตรียมระเบียบปล่อยรับวัสดุดังต่อไปนี้
        </p>

        <h4 style="font-size: 14px; font-weight: 700; margin: 16px 0 8px 0; color: #0f172a;">1. รายการไม้แบบและวัสดุก่อสร้างที่เช่าใช้งาน</h4>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 13px;">
          <thead>
            <tr style="background-color: #f8fafc; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1;">
              <th style="padding: 10px; text-align: center; border: 1px solid #e2e8f0; width: 10%;">ลำดับ</th>
              <th style="padding: 10px; text-align: left; border: 1px solid #e2e8f0; width: 65%;">รายการอุปกรณ์ (Specification)</th>
              <th style="padding: 10px; text-align: center; border: 1px solid #e2e8f0; width: 25%;">จำนวนรวม (หน่วย)</th>
            </tr>
          </thead>
          <tbody>
            ${contractItems.map((item, idx) => `
              <tr>
                <td style="padding: 10px; text-align: center; border: 1px solid #e2e8f0;">${idx + 1}</td>
                <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">${item.item_name}</td>
                <td style="padding: 10px; text-align: center; border: 1px solid #e2e8f0; font-weight: bold; color: #ef4444; font-size: 14px;">${item.qty}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h4 style="font-size: 14px; font-weight: 700; margin: 16px 0 8px 0; color: #0f172a;">2. ข้อตกลง มัดจำประกันภัย และการดูแลรักษาสิ่งของเสียหาย</h4>
        <ul style="font-size: 12.5px; margin: 0 0 24px 0; padding-left: 20px; line-height: 1.8;">
          ${hasDeposit ? `<li>ในวันทำสัญญานี้ ผู้เช่าได้จ่ายเงินสดมัดจำค้ำประกันพัสดุเป็นยอดมูลค่า <strong>${depositAmount.toLocaleString()} บาท</strong> เพื่อความค้ำชูเสี่ยงความพังทลายของไม้แบบพลาสติกและเหล็ก</li>` : '<li>ไม่มีเงินมัดจำสำหรับสัญญานี้ (ปรับเปลี่ยนเป็นระบบประเมินเครดิต term รายเดือนพิเศษ)</li>'}
          <li>ผู้เช่าตกลงและยืนยันว่าจะรักษาดูแลไม้แบบพลาสติก นั่งร้าน และสินค้ามิให้เปรอะสีน้ำมัน หรือเคาะด้วยค้อนเหล็กกล้าจนแตกร้าว</li>
          <li>กรณีมีของสูญหาย แตกบิดเปรี้ยว หรือชำรุดเสียหายเกินเยียวยา ผู้เช่าสัญญาตกลงยินยอมชดใช้มูลค่าตามตารางประเมินราคาซ่อมแซมหน้าร้านของจีรกิตติ์ อุปกรณ์</li>
          <li>หากผู้เช่าส่งของคืนล่าช้ากว่ากำหนดในบิล POS ตกลงเสียค่าเบี้ยปรับรายวันล่าช้า 1.5% ต่อวันตามสัดส่วนราคากลางที่เขียนไว้ข้างหลังต้น</li>
        </ul>

        <div style="margin-top: 40px; display: flex; justify-content: space-between; font-size: 13px;">
          <div style="width: 45%; text-align: center;">
            <p style="margin-bottom: 45px;">ลงชื่อ ............................................................ ผู้ให้เช่า<br/>( ตัวแทนเจ้าหน้าที่พนักงานคลัง )</p>
            <p style="font-size: 12px; color: #64748b;">(เจ้าหน้าที่ตรวจสอบเอกสารคลังสินค้า)</p>
          </div>
          <div style="width: 45%; text-align: center; position: relative;">
            <div style="height: 45px; margin-bottom: 5px; display: flex; align-items: center; justify-content: center;">
              ${signatureData ? `<img src="${signatureData}" alt="Customer Signature" style="max-height: 45px; object-fit: contain;" />` : `<span style="color: #94a3b8; font-style: italic; font-size: 12px;">(ยังไม่ได้ยืนยันลายเซ็น)</span>`}
            </div>
            <p>ลงชื่อ ............................................................ ผู้เช่า/ผู้กู้เงินเช่า<br/>
              <strong>( ${customerName || '..........................................................'} )</strong>
            </p>
            <p style="font-size: 12px; color: #64748b; margin-top: 4px;">ผู้ตกลงยินยงผูกพันพิกัดลายมือตามกฎหมาย</p>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 16px; margin-top: 32px; border: 1.5px dashed #cbd5e1; padding: 12px; border-radius: 12px; background-color: #f8fafc;">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${encodeURIComponent(window.location.origin + window.location.pathname + '?contract_id=' + (activeContractId || 'new'))}" style="width: 90px; height: 90px; aspect-ratio: 1/1; object-fit: contain; border: 1px solid #cbd5e1; border-radius: 8px; padding: 4px; background: white;" />
          <div style="text-align: left;">
            <h5 style="margin: 0 0 4px 0; font-size: 11.5px; font-weight: 800; color: #0f172a; font-family: 'Sarabun', sans-serif;">สแกนตรวจสอบสัญญาเช่าออนไลน์ (Digital Contract Verification)</h5>
            <p style="margin: 0; font-size: 9.5px; color: #475569; line-height: 1.4; font-weight: 500; font-family: 'Sarabun', sans-serif;">ท่านสามารถใช้แอปพลิเคชัน Line หรือโทรศัพท์สแกนตรวจสอบความสมบูรณ์ รายการพัสดุ ลายเซ็นดิจิทัล พร้อมชำระหนี้สะสมและอัปโหลดสลิปคลังผ่านอุปกรณ์พลาสติกได้ตลอด 24 ชั่วโมง</p>
          </div>
        </div>

        <div style="border-top: 1px solid #cbd5e1; margin-top: 30px; padding-top: 8px; text-align: center; font-size: 11px; color: #94a3b8;">
          พิมพ์และจัดทำขึ้นอัตโนมัติด้วยระบบ จีรกิตติ์ POS & ERP Material Center (อุตรดิตถ์) - วันเวลาร่างพิมพ์ \${new Date().toLocaleDateString('th-TH')} \${new Date().toLocaleTimeString('th-TH')}
        </div>
      </div>
    `;
  };

  // Switch tab and handle editor syncing automatically
  const handleTabSwitch = (newTab: 'history' | 'input' | 'preview' | 'edit') => {
    if (newTab === 'edit') {
      const rawHtml = useCustomHtml ? editorHtml : generateDocumentHtml();
      setEditorHtml(rawHtml);
    }
    setTab(newTab);
  };

  // MS Word styled Formatting executor for rich editor A4 page
  const executeCommand = (cmd: string, value: string = '') => {
    document.execCommand(cmd, false, value);
  };

  const handleApplyEditorChanges = () => {
    const editor = document.getElementById('contractA4EditableContainer');
    if (editor) {
      const contents = editor.innerHTML;
      setEditorHtml(contents);
      setUseCustomHtml(true);
      setTab('preview');
      alert('จัดแต่งรูปข้อความสำเร็จแนบเข้าพรีวิวแล้ว!');
    }
  };

  // Filter saved contracts based on search + status
  const getFilteredContracts = () => {
    return savedContracts.filter(c => {
      const matchSearch = 
        c.customer_name.toLowerCase().includes(historySearch.toLowerCase()) || 
        c.contract_no.toLowerCase().includes(historySearch.toLowerCase()) ||
        c.phone.includes(historySearch) ||
        (c.id_card_no && c.id_card_no.includes(historySearch));

      const matchStatus = 
        historyStatusFilter === 'all' || c.status.toLowerCase() === historyStatusFilter.toLowerCase();

      return matchSearch && matchStatus;
    });
  };

  // Stats computation
  const totalContracts = savedContracts.length;
  const signedContractsCount = savedContracts.filter(c => c.status === 'Signed' || c.status === 'Printed').length;
  const totalCachedDepositValue = savedContracts.reduce((sum, c) => sum + (c.has_deposit ? c.deposit_amount : 0), 0);

  return (
    <div className="space-y-6 text-slate-900 font-sans antialiased text-left max-w-full">
      {/* Dynamic styles to inject */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .btn-press-effect {
          transition: transform 0.1s ease, box-shadow 0.15s ease;
        }
        .btn-press-effect:active {
          transform: scale(0.97);
        }
      `}</style>

      {/* FIXED HEADER WITH LOGO, ID, STATUS */}
      <div className="bg-[#0F172A] text-white p-5 rounded-3xl flex flex-col md:flex-row justify-between items-center gap-4 shadow-xl border border-slate-800">
        <div className="flex items-center gap-4">
          <div className="bg-sky-600 p-2.5 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-sky-500/30">
            <i className="fa-solid fa-file-invoice text-white text-xl"></i>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-tight" style={{ fontFamily: 'Inter' }}>ศูนย์จัดการสัญญาเช่าพัสดุคลัง</h1>
              <span className="hidden sm:inline bg-sky-500/10 text-sky-450 border border-sky-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold">Lease Aggregator</span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">จัดการสัญญาประมูลไม้ปาร์เก้ นั่งร้าน ข้อสัญญาดึงรูป ดึงสลีปด่วน และบันทึกประวัติร่วมตามกฎหมาย</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 font-bold text-xs">
          <button 
            onClick={handleInitCreateNewContract}
            className="btn-press-effect px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition shadow-lg shadow-sky-500/20"
          >
            <i className="fa-solid fa-file-circle-plus"></i>
            <span>จัดทำสัญญาเช่าใหม่</span>
          </button>
        </div>
      </div>

      {/* BROWSER-LIKE TAB BAR (Chrome-style tabs) */}
      <div className="bg-[#1E293B] px-4 pt-4 rounded-t-3xl border-x border-t border-slate-800 flex items-end justify-between overflow-x-auto no-scrollbar">
        <div className="flex items-end gap-1.5 min-w-[500px]">
          {/* TAB 0: ประวัติทั้งหมด */}
          <button
            onClick={() => handleTabSwitch('history')}
            className={`btn-press-effect flex items-center gap-2 px-6 h-12 text-xs font-black transition-all relative z-10 ${
              tab === 'history' 
                ? 'bg-[#FFFBFE] text-[#21005D] rounded-t-xl border-t border-x border-slate-200' 
                : 'bg-slate-800 text-slate-400 border-t border-x border-slate-700/60 hover:text-slate-200 hover:bg-slate-750 rounded-t-lg'
            }`}
          >
            <i className={`fa-solid fa-folder-open text-sm ${tab === 'history' ? 'text-[#21005D]' : 'text-slate-500'}`}></i>
            <span>1. ประวัติสัญญาเช่า</span>
            <span className="bg-slate-500/20 text-slate-350 px-1.5 py-0.5 rounded text-[9.5px] font-bold">{totalContracts}</span>
          </button>

          {/* TAB 1: กรอกข้อมูล */}
          <button
            onClick={() => {
              if (!activeContractId) {
                // If no active contract selected, init a draft automatically
                handleInitCreateNewContract();
              } else {
                handleTabSwitch('input');
              }
            }}
            className={`btn-press-effect flex items-center gap-2 px-6 h-12 text-xs font-black transition-all relative z-10 ${
              tab === 'input' 
                ? 'bg-[#FFFBFE] text-blue-600 rounded-t-xl border-t border-x border-slate-200' 
                : 'bg-slate-800 text-slate-400 border-t border-x border-slate-700/60 hover:text-slate-200 hover:bg-slate-750 rounded-t-lg'
            }`}
          >
            <i className={`fa-solid fa-pen-to-square text-sm ${tab === 'input' ? 'text-blue-500' : 'text-slate-500'}`}></i>
            <span>2. ร่างข้อมูลรายละเอียด</span>
            {activeContractId && activeContractId !== 'new' && (
              <span className="text-[9.5px] text-blue-400 font-mono font-black">{contractId}</span>
            )}
          </button>

          {/* TAB 2: พรีวิว */}
          <button
            onClick={() => {
              if (!activeContractId) {
                alert('กรุณาเลือกหรือรังสรรค์สัญญาในขั้นตอนรายละเอียดก่อนจัดทำพรีวิว');
                return;
              }
              handleTabSwitch('preview');
            }}
            className={`btn-press-effect flex items-center gap-2 px-6 h-12 text-xs font-black transition-all relative z-10 ${
              tab === 'preview' 
                ? 'bg-[#FFFBFE] text-emerald-600 rounded-t-xl border-t border-x border-slate-200' 
                : 'bg-slate-800 text-slate-400 border-t border-x border-slate-700/60 hover:text-slate-200 hover:bg-slate-750 rounded-t-lg'
            }`}
          >
            <i className={`fa-solid fa-receipt text-sm ${tab === 'preview' ? 'text-emerald-500' : 'text-slate-500'}`}></i>
            <span>3. พรีวิวพิมพ์หนังสือสัญญา</span>
          </button>

          {/* TAB 3: แก้ไขรูปแบบ */}
          <button
            onClick={() => {
              if (!activeContractId) {
                alert('กรุณาเลือกสัญญาที่จะเปิดเพื่อจัดแต่งรูปแบบอิสระ');
                return;
              }
              handleTabSwitch('edit');
            }}
            className={`btn-press-effect flex items-center gap-2 px-6 h-12 text-xs font-black transition-all relative z-10 ${
              tab === 'edit' 
                ? 'bg-[#FFFBFE] text-indigo-600 rounded-t-xl border-t border-x border-slate-200' 
                : 'bg-slate-800 text-slate-450 border-t border-x border-slate-700/60 hover:text-slate-200 hover:bg-slate-750 rounded-t-lg'
            }`}
          >
            <i className={`fa-solid fa-arrows-to-dot text-sm ${tab === 'edit' ? 'text-indigo-500' : 'text-slate-500'}`}></i>
            <span>4. แก้ไขรูปแบบเอกสาร (Rich Text)</span>
          </button>
        </div>

        {/* Browser right tools (mock cosmetics) */}
        <div className="hidden lg:flex items-center gap-3 pb-2 text-slate-400 text-[11px] font-bold">
          <span className="bg-slate-800/60 px-2.5 py-1 rounded-md border border-slate-700/30 flex items-center gap-1.5 text-slate-300">
            <i className="fa-solid fa-shield text-emerald-500"></i>
            SECURE MODULE
          </span>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="bg-[#FFFBFE] border-x border-b border-[#CAC4D0] p-6 rounded-b-3xl shadow-lg">

        {/* TAB 0: HISTORIC DIRECTORY */}
        {tab === 'history' && (
          <div className="space-y-6">
            
            {/* IN-SITE KPI METRICS STATS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4.5">
              
              <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm">
                <div className="space-y-1">
                  <span className="text-[10.5px] font-black text-slate-400 uppercase tracking-widest block">สัญญาเช่ารอและปล่อยรวม</span>
                  <span className="text-3xl font-black text-slate-800 font-mono">{totalContracts}</span>
                  <p className="text-[10px] text-slate-400 font-bold">จากประวัติคลังเก็บหลักฐานสัญญา</p>
                </div>
                <div className="w-13 h-13 bg-slate-100 rounded-xl text-slate-600 flex items-center justify-center text-xl">
                  <i className="fa-solid fa-folder-tree"></i>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm">
                <div className="space-y-1">
                  <span className="text-[10.5px] font-black text-slate-400 uppercase tracking-widest block">สัญญายอมรับ ลงชื่อแล้ว</span>
                  <span className="text-3xl font-black text-emerald-600 font-mono">
                    {signedContractsCount} 
                  </span>
                  <p className="text-[10px] text-emerald-600 font-bold">
                    คิดเป็น {totalContracts > 0 ? Math.round((signedContractsCount / totalContracts) * 100) : 0}% ของสัญญาทั้งหมด
                  </p>
                </div>
                <div className="w-13 h-13 bg-emerald-50 rounded-xl text-emerald-600 flex items-center justify-center text-xl">
                  <i className="fa-solid fa-signature"></i>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm">
                <div className="space-y-1">
                  <span className="text-[10.5px] font-black text-slate-400 uppercase tracking-widest block">มูลค่าเงินมัดจำค้ำรวมถือสิทธิ</span>
                  <span className="text-3xl font-black text-sky-600 font-mono">฿{totalCachedDepositValue.toLocaleString()}</span>
                  <p className="text-[10px] text-sky-600 font-bold">คุ้มครองความเสียหายเครื่องมือหน้าร้าน</p>
                </div>
                <div className="w-13 h-13 bg-sky-50 rounded-xl text-sky-600 flex items-center justify-center text-xl">
                  <i className="fa-solid fa-sack-dollar"></i>
                </div>
              </div>

            </div>

            {/* SEACH BAR & FILTERS TOOLBAR */}
            <div className="bg-slate-50 p-4.5 rounded-2xl border border-slate-200/80 flex flex-col md:flex-row items-center justify-between gap-4">
              
              <div className="relative w-full md:max-w-md">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <i className="fa-solid fa-magnifying-glass text-xs"></i>
                </span>
                <input
                  type="text"
                  placeholder="ค้นหาตามชื่อลูกค้า, เลขที่เอกสาร, เลขที่สัญญา..."
                  className="w-full bg-white border border-slate-200 hover:border-slate-350 focus:border-[#6750A4] focus:ring-1 focus:ring-[#EADDFF] outline-none text-xs rounded-xl pl-9.5 pr-4 h-10.5 font-bold text-slate-800 transition shadow-inner"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto text-xs font-bold">
                <span className="text-slate-500 uppercase tracking-wider text-[10px] font-black shrink-0">หมวดสถานะ:</span>
                
                <div className="bg-white border border-slate-200 rounded-xl p-1 flex gap-1">
                  {[
                    { key: 'all', label: 'ทั้งหมด' },
                    { key: 'draft', label: 'ฉบับร่าง (Draft)' },
                    { key: 'signed', label: 'ลงชื่อแล้ว (Signed)' },
                    { key: 'printed', label: 'พิมพ์แล้ว (Printed)' }
                  ].map(sOption => (
                    <button
                      key={sOption.key}
                      onClick={() => setHistoryStatusFilter(sOption.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                        historyStatusFilter === sOption.key 
                          ? 'bg-[#21005D] text-white shadow-xs' 
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      {sOption.label}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* TABLE DIRECTORY OF SAVED CONTRACTS */}
            <div className="bg-white border border-slate-250/70 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700 min-w-[900px]">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr className="h-11 font-black uppercase text-slate-400 text-[10px] tracking-wider">
                      <th className="p-3.5 text-center w-36">เลขที่หนังสือสัญญา</th>
                      <th className="p-3.5 w-48">ลูกค้าคู่สัญญา</th>
                      <th className="p-3.5 w-60">รายการวัสดุเช่าคุ้มครอง</th>
                      <th className="p-3.5 text-center w-28">มัดจำรวม</th>
                      <th className="p-3.5 text-center w-36">วันที่ทำสัญญา</th>
                      <th className="p-3.5 text-center w-32">สถานะสัญญา</th>
                      <th className="p-3.5 text-center w-40">ประมวลผลด่วน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150">
                    {getFilteredContracts().length > 0 ? (
                      getFilteredContracts().map((rc) => (
                        <tr key={rc.contract_id} className="hover:bg-slate-50/50 transition duration-150 h-14">
                          <td className="p-3.5 text-center font-mono font-black text-blue-600">
                            {rc.contract_no}
                          </td>
                          <td className="p-3.5">
                            <div className="space-y-0.5 text-slate-800">
                              <p className="font-extrabold">{rc.customer_name}</p>
                              <p className="text-[10px] text-slate-400 font-medium">โทร: {rc.phone || '-'}</p>
                            </div>
                          </td>
                          <td className="p-3.5">
                            <div className="flex flex-wrap gap-1">
                              {(rc.rental_items || []).slice(0, 3).map((rit, idx) => (
                                <span key={idx} className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded text-[10px] font-bold">
                                  {rit.item_name} ({rit.qty})
                                </span>
                              ))}
                              {(rc.rental_items || []).length > 3 && (
                                <span className="bg-slate-100/80 text-slate-400 border border-slate-200/40 px-2 py-0.5 rounded text-[10px]">
                                  +{rc.rental_items.length - 3} รายการ...
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3.5 text-center font-mono font-black text-slate-800">
                            {rc.has_deposit ? `฿${rc.deposit_amount.toLocaleString()}` : <span className="text-slate-400 font-bold">-</span>}
                          </td>
                          <td className="p-3.5 text-center text-slate-500 font-medium">
                            {rc.contract_date}
                          </td>
                          <td className="p-3.5 text-center">
                            {rc.status === 'Draft' && (
                              <span className="bg-amber-550/10 text-amber-600 border border-amber-550/25 px-2.5 py-1 rounded-full text-[10.5px] font-black inline-flex items-center gap-1">
                                <i className="fa-solid fa-file-signature animate-pulse"></i> รอลายมือชื่อ
                              </span>
                            )}
                            {rc.status === 'Signed' && (
                              <span className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2.5 py-1 rounded-full text-[10.5px] font-black inline-flex items-center gap-1">
                                <i className="fa-solid fa-circle-check"></i> ลงชื่อแล้ว
                              </span>
                            )}
                            {rc.status === 'Printed' && (
                              <span className="bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 px-2.5 py-1 rounded-full text-[10.5px] font-black inline-flex items-center gap-1">
                                <i className="fa-solid fa-print"></i> พิมพ์แล้ว / แนบไฟล์
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-2">
                              
                              <button
                                onClick={() => handleEditSelectedContract(rc)}
                                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-[#EADDFF] text-slate-600 hover:text-[#21005D] flex items-center justify-center transition"
                                title="เปิดพรีวิวและแก้ไขรายละเอียด"
                              >
                                <i className="fa-solid fa-folder-open text-xs"></i>
                              </button>

                              <button
                                onClick={() => {
                                  // Quick print direct
                                  setActiveContractId(rc.contract_id);
                                  setContractId(rc.contract_no);
                                  setContractDate(rc.contract_date);
                                  setCustomerName(rc.customer_name);
                                  setIdCardNo(rc.id_card_no);
                                  setPhone(rc.phone);
                                  setAddress(rc.address);
                                  setHasDeposit(rc.has_deposit);
                                  setDepositAmount(rc.deposit_amount);
                                  setContractItems(rc.rental_items || []);
                                  setSignatureData(rc.customer_signature_base64 || '');
                                  setContractStatus(rc.status);
                                  if (rc.contract_html_edited) {
                                    setEditorHtml(rc.contract_html_edited);
                                    setUseCustomHtml(true);
                                  } else {
                                    setUseCustomHtml(false);
                                  }
                                  
                                  setTimeout(handlePrintDocument, 100);
                                }}
                                className="w-8 h-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center transition"
                                title="สั่งพิมพ์เอกสารพรีวิวตรงด่วน"
                              >
                                <i className="fa-solid fa-print text-xs"></i>
                              </button>

                              <button
                                onClick={() => {
                                  setShareContract(rc);
                                  setCopySuccess(false);
                                }}
                                className="w-8 h-8 rounded-lg bg-violet-50 hover:bg-[#EADDFF] text-violet-600 flex items-center justify-center transition"
                                title="แชร์ QR Code และลิงก์ตรวจสัญญาเช่า"
                              >
                                <i className="fa-solid fa-qrcode text-xs"></i>
                              </button>

                              <button
                                onClick={() => handleDeleteContract(rc.contract_id)}
                                className="w-8 h-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition"
                                title="ลบสัญญาออกจากระบบประวัติคลัง"
                              >
                                <i className="fa-solid fa-trash-can text-xs"></i>
                              </button>

                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="text-center py-10 font-bold italic text-slate-400">
                          ไม่พบบันทึกสัญญาเช่าที่เข้าหลักเกณฑ์การกรองของคุณ คาดว่าระบบยังไม่มีการสร้าง
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end">
              <button 
                onClick={handleInitCreateNewContract}
                className="btn-press-effect px-5 py-3.5 bg-[#21005D] hover:bg-[#381E72] text-white font-extrabold text-xs rounded-2xl flex items-center gap-1.5 shadow-xl transition-transform"
              >
                <i className="fa-solid fa-file-circle-plus"></i>
                <span>กรอกและบันทึกภาพสัญญาฉบับใหม่ (Create New Draft)</span>
              </button>
            </div>

          </div>
        )}
        
        {/* TAB 1: INPUT FORM */}
        {tab === 'input' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            
            {/* LEFT AREA: Customer Profile, OCR and db integration selectors */}
            <div className="space-y-6">
              
              {/* BRAND NEW CARD: SYSTEM INTEGRATION PANEL (ดึงข้อมูลจากระบบ) */}
              <div className="bg-slate-50 p-5 rounded-2xl border-2 border-dashed border-sky-400/40 shadow-xs space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <h3 className="text-xs font-black uppercase text-slate-600 tracking-wider flex items-center gap-2">
                    <i className="fa-solid fa-database text-sky-600"></i>
                    เชื่อมโยงฐานข้อมูลส่วนกลาง (ERP Linkage)
                  </h3>
                  <span className="bg-sky-100 text-sky-850 px-2 py-0.5 rounded text-[9.5px] font-black uppercase">
                    Sync Live
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Option 1: Load customer automatically */}
                  <div>
                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wide mb-1.5">ดึงข้อมูลลูกค้าในระบบ</label>
                    <select
                      className="w-full h-10.5 px-3 bg-white border border-slate-200 focus:border-sky-500 rounded-xl text-xs font-bold text-slate-700 outline-none transition"
                      value={selectedCustomerId}
                      onChange={handleSystemCustomerSelect}
                    >
                      <option value="">— เลือกลูกค้าทะเบียนประจำ —</option>
                      {systemCustomers.map(sc => (
                        <option key={sc.customer_id} value={sc.customer_id}>
                          {sc.customer_name} ({sc.customer_type})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Option 2: Load Active Bill/Receipt details */}
                  <div>
                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wide mb-1.5">ดึงอุปกรณ์และเงินมัดจำจากบิลเช่า</label>
                    <select
                      className="w-full h-10.5 px-3 bg-white border border-slate-200 focus:border-sky-500 rounded-xl text-xs font-bold text-slate-750 outline-none transition"
                      value={selectedReceiptId}
                      onChange={handleSystemReceiptSelect}
                    >
                      <option value="">— เลือกบิลปล่อยของเช่าในระบบ —</option>
                      {systemReceipts.map(sr => (
                        <option key={sr.receipt_id} value={sr.receipt_id}>
                          {sr.receipt_no} - {sr.customer_name} (มัดจำ ฿{sr.deposit})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <p className="text-[9.5px] text-slate-400 font-medium">
                  💡 แนะนำ: ดึงข้อมูลบิลเช่าหรือเลือกรายชื่อลูกค้าจากฐานข้อมูล เพื่อป้อนเข้าช่องกรอก ร่างเงื่อนไข และสรุปสิ่งของที่จะเช่าในสัญญาได้ในคลิกเดียว!
                </p>
              </div>

              {/* CARD 1: OCR Scan Simulation & Previews */}
              <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                    <i className="fa-solid fa-id-card text-blue-500"></i>
                    อัปโหลด / ถ่ายบัตรประชาชนผู้กู้ (OCR SCANNING)
                  </h3>
                  {hasScanned && (
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1">
                      <i className="fa-solid fa-circle-check"></i> ข้อมูลโหลดเข้าสัญญาสำเร็จ
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="md:col-span-3 border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer min-h-[140px] transition bg-slate-50/50 hover:bg-blue-50/10 animate-none" onClick={handleSimulateOCR}>
                    {isScanning ? (
                      <div className="space-y-3">
                        <i className="fa-solid fa-spinner fa-spin text-2xl text-blue-500"></i>
                        <p className="text-[11px] text-blue-600 font-extrabold animate-pulse">กำลังสแกนและดึงรูปและอักษรจากชิปบัตรประชาชน...</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mx-auto text-blue-650">
                          <i className="fa-solid fa-camera text-md"></i>
                        </div>
                        <p className="text-[11px] text-slate-750 font-black">ถ่ายภาพ/ดึงรูปหน้าบัตรประชาชน</p>
                        <p className="text-[9.5px] text-slate-400">อ่านเท็กซ์ชื่อ เบอร์โทร และที่อยู่ลงช่องกรอกอัตโนมัติ</p>
                      </div>
                    )}
                  </div>

                  {/* ID Card Graphic mockup preview */}
                  <div className="md:col-span-2 bg-gradient-to-br from-slate-700 to-slate-900 rounded-xl p-3.5 text-white flex flex-col justify-between min-h-[140px] relative overflow-hidden shadow-md">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-xl pointer-events-none"></div>
                    <div className="flex justify-between items-start">
                      <div className="text-[8.5px] font-bold uppercase tracking-widest text-[#CAC4D0]">ID CARD ATTACHMENT</div>
                      <i className="fa-solid fa-microchip text-[#cbd5e1] text-sm"></i>
                    </div>

                    <div className="space-y-1">
                      {hasScanned ? (
                        <>
                          <div className="text-[11px] font-black tracking-wide truncate">{customerName}</div>
                          <div className="text-[9px] font-mono tracking-widest text-slate-200 font-bold">{idCardNo || 'ไม่มีรหัสเลขประจำตัว'}</div>
                          <div className="text-[8px] text-slate-300 font-medium leading-tight truncate">{address}</div>
                        </>
                      ) : (
                        <div className="text-center py-4 text-slate-300 text-[10px] font-bold italic opacity-75">
                          ยังไม่มีการประกบบัตร
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="text-[7.5px] text-slate-400 font-semibold">THAILAND NATIONAL ID</div>
                      {hasScanned && (
                        <button onClick={(e) => { e.stopPropagation(); handleResetOCR(); }} className="text-[9px] text-red-300 underline font-black hover:text-white leading-none">ล้างค่า</button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD 2: Customer Profile Form */}
              <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm space-y-4">
                <div className="pb-2 border-b border-slate-100">
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                    <i className="fa-solid fa-user-gear text-[#21005D]"></i>
                    ข้อมูลและชื่อผู้ขอเช่าตามหนังสือ
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wide mb-1">
                      ชื่อ-นามสกุลจริง คู่เช่าทรัพย์สิน
                    </label>
                    <input
                      type="text"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-805 focus:ring-1 focus:ring-sky-200 focus:border-sky-500 outline-none transition"
                      placeholder="ป้อนชื่อและคำนำหน้านามผู้ขอกู้เช่า..."
                      value={customerName}
                      onChange={(e) => {
                        setCustomerName(e.target.value);
                        setHasScanned(true);
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wide mb-1">เลขประจำตัวประชาชน (13 หลัก)</label>
                    <input
                      type="text"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-1 focus:ring-sky-200 focus:border-sky-500 outline-none transition"
                      placeholder="x-xxxx-xxxxx-xx-x"
                      value={idCardNo}
                      onChange={(e) => setIdCardNo(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wide mb-1">เบอร์โทรศัพท์ติดต่อหน้าร้างงาน</label>
                    <input
                      type="text"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-sky-200 focus:border-sky-500 outline-none transition"
                      placeholder="0xx-xxx-xxxx"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wide mb-1">ที่อยู่ส่งมอบไม้แบบ / หน้างานพิกัดตรวจสารบน</label>
                    <textarea
                      rows={2.5}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-1 focus:ring-sky-200 focus:border-sky-500 outline-none transition resize-none"
                      placeholder="ป้อนที่อยู่จดทะเบียนผู้เช่าสินค้า..."
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT AREA: Rental Items, Deposit & Signature Pad */}
            <div className="space-y-6">
              
              {/* CARD 3: Rental Basket & Deposit Conditions */}
              <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                    <i className="fa-solid fa-cubes text-blue-500"></i>
                    รายการตารางไม้แบบเช่า (Dynamic Item Checklist)
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="bg-sky-50 hover:bg-sky-100 text-sky-700 font-black text-[10px] py-1 px-2.5 rounded-lg border border-sky-200 transition flex items-center gap-1 shrink-0"
                  >
                    <i className="fa-solid fa-plus"></i> เพิ่มแถวอุปกรณ์
                  </button>
                </div>

                {/* Simulated Rental Items list table */}
                <div className="overflow-hidden border border-slate-200 rounded-xl">
                  <table className="w-full text-xs text-slate-700 font-bold table-fixed">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 h-9 text-slate-400 text-[9.5px]">
                        <th className="p-2 text-center w-10">เสด</th>
                        <th className="p-2 text-left w-7/12">รายการพัสดุอุปกรณ์ระบุประปราย</th>
                        <th className="p-2 text-center w-3/12">จำนวน</th>
                        <th className="p-2 text-center w-2/12">ระบาย</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {contractItems.map((item, idx) => (
                        <tr key={idx} className="h-11">
                          <td className="p-2 text-center font-mono text-slate-400">{idx + 1}</td>
                          <td className="p-2">
                            <input
                              type="text"
                              className="w-full bg-slate-50/50 focus:bg-white border border-slate-200 px-2 py-1 rounded font-bold text-xs outline-none focus:border-blue-500"
                              value={item.item_name}
                              onChange={(e) => handleChangeItemName(idx, e.target.value)}
                            />
                          </td>
                          <td className="p-2 text-center">
                            <input
                              type="number"
                              className="w-16 bg-slate-50/50 focus:bg-white border border-slate-200 rounded py-1 text-center font-black focus:border-blue-500 text-slate-800 outline-none"
                              value={item.qty}
                              onChange={(e) => handleChangeItemQty(idx, parseInt(e.target.value) || 1)}
                            />
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItemRow(idx)}
                              className="text-red-500 hover:text-red-700 w-6 h-6 rounded-lg hover:bg-red-50 transition"
                              title="ลบแถวสินค้า"
                            >
                              <i className="fa-solid fa-xmark"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Toggle switch for deposit */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-205/60 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black text-[#0F172A] block">เรียกเก็บเงินสดมัดจำค้ำมูลค่า</span>
                    <span className="text-[10px] text-slate-400 font-medium">เปิดสิทธิเพื่อบันทึกประวัติเงินประกันและคืนเงินวันยกเลนเช่า</span>
                  </div>
                  
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={hasDeposit}
                      onChange={() => setHasDeposit(!hasDeposit)}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                {/* Animated expand slider deposit area */}
                {hasDeposit && (
                  <div className="p-4 bg-emerald-50/20 border border-emerald-100 rounded-xl space-y-1">
                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wide">มูลค่าเงินมัดจำ (บาท)</label>
                    <input
                      type="number"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-emerald-700 text-left focus:ring-1 focus:ring-emerald-200 focus:border-emerald-550 outline-none transition"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(Math.max(0, parseInt(e.target.value) || 0))}
                    />
                  </div>
                )}
              </div>

              {/* CARD 4: HTML5 Touch/Drawing Canvas Signature */}
              <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                    <i className="fa-solid fa-signature text-blue-500"></i>
                    สกัดพิกัดลายเซ็นยืนยันรับประกัน
                  </h3>
                  {signatureData && (
                    <span className="bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded text-[9.5px] font-black flex items-center gap-1">
                      <i className="fa-solid fa-check"></i> บันทึกลายเซ็นต์ภาพแล้ว
                    </span>
                  )}
                </div>

                <div className="border border-slate-200 bg-slate-50 rounded-xl overflow-hidden p-1 relative">
                  <canvas
                    ref={canvasRef}
                    width={500}
                    height={130}
                    onMouseDown={startDraw}
                    onMouseMove={drawMove}
                    onMouseUp={stopDraw}
                    onMouseLeave={stopDraw}
                    onTouchStart={startDraw}
                    onTouchMove={drawMove}
                    onTouchEnd={stopDraw}
                    className="w-full h-[130px] bg-white rounded-lg border border-slate-100 cursor-crosshair shadow-inner"
                    style={{ touchAction: 'none' }}
                  />
                  {!signatureData && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-[11.5px] text-slate-450 italic font-bold">
                      ✍️ ใช้นิ้วมือหรือเมาส์ลากเส้นในกรอบนี้เพื่อเซ็นลายมือชื่อ
                    </div>
                  )}
                </div>

                <div className="flex gap-2.5 justify-end">
                  <button
                    type="button"
                    onClick={clearCanvas}
                    className="btn-press-effect px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-705 font-bold text-xs rounded-xl flex items-center gap-1 transition"
                  >
                    <i className="fa-solid fa-eraser"></i>
                    <span>ลบกล่องวาด</span>
                  </button>
                  <button
                    type="button"
                    onClick={confirmSignature}
                    className="btn-press-effect px-4 py-2 bg-[#21005D] text-white font-extrabold text-xs rounded-xl flex items-center gap-1 transition shadow-lg shadow-[#21005D]/10"
                  >
                    <i className="fa-solid fa-circle-check"></i>
                    <span>รับรองบันทึกลายเซ็น</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PREVIEW DOCUMENT (Page 2) */}
        {tab === 'preview' && (
          <div className="bg-slate-200 py-6 px-4 rounded-2xl min-h-[500px] flex justify-center overflow-x-auto no-scrollbar">
            {/* Realistically detailed A4 page simulation style */}
            <div 
              style={{ fontFamily: "'Sarabun', sans-serif" }}
              className="w-[210mm] min-h-[297mm] bg-white text-slate-800 p-[20mm] shadow-2xl rounded-sm border border-slate-300 mx-auto text-left relative shrink-0 overflow-hidden"
            >
              {useCustomHtml ? (
                // If modified in Tab 3 rich-text mode, display modified static preview version 
                <div dangerouslySetInnerHTML={{ __html: editorHtml }} />
              ) : (
                // Standard binding mode html preview block
                <div dangerouslySetInnerHTML={{ __html: generateDocumentHtml() }} />
              )}
            </div>
          </div>
        )}

        {/* TAB 3: RICH TEXT DOCUMENT EDITOR (Page 3) */}
        {tab === 'edit' && (
          <div className="space-y-4 font-bold text-xs">
            {/* MS Word styling toolbar block */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-2 select-none">
              
              {/* Select Font */}
              <div className="flex items-center gap-1.5 px-2 py-1 border-r border-slate-200">
                <i className="fa-solid fa-font text-slate-400 text-xs"></i>
                <select 
                  onChange={(e) => executeCommand('fontName', e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-[11px] font-bold text-slate-700 outline-none"
                >
                  <option value="Sarabun">Sarabun (ไทยทางการ)</option>
                  <option value="Inter">Inter (Sans-serif)</option>
                  <option value="Courier New">Courier New (Mono)</option>
                </select>
              </div>

              {/* Font Size dropdown */}
              <div className="flex items-center gap-1.5 px-2 py-1 border-r border-slate-200">
                <i className="fa-solid fa-text-height text-slate-400 text-xs"></i>
                <select 
                  onChange={(e) => executeCommand('fontSize', e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-[11px] font-bold text-slate-700 outline-none"
                >
                  <option value="3">มาตรฐาน (3)</option>
                  <option value="1">จิ๋ว (1)</option>
                  <option value="2">เล็ก (2)</option>
                  <option value="4">ใหญ่นิด (4)</option>
                  <option value="5">หัวข้อบท (5)</option>
                  <option value="6">หัวเรื่องเด่น (6)</option>
                </select>
              </div>

              {/* Bold, Italic, Underline buttons */}
              <div className="flex items-center gap-1 px-2 border-r border-slate-200">
                <button
                  type="button"
                  onClick={() => executeCommand('bold')}
                  className="w-7 h-7 hover:bg-slate-150 rounded text-slate-700 font-extrabold text-xs transition"
                  title="ตัวหนา"
                >
                  <i className="fa-solid fa-bold"></i>
                </button>
                <button
                  type="button"
                  onClick={() => executeCommand('italic')}
                  className="w-7 h-7 hover:bg-slate-150 rounded text-slate-700 font-extrabold text-xs transition"
                  title="ตัวเอียง"
                >
                  <i className="fa-solid fa-italic"></i>
                </button>
                <button
                  type="button"
                  onClick={() => executeCommand('underline')}
                  className="w-7 h-7 hover:bg-slate-150 rounded text-slate-700 font-bold text-xs transition"
                  title="ขีดเส้นใต้"
                >
                  <i className="fa-solid fa-underline"></i>
                </button>
              </div>

              {/* Horizontal Aligner Buttons */}
              <div className="flex items-center gap-1 px-2 border-r border-slate-200">
                <button
                  type="button"
                  onClick={() => executeCommand('justifyLeft')}
                  className="w-7 h-7 hover:bg-slate-150 rounded text-slate-700 text-xs transition"
                  title="ชิดซ้าย"
                >
                  <i className="fa-solid fa-align-left"></i>
                </button>
                <button
                  type="button"
                  onClick={() => executeCommand('justifyCenter')}
                  className="w-7 h-7 hover:bg-slate-150 rounded text-slate-700 text-xs transition"
                  title="จัดกึ่งกลาง"
                >
                  <i className="fa-solid fa-align-center"></i>
                </button>
                <button
                  type="button"
                  onClick={() => executeCommand('justifyRight')}
                  className="w-7 h-7 hover:bg-slate-150 rounded text-slate-700 text-xs transition"
                  title="ชิดขวา"
                >
                  <i className="fa-solid fa-align-right"></i>
                </button>
              </div>

              {/* Quick actions line separator */}
              <div className="flex items-center gap-1 px-2">
                <button
                  type="button"
                  onClick={() => executeCommand('insertHorizontalRule')}
                  className="px-2 py-1 hover:bg-slate-100 border border-slate-200 rounded text-slate-700 text-[10px] font-black transition uppercase"
                  title="แทรกขีดเส้นคั่น"
                >
                  — เส้นคั่น
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('ต้องการยกเลิกและรีเซ็ตหัวบิลกลับมาตามเทมเพลตมาตรฐานดั้งเดิมใช่ไหม?')) {
                      setUseCustomHtml(false);
                      const rawHtml = generateDocumentHtml();
                      setEditorHtml(rawHtml);
                      const editor = document.getElementById('contractA4EditableContainer');
                      if (editor) editor.innerHTML = rawHtml;
                    }
                  }}
                  className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded text-[10px] font-bold transition"
                  title="รีเซ็ตแบบร่างเดิม"
                >
                  รีเซ็ตตามบิล
                </button>
              </div>

              <div className="ml-auto text-[9.5px] font-black text-slate-400 uppercase tracking-widest bg-slate-100/60 px-2.5 py-1 rounded">
                RICH EDITOR A4 WORKSPACE
              </div>
            </div>

            {/* A4 Editor Frame representing contenteditable document container workspace */}
            <div className="bg-slate-200 py-6 px-4 rounded-2xl min-h-[500px] flex justify-center overflow-x-auto no-scrollbar">
              <div 
                id="contractA4EditableContainer"
                contentEditable={true}
                suppressContentEditableWarning={true}
                style={{ fontFamily: "'Sarabun', sans-serif" }}
                className="w-[210mm] min-h-[297mm] bg-white text-slate-800 p-[20mm] shadow-2xl rounded-sm border border-slate-300 mx-auto text-left shrink-0 focus:outline-none focus:ring-4 focus:ring-sky-150 transition-all cursor-text text-justify"
                dangerouslySetInnerHTML={{ __html: editorHtml }}
              />
            </div>
          </div>
        )}

      </div>

      {/* STICKY BOTTOM ACTION BAR */}
      {tab !== 'history' && (
        <div className="sticky bottom-0 bg-white border border-slate-250/90 px-6 py-4.5 rounded-3xl shadow-xl flex flex-wrap justify-between items-center gap-4 z-40">
          
          {/* Left indicators auto-save */}
          <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
            <button
              onClick={() => handleTabSwitch('history')}
              className="btn-press-effect px-4.5 py-2 bg-slate-150 hover:bg-slate-200 text-slate-800 rounded-xl flex items-center gap-1 transition"
            >
              <i className="fa-solid fa-chevron-left text-xs"></i>
              <span>กลับหน้าประวัติสัญญา</span>
            </button>
            <div className="hidden sm:flex items-center gap-1.5 text-emerald-600">
              <i className="fa-solid fa-cloud-arrow-up text-xs"></i>
              <span className="text-[10px] text-slate-400 font-extrabold uppercase">ข้อมูลทำงานในเครื่องส่วนบุคคล</span>
            </div>
          </div>

          {/* Right buttons relative to active tab navigation */}
          <div className="flex items-center gap-3">
            
            {tab === 'input' && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveContractToHistory(false)}
                  className="btn-press-effect px-4.5 py-3 border border-slate-350 hover:bg-slate-100 text-slate-700 rounded-2xl text-[12px] font-extrabold flex items-center gap-1.5 transition"
                >
                  <i className="fa-solid fa-floppy-disk"></i>
                  <span>บันทึกประวัติ</span>
                </button>

                <button
                  onClick={() => {
                    const fresh = handleSaveContractToHistory(true);
                    if (fresh) {
                      handleTabSwitch('preview');
                    }
                  }}
                  className="btn-press-effect px-5.5 py-3.5 bg-[#21005D] text-white rounded-2xl text-[12px] font-black tracking-wider transition-all shadow-lg shadow-[#21005D]/10 flex items-center gap-1.5"
                >
                  <span>ถัดไป: พรีวิวและสั่งพิมพ์</span>
                  <i className="fa-solid fa-circle-arrow-right"></i>
                </button>
              </div>
            )}

            {tab === 'preview' && (
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => handleTabSwitch('input')}
                  className="btn-press-effect px-4.5 py-3.5 bg-slate-100 hover:bg-slate-205 text-slate-700 rounded-2xl text-[12px] font-black transition"
                >
                  ย้อนกลับแก้ไขข้อมูล
                </button>
                
                <button
                  onClick={handlePrintDocument}
                  className="btn-press-effect px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[12px] font-black tracking-wider transition-all shadow-lg shadow-emerald-500/10 flex items-center gap-1.5 uppercase"
                >
                  <i className="fa-solid fa-print"></i>
                  <span>บันทึก และ จัดพิมพ์หนังสือสัญญาเช่า</span>
                </button>
              </div>
            )}

            {tab === 'edit' && (
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => handleTabSwitch('preview')}
                  className="btn-press-effect px-4.5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-[12px] font-black transition"
                >
                  กลับหน้าพรีวิวเดิม
                </button>
                
                <button
                  onClick={handleApplyEditorChanges}
                  className="btn-press-effect px-5 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-[12px] font-black tracking-wider transition-all shadow-lg shadow-indigo-500/10 flex items-center gap-1.5"
                >
                  <i className="fa-solid fa-circle-check"></i>
                  <span>นำไปใช้กับหน้าพรีวิวพิมพ์ภาพ</span>
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* INTERACTIVE QR CODE SHARING MODAL OVERLAY */}
      {shareContract && (
        <div className="fixed inset-0 bg-[#1D1B20]/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-none">
          <div className="w-full max-w-md bg-[#FFFBFE] rounded-3xl border border-[#CAC4D0] shadow-2xl p-6 relative flex flex-col text-slate-900">
            <button 
              onClick={() => setShareContract(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition cursor-pointer"
            >
              <i className="fa-solid fa-xmark text-sm"></i>
            </button>

            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#EADDFF] text-[#21005D] flex items-center justify-center mx-auto text-xl">
                <i className="fa-solid fa-qrcode"></i>
              </div>

              <div>
                <h3 className="text-sm font-black text-[#21005D] tracking-tight">แชร์ QR Code ตรวจสอบสัญญา</h3>
                <p className="text-[10px] text-slate-500 font-bold mt-1 leading-normal">สแกนตรวจสอบรายการพัสดุไม้แบบเช่า ลายมือชื่อ และดาวน์โหลด PDF สัญญายื่นกู้ได้ทันที</p>
              </div>

              {/* QR Image Frame */}
              <div className="border border-[#CAC4D0] p-3 bg-white rounded-2xl w-[170px] h-[170px] mx-auto flex items-center justify-center shadow-inner">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(window.location.origin + window.location.pathname + '?contract_id=' + shareContract.contract_id)}`} 
                  alt="Contract QR ID" 
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="bg-[#F3EDF7] p-3 rounded-xl border border-[#CAC4D0]/60 text-xs text-left text-slate-700 font-mono space-y-1">
                <p className="flex justify-between font-bold text-[11px]">
                  <span className="text-slate-500">สัญญาคลังเลขที่:</span>
                  <span className="text-[#21005D] font-black">{shareContract.contract_no}</span>
                </p>
                <p className="flex justify-between font-bold text-[11px]">
                  <span className="text-slate-500">ผู้กู้ดูแลคู่สัญญา:</span>
                  <span className="text-slate-900 font-black">{shareContract.customer_name}</span>
                </p>
              </div>

              {/* Action Buttons to copy links */}
              <div className="space-y-2 pt-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    const contractUrl = `${window.location.origin}${window.location.pathname}?contract_id=${shareContract.contract_id}`;
                    navigator.clipboard.writeText(contractUrl);
                    setCopySuccess(true);
                    setTimeout(() => setCopySuccess(false), 2000);
                  }}
                  className={`w-full py-2.5 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    copySuccess 
                      ? 'bg-emerald-600 text-white shadow-xs' 
                      : 'bg-[#21005D] hover:bg-[#381E72] text-white'
                  }`}
                >
                  {copySuccess ? (
                    <>
                      <i className="fa-solid fa-circle-check"></i>
                      <span>คัดลอกลิงก์สำเร็จแล้ว!</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-link"></i>
                      <span>คัดลอกลิงก์ส่งโทรหาลูกค้า (Copy Link)</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShareContract(null);
                    const contractUrl = `${window.location.origin}${window.location.pathname}?contract_id=${shareContract.contract_id}`;
                    window.open(contractUrl, '_blank');
                  }}
                  className="w-full py-2.5 border border-[#CAC4D0] bg-[#FFFBFE] hover:bg-[#F3EDF7] text-[#1D1B20] rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <i className="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
                  <span>ดูในหน้าจอของลูกค้ารับแบบเช่า (Customer Portal)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
