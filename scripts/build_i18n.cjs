const fs = require('fs');

const fileContent = `/**
 * Comprehensive Localization system for European languages (RU, UK, EN, DE, FR, ES, IT, PL, RO, NL).
 * Designed with dynamic fallback to English (en) for all static strings and dynamic database JSON fields.
 */

export type SupportedLocale = 'ru' | 'uk' | 'en' | 'de' | 'fr' | 'es' | 'it' | 'pl' | 'ro' | 'nl';
export type LocaleKey = SupportedLocale;

export interface TranslationDictionary {
  appName: string;
  tagline: string;
  disclaimerNote: string;
  status: {
    online: string;
    offline: string;
    localAi: string;
    cloudAi: string;
    mockAi: string;
    syncing: string;
    synced: string;
    syncError: string;
    bankUnavailable: string;
    paymentUnavailable: string;
    locked: string;
    unlocked: string;
  };
  roles: {
    owner: string;
    director: string;
  };
  nav: {
    dashboard: string;
    money: string;
    transactions: string;
    calendar: string;
    pnl: string;
    cashflow: string;
    balance: string;
    planFact: string;
    reports: string;
    inventory: string;
    aiConsultant: string;
    importExport: string;
    devicePairing: string;
    integrations: string;
    securityAudit: string;
    settings: string;
    onboarding?: string;
    docs: string;
  };
  dashboard: {
    title: string;
    availableCash: string;
    availableCashHint: string;
    cashWithPlanned: string;
    adjustedCash: string;
    incomePeriod: string;
    income: string;
    expensePeriod: string;
    expenses: string;
    operatingProfit: string;
    receivables: string;
    payables: string;
    overdueDebts: string;
    stockValue: string;
    inventoryValue: string;
    upcomingPayments: string;
    cashGapProbability: string;
    aiAlerts: string;
    riskWarnings: string;
    quickAddTransaction: string;
    filterPeriod: string;
    filterCurrency: string;
    filterAccount: string;
    allAccounts: string;
  };
  transactions: {
    title: string;
    addTransaction: string;
    voiceInput: string;
    type: string;
    date: string;
    account: string;
    targetAccount: string;
    amount: string;
    currency: string;
    category: string;
    counterparty: string;
    description: string;
    status: string;
    actions: string;
    idempotencyKey: string;
    filterByType: string;
    filterByStatus: string;
    searchPlaceholder: string;
    types: Record<string, string>;
    statuses: Record<string, string>;
  };
  calendar: {
    title: string;
    addPayment: string;
    scenarioBase: string;
    scenarioCautious: string;
    scenarioOptimistic: string;
    scenarioCrisis: string;
    liquidityForecast: string;
    cashGapAlert: string;
    recommendedAction: string;
    paymentSchedule: string;
    directionInflow: string;
    directionOutflow: string;
    dueDate: string;
    priority: string;
    probability: string;
    recurrence: string;
    markCompleted: string;
    approve: string;
  };
  pnl: {
    title: string;
    revenue: string;
    cogs: string;
    grossProfit: string;
    operatingExpenses: string;
    ebitda: string;
    depreciation: string;
    ebit: string;
    interestTaxes: string;
    netProfit: string;
    profitability: string;
    periodMonth: string;
    periodQuarter: string;
    periodYear: string;
  };
  cashflow: {
    title: string;
    operatingActivity: string;
    investingActivity: string;
    financingActivity: string;
    netCashFlow: string;
    openingBalance: string;
    closingBalance: string;
    inflow: string;
    outflow: string;
    directMethod: string;
  };
  balance: {
    title: string;
    assets: string;
    currentAssets: string;
    nonCurrentAssets: string;
    cashAndEquivalents: string;
    accountsReceivable: string;
    inventory: string;
    liabilities: string;
    currentLiabilities: string;
    accountsPayable: string;
    shortTermLoans: string;
    equity: string;
    retainedEarnings: string;
    balanceCheck: string;
    balanceMatch: string;
    balanceMismatch: string;
  };
  planFact: {
    title: string;
    monthSelector: string;
    addRevenuePlan: string;
    revenuePlanTitle: string;
    expensePlanTitle: string;
    category: string;
    planned: string;
    actual: string;
    variance: string;
    executionPct: string;
    status: string;
    favorable: string;
    unfavorable: string;
    onBudget: string;
    chartComparison: string;
  };
  inventory: {
    title: string;
    addItem: string;
    runInventoryCheck: string;
    sku: string;
    itemName: string;
    category: string;
    stock: string;
    minMax: string;
    costPrice: string;
    salePrice: string;
    totalValuation: string;
    variance: string;
    actualCount: string;
    bookCount: string;
  };
  ai: {
    title: string;
    provider: string;
    model: string;
    status: string;
    testConnection: string;
    privacyMode: string;
    privacyMaskingActive: string;
    allowCloud: string;
    askQuestion: string;
    sendPrompt: string;
    criticalWarning: string;
    auditNotice: string;
  };
  importExport: {
    title: string;
    stepSource: string;
    stepPreview: string;
    stepMapping: string;
    stepValidate: string;
    stepFinish: string;
    uploadFile: string;
    formatsSupported: string;
    exportCsv: string;
    exportJson: string;
    exportBackup: string;
    restoreBackup: string;
  };
  pairing: {
    title: string;
    optionA: string;
    optionB: string;
    generateQr: string;
    qrValidFor: string;
    pairToken: string;
    scanInstruction: string;
    pairedDevices: string;
    revokeDevice: string;
  };
  security: {
    title: string;
    pinLock: string;
    enterPin: string;
    setPin: string;
    auditLog: string;
    owaspCompliance: string;
    inactivityTimeout: string;
  };
  settings: {
    title: string;
    subtitle: string;
    profileTab: string;
    policyTab: string;
    currenciesTab: string;
    accountsTab: string;
    categoriesTab: string;
    securityTab: string;
    companies: string;
    addCompany: string;
    companyName: string;
    legalName: string;
    taxId: string;
    country: string;
    city: string;
    accountingPolicy: string;
    cashBasis: string;
    accrualBasis: string;
    mixedBasis: string;
    baseCurrency: string;
    save: string;
    savedSuccessfully: string;
    deleteRestricted: string;
  };
  login: {
    title: string;
    subtitle: string;
    selectUser: string;
    enterPin: string;
    unlock: string;
    wrongPin: string;
    switchUser: string;
    ownerBadge: string;
    directorBadge: string;
    testPinHint: string;
  };
  multibusiness: {
    selectCompany: string;
    addCompany: string;
    activeCompany: string;
    allCompanies: string;
    switchSuccess: string;
  };
}

export const LANGUAGE_LABELS: Record<SupportedLocale, { label: string; flag: string; native: string }> = {
  ru: { label: 'Русский', flag: '🇷🇺', native: 'Русский' },
  uk: { label: 'Українська', flag: '🇺🇦', native: 'Українська' },
  en: { label: 'English', flag: '🇬🇧', native: 'English' },
  de: { label: 'Deutsch', flag: '🇩🇪', native: 'Deutsch' },
  fr: { label: 'Français', flag: '🇫🇷', native: 'Français' },
  es: { label: 'Español', flag: '🇪🇸', native: 'Español' },
  it: { label: 'Italiano', flag: '🇮🇹', native: 'Italiano' },
  pl: { label: 'Polski', flag: '🇵🇱', native: 'Polski' },
  ro: { label: 'Română', flag: '🇷🇴', native: 'Română' },
  nl: { label: 'Nederlands', flag: '🇳🇱', native: 'Nederlands' },
};

/**
 * Resolves dynamic localized name from SQLite JSON string or record.
 * Falls back to 'en', then first non-empty, then raw string.
 */
export function getLocalizedName(
  nameJsonOrRecord: string | Record<string, string> | undefined | null,
  locale: string,
  fallbackName: string = ''
): string {
  if (!nameJsonOrRecord) return fallbackName;
  let dict: Record<string, string> = {};
  if (typeof nameJsonOrRecord === 'string') {
    try {
      dict = JSON.parse(nameJsonOrRecord);
    } catch {
      return nameJsonOrRecord;
    }
  } else if (typeof nameJsonOrRecord === 'object') {
    dict = nameJsonOrRecord;
  }
  if (dict[locale] && typeof dict[locale] === 'string' && dict[locale].trim()) {
    return dict[locale].trim();
  }
  if (dict['en'] && typeof dict['en'] === 'string' && dict['en'].trim()) {
    return dict['en'].trim();
  }
  for (const k of Object.keys(dict)) {
    if (dict[k] && typeof dict[k] === 'string' && dict[k].trim()) {
      return dict[k].trim();
    }
  }
  return fallbackName;
}

// Deep object merge helper
function deepMerge<T extends Record<string, any>>(base: T, override: Partial<T>): T {
  const result: any = { ...base };
  for (const key of Object.keys(override)) {
    const val = (override as any)[key];
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      result[key] = deepMerge(result[key] || {}, val);
    } else if (val !== undefined) {
      result[key] = val;
    }
  }
  return result as T;
}

// BASE ENGLISH DICTIONARY
const enDictionary: TranslationDictionary = {
  appName: 'Management Accounting ERP',
  tagline: 'Zero-Knowledge Offline Multi-Business Financial Management',
  disclaimerNote: 'All data is stored locally in SQLite with hardware encryption and P2P synchronization.',
  status: {
    online: 'Online',
    offline: 'Offline (Local)',
    localAi: 'Local AI (Ollama)',
    cloudAi: 'Cloud AI',
    mockAi: 'Mock AI',
    syncing: 'Syncing P2P...',
    synced: 'Fully Synced',
    syncError: 'Sync Conflict / Error',
    bankUnavailable: 'Bank Offline',
    paymentUnavailable: 'Gateway Offline',
    locked: 'App Locked',
    unlocked: 'Session Active',
  },
  roles: {
    owner: 'Owner (Full Access & Delete)',
    director: 'Director (Operations Only)',
  },
  nav: {
    dashboard: 'Dashboard',
    money: 'Cash & Accounts',
    transactions: 'General Ledger',
    calendar: 'Payment Calendar',
    pnl: 'Profit & Loss (P&L)',
    cashflow: 'Cash Flow (CFS)',
    balance: 'Balance Sheet',
    planFact: 'Plan vs Fact (BDR)',
    reports: 'Financial Reports',
    inventory: 'Inventory & Stock',
    aiConsultant: 'AI Financial Advisor',
    importExport: 'Import / Export',
    devicePairing: 'P2P Devices & Nodes',
    integrations: 'Integrations',
    securityAudit: 'Security & Audit',
    settings: 'Settings & Companies',
    onboarding: 'Settings',
    docs: 'System Docs',
  },
  dashboard: {
    title: 'Financial Management Dashboard',
    availableCash: 'Available Liquidity',
    availableCashHint: 'Combined real-time balances of all active accounts',
    cashWithPlanned: 'Planned 30-Day Liquidity',
    adjustedCash: 'Adjusted Safe Cash',
    incomePeriod: 'Revenue for Period',
    income: 'Income',
    expensePeriod: 'Expenses for Period',
    expenses: 'Expenses',
    operatingProfit: 'Operating Profit (EBIT)',
    receivables: 'Accounts Receivable',
    payables: 'Accounts Payable',
    overdueDebts: 'Overdue Obligations',
    stockValue: 'Stock Valuation',
    inventoryValue: 'Inventory Value',
    upcomingPayments: 'Pending Cash Outflows',
    cashGapProbability: 'Cash Gap Risk Index',
    aiAlerts: 'AI Anomaly Alerts',
    riskWarnings: 'Operational Risks',
    quickAddTransaction: 'Quick Transaction',
    filterPeriod: 'Filter Period',
    filterCurrency: 'Currency',
    filterAccount: 'Account',
    allAccounts: 'All Accounts',
  },
  transactions: {
    title: 'General Transaction Ledger',
    addTransaction: 'Record Transaction',
    voiceInput: 'Voice Entry',
    type: 'Transaction Type',
    date: 'Date & Time',
    account: 'Account',
    targetAccount: 'Transfer To',
    amount: 'Amount',
    currency: 'Currency',
    category: 'Category',
    counterparty: 'Counterparty',
    description: 'Description / Purpose',
    status: 'Status',
    actions: 'Actions',
    idempotencyKey: 'Idempotency SHA',
    filterByType: 'Filter by Type',
    filterByStatus: 'Filter by Status',
    searchPlaceholder: 'Search transactions by description, counterparty...',
    types: {
      sale: 'Sales Revenue',
      payment_receipt: 'Customer Inflow',
      income_payment: 'Customer Inflow',
      purchase: 'Procurement / Inventory',
      expense: 'Operating Expense',
      transfer: 'Account Transfer',
      owner_deposit: 'Capital Contribution',
      owner_withdrawal: 'Owner Dividend',
      loan_received: 'Loan Inflow',
      loan_repayment: 'Loan Repayment',
      tax: 'Tax & Duties',
      salary: 'Payroll & Wages',
      bank_fee: 'Bank Fee',
      acquiring_fee: 'Payment Processing Fee',
      refund: 'Refund',
      write_off: 'Write-Off',
      balance_adj: 'Balance Adjustment',
      currency_exchange: 'FX Exchange',
    },
    statuses: {
      draft: 'Draft',
      pending_approval: 'Pending Approval',
      confirmed: 'Confirmed',
      imported: 'Bank Import',
      requires_review: 'Under Review',
      cancelled: 'Cancelled',
      reconciled: 'Reconciled',
    },
  },
  calendar: {
    title: 'Payment Calendar & Liquidity Schedule',
    addPayment: 'Schedule Payment',
    scenarioBase: 'Base Scenario',
    scenarioCautious: 'Conservative (-20% Inflows)',
    scenarioOptimistic: 'Optimistic (+15% Inflows)',
    scenarioCrisis: 'Crisis Scenario',
    liquidityForecast: '30-Day Liquidity Forecast',
    cashGapAlert: 'Cash Gap Warning Detected',
    recommendedAction: 'Recommended Action',
    paymentSchedule: 'Planned Payments & Commitments',
    directionInflow: 'Inflow (+)',
    directionOutflow: 'Outflow (-)',
    dueDate: 'Due Date',
    priority: 'Priority',
    probability: 'Confidence %',
    recurrence: 'Recurrence',
    markCompleted: 'Mark Executed',
    approve: 'Approve Payment',
  },
  pnl: {
    title: 'Profit & Loss Statement (Accrual Basis)',
    revenue: 'Sales Revenue',
    cogs: 'Cost of Goods Sold (COGS)',
    grossProfit: 'Gross Profit',
    operatingExpenses: 'Operating Expenses (OPEX)',
    ebitda: 'EBITDA',
    depreciation: 'Depreciation & Amortization',
    ebit: 'Operating Profit (EBIT)',
    interestTaxes: 'Interest & Taxes',
    netProfit: 'Net Profit',
    profitability: 'Net Margin %',
    periodMonth: 'Monthly View',
    periodQuarter: 'Quarterly View',
    periodYear: 'Annual View',
  },
  cashflow: {
    title: 'Cash Flow Statement (Direct Cash Basis)',
    operatingActivity: 'Cash from Operations',
    investingActivity: 'Cash from Investing',
    financingActivity: 'Cash from Financing',
    netCashFlow: 'Net Cash Flow',
    openingBalance: 'Opening Cash Balance',
    closingBalance: 'Closing Cash Balance',
    inflow: 'Total Cash Receipts',
    outflow: 'Total Cash Payments',
    directMethod: 'Direct Calculation Method',
  },
  balance: {
    title: 'Management Balance Sheet',
    assets: 'Total Assets',
    currentAssets: 'Current Assets',
    nonCurrentAssets: 'Non-Current Assets',
    cashAndEquivalents: 'Cash & Liquid Equivalents',
    accountsReceivable: 'Trade Receivables',
    inventory: 'Inventory on Hand',
    liabilities: 'Total Liabilities',
    currentLiabilities: 'Current Liabilities',
    accountsPayable: 'Trade Payables',
    shortTermLoans: 'Short-Term Debt',
    equity: 'Shareholders Equity',
    retainedEarnings: 'Retained Earnings',
    balanceCheck: 'Accounting Equation Check',
    balanceMatch: 'Balance In Equilibrium: Assets = Liabilities + Equity',
    balanceMismatch: 'Balance Imbalance Detected',
  },
  planFact: {
    title: 'Budget vs Actual Performance (Plan-Fact)',
    monthSelector: 'Target Month',
    addRevenuePlan: 'Set Revenue Budget Target',
    revenuePlanTitle: 'Commercial Revenue: Plan vs Actual',
    expensePlanTitle: 'Operating Expenses: Plan vs Actual',
    category: 'Category / Budget Line',
    planned: 'Budget Plan',
    actual: 'Actual Ledger',
    variance: 'Variance (Delta)',
    executionPct: 'Execution %',
    status: 'Budget Status',
    favorable: 'Favorable / On Target',
    unfavorable: 'Over Budget Warning',
    onBudget: 'Within Budget',
    chartComparison: 'Visual Budget Plan vs Actual Analysis',
  },
  inventory: {
    title: 'Stock & Inventory Management',
    addItem: 'Register Item / Asset',
    runInventoryCheck: 'Stocktake Audit',
    sku: 'SKU / Barcode',
    itemName: 'Item Title',
    category: 'Item Category',
    stock: 'Quantity on Hand',
    minMax: 'Safety Thresholds',
    costPrice: 'Unit Cost Price',
    salePrice: 'Retail Price',
    totalValuation: 'Total Inventory Valuation',
    variance: 'Audit Variance',
    actualCount: 'Physical Count',
    bookCount: 'Book Balance',
  },
  ai: {
    title: 'AI Financial Advisor & Risk Monitor',
    provider: 'Engine Provider',
    model: 'Model',
    status: 'Engine Status',
    testConnection: 'Run Diagnostics',
    privacyMode: 'Zero-Knowledge Privacy',
    privacyMaskingActive: 'PII and Bank Details Masked Locally',
    allowCloud: 'Allow Encrypted Cloud Fallback',
    askQuestion: 'Ask financial question...',
    sendPrompt: 'Analyze',
    criticalWarning: 'AI insights are decision support only. All financial actions require human verification.',
    auditNotice: 'All AI requests are cryptographically audited in the local tamper-evident log.',
  },
  importExport: {
    title: 'Data Migration & Bank Statement Parser',
    stepSource: '1. Select Source',
    stepPreview: '2. Statement Preview',
    stepMapping: '3. Ledger Mapping',
    stepValidate: '4. Deduplication Engine',
    stepFinish: '5. Commit to SQLite',
    uploadFile: 'Upload Statement (CSV, 1C, OFX, MT940, JSON)',
    formatsSupported: 'Supports PrivatBank, Monobank, Raiffeisen, PKO, Revolut, CSV & MT940',
    exportCsv: 'Export Ledger to CSV',
    exportJson: 'Export Backup JSON',
    exportBackup: 'Generate Encrypted SQLite Vault',
    restoreBackup: 'Restore from Encrypted Vault',
  },
  pairing: {
    title: 'P2P Local Mesh Synchronization',
    optionA: 'Local Network Discovery & LAN Peer',
    optionB: 'Ephemeral QR-Code Handshake (60s TTL)',
    generateQr: 'Generate Pairing QR Token',
    qrValidFor: 'Pairing Token Expires in:',
    pairToken: 'Session Token:',
    scanInstruction: 'Scan this QR code using the Android ERP camera scanner.',
    pairedDevices: 'Authorized Devices & Peer Nodes',
    revokeDevice: 'Revoke Node Access',
  },
  security: {
    title: 'Security, Encryption & Audit Vault',
    pinLock: 'PIN & Biometric Protection',
    enterPin: 'Enter 4-Digit Security PIN',
    setPin: 'Change Master PIN',
    auditLog: 'Immutable SHA-256 Audit Trail',
    owaspCompliance: 'OWASP MASVS Hardened Standards',
    inactivityTimeout: 'Auto-Lock Inactivity Period',
  },
  settings: {
    title: 'ERP Settings & Multi-Business Hub',
    subtitle: 'Manage company profiles, accounting policies, currencies, accounts, chart of accounts, and security.',
    profileTab: 'Company Profile & Businesses',
    policyTab: 'Accounting Policy',
    currenciesTab: 'Currencies & Rates',
    accountsTab: 'Accounts & Wallets',
    categoriesTab: 'Chart of Accounts',
    securityTab: 'Security & Access (RBAC)',
    companies: 'Companies & Business Entities',
    addCompany: 'Add New Company',
    companyName: 'Business Name',
    legalName: 'Official Legal Entity',
    taxId: 'Tax ID / Registration #',
    country: 'Jurisdiction / Country',
    city: 'City / Office',
    accountingPolicy: 'Primary Accounting Method',
    cashBasis: 'Cash Basis (Strict Realized Cash)',
    accrualBasis: 'Accrual Basis (Recognized Income & Cost)',
    mixedBasis: 'Hybrid Management Method',
    baseCurrency: 'Reporting Currency',
    save: 'Save Changes',
    savedSuccessfully: 'Settings saved and committed to local SQLite database!',
    deleteRestricted: 'Delete operations are restricted to the Owner role only.',
  },
  login: {
    title: 'Local Authorization Vault',
    subtitle: 'Select your local profile and enter your PIN to access financial records.',
    selectUser: 'Select Account Profile',
    enterPin: 'Enter 4-Digit Security PIN',
    unlock: 'Sign In & Decrypt Database',
    wrongPin: 'Invalid PIN code. Please verify credentials.',
    switchUser: 'Switch User Profile',
    ownerBadge: 'Owner • Full Administrative & Delete Rights',
    directorBadge: 'Director • Operations & Read-Write (No Delete)',
    testPinHint: 'Test PIN: 1234 (Owner) | 5678 (Director)',
  },
  multibusiness: {
    selectCompany: 'Switch Active Business',
    addCompany: 'Add New Business Entity',
    activeCompany: 'Active Company',
    allCompanies: 'All Business Units',
    switchSuccess: 'Switched active business context successfully!',
  },
};

// RUSSIAN DICTIONARY
const ruDictionary: Partial<TranslationDictionary> = {
  appName: 'Управленческий учет',
  tagline: 'Автономная мульти-бизнес система учета для малого и среднего бизнеса',
  disclaimerNote: 'Все данные хранятся локально в СУБД SQLite со сквозным шифрованием и P2P синхронизацией.',
  status: {
    online: 'Онлайн',
    offline: 'Офлайн (Локально)',
    localAi: 'Локальный ИИ (Ollama)',
    cloudAi: 'Облачный ИИ',
    mockAi: 'Эмуляция ИИ',
    syncing: 'Синхронизация P2P...',
    synced: 'Синхронизировано',
    syncError: 'Конфликт / Ошибка синхронизации',
    bankUnavailable: 'Банк недоступен',
    paymentUnavailable: 'Эквайринг недоступен',
    locked: 'Приложение заблокировано',
    unlocked: 'Сессия активна',
  },
  roles: {
    owner: 'Владелец (Полный доступ и удаление)',
    director: 'Директор (Только операции без удаления)',
  },
  nav: {
    dashboard: 'Главный дашборд',
    money: 'Деньги и счета',
    transactions: 'Журнал операций',
    calendar: 'Платежный календарь',
    pnl: 'Прибыли и убытки (ОПУ)',
    cashflow: 'Движение денег (ДДС)',
    balance: 'Управленческий баланс',
    planFact: 'План-факт анализ (БДР)',
    reports: 'Финансовые отчеты',
    inventory: 'Склад и активы',
    aiConsultant: 'ИИ-консультант',
    importExport: 'Импорт и экспорт',
    devicePairing: 'P2P и мобильные ноды',
    integrations: 'Интеграции',
    securityAudit: 'Безопасность и аудит',
    settings: 'Настройки и бизнесы',
    onboarding: 'Настройки',
    docs: 'Документация',
  },
  dashboard: {
    title: 'Дашборд управления финансами',
    availableCash: 'Фактический остаток денег',
    availableCashHint: 'Суммарный доступный остаток на всех расчетных счетах и в кассах',
    cashWithPlanned: 'Прогноз денег через 30 дней',
    adjustedCash: 'Скорректированный остаток',
    incomePeriod: 'Выручка за период',
    income: 'Доходы',
    expensePeriod: 'Расходы за период',
    expenses: 'Расходы',
    operatingProfit: 'Операционная прибыль (EBIT)',
    receivables: 'Дебиторская задолженность',
    payables: 'Кредиторская задолженность',
    overdueDebts: 'Просроченные долги',
    stockValue: 'Остатки товаров на складе',
    inventoryValue: 'Стоимость склада',
    upcomingPayments: 'Запланированные выплаты',
    cashGapProbability: 'Риск кассового разрыва',
    aiAlerts: 'Предупреждения ИИ',
    riskWarnings: 'Операционные риски',
    quickAddTransaction: 'Быстрая операция',
    filterPeriod: 'Период отчета',
    filterCurrency: 'Валюта',
    filterAccount: 'Счет',
    allAccounts: 'Все счета предприятия',
  },
  transactions: {
    title: 'Журнал хозяйственных операций',
    addTransaction: 'Новая операция',
    voiceInput: 'Голосовой ввод',
    type: 'Тип операции',
    date: 'Дата и время',
    account: 'Счет списания',
    targetAccount: 'Счет зачисления',
    amount: 'Сумма',
    currency: 'Валюта',
    category: 'Статья учета',
    counterparty: 'Контрагент',
    description: 'Назначение платежа',
    status: 'Статус проводки',
    actions: 'Действия',
    idempotencyKey: 'Ключ дедупликации',
    filterByType: 'Фильтр по типу',
    filterByStatus: 'Фильтр по статусу',
    searchPlaceholder: 'Поиск по описанию, контрагенту или номеру...',
    types: {
      sale: 'Выручка от реализации',
      payment_receipt: 'Поступление от покупателя',
      income_payment: 'Поступление от покупателя',
      purchase: 'Закупка товаров / материалов',
      expense: 'Операционный расход (OPEX)',
      transfer: 'Перевод между своими счетами',
      owner_deposit: 'Взнос капитала владельцем',
      owner_withdrawal: 'Выплата дивидендов владельцу',
      loan_received: 'Получение кредита / займа',
      loan_repayment: 'Погашение кредита / займа',
      tax: 'Налоги и сборы',
      salary: 'Выплата заработной платы',
      bank_fee: 'Банковская комиссия',
      acquiring_fee: 'Комиссия эквайринга',
      refund: 'Возврат средств',
      write_off: 'Списание убытков',
      balance_adj: 'Корректировка остатка',
      currency_exchange: 'Валютообменная операция',
    },
    statuses: {
      draft: 'Черновик',
      pending_approval: 'На согласовании',
      confirmed: 'Подтверждена',
      imported: 'Импортирована из банка',
      requires_review: 'Требует проверки',
      cancelled: 'Отменена',
      reconciled: 'Сверена с выпиской',
    },
  },
  settings: {
    title: 'Настройки системы и Мульти-бизнес',
    subtitle: 'Управление профилями компаний, учетной политикой, счетами, статьями расходов и правами доступа.',
    profileTab: 'Профиль компании и Бизнесы',
    policyTab: 'Учетная политика',
    currenciesTab: 'Валюты и курсы',
    accountsTab: 'Счета предприятия',
    categoriesTab: 'План счетов и статьи',
    securityTab: 'Безопасность и права (RBAC)',
    companies: 'Компании и бизнес-единицы',
    addCompany: 'Добавить компанию',
    companyName: 'Название бизнеса',
    legalName: 'Юридическое наименование',
    taxId: 'ЕДРПОУ / ИНН / Регистрационный номер',
    country: 'Страна юрисдикции',
    city: 'Город / Локация',
    accountingPolicy: 'Основной метод учета',
    cashBasis: 'Кассовый метод (по факту движения денег)',
    accrualBasis: 'Метод начисления (по дате отгрузки/акта)',
    mixedBasis: 'Смешанный управленческий метод',
    baseCurrency: 'Базовая валюта учета',
    save: 'Сохранить изменения',
    savedSuccessfully: 'Настройки успешно сохранены в локальную базу SQLite!',
    deleteRestricted: 'Функция удаления доступна строго роли Владелец (Owner).',
  },
  login: {
    title: 'Локальная авторизация',
    subtitle: 'Выберите профиль пользователя и введите 4-значный PIN для расшифровки локальной базы.',
    selectUser: 'Выбор учетной записи',
    enterPin: 'Введите PIN-код',
    unlock: 'Войти в систему',
    wrongPin: 'Неверный PIN-код. Проверьте данные и повторите ввод.',
    switchUser: 'Сменить пользователя',
    ownerBadge: 'Владелец • Полные права и удаление',
    directorBadge: 'Директор • Операционный учет (без удаления)',
    testPinHint: 'Тестовый доступ: 1234 (Владелец) | 5678 (Директор)',
  },
  multibusiness: {
    selectCompany: 'Сменить активный бизнес',
    addCompany: 'Создать новую компанию',
    activeCompany: 'Активный бизнес',
    allCompanies: 'Все бизнес-единицы',
    switchSuccess: 'Активный бизнес успешно переключен!',
  },
};

// UKRAINIAN DICTIONARY
const ukDictionary: Partial<TranslationDictionary> = {
  appName: 'Управлінський облік',
  tagline: 'Автономна мульти-бізнес система обліку для малого та середнього бізнесу',
  disclaimerNote: 'Усі дані зберігаються локально в СУБД SQLite з надійним шифруванням та P2P синхронізацією.',
  status: {
    online: 'Онлайн',
    offline: 'Офлайн (Локально)',
    localAi: 'Локальний ШІ (Ollama)',
    cloudAi: 'Хмарний ШІ',
    mockAi: 'Емуляція ШІ',
    syncing: 'Синхронізація P2P...',
    synced: 'Синхронізовано',
    syncError: 'Конфлікт / Помилка синхронізації',
    bankUnavailable: 'Банк недоступний',
    paymentUnavailable: 'Еквайринг недоступний',
    locked: 'Додаток заблоковано',
    unlocked: 'Сесія активна',
  },
  roles: {
    owner: 'Власник (Повний доступ та видалення)',
    director: 'Директор (Тільки операції без видалення)',
  },
  nav: {
    dashboard: 'Головний дашборд',
    money: 'Гроші та рахунки',
    transactions: 'Журнал операцій',
    calendar: 'Платіжний календар',
    pnl: 'Прибутки та збитки (ЗПіЗ)',
    cashflow: 'Рух грошових коштів (ЗРГК)',
    balance: 'Управлінський баланс',
    planFact: 'План-факт аналіз (БДР)',
    reports: 'Фінансові звіти',
    inventory: 'Склад та залишки',
    aiConsultant: 'ШІ-консультант',
    importExport: 'Імпорт та експорт',
    devicePairing: 'P2P та мобільні ноди',
    integrations: 'Інтеграції',
    securityAudit: 'Безпека та аудит',
    settings: 'Налаштування та бізнеси',
    onboarding: 'Налаштування',
    docs: 'Документація',
  },
  settings: {
    title: 'Налаштування системи та Мульти-бізнес',
    subtitle: 'Керування профілями компаній, обліковою політикою, рахунками, статтями та правами доступу.',
    profileTab: 'Профіль компанії та Бізнеси',
    policyTab: 'Облікова політика',
    currenciesTab: 'Валюти та курси',
    accountsTab: 'Рахунки підприємства',
    categoriesTab: 'План рахунків та статті',
    securityTab: 'Безпека та права (RBAC)',
    companies: 'Компанії та бізнес-одиниці',
    addCompany: 'Додати компанію',
    companyName: 'Назва бізнесу',
    legalName: 'Юридичне найменування',
    taxId: 'ЄДРПОУ / РНОКПП',
    country: 'Країна юрисдикції',
    city: 'Місто / Локація',
    accountingPolicy: 'Основний метод обліку',
    cashBasis: 'Касовий метод (за фактом руху грошей)',
    accrualBasis: 'Метод нарахування (за датою відвантаження/акта)',
    mixedBasis: 'Змішаний управлінський метод',
    baseCurrency: 'Базова валюта обліку',
    save: 'Зберегти зміни',
    savedSuccessfully: 'Налаштування успішно збережено в локальну базу SQLite!',
    deleteRestricted: 'Функція видалення доступна виключно ролі Власник (Owner).',
  },
  login: {
    title: 'Локальна авторизація',
    subtitle: 'Оберіть профіль користувача та введіть 4-значний PIN для розшифрування бази.',
    selectUser: 'Вибір облікового запису',
    enterPin: 'Введіть PIN-код',
    unlock: 'Увійти в систему',
    wrongPin: 'Невірний PIN-код. Перевірте дані та повторіть спробу.',
    switchUser: 'Змінити користувача',
    ownerBadge: 'Власник • Повні права та видалення',
    directorBadge: 'Директор • Операційний облік (без видалення)',
    testPinHint: 'Тестовий доступ: 1234 (Власник) | 5678 (Директор)',
  },
  multibusiness: {
    selectCompany: 'Змінити активний бізнес',
    addCompany: 'Створити нову компанію',
    activeCompany: 'Активний бізнес',
    allCompanies: 'Усі бізнес-одиниці',
    switchSuccess: 'Активний бізнес успішно переключено!',
  },
};

// GERMAN DICTIONARY (DE)
const deDictionary: Partial<TranslationDictionary> = {
  appName: 'Management Accounting ERP',
  tagline: 'Autonomes Multi-Business Finanzmanagement für KMU',
  status: {
    online: 'Online',
    offline: 'Offline (Lokal)',
    localAi: 'Lokale KI (Ollama)',
    cloudAi: 'Cloud KI',
    mockAi: 'Mock KI',
    syncing: 'P2P Synchronisierung...',
    synced: 'Synchronisiert',
    syncError: 'Synchronisierungsfehler',
    bankUnavailable: 'Bank nicht erreichbar',
    paymentUnavailable: 'Zahlungs-Gateway offline',
    locked: 'App gesperrt',
    unlocked: 'Sitzung aktiv',
  },
  roles: {
    owner: 'Inhaber (Vollzugriff & Löschen)',
    director: 'Geschäftsführer (Nur Operationen)',
  },
  nav: {
    dashboard: 'Übersicht',
    money: 'Liquidität & Konten',
    transactions: 'Hauptbuch',
    calendar: 'Zahlungskalender',
    pnl: 'Gewinn- & Verlustrechnung (GuV)',
    cashflow: 'Kapitalflussrechnung',
    balance: 'Bilanz',
    planFact: 'Soll-Ist-Vergleich',
    reports: 'Finanzberichte',
    inventory: 'Lagerbestand',
    aiConsultant: 'KI-Finanzberater',
    importExport: 'Import / Export',
    devicePairing: 'P2P-Geräte',
    integrations: 'Integrationen',
    securityAudit: 'Sicherheit & Audit',
    settings: 'Einstellungen & Mandanten',
    docs: 'Dokumentation',
  },
  settings: {
    title: 'Einstellungen & Mandantenverwaltung',
    subtitle: 'Verwalten Sie Unternehmensprofile, Buchhaltungsrichtlinien, Konten und Zugriffsrechte.',
    profileTab: 'Unternehmensprofil',
    policyTab: 'Rechnungslegung',
    currenciesTab: 'Währungen & Kurse',
    accountsTab: 'Geschäftskonten',
    categoriesTab: 'Kontenrahmen',
    securityTab: 'Sicherheit & RBAC',
    companies: 'Mandanten & Gesellschaften',
    addCompany: 'Neuen Mandanten anlegen',
    companyName: 'Firmenname',
    legalName: 'Offizieller Rechtsname',
    taxId: 'Steuernummer / USt-IdNr.',
    country: 'Land',
    city: 'Stadt',
    accountingPolicy: 'Rechnungslegungsmethode',
    cashBasis: 'Ist-Versteuerung (Geldfluss)',
    accrualBasis: 'Soll-Versteuerung (Periodengerecht)',
    mixedBasis: 'Kombinierte Managementmethode',
    baseCurrency: 'Basiswährung',
    save: 'Änderungen speichern',
    savedSuccessfully: 'Einstellungen wurden in der SQLite-Datenbank gesichert!',
    deleteRestricted: 'Löschvorgänge sind streng der Inhaber-Rolle vorbehalten.',
  },
  login: {
    title: 'Lokale Autorisierung',
    subtitle: 'Wählen Sie Ihr Benutzerprofil und geben Sie die 4-stellige PIN ein.',
    selectUser: 'Benutzer auswählen',
    enterPin: 'PIN eingeben',
    unlock: 'Anmelden & Entschlüsseln',
    wrongPin: 'Falsche PIN. Bitte Eingabe wiederholen.',
    switchUser: 'Benutzer wechseln',
    ownerBadge: 'Inhaber • Vollzugriff mit Löschrechten',
    directorBadge: 'Geschäftsführer • Operativ (ohne Löschrechte)',
    testPinHint: 'Test-PIN: 1234 (Inhaber) | 5678 (Geschäftsführer)',
  },
};

// FRENCH DICTIONARY (FR)
const frDictionary: Partial<TranslationDictionary> = {
  appName: 'Comptabilité de Gestion ERP',
  tagline: 'Gestion financière multi-entreprises hors-ligne pour PME',
  roles: {
    owner: 'Propriétaire (Accès total & Suppression)',
    director: 'Directeur (Opérations sans suppression)',
  },
  nav: {
    dashboard: 'Tableau de bord',
    money: 'Trésorerie & Comptes',
    transactions: 'Grand livre',
    calendar: 'Calendrier de paiement',
    pnl: 'Compte de résultat (P&L)',
    cashflow: 'Flux de trésorerie',
    balance: 'Bilan comptable',
    planFact: 'Prévisionnel vs Réel',
    reports: 'Rapports financiers',
    inventory: 'Stocks & Actifs',
    aiConsultant: 'Conseiller IA',
    importExport: 'Import / Export',
    devicePairing: 'Appareils P2P',
    integrations: 'Intégrations',
    securityAudit: 'Sécurité & Audit',
    settings: 'Paramètres & Sociétés',
    docs: 'Documentation',
  },
  login: {
    title: 'Authentification locale',
    subtitle: 'Sélectionnez votre profil et entrez votre code PIN à 4 chiffres.',
    selectUser: 'Sélectionner un profil',
    enterPin: 'Entrer le code PIN',
    unlock: 'Connexion & Déchiffrement',
    wrongPin: 'Code PIN incorrect. Veuillez réessayer.',
    switchUser: 'Changer d utilisateur',
    ownerBadge: 'Propriétaire • Droits totaux et suppression',
    directorBadge: 'Directeur • Gestion opérationnelle',
    testPinHint: 'PIN de test : 1234 (Propriétaire) | 5678 (Directeur)',
  },
};

// SPANISH DICTIONARY (ES)
const esDictionary: Partial<TranslationDictionary> = {
  appName: 'Contabilidad de Gestión ERP',
  tagline: 'Gestión financiera local multi-empresa para PYMES',
  roles: {
    owner: 'Propietario (Acceso total y eliminación)',
    director: 'Director (Operativo sin eliminación)',
  },
  nav: {
    dashboard: 'Panel principal',
    money: 'Tesorería y Cuentas',
    transactions: 'Libro diario',
    calendar: 'Calendario de pagos',
    pnl: 'Pérdidas y Ganancias (P&G)',
    cashflow: 'Flujo de caja',
    balance: 'Balance general',
    planFact: 'Plan vs Real',
    reports: 'Informes',
    inventory: 'Inventario',
    aiConsultant: 'Asesor IA',
    importExport: 'Importar / Exportar',
    devicePairing: 'Dispositivos P2P',
    integrations: 'Integraciones',
    securityAudit: 'Seguridad y Auditoría',
    settings: 'Configuración y Empresas',
    docs: 'Documentación',
  },
  login: {
    title: 'Autorización local',
    subtitle: 'Seleccione su perfil e ingrese su PIN de 4 dígitos.',
    selectUser: 'Seleccionar cuenta',
    enterPin: 'Ingresar PIN',
    unlock: 'Iniciar sesión y descifrar',
    wrongPin: 'PIN incorrecto. Inténtelo de nuevo.',
    switchUser: 'Cambiar de usuario',
    ownerBadge: 'Propietario • Acceso total y eliminación',
    directorBadge: 'Director • Solo operaciones',
    testPinHint: 'PIN de prueba: 1234 (Propietario) | 5678 (Director)',
  },
};

// ITALIAN DICTIONARY (IT)
const itDictionary: Partial<TranslationDictionary> = {
  appName: 'Contabilità Direzionale ERP',
  tagline: 'Gestione finanziaria multi-aziendale offline per PMI',
  roles: {
    owner: 'Proprietario (Accesso totale & Cancellazione)',
    director: 'Direttore (Operazioni senza cancellazione)',
  },
  nav: {
    dashboard: 'Dashboard',
    money: 'Tesoreria & Conti',
    transactions: 'Libro mastro',
    calendar: 'Scadenzario pagamenti',
    pnl: 'Conto economico',
    cashflow: 'Rendiconto finanziario',
    balance: 'Stato patrimoniale',
    planFact: 'Budget vs Consuntivo',
    reports: 'Reportistica',
    inventory: 'Magazzino',
    aiConsultant: 'Consulente IA',
    importExport: 'Importa / Esporta',
    devicePairing: 'Dispositivi P2P',
    integrations: 'Integrazioni',
    securityAudit: 'Sicurezza & Audit',
    settings: 'Impostazioni & Aziende',
    docs: 'Documentazione',
  },
  login: {
    title: 'Autorizzazione locale',
    subtitle: 'Seleziona il profilo utente e inserisci il PIN di 4 cifre.',
    selectUser: 'Seleziona profilo',
    enterPin: 'Inserisci PIN',
    unlock: 'Accedi & Decifra',
    wrongPin: 'PIN errato. Riprova.',
    switchUser: 'Cambia utente',
    ownerBadge: 'Proprietario • Diritti completi',
    directorBadge: 'Direttore • Solo operativo',
    testPinHint: 'PIN di test: 1234 (Proprietario) | 5678 (Direttore)',
  },
};

// POLISH DICTIONARY (PL)
const plDictionary: Partial<TranslationDictionary> = {
  appName: 'Rachunkowość Zarządcza ERP',
  tagline: 'Autonomiczne zarządzanie finansami wielu firm dla MŚP',
  roles: {
    owner: 'Właściciel (Pełny dostęp i usuwanie)',
    director: 'Dyrektor (Tylko operacje bez usuwania)',
  },
  nav: {
    dashboard: 'Pulpit',
    money: 'Środki i rachunki',
    transactions: 'Księga główna',
    calendar: 'Kalendarz płatności',
    pnl: 'Rachunek zysków i strat (RZiS)',
    cashflow: 'Przepływy pieniężne (Cash Flow)',
    balance: 'Bilans zarządczy',
    planFact: 'Plan vs Wykonanie',
    reports: 'Raporty finansowe',
    inventory: 'Magazyn i zapasy',
    aiConsultant: 'Doradca AI',
    importExport: 'Import / Eksport',
    devicePairing: 'Węzły P2P',
    integrations: 'Integracje',
    securityAudit: 'Bezpieczeństwo i audyt',
    settings: 'Ustawienia i firmy',
    docs: 'Dokumentacja',
  },
  login: {
    title: 'Autoryzacja lokalna',
    subtitle: 'Wybierz profil użytkownika i wprowadź 4-cyfrowy kod PIN.',
    selectUser: 'Wybierz profil',
    enterPin: 'Wprowadź kod PIN',
    unlock: 'Zaloguj i odszyfruj',
    wrongPin: 'Nieprawidłowy kod PIN. Spróbuj ponownie.',
    switchUser: 'Zmień użytkownika',
    ownerBadge: 'Właściciel • Pełne prawa i usuwanie',
    directorBadge: 'Dyrektor • Działania operacyjne',
    testPinHint: 'Testowy PIN: 1234 (Właściciel) | 5678 (Dyrektor)',
  },
};

// ROMANIAN DICTIONARY (RO)
const roDictionary: Partial<TranslationDictionary> = {
  appName: 'Contabilitate de Gestiune ERP',
  tagline: 'Management financiar multi-afacere offline pentru IMM-uri',
  roles: {
    owner: 'Proprietar (Acces complet și ștergere)',
    director: 'Director (Doar operațiuni fără ștergere)',
  },
  nav: {
    dashboard: 'Tablou de bord',
    money: 'Numerar & Conturi',
    transactions: 'Jurnal de tranzacții',
    calendar: 'Calendar de plăți',
    pnl: 'Profit și pierdere (P&L)',
    cashflow: 'Flux de numerar',
    balance: 'Bilanț contabil',
    planFact: 'Plan vs Fapt',
    reports: 'Rapoarte financiare',
    inventory: 'Stocuri și inventar',
    aiConsultant: 'Consultant AI',
    importExport: 'Import / Export',
    devicePairing: 'Dispozitive P2P',
    integrations: 'Integrări',
    securityAudit: 'Securitate & Audit',
    settings: 'Setări & Companii',
    docs: 'Documentație',
  },
  login: {
    title: 'Autorizare locală',
    subtitle: 'Selectați profilul de utilizator și introduceți codul PIN din 4 cifre.',
    selectUser: 'Selectează profil',
    enterPin: 'Introdu codul PIN',
    unlock: 'Autentificare și decriptare',
    wrongPin: 'Cod PIN incorect. Vă rugăm să reîncercați.',
    switchUser: 'Schimbă utilizatorul',
    ownerBadge: 'Proprietar • Drepturi depline și ștergere',
    directorBadge: 'Director • Doar operațiuni',
    testPinHint: 'PIN de test: 1234 (Proprietar) | 5678 (Director)',
  },
};

// DUTCH DICTIONARY (NL)
const nlDictionary: Partial<TranslationDictionary> = {
  appName: 'Management Accounting ERP',
  tagline: 'Autonoom multi-bedrijf financieel beheer voor MKB',
  roles: {
    owner: 'Eigenaar (Volledige toegang & Verwijderen)',
    director: 'Directeur (Alleen beheer zonder verwijderen)',
  },
  nav: {
    dashboard: 'Dashboard',
    money: 'Geld & Rekeningen',
    transactions: 'Grootboek',
    calendar: 'Betalingskalender',
    pnl: 'Winst & Verlies (W&V)',
    cashflow: 'Kasstroomoverzicht',
    balance: 'Balans',
    planFact: 'Begroting vs Werkelijkheid',
    reports: 'Financiële rapporten',
    inventory: 'Voorraad & Activa',
    aiConsultant: 'AI Financieel Adviseur',
    importExport: 'Import / Export',
    devicePairing: 'P2P Apparaten',
    integrations: 'Integraties',
    securityAudit: 'Beveiliging & Audit',
    settings: 'Instellingen & Bedrijven',
    docs: 'Documentatie',
  },
  login: {
    title: 'Lokale autorisatie',
    subtitle: 'Selecteer uw profiel en voer de 4-cijferige pincode in.',
    selectUser: 'Selecteer profiel',
    enterPin: 'Voer pincode in',
    unlock: 'Inloggen & Ontsleutelen',
    wrongPin: 'Onjuiste pincode. Probeer het opnieuw.',
    switchUser: 'Wissel van gebruiker',
    ownerBadge: 'Eigenaar • Volledig beheer inclusief verwijderen',
    directorBadge: 'Directeur • Operationeel (geen verwijderrechten)',
    testPinHint: 'Test-pincode: 1234 (Eigenaar) | 5678 (Directeur)',
  },
};

const rawDictionaries: Record<SupportedLocale, Partial<TranslationDictionary>> = {
  en: enDictionary,
  ru: ruDictionary,
  uk: ukDictionary,
  de: deDictionary,
  fr: frDictionary,
  es: esDictionary,
  it: itDictionary,
  pl: plDictionary,
  ro: roDictionary,
  nl: nlDictionary,
};

/**
 * Returns a fully hydrated TranslationDictionary for any European language,
 * automatically falling back to English (en) for any missing keys.
 */
export function getTranslation(locale: SupportedLocale): TranslationDictionary {
  const target = rawDictionaries[locale] || rawDictionaries.en;
  return deepMerge(enDictionary, target);
}
`;

fs.writeFileSync('src/i18n/index.ts', fileContent, 'utf8');
console.log('src/i18n/index.ts generated successfully!');
