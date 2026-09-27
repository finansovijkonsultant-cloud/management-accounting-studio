import React, { useState, useMemo } from 'react';
import {
  Wallet,
  Plus,
  ArrowRightLeft,
  Landmark,
  CreditCard,
  Banknote,
  CircleDollarSign,
  TrendingUp,
  Search,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Building2,
  Calendar,
  X,
  RefreshCw,
} from 'lucide-react';
import { TranslationDictionary, getLocalizedName } from '../i18n';
import { Account, Currency } from '../types';

interface MoneyViewProps {
  t: TranslationDictionary;
  accounts: Account[];
  onAddAccount?: (account: Account) => void;
  onTransferMoney?: (
    sourceAccountId: string,
    targetAccountId: string,
    amount: number,
    comment?: string
  ) => void;
  onUpdateAccount?: (account: Account) => void;
  currency?: Currency;
  onNavigate?: (tab: any) => void;
}

export const MoneyView: React.FC<MoneyViewProps> = ({
  t,
  accounts = [],
  onAddAccount,
  onTransferMoney,
  onUpdateAccount,
  currency = 'UAH',
  onNavigate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedCurrency, setSelectedCurrency] = useState<string>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  // New Account Form State
  const [newAccount, setNewAccount] = useState<{
    name: string;
    type: 'bank' | 'cash' | 'payment_wallet' | 'acquiring' | 'reserve';
    currency: Currency;
    initial_balance: number;
    responsible_person: string;
    account_number: string;
    include_in_calendar: boolean;
  }>({
    name: '',
    type: 'bank',
    currency: currency,
    initial_balance: 0,
    responsible_person: 'Собственник',
    account_number: '',
    include_in_calendar: true,
  });

  // Transfer Form State
  const [transferData, setTransferData] = useState<{
    sourceId: string;
    targetId: string;
    amount: number;
    comment: string;
  }>({
    sourceId: accounts[0]?.id || '',
    targetId: accounts[1]?.id || '',
    amount: 0,
    comment: 'Внутреннее перемещение средств между счетами',
  });

  // Currency Exchange Rates (UAH Base)
  const fxRates: Record<string, number> = { UAH: 1, USD: 41.2, EUR: 44.5, PLN: 10.4, KZT: 0.086 };

  const toActiveCur = (amount: number, fromCur = 'UAH') => {
    const fromRate = fxRates[fromCur] || 1;
    const targetRate = fxRates[currency] || 1;
    return (amount * fromRate) / targetRate;
  };

  const formatMoney = (val: number, cur = currency) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: cur,
      maximumFractionDigits: cur === 'USD' || cur === 'EUR' ? 2 : 0,
    }).format(val);
  };

  // Filtered Accounts
  const filteredAccounts = useMemo(() => {
    return accounts.filter(acc => {
      const matchSearch =
        acc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (acc.account_number && acc.account_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (acc.responsible_person && acc.responsible_person.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchType = selectedType === 'ALL' || acc.type === selectedType;
      const matchCurrency = selectedCurrency === 'ALL' || acc.currency === selectedCurrency;

      return matchSearch && matchType && matchCurrency;
    });
  }, [accounts, searchQuery, selectedType, selectedCurrency]);

  // Aggregate KPI metrics
  const totalBalanceActive = useMemo(() => {
    return accounts.reduce((sum, a) => sum + toActiveCur(a.balance, a.currency), 0);
  }, [accounts, currency]);

  const bankBalanceActive = useMemo(() => {
    return accounts
      .filter(a => a.type === 'bank')
      .reduce((sum, a) => sum + toActiveCur(a.balance, a.currency), 0);
  }, [accounts, currency]);

  const cashBalanceActive = useMemo(() => {
    return accounts
      .filter(a => a.type === 'cash')
      .reduce((sum, a) => sum + toActiveCur(a.balance, a.currency), 0);
  }, [accounts, currency]);

  const reserveBalanceActive = useMemo(() => {
    return accounts
      .filter(a => a.type === 'reserve' || a.currency === 'USD' || a.currency === 'EUR')
      .reduce((sum, a) => sum + toActiveCur(a.balance, a.currency), 0);
  }, [accounts, currency]);

  const acquiringBalanceActive = useMemo(() => {
    return accounts
      .filter(a => a.type === 'acquiring' || a.type === 'payment_wallet')
      .reduce((sum, a) => sum + toActiveCur(a.balance, a.currency), 0);
  }, [accounts, currency]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccount.name.trim()) return;

    const created: Account = {
      id: 'acc-' + Date.now(),
      name: newAccount.name.trim(),
      type: newAccount.type,
      currency: newAccount.currency,
      balance: Number(newAccount.initial_balance) || 0,
      initial_balance: Number(newAccount.initial_balance) || 0,
      initial_balance_date: new Date().toISOString().substring(0, 10),
      responsible_person: newAccount.responsible_person,
      account_number: newAccount.account_number || undefined,
      is_active: true,
      include_in_calendar: newAccount.include_in_calendar,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      source: 'manual',
      sync_status: 'synced',
      version: 1,
      owner_id: 'usr-owner-1',
    };

    if (onAddAccount) {
      onAddAccount(created);
    }
    setIsAddModalOpen(false);
    setNewAccount({
      name: '',
      type: 'bank',
      currency: currency,
      initial_balance: 0,
      responsible_person: 'Собственник',
      account_number: '',
      include_in_calendar: true,
    });
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (transferData.sourceId === transferData.targetId) {
      alert('Счет списания и счет зачисления не могут совпадать.');
      return;
    }
    if (!transferData.amount || transferData.amount <= 0) {
      alert('Укажите положительную сумму перевода.');
      return;
    }

    if (onTransferMoney) {
      onTransferMoney(
        transferData.sourceId,
        transferData.targetId,
        Number(transferData.amount),
        transferData.comment
      );
    }
    setIsTransferModalOpen(false);
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'bank':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-950 text-blue-300 border border-blue-800">
            <Landmark className="w-3 h-3" /> Банк IBAN
          </span>
        );
      case 'cash':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-950 text-amber-300 border border-amber-800">
            <Banknote className="w-3 h-3" /> Касса / Наличные
          </span>
        );
      case 'reserve':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-purple-950 text-purple-300 border border-purple-800">
            <ShieldCheck className="w-3 h-3" /> Резервный фонд
          </span>
        );
      case 'acquiring':
      case 'payment_wallet':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-cyan-950 text-cyan-300 border border-cyan-800">
            <CreditCard className="w-3 h-3" /> Эквайринг
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300">
            Счет
          </span>
        );
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-bold text-white tracking-tight">Деньги и расчетные счета</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Управление банковскими счетами, кассами компании, валютными резервами и переводами
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            onClick={() => setIsTransferModalOpen(true)}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-lg font-medium border border-slate-700 transition cursor-pointer"
          >
            <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
            Перевод между счетами
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-lg font-semibold shadow-sm transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Добавить счет / кассу
          </button>
        </div>
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Liquidity */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Общая ликвидность</span>
            <CircleDollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {formatMoney(totalBalanceActive)}
          </div>
          <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
            <span>Всего счетов: {accounts.length}</span>
            <span className="text-emerald-400 font-medium">100% доступно</span>
          </div>
        </div>

        {/* Bank Accounts */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>На банковских счетах</span>
            <Landmark className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-blue-300 tracking-tight">
            {formatMoney(bankBalanceActive)}
          </div>
          <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
            <span>Приват, Монобанк, Ощад</span>
            <span className="text-blue-400 font-medium font-mono">
              {totalBalanceActive > 0 ? ((bankBalanceActive / totalBalanceActive) * 100).toFixed(0) : 0}%
            </span>
          </div>
        </div>

        {/* Cash Desks */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>В кассах (наличные)</span>
            <Banknote className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-300 tracking-tight">
            {formatMoney(cashBalanceActive)}
          </div>
          <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
            <span>Офис и торговые точки</span>
            <span className="text-amber-400 font-medium font-mono">
              {totalBalanceActive > 0 ? ((cashBalanceActive / totalBalanceActive) * 100).toFixed(0) : 0}%
            </span>
          </div>
        </div>

        {/* Foreign Currency & Reserves */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Валютные фонды и резервы</span>
            <ShieldCheck className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-300 tracking-tight">
            {formatMoney(reserveBalanceActive)}
          </div>
          <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
            <span>USD, EUR, страховой фонд</span>
            <span className="text-purple-400 font-medium">Безопасность</span>
          </div>
        </div>
      </div>

      {/* Main Table: Денежные счета и кассы */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm space-y-4 p-5">
        {/* Table Filters & Search */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-400" />
              Реестр счетов и касс компании ({filteredAccounts.length})
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Поиск счета, IBAN, ответственного..."
                className="bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 w-56"
              />
            </div>

            {/* Type Filter */}
            <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
              {(
                [
                  { id: 'ALL', label: 'Все типы' },
                  { id: 'bank', label: 'Банки' },
                  { id: 'cash', label: 'Кассы' },
                  { id: 'reserve', label: 'Резервы' },
                  { id: 'acquiring', label: 'Эквайринг' },
                ] as const
              ).map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedType(t.id)}
                  className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                    selectedType === t.id
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Currency Filter */}
            <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
              {(['ALL', 'UAH', 'USD', 'EUR'] as const).map(c => (
                <button
                  key={c}
                  onClick={() => setSelectedCurrency(c)}
                  className={`px-2 py-1 rounded-md font-medium transition cursor-pointer ${
                    selectedCurrency === c
                      ? 'bg-slate-700 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {c === 'ALL' ? 'Все вал.' : c}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Full Accounts Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Счет / Касса</th>
                <th className="py-3 px-4">Тип</th>
                <th className="py-3 px-4">Валюта</th>
                <th className="py-3 px-4 text-right">Фактический остаток</th>
                <th className="py-3 px-4 text-right">Эквивалент ({currency})</th>
                <th className="py-3 px-4">В календаре</th>
                <th className="py-3 px-4">Ответственный</th>
                <th className="py-3 px-4 text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredAccounts.map(acc => {
                const equiv = toActiveCur(acc.balance, acc.currency);
                return (
                  <tr key={acc.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{getLocalizedName(acc, (t as any).locale || 'ru', acc.name)}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {acc.account_number || (acc.type === 'cash' ? ((t as any).locale === 'uk' ? 'Готівка в касі' : (t as any).locale === 'en' ? 'Cash in till' : 'Наличные в кассе') : ((t as any).locale === 'uk' ? 'IBAN не вказано' : (t as any).locale === 'en' ? 'IBAN not specified' : 'IBAN не указан'))}
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">{getTypeBadge(acc.type)}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-300">{acc.currency}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400 text-sm whitespace-nowrap">
                      {formatMoney(acc.balance, acc.currency)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-400 whitespace-nowrap">
                      {acc.currency !== currency ? formatMoney(equiv, currency) : '—'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {acc.include_in_calendar ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Да
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">Исключен</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-300">{acc.responsible_person || 'Директор'}</td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => {
                          setTransferData(prev => ({ ...prev, sourceId: acc.id }));
                          setIsTransferModalOpen(true);
                        }}
                        className="text-xs text-cyan-400 hover:text-cyan-300 font-medium px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
                      >
                        Перевести
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredAccounts.length === 0 && (
            <div className="py-8 text-center text-slate-500 text-xs">
              Счета, соответствующие выбранным фильтрам, не найдены.
            </div>
          )}
        </div>
      </div>

      {/* Modal: Add Account */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                Добавить денежный счет или кассу
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Название счета или кассы *</label>
                <input
                  type="text"
                  required
                  placeholder="напр., Monobank Расчетный (Гривна) или Касса Офис"
                  value={newAccount.name}
                  onChange={e => setNewAccount({ ...newAccount, name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Тип счета</label>
                  <select
                    value={newAccount.type}
                    onChange={e => setNewAccount({ ...newAccount, type: e.target.value as any })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="bank">Банковский IBAN</option>
                    <option value="cash">Касса / Наличные</option>
                    <option value="reserve">Резервный фонд</option>
                    <option value="acquiring">Эквайринг</option>
                    <option value="payment_wallet">Электронный кошелек</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Валюта</label>
                  <select
                    value={newAccount.currency}
                    onChange={e => setNewAccount({ ...newAccount, currency: e.target.value as any })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="UAH">UAH (Гривна)</option>
                    <option value="USD">USD (Доллар США)</option>
                    <option value="EUR">EUR (Евро)</option>
                    <option value="PLN">PLN (Злотый)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Начальный остаток</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newAccount.initial_balance}
                    onChange={e => setNewAccount({ ...newAccount, initial_balance: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Ответственное лицо</label>
                  <input
                    type="text"
                    value={newAccount.responsible_person}
                    onChange={e => setNewAccount({ ...newAccount, responsible_person: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Номер счета или IBAN (необязательно)</label>
                <input
                  type="text"
                  placeholder="UA000000000000000000000000000"
                  value={newAccount.account_number}
                  onChange={e => setNewAccount({ ...newAccount, account_number: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="inc-calendar"
                  checked={newAccount.include_in_calendar}
                  onChange={e => setNewAccount({ ...newAccount, include_in_calendar: e.target.checked })}
                  className="rounded border-slate-700 text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="inc-calendar" className="text-slate-300">
                  Учитывать остаток счета в платежном календаре и кассовом прогнозе
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 transition cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-semibold transition cursor-pointer"
                >
                  Создать счет
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Transfer between accounts */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-cyan-400" />
                Перевод между собственными счетами
              </h3>
              <button
                onClick={() => setIsTransferModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-2.5 bg-blue-950/40 border border-blue-800/60 rounded-lg text-[11px] text-blue-200">
              💡 Перевод между своими счетами не влияет на P&L (не является ни доходом, ни расходом) согласно правилам управленческого учета.
            </div>

            <form onSubmit={handleTransferSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Счет списания (Откуда)</label>
                <select
                  value={transferData.sourceId}
                  onChange={e => setTransferData({ ...transferData, sourceId: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-medium"
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {getLocalizedName(acc, (t as any).locale || 'ru', acc.name)} ({formatMoney(acc.balance, acc.currency)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">
                  {(t as any).locale === 'uk' ? 'Рахунок зарахування (Куди)' : (t as any).locale === 'en' ? 'Destination Account (To)' : 'Счет зачисления (Куда)'}
                </label>
                <select
                  value={transferData.targetId}
                  onChange={e => setTransferData({ ...transferData, targetId: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-medium"
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {getLocalizedName(acc, (t as any).locale || 'ru', acc.name)} ({formatMoney(acc.balance, acc.currency)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Сумма перевода *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={transferData.amount || ''}
                  onChange={e => setTransferData({ ...transferData, amount: Number(e.target.value) })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Комментарий / Назначение</label>
                <input
                  type="text"
                  value={transferData.comment}
                  onChange={e => setTransferData({ ...transferData, comment: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 transition cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg font-semibold transition cursor-pointer"
                >
                  Выполнить перевод
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
