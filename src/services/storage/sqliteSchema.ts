/**
 * Relational SQLite Schema & Migration Manager for "Управленческий учет" ERP.
 * Defines concrete relational tables with strictly typed columns:
 * - accounts (balances stored in INTEGER cents/kopecks to eliminate floating-point drift)
 * - chart_of_accounts (hierarchical category plan)
 * - counterparties (with debt indexes)
 * - transaction_ledger (immutable financial ledger with idempotency_key UNIQUE)
 * - payment_plans (liquidity & cash gap schedules)
 * - inventory_items (stock with FIFO/Average valuation)
 * - audit_log (cryptographically chained local audit trail)
 *
 * Enforces PRAGMA journal_mode = WAL and optimized secondary indexes.
 */

export const SQLITE_SCHEMA_DDL = `
-- 1. Enable WAL Mode & Integrity Constraints
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA synchronous = NORMAL;

-- 2. Companies / Businesses (Мульти-бизнес сущность)
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_json TEXT NOT NULL DEFAULT '{}',
  legal_name TEXT,
  tax_id TEXT,
  currency TEXT NOT NULL DEFAULT 'UAH' CHECK (currency IN ('UAH', 'USD', 'EUR', 'PLN', 'GBP', 'USDT', 'KZT')),
  country TEXT NOT NULL DEFAULT 'Україна',
  city TEXT,
  tax_regime TEXT,
  industry TEXT,
  accounting_policy TEXT NOT NULL DEFAULT 'accrual' CHECK (accounting_policy IN ('cash', 'accrual', 'mixed')),
  min_cash_reserve_cents INTEGER NOT NULL DEFAULT 0,
  cash_gap_threshold_days INTEGER NOT NULL DEFAULT 14,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_companies_active ON companies(is_active);

-- 3. Users (Локальные профили и роли: Owner / Director)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'director')),
  pin_hash TEXT NOT NULL,
  email TEXT,
  avatar_color TEXT,
  company_id TEXT,
  preferred_business_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);

-- 4. Accounts (Балансы хранятся строго в INT копейках / integer cents)
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL DEFAULT 'comp-main-001',
  name TEXT NOT NULL,
  name_json TEXT NOT NULL DEFAULT '{}', -- Локализация: {"en": "...", "uk": "...", "ru": "..."}
  type TEXT NOT NULL CHECK (type IN ('bank', 'cash', 'reserve', 'transit', 'crypto', 'payment_wallet', 'acquiring')),
  currency TEXT NOT NULL CHECK (currency IN ('UAH', 'USD', 'EUR', 'PLN', 'GBP', 'USDT', 'KZT')),
  balance_cents INTEGER NOT NULL DEFAULT 0,
  initial_balance_cents INTEGER NOT NULL DEFAULT 0,
  initial_balance_date TEXT NOT NULL,
  responsible_person TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  include_in_calendar INTEGER NOT NULL DEFAULT 1,
  account_number TEXT,
  owner_id TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (business_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_accounts_business ON accounts(business_id);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(type);
CREATE INDEX IF NOT EXISTS idx_accounts_active ON accounts(is_active);

-- 5. Chart of Accounts (План счетов / Категории)
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id TEXT PRIMARY KEY,
  business_id TEXT DEFAULT 'comp-main-001',
  name TEXT NOT NULL,
  name_json TEXT NOT NULL DEFAULT '{}', -- Локализация: {"en": "...", "uk": "...", "ru": "..."}
  description_i18n TEXT,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer', 'asset', 'liability')),
  code TEXT,
  color TEXT,
  parent_id TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (parent_id) REFERENCES chart_of_accounts(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_coa_business ON chart_of_accounts(business_id);
CREATE INDEX IF NOT EXISTS idx_coa_type ON chart_of_accounts(type);
CREATE INDEX IF NOT EXISTS idx_coa_parent ON chart_of_accounts(parent_id);

-- 6. Counterparties (Контрагенты / Дебиторы и Кредиторы)
CREATE TABLE IF NOT EXISTS counterparties (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL DEFAULT 'comp-main-001',
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('customer', 'supplier', 'contractor', 'employee', 'bank', 'founder', 'client', 'other')),
  tax_id TEXT,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  receivables_cents INTEGER NOT NULL DEFAULT 0, -- Дебиторская задолженность в копейках
  payables_cents INTEGER NOT NULL DEFAULT 0,    -- Кредиторская задолженность в копейках
  credit_limit_cents INTEGER DEFAULT 0,
  payment_terms_days INTEGER DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_counterparties_business ON counterparties(business_id);
CREATE INDEX IF NOT EXISTS idx_counterparties_type ON counterparties(type);
CREATE INDEX IF NOT EXISTS idx_counterparties_receivables ON counterparties(receivables_cents);
CREATE INDEX IF NOT EXISTS idx_counterparties_payables ON counterparties(payables_cents);

-- 7. Transaction Ledger (Главная книга проводок)
-- Idempotency key UNIQUE ensures zero duplicate bank imports
CREATE TABLE IF NOT EXISTS transaction_ledger (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL DEFAULT 'comp-main-001',
  date TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('sale', 'purchase', 'expense', 'payment_receipt', 'income_payment', 'salary', 'tax', 'transfer', 'owner_deposit', 'owner_withdrawal', 'loan_received', 'loan_repayment', 'bank_fee', 'acquiring_fee', 'write_off', 'inventory_adjustment', 'balance_adj', 'refund', 'currency_exchange')),
  account_id TEXT NOT NULL,
  target_account_id TEXT,
  category_id TEXT NOT NULL,
  counterparty_id TEXT,
  amount_cents INTEGER NOT NULL, -- Сумма в копейках
  currency TEXT NOT NULL,
  exchange_rate REAL DEFAULT 1.0,
  description TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'pending_approval', 'confirmed', 'imported', 'requires_review', 'reconciled', 'cancelled')),
  idempotency_key TEXT UNIQUE, -- Критический индекс дедупликации
  reference_number TEXT,
  is_cash_flow_affecting INTEGER NOT NULL DEFAULT 1,
  accrual_period TEXT,
  reconciled_at TEXT,
  reconciled_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  owner_id TEXT NOT NULL,
  FOREIGN KEY (business_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES accounts(id),
  FOREIGN KEY (target_account_id) REFERENCES accounts(id),
  FOREIGN KEY (category_id) REFERENCES chart_of_accounts(id),
  FOREIGN KEY (counterparty_id) REFERENCES counterparties(id)
);

CREATE INDEX IF NOT EXISTS idx_tx_business ON transaction_ledger(business_id);
CREATE INDEX IF NOT EXISTS idx_tx_date ON transaction_ledger(date);
CREATE INDEX IF NOT EXISTS idx_tx_account ON transaction_ledger(account_id);
CREATE INDEX IF NOT EXISTS idx_tx_category ON transaction_ledger(category_id);
CREATE INDEX IF NOT EXISTS idx_tx_counterparty ON transaction_ledger(counterparty_id);
CREATE INDEX IF NOT EXISTS idx_tx_idempotency ON transaction_ledger(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_tx_status_date ON transaction_ledger(status, date);

-- 8. Payment Plans (Платежный календарь / Кассовые разрывы)
CREATE TABLE IF NOT EXISTS payment_plans (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL DEFAULT 'comp-main-001',
  date TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inflow', 'outflow', 'incoming', 'outgoing')),
  type TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL,
  account_id TEXT,
  counterparty_id TEXT,
  category_id TEXT NOT NULL,
  description TEXT NOT NULL,
  probability_pct INTEGER NOT NULL DEFAULT 100,
  is_committed INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('planned', 'pending', 'approved', 'completed', 'confirmed', 'overdue', 'cancelled')),
  recurrence TEXT,
  actual_transaction_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  owner_id TEXT NOT NULL,
  FOREIGN KEY (business_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES accounts(id),
  FOREIGN KEY (counterparty_id) REFERENCES counterparties(id),
  FOREIGN KEY (actual_transaction_id) REFERENCES transaction_ledger(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_plans_business ON payment_plans(business_id);
CREATE INDEX IF NOT EXISTS idx_plans_date ON payment_plans(date);
CREATE INDEX IF NOT EXISTS idx_plans_direction_status ON payment_plans(direction, status);

-- 9. Paired Desktop Nodes (Множественные сопряженные десктопные ноды для мобильного клиента)
CREATE TABLE IF NOT EXISTS paired_nodes (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL DEFAULT 'comp-main-001',
  name TEXT NOT NULL,
  os TEXT NOT NULL CHECK (os IN ('windows', 'macos', 'linux', 'android')),
  local_ip TEXT NOT NULL,
  port INTEGER NOT NULL DEFAULT 3001,
  public_key TEXT,
  auth_token TEXT,
  status TEXT NOT NULL DEFAULT 'paired' CHECK (status IN ('online', 'offline', 'paired')),
  last_connected_at TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (business_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_paired_nodes_business ON paired_nodes(business_id);
CREATE INDEX IF NOT EXISTS idx_paired_nodes_active ON paired_nodes(is_active);

-- 10. Inventory Items (Товарно-материальные ценности)
CREATE TABLE IF NOT EXISTS inventory_items (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL DEFAULT 'comp-main-001',
  name TEXT NOT NULL,
  sku TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  unit TEXT NOT NULL,
  quantity_on_hand REAL NOT NULL DEFAULT 0.0,
  min_quantity REAL NOT NULL DEFAULT 0.0,
  cost_price_cents INTEGER NOT NULL DEFAULT 0,
  selling_price_cents INTEGER NOT NULL DEFAULT 0,
  valuation_method TEXT NOT NULL CHECK (valuation_method IN ('fifo', 'average', 'standard')),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_inventory_business ON inventory_items(business_id);
CREATE INDEX IF NOT EXISTS idx_inventory_sku ON inventory_items(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_active ON inventory_items(is_active);

-- 11. Audit Log (Аудит изменений / MASVS-STORAGE)
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  business_id TEXT,
  timestamp TEXT NOT NULL,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  details TEXT,
  previous_state TEXT,
  new_state TEXT,
  device_info TEXT,
  ip_address TEXT,
  entry_hash TEXT -- SHA-256 цепочка неизменяемости
);

CREATE INDEX IF NOT EXISTS idx_audit_business ON audit_log(business_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);

-- 12. Approval Requests (Коллективное согласование изменений и удалений ТЗ v1.1)
CREATE TABLE IF NOT EXISTS approval_requests (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('transaction', 'payment_plan', 'revenue_plan', 'account', 'company')),
  entity_id TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('update_transaction', 'delete_transaction', 'update_payment_plan', 'delete_payment_plan', 'update_revenue_plan', 'delete_revenue_plan', 'update_account', 'delete_account', 'wipe_company')),
  initiator_id TEXT NOT NULL,
  initiator_name TEXT NOT NULL,
  initiator_role TEXT NOT NULL,
  old_version_snapshot TEXT NOT NULL,
  proposed_payload TEXT,
  reason TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending_approval', 'approved', 'rejected', 'cancelled', 'expired')),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  completed_at TEXT,
  required_participant_ids TEXT NOT NULL, -- JSON array of user IDs
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_approval_req_company ON approval_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_approval_req_status ON approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_req_entity ON approval_requests(entity_type, entity_id);

-- 13. Approval Votes (Индивидуальные голоса участников компании)
CREATE TABLE IF NOT EXISTS approval_votes (
  id TEXT PRIMARY KEY,
  approval_request_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  participant_id TEXT NOT NULL,
  participant_name TEXT NOT NULL,
  participant_role TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('approve', 'reject')),
  comment TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (approval_request_id) REFERENCES approval_requests(id) ON DELETE CASCADE,
  UNIQUE(approval_request_id, participant_id)
);

CREATE INDEX IF NOT EXISTS idx_approval_votes_req ON approval_votes(approval_request_id);
CREATE INDEX IF NOT EXISTS idx_approval_votes_participant ON approval_votes(participant_id);
`;

export const SQLITE_COMPATIBILITY_MIGRATIONS = [
  'ALTER TABLE users ADD COLUMN company_id TEXT;',
];

/**
 * Utility: Converts float currency amounts to integer cents to avoid IEEE-754 drift.
 */
export function toCents(amount: number): number {
  return Math.round((amount || 0) * 100);
}

/**
 * Utility: Converts integer cents to float currency amounts for UI formatting.
 */
export function fromCents(cents: number): number {
  return (cents || 0) / 100;
}
