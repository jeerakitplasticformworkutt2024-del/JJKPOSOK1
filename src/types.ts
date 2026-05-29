/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SystemSettings {
  SHOP_NAME: string;
  SHOP_ADDRESS: string;
  SHOP_TELEPHONE: string;
  TAX_ID: string;
  LINE_QR_URL: string;
  BANK_QR_URL: string;
  VAT_RATE: number;
  VAT_MODE: 'NONE' | 'INCLUDE' | 'EXCLUDE';
  PENALTY_RATE: number; // Daily penalty rate percentage (e.g. 1.5% of item rental cost per day late)
  RECEIPT_PAPER_SIZE: 'A4' | 'A5';
  RECEIPT_FOOTNOTE: string;
  RECEIPT_WARNING: string;
}

export interface Customer {
  customer_id: string;
  customer_name: string;
  customer_type: string;
  phone: string;
  address: string;
  delivery_location: string;
  tax_id: string;
  credit_limit: number;
  total_debt: number;
  customer_status: 'Active' | 'Inactive' | 'Deleted';
  note: string;
  created_at: string;
  updated_at: string;
  id_card_no: string;
  registered_address: string;
  current_worksite: string;
  id_card_area: string;
  id_card_province: string;
  id_card_image_name: string;
  id_card_image_url: string;
  id_card_read_status: string;
  pdpa_consent: boolean;
  customer_signature: string;
}

export interface Product {
  item_id: string;
  sku: string;
  item_name: string;
  category: string;
  use_type: 'rent' | 'sale' | 'both';
  unit: string;
  price_rent: number;
  price_sale: number;
  low_stock_threshold: number;
  item_status: 'Active' | 'Inactive' | 'Deleted';
  note: string;
  created_at: string;
  updated_at: string;
  rental_mode: 'day' | 'round';
  stock: number; // alias to available qty
  qty_total: number;
  qty_available: number;
  qty_rented: number;
  qty_damaged: number;
  qty_lost: number;
}

export interface BillItemRef {
  line_id: string;
  receipt_id: string;
  receipt_no: string;
  item_id: string;
  sku: string;
  receipt_name: string;
  line_mode: 'rent' | 'sale';
  qty: number;
  qty_returned: number;
  unit: string;
  price: number;
  rent_days: number;
  due_date: string;
  line_total: number;
  return_status: 'กำลังเช่า' | 'คืนครบแล้ว' | 'คืนบางส่วน' | 'ไม่มีของเช่า';
  note: string;
  sort_order: number;
}

export interface Receipt {
  receipt_id: string;
  receipt_no: string;
  receipt_date: string;
  receipt_title: string;
  doc_type: 'receipt' | 'invoice' | 'delivery' | 'quotation' | 'delivery_receipt' | 'debt_notice';
  customer_id: string;
  customer_name: string;
  phone: string;
  address: string;
  delivery_location: string;
  rent_date: string;
  due_date: string;
  rental_days: number;
  subtotal: number;
  discount: number;
  delivery_fee: number;
  vat: number;
  vat_rate: number;
  vat_mode: 'NONE' | 'INCLUDE' | 'EXCLUDE';
  deposit: number;
  grand_total: number;
  paid_cash: number;
  paid_transfer: number;
  paid_amount: number;
  debt_amount: number;
  change_amount: number;
  payment_status: 'ชำระครบ' | 'ชำระบางส่วน' | 'ยังไม่ชำระ';
  return_status: 'กำลังเช่า' | 'คืนครบแล้ว' | 'คืนบางส่วน' | 'ไม่มีของเช่า';
  penalty_amount: number;
  return_date: string;
  client_txn_id: string;
  items_json: string; // contains serialized BillItemRef[]
  calculation_json: string;
  note: string;
  created_at: string;
  updated_at: string;
}

export interface ReturnEvent {
  return_id: string;
  receipt_id: string;
  receipt_no: string;
  return_date: string;
  customer_id: string;
  customer_name: string;
  items_json: string; // items returned with returned counts
  penalty_amount: number;
  refund_deposit: number;
  paid_amount: number;
  debt_after: number;
  return_status: string;
  note: string;
  client_txn_id: string;
  created_at: string;
}

export interface Expense {
  expense_id: string;
  expense_date: string;
  description: string;
  category: string;
  amount: number;
  payment_method: string;
  ref_no: string;
  expense_status: 'Active' | 'Cancelled';
  note: string;
  created_at: string;
  updated_at: string;
  cancelled_at?: string;
  cancelled_by?: string;
}

export interface AlertNotification {
  alert_id: string;
  alert_type: 'UNPAID' | 'OVERDUE_RETURN' | 'LOW_STOCK';
  severity: 'ต่ำ' | 'กลาง' | 'สูง';
  title: string;
  detail: string;
  target_type: 'RECEIPT' | 'PRODUCT';
  target_id: string;
  target_menu: string;
  alert_status: 'Open' | 'Resolved';
  due_date: string;
  created_at: string;
}

export interface Appointment {
  appointment_id: string;
  title: string;
  detail: string;
  appointment_date: string;
  customer_id: string;
  customer_name: string;
  appointment_status: 'Active' | 'Done' | 'Cancelled';
  created_at: string;
  updated_at: string;
  cancelled_at?: string;
  done_at?: string;
}

export interface NoteItem {
  note_id: string;
  note_text: string;
  note_status: 'Active' | 'Deleted';
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  log_id: string;
  timestamp: string;
  user: string;
  action: string;
  target_type: string;
  target_id: string;
  old_value: string;
  new_value: string;
  note: string;
}

export interface TerminalUser {
  user_id: string;
  display_name: string;
  email: string;
  role: string;
  pin_hash: string;
  user_status: string;
}
