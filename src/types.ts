// Roles & User Accounts
export type UserRole = 'owner' | 'spv' | 'counter';

export interface UserAccount {
  id: string;
  username: string;
  pin: string;
  name: string;
  role: UserRole;
  status: 'Active' | 'Inactive';
}

// Session & Login Data
export interface SessionData {
  sessionId: string;
  sessionName: string;
  primaryCounter: string;
  partners: string[];
  mode: 'list-to-floor' | 'floor-to-list';
  role?: 'counter' | 'admin' | UserRole;
}

// Master Data SKU & WMS Header
export interface MasterSKUItem {
  Owner: string;
  SKU: string;
  Description: string;
  Status: string;
  Location: string;
  level: string;
  ailee: string;
  Zone: string;
  LocationType: string;
  counter: string;
  counterUtama?: string;
  timWarehouse?: string;
  Qty: number;
  countedQty?: number;
  satuanHitung: string;
  SKUBrand: string;
  isCounted?: boolean;
}

export interface RackItem {
  id: string;
  rackNumber: string;
  level: number;
  zone: string; // 'RACKING' | 'DAMAGE' | 'NS'
  status: 'pending' | 'in-progress' | 'completed';
  totalSKU: number;
  countedSKU?: number;
  counterName?: string;
}

export interface UnmappedItem {
  id: string;
  barcode: string;
  name: string;
  qty: number;
  uom: 'PCS' | 'CARTON';
  expDate?: string;
  batchNumber?: string;
  photoUrl?: string;
  remarks?: string;
}

export interface SKUItem {
  id: string;
  sku: string;
  upc: string;
  upc2?: string;
  name: string;
  category: string;
  uom: 'PCS' | 'CARTON';
  qtyGood: number;
  qtyBad: number;
  expDate?: string;
  badRemarks?: string;
}

// Rules & Mapping
export interface BrandMappingRule {
  brand: string;
  owner: string;
}

// Audit Logs
export interface AuditLog {
  id: string;
  timestamp: string;
  counterId: string;
  location: string;
  sku: string;
  countedQty: number;
  unit: string;
  hasPhoto: boolean;
  actionType: 'NEW_COUNT' | 'RECOUNT' | 'UPDATE';
  round: number;
}

// Custom Modal State
export interface CustomModalState {
  isOpen: boolean;
  title: string;
  message: string;
  type?: 'success' | 'warning' | 'info' | 'error';
  details?: { label: string; value: string }[];
  confirmText?: string;
  onConfirm?: () => void;
}

