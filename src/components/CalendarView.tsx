import React, { useState, useMemo } from 'react';
import {
  CalendarDays,
  AlertTriangle,
  Plus,
  CheckCircle2,
  Clock,
  TrendingDown,
  TrendingUp,
  X,
  ShieldAlert,
  ChevronRight,
  ArrowRight,
  Filter,
  Mic,
  Trash2,
  Lock,
} from 'lucide-react';
import { TranslationDictionary, formatLocalizedDate } from '../i18n';
import { Account, Currency, PlannedPayment, Role } from '../types';
import { VoiceInputDialog } from './VoiceInputDialog';

interface CalendarViewProps {
  t: TranslationDictionary;
  payments?: PlannedPayment[];
  plannedPayments?: PlannedPayment[];
  accounts?: Account[];
  currentRole?: Role;
  aiMode?: string;
  onSavePayment?: (payment: any) => void;
  onAddPlannedPayment?: (payment: Partial<PlannedPayment>) => void;
  onExecutePayment?: (id: string) => void;
  onUpdatePaymentStatus?: (id: string, status: any) => void;
  onDeletePayment?: (id: string) => void;
  currency?: Currency;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  t,
  payments,
  plannedPayments,
  accounts = [],
  currentRole = 'owner',
  aiMode = 'ollama',
  onSavePayment,
  onAddPlannedPayment,
  onExecutePayment,
  onUpdatePaymentStatus,
  onDeletePayment,
  currency = 'UAH',
}) => {
  const allPayments = payments || plannedPayments || [];
  const [scenario, setScenario] = useState<'base' | 'cautious' | 'optimistic' | 'crisis'>('base');
  const [horizonDays, setHorizonDays] = useState<number>(30);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [upcomingPeriod, setUpcomingPeriod] = useState<number>(7);
  const [upcomingStatusFilter, setUpcomingStatusFilter] = useState<'all' | 'planned' | 'approved' | 'overdue'>('all');

  // New Planned Payment Form
  const [newPayment, setNewPayment] = useState<{
    type: 'incoming' | 'outgoing';
    amount: number;
    currency: Currency;
    account_id: string;
    counterparty_name: string;
    category: string;
    description: string;
    planned_date: string;
    due_date: string;
    is_recurring: boolean;
  }>({
    type: 'outgoing',
    amount: 0,
    currency: currency,
    account_id: accounts[0]?.id || '',
    counterparty_name: '',
    category: 'Аренда',
    description: '',
    planned_date: new Date().toISOString().substring(0, 10),
    due_date: new Date(Date.now() + 7 * 86400000).toISOString().substring(0, 10),
    is_recurring: false,
  });

  // Calculate day-by-day cash forecast
  const totalCash = (accounts || []).reduce((sum, a) => sum + (a.currency === 'UAH' ? a.balance : a.balance * 41), 0);
  const minReserveThreshold = 80000; // UAH

  // Forecast points
  const forecastDays = Array.from({ length: Math.min(horizonDays, 30) }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().substring(0, 10);

    // Payments on this date
    let dayIn = (allPayments || [])
      .filter(p => (p.type === 'incoming' || p.type === 'inflow') && (p.planned_date || p.due_date || '').startsWith(dateStr))
      .reduce((s, p) => s + p.amount, 0);

    let dayOut = (allPayments || [])
      .filter(p => (p.type === 'outgoing' || p.type === 'outflow') && (p.planned_date || p.due_date || '').startsWith(dateStr))
      .reduce((s, p) => s + p.amount, 0);

    // Scenario modifiers
    if (scenario === 'cautious') {
      dayIn *= 0.85; // 15% delayed receipts
      dayOut *= 1.05; // 5% cost increases
    } else if (scenario === 'crisis') {
      dayIn *= 0.6; // 40% non-payment or delayed
      dayOut *= 1.15; // 15% price spike
    } else if (scenario === 'optimistic') {
      dayIn *= 1.1; // +10% fast collections
    }

    return {
      date: dateStr,
      label: formatLocalizedDate(d, (t as any).locale || 'ru', { day: 'numeric', month: 'short' }),
      inflow: dayIn,
      outflow: dayOut,
    };
  });

  // Cumulative balance
  let runningBalance = totalCash;
  let minBalance = totalCash;
  let minBalanceDate = forecastDays[0]?.date || '';

  const curve = forecastDays.map(item => {
    runningBalance += item.inflow - item.outflow;
    if (runningBalance < minBalance) {
      minBalance = runningBalance;
      minBalanceDate = item.date;
    }
    return {
      ...item,
      balance: runningBalance,
      isDeficit: runningBalance < minReserveThreshold,
    };
  });

  const hasCashGap = minBalance < minReserveThreshold;
  const cashGapDeficit = minReserveThreshold - minBalance;

  // Filter upcoming outflows integrated with period and status
  const upcomingOutflows = useMemo(() => {
    const nowTime = new Date().setHours(0, 0, 0, 0);
    const maxTime = nowTime + upcomingPeriod * 86400000;

    return (allPayments || []).filter(p => {
      const isOutflow = p.type === 'outgoing' || p.type === 'outflow';
      if (!isOutflow) return false;

      const dueTime = new Date(p.due_date).getTime();
      const isPending = p.status !== 'completed' && p.status !== 'cancelled';
      const inPeriod = isNaN(dueTime) || dueTime <= maxTime;

      if (!isPending || !inPeriod) return false;

      if (upcomingStatusFilter === 'planned') return p.status === 'planned';
      if (upcomingStatusFilter === 'approved') return p.status === 'approved';
      if (upcomingStatusFilter === 'overdue') return dueTime < nowTime;

      return true;
    }).sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  }, [allPayments, upcomingPeriod, upcomingStatusFilter]);

  const totalUpcomingOutflow = useMemo(() => {
    return upcomingOutflows.reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [upcomingOutflows]);

  const upcomingOverdueCount = useMemo(() => {
    const nowTime = new Date().setHours(0, 0, 0, 0);
    return upcomingOutflows.filter(p => new Date(p.due_date).getTime() < nowTime).length;
  }, [upcomingOutflows]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPayment.amount || newPayment.amount <= 0) {
      alert('Укажите корректную сумму платежа.');
      return;
    }
    const paymentToAdd: any = {
      id: 'pay-' + Date.now(),
      ...newPayment,
      type: newPayment.type === 'incoming' ? 'inflow' : 'outflow',
      amount: Number(newPayment.amount),
      status: 'planned',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
      sync_status: 'synced',
      source: 'manual',
      owner_id: 'usr-owner-1',
      responsible_person: 'Собственник',
      remind_days_before: [5, 1],
    };

    if (onSavePayment) {
      onSavePayment(paymentToAdd);
    } else if (onAddPlannedPayment) {
      onAddPlannedPayment(paymentToAdd);
    }
    setIsModalOpen(false);
  };

  const formatMoney = (val: number, cur = 'UAH') => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: cur,
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">{t.calendar.title}</h2>
          <p className="text-xs text-slate-400">
            Календарное планирование денежных потоков и прогноз кассовых разрывов
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsVoiceModalOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer shadow-sm"
          >
            <Mic className="w-4 h-4" />
            Голосовой ввод
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {t.calendar.addPayment}
          </button>
        </div>
      </div>

      {/* Scenarios & Forecast Horizon Controls */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4 text-xs">
        {/* Scenarios */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium">
            {t.calendar.scenarioBase.includes('Базовий') ? 'Сценарій:' : t.calendar.scenarioBase.includes('Базовый') ? 'Сценарий:' : 'Scenario:'}
          </span>
          <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
            {(
              [
                { id: 'base', name: t.calendar.scenarioBase },
                { id: 'cautious', name: t.calendar.scenarioCautious },
                { id: 'optimistic', name: t.calendar.scenarioOptimistic },
                { id: 'crisis', name: t.calendar.scenarioCrisis },
              ] as const
            ).map(sc => (
              <button
                key={sc.id}
                onClick={() => setScenario(sc.id)}
                className={`px-3 py-1 rounded-md font-medium transition cursor-pointer ${
                  scenario === sc.id
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {sc.name}
              </button>
            ))}
          </div>
        </div>

        {/* Horizon */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium">
            {t.calendar.scenarioBase.includes('Базовий') ? 'Горизонт прогнозу:' : t.calendar.scenarioBase.includes('Базовый') ? 'Горизонт прогноза:' : 'Forecast Horizon:'}
          </span>
          <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
            {[7, 14, 30, 60, 90].map(days => (
              <button
                key={days}
                onClick={() => setHorizonDays(days)}
                className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                  horizonDays === days
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {days} {t.common.days}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cash Gap Alert Banner (if deficit detected) */}
      {hasCashGap ? (
        <div className="bg-rose-950/40 border border-rose-900/60 rounded-xl p-4 text-xs text-rose-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-sm text-white">
                {t.calendar.cashGapAlert} («{scenario}»)
              </div>
              <p className="text-rose-200/90 mt-0.5">
                {t.calendar.forecastDay}: <strong>{formatMoney(minBalance)}</strong> ({formatLocalizedDate(minBalanceDate, (t as any).locale || 'ru')}).
                {' '}<strong>-{formatMoney(cashGapDeficit)}</strong>.
              </p>
              <div className="text-[11px] text-rose-300 mt-1 font-medium">
                {t.calendar.recommendedAction}
              </div>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <span className="px-2.5 py-1 rounded-full bg-rose-900/80 text-rose-200 border border-rose-700 text-[11px] font-bold">
              {t.calendar.modal.priorityUrgent}
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-950/30 border border-emerald-800/50 rounded-xl p-4 text-xs text-emerald-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <div>
              <div className="font-bold text-white">{t.calendar.cashGapSafe} ({horizonDays} {t.common.days})</div>
              <p className="text-emerald-300/80 mt-0.5">
                {t.calendar.endingBalance}: {formatMoney(minBalance)} ({formatLocalizedDate(minBalanceDate, (t as any).locale || 'ru')}).
              </p>
            </div>
          </div>
          <span className="text-[11px] px-2.5 py-1 rounded bg-emerald-900/50 text-emerald-300 border border-emerald-700 font-mono">
            {t.common.success}
          </span>
        </div>
      )}

      {/* Dynamic Forecast Timeline Visualizer */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-emerald-400" />
            Кривая доступных денежных средств (Дни месяца)
          </h3>
          <span className="text-xs text-slate-400">
            Текущая ликвидность: <strong className="text-white">{formatMoney(totalCash)}</strong>
          </span>
        </div>

        {/* Bar & Trend preview */}
        <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-15 gap-1 pt-2">
          {curve.slice(0, 15).map(pt => {
            const isDanger = pt.balance < minReserveThreshold;
            const heightPct = Math.min(100, Math.max(15, (pt.balance / (totalCash * 1.3)) * 100));

            return (
              <div key={pt.date} className="flex flex-col items-center gap-1 group">
                <div className="text-[10px] text-slate-500 font-mono group-hover:text-slate-300">
                  {pt.label}
                </div>
                <div className="w-full bg-slate-800 h-24 rounded flex flex-col justify-end p-0.5 relative">
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full rounded-sm transition-all ${
                      isDanger ? 'bg-rose-500' : 'bg-emerald-500'
                    }`}
                  />
                </div>
                <div className="text-[9px] font-mono text-slate-400 truncate max-w-full">
                  {(pt.balance / 1000).toFixed(0)}k
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming Payments Widget (Moved from Dashboard and Integrated with Period Filters) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-800 text-xs">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-400" />
              <h3 className="font-bold text-slate-200 text-sm">
                Ближайшие выплаты и обязательства
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono text-[11px] border border-slate-700">
                {upcomingOutflows.length} платежей
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Сумма к списанию за {upcomingPeriod} дн.:{' '}
              <strong className="text-rose-400 font-mono text-xs">
                {formatMoney(totalUpcomingOutflow, currency)}
              </strong>
              {upcomingOverdueCount > 0 && (
                <span className="ml-2 text-rose-400 font-semibold">
                  (Внимание: {upcomingOverdueCount} просрочено!)
                </span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Period filter */}
            <div className="flex items-center bg-slate-800 p-1 rounded-lg border border-slate-700">
              <span className="text-slate-400 px-2 font-medium">Период:</span>
              {[7, 14, 30, 90].map(days => (
                <button
                  key={days}
                  onClick={() => setUpcomingPeriod(days)}
                  className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                    upcomingPeriod === days
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {days} дн.
                </button>
              ))}
            </div>

            {/* Status filter */}
            <div className="flex items-center bg-slate-800 p-1 rounded-lg border border-slate-700">
              <span className="text-slate-400 px-2 font-medium">Статус:</span>
              {(
                [
                  { id: 'all', label: 'Все' },
                  { id: 'planned', label: 'План' },
                  { id: 'approved', label: 'Утвержден' },
                  { id: 'overdue', label: 'Просрочено' },
                ] as const
              ).map(st => (
                <button
                  key={st.id}
                  onClick={() => setUpcomingStatusFilter(st.id)}
                  className={`px-2 py-1 rounded-md font-medium transition cursor-pointer ${
                    upcomingStatusFilter === st.id
                      ? 'bg-slate-700 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table of upcoming outflows */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-4">Срок выплаты</th>
                <th className="py-2.5 px-4">Контрагент</th>
                <th className="py-2.5 px-4">Назначение / Категория</th>
                <th className="py-2.5 px-4 text-right">Сумма к оплате</th>
                <th className="py-2.5 px-4 text-center">Статус</th>
                <th className="py-2.5 px-4 text-right">Действие</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {upcomingOutflows.map(p => {
                const dueDate = new Date(p.due_date);
                const isOverdue = dueDate < new Date() && p.status !== 'completed';
                const diffDays = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

                return (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono whitespace-nowrap">
                      <div className={isOverdue ? 'text-rose-400 font-bold' : 'text-slate-200'}>
                        {formatLocalizedDate(dueDate, (t as any).locale || 'ru')}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {isOverdue
                          ? `Просрочено на ${Math.abs(diffDays)} дн.`
                          : diffDays === 0
                          ? 'Сегодня!'
                          : `через ${diffDays} дн.`}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-white">{p.counterparty_name}</td>
                    <td className="py-3 px-4 text-slate-300">
                      <div>{p.description}</div>
                      <div className="text-slate-500 text-[11px]">{p.category}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-400 text-sm whitespace-nowrap">
                      -{formatMoney(p.amount, p.currency)}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                          p.status === 'approved'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : isOverdue
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}
                      >
                        {isOverdue ? 'Просрочен' : p.status === 'approved' ? 'Утвержден' : 'Запланирован'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {p.status === 'planned' && (
                        <button
                          onClick={() => {
                            if (onUpdatePaymentStatus) onUpdatePaymentStatus(p.id, 'approved');
                            else if (onExecutePayment) onExecutePayment(p.id);
                          }}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded text-[11px] font-medium transition cursor-pointer"
                        >
                          Утвердить
                        </button>
                      )}
                      {(p.status === 'approved' || p.status === 'planned') && (
                        <button
                          onClick={() => {
                            if (onExecutePayment) onExecutePayment(p.id);
                            else if (onUpdatePaymentStatus) onUpdatePaymentStatus(p.id, 'completed');
                          }}
                          className="ml-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2.5 py-1 rounded text-[11px] font-medium transition cursor-pointer"
                        >
                          Оплатить
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {upcomingOutflows.length === 0 && (
            <div className="py-6 text-center text-slate-500 text-xs">
              На выбранный горизонт ({upcomingPeriod} дней) запланированных выплат нет.
            </div>
          )}
        </div>
      </div>

      {/* Planned Payments List */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-teal-400" />
            Реестр запланированных платежей ({allPayments.length})
          </h3>
          <span className="text-xs text-slate-500">Утверждение и контроль сроков</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Срок (Due Date)</th>
                <th className="py-3 px-4">Тип</th>
                <th className="py-3 px-4">Контрагент</th>
                <th className="py-3 px-4">Назначение / Категория</th>
                <th className="py-3 px-4 text-right">Сумма</th>
                <th className="py-3 px-4 text-center">Статус</th>
                <th className="py-3 px-4 text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {allPayments.map(payment => {
                const isIncoming = payment.type === 'incoming' || payment.type === 'inflow';
                const isOverdue = new Date(payment.due_date) < new Date() && payment.status !== 'completed';

                return (
                  <tr key={payment.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono whitespace-nowrap">
                      <span className={isOverdue ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                        {formatLocalizedDate(payment.due_date, (t as any).locale || 'ru')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                          isIncoming
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-rose-950 text-rose-300 border border-rose-800'
                        }`}
                      >
                        {isIncoming ? 'Поступление' : 'Выплата'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-white">{payment.counterparty_name}</td>
                    <td className="py-3 px-4 text-slate-300">
                      <div>{payment.description}</div>
                      <div className="text-slate-500 text-[11px]">{payment.category}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold whitespace-nowrap">
                      <span className={isIncoming ? 'text-emerald-400' : 'text-rose-400'}>
                        {isIncoming ? '+' : '-'}
                        {formatMoney(payment.amount, payment.currency)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                          payment.status === 'approved'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : payment.status === 'planned'
                            ? 'bg-slate-800 text-slate-300 border border-slate-700'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}
                      >
                        {payment.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {payment.status === 'planned' && (
                          <button
                            onClick={() => {
                              if (onUpdatePaymentStatus) onUpdatePaymentStatus(payment.id, 'approved');
                              else if (onExecutePayment) onExecutePayment(payment.id);
                            }}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded text-[11px] font-medium transition cursor-pointer"
                          >
                            Утвердить
                          </button>
                        )}
                        {(payment.status === 'approved' || payment.status === 'planned') && (
                          <button
                            onClick={() => {
                              if (onExecutePayment) onExecutePayment(payment.id);
                              else if (onUpdatePaymentStatus) onUpdatePaymentStatus(payment.id, 'completed');
                            }}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2.5 py-1 rounded text-[11px] font-medium transition cursor-pointer"
                          >
                            Выполнить
                          </button>
                        )}

                        {/* Collective Approval Deletion Action (ТЗ v1.1 Mandatory) */}
                        <button
                          onClick={() => {
                            const reason = prompt(`Укажите причину удаления планового платежа #${payment.id} для запроса согласования всеми участниками компании:`);
                            if (reason && reason.trim()) {
                              if (onDeletePayment) onDeletePayment(payment.id);
                            }
                          }}
                          className="p-1 text-slate-500 hover:text-amber-400 rounded hover:bg-amber-950/40 transition cursor-pointer"
                          title="Запросить удаление платежа (Требуется 100% одобрение всех участников компании)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Planned Payment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                Запланировать платеж в календарь
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Направление платежа</label>
                  <select
                    value={newPayment.type}
                    onChange={e => setNewPayment({ ...newPayment, type: e.target.value as any })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                  >
                    <option value="outgoing">Выплата (расход / поставщик / аренда)</option>
                    <option value="incoming">Поступление (оплата от клиента)</option>
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
                      value={newPayment.amount || ''}
                      onChange={e => setNewPayment({ ...newPayment, amount: parseFloat(e.target.value) })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono text-sm focus:outline-none"
                    />
                    <select
                      value={newPayment.currency}
                      onChange={e => setNewPayment({ ...newPayment, currency: e.target.value as Currency })}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-2 text-slate-200 focus:outline-none"
                    >
                      <option value="UAH">UAH</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Контрагент</label>
                  <input
                    type="text"
                    required
                    placeholder="Название поставщика или покупателя"
                    value={newPayment.counterparty_name}
                    onChange={e => setNewPayment({ ...newPayment, counterparty_name: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Категория</label>
                  <input
                    type="text"
                    placeholder="Аренда, Налоги, Зарплата..."
                    value={newPayment.category}
                    onChange={e => setNewPayment({ ...newPayment, category: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Планируемая дата</label>
                  <input
                    type="date"
                    required
                    value={newPayment.planned_date}
                    onChange={e => setNewPayment({ ...newPayment, planned_date: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Крайний срок (Due Date)</label>
                  <input
                    type="date"
                    required
                    value={newPayment.due_date}
                    onChange={e => setNewPayment({ ...newPayment, due_date: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Назначение платежа</label>
                <input
                  type="text"
                  placeholder="Оплата счета №..."
                  value={newPayment.description}
                  onChange={e => setNewPayment({ ...newPayment, description: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-2 rounded-lg cursor-pointer transition shadow-sm"
                >
                  Добавить в календарь
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Voice Recognition & Structured Planned Payment Input */}
      <VoiceInputDialog
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        targetType="calendar"
        aiMode={aiMode}
        currency={currency}
        accounts={accounts}
        onConfirm={parsedData => {
          const handler = onAddPlannedPayment || onSavePayment;
          if (handler) {
            handler({
              id: 'pln-' + Date.now(),
              type: parsedData.type || 'outgoing',
              amount: Number(parsedData.amount) || 0,
              currency: currency,
              account_id: accounts[0]?.id || 'acc-1',
              counterparty_name: parsedData.counterparty_name || 'Контрагент из голосовой записи',
              category: parsedData.category || 'Платежи',
              description: parsedData.description || 'Голосовая запись платежа',
              planned_date: parsedData.due_date || new Date().toISOString().substring(0, 10),
              due_date: parsedData.due_date || new Date().toISOString().substring(0, 10),
              status: 'planned',
              is_recurring: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              version: 1,
              sync_status: 'synced',
              source: 'manual',
              owner_id: 'usr-owner-1',
            });
          }
        }}
      />
    </div>
  );
};
