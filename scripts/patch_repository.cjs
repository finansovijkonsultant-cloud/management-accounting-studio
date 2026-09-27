const fs = require('fs');

let content = fs.readFileSync('src/services/storage/repository.ts', 'utf8');

// 1. Update imports
if (!content.includes('Company,')) {
  content = content.replace(
    "import {\n  Account,",
    "import {\n  Account,\n  Company,\n  Role,\n  PairedDesktopNode,"
  );
}

// 2. Update STORAGE_KEYS
const newKeys = `  SETTINGS: 'mgmt_acct_settings',
  COMPANIES: 'mgmt_acct_companies',
  ACTIVE_COMPANY_ID: 'mgmt_acct_active_company_id',
  USERS: 'mgmt_acct_users',
  CURRENT_USER: 'mgmt_acct_current_user',
  PAIRED_NODES: 'mgmt_acct_paired_nodes',
  ACTIVE_NODE_ID: 'mgmt_acct_active_node_id',
  ACCOUNTS: 'mgmt_acct_accounts',`;

content = content.replace(
  "  SETTINGS: 'mgmt_acct_settings',\n  ACCOUNTS: 'mgmt_acct_accounts',",
  newKeys
);

// 3. Add initial companies, users, paired nodes definitions before INITIAL_REVENUE_PLANS
const initialEntities = `const INITIAL_COMPANIES: Company[] = [
  {
    id: 'comp-main-001',
    name: 'ТОВ «Інноваційний Бізнес»',
    name_json: JSON.stringify({
      uk: 'ТОВ «Інноваційний Бізнес»',
      ru: 'ООО «Инновационный Бизнес»',
      en: 'Innovative Business LLC',
      de: 'Innovative Business GmbH',
      fr: 'Affaires Innovantes SARL',
    }),
    legal_name: 'Товариство з обмеженою відповідальністю «Інноваційний Бізнес»',
    tax_id: '41239854',
    currency: 'UAH',
    country: 'Україна',
    city: 'Київ',
    tax_regime: 'Єдиний податок 5% (3 група)',
    industry: 'Оптова торгівля та сервісні послуги',
    accounting_policy: 'accrual',
    min_cash_reserve: 80000,
    cash_gap_threshold_days: 14,
    is_active: true,
    is_default: true,
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-09-01T08:00:00Z',
    source: 'system',
    sync_status: 'synced',
    version: 1,
    owner_id: 'usr-owner-1',
  },
  {
    id: 'comp-tech-002',
    name: 'Digital Solutions LLC',
    name_json: JSON.stringify({
      uk: 'Діджитал Солюшнс ТОВ',
      ru: 'Диджитал Солюшнс ООО',
      en: 'Digital Solutions LLC',
      de: 'Digital Solutions GmbH',
      fr: 'Solutions Numériques SARL',
    }),
    legal_name: 'Digital Solutions Software & Cloud LLC',
    tax_id: 'US-DEL-984712',
    currency: 'USD',
    country: 'USA',
    city: 'Wilmington, Delaware',
    tax_regime: 'Corporate Income Tax 21%',
    industry: 'IT, SaaS & Cloud Services',
    accounting_policy: 'mixed',
    min_cash_reserve: 15000,
    cash_gap_threshold_days: 30,
    is_active: true,
    is_default: false,
    created_at: '2026-02-15T10:00:00Z',
    updated_at: '2026-09-01T08:00:00Z',
    source: 'system',
    sync_status: 'synced',
    version: 1,
    owner_id: 'usr-owner-1',
  },
  {
    id: 'comp-retail-003',
    name: "ФОП Мельничук (Кав'ярні)",
    name_json: JSON.stringify({
      uk: "ФОП Мельничук (Мережа кав'ярень)",
      ru: 'ФЛП Мельничук (Сеть кофеен)',
      en: 'Melnychuk Coffee Chain',
      pl: 'Melnychuk Kawiarnie',
    }),
    legal_name: 'Фізична особа-підприємець Мельничук К. О.',
    tax_id: '3129845012',
    currency: 'UAH',
    country: 'Україна',
    city: 'Львів',
    tax_regime: 'Єдиний податок 2 група',
    industry: 'HoReCa / Громадське харчування',
    accounting_policy: 'cash',
    min_cash_reserve: 25000,
    cash_gap_threshold_days: 7,
    is_active: true,
    is_default: false,
    created_at: '2026-03-01T12:00:00Z',
    updated_at: '2026-09-01T08:00:00Z',
    source: 'system',
    sync_status: 'synced',
    version: 1,
    owner_id: 'usr-owner-1',
  },
];

const INITIAL_USERS: UserProfile[] = [
  {
    id: 'usr-owner-1',
    name: 'Констянтин Лагутін',
    role: 'owner',
    pin_hash: '1234',
    email: 'owner@holding.com',
    avatar_color: '#10b981',
    preferred_currency: 'UAH',
    preferred_business_id: 'comp-main-001',
    biometric_enabled: true,
    last_login_at: '2026-09-14T10:00:00Z',
  },
  {
    id: 'usr-director-2',
    name: 'Олександр Коваленко',
    role: 'director',
    pin_hash: '5678',
    email: 'director@holding.com',
    avatar_color: '#3b82f6',
    preferred_currency: 'UAH',
    preferred_business_id: 'comp-main-001',
    biometric_enabled: false,
    last_login_at: '2026-09-14T09:30:00Z',
  },
];

const INITIAL_PAIRED_NODES: PairedDesktopNode[] = [
  {
    id: 'node-win-01',
    name: 'Workstation Finance (Windows 11 Pro)',
    os: 'windows',
    local_ip: '192.168.1.105',
    port: 3001,
    status: 'online',
    last_connected_at: '2026-09-14T11:45:00Z',
    is_active: true,
    is_default: true,
  },
  {
    id: 'node-mac-02',
    name: 'MacBook Air M2 (Director Laptop)',
    os: 'macos',
    local_ip: '192.168.1.142',
    port: 3001,
    status: 'paired',
    last_connected_at: '2026-09-13T18:20:00Z',
    is_active: false,
    is_default: false,
  },
];
`;

if (!content.includes('INITIAL_COMPANIES')) {
  content = content.replace(
    'const INITIAL_REVENUE_PLANS: RevenuePlanItem[] = [',
    initialEntities + '\nconst INITIAL_REVENUE_PLANS: RevenuePlanItem[] = ['
  );
}

fs.writeFileSync('src/services/storage/repository.ts', content, 'utf8');
console.log('Repository entities patched successfully!');
