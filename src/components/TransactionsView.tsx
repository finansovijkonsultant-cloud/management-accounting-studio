import React, { useState } from 'react';
import {
  Plus,
  Mic,
  Search,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCheck,
  X,
  ShieldAlert,
  Trash2,
  Lock,
} from 'lucide-react';
import { TranslationDictionary, formatLocalizedDate, getLocalizedName } from '../i18n';
import { Account, Currency, Role, Transaction, TransactionStatus, TransactionType } from '../types';
import { VoiceInputDialog } from './VoiceInputDialog';

interface TransactionsViewProps {
  t: TranslationDictionary;
  transactions?: Transaction[];
  accounts?: Account[];
  currentRole?: Role;
  aiMode?: string;
  onAddTransaction?: (tx: Partial<Transaction>) => void;
  onSaveTransaction?: (tx: any) => void;
  onUpdateStatus?: (id: string, status: TransactionStatus) => void;
  onDeleteTransaction?: (id: string) => void;
  onApproveTransaction?: (id: string) => void;
  currency?: Currency;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  t,
  transactions = [],
  accounts = [],
  currentRole = 'owner',
  aiMode = 'ollama',
  onAddTransaction,
  onSaveTransaction,
  onUpdateStatus,
  onDeleteTransaction,
  onApproveTransaction,
  currency = 'UAH',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  const handleSave = (tx: Partial<Transaction>) => {
    if (onAddTransaction) {
      onAddTransaction(tx);
    } else if (onSaveTransaction) {
      const fullTx: Transaction = {
        id: tx.id || 'tx-' + Date.now(),
        date: tx.date || new Date().toISOString().substring(0, 10),
        time: tx.time || new Date().toTimeString().substring(0, 8),
        type: tx.type || 'expense',
        status: tx.status || 'confirmed',
        account_id: tx.account_id || (accounts[0]?.id ?? 'acc-1'),
        amount: Number(tx.amount) || 0,
        currency: ((tx.currency || currency) as Currency),
        category_id: tx.category_id || 'cat-general',
        category: tx.category || 'Общие расходы',
        counterparty_id: tx.counterparty_id,
        counterparty_name: tx.counterparty_name,
        description: tx.description || 'Операция',
        idempotency_key: tx.idempotency_key || `manual-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1,
        sync_status: 'synced',
        source: 'manual',
        owner_id: 'usr-owner-1',
      };
      onSaveTransaction(fullTx);
    }
  };

  const handleStatusChange = (id: string, status: TransactionStatus) => {
    if (onUpdateStatus) {
      onUpdateStatus(id, status);
    } else if (status === 'confirmed' && onApproveTransaction) {
      onApproveTransaction(id);
    }
  };

  // Form State for Manual Add
  const [formData, setFormData] = useState<{
    type: TransactionType;
    amount: number;
    currency: Currency;
    account_id: string;
    target_account_id?: string;
    counterparty_name: string;
    category: string;
    description: string;
    date: string;
    status: TransactionStatus;
  }>({
    type: 'purchase',
    amount: 0,
    currency: currency,
    account_id: accounts[0]?.id || '',
    target_account_id: accounts[1]?.id || '',
    counterparty_name: '',
    category: 'Сырье и материалы',
    description: '',
    date: new Date().toISOString().substring(0, 16),
    status: 'confirmed',
  });

  // Voice Input State
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [parsedVoiceDraft, setParsedVoiceDraft] = useState<Partial<Transaction> | null>(null);

  // Filtered list
  const filtered = (transactions || []).filter(tx => {
    if (selectedType !== 'all' && tx.type !== selectedType) return false;
    if (selectedStatus !== 'all' && tx.status !== selectedStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchDesc = tx.description?.toLowerCase().includes(q);
      const matchParty = tx.counterparty_name?.toLowerCase().includes(q);
      const matchCat = tx.category?.toLowerCase().includes(q);
      if (!matchDesc && !matchParty && !matchCat) return false;
    }
    return true;
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || formData.amount <= 0) {
      alert('Укажите корректную сумму операции.');
      return;
    }

    handleSave({
      ...formData,
      amount: Number(formData.amount),
      idempotency_key: `manual-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    });
    setIsAddModalOpen(false);
  };

  // Voice recognition simulation or Web Speech API
  const startVoiceInput = () => {
    setIsListening(true);
    setVoiceTranscript('');
    setParsedVoiceDraft(null);

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = 'ru-RU';
        recognition.onresult = (event: any) => {
          const text = event.results[0][0].transcript;
          setVoiceTranscript(text);
          parseVoiceText(text);
          setIsListening(false);
        };
        recognition.onerror = () => {
          simulateVoiceSpeech();
        };
        recognition.start();
        return;
      } catch {
        simulateVoiceSpeech();
      }
    } else {
      simulateVoiceSpeech();
    }
  };

  const simulateVoiceSpeech = () => {
    setTimeout(() => {
      const sample = 'Сегодня оплатили поставщику «АвтоДеталь» 48 000 гривен с расчетного счета, срок окончательного расчета — 20 сентября.';
      setVoiceTranscript(sample);
      parseVoiceText(sample);
      setIsListening(false);
    }, 1500);
  };

  const parseVoiceText = (text: string) => {
    // Deterministic parser for financial entities
    const isExpense = text.includes('оплатили') || text.includes('купили') || text.includes('расход');
    const amountMatch = text.match(/\d+[\s\d]*/);
    const rawAmt = amountMatch ? parseInt(amountMatch[0].replace(/\s/g, ''), 10) : 48000;

    const draft: Partial<Transaction> = {
      type: isExpense ? 'purchase' : 'sale',
      amount: rawAmt,
      currency: text.includes('доллар') ? 'USD' : text.includes('евро') ? 'EUR' : 'UAH',
      counterparty_name: text.includes('АвтоДеталь') ? 'ТОВ «АвтоДеталь»' : 'Контрагент из аудио',
      category: isExpense ? 'Сырье и комплектующие' : 'Выручка от продаж',
      account_id: accounts[0]?.id || 'acc-1',
      description: text,
      date: new Date().toISOString(),
      status: 'draft', // Critical rule: voice creates DRAFT, requires user confirmation
    };
    setParsedVoiceDraft(draft);
  };

  const saveVoiceDraft = () => {
    if (parsedVoiceDraft) {
      handleSave(parsedVoiceDraft);
      setIsVoiceModalOpen(false);
      setParsedVoiceDraft(null);
    }
  };

  const formatMoney = (val: number, cur: Currency = 'UAH') => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: cur,
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">{t.transactions.title}</h2>
          <p className="text-xs text-slate-400">
            Реестр хозяйственных, банковских и кассовых записей предприятия
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsVoiceModalOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer shadow-sm"
          >
            <Mic className="w-4 h-4" />
            {t.transactions.voiceInput}
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {t.transactions.addTransaction}
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[240px] bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Поиск по описанию, контрагенту или категории..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="bg-transparent text-slate-100 placeholder-slate-400 focus:outline-none w-full text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedType}
              onChange={e => setSelectedType(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer text-xs"
            >
              <option value="all" className="bg-slate-800">Все типы операций</option>
              <option value="sale" className="bg-slate-800">Продажа</option>
              <option value="income_payment" className="bg-slate-800">Поступление оплаты</option>
              <option value="purchase" className="bg-slate-800">Закупка</option>
              <option value="expense" className="bg-slate-800">Расход (OPEX)</option>
              <option value="transfer" className="bg-slate-800">Перевод между своими счетами</option>
              <option value="tax" className="bg-slate-800">Налоги</option>
              <option value="salary" className="bg-slate-800">Зарплата</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700">
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer text-xs"
            >
              <option value="all" className="bg-slate-800">Все статусы</option>
              <option value="confirmed" className="bg-slate-800">Подтверждена</option>
              <option value="draft" className="bg-slate-800">Черновик</option>
              <option value="pending_approval" className="bg-slate-800">Ожидает проверки</option>
              <option value="reconciled" className="bg-slate-800">Сверена с банком</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">{t.transactions.date}</th>
                <th className="py-3 px-4">{t.transactions.type}</th>
                <th className="py-3 px-4">{t.transactions.counterparty}</th>
                <th className="py-3 px-4">{t.transactions.category}</th>
                <th className="py-3 px-4">{t.transactions.account}</th>
                <th className="py-3 px-4 text-right">{t.transactions.amount}</th>
                <th className="py-3 px-4 text-center">{t.transactions.status}</th>
                <th className="py-3 px-4 text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    Операции не найдены. Создайте новую операцию или сбросьте фильтры.
                  </td>
                </tr>
              ) : (
                filtered.map(tx => {
                  const isIncome = tx.type === 'sale' || tx.type === 'income_payment';
                  const isTransfer = tx.type === 'transfer';
                  const account = accounts.find(a => a.id === tx.account_id);

                  return (
                    <tr key={tx.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                        {formatLocalizedDate(tx.date, (t as any).locale || 'ru')}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          {isTransfer ? (
                            <ArrowLeftRight className="w-3.5 h-3.5 text-blue-400" />
                          ) : isIncome ? (
                            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" />
                          )}
                          <span className="font-medium text-slate-200 capitalize">
                            {tx.type.replace('_', ' ')}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium text-white">
                        {tx.counterparty_name || '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {tx.category || ((t as any).locale === 'uk' ? 'Без категорії' : (t as any).locale === 'en' ? 'Uncategorized' : 'Без категории')}
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                        {account ? getLocalizedName(account, (t as any).locale || 'ru', account.name) : ((t as any).locale === 'uk' ? 'Рахунок підприємства' : (t as any).locale === 'en' ? 'Company Account' : 'Счет предприятия')}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold whitespace-nowrap">
                        <span
                          className={
                            isTransfer
                              ? 'text-blue-300'
                              : isIncome
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                          }
                        >
                          {isIncome ? '+' : isTransfer ? '⇄ ' : '-'}
                          {formatMoney(tx.amount, tx.currency)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                            tx.status === 'confirmed' || tx.status === 'reconciled'
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                              : tx.status === 'draft'
                              ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                              : 'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}
                        >
                          {tx.status === 'confirmed' && <CheckCircle2 className="w-2.5 h-2.5" />}
                          {tx.status === 'draft' && <Clock className="w-2.5 h-2.5" />}
                          {tx.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {tx.status === 'draft' && (
                            <button
                              onClick={() => handleStatusChange(tx.id, 'confirmed')}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded text-[11px] font-medium transition cursor-pointer"
                            >
                              Подтвердить
                            </button>
                          )}
                          {tx.status === 'confirmed' && (
                            <button
                              onClick={() => handleStatusChange(tx.id, 'reconciled')}
                              className="text-slate-400 hover:text-emerald-300 text-[11px] transition cursor-pointer px-1.5 py-1"
                              title="Отметить сверенным с выпиской"
                            >
                              Сверить
                            </button>
                          )}

                          {/* Collective Approval Deletion Action (ТЗ v1.1 Mandatory) */}
                          <button
                            onClick={() => {
                              const reason = prompt(`Укажите причину удаления проводки #${tx.id} для запроса коллективного согласования всеми участниками компании:`);
                              if (reason && reason.trim()) {
                                if (onDeleteTransaction) onDeleteTransaction(tx.id);
                              }
                            }}
                            className="p-1 text-slate-500 hover:text-amber-400 rounded hover:bg-amber-950/40 transition cursor-pointer"
                            title="Запросить удаление (Требуется 100% одобрение всех участников компании)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Add Transaction Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                Новая хозяйственная операция
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Тип операции</label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value as TransactionType })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="sale">Продажа товаров / услуг</option>
                    <option value="income_payment">Поступление оплаты от клиента</option>
                    <option value="purchase">Закупка материалов / товаров</option>
                    <option value="expense">Операционный расход (OPEX)</option>
                    <option value="transfer">Перевод между своими счетами</option>
                    <option value="salary">Выплата заработной платы</option>
                    <option value="tax">Налоги и сборы</option>
                    <option value="owner_contribution">Внесение капитала владельцем</option>
                    <option value="owner_withdrawal">Изъятие прибыли владельцем</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Сумма и валюта</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={formData.amount || ''}
                      onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono text-sm focus:outline-none focus:border-emerald-500"
                    />
                    <select
                      value={formData.currency}
                      onChange={e => setFormData({ ...formData, currency: e.target.value as Currency })}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-2 text-slate-200 focus:outline-none"
                    >
                      <option value="UAH">UAH</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Critical Invariant Warning for Transfer */}
              {formData.type === 'transfer' && (
                <div className="p-3 bg-blue-950/40 border border-blue-800/60 rounded-lg text-blue-300 text-[11px] flex items-center gap-2">
                  <ArrowLeftRight className="w-4 h-4 flex-shrink-0" />
                  <span>
                    <strong>Правило учета:</strong> Перевод между собственными счетами изменяет распределение средств, но не признается доходом или расходом бизнеса.
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Счет списания / поступления</label>
                  <select
                    value={formData.account_id}
                    onChange={e => setFormData({ ...formData, account_id: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    {(accounts || []).map(a => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.balance.toLocaleString()} {a.currency})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Контрагент (покупатель / поставщик)</label>
                  <input
                    type="text"
                    placeholder="Например: ТОВ «УкрЛогистик»"
                    value={formData.counterparty_name}
                    onChange={e => setFormData({ ...formData, counterparty_name: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Категория учета</label>
                  <input
                    type="text"
                    placeholder="Аренда, Зарплата, Закупка..."
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Дата и время</label>
                  <input
                    type="datetime-local"
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Комментарий / Назначение платежа</label>
                <textarea
                  rows={2}
                  placeholder="Дополнительные примечания к операции..."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-2 rounded-lg cursor-pointer transition shadow-sm"
                >
                  Сохранить операцию
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Voice Recognition & Structured Transaction Input Dialog */}
      <VoiceInputDialog
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        targetType="transaction"
        aiMode={aiMode}
        accounts={accounts}
        currency={currency}
        onConfirm={parsedData => {
          handleSave({
            type: parsedData.type || 'purchase',
            amount: Number(parsedData.amount) || 0,
            currency: (parsedData.currency as Currency) || (currency as Currency) || 'UAH',
            counterparty_name: parsedData.counterparty_name || 'Контрагент из голосовой записи',
            category: parsedData.category || 'Общие расходы',
            account_id: accounts[0]?.id || 'acc-1',
            description: parsedData.description || 'Голосовая запись транзакции',
            date: parsedData.date || new Date().toISOString(),
            status: 'draft', // User verified draft
          });
        }}
      />
    </div>
  );
};
