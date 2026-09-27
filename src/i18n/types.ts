/**
 * TypeScript types and schemas for the ERP i18n system.
 * Strictly 3 supported languages: Russian (RU), Ukrainian (UK), English (EN).
 */

export type SupportedLocale = 'ru' | 'uk' | 'en';
export type LocaleKey = SupportedLocale;

export interface CommonTranslations {
  save: string;
  cancel: string;
  delete: string;
  edit: string;
  add: string;
  confirm: string;
  confirmPosting: string;
  close: string;
  back: string;
  next: string;
  export: string;
  import: string;
  filter: string;
  search: string;
  all: string;
  date: string;
  amount: string;
  status: string;
  actions: string;
  period: string;
  currency: string;
  account: string;
  loading: string;
  success: string;
  error: string;
  warning: string;
  info: string;
  yes: string;
  no: string;
  active: string;
  inactive: string;
  total: string;
  subtotal: string;
  emptyData: string;
  dynamics: string;
  responsibilityNote: string;
  allAccounts: string;
  responsiblePerson: string;
  description: string;
  type: string;
  category: string;
  counterparty: string;
  notes: string;
  refresh: string;
  copy: string;
  copied: string;
  id: string;
  view: string;
  details: string;
  month: string;
  year: string;
  quarter: string;
  week: string;
  day: string;
  days: string;
  hours: string;
  minutes: string;
  consolidated: string;
  vsPreviousPeriod: string;
  vsPrevious7d: string;
  vsPrevious30d: string;
  vsPreviousQuarter: string;
  vsPreviousYear: string;
  percentagePoint: string;
  units: {
    pcs: string;
    kg: string;
    meter: string;
    liter: string;
    hour: string;
    day: string;
    month: string;
    year: string;
  };
  periods: {
    d7: string;
    d30: string;
    quarter: string;
    year: string;
    all: string;
  };
}

export interface ChartsTranslations {
  cashFlow: string;
  cashFlowDynamics: string;
  incomeExpense: string;
  operatingProfit: string;
  breakEven: string;
  planVsFact: string;
  liquidityForecast: string;
  inflow: string;
  outflow: string;
  netCashFlow: string;
  balance: string;
  revenue: string;
  expenses: string;
  profit: string;
  margin: string;
  fixedCosts: string;
  variableCosts: string;
  safetyMargin: string;
  safetyMarginValue: string;
  safetyMarginPct: string;
  breakEvenPoint: string;
  coverageRatio: string;
  safeZone: string;
  dangerZone: string;
  week: string;
  month: string;
  quarter: string;
  year: string;
  axisDate: string;
  axisAmount: string;
  legend: string;
  tooltip: string;
  planned: string;
  actual: string;
  forecast: string;
  revenueExpenses: string;
  plannedOutflows: string;
  inflowDynamics: string;
  outflowDynamics: string;
}

export interface DashboardTranslations {
  title: string;
  financialSummarySubtitle: string;
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
  breakEvenAnalysis: string;
  breakEvenSubtitle: string;
  contributionMargin: string;
  fixedCostCoverage: string;
  safeCashBuffer: string;
  responsibilityNotice: string;
  charts: ChartsTranslations;
}

export interface TransactionsTranslations {
  title: string;
  subtitle: string;
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
  defaultAccount: string;
  noTransactions: string;
  confirmDelete: string;
  types: Record<string, string>;
  statuses: Record<string, string>;
  modal: {
    titleNew: string;
    titleEdit: string;
    direction: string;
    chooseAccount: string;
    chooseTargetAccount: string;
    chooseCategory: string;
    chooseCounterparty: string;
    enterAmount: string;
    enterDescription: string;
    submit: string;
    cancel: string;
  };
}

export interface CalendarTranslations {
  title: string;
  subtitle: string;
  addPayment: string;
  scenarioBase: string;
  scenarioCautious: string;
  scenarioOptimistic: string;
  scenarioCrisis: string;
  liquidityForecast: string;
  cashGapAlert: string;
  cashGapSafe: string;
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
  plannedDate: string;
  daysRemaining: string;
  forecastDay: string;
  startingBalance: string;
  endingBalance: string;
  modal: {
    titleNew: string;
    titleEdit: string;
    chooseDirection: string;
    priorityLow: string;
    priorityMedium: string;
    priorityHigh: string;
    priorityUrgent: string;
    submit: string;
    cancel: string;
  };
}

export interface PnlTranslations {
  title: string;
  subtitle: string;
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
  exportCsv: string;
  breakdown: string;
  marginRate: string;
}

export interface CashflowTranslations {
  title: string;
  subtitle: string;
  operatingActivity: string;
  investingActivity: string;
  financingActivity: string;
  netCashFlow: string;
  openingBalance: string;
  closingBalance: string;
  inflow: string;
  outflow: string;
  directMethod: string;
  customerReceipts: string;
  supplierPayments: string;
  rentPayments: string;
  salaryPayments: string;
  taxPayments: string;
  bankFeePayments: string;
  otherOpexPayments: string;
  investingInflows: string;
  investingPayments: string;
  loansReceived: string;
  ownerDeposits: string;
  loansRepaid: string;
  ownerWithdrawals: string;
  exportCsv: string;
  periodLabel: string;
  directMethodNote: string;
}

export interface BalanceTranslations {
  title: string;
  subtitle: string;
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
  structureRatio: string;
}

export interface PlanFactTranslations {
  title: string;
  subtitle: string;
  monthSelector: string;
  addRevenuePlan: string;
  addExpensePlan: string;
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
  modalTitle: string;
}

export interface InventoryTranslations {
  title: string;
  subtitle: string;
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
  stockOk: string;
  stockLow: string;
  stockCritical: string;
  modal: {
    newItemTitle: string;
    skuPlaceholder: string;
    namePlaceholder: string;
    unitLabel: string;
    minQtyLabel: string;
    costLabel: string;
    priceLabel: string;
    save: string;
    cancel: string;
  };
}

export interface AiTranslations {
  title: string;
  subtitle: string;
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
  quickQuestionsTitle: string;
  disclaimer: string;
}

export interface ImportExportTranslations {
  title: string;
  subtitle: string;
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
  encodingNotice: string;
  dragDropText: string;
  processStatement: string;
  totalParsed: string;
  duplicatesSkipped: string;
}

export interface PairingTranslations {
  title: string;
  subtitle: string;
  optionA: string;
  optionB: string;
  generateQr: string;
  qrValidFor: string;
  pairToken: string;
  scanInstruction: string;
  pairedDevices: string;
  revokeDevice: string;
  activeNodes: string;
  hardwareKey: string;
  p2pZeroKnowledge: string;
}

export interface SecurityTranslations {
  title: string;
  subtitle: string;
  pinLock: string;
  enterPin: string;
  setPin: string;
  auditLog: string;
  owaspCompliance: string;
  inactivityTimeout: string;
  rbacMatrix: string;
  roleOwner: string;
  roleDirector: string;
  actionPermitted: string;
  actionRestricted: string;
}

export interface SettingsTranslations {
  title: string;
  subtitle: string;
  profileTab: string;
  policyTab: string;
  currenciesTab: string;
  accountsTab: string;
  categoriesTab: string;
  securityTab: string;
  companies: string;
  accountingPolicy: string;
  currencies: string;
  accounts: string;
  categories: string;
  security: string;
  addCompany: string;
  taxId: string;
  country: string;
  city: string;
  currencyLabel: string;
  policyLabel: string;
  methodAccrual: string;
  methodCash: string;
  methodMixed: string;
  minReserve: string;
  cashGapDays: string;
  savePolicy: string;
  activeBusiness: string;
  switchBusiness: string;
}

export interface LoginTranslations {
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
}

export interface NotificationsTranslations {
  cashGapRiskTitle: string;
  cashGapRiskMsg: string;
  overdueDebtTitle: string;
  overdueDebtMsg: string;
  syncCompleteTitle: string;
  syncCompleteMsg: string;
  txSavedTitle: string;
  txSavedMsg: string;
  backupCreatedTitle: string;
  backupCreatedMsg: string;
  languageChanged: string;
}

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
  common: CommonTranslations;
  charts: ChartsTranslations;
  dashboard: DashboardTranslations;
  transactions: TransactionsTranslations;
  calendar: CalendarTranslations;
  pnl: PnlTranslations;
  cashflow: CashflowTranslations;
  balance: BalanceTranslations;
  planFact: PlanFactTranslations;
  inventory: InventoryTranslations;
  ai: AiTranslations;
  importExport: ImportExportTranslations;
  pairing: PairingTranslations;
  security: SecurityTranslations;
  settings: SettingsTranslations;
  login: LoginTranslations;
  notifications: NotificationsTranslations;
}

/**
 * Callable translation function that ALSO exposes all dictionary namespace properties.
 * E.g.:
 * t('dashboard.availableCash') -> string
 * t('common.units.pcs') -> string
 * t('notifications.cashGapRiskMsg', { days: 5 }) -> string
 * t.nav.dashboard -> string
 */
export type TranslationFunction = ((
  key: string,
  paramsOrFallback?: Record<string, any> | string,
  fallback?: string
) => string) &
  TranslationDictionary & {
    locale: SupportedLocale;
    t: (key: string, paramsOrFallback?: Record<string, any> | string, fallback?: string) => string;
  };
