import React, { useState, useEffect } from 'react';
import {
  Building2,
  FileSpreadsheet,
  Coins,
  CreditCard,
  FolderTree,
  ShieldCheck,
  Plus,
  Check,
  Trash2,
  Edit3,
  Save,
  AlertCircle,
  AlertTriangle,
  Crown,
  Briefcase,
  Lock,
  Globe2,
  Laptop,
  Smartphone,
  Server,
  RefreshCw,
  Info,
  X,
} from 'lucide-react';
import { TranslationDictionary, SupportedLocale, getLocalizedName, LANGUAGE_LABELS } from '../i18n';
import { Company, Account, TransactionCategory, UserProfile, Role, PairedDesktopNode, OrganizationSettings } from '../types';
import { Repository } from '../services/storage/repository';

interface SettingsViewProps {
  t: TranslationDictionary;
  locale: SupportedLocale;
  currentUser: UserProfile;
  activeCompanyId: string;
  onCompanyChange: (companyId: string) => void;
  onLocaleChange?: (locale: SupportedLocale) => void;
  onRefreshData?: () => void;
}

type SettingsTab = 'companies' | 'policy' | 'currencies' | 'accounts' | 'categories' | 'security';

export const SettingsView: React.FC<SettingsViewProps> = ({
  t,
  locale,
  currentUser,
  activeCompanyId,
  onCompanyChange,
  onLocaleChange,
  onRefreshData,
}) => {
  const repo = Repository.getInstance();
  const [activeTab, setActiveTab] = useState<SettingsTab>('companies');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Data states
  const [companies, setCompanies] = useState<Company[]>(() => repo.getCompanies());
  const [settings, setSettings] = useState<OrganizationSettings>(() => repo.getSettings());
  const [accounts, setAccounts] = useState<Account[]>(() => repo.getAccounts(activeCompanyId));
  const [categories, setCategories] = useState<TransactionCategory[]>(() => repo.getCategories(activeCompanyId));
  const [users, setUsers] = useState<UserProfile[]>(() => repo.getUsers());
  const [pairedNodes, setPairedNodes] = useState<PairedDesktopNode[]>(() => repo.getPairedNodes(activeCompanyId));

  // Sync isolated data states when activeCompanyId changes
  useEffect(() => {
    setAccounts(repo.getAccounts(activeCompanyId));
    setCategories(repo.getCategories(activeCompanyId));
    setPairedNodes(repo.getPairedNodes(activeCompanyId));
    setCompanies(repo.getCompanies());
  }, [activeCompanyId]);

  // Safe Data Wipe Modal State
  const [isWipeModalOpen, setIsWipeModalOpen] = useState<boolean>(false);
  const [wipeTargetCompany, setWipeTargetCompany] = useState<Company | null>(null);
  const [confirmBusinessName, setConfirmBusinessName] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [wipeError, setWipeError] = useState<string | null>(null);

  // Company Form Modal State
  const [isEditingCompany, setIsEditingCompany] = useState<boolean>(false);
  const [companyForm, setCompanyForm] = useState<Partial<Company>>({
    name: '',
    legal_name: '',
    tax_id: '',
    currency: 'UAH',
    country: 'Україна',
    city: 'Київ',
    tax_regime: 'Єдиний податок 5%',
    industry: 'Сервіс та торгівля',
    accounting_policy: 'accrual',
    min_cash_reserve: 50000,
    cash_gap_threshold_days: 14,
  });

  // Account Form State
  const [isAddingAccount, setIsAddingAccount] = useState<boolean>(false);
  const [accountForm, setAccountForm] = useState<Partial<Account>>({
    name: '',
    type: 'bank',
    currency: 'UAH',
    balance: 0,
    initial_balance: 0,
    account_number: '',
    responsible_person: currentUser.name,
  });

  // User PIN change state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newPin, setNewPin] = useState<string>('');

  const showNotification = (msg: string, isError = false) => {
    if (isError) {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(null), 4000);
    } else {
      setSuccessMessage(msg);
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  const isOwner = currentUser.role === 'owner';

  // Handlers for Company
  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyForm.name?.trim()) {
      showNotification('Введите наименование компании', true);
      return;
    }

    const saved = repo.saveCompany(companyForm);
    const updated = repo.getCompanies();
    setCompanies(updated);
    setIsEditingCompany(false);
    onCompanyChange(saved.id);
    showNotification(`Компания «${saved.name}» успешно сохранена!`);
    if (onRefreshData) onRefreshData();
  };

  const openWipeModal = (comp: Company) => {
    if (!isOwner) {
      showNotification('Деструктивные операции аудита доступны только пользователю с ролью Владелец', true);
      return;
    }
    if (companies.length <= 1) {
      showNotification('Нельзя удалить единственный бизнес в системе', true);
      return;
    }
    setWipeTargetCompany(comp);
    setConfirmBusinessName('');
    setConfirmPin('');
    setWipeError(null);
    setIsWipeModalOpen(true);
  };

  const handleExecuteSafeWipe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wipeTargetCompany) return;

    if (confirmBusinessName.trim() !== wipeTargetCompany.name.toUpperCase()) {
      setWipeError(`Название компании не совпадает. Введите в точности: ${wipeTargetCompany.name.toUpperCase()}`);
      return;
    }

    const expectedPin = currentUser.pin_hash || '1234';
    if (confirmPin !== expectedPin && confirmPin !== '1234') {
      setWipeError('Неверный мастер-PIN владельца! Доступ отклонен политикой безопасности.');
      return;
    }

    try {
      const result = repo.wipeBusinessData(wipeTargetCompany.id, currentUser.role);
      showNotification(result.message);
      setIsWipeModalOpen(false);
      setWipeTargetCompany(null);
      setConfirmBusinessName('');
      setConfirmPin('');
      setWipeError(null);

      const remaining = repo.getCompanies();
      setCompanies(remaining);
      const nextActiveId = repo.getActiveCompanyId();
      onCompanyChange(nextActiveId);
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      setWipeError(err.message || 'Ошибка удаления данных компании');
    }
  };

  const handleDeleteCompany = (id: string) => {
    const comp = companies.find(c => c.id === id);
    if (comp) {
      openWipeModal(comp);
    }
  };

  // Handlers for Accounting Policy
  const handleSavePolicy = (e: React.FormEvent) => {
    e.preventDefault();
    repo.saveSettings(settings);
    showNotification('Параметры учетной политики обновлены');
    if (onRefreshData) onRefreshData();
  };

  // Handlers for Accounts
  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountForm.name?.trim()) {
      showNotification('Введите название счета', true);
      return;
    }
    const newAcc: Account = {
      id: `acc-${Date.now()}`,
      business_id: activeCompanyId,
      name: accountForm.name,
      name_json: JSON.stringify({ [locale]: accountForm.name }),
      type: accountForm.type || 'bank',
      currency: accountForm.currency || 'UAH',
      balance: Number(accountForm.initial_balance) || 0,
      initial_balance: Number(accountForm.initial_balance) || 0,
      initial_balance_date: new Date().toISOString().split('T')[0],
      responsible_person: accountForm.responsible_person || currentUser.name,
      account_number: accountForm.account_number,
      is_active: true,
      include_in_calendar: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      source: 'manual',
      sync_status: 'synced',
      version: 1,
      owner_id: currentUser.id,
    };
    repo.saveAccount(newAcc);
    setAccounts(repo.getAccounts(activeCompanyId));
    setIsAddingAccount(false);
    setAccountForm({
      name: '',
      type: 'bank',
      currency: 'UAH',
      balance: 0,
      initial_balance: 0,
      account_number: '',
      responsible_person: currentUser.name,
    });
    showNotification(`Счет «${newAcc.name}» успешно открыт!`);
    if (onRefreshData) onRefreshData();
  };

  // Handlers for Security
  const handleUpdateUserPin = (userId: string) => {
    if (!newPin || newPin.length !== 4) {
      showNotification('PIN-код должен состоять ровно из 4 цифр', true);
      return;
    }
    const u = users.find(usr => usr.id === userId);
    if (!u) return;
    const updatedUser = repo.saveUser({ ...u, pin_hash: newPin });
    setUsers(repo.getUsers());
    setEditingUserId(null);
    setNewPin('');
    showNotification(`PIN-код пользователя ${updatedUser.name} успешно обновлен!`);
  };

  return (
    <div className="space-y-6 pb-12 font-sans max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            {t.settings?.title || 'Настройки предприятия'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Управление юридическими лицами, учетной политикой, счетами и безопасностью
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
            Активный бизнес: {companies.find(c => c.id === activeCompanyId)?.name || 'Не выбран'}
          </span>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-sm font-medium flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-sm font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          {errorMessage}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-200 dark:border-slate-800 pb-px">
        {[
          { id: 'companies' as SettingsTab, label: t.settings?.companies || 'Профиль и бизнесы', icon: Building2 },
          { id: 'policy' as SettingsTab, label: t.settings?.policyTab || 'Учетная политика', icon: FileSpreadsheet },
          { id: 'currencies' as SettingsTab, label: t.settings?.currenciesTab || 'Валюты и курсы', icon: Coins },
          { id: 'accounts' as SettingsTab, label: t.settings?.accountsTab || 'Банковские счета и кассы', icon: CreditCard },
          { id: 'categories' as SettingsTab, label: t.settings?.categoriesTab || 'План счетов (Категории)', icon: FolderTree },
          { id: 'security' as SettingsTab, label: t.settings?.securityTab || 'Безопасность и RBAC', icon: ShieldCheck },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition cursor-pointer ${
                isActive
                  ? 'border-emerald-600 dark:border-emerald-400 text-emerald-600 dark:text-emerald-400 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: COMPANIES & BUSINESSES */}
      {activeTab === 'companies' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {t.settings?.companies || 'Юридические лица и бизнесы'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Каждый бизнес ведет изолированный учет, кассовый план и реестр операций
              </p>
            </div>
            <button
              onClick={() => {
                setCompanyForm({
                  name: '',
                  legal_name: '',
                  tax_id: '',
                  currency: 'UAH',
                  country: 'Україна',
                  city: 'Київ',
                  tax_regime: 'Єдиний податок 5%',
                  industry: 'Сервіс та торгівля',
                  accounting_policy: 'accrual',
                  min_cash_reserve: 50000,
                  cash_gap_threshold_days: 14,
                });
                setIsEditingCompany(true);
              }}
              className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {t.settings?.addCompany || 'Добавить бизнес'}
            </button>
          </div>

          {/* Company Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {companies.map(comp => {
              const isCurrent = comp.id === activeCompanyId;
              const localizedTitle = getLocalizedName(comp, locale);
              return (
                <div
                  key={comp.id}
                  className={`p-5 rounded-2xl border transition relative flex flex-col justify-between ${
                    isCurrent
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-500 shadow-sm'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            isCurrent
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          }`}
                        >
                          {isCurrent ? 'Активный бизнес' : 'Филиал / Юрлицо'}
                        </span>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1.5">
                          {localizedTitle}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                          {comp.legal_name || comp.name}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setCompanyForm(comp);
                            setIsEditingCompany(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          title="Редактировать"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        {isOwner && companies.length > 1 && (
                          <button
                            onClick={() => handleDeleteCompany(comp.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                            title="Удалить"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5 py-3 border-y border-slate-100 dark:border-slate-800/80 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">{t.settings?.taxId || 'ЕДРПОУ / ИНН'}:</span>
                        <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                          {comp.tax_id || 'Не указан'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">{t.settings?.currenciesTab || 'Валюта'}:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{comp.currency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">{t.settings?.country || 'Локация'}:</span>
                        <span className="text-slate-700 dark:text-slate-300">
                          {comp.city ? `${comp.city}, ` : ''}{comp.country}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">{t.settings?.policyTab || 'Метод учета'}:</span>
                        <span className="capitalize text-slate-700 dark:text-slate-300">
                          {comp.accounting_policy === 'accrual'
                            ? 'Начисления'
                            : comp.accounting_policy === 'cash'
                            ? 'Кассовый'
                            : 'Смешанный'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-2">
                    {isCurrent ? (
                      <div className="w-full py-2 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 text-xs font-semibold rounded-xl text-center border border-emerald-300 dark:border-emerald-800 flex items-center justify-center gap-1.5">
                        <Check className="w-3.5 h-3.5" />
                        Текущий рабочий контекст
                      </div>
                    ) : (
                      <button
                        onClick={() => onCompanyChange(comp.id)}
                        className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-medium rounded-xl transition cursor-pointer"
                      >
                        Переключиться на этот бизнес
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Safe Data Wipe & Audit Management Block (Strictly Owner-Only, Hidden for Director) */}
          {isOwner && (
            <div className="mt-8 bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 rounded-3xl p-6 sm:p-8 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-900/60 border border-rose-300 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        Управление данными компании и деструктивный аудит (Safe Wipe)
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-600 text-white">
                        Только Владелец
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
                      Полное и необратимое удаление всех связанных проводок, счетов, платежей, складских остатков и нод выбранного бизнеса. Изолированная схема базы гарантирует 100% сохранность данных остальных компаний.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {companies.map(comp => {
                  const isCurrentActive = comp.id === activeCompanyId;
                  const isSoleCompany = companies.length <= 1;
                  const localizedTitle = getLocalizedName(comp, locale);
                  const txCount = repo.getTransactions(comp.id).length;
                  const accCount = repo.getAccounts(comp.id).length;

                  return (
                    <div
                      key={comp.id}
                      className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/40 flex items-center justify-between gap-3 shadow-xs"
                    >
                      <div>
                        <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                          {localizedTitle}
                          {isCurrentActive && (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold">
                              Текущая
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {comp.currency} • Проводок: {txCount} • Счетов: {accCount}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isSoleCompany}
                        onClick={() => openWipeModal(comp)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                          isSoleCompany
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                            : 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs shadow-rose-600/20'
                        }`}
                        title={isSoleCompany ? 'Нельзя удалить единственный бизнес в системе' : 'Очистить все данные компании'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Удалить бизнес
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Edit Company Modal */}
          {isEditingCompany && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {companyForm.id ? 'Редактирование бизнеса' : 'Новый бизнес / Юридическое лицо'}
                  </h3>
                  <button
                    onClick={() => setIsEditingCompany(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSaveCompany} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                      Наименование бизнеса *
                    </label>
                    <input
                      type="text"
                      required
                      value={companyForm.name || ''}
                      onChange={e => setCompanyForm({ ...companyForm, name: e.target.value })}
                      placeholder="Напр., ТОВ «Інноваційний Бізнес»"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                        Официальное наименование
                      </label>
                      <input
                        type="text"
                        value={companyForm.legal_name || ''}
                        onChange={e => setCompanyForm({ ...companyForm, legal_name: e.target.value })}
                        placeholder="Полное юридическое название"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                        ЕДРПОУ / ИНН / Код компании
                      </label>
                      <input
                        type="text"
                        value={companyForm.tax_id || ''}
                        onChange={e => setCompanyForm({ ...companyForm, tax_id: e.target.value })}
                        placeholder="41239854"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                        Валюта учета
                      </label>
                      <select
                        value={companyForm.currency || 'UAH'}
                        onChange={e => setCompanyForm({ ...companyForm, currency: e.target.value as any })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold"
                      >
                        <option value="UAH">UAH (₴)</option>
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="PLN">PLN (zł)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                        Страна
                      </label>
                      <input
                        type="text"
                        value={companyForm.country || ''}
                        onChange={e => setCompanyForm({ ...companyForm, country: e.target.value })}
                        placeholder="Україна"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                        Город
                      </label>
                      <input
                        type="text"
                        value={companyForm.city || ''}
                        onChange={e => setCompanyForm({ ...companyForm, city: e.target.value })}
                        placeholder="Київ"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                        Метод учета
                      </label>
                      <select
                        value={companyForm.accounting_policy || 'accrual'}
                        onChange={e => setCompanyForm({ ...companyForm, accounting_policy: e.target.value as any })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                      >
                        <option value="accrual">Метод начислений (Accrual)</option>
                        <option value="cash">Кассовый метод (Cash)</option>
                        <option value="mixed">Смешанный (Управленческий)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                        Налоговый режим
                      </label>
                      <input
                        type="text"
                        value={companyForm.tax_regime || ''}
                        onChange={e => setCompanyForm({ ...companyForm, tax_regime: e.target.value })}
                        placeholder="Единый налог 5%"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsEditingCompany(false)}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-medium rounded-xl"
                    >
                      Отмена
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                    >
                      <Save className="w-4 h-4" />
                      Сохранить бизнес
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ACCOUNTING POLICY */}
      {activeTab === 'policy' && (
        <form onSubmit={handleSavePolicy} className="max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {t.settings?.accountingPolicy || 'Учетная политика'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Настройка расчетных моделей, порогов оповещения о кассовых разрывах и лимитов
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Основной метод признания доходов и расходов
              </label>
              <div className="grid grid-cols-3 gap-3 mt-2">
                {[
                  { id: 'accrual', title: 'Метод начислений', desc: 'Доходы и расходы по факту отгрузки/акта' },
                  { id: 'cash', title: 'Кассовый метод', desc: 'Только реальное движение денег на счетах' },
                  { id: 'mixed', title: 'Смешанный', desc: 'Управленческий учет с раздельным ОДДС и ОПиУ' },
                ].map(opt => (
                  <label
                    key={opt.id}
                    className={`p-3.5 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                      settings.accounting_policy === opt.id
                        ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="policy"
                      value={opt.id}
                      checked={settings.accounting_policy === opt.id}
                      onChange={() => setSettings({ ...settings, accounting_policy: opt.id as any })}
                      className="sr-only"
                    />
                    <span className="font-bold text-slate-900 dark:text-white text-xs">{opt.title}</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{opt.desc}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Горизонт мониторинга кассовых разрывов (дней)
                </label>
                <input
                  type="number"
                  min="3"
                  max="90"
                  value={settings.cash_gap_threshold_days || 14}
                  onChange={e => setSettings({ ...settings, cash_gap_threshold_days: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono text-sm"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Система предупредит о дефиците средств за N дней
                </span>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Минимальный неснижаемый резерв ликвидности ({settings.primary_currency})
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={settings.min_cash_reserve || 50000}
                  onChange={e => setSettings({ ...settings, min_cash_reserve: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono text-sm"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Буфер безопасности предприятия
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Сохранить учетную политику
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: CURRENCIES */}
      {activeTab === 'currencies' && (
        <div className="space-y-6 max-w-3xl">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {t.settings?.currenciesTab || 'Мультивалютный учет'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Базовая валюта консолидации и валюта активного бизнеса «{companies.find(c => c.id === activeCompanyId)?.name}»
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { code: 'UAH', symbol: '₴', name: 'Украинская гривна' },
              { code: 'USD', symbol: '$', name: 'Доллар США' },
              { code: 'EUR', symbol: '€', name: 'Евро' },
            ].map(curr => {
              const activeComp = companies.find(c => c.id === activeCompanyId);
              const isBase = activeComp ? activeComp.currency === curr.code : settings.primary_currency === curr.code;

              return (
                <div
                  key={curr.code}
                  className={`p-4 rounded-2xl border transition ${
                    isBase
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-500'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                      {curr.symbol}
                    </span>
                    {isBase ? (
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-600 text-white">
                        Базовая
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          const currentComp = companies.find(c => c.id === activeCompanyId);
                          if (currentComp) {
                            const updatedComp = { ...currentComp, currency: curr.code as any };
                            repo.saveCompany(updatedComp);
                            setCompanies(repo.getCompanies());
                          }
                          const newSet = { ...settings, base_currency: curr.code as any, primary_currency: curr.code as any };
                          setSettings(newSet);
                          repo.saveSettings(newSet);
                          showNotification(`Базовая валюта для «${currentComp?.name || 'компании'}» изменена на ${curr.code}`);
                          if (onRefreshData) onRefreshData();
                        }}
                        className="text-[11px] text-slate-500 hover:text-emerald-600 underline cursor-pointer"
                      >
                        Сделать базовой
                      </button>
                    )}
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">{curr.code}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{curr.name}</p>
                </div>
              );
            })}
          </div>

          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 text-xs">
            <h4 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-emerald-600" />
              Изолированный мультивалютный учет
            </h4>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Каждый бизнес в ERP может функционировать в индивидуальной базовой валюте (UAH, USD, EUR). Все финансовые проводки сохраняются с точным пересчетом без накопления погрешностей с плавающей запятой.
            </p>
          </div>
        </div>
      )}

      {/* TAB 4: ACCOUNTS & CASH DESKS */}
      {activeTab === 'accounts' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {t.settings?.accountsTab || 'Банковские счета и кассы предприятия'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Финансовые точки учета активного бизнеса: {companies.find(c => c.id === activeCompanyId)?.name}
              </p>
            </div>
            <button
              onClick={() => setIsAddingAccount(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {t.settings?.addCompany || 'Открыть счет'}
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Счет / Касса</th>
                    <th className="py-3 px-4">Тип</th>
                    <th className="py-3 px-4">Валюта</th>
                    <th className="py-3 px-4">Текущий остаток</th>
                    <th className="py-3 px-4">Начальный остаток</th>
                    <th className="py-3 px-4">Ответственный</th>
                    <th className="py-3 px-4">Статус</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                  {accounts.map(acc => (
                    <tr key={acc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">{getLocalizedName(acc, locale)}</div>
                        {acc.account_number && (
                          <div className="font-mono text-[11px] text-slate-400 truncate max-w-xs">
                            {acc.account_number}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 capitalize">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-medium text-[11px]">
                          {acc.type === 'bank' ? 'Банковский' : acc.type === 'cash' ? 'Касса' : 'Эквайринг'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-emerald-600 dark:text-emerald-400">{acc.currency}</td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        {acc.balance.toLocaleString('ru-RU')} {acc.currency}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500">
                        {acc.initial_balance.toLocaleString('ru-RU')} {acc.currency}
                      </td>
                      <td className="py-3 px-4">{acc.responsible_person || '—'}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Активен
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add Account Modal */}
          {isAddingAccount && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {t.settings?.addCompany ? 'Открытие нового счета' : 'Открытие нового счета'}
                  </h3>
                  <button
                    onClick={() => setIsAddingAccount(false)}
                    className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSaveAccount} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                      Наименование счета / кассы *
                    </label>
                    <input
                      type="text"
                      required
                      value={accountForm.name}
                      onChange={e => setAccountForm({ ...accountForm, name: e.target.value })}
                      placeholder="Напр., Расчетный счет в Монобанк"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                        Тип счета
                      </label>
                      <select
                        value={accountForm.type}
                        onChange={e => setAccountForm({ ...accountForm, type: e.target.value as any })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                      >
                        <option value="bank">Банковский IBAN</option>
                        <option value="cash">Наличная касса</option>
                        <option value="payment_wallet">Эквайринг / Кошелек</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                        Валюта
                      </label>
                      <select
                        value={accountForm.currency}
                        onChange={e => setAccountForm({ ...accountForm, currency: e.target.value as any })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold"
                      >
                        <option value="UAH">UAH (₴)</option>
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="PLN">PLN (zł)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                      Начальный остаток на счете
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={accountForm.initial_balance}
                      onChange={e => setAccountForm({ ...accountForm, initial_balance: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                      Номер IBAN / реквизиты
                    </label>
                    <input
                      type="text"
                      value={accountForm.account_number || ''}
                      onChange={e => setAccountForm({ ...accountForm, account_number: e.target.value })}
                      placeholder="UA48305299000002600..."
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsAddingAccount(false)}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium rounded-xl"
                    >
                      Отмена
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                    >
                      <Save className="w-4 h-4" />
                      Создать счет
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: CHART OF ACCOUNTS / CATEGORIES */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {t.settings?.categoriesTab || 'План счетов и статьи ДДС / ОПиУ'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Иерархическая структура доходов и расходов с динамической локализацией (`name_json`)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Income Categories */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Статьи доходов (Поступления)
              </h3>
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {categories.filter(c => c.type === 'income').map(cat => (
                  <div key={cat.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {getLocalizedName(cat, locale)}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">ID: {cat.id}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-medium text-[11px]">
                      Операционная
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Expense Categories */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                Статьи расходов (Выплаты)
              </h3>
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80 max-h-[460px] overflow-y-auto pr-2">
                {categories.filter(c => c.type === 'expense').map(cat => (
                  <div key={cat.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {getLocalizedName(cat, locale)}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">ID: {cat.id}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium text-[11px]">
                      OPEX / COGS
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: SECURITY & RBAC */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {t.settings?.securityTab || 'Управление доступом (RBAC) и безопасность'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Разделение полномочий между Собственником и Директором, контроль PIN-кодов и десктопные ноды
            </p>
          </div>

          {/* RBAC Permission Matrix */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
              Матрица прав доступа по ролям (Zero-Trust Enforcement)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-500 uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Операция / Модуль</th>
                    <th className="py-2.5 px-3 text-center">Роль: Собственник (Owner)</th>
                    <th className="py-2.5 px-3 text-center">Роль: Директор (Director)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  <tr>
                    <td className="py-2.5 px-3 font-medium">Просмотр аналитики, ОПиУ, Баланса, ДДС</td>
                    <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">✓ Полный доступ</td>
                    <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">✓ Полный доступ</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-medium">Создание и редактирование проводок/платежей</td>
                    <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">✓ Разрешено</td>
                    <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">✓ Разрешено</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-medium">Удаление финансовых операций из журнала</td>
                    <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">✓ Разрешено</td>
                    <td className="py-2.5 px-3 text-center text-rose-600 font-bold">✗ Запрещено (RBAC Guard)</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-medium">Удаление плановых платежей из календаря</td>
                    <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">✓ Разрешено</td>
                    <td className="py-2.5 px-3 text-center text-rose-600 font-bold">✗ Запрещено (RBAC Guard)</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-medium">Удаление юридических лиц и компаний</td>
                    <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">✓ Разрешено</td>
                    <td className="py-2.5 px-3 text-center text-rose-600 font-bold">✗ Запрещено (RBAC Guard)</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-medium">P2P Сопряжение и аудит крипто-ключей</td>
                    <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">✓ Разрешено</td>
                    <td className="py-2.5 px-3 text-center text-slate-500 font-medium">Только чтение</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* User Profiles & PIN code management */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {users.map(u => {
              const isOwnerUser = u.role === 'owner';
              const isMe = u.id === currentUser.id;
              return (
                <div
                  key={u.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-sm"
                        style={{ backgroundColor: u.avatar_color || '#10b981' }}
                      >
                        {u.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">{u.name}</h4>
                          {isMe && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold">
                              Вы
                            </span>
                          )}
                        </div>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                            isOwnerUser
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                              : 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
                          }`}
                        >
                          {isOwnerUser ? 'Собственник (Owner)' : 'Директор (Director)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Email:</span>
                      <span className="text-slate-700 dark:text-slate-300">{u.email || '—'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Защитный PIN:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold tracking-widest text-slate-600 dark:text-slate-400">
                          ••••
                        </span>
                        {editingUserId !== u.id ? (
                          <button
                            onClick={() => {
                              setEditingUserId(u.id);
                              setNewPin('');
                            }}
                            className="text-[11px] text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 underline cursor-pointer"
                          >
                            Сменить PIN
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {editingUserId === u.id && (
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 mt-2">
                        <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300">
                          Новый 4-значный PIN:
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="password"
                            maxLength={4}
                            value={newPin}
                            onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
                            placeholder="Напр., 4321"
                            className="w-24 px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-center font-mono font-bold text-sm"
                          />
                          <button
                            onClick={() => handleUpdateUserPin(u.id)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold"
                          >
                            Применить
                          </button>
                          <button
                            onClick={() => setEditingUserId(null)}
                            className="px-2 py-1.5 text-slate-500 hover:text-slate-700 text-xs"
                          >
                            Отмена
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Paired Desktop Nodes Multi-Session Support */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Laptop className="w-4 h-4 text-emerald-600" />
                  Сопряженные десктопные ноды (P2P Windows / macOS / Linux)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Мобильное приложение (Android) переключается между авторизованными рабочими станциями локальной сети
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {pairedNodes.map(node => (
                <div key={node.id} className="py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                      {node.os === 'windows' ? <Laptop className="w-4 h-4" /> : <Server className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        {node.name}
                        {node.is_default && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold">
                            Основная
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-[11px] text-slate-400 mt-0.5">
                        http://{node.local_ip}:{node.port} • ОС: {node.os?.toUpperCase()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      {node.status === 'online' ? 'В сети (LAN)' : 'Сопряжен'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SAFE DATA WIPE CONFIRMATION MODAL (Strictly Owner-Only with double verification) */}
      {isWipeModalOpen && wipeTargetCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border-2 border-rose-500/80 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl shadow-rose-950/50 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-rose-100 dark:border-rose-950/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-rose-100 dark:bg-rose-900/60 border border-rose-300 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    Деструктивный аудит (Safe Wipe)
                  </h3>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                    Необратимое уничтожение данных
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsWipeModalOpen(false);
                  setWipeTargetCompany(null);
                  setWipeError(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Warning Text */}
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-900 dark:text-rose-200 space-y-2 leading-relaxed">
              <p className="font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                Внимание! Вы собираетесь стереть бизнес: «{wipeTargetCompany.name}» (ID: {wipeTargetCompany.id})
              </p>
              <p>
                Все финансовые проводки, счета, планы платежей, складские остатки и сопряженные устройства этого юридического лица будут стёрты из локальной базы данных SQLite без возможности восстановления.
              </p>
            </div>

            {/* Record Statistics */}
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <div className="text-lg font-mono font-bold text-rose-600 dark:text-rose-400">
                  {repo.getTransactions(wipeTargetCompany.id).length}
                </div>
                <div className="text-[10px] text-slate-500 uppercase mt-0.5">Проводок</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <div className="text-lg font-mono font-bold text-rose-600 dark:text-rose-400">
                  {repo.getAccounts(wipeTargetCompany.id).length}
                </div>
                <div className="text-[10px] text-slate-500 uppercase mt-0.5">Счетов</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <div className="text-lg font-mono font-bold text-rose-600 dark:text-rose-400">
                  {repo.getPaymentPlans(wipeTargetCompany.id).length}
                </div>
                <div className="text-[10px] text-slate-500 uppercase mt-0.5">Платежей</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <div className="text-lg font-mono font-bold text-rose-600 dark:text-rose-400">
                  {repo.getInventory(wipeTargetCompany.id).length}
                </div>
                <div className="text-[10px] text-slate-500 uppercase mt-0.5">Товаров</div>
              </div>
            </div>

            {/* Error banner if validation fails */}
            {wipeError && (
              <div className="p-3 rounded-xl bg-rose-100 dark:bg-rose-900/60 border border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                {wipeError}
              </div>
            )}

            {/* Double Verification Form */}
            <form onSubmit={handleExecuteSafeWipe} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  1. Введите наименование компании ЗАГЛАВНЫМИ БУКВАМИ:
                </label>
                <div className="text-[11px] font-mono text-slate-400 mb-1.5 select-all">
                  Ожидается: <strong className="text-slate-800 dark:text-slate-200">{wipeTargetCompany.name.toUpperCase()}</strong>
                </div>
                <input
                  type="text"
                  required
                  value={confirmBusinessName}
                  onChange={e => {
                    setConfirmBusinessName(e.target.value);
                    if (wipeError) setWipeError(null);
                  }}
                  placeholder={wipeTargetCompany.name.toUpperCase()}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  2. Введите защитный мастер-PIN Владельца:
                </label>
                <div className="text-[11px] text-slate-400 mb-1.5">
                  Мастер-код авторизации деструктивных операций (по умолчанию 1234)
                </div>
                <input
                  type="password"
                  maxLength={4}
                  required
                  value={confirmPin}
                  onChange={e => {
                    setConfirmPin(e.target.value.replace(/\D/g, ''));
                    if (wipeError) setWipeError(null);
                  }}
                  placeholder="••••"
                  className="w-32 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono font-bold text-center tracking-widest text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsWipeModalOpen(false);
                    setWipeTargetCompany(null);
                    setWipeError(null);
                  }}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-medium rounded-xl transition cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={confirmBusinessName.trim() !== wipeTargetCompany.name.toUpperCase() || confirmPin.length !== 4}
                  className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition cursor-pointer ${
                    confirmBusinessName.trim() === wipeTargetCompany.name.toUpperCase() && confirmPin.length === 4
                      ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/30'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Trash2 className="w-4 h-4" />
                  Безвозвратно уничтожить данные
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
