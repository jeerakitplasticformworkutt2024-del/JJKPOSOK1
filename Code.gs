/**
 * Google Apps Script - Code.gs
 * Backend controller for the A4 Receipt/Invoice fitting engine.
 * Serves the web-app and provides dynamic receipt/shop settings data.
 * 
 * "จีรกิตติ์ ไม้แบบพลาสติก อุตรดิตถ์"
 */

function doGet(e) {
  var template = HtmlService.createTemplateFromFile('Index');
  
  // Accept incoming URL query parameters for dynamic rendering
  var receiptId = e && e.parameter && e.parameter.id ? e.parameter.id : 'PREVIEW-SAMPLE';
  var copy = e && e.parameter && e.parameter.copy ? e.parameter.copy : 'original';
  var format = e && e.parameter && e.parameter.format ? e.parameter.format : 'A4';
  
  // Inject properties into the HTML template context
  template.receiptId = receiptId;
  template.copyType = copy;
  template.paperSize = format;
  
  return template.evaluate()
    .setTitle('บิลเงินสด - จีรกิตติ์ ไม้แบบพลาสติก อุตรดิตถ์')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Accessor for layout settings and cart payload to render inside Index.html.
 * Includes a robust, native fallback so it is fully functional out-of-the-box.
 * 
 * @param {string} receiptId The receipt ID to fetch.
 * @return {Object} Object containing receipt data and shop configs.
 */
function getReceiptDetails(receiptId) {
  var shopSettings = {
    LINE_ID: 'Tong_01.',
    LINE_QR_URL: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=line://ti/p/@jirakit',
    BANK_QR_URL: '' // Empty falls back to automatic PromptPay API based on total
  };

  // High-fidelity Thai mock dataset for instant, correct rendering and layout testing
  var activeReceipt = {
    doc_type: 'receipt', // 'receipt' or 'delivery'
    receipt_no: receiptId || 'JK-' + new Date().getFullYear() + '0526-01',
    created_at: new Date().toISOString(),
    customer_name: 'คุณเจษฎา มั่นใจ (สมมติ)',
    phone: '081-234-5678',
    address: '123/4 หมู่ 5 ต.ท่าเสา อ.เมือง จ.อุตรดิตถ์ 53000',
    delivery_location: 'หน้าไซต์งานก่อสร้าง - โครงการสะพานวงแหวนอุตรดิตถ์ เลี่ยงเมือง',
    items: [
      { receipt_name: 'ไม้แบบพลาสติก ขนาด 30x150 cm (เช่า)', qty: 40, unit: 'แผ่น', price: 20.00, rent_days: 30, line_total: 24000.00, line_mode: 'rent' },
      { receipt_name: 'มุมนอกพลาสติก ขนาด 150 cm (เช่า)', qty: 8, unit: 'คู่', price: 10.00, rent_days: 30, line_total: 2400.00, line_mode: 'rent' },
      { receipt_name: 'นั่งร้านเหล็ก สูง 1.70 m (เช่า)', qty: 10, unit: 'ชุด', price: 15.00, rent_days: 15, line_total: 2250.00, line_mode: 'rent' },
      { receipt_name: 'ลิ่มเหล็กยึดไม้แบบพลาสติก (ขายขาด)', qty: 100, unit: 'ตัว', price: 5.00, line_total: 500.00, line_mode: 'sale' },
      { receipt_name: 'ประกับไม้รองเหล็กกล่องพลาสติก (เช่า)', qty: 25, unit: 'อัน', price: 3.50, rent_days: 30, line_total: 2625.00, line_mode: 'rent' }
    ],
    grand_total: 31775.00
  };

  try {
    // Developers can wire this up to get details dynamically from Google Sheets:
    // var ss = SpreadsheetApp.getActiveSpreadsheet();
    // var orderSheet = ss.getSheetByName("Orders");
    // ... loading database query logic ...
  } catch (error) {
    // Graceful safety logger
    Logger.log('Spreadsheet bindings inactive; using layout mock dataset: ' + error.message);
  }

  return {
    order: activeReceipt,
    shopSettings: shopSettings
  };
}
