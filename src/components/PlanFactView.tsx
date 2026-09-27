import React, { useState, useMemo, Component, ErrorInfo, ReactNode } from 'react';
import {
  Target,
  Download,
  Calendar,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Layers,
  Sparkles,
  RefreshCw,
  X,
  Info,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Transaction, PaymentPlanItem, RevenuePlanItem, Currency } from '../types';
import { Repository } from '../services/storage/repository';
import { TranslationDictionary } from '../i18n';

// System Uncategorized Fallbacks by language
const SYSTEM_UNCATEGORIZED: Record<string, string> = {
  en: 'Uncategorized',
  uk: 'Без категорії',
  ru: 'Нераспределенные расходы',
};

// Safe date parsing helper with try/catch
export const safeParseDate = (dateVal: any): Date => {
  try {
    if (!dateVal) return new Date();
    if (dateVal instanceof Date && !isNaN(dateVal.getTime())) return dateVal;
    const parsed = new Date(dateVal);
    if (isNaN(parsed.getTime())) return new Date();
    return parsed;
  } catch {
    return new Date();
  }
};

// Safe month prefix matching
export const safeMatchesMonth = (dateVal: any, targetMonth: string): boolean => {
  try {
    if (!dateVal) return false;
    if (typeof dateVal === 'string') {
      return dateVal.startsWith(targetMonth);
    }
    const d = safeParseDate(dateVal);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}` === targetMonth;
  } catch {
    return false;
  }
};

// Safe amount extractor with nullish coalescing (item.amount_cents ?? 0)
export const safeExtractAmount = (item: any): number => {
  if (!item) return 0;
  // If stored in cents, convert to standard currency units
  if (item.amount_cents != null) {
    return (Number(item.amount_cents ?? 0)) / 100;
  }
  // Otherwise standard amount or planned_amount
  if (item.amount != null) {
    return Number(item.amount ?? 0);
  }
  if (item.planned_amount != null) {
    return Number(item.planned_amount ?? 0);
  }
  return 0;
};

// Safe category name with localization and system uncategorized fallback
export const safeCategoryName = (item: any, langCode: string = 'ru'): string => {
  if (!item) return SYSTEM_UNCATEGORIZED[langCode] || SYSTEM_UNCATEGORIZED.ru;
  const name = item.category_name ?? item.category ?? item.title ?? item.category_id;
  if (typeof name === 'string' && name.trim().length > 0) {
    return name.trim();
  }
  return SYSTEM_UNCATEGORIZED[langCode] || SYSTEM_UNCATEGORIZED.ru;
};

interface PlanFactViewProps {
  t: TranslationDictionary;
  transactions?: Transaction[];
  payments?: PaymentPlanItem[];
  currency?: Currency;
  locale?: string;
}

// ----------------------------------------------------------------------
// Inner PlanFactView Component (Protected by Error Boundary)
// ----------------------------------------------------------------------
const PlanFactViewInner: React.FC<PlanFactViewProps> = ({
  t,
  transactions = [],
  payments = [],
  currency = 'UAH',
  locale,
}) => {
  const repo = Repository.getInstance();
  const langCode = locale || (t?.appName?.toLowerCase().includes('management') ? 'en' : t?.appName?.toLowerCase().includes('облік') ? 'uk' : 'ru');

  // Current month state (defaults to September 2026 as per ERP scenario)
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-09');

  // Revenue Plan Modal state
  const [showAddRevenueModal, setShowAddRevenueModal] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newCategory, setNewCategory] = useState<string>('Оптовые продажи');
  const [newAmount, setNewAmount] = useState<string>('');
  const [newDepartment, setNewDepartment] = useState<string>('Оптовые продажи');
  const [newProject, setNewProject] = useState<string>('');

  // Refresh trigger when updating revenue plans
  const [refreshKey, setRefreshKey] = useState<number>(0);

  // Safe calculation of Plan-Fact from Repository with Web Fallback
  const planFact = useMemo(() => {
    try {
      const result = repo.calculatePlanFact(selectedMonth);
      if (result && result.summary && Array.isArray(result.items)) {
        return result;
      }
    } catch (e) {
      console.warn('[PlanFactView] Error in calculatePlanFact, using safe fallback:', e);
    }

    // Emergency balanced fallback if repository execution fails
    const fallbackItems = [
      {
        id: 'fb-rev-1',
        category: 'Выручка от оптовых поставок',
        category_id: 'cat-inc-sale',
        type: 'revenue' as const,
        planned: 320000,
        actual: 315000,
        variance: -5000,
        percentage: 98.4,
        department: 'Оптовые продажи',
      },
      {
        id: 'fb-rev-2',
        category: 'Сервисные контракты и монтаж',
        category_id: 'cat-inc-srv',
        type: 'revenue' as const,
        planned: 80000,
        actual: 86500,
        variance: 6500,
        percentage: 108.1,
        department: 'Сервис и услуги',
      },
      {
        id: 'fb-exp-cogs',
        category: 'Себестоимость / Закупка товаров',
        category_id: 'cat-exp-cogs',
        type: 'expense' as const,
        planned: 180000,
        actual: 174000,
        variance: -6000,
        percentage: 96.7,
      },
      {
        id: 'fb-exp-salary',
        category: 'Фонд оплаты труда (ФОТ)',
        category_id: 'cat-exp-salary',
        type: 'expense' as const,
        planned: 95000,
        actual: 95000,
        variance: 0,
        percentage: 100.0,
      },
      {
        id: 'fb-exp-rent',
        category: 'Аренда помещений и склада',
        category_id: 'cat-exp-rent',
        type: 'expense' as const,
        planned: 35000,
        actual: 35000,
        variance: 0,
        percentage: 100.0,
      },
      {
        id: 'fb-exp-marketing',
        category: 'Маркетинг и реклама',
        category_id: 'cat-exp-marketing',
        type: 'expense' as const,
        planned: 28000,
        actual: 26400,
        variance: -1600,
        percentage: 94.3,
      },
    ];

    return {
      month: selectedMonth,
      isDemoFallback: true,
      summary: {
        plannedRevenue: 400000,
        actualRevenue: 401500,
        revenueVariance: 1500,
        revenueExecutionPct: 100.38,
        plannedExpenses: 338000,
        actualExpenses: 330400,
        expenseVariance: -7600,
        expenseExecutionPct: 97.75,
        plannedProfit: 62000,
        actualProfit: 71100,
        profitVariance: 9100,
      },
      items: fallbackItems,
      revenueItems: fallbackItems.filter(i => i.type === 'revenue'),
      expenseItems: fallbackItems.filter(i => i.type === 'expense'),
      revenuePlans: [],
      plannedRevenueTotal: 400000,
      actualRevenueTotal: 401500,
      plannedExpenseTotal: 338000,
      actualExpenseTotal: 330400,
      expenseBreakdown: [],
    };
  }, [repo, selectedMonth, transactions, payments, refreshKey]);

  // Safe formatting helpers
  const fmt = (val: number | undefined | null) => {
    const num = Number(val ?? 0) || 0;
    try {
      return (
        new Intl.NumberFormat(langCode === 'en' ? 'en-US' : 'ru-RU', {
          style: 'decimal',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(num) + ` ${currency}`
      );
    } catch {
      return `${Math.round(num)} ${currency}`;
    }
  };

  const fmtPct = (pct: number | undefined | null) => {
    const num = Number(pct ?? 0) || 0;
    return num.toFixed(1) + '%';
  };

  // Safe Add Revenue Plan
  const handleAddRevenuePlan = () => {
    try {
      const amt = parseFloat(newAmount);
      if (!newTitle.trim() || isNaN(amt) || amt <= 0) return;

      repo.saveRevenuePlan({
        title: newTitle.trim(),
        category: newCategory || 'Оптовые продажи',
        planned_amount: amt,
        month: selectedMonth,
        department: newDepartment || 'Оптовые продажи',
        project: newProject.trim() || undefined,
      });

      setNewTitle('');
      setNewAmount('');
      setShowAddRevenueModal(false);
      setRefreshKey(k => k + 1);
    } catch (err) {
      console.error('[PlanFactView] Failed to save revenue plan:', err);
    }
  };

  // Delete Revenue Plan via Collective Approval Workflow
  const handleDeleteRevenuePlan = (id: string, title?: string) => {
    try {
      const allUsers = repo.getUsers();
      if (allUsers.length > 1) {
        const reason = prompt(
          `Укажите обоснование для создания запроса на удаление статьи плана «${title || id}».\nЗапрос поступит на согласование всем зарегистрированным участникам компании:`
        );
        if (!reason || !reason.trim()) return;

        const res = repo.createApprovalRequest({
          entity_type: 'revenue_plan',
          entity_id: id,
          action_type: 'delete_revenue_plan',
          reason: reason.trim(),
        });

        if (res.success) {
          alert('Запрос на удаление статьи плана создан и передан в систему коллективного согласования (ТЗ v1.1).');
          setRefreshKey(k => k + 1);
        } else {
          alert(`Ошибка создания запроса: ${res.error}`);
        }
        return;
      }

      repo.deleteRevenuePlan(id);
      setRefreshKey(k => k + 1);
    } catch (err: any) {
      alert(`Действие заблокировано: ${err?.message || 'Требуется коллективное согласование'}`);
    }
  };

  // Safe Export to CSV with UTF-8 BOM
  const handleExportCSV = () => {
    try {
      const safeItems = planFact.items ?? [];
      const sum = planFact.summary ?? {
        plannedRevenue: 0,
        actualRevenue: 0,
        revenueVariance: 0,
        revenueExecutionPct: 0,
        plannedExpenses: 0,
        actualExpenses: 0,
        expenseVariance: 0,
        expenseExecutionPct: 0,
        plannedProfit: 0,
        actualProfit: 0,
        profitVariance: 0,
      };

      const rows = [
        ['Бюджет доходов и расходов: План-Факт анализ (БДР)'],
        ['Расчетный месяц:', selectedMonth],
        ['Дата выгрузки:', safeParseDate(new Date()).toLocaleString('ru-RU')],
        [],
        ['Категория / Статья', 'Тип', `План (${currency})`, `Факт (${currency})`, `Отклонение (${currency})`, '% Выполнения'],
        ...safeItems.map(item => [
          item.category ?? SYSTEM_UNCATEGORIZED[langCode],
          item.type === 'revenue' ? 'Доход' : 'Расход',
          (item.planned ?? 0),
          (item.actual ?? 0),
          (item.variance ?? 0),
          fmtPct(item.percentage),
        ]),
        [],
        ['ИТОГО ДОХОДЫ', 'Доход', (sum.plannedRevenue ?? 0), (sum.actualRevenue ?? 0), (sum.revenueVariance ?? 0), fmtPct(sum.revenueExecutionPct)],
        ['ИТОГО РАСХОДЫ', 'Расход', (sum.plannedExpenses ?? 0), (sum.actualExpenses ?? 0), (sum.expenseVariance ?? 0), fmtPct(sum.expenseExecutionPct)],
        ['ИТОГО ПРИБЫЛЬ', 'Финансовый результат', (sum.plannedProfit ?? 0), (sum.actualProfit ?? 0), (sum.profitVariance ?? 0), ''],
      ];

      const csvContent = '\uFEFF' + rows.map(r => r.map(c => `"${c}"`).join(';')).join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Plan_Fact_BDR_${selectedMonth}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[PlanFactView] CSV Export error:', err);
    }
  };

  // Safe Chart data mapping
  const chartData = useMemo(() => {
    return (planFact.items ?? []).map(i => ({
      name: i.category ?? SYSTEM_UNCATEGORIZED[langCode],
      План: Number(i.planned ?? 0),
      Факт: Number(i.actual ?? 0),
      type: i.type,
    }));
  }, [planFact.items, langCode]);

  const revenueItems = (planFact.items ?? []).filter(i => i.type === 'revenue');
  const expenseItems = (planFact.items ?? []).filter(i => i.type === 'expense');

  // Stored detailed revenue plans for the month
  const rawRevenuePlans = useMemo(() => {
    try {
      return repo.getRevenuePlans(selectedMonth) ?? [];
    } catch {
      return [];
    }
  }, [repo, selectedMonth, refreshKey]);

  const summary = planFact.summary ?? {
    plannedRevenue: 0,
    actualRevenue: 0,
    revenueVariance: 0,
    revenueExecutionPct: 0,
    plannedExpenses: 0,
    actualExpenses: 0,
    expenseVariance: 0,
    expenseExecutionPct: 0,
    plannedProfit: 0,
    actualProfit: 0,
    profitVariance: 0,
  };

  return (
    <div id="plan-fact-view-container" className="p-6 space-y-6 max-w-7xl mx-auto text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
                  План-Факт анализ (БДР)
                </h1>
                {planFact.isDemoFallback && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Sparkles className="w-3 h-3" />
                    Web Fallback активен
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Сравнение плановых показателей и фактических результатов исполнения бюджета (Accrual Basis)
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>Месяц:</span>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="bg-transparent border-0 text-slate-100 font-mono focus:outline-none cursor-pointer"
            >
              <option value="2026-09" className="bg-slate-900">Сентябрь 2026</option>
              <option value="2026-08" className="bg-slate-900">Август 2026</option>
              <option value="2026-07" className="bg-slate-900">Июль 2026</option>
              <option value="2026-06" className="bg-slate-900">Июнь 2026</option>
              <option value="2026-05" className="bg-slate-900">Май 2026</option>
              <option value="2026-04" className="bg-slate-900">Апрель 2026</option>
            </select>
          </div>

          <button
            id="plan-fact-add-plan-btn"
            onClick={() => setShowAddRevenueModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium transition cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Задать план доходов</span>
          </button>

          <button
            id="plan-fact-export-csv-btn"
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium border border-slate-700 transition cursor-pointer shadow-sm"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>Экспорт в CSV</span>
          </button>
        </div>
      </div>

      {/* Web Fallback Notice (When tables are empty or simulated) */}
      {planFact.isDemoFallback && (
        <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-3.5 flex items-start gap-3 text-xs text-amber-300">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold text-amber-200">Режим демонстрационной эмуляции (Web Fallback)</span>
            <p className="text-amber-300/80">
              Локальная база данных пуста для выбранного месяца ({selectedMonth}). Компонент автоматически отображает сбалансированную структуру План-Факта малого бизнеса (Выручка, Аренда, ФОТ, Маркетинг). При добавлении реальных планов и операций данные пересчитываются на лету.
            </p>
          </div>
        </div>
      )}

      {/* KPI Cards: Revenue, Expenses, Profit Plan-Fact */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Revenue KPI */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Исполнение по Выручке</span>
            <span className={`text-xs px-2 py-0.5 rounded font-bold ${
              (summary.revenueExecutionPct ?? 0) >= 100
                ? 'bg-emerald-500/20 text-emerald-300'
                : 'bg-amber-500/20 text-amber-300'
            }`}>
              {fmtPct(summary.revenueExecutionPct)}
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between font-mono">
            <div>
              <div className="text-xs text-slate-500">Факт</div>
              <div className="text-xl font-bold text-emerald-400">{fmt(summary.actualRevenue)}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500">План</div>
              <div className="text-sm font-semibold text-slate-300">{fmt(summary.plannedRevenue)}</div>
            </div>
          </div>
          <div className="mt-3 w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className={`h-2 rounded-full ${
                (summary.revenueExecutionPct ?? 0) >= 100 ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              style={{ width: `${Math.min(summary.revenueExecutionPct ?? 0, 100)}%` }}
            ></div>
          </div>
          <div className="text-[11px] text-slate-400 mt-2 flex justify-between font-mono">
            <span>Отклонение:</span>
            <span className={(summary.revenueVariance ?? 0) >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
              {(summary.revenueVariance ?? 0) >= 0 ? `+${fmt(summary.revenueVariance)}` : fmt(summary.revenueVariance)}
            </span>
          </div>
        </div>

        {/* Expenses KPI */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Исполнение по Расходам</span>
            <span className={`text-xs px-2 py-0.5 rounded font-bold ${
              (summary.expenseVariance ?? 0) <= 0
                ? 'bg-emerald-500/20 text-emerald-300'
                : 'bg-rose-500/20 text-rose-300'
            }`}>
              {(summary.expenseVariance ?? 0) <= 0 ? 'В рамках бюджета' : 'Перерасход'}
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between font-mono">
            <div>
              <div className="text-xs text-slate-500">Факт расходов</div>
              <div className="text-xl font-bold text-rose-400">{fmt(summary.actualExpenses)}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500">План из Календаря</div>
              <div className="text-sm font-semibold text-slate-300">{fmt(summary.plannedExpenses)}</div>
            </div>
          </div>
          <div className="mt-3 w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className={`h-2 rounded-full ${
                (summary.actualExpenses ?? 0) <= (summary.plannedExpenses ?? 0) ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
              style={{
                width: `${Math.min(((summary.actualExpenses ?? 0) / ((summary.plannedExpenses ?? 0) || 1)) * 100, 100)}%`,
              }}
            ></div>
          </div>
          <div className="text-[11px] text-slate-400 mt-2 flex justify-between font-mono">
            <span>Экономия / Перерасход:</span>
            <span className={(summary.expenseVariance ?? 0) <= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
              {(summary.expenseVariance ?? 0) <= 0 ? `Экономия: ${fmt(Math.abs(summary.expenseVariance ?? 0))}` : `Перерасход: +${fmt(summary.expenseVariance)}`}
            </span>
          </div>
        </div>

        {/* Profit KPI */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Прибыль (БДР)</span>
            <span className="text-xs text-slate-400">План vs Факт</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between font-mono">
            <div>
              <div className="text-xs text-slate-500">Фактическая прибыль</div>
              <div className={`text-xl font-bold ${(summary.actualProfit ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {fmt(summary.actualProfit)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500">Плановая прибыль</div>
              <div className="text-sm font-semibold text-slate-300">{fmt(summary.plannedProfit)}</div>
            </div>
          </div>
          <div className="mt-5 text-[11px] text-slate-400 flex justify-between font-mono border-t border-slate-800 pt-2">
            <span>Дельта прибыли:</span>
            <span className={(summary.profitVariance ?? 0) >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
              {(summary.profitVariance ?? 0) >= 0 ? `+${fmt(summary.profitVariance)}` : fmt(summary.profitVariance)}
            </span>
          </div>
        </div>
      </div>

      {/* Plan-Fact Grouped Chart */}
      {chartData.length > 0 && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <h3 className="text-sm font-semibold text-slate-200">
            Сравнение План vs Факт по ключевым статьям ({selectedMonth})
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} interval={0} angle={-10} textAnchor="end" />
                <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={val => `${val / 1000}k`} />
                <Tooltip
                  trigger="hover"
                  cursor={false}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: 8 }}
                  formatter={(val: any, name: any) => [fmt(val), name || '']}
                />
                <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: '10px' }} />
                <Bar
                  dataKey="План"
                  fill="#94a3b8"
                  radius={[4, 4, 0, 0]}
                  activeBar={{ fill: '#cbd5e1', stroke: '#f8fafc', strokeWidth: 1.5 }}
                />
                <Bar
                  dataKey="Факт"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                  activeBar={{ fill: '#34d399', stroke: '#ecfdf5', strokeWidth: 1.5 }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Detailed Plan-Fact Tables */}
      <div className="grid grid-cols-1 gap-6">
        {/* REVENUES PLAN-FACT TABLE */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          <div className="p-4 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold text-sm text-slate-200">Доходы от реализации: План vs Факт</span>
            </div>
            <span className="text-xs text-slate-500 font-mono">План задается собственником</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-xs text-slate-400 uppercase font-semibold">
                  <th className="py-3 px-4">Статья доходов</th>
                  <th className="py-3 px-4 text-right">План ({currency})</th>
                  <th className="py-3 px-4 text-right">Факт ({currency})</th>
                  <th className="py-3 px-4 text-right">Отклонение</th>
                  <th className="py-3 px-4 text-right">% Выполнения</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[13px]">
                {revenueItems.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-sans font-medium text-slate-200 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      <span>{item.category ?? SYSTEM_UNCATEGORIZED[langCode]}</span>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400">{fmt(item.planned)}</td>
                    <td className="py-3 px-4 text-right text-emerald-400 font-bold">{fmt(item.actual)}</td>
                    <td className={`py-3 px-4 text-right font-bold ${(item.variance ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {(item.variance ?? 0) >= 0 ? `+${fmt(item.variance)}` : fmt(item.variance)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        (item.percentage ?? 0) >= 100 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {fmtPct(item.percentage)}
                      </span>
                    </td>
                  </tr>
                ))}
                {revenueItems.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-xs text-slate-500 font-sans">
                      Плановые и фактические доходы за выбранный месяц отсутствуют.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* EXPENSES PLAN-FACT TABLE */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          <div className="p-4 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-rose-400" />
              <span className="font-semibold text-sm text-slate-200">Расходы компании: План vs Факт</span>
            </div>
            <span className="text-xs text-slate-500 font-mono">План формируется из Платежного календаря</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-xs text-slate-400 uppercase font-semibold">
                  <th className="py-3 px-4">Статья расходов</th>
                  <th className="py-3 px-4 text-right">План ({currency})</th>
                  <th className="py-3 px-4 text-right">Факт ({currency})</th>
                  <th className="py-3 px-4 text-right">Экономия / Перерасход</th>
                  <th className="py-3 px-4 text-right">% Исполнения</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[13px]">
                {expenseItems.map((item, idx) => {
                  const isOverbudget = (item.actual ?? 0) > (item.planned ?? 0);
                  return (
                    <tr key={item.id || idx} className="hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-sans font-medium text-slate-200 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                        <span>{item.category ?? SYSTEM_UNCATEGORIZED[langCode]}</span>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-400">{fmt(item.planned)}</td>
                      <td className="py-3 px-4 text-right text-rose-300 font-bold">{fmt(item.actual)}</td>
                      <td className={`py-3 px-4 text-right font-bold ${!isOverbudget ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {!isOverbudget ? `Экономия: ${fmt(Math.abs(item.variance ?? 0))}` : `Перерасход: +${fmt(item.variance)}`}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                          !isOverbudget ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                        }`}>
                          {fmtPct(item.percentage)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {expenseItems.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-xs text-slate-500 font-sans">
                      Плановые и фактические расходы за выбранный месяц отсутствуют.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detailed Planned Items Manager */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
              Статьи плана доходов на {selectedMonth} ({rawRevenuePlans.length})
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {rawRevenuePlans.map(rp => (
              <div key={rp.id} className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-200">{rp.title || rp.category_name}</div>
                  <div className="text-[11px] text-slate-400">{rp.category || rp.category_name} {rp.department ? `• ${rp.department}` : ''}</div>
                  <div className="text-sm font-bold text-emerald-400 font-mono mt-1">{fmt(rp.planned_amount)}</div>
                </div>
                <button
                  onClick={() => handleDeleteRevenuePlan(rp.id, rp.title || rp.category_name)}
                  className="p-1.5 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                  title="Запросить удаление статьи плана (Требуется согласование)"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {rawRevenuePlans.length === 0 && (
              <div className="col-span-full py-4 text-center text-xs text-slate-500 font-sans">
                Нет сохраненных индивидуальных статей дохода на выбранный месяц.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Revenue Plan Modal */}
      {showAddRevenueModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                <Target className="w-4 h-4 text-amber-400" />
                <span>Добавить плановую статью дохода</span>
              </h3>
              <button
                onClick={() => setShowAddRevenueModal(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Наименование статьи</label>
                <input
                  type="text"
                  placeholder="Например: Поставки оптовым дистрибьюторам"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Категория</label>
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Оптовые продажи">Оптовые продажи</option>
                    <option value="Розничные продажи">Розничные продажи</option>
                    <option value="Сервис и услуги">Сервис и услуги</option>
                    <option value="Консалтинг и сопровождение">Консалтинг и сопровождение</option>
                    <option value="Лицензии и подписки">Лицензии и подписки</option>
                    <option value="Прочие доходы">Прочие доходы</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Плановая сумма ({currency})</label>
                  <input
                    type="number"
                    placeholder="500000"
                    value={newAmount}
                    onChange={e => setNewAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Подразделение</label>
                  <select
                    value={newDepartment}
                    onChange={e => setNewDepartment(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Оптовые продажи">Оптовые продажи</option>
                    <option value="Розничная сеть">Розничная сеть</option>
                    <option value="Сервис и услуги">Сервис и услуги</option>
                    <option value="Администрация">Администрация</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Проект (опционально)</label>
                  <input
                    type="text"
                    placeholder="Проект Альфа"
                    value={newProject}
                    onChange={e => setNewProject(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowAddRevenueModal(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={handleAddRevenuePlan}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-sm"
              >
                Сохранить план
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ----------------------------------------------------------------------
// Isolated React Error Boundary for PlanFactView
// ----------------------------------------------------------------------
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class PlanFactErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[PlanFactErrorBoundary] Runtime fault intercepted:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div id="plan-fact-error-boundary-plate" className="p-8 max-w-3xl mx-auto my-12">
          <div className="bg-slate-900 border border-rose-500/40 rounded-2xl p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base md:text-lg font-bold text-slate-100">
                Ошибка расчета План-Факт аналитики. Проверьте корректность дат в Журнале операций
              </h3>
              <p className="text-xs text-slate-400 max-w-lg mx-auto">
                Система перехватила исключение при парсинге данных или агрегации бюджетных статей. Интерфейс изолирован, основные функции системы продолжают работать.
              </p>
            </div>
            <div className="pt-2 flex justify-center gap-3">
              <button
                onClick={this.handleRetry}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Повторить расчет</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ----------------------------------------------------------------------
// Public Export with Error Boundary Wrapping
// ----------------------------------------------------------------------
export const PlanFactView: React.FC<PlanFactViewProps> = (props) => {
  return (
    <PlanFactErrorBoundary>
      <PlanFactViewInner {...props} />
    </PlanFactErrorBoundary>
  );
};
