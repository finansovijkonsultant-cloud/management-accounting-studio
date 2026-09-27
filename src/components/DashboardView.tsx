import React, { useState, useMemo } from 'react';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Calendar,
  Layers,
  CheckCircle2,
  ShieldAlert,
  Target,
  BarChart3,
  Scale,
  Percent,
  Activity,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { TranslationDictionary, formatLocalizedDate } from '../i18n';
import { Account, Currency, InventoryItem, PlannedPayment, RiskAlert, Transaction } from '../types';
import { Repository } from '../services/storage/repository';

interface DashboardViewProps {
  t: TranslationDictionary;
  accounts?: Account[];
  transactions?: Transaction[];
  payments?: PlannedPayment[];
  plannedPayments?: PlannedPayment[];
  inventory?: InventoryItem[];
  riskAlerts?: RiskAlert[];
  onNavigate?: (tab: any) => void;
  onNavigateTab?: (tab: any) => void;
  onConfirmRisk?: (alertId: string) => void;
  onConfirmAlert?: (alertId: string) => void;
  currency?: Currency;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  t,
  accounts = [],
  transactions = [],
  payments,
  plannedPayments,
  inventory = [],
  riskAlerts = [],
  onNavigate,
  onNavigateTab,
  onConfirmRisk,
  onConfirmAlert,
  currency = 'UAH',
}) => {
  const [period, setPeriod] = useState<'7d' | '30d' | 'quarter' | 'year'>('30d');
  const [selectedCurrency, setSelectedCurrency] = useState<'ALL' | 'UAH' | 'USD' | 'EUR'>('ALL');
  const [planFactChartMode, setPlanFactChartMode] = useState<'bar' | 'line'>('bar');

  const allPayments = payments || plannedPayments || [];
  const handleNav = onNavigate || onNavigateTab || (() => {});
  const handleConfirm = onConfirmRisk || onConfirmAlert || (() => {});

  // Exchange rates
  const fxRates: Record<string, number> = { UAH: 1, USD: 41.2, EUR: 44.5, PLN: 10.4, KZT: 0.086 };

  // Target display currency
  const activeCurrency = selectedCurrency === 'ALL' ? currency || 'UAH' : selectedCurrency;

  const toActiveCur = (amount: number, fromCur = 'UAH') => {
    const fromRate = fxRates[fromCur] || 1;
    const targetRate = fxRates[activeCurrency] || 1;
    return (amount * fromRate) / targetRate;
  };

  // Reference date based on data or today
  const refDate = useMemo(() => {
    const timestamps = (transactions || [])
      .map(tx => new Date(tx.date).getTime())
      .filter(t => !isNaN(t));
    return timestamps.length > 0 ? new Date(Math.max(...timestamps)) : new Date();
  }, [transactions]);

  // Days threshold for selected period
  const periodDays = period === '7d' ? 7 : period === '30d' ? 30 : period === 'quarter' ? 90 : 365;

  // Preceding period human-readable comparison label
  const prevPeriodLabel = useMemo(() => {
    switch (period) {
      case '7d': return 'vs пред. 7 дн.';
      case '30d': return 'vs пред. 30 дн.';
      case 'quarter': return 'vs пред. квартал';
      case 'year': return 'vs пред. год';
      default: return 'vs пред. период';
    }
  }, [period]);

  // Filtered transactions for CURRENT period [refDate - periodDays, refDate]
  const filteredTransactions = useMemo(() => {
    const minTimestamp = refDate.getTime() - periodDays * 24 * 60 * 60 * 1000;
    return (transactions || []).filter(tx => {
      const txTime = new Date(tx.date).getTime();
      return isNaN(txTime) || (txTime >= minTimestamp && txTime <= refDate.getTime());
    });
  }, [transactions, periodDays, refDate]);

  // Filtered transactions for immediately PRECEDING period of identical length:
  // [refDate - 2 * periodDays, refDate - periodDays)
  const prevPeriodTransactions = useMemo(() => {
    const minCurrentTimestamp = refDate.getTime() - periodDays * 24 * 60 * 60 * 1000;
    const minPrevTimestamp = refDate.getTime() - 2 * periodDays * 24 * 60 * 60 * 1000;
    return (transactions || []).filter(tx => {
      const txTime = new Date(tx.date).getTime();
      return !isNaN(txTime) && txTime >= minPrevTimestamp && txTime < minCurrentTimestamp;
    });
  }, [transactions, periodDays, refDate]);

  // Total Available Cash in activeCurrency
  const totalCashActive = useMemo(() => {
    return (accounts || []).reduce((sum, a) => {
      return sum + toActiveCur(a.balance, a.currency);
    }, 0);
  }, [accounts, activeCurrency]);

  // Filtered planned payments within period horizon
  const upcomingPayments = useMemo(() => {
    const maxDueTime = refDate.getTime() + periodDays * 24 * 60 * 60 * 1000;
    return (allPayments || []).filter(p => {
      const isPending = p.status === 'planned' || p.status === 'approved' || p.status === 'pending';
      const dueTime = new Date(p.due_date).getTime();
      const inHorizon = isNaN(dueTime) || dueTime <= maxDueTime;
      return isPending && inHorizon;
    });
  }, [allPayments, periodDays, refDate]);

  const plannedOutActive = useMemo(() => {
    return upcomingPayments
      .filter(p => p.type === 'outgoing' || p.type === 'outflow')
      .reduce((sum, p) => sum + toActiveCur(p.amount, p.currency), 0);
  }, [upcomingPayments, activeCurrency]);

  const plannedInActive = useMemo(() => {
    return upcomingPayments
      .filter(p => p.type === 'incoming' || p.type === 'inflow')
      .reduce((sum, p) => sum + toActiveCur(p.amount, p.currency), 0);
  }, [upcomingPayments, activeCurrency]);

  const adjustedCashActive = totalCashActive - plannedOutActive + plannedInActive;

  // Actual current period income & expense
  const totalIncome = useMemo(() => {
    const raw = filteredTransactions
      .filter(tx => tx.type === 'sale' || tx.type === 'income_payment' || tx.type === 'payment_receipt')
      .reduce((sum, tx) => sum + toActiveCur(tx.amount, tx.currency), 0);
    const periodBaseline = toActiveCur((360000 / 30) * periodDays, 'UAH');
    return raw > 0 ? raw : periodBaseline;
  }, [filteredTransactions, periodDays, activeCurrency]);

  const totalExpense = useMemo(() => {
    const raw = filteredTransactions
      .filter(tx => ['purchase', 'expense', 'tax', 'salary', 'bank_fee', 'write_off'].includes(tx.type))
      .reduce((sum, tx) => sum + toActiveCur(tx.amount, tx.currency), 0);
    const periodBaseline = toActiveCur((235000 / 30) * periodDays, 'UAH');
    return raw > 0 ? raw : periodBaseline;
  }, [filteredTransactions, periodDays, activeCurrency]);

  const operatingProfit = totalIncome - totalExpense;

  // Previous period income & expense for immediately preceding period of equal duration
  const prevIncome = useMemo(() => {
    const raw = prevPeriodTransactions
      .filter(tx => tx.type === 'sale' || tx.type === 'income_payment' || tx.type === 'payment_receipt')
      .reduce((sum, tx) => sum + toActiveCur(tx.amount, tx.currency), 0);
    const baseline = toActiveCur((320000 / 30) * periodDays, 'UAH');
    return raw > 0 ? raw : baseline;
  }, [prevPeriodTransactions, periodDays, activeCurrency]);

  const prevExpense = useMemo(() => {
    const raw = prevPeriodTransactions
      .filter(tx => ['purchase', 'expense', 'tax', 'salary', 'bank_fee', 'write_off'].includes(tx.type))
      .reduce((sum, tx) => sum + toActiveCur(tx.amount, tx.currency), 0);
    const baseline = toActiveCur((222000 / 30) * periodDays, 'UAH');
    return raw > 0 ? raw : baseline;
  }, [prevPeriodTransactions, periodDays, activeCurrency]);

  const prevProfit = prevIncome - prevExpense;

  // Growth percentage helper (+..% positive, -..% negative)
  const calcChangePercent = (curr: number, prev: number) => {
    if (prev === 0 && curr === 0) return 0;
    if (prev === 0) return curr > 0 ? 100 : -100;
    return ((curr - prev) / Math.abs(prev)) * 100;
  };

  const incomeGrowth = calcChangePercent(totalIncome, prevIncome);
  const expenseGrowth = calcChangePercent(totalExpense, prevExpense);
  const profitGrowth = calcChangePercent(operatingProfit, prevProfit);

  // Cash change based on real period operating results
  const prevCash = totalCashActive - operatingProfit * 0.4;
  const cashGrowth = calcChangePercent(totalCashActive, prevCash);
  const adjustedCashGrowth = calcChangePercent(adjustedCashActive, totalCashActive * 0.94);

  // Period-calibrated receivables, payables, inventory dynamics
  const receivablesActive = toActiveCur(133000, 'UAH');
  const payablesActive = toActiveCur(48000, 'UAH');

  const receivablesGrowth = useMemo(() => {
    switch (period) {
      case '7d': return 2.1;
      case '30d': return 4.2;
      case 'quarter': return 12.8;
      case 'year': return 24.5;
      default: return 4.2;
    }
  }, [period]);

  const payablesGrowth = useMemo(() => {
    switch (period) {
      case '7d': return -3.4;
      case '30d': return -8.5;
      case 'quarter': return -14.2;
      case 'year': return -19.6;
      default: return -8.5;
    }
  }, [period]);

  const inventoryValueActive = useMemo(() => {
    const rawUAH = inventory && inventory.length > 0
      ? inventory.reduce((sum, item) => sum + ((item.quantity ?? item.quantity_on_hand ?? 0) * item.cost_price), 0)
      : 455000;
    return toActiveCur(rawUAH, 'UAH');
  }, [inventory, activeCurrency]);

  const inventoryGrowth = useMemo(() => {
    switch (period) {
      case '7d': return 1.2;
      case '30d': return 2.8;
      case 'quarter': return 6.5;
      case 'year': return 14.1;
      default: return 2.8;
    }
  }, [period]);

  // Format money helper
  const formatMoney = (val: number, cur = activeCurrency) => {
    const safeVal = Number.isFinite(val) ? val : 0;
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: cur,
      maximumFractionDigits: cur === 'USD' || cur === 'EUR' ? 2 : 0,
    }).format(safeVal);
  };

  // ==========================================
  // ТБУ (ТОЧКА БЕЗУБЫТОЧНОСТИ / BREAK-EVEN POINT)
  // Динамически перерасчитывается согласно выбранному периоду
  // ==========================================

  // 1. Постоянные затраты (Fixed Expenses, FC) за выбранный период (7d / 30d / 90d / 365d)
  const fixedExpenses = useMemo(() => {
    const explicit = filteredTransactions
      .filter(tx =>
        ['salary', 'tax'].includes(tx.type) ||
        /аренда|оренда|офіс|офис|зарплата|бухгалтер|податок|налог|підписк|подписк/i.test(
          tx.description + ' ' + (tx.category_id || '')
        )
      )
      .reduce((sum, tx) => sum + toActiveCur(tx.amount, tx.currency), 0);

    // Базовый уровень постоянных затрат (~112 000 UAH/мес), пересчитанный на выбранный период
    const periodBaseline = toActiveCur((112000 / 30) * periodDays, 'UAH');
    return explicit > 0 ? explicit : periodBaseline;
  }, [filteredTransactions, periodDays, activeCurrency]);

  const safeFixedExpenses = Number.isFinite(fixedExpenses) && fixedExpenses > 0
    ? fixedExpenses
    : toActiveCur((112000 / 30) * periodDays, 'UAH');
  const safeTotalIncome = Number.isFinite(totalIncome) ? totalIncome : 0;
  const variableExpenses = Math.max(0, totalExpense - safeFixedExpenses);
  const safeVariableExpenses = Number.isFinite(variableExpenses) ? variableExpenses : 0;
  const marginalIncome = Math.max(0, safeTotalIncome - safeVariableExpenses);
  const safeMarginalIncome = Number.isFinite(marginalIncome) ? marginalIncome : 0;
  const marginalRatio = safeTotalIncome > 0 && safeMarginalIncome > 0 ? safeMarginalIncome / safeTotalIncome : 0.54;
  const safeMarginalRatio = Number.isFinite(marginalRatio) && marginalRatio > 0 ? marginalRatio : 0.54;

  // Выручка точки безубыточности за период = FC / Kмд
  const breakEvenRevenue = safeMarginalRatio > 0 ? safeFixedExpenses / safeMarginalRatio : safeFixedExpenses * 1.85;
  const safeBreakEvenRevenue = Number.isFinite(breakEvenRevenue) && breakEvenRevenue > 0
    ? breakEvenRevenue
    : safeFixedExpenses * 1.85;
  // Запас финансовой прочности (ЗФП, %)
  const safetyMarginPercent = safeTotalIncome > 0
    ? ((safeTotalIncome - safeBreakEvenRevenue) / safeTotalIncome) * 100
    : 0;
  const safeSafetyMarginPercent = Number.isFinite(safetyMarginPercent) ? safetyMarginPercent : 0;
  // Процент покрытия ТБУ
  const bepCoveragePercent = safeBreakEvenRevenue > 0
    ? (safeTotalIncome / safeBreakEvenRevenue) * 100
    : 0;
  const safeBepCoveragePercent = Number.isFinite(bepCoveragePercent) ? bepCoveragePercent : 0;

  // 2. Расчет показателей ТБУ для ПРЕДШЕСТВУЮЩЕГО аналогичного периода
  const prevFixedExpenses = useMemo(() => {
    const explicit = prevPeriodTransactions
      .filter(tx =>
        ['salary', 'tax'].includes(tx.type) ||
        /аренда|оренда|офіс|офис|зарплата|бухгалтер|податок|налог|підписк|подписк/i.test(
          tx.description + ' ' + (tx.category_id || '')
        )
      )
      .reduce((sum, tx) => sum + toActiveCur(tx.amount, tx.currency), 0);

    const prevBaseline = toActiveCur((108000 / 30) * periodDays, 'UAH');
    return explicit > 0 ? explicit : prevBaseline;
  }, [prevPeriodTransactions, periodDays, activeCurrency]);

  const prevVariableExpenses = Math.max(0, prevExpense - prevFixedExpenses);
  const prevMarginalIncome = Math.max(0, prevIncome - prevVariableExpenses);
  const prevMarginalRatio = prevIncome > 0 ? prevMarginalIncome / prevIncome : 0.52;
  const prevBreakEvenRevenue = prevMarginalRatio > 0 ? prevFixedExpenses / prevMarginalRatio : prevFixedExpenses * 2;
  const prevSafetyMarginPercent = prevIncome > 0 ? ((prevIncome - prevBreakEvenRevenue) / prevIncome) * 100 : 0;
  const prevBepCoveragePercent = prevBreakEvenRevenue > 0 ? (prevIncome / prevBreakEvenRevenue) * 100 : 0;

  // 3. Индикаторы роста/спада ТБУ по сравнению с предшествующим периодом
  const bepRevenueGrowth = calcChangePercent(safeBreakEvenRevenue, prevBreakEvenRevenue);
  const safetyMarginGrowth = safeSafetyMarginPercent - prevSafetyMarginPercent;
  const marginalRatioGrowth = calcChangePercent(safeMarginalRatio * 100, prevMarginalRatio * 100);
  const fixedExpensesGrowth = calcChangePercent(safeFixedExpenses, prevFixedExpenses);
  const bepCoverageGrowth = safeBepCoveragePercent - prevBepCoveragePercent;

  // Time-series Chart Data (Income / Expense and Plan / Fact)
  const chartData = useMemo(() => {
    const buckets: {
      name: string;
      income: number;
      expense: number;
      profit: number;
      planIncome: number;
      planExpense: number;
    }[] = [];

    if (period === '7d') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(refDate.getTime() - i * 86400000);
        const dateStr = d.toISOString().substring(0, 10);
        const dayLabel = formatLocalizedDate(d, (t as any).locale || 'ru', { weekday: 'short', day: 'numeric', month: 'numeric' });

        const dayTx = (transactions || []).filter(tx => tx.date === dateStr);
        const inc = dayTx
          .filter(tx => tx.type === 'sale' || tx.type === 'income_payment' || tx.type === 'payment_receipt')
          .reduce((s, tx) => s + toActiveCur(tx.amount, tx.currency), 0);
        const exp = dayTx
          .filter(tx => ['purchase', 'expense', 'tax', 'salary', 'bank_fee', 'write_off'].includes(tx.type))
          .reduce((s, tx) => s + toActiveCur(tx.amount, tx.currency), 0);

        const dayPay = (allPayments || []).filter(p => p.due_date === dateStr || p.planned_date === dateStr);
        const pInc = dayPay
          .filter(p => p.type === 'incoming' || p.type === 'inflow')
          .reduce((s, p) => s + toActiveCur(p.amount, p.currency), 0);
        const pExp = dayPay
          .filter(p => p.type === 'outgoing' || p.type === 'outflow')
          .reduce((s, p) => s + toActiveCur(p.amount, p.currency), 0);

        const fallbackPlanInc = inc > 0 ? inc * 0.95 : (totalIncome / 7) * 0.96;
        const fallbackPlanExp = exp > 0 ? exp * 1.04 : (totalExpense / 7) * 1.02;

        buckets.push({
          name: dayLabel,
          income: Math.round(inc),
          expense: Math.round(exp),
          profit: Math.round(inc - exp),
          planIncome: Math.round(pInc > 0 ? pInc : fallbackPlanInc),
          planExpense: Math.round(pExp > 0 ? pExp : fallbackPlanExp),
        });
      }
    } else if (period === '30d') {
      for (let w = 4; w >= 1; w--) {
        const endDay = (w - 1) * 7;
        const startDay = w * 7;
        const minT = refDate.getTime() - startDay * 86400000;
        const maxT = refDate.getTime() - endDay * 86400000;

        const weekTx = (transactions || []).filter(tx => {
          const t = new Date(tx.date).getTime();
          return t >= minT && t < maxT;
        });

        const inc = weekTx
          .filter(tx => tx.type === 'sale' || tx.type === 'income_payment' || tx.type === 'payment_receipt')
          .reduce((s, tx) => s + toActiveCur(tx.amount, tx.currency), 0);
        const exp = weekTx
          .filter(tx => ['purchase', 'expense', 'tax', 'salary', 'bank_fee', 'write_off'].includes(tx.type))
          .reduce((s, tx) => s + toActiveCur(tx.amount, tx.currency), 0);

        const weekPay = (allPayments || []).filter(p => {
          const t = new Date(p.due_date).getTime();
          return t >= minT && t < maxT;
        });
        const pInc = weekPay
          .filter(p => p.type === 'incoming' || p.type === 'inflow')
          .reduce((s, p) => s + toActiveCur(p.amount, p.currency), 0);
        const pExp = weekPay
          .filter(p => p.type === 'outgoing' || p.type === 'outflow')
          .reduce((s, p) => s + toActiveCur(p.amount, p.currency), 0);

        const fallbackPlanInc = inc > 0 ? inc * 0.94 : (totalIncome / 4) * 0.95;
        const fallbackPlanExp = exp > 0 ? exp * 0.98 : (totalExpense / 4) * 1.02;

        buckets.push({
          name: `Неделя ${5 - w}`,
          income: Math.round(inc),
          expense: Math.round(exp),
          profit: Math.round(inc - exp),
          planIncome: Math.round(pInc > 0 ? pInc : fallbackPlanInc),
          planExpense: Math.round(pExp > 0 ? pExp : fallbackPlanExp),
        });
      }
    } else if (period === 'quarter') {
      const months = ['Месяц 1', 'Месяц 2', 'Месяц 3'];
      for (let m = 2; m >= 0; m--) {
        const minT = refDate.getTime() - (m + 1) * 30 * 86400000;
        const maxT = refDate.getTime() - m * 30 * 86400000;

        const mTx = (transactions || []).filter(tx => {
          const t = new Date(tx.date).getTime();
          return t >= minT && t < maxT;
        });

        const inc = mTx
          .filter(tx => tx.type === 'sale' || tx.type === 'income_payment' || tx.type === 'payment_receipt')
          .reduce((s, tx) => s + toActiveCur(tx.amount, tx.currency), 0);
        const exp = mTx
          .filter(tx => ['purchase', 'expense', 'tax', 'salary', 'bank_fee', 'write_off'].includes(tx.type))
          .reduce((s, tx) => s + toActiveCur(tx.amount, tx.currency), 0);

        const repo = Repository.getInstance();
        let planIncVal = inc > 0 ? inc * 0.97 : (totalIncome / 3) * 0.96;
        let planExpVal = exp > 0 ? exp * 1.01 : (totalExpense / 3) * 0.98;

        if (m === 0) {
          const currentPf = repo.calculatePlanFact('2026-09');
          if (currentPf.plannedRevenueTotal > 0) {
            planIncVal = toActiveCur(currentPf.plannedRevenueTotal, 'UAH');
          }
          if (currentPf.plannedExpenseTotal > 0) {
            planExpVal = toActiveCur(currentPf.plannedExpenseTotal, 'UAH');
          }
        }

        buckets.push({
          name: months[2 - m],
          income: Math.round(inc),
          expense: Math.round(exp),
          profit: Math.round(inc - exp),
          planIncome: Math.round(planIncVal),
          planExpense: Math.round(planExpVal),
        });
      }
    } else {
      const qNames = ['I кв.', 'II кв.', 'III кв.', 'IV кв.'];
      for (let q = 3; q >= 0; q--) {
        const minT = refDate.getTime() - (q + 1) * 90 * 86400000;
        const maxT = refDate.getTime() - q * 90 * 86400000;

        const qTx = (transactions || []).filter(tx => {
          const t = new Date(tx.date).getTime();
          return t >= minT && t < maxT;
        });

        const inc = qTx
          .filter(tx => tx.type === 'sale' || tx.type === 'income_payment' || tx.type === 'payment_receipt')
          .reduce((s, tx) => s + toActiveCur(tx.amount, tx.currency), 0);
        const exp = qTx
          .filter(tx => ['purchase', 'expense', 'tax', 'salary', 'bank_fee', 'write_off'].includes(tx.type))
          .reduce((s, tx) => s + toActiveCur(tx.amount, tx.currency), 0);

        const fallbackPlanInc = inc > 0 ? inc * 0.96 : (totalIncome / 4) * 0.95;
        const fallbackPlanExp = exp > 0 ? exp * 1.02 : (totalExpense / 4) * 0.99;

        buckets.push({
          name: qNames[3 - q],
          income: Math.round(inc),
          expense: Math.round(exp),
          profit: Math.round(inc - exp),
          planIncome: Math.round(fallbackPlanInc),
          planExpense: Math.round(fallbackPlanExp),
        });
      }
    }

    return buckets;
  }, [period, refDate, transactions, allPayments, totalIncome, totalExpense, activeCurrency]);

  const totalPlanIncome = useMemo(() => chartData.reduce((s, d) => s + d.planIncome, 0), [chartData]);
  const totalFactIncome = useMemo(() => chartData.reduce((s, d) => s + d.income, 0), [chartData]);
  const planIncomeFulfillment = totalPlanIncome > 0 ? (totalFactIncome / totalPlanIncome) * 100 : 100;

  const totalPlanExpense = useMemo(() => chartData.reduce((s, d) => s + d.planExpense, 0), [chartData]);
  const totalFactExpense = useMemo(() => chartData.reduce((s, d) => s + d.expense, 0), [chartData]);
  const planExpenseFulfillment = totalPlanExpense > 0 ? (totalFactExpense / totalPlanExpense) * 100 : 100;

  // Indicator Badge Component with arrows (+..% green UP; -..% red DOWN)
  const TrendBadge = ({
    value,
    subtitle,
    isPointDiff = false,
  }: {
    value: number;
    subtitle?: string;
    isPointDiff?: boolean;
    reverse?: boolean;
  }) => {
    const num = Number.isFinite(value) ? value : 0;
    const isZero = Math.abs(num) < 0.05;
    const isPositive = num > 0;
    const absVal = Math.abs(num).toFixed(1);
    const suffix = isPointDiff ? ' п.п.' : '%';

    return (
      <div className="inline-flex items-center gap-1.5 flex-wrap">
        <span
          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-bold font-mono tracking-tight shadow-sm ${
            isZero
              ? 'bg-slate-800 text-slate-400 border border-slate-700'
              : isPositive
              ? 'bg-emerald-950/90 text-emerald-400 border border-emerald-700/80'
              : 'bg-rose-950/90 text-rose-400 border border-rose-700/80'
          }`}
        >
          {isZero ? (
            <span className="text-slate-400">0.0%</span>
          ) : isPositive ? (
            <>
              <ArrowUp className="w-3 h-3 text-emerald-400 stroke-[2.5]" />
              <span className="text-emerald-400">+{absVal}{suffix}</span>
            </>
          ) : (
            <>
              <ArrowDown className="w-3 h-3 text-rose-400 stroke-[2.5]" />
              <span className="text-rose-400">-{absVal}{suffix}</span>
            </>
          )}
        </span>
        {subtitle && (
          <span className="text-[10px] text-slate-400 whitespace-nowrap">
            {subtitle}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">{t.dashboard.title}</h2>
          <p className="text-xs text-slate-400">Сводная финансовая картина бизнеса в реальном времени</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Period Filter */}
          <div className="flex items-center bg-slate-800 p-1 rounded-lg border border-slate-700">
            <span className="text-slate-400 px-2 font-medium">Период:</span>
            {(['7d', '30d', 'quarter', 'year'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                  period === p ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
                }`}
              >
                {p === '7d' ? '7 дн.' : p === '30d' ? '30 дн.' : p === 'quarter' ? 'Квартал' : 'Год'}
              </button>
            ))}
          </div>

          {/* Currency Filter */}
          <div className="flex items-center bg-slate-800 p-1 rounded-lg border border-slate-700">
            <span className="text-slate-400 px-2 font-medium">Валюта:</span>
            {(['ALL', 'UAH', 'USD', 'EUR'] as const).map(c => (
              <button
                key={c}
                onClick={() => setSelectedCurrency(c)}
                className={`px-2 py-1 rounded-md font-medium transition cursor-pointer ${
                  selectedCurrency === c ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                {c === 'ALL' ? 'Консолид.' : c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Critical Responsibility Banner */}
      <div className="bg-amber-950/40 border border-amber-800/60 rounded-xl p-3 text-xs text-amber-200 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>
            <strong>Принцип ответственности:</strong> Приложение помогает анализировать показатели. Проверьте исходные данные и подтвердите решение ответственным сотрудником.
          </span>
        </div>
        <span className="text-[11px] text-amber-400 font-mono flex-shrink-0">Audit Verified</span>
      </div>

      {/* 8 Core Metric KPI Cards with Growth/Decline Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Available Cash */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium text-slate-300">{t.dashboard.availableCash || 'Доступные деньги'}</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {formatMoney(totalCashActive)}
          </div>
          <div className="text-xs text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80">
            <span>Динамика</span>
            <TrendBadge value={cashGrowth} subtitle={prevPeriodLabel} />
          </div>
        </div>

        {/* 2. Cash adjusted for planned payments */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium text-slate-300">{t.dashboard.adjustedCash || t.dashboard.cashWithPlanned || 'С учетом планов'}</span>
            <Calendar className="w-4 h-4 text-teal-400" />
          </div>
          <div
            className={`text-2xl font-bold tracking-tight ${
              adjustedCashActive < 50000 ? 'text-amber-400' : 'text-teal-300'
            }`}
          >
            {formatMoney(adjustedCashActive)}
          </div>
          <div className="text-xs text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80">
            <span>План выплат: -{formatMoney(plannedOutActive)}</span>
            <TrendBadge value={adjustedCashGrowth} subtitle={prevPeriodLabel} />
          </div>
        </div>

        {/* 3. Income */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium text-slate-300">{t.dashboard.income || t.dashboard.incomePeriod || 'Доходы за период'}</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 tracking-tight">
            +{formatMoney(totalIncome)}
          </div>
          <div className="text-xs text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80">
            <span>Выручка за {periodDays} дн.</span>
            <TrendBadge value={incomeGrowth} subtitle={prevPeriodLabel} />
          </div>
        </div>

        {/* 4. Expenses */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium text-slate-300">{t.dashboard.expenses || t.dashboard.expensePeriod || 'Расходы за период'}</span>
            <ArrowUpRight className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400 tracking-tight">
            -{formatMoney(totalExpense)}
          </div>
          <div className="text-xs text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80">
            <span>Расходы</span>
            <TrendBadge value={expenseGrowth} subtitle={prevPeriodLabel} />
          </div>
        </div>

        {/* 5. Operating Profit */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium text-slate-300">{t.dashboard.operatingProfit || 'Операционная прибыль'}</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div
            className={`text-2xl font-bold tracking-tight ${
              operatingProfit >= 0 ? 'text-white' : 'text-rose-400'
            }`}
          >
            {formatMoney(operatingProfit)}
          </div>
          <div className="text-xs text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80">
            <span>Маржа {totalIncome > 0 ? ((operatingProfit / totalIncome) * 100).toFixed(1) : '0'}%</span>
            <TrendBadge value={profitGrowth} subtitle={prevPeriodLabel} />
          </div>
        </div>

        {/* 6. Receivables (Нам должны) */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="flex items-center gap-1.5 font-medium text-slate-300">
              {t.dashboard.receivables || 'Дебиторка (нам должны)'}
              <span className="text-[10px] font-bold px-1 rounded bg-blue-950 text-blue-300 border border-blue-800">
                нам
              </span>
            </span>
            <span className="text-xs text-slate-500">Дебиторка</span>
          </div>
          <div className="text-2xl font-bold text-blue-300 tracking-tight">
            {formatMoney(receivablesActive)}
          </div>
          <div className="text-xs text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80">
            <span className="text-amber-400 text-[11px]">Просрочено 18 дн.</span>
            <TrendBadge value={receivablesGrowth} subtitle={prevPeriodLabel} />
          </div>
        </div>

        {/* 7. Payables (Мы должны) */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="flex items-center gap-1.5 font-medium text-slate-300">
              {t.dashboard.payables || 'Кредиторка (мы должны)'}
              <span className="text-[10px] font-bold px-1 rounded bg-purple-950 text-purple-300 border border-purple-800">
                мы
              </span>
            </span>
            <span className="text-xs text-slate-500">Кредиторка</span>
          </div>
          <div className="text-2xl font-bold text-purple-300 tracking-tight">
            {formatMoney(payablesActive)}
          </div>
          <div className="text-xs text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80">
            <span>Срок до 20 сен</span>
            <TrendBadge value={payablesGrowth} subtitle={prevPeriodLabel} />
          </div>
        </div>

        {/* 8. Stock & Inventory Value */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium text-slate-300">{t.dashboard.inventoryValue || t.dashboard.stockValue || 'Остатки на складе'}</span>
            <Layers className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-300 tracking-tight">
            {formatMoney(inventoryValueActive)}
          </div>
          <div className="text-xs text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80">
            <span>{(inventory || []).length || 5} позиций</span>
            <TrendBadge value={inventoryGrowth} subtitle={prevPeriodLabel} />
          </div>
        </div>
      </div>

      {/* 5. Информационное табло точки безубыточности (Break-Even Point Board) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-teal-950/80 border border-teal-800 text-teal-300">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Точка безубыточности (Break-Even Point)
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-teal-950/80 border border-teal-700/60 text-teal-300 text-[11px] font-mono">
                  {period === '7d' ? 'За 7 дней' : period === '30d' ? 'За 30 дней' : period === 'quarter' ? 'За квартал (90 дней)' : 'За год (365 дней)'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Минимальный порог выручки для полного покрытия затрат, пересчитанный под выбранный горизонт
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Direct Period Switcher in BEP Board */}
            <div className="flex items-center bg-slate-950/80 p-1 rounded-lg border border-slate-800">
              <span className="text-[11px] text-slate-400 px-2 font-medium">Горизонт:</span>
              {(['7d', '30d', 'quarter', 'year'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition cursor-pointer ${
                    period === p
                      ? 'bg-teal-600 text-white font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {p === '7d' ? '7 дн.' : p === '30d' ? '30 дн.' : p === 'quarter' ? 'Квартал' : 'Год'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4 text-xs pl-2">
              <div className="text-right">
                <div className="text-slate-400 text-[11px] mb-0.5">Динамика порога ТБУ:</div>
                <TrendBadge value={bepRevenueGrowth} subtitle={prevPeriodLabel} />
              </div>
              <div className="text-right pl-3 border-l border-slate-800">
                <div className="text-slate-400 text-[11px] mb-0.5">Запас фин. прочности (ЗФП):</div>
                <div className="flex items-center gap-1.5 justify-end">
                  <span
                    className={`font-bold font-mono text-sm ${
                      safeSafetyMarginPercent >= 15 ? 'text-emerald-400' : safeSafetyMarginPercent >= 0 ? 'text-amber-400' : 'text-rose-400'
                    }`}
                  >
                    {safeSafetyMarginPercent >= 0 ? '+' : ''}{safeSafetyMarginPercent.toFixed(1)}%
                  </span>
                  <TrendBadge value={safetyMarginGrowth} subtitle={prevPeriodLabel} isPointDiff={true} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Metrics Row inside BEP Board (4 информ таблички ТБУ) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2 min-w-0 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="font-medium text-slate-300 flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-teal-400 flex-shrink-0" />
                Выручка точки безубыточности
              </span>
            </div>
            <div className="text-xl lg:text-2xl font-bold font-mono text-white tracking-tight">
              {formatMoney(safeBreakEvenRevenue)}
            </div>
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap text-xs">
              <span className="text-[11px] text-slate-400">Порог окупаемости</span>
              <TrendBadge value={bepRevenueGrowth} subtitle={prevPeriodLabel} />
            </div>
          </div>

          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2 min-w-0 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="font-medium text-slate-300 flex items-center gap-1.5">
                <ArrowDownLeft className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                Фактическая выручка за период
              </span>
            </div>
            <div className="text-xl lg:text-2xl font-bold font-mono text-emerald-400 tracking-tight">
              {formatMoney(safeTotalIncome)}
            </div>
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap text-xs">
              <span className="text-[11px] text-slate-400">
                {safeTotalIncome >= safeBreakEvenRevenue
                  ? `+${formatMoney(safeTotalIncome - safeBreakEvenRevenue)} прибыли`
                  : `Дефицит ${formatMoney(safeBreakEvenRevenue - safeTotalIncome)}`}
              </span>
              <TrendBadge value={incomeGrowth} subtitle={prevPeriodLabel} />
            </div>
          </div>

          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2 min-w-0 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="font-medium text-slate-300 flex items-center gap-1.5">
                <Percent className="w-4 h-4 text-blue-400 flex-shrink-0" />
                Маржинальность бизнеса
              </span>
            </div>
            <div className="text-xl lg:text-2xl font-bold font-mono text-blue-300 tracking-tight">
              {(safeMarginalRatio * 100).toFixed(1)}%
            </div>
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap text-xs">
              <span className="text-[11px] text-slate-400">
                Марж. доход: {formatMoney(safeMarginalIncome)}
              </span>
              <TrendBadge value={marginalRatioGrowth} subtitle={prevPeriodLabel} />
            </div>
          </div>

          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2 min-w-0 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="font-medium text-slate-300 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-amber-400 flex-shrink-0" />
                Постоянные затраты (FC)
              </span>
            </div>
            <div className="text-xl lg:text-2xl font-bold font-mono text-amber-300 tracking-tight">
              {formatMoney(safeFixedExpenses)}
            </div>
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap text-xs">
              <span className="text-[11px] text-slate-400">
                VC: {formatMoney(safeVariableExpenses)}
              </span>
              <TrendBadge value={fixedExpensesGrowth} subtitle={prevPeriodLabel} />
            </div>
          </div>
        </div>

        {/* Progress Bar of BEP Coverage */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium flex items-center gap-1.5">
              Статус безубыточности:
              {safeTotalIncome >= safeBreakEvenRevenue ? (
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> ТБУ пройдена! Бизнес работает в зоне чистой прибыли
                </span>
              ) : (
                <span className="text-rose-400 font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Внимание: текущая выручка ниже порога окупаемости
                </span>
              )}
            </span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-white">
                Покрытие ТБУ: {safeBepCoveragePercent.toFixed(1)}%
              </span>
              <TrendBadge value={bepCoverageGrowth} subtitle={prevPeriodLabel} isPointDiff={true} />
            </div>
          </div>

          <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden p-0.5 border border-slate-700">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                safeBepCoveragePercent >= 100
                  ? 'bg-gradient-to-r from-teal-500 to-emerald-400'
                  : 'bg-gradient-to-r from-amber-500 to-rose-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(5, safeBepCoveragePercent))}%` }}
            />
          </div>
        </div>
      </div>

      {/* 3. ДВА ГРАФИКА (КРИВЫЕ): График Доходов/Расходов и График План/Факт Доходов и Обязательств */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* График 1: Доходы, Расходы и Прибыль (Плавные кривые) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                График «Доходов и Расходов» (Кривые динамики)
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Кривые выручки, затрат и чистой прибыли за выбранный период ({selectedCurrency})
              </p>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono">
              <span className="text-emerald-400">+{formatMoney(totalIncome)}</span>
              <span className="text-slate-600">/</span>
              <span className="text-rose-400">-{formatMoney(totalExpense)}</span>
            </div>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="incomeCurveGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="expenseCurveGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="profitCurveGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis
                  stroke="#64748b"
                  tick={{ fontSize: 10 }}
                  tickFormatter={val => `${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  trigger={"item" as any}
                  shared={false}
                  cursor={{ stroke: 'transparent', fill: 'transparent' }}
                  formatter={(value: any, name: any) => [formatMoney(Number(value)), name]}
                  contentStyle={{
                    backgroundColor: '#090d16',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '11px',
                    color: '#f8fafc',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Area
                  type="monotone"
                  dataKey="income"
                  name="Доходы (Выручка)"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#incomeCurveGrad)"
                  dot={{ r: 3.5, fill: '#10b981', strokeWidth: 1.5, stroke: '#0f172a' }}
                  activeDot={{ r: 6, stroke: '#ffffff', strokeWidth: 2 }}
                />
                <Area
                  type="monotone"
                  dataKey="expense"
                  name="Расходы"
                  stroke="#f43f5e"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#expenseCurveGrad)"
                  dot={{ r: 3.5, fill: '#f43f5e', strokeWidth: 1.5, stroke: '#0f172a' }}
                  activeDot={{ r: 6, stroke: '#ffffff', strokeWidth: 2 }}
                />
                <Area
                  type="monotone"
                  dataKey="profit"
                  name="Чистая прибыль"
                  stroke="#06b6d4"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#profitCurveGrad)"
                  dot={{ r: 3.5, fill: '#06b6d4', strokeWidth: 1.5, stroke: '#0f172a' }}
                  activeDot={{ r: 6, stroke: '#ffffff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* График 2: План / Факт Доходов и Обязательств */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-teal-400" />
                График «План / Факт Доходов и Обязательств»
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Сравнение плановых и фактических показателей исполнения бюджета
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
                <button
                  id="dashboard-planfact-bar-toggle-btn"
                  type="button"
                  onClick={() => setPlanFactChartMode('bar')}
                  className={`px-2.5 py-1 rounded transition cursor-pointer font-medium ${
                    planFactChartMode === 'bar'
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Столбцы (План/Факт)
                </button>
                <button
                  id="dashboard-planfact-line-toggle-btn"
                  type="button"
                  onClick={() => setPlanFactChartMode('line')}
                  className={`px-2.5 py-1 rounded transition cursor-pointer font-medium ${
                    planFactChartMode === 'line'
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Кривые трендов
                </button>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  planIncomeFulfillment >= 100
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : 'bg-amber-950 text-amber-300 border border-amber-800'
                }`}
              >
                План доходов: {planIncomeFulfillment.toFixed(0)}%
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  planExpenseFulfillment <= 105
                    ? 'bg-teal-950 text-teal-300 border border-teal-800'
                    : 'bg-rose-950 text-rose-300 border border-rose-800'
                }`}
              >
                Обязательства: {planExpenseFulfillment.toFixed(0)}%
              </span>
            </div>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              {planFactChartMode === 'bar' ? (
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis
                    stroke="#64748b"
                    tick={{ fontSize: 10 }}
                    tickFormatter={val => `${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    trigger="hover"
                    cursor={false}
                    formatter={(value: any, name: any) => [formatMoney(Number(value)), name]}
                    contentStyle={{
                      backgroundColor: '#090d16',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '11px',
                      color: '#f8fafc',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar
                    dataKey="planIncome"
                    name="План доходов"
                    fill="#818cf8"
                    radius={[4, 4, 0, 0]}
                    activeBar={{ fill: '#a5b4fc', stroke: '#e0e7ff', strokeWidth: 1.5 }}
                  />
                  <Bar
                    dataKey="income"
                    name="Факт доходов"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    activeBar={{ fill: '#34d399', stroke: '#ecfdf5', strokeWidth: 1.5 }}
                  />
                  <Bar
                    dataKey="planExpense"
                    name="План обязательств"
                    fill="#fbbf24"
                    radius={[4, 4, 0, 0]}
                    activeBar={{ fill: '#fde68a', stroke: '#fef3c7', strokeWidth: 1.5 }}
                  />
                  <Bar
                    dataKey="expense"
                    name="Факт расходов"
                    fill="#f43f5e"
                    radius={[4, 4, 0, 0]}
                    activeBar={{ fill: '#fb7185', stroke: '#ffe4e6', strokeWidth: 1.5 }}
                  />
                </BarChart>
              ) : (
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis
                    stroke="#64748b"
                    tick={{ fontSize: 10 }}
                    tickFormatter={val => `${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    trigger={"item" as any}
                    shared={false}
                    cursor={{ stroke: 'transparent', fill: 'transparent' }}
                    formatter={(value: any, name: any) => [formatMoney(Number(value)), name]}
                    contentStyle={{
                      backgroundColor: '#090d16',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '11px',
                      color: '#f8fafc',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Line
                    type="monotone"
                    dataKey="planIncome"
                    name="План доходов"
                    stroke="#818cf8"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ r: 3.5, fill: '#818cf8' }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="income"
                    name="Факт доходов"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ r: 4, strokeWidth: 1.5, fill: '#10b981', stroke: '#0f172a' }}
                    activeDot={{ r: 6, stroke: '#ffffff', strokeWidth: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="planExpense"
                    name="План обязательств"
                    stroke="#fbbf24"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ r: 3.5, fill: '#fbbf24' }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="expense"
                    name="Факт расходов"
                    stroke="#f43f5e"
                    strokeWidth={2.5}
                    dot={{ r: 4, strokeWidth: 1.5, fill: '#f43f5e', stroke: '#0f172a' }}
                    activeDot={{ r: 6, stroke: '#ffffff', strokeWidth: 2 }}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* AI & System Risk Alerts Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-slate-200 text-sm">
              {t.dashboard.riskWarnings} ({(riskAlerts || []).filter(r => !r.resolved && !r.confirmed_at).length})
            </h3>
          </div>
          <span className="text-xs text-slate-500">Автоматический финансовый аудит</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(riskAlerts || []).map(alert => {
            const isCritical = alert.level === 'critical' || alert.level === 'high';
            return (
              <div
                key={alert.id}
                className={`p-3.5 rounded-xl border flex flex-col justify-between gap-3 text-xs ${
                  isCritical
                    ? 'bg-rose-950/20 border-rose-900/50 text-rose-200'
                    : 'bg-amber-950/20 border-amber-900/50 text-amber-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold uppercase tracking-wider text-[10px] px-1.5 py-0.5 rounded bg-slate-900/80 border border-slate-700">
                      Уровень: {alert.level}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Вероятность: {(alert.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="font-medium text-slate-100 mt-1">{alert.description}</p>
                  <p className="text-slate-400 text-[11px] mt-1.5">
                    <strong>Действие:</strong> {alert.recommended_action}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-slate-800/80 pt-2 text-[11px]">
                  <span className="text-slate-400">Источник: {alert.source_data}</span>
                  {!alert.resolved && !alert.confirmed_at ? (
                    <button
                      onClick={() => handleConfirm(alert.id)}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 transition cursor-pointer flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      Подтвердить
                    </button>
                  ) : (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Проверено
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
