/**
 * Core Domain Types & Interfaces
 * Management Accounting (Управленческий учет) for SMB
 */

export type Role = 'owner' | 'director';

export type Currency = 'UAH' | 'USD' | 'EUR' | 'PLN' | 'KZT';

export type TransactionType =
  | 'sale'               // Продажа
  | 'payment_receipt'   // Поступление оплаты
  | 'income_payment'    // Поступление оплаты (алиас)
  | 'purchase'          // Закупка
  | 'expense'           // Расход
  | 'transfer'          // Перевод между своими счетами
  | 'owner_deposit'     // Внесение владельца
  | 'owner_withdrawal'  // Изъятие владельца
  | 'loan_received'     // Получение займа
  | 'loan_repayment'    // Погашение займа
  | 'tax'               // Налоги и сборы
  | 'salary'            // Зарплата
  | 'bank_fee'          // Банковская комиссия
  | 'acquiring_fee'     // Комиссия эквайринга
  | 'refund'            // Возврат клиенту/от поставщика
  | 'write_off'         // Списание
  | 'balance_adj'       // Корректировка остатка
  | 'currency_exchange';// Обмен валюты

export type TransactionStatus =
  | 'draft'
  | 'pending_approval'
  | 'confirmed'
  | 'imported'
  | 'requires_review'
  | 'cancelled'
  | 'reconciled';

export interface BaseEntity {
  id: string;
  business_id?: string; // Привязка к компании/бизнесу
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  source: string;
  external_id?: string;
  sync_status: 'synced' | 'pending' | 'conflict';
  sync_conflict?: boolean;
  version: number;
  owner_id: string;
}

export interface Company extends BaseEntity {
  name: string;
  name_json?: string | Record<string, string>;
  legal_name?: string;
  tax_id?: string; // ЕДРПОУ / ИНН
  currency: Currency;
  country: string;
  city?: string;
  tax_regime?: string;
  industry?: string;
  accounting_policy: 'cash' | 'accrual' | 'mixed';
  min_cash_reserve?: number;
  cash_gap_threshold_days?: number;
  is_active: boolean;
  is_default?: boolean;
}

export interface UserProfile {
  id: string;
  company_id?: string;
  name: string;
  email?: string;
  role: Role; // строго 'owner' | 'director'
  pin_hash: string;
  avatar_color?: string;
  last_login_at?: string;
  preferred_currency?: Currency;
  preferred_business_id?: string;
  biometric_enabled?: boolean;
}

export interface OrganizationSettings extends BaseEntity {
  name: string;
  legal_status: string;
  country: string;
  city: string;
  primary_currency: Currency;
  secondary_currencies: Currency[];
  tax_regime: string;
  industry: string;
  accounting_policy: 'cash' | 'accrual' | 'mixed';
  min_cash_reserve: number;
  cash_gap_threshold_days: number;
  ai_provider: string;
  ai_allow_cloud: boolean;
  pin_protection_enabled: boolean;
  lock_timeout_minutes: number;
}

export interface Account extends BaseEntity {
  name: string;
  name_json?: string | Record<string, string>;
  type: 'bank' | 'cash' | 'payment_wallet' | 'acquiring' | 'reserve';
  currency: Currency;
  balance: number;
  initial_balance: number;
  initial_balance_date: string;
  responsible_person: string;
  is_active: boolean;
  include_in_calendar: boolean;
  account_number?: string;
  name_i18n?: Record<string, string>;
}

export interface TransactionCategory extends BaseEntity {
  name: string;
  name_json?: string | Record<string, string>;
  type: 'income' | 'expense' | 'transfer' | 'asset' | 'liability';
  code?: string;
  color?: string;
  parent_id?: string;
  name_i18n?: Record<string, string>;
  description_i18n?: Record<string, string>;
}

export interface Counterparty extends BaseEntity {
  name: string;
  type: 'client' | 'supplier' | 'bank' | 'employee' | 'other';
  tax_id?: string;
  email?: string;
  phone?: string;
  receivables: number; // Бизнесу должны
  payables: number;    // Бизнес должен
  delay_days_avg?: number;
}

export interface Transaction extends BaseEntity {
  type: TransactionType;
  date: string;
  accrual_date?: string; // Метод начисления (Accrual Basis)
  cash_date?: string;    // Прямой кассовый метод (Cash Basis)
  time?: string;
  account_id: string;
  target_account_id?: string; // For transfers
  amount: number;
  currency: Currency;
  category_id: string;
  category?: string;
  counterparty_id?: string;
  counterparty_name?: string;
  project?: string;
  department?: string;
  responsible_person?: string;
  description: string;
  status: TransactionStatus;
  idempotency_key: string;
  external_id?: string;
  exchange_rate?: number;
  attachments?: string[];
  reviewed_by?: string;
  approved_by?: string;
}

export interface RevenuePlanItem {
  id: string;
  business_id?: string;
  month: string; // YYYY-MM
  category_id: string;
  category_name: string;
  title?: string;
  category?: string;
  department?: string;
  project?: string;
  planned_amount: number; // В копейках / базовой валюте
  notes?: string;
  updated_at?: string;
}

export interface PaymentPlanItem extends BaseEntity {
  type: 'inflow' | 'outflow' | 'incoming' | 'outgoing';
  planned_date: string;
  due_date: string;
  account_id: string;
  amount: number;
  currency: Currency;
  counterparty_id?: string;
  counterparty_name?: string;
  category_id: string;
  category?: string;
  description?: string;
  recurrence?: 'none' | 'weekly' | 'monthly' | 'quarterly';
  status: 'planned' | 'pending' | 'approved' | 'completed' | 'overdue' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  responsible_person: string;
  remind_days_before: number[];
  notes?: string;
}

export type PlannedPayment = PaymentPlanItem;

export interface InventoryItem extends BaseEntity {
  name: string;
  sku: string;
  barcode?: string;
  category: string;
  unit: string;
  warehouse: string;
  quantity_on_hand: number;
  quantity?: number;
  min_quantity: number;
  min_threshold?: number;
  max_quantity: number;
  cost_price: number;
  sale_price: number;
  currency?: Currency;
  responsible_person: string;
  last_movement_date: string;
}

export interface StockMovement extends BaseEntity {
  item_id: string;
  type: 'receipt' | 'sale' | 'transfer' | 'write_off' | 'adjustment' | 'surplus' | 'shortage';
  quantity: number;
  cost_price: number;
  date: string;
  warehouse_from?: string;
  warehouse_to?: string;
  related_transaction_id?: string;
  reason?: string;
}

export interface AuditLogEntry {
  id: string;
  business_id?: string;
  timestamp: string;
  user_id: string;
  user_name: string;
  action: string;
  entity: string;
  entity_id: string;
  details: string;
  ip_address?: string;
  device_id: string;
}

export type AuditLog = AuditLogEntry;

export interface DevicePairingSession {
  pairing_token: string;
  session_id: string;
  public_key: string;
  expires_at: number;
  signature: string;
  confirmed: boolean;
  device_name: string;
  device_id: string;
}

export interface RegisteredDevice {
  device_id: string;
  business_id?: string;
  name: string;
  platform: 'windows' | 'macos' | 'android' | 'web';
  last_synced_at: string;
  is_current: boolean;
  status: 'active' | 'revoked';
}

export interface PairedDesktopNode {
  id: string;
  business_id?: string;
  name: string;
  os: 'windows' | 'macos' | 'linux';
  local_ip: string;
  port: number;
  public_key?: string;
  auth_token?: string;
  status: 'online' | 'offline' | 'paired';
  last_connected_at: string;
  is_active: boolean;
  is_default?: boolean;
}

export interface RiskAlert {
  id: string;
  business_id?: string;
  level: 'info' | 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  source: string;
  analysis_period: string;
  projected_date: string;
  confidence_pct: number;
  confidence?: number;
  financial_impact: number;
  recommended_actions: string[];
  recommended_action?: string;
  related_ids?: string[];
  requires_manual_confirmation: boolean;
  confirmed_at?: string;
  resolved?: boolean;
  source_data?: string;
}

export type PaymentScenario = 'base' | 'cautious' | 'optimistic' | 'crisis';

export interface CashForecastDay {
  date: string;
  starting_balance: number;
  inflows: number;
  outflows: number;
  ending_balance: number;
  deficit: number;
  is_risk: boolean;
}

// AI Interfaces
export interface HealthResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs?: number;
  details?: Record<string, unknown>;
  message?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  formatJson?: boolean;
}

export interface ChatResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  modelName: string;
}

export interface AIProvider {
  id: string;
  name: string;
  capabilities: {
    text: boolean;
    vision: boolean;
    embeddings: boolean;
    structuredOutput: boolean;
    tools: boolean;
    streaming: boolean;
  };
  checkHealth(): Promise<HealthResult>;
  chat(request: ChatRequest): Promise<ChatResponse>;
  analyzeImage?(request: { imageBase64: string; mimeType: string; prompt: string }): Promise<ChatResponse>;
}

// Banking & Payment interfaces
export interface BankAccount {
  id: string;
  iban: string;
  name: string;
  currency: Currency;
  balance: number;
  available_balance: number;
  credit_limit?: number;
  bank_name: string;
}

export interface BankingTransaction {
  id: string;
  account_id: string;
  date: string;
  amount: number;
  currency: Currency;
  description: string;
  counterparty_name?: string;
  counterparty_iban?: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  category?: string;
  fee?: number;
}

export interface BankingProvider {
  id: string;
  name: string;
  connect(): Promise<{ success: boolean; message: string }>;
  refreshConnection(): Promise<{ success: boolean; message: string }>;
  getAccounts(): Promise<BankAccount[]>;
  getBalances(): Promise<Array<{ account_id: string; balance: number; currency: Currency }>>;
  getHistoricalTransactions(request: { fromDate: string; toDate: string; limit?: number }): Promise<BankingTransaction[]>;
  getCurrentTransactions(request: { limit?: number }): Promise<BankingTransaction[]>;
  disconnect(): Promise<void>;
  supportsWebhooks: boolean;
  supportsHistoricalData: boolean;
  supportsRealtimeData: boolean;
}

export interface PaymentSettlement {
  id: string;
  date: string;
  gross_amount: number;
  fees: number;
  net_amount: number;
  currency: Currency;
  status: 'pending' | 'paid' | 'failed';
  payout_date?: string;
}

export interface PaymentProvider {
  id: string;
  name: string;
  connect(): Promise<{ success: boolean; message: string }>;
  getTransactions(request: { limit?: number }): Promise<any[]>;
  getSettlements(request: { fromDate: string; toDate: string }): Promise<PaymentSettlement[]>;
  getCurrentStatus(): Promise<{ connected: boolean; provider: string }>;
  registerWebhook?(): Promise<{ success: boolean; webhook_url: string }>;
  disconnect(): Promise<void>;
}

// ==========================================
// COLLECTIVE APPROVAL ENGINE (ТЗ v1.1 MANDATORY)
// ==========================================
export type ApprovalStatus =
  | 'pending_approval' // Ожидает голосов всех участников
  | 'approved'         // Единогласно одобрено всеми участниками
  | 'rejected'         // Отклонено хотя бы одним участником
  | 'cancelled'        // Отозвано инициатором
  | 'expired';         // Истек срок голосования

export type ApprovalActionType =
  | 'update_transaction'
  | 'delete_transaction'
  | 'update_payment_plan'
  | 'delete_payment_plan'
  | 'update_revenue_plan'
  | 'delete_revenue_plan'
  | 'update_account'
  | 'delete_account'
  | 'wipe_company';

export type ApprovalEntityType =
  | 'transaction'
  | 'payment_plan'
  | 'revenue_plan'
  | 'account'
  | 'company';

export interface ApprovalVote {
  id: string;
  approval_request_id: string;
  company_id: string;
  participant_id: string;
  participant_name: string;
  participant_role: Role;
  decision: 'approve' | 'reject';
  comment?: string;
  created_at: string;
}

export interface ApprovalRequest {
  id: string;
  company_id: string;
  entity_type: ApprovalEntityType;
  entity_id: string;
  action_type: ApprovalActionType;
  initiator_id: string;
  initiator_name: string;
  initiator_role: Role;
  old_version_snapshot: string; // JSON snapshot of current entity state before modification
  proposed_payload?: string;    // JSON snapshot of proposed change (null for deletes)
  reason: string;
  status: ApprovalStatus;
  created_at: string;
  expires_at: string;
  completed_at?: string;
  votes: ApprovalVote[];
  required_participant_ids: string[]; // List of all registered users in company who must vote
}
