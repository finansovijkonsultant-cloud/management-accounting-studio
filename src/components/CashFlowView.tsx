import React, { useState, useMemo } from 'react';
import {
  ArrowUpDown,
  Download,
  Calendar,
  Wallet,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Layers,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
  Clock,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Transaction, Account, Currency, PaymentPlanItem, CashForecastDay } from '../types';
import { Repository } from '../services/storage/repository';
import { TranslationDictionary } from '../i18n';

interface CashFlowViewProps {
  t: TranslationDictionary;
  transactions: Transaction[];
  accounts: Account[];
  currency: Currency;
}

type PeriodType = 'month' | 'quarter' | 'year' | 'custom';

export const CashFlowView: React.FC<CashFlowViewProps> = ({
  t,
  transactions,
  accounts,
  currency,
}) => {
  const repo = Repository.getInstance();

  // Filters
  const [periodType, setPeriodType] = useState<PeriodType>('month');
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-09');
  const [selectedQuarter, setSelectedQuarter] = useState<string>('Q3-2026');
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [customFrom, setCustomFrom] = useState<string>('2026-09-01');
  const [customTo, setCustomTo] = useState<string>('2026-09-30');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('ALL');

  // Accordion
  const [cfoExpanded, setCfoExpanded] = useState<boolean>(true);
  const [cfiExpanded, setCfiExpanded] = useState<boolean>(true);
  const [cffExpanded, setCffExpanded] = useState<boolean>(true);

  // Derive date bounds
  const { fromDate, toDate, periodLabel } = useMemo(() => {
    if (periodType === 'month') {
      const [y, m] = selectedMonth.split('-');
      const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();
      return {
        fromDate: `${selectedMonth}-01`,
        toDate: `${selectedMonth}-${String(lastDay).padStart(2, '0')}`,
        periodLabel: `${selectedMonth}`,
      };
    }
    if (periodType === 'quarter') {
      const [q, y] = selectedQuarter.split('-');
      if (q === 'Q1') return { fromDate: `${y}-01-01`, toDate: `${y}-03-31`, periodLabel: `1 квартал ${y}` };
      if (q === 'Q2') return { fromDate: `${y}-04-01`, toDate: `${y}-06-30`, periodLabel: `2 квартал ${y}` };
      if (q === 'Q3') return { fromDate: `${y}-07-01`, toDate: `${y}-09-30`, periodLabel: `3 квартал ${y}` };
      return { fromDate: `${y}-10-01`, toDate: `${y}-12-31`, periodLabel: `4 квартал ${y}` };
    }
    if (periodType === 'year') {
      return {
        fromDate: `${selectedYear}-01-01`,
        toDate: `${selectedYear}-12-31`,
        periodLabel: `${selectedYear} год`,
      };
    }
    return {
      fromDate: customFrom,
      toDate: customTo,
      periodLabel: `${customFrom} — ${customTo}`,
    };
  }, [periodType, selectedMonth, selectedQuarter, selectedYear, customFrom, customTo]);

  // Cash Flow Calculation from Repository
  const cf = useMemo(() => {
    return repo.calculateCashFlow({
      fromDate,
      toDate,
      accountId: selectedAccountId,
    });
  }, [repo, fromDate, toDate, selectedAccountId, transactions, accounts]);

  // Forecast & Cash Gap Calculation
  const forecastDays: CashForecastDay[] = useMemo(() => {
    return repo.calculateCashGapForecast(30, 'base');
  }, [repo, transactions, accounts]);

  // Detect first critical cash gap in forecast
  const criticalGap = useMemo(() => {
    return forecastDays.find(d => d.is_risk || d.ending_balance < 0);
  }, [forecastDays]);

  // Format currency helper
  const fmt = (val: number) => {
    const num = Number(val) || 0;
    return new Intl.NumberFormat('ru-RU', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num) + ` ${currency}`;
  };

  // Export to CSV with UTF-8 BOM
  const handleExportCSV = () => {
    const rows = [
      ['Отчет о движении денежных средств (ДДС / Cash Flow Statement)'],
      ['Метод расчета:', 'Прямой кассовый метод (Direct Cash Method)'],
      ['Период:', periodLabel],
      ['Счет:', selectedAccountId === 'ALL' ? 'Все счета и кассы' : selectedAccountId],
      ['Дата выгрузки:', new Date().toLocaleString('ru-RU')],
      [],
      ['Статья движения денег', 'Поступления (+)', 'Выплаты (-)', 'Сальдо потока (' + currency + ')'],
      ['1. ОПЕРАЦИОННАЯ ДЕЯТЕЛЬНОСТЬ (CFO)', cf.cfoIn, cf.cfoOut, cf.operatingCashFlow],
      ['  Поступления от клиентов за товары и услуги', cf.customerReceipts, '', ''],
      ['  Оплата поставщикам за товар/сырье', '', -cf.supplierPayments, ''],
      ['  Аренда офиса и склада', '', -cf.rentPayments, ''],
      ['  Выплата заработной платы (ФОТ)', '', -cf.salaryPayments, ''],
      ['  Уплата налогов и сборов', '', -cf.taxPayments, ''],
      ['  Банковские комиссии и эквайринг', '', -cf.bankFeePayments, ''],
      ['  Прочие операционные расходы', '', -cf.otherOpexPayments, ''],
      [],
      ['2. ИНВЕСТИЦИОННАЯ ДЕЯТЕЛЬНОСТЬ (CFI)', cf.cfiIn, cf.cfiOut, cf.investingCashFlow],
      ['  Поступления от продажи оборудования/активов', cf.investingInflows, '', ''],
      ['  Покупка оборудования, техники и CAPEX', '', -cf.investingPayments, ''],
      [],
      ['3. ФИНАНСОВАЯ ДЕЯТЕЛЬНОСТЬ (CFF)', cf.cffIn, cf.cffOut, cf.financingCashFlow],
      ['  Получение кредитов и займов', cf.loansReceived, '', ''],
      ['  Взносы собственника (пополнение капитала)', cf.ownerDeposits, '', ''],
      ['  Погашение кредитов и займов (тело долга)', '', -cf.loansRepaid, ''],
      ['  Выплата дивидендов / изъятия собственника', '', -cf.ownerWithdrawals, ''],
      [],
      ['ИТОГО ЧИСТЫЙ ДЕНЕЖНЫЙ ПОТОК (Net Cash Flow)', '', '', cf.netChangeInCash],
      ['Остаток на начало периода', '', '', cf.cashAtStart],
      ['Остаток на конец периода', '', '', cf.totalCashNow],
    ];

    const csvContent = '\uFEFF' + rows.map(r => r.map(c => `"${c}"`).join(';')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Cash_Flow_${fromDate}_to_${toDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Forecast Chart Data
  const chartData = forecastDays.map(d => ({
    date: d.date.substring(5), // MM-DD
    balance: d.ending_balance,
    deficit: d.deficit > 0 ? d.deficit : 0,
    inflows: d.inflows,
    outflows: d.outflows,
  }));

  return (
    <div id="cashflow-view-container" className="p-6 space-y-6 max-w-7xl mx-auto text-slate-100">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <ArrowUpDown className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
                Движение денежных средств (ДДС / Cash Flow)
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Прямой кассовый метод (Direct Method) по факту зачисления и списания <span className="font-mono text-cyan-400/90 text-[11px]">(cash_date)</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="cashflow-export-csv-btn"
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium border border-slate-700 transition cursor-pointer shadow-sm"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span>Экспорт в Excel / CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div id="cashflow-filters-bar" className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Period Type Selector */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setPeriodType('month')}
              className={`px-3 py-1.5 rounded-md font-medium transition cursor-pointer ${
                periodType === 'month' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Месяц
            </button>
            <button
              onClick={() => setPeriodType('quarter')}
              className={`px-3 py-1.5 rounded-md font-medium transition cursor-pointer ${
                periodType === 'quarter' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Квартал
            </button>
            <button
              onClick={() => setPeriodType('year')}
              className={`px-3 py-1.5 rounded-md font-medium transition cursor-pointer ${
                periodType === 'year' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Год
            </button>
            <button
              onClick={() => setPeriodType('custom')}
              className={`px-3 py-1.5 rounded-md font-medium transition cursor-pointer ${
                periodType === 'custom' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Период
            </button>
          </div>

          {/* Period Values */}
          <div className="flex items-center gap-3">
            {periodType === 'month' && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <select
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="2026-09">Сентябрь 2026 (Текущий)</option>
                  <option value="2026-08">Август 2026</option>
                  <option value="2026-07">Июль 2026</option>
                  <option value="2026-06">Июнь 2026</option>
                  <option value="2026-05">Май 2026</option>
                  <option value="2026-04">Апрель 2026</option>
                  <option value="2026-03">Март 2026</option>
                  <option value="2026-02">Февраль 2026</option>
                  <option value="2026-01">Январь 2026</option>
                </select>
              </div>
            )}

            {periodType === 'quarter' && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <select
                  value={selectedQuarter}
                  onChange={e => setSelectedQuarter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="Q3-2026">3 квартал 2026 (Июль - Сен)</option>
                  <option value="Q2-2026">2 квартал 2026 (Апр - Июн)</option>
                  <option value="Q1-2026">1 квартал 2026 (Янв - Мар)</option>
                  <option value="Q4-2025">4 квартал 2025</option>
                </select>
              </div>
            )}

            {periodType === 'year' && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <select
                  value={selectedYear}
                  onChange={e => setSelectedYear(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="2026">2026 год</option>
                  <option value="2025">2025 год</option>
                </select>
              </div>
            )}

            {periodType === 'custom' && (
              <div className="flex items-center gap-2 text-xs">
                <input
                  type="date"
                  value={customFrom}
                  onChange={e => setCustomFrom(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                />
                <span className="text-slate-500">—</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={e => setCustomTo(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>
            )}
          </div>

          {/* Account Filter */}
          <div className="flex items-center gap-2">
            <Wallet className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedAccountId}
              onChange={e => setSelectedAccountId(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">Все счета и кассы (Консолидированно)</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.currency} {acc.balance.toLocaleString('ru-RU')})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Cash Gap Alert Banner if detected */}
      {criticalGap ? (
        <div className="bg-rose-950/40 border border-rose-500/50 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-rose-200 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center flex-shrink-0 text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-rose-100 flex items-center gap-2">
                <span>Внимание: Обнаружен критический кассовый разрыв!</span>
                <span className="text-xs bg-rose-500/30 px-2 py-0.5 rounded font-mono font-bold">
                  {criticalGap.date}
                </span>
              </div>
              <p className="text-xs text-rose-300/90 mt-0.5">
                Прогнозируемый дефицит ликвидности составляет{' '}
                <span className="font-bold text-rose-200 font-mono">
                  {fmt(Math.abs(criticalGap.ending_balance))}
                </span>
                . Рекомендуется перенести выплаты или запросить овердрафт.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end md:self-auto">
            <span className="text-xs bg-rose-900/60 border border-rose-700/50 text-rose-200 px-3 py-1.5 rounded-lg font-medium">
              Дефицит: -{fmt(criticalGap.deficit || Math.abs(criticalGap.ending_balance))}
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-3.5 flex items-center gap-3 text-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span className="text-xs font-medium">
            Ликвидность стабильна: на горизонте 30 дней кассовых разрывов не обнаружено. Остатки покрывают плановые обязательства.
          </span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Остаток на начало</div>
          <div className="text-lg font-bold text-slate-200 mt-1 font-mono">{fmt(cf.cashAtStart)}</div>
          <div className="text-[11px] text-slate-400 mt-1">Входящее сальдо</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Операционный поток (CFO)</div>
          <div className={`text-lg font-bold mt-1 font-mono ${cf.operatingCashFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {fmt(cf.operatingCashFlow)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Поступления - Выплаты</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Инвестиционный (CFI)</div>
          <div className={`text-lg font-bold mt-1 font-mono ${cf.investingCashFlow >= 0 ? 'text-cyan-400' : 'text-amber-400'}`}>
            {fmt(cf.investingCashFlow)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">CAPEX и оборудование</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Финансовый (CFF)</div>
          <div className={`text-lg font-bold mt-1 font-mono ${cf.financingCashFlow >= 0 ? 'text-purple-400' : 'text-rose-400'}`}>
            {fmt(cf.financingCashFlow)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Кредиты и дивиденды</div>
        </div>

        <div className={`border rounded-xl p-3.5 ${
          cf.totalCashNow >= 0
            ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
            : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
        }`}>
          <div className="text-[11px] font-medium uppercase tracking-wider opacity-90">Остаток на конец</div>
          <div className="text-lg font-bold mt-1 font-mono">{fmt(cf.totalCashNow)}</div>
          <div className="text-[11px] mt-1 font-semibold">
            Поток: {cf.netChangeInCash >= 0 ? `+${fmt(cf.netChangeInCash)}` : fmt(cf.netChangeInCash)}
          </div>
        </div>
      </div>

      {/* Main Classical Cash Flow Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-200">Прямой метод расчета ДДС (3 вида деятельности)</span>
            <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">{periodLabel}</span>
          </div>
          <span className="text-xs text-slate-500">Валюта отчета: {currency}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-xs text-slate-400 uppercase font-semibold">
                <th className="py-3 px-4 w-1/2">Раздел / Статья денежного потока</th>
                <th className="py-3 px-4 text-right w-1/4">Поступления (+)</th>
                <th className="py-3 px-4 text-right w-1/4">Выплаты (-)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[13px]">
              {/* Beginning Balance */}
              <tr className="bg-slate-950/40 text-slate-300 font-semibold">
                <td className="py-3 px-4 font-sans font-bold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span>ОСТАТОК ДЕНЕЖНЫХ СРЕДСТВ НА НАЧАЛО ПЕРИОДА</span>
                </td>
                <td colSpan={2} className="py-3 px-4 text-right text-slate-200 font-bold">
                  {fmt(cf.cashAtStart)}
                </td>
              </tr>

              {/* 1. OPERATING ACTIVITIES (CFO) */}
              <tr className="bg-emerald-950/20 text-emerald-300 font-bold cursor-pointer" onClick={() => setCfoExpanded(!cfoExpanded)}>
                <td className="py-3 px-4 flex items-center gap-2">
                  {cfoExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  <span className="font-sans">1. ОПЕРАЦИОННАЯ ДЕЯТЕЛЬНОСТЬ (CFO)</span>
                </td>
                <td className="py-3 px-4 text-right text-emerald-400 font-bold">{fmt(cf.cfoIn)}</td>
                <td className="py-3 px-4 text-right text-rose-400 font-bold">-{fmt(cf.cfoOut)}</td>
              </tr>
              {cfoExpanded && (
                <>
                  <tr className="text-slate-400 text-xs bg-slate-950/30">
                    <td className="py-2 px-4 pl-10 font-sans">Поступления от покупателей за продукцию и услуги</td>
                    <td className="py-2 px-4 text-right text-emerald-400 font-mono">{fmt(cf.customerReceipts)}</td>
                    <td className="py-2 px-4 text-right text-slate-500">—</td>
                  </tr>
                  <tr className="text-slate-400 text-xs bg-slate-950/30">
                    <td className="py-2 px-4 pl-10 font-sans">Оплата поставщикам за материалы, товар и сырье</td>
                    <td className="py-2 px-4 text-right text-slate-500">—</td>
                    <td className="py-2 px-4 text-right text-rose-400 font-mono">-{fmt(cf.supplierPayments)}</td>
                  </tr>
                  <tr className="text-slate-400 text-xs bg-slate-950/30">
                    <td className="py-2 px-4 pl-10 font-sans">Аренда офисных, торговых и производственных помещений</td>
                    <td className="py-2 px-4 text-right text-slate-500">—</td>
                    <td className="py-2 px-4 text-right text-rose-400 font-mono">-{fmt(cf.rentPayments)}</td>
                  </tr>
                  <tr className="text-slate-400 text-xs bg-slate-950/30">
                    <td className="py-2 px-4 pl-10 font-sans">Выплата заработной платы сотрудникам (ФОТ)</td>
                    <td className="py-2 px-4 text-right text-slate-500">—</td>
                    <td className="py-2 px-4 text-right text-rose-400 font-mono">-{fmt(cf.salaryPayments)}</td>
                  </tr>
                  <tr className="text-slate-400 text-xs bg-slate-950/30">
                    <td className="py-2 px-4 pl-10 font-sans">Уплата налогов, сборов и обязательных платежей</td>
                    <td className="py-2 px-4 text-right text-slate-500">—</td>
                    <td className="py-2 px-4 text-right text-rose-400 font-mono">-{fmt(cf.taxPayments)}</td>
                  </tr>
                  <tr className="text-slate-400 text-xs bg-slate-950/30">
                    <td className="py-2 px-4 pl-10 font-sans">Банковские комиссии и эквайринговые сборы</td>
                    <td className="py-2 px-4 text-right text-slate-500">—</td>
                    <td className="py-2 px-4 text-right text-rose-400 font-mono">-{fmt(cf.bankFeePayments)}</td>
                  </tr>
                  <tr className="text-slate-400 text-xs bg-slate-950/30">
                    <td className="py-2 px-4 pl-10 font-sans">Прочие хозяйственные и операционные расходы</td>
                    <td className="py-2 px-4 text-right text-slate-500">—</td>
                    <td className="py-2 px-4 text-right text-rose-400 font-mono">-{fmt(cf.otherOpexPayments)}</td>
                  </tr>
                </>
              )}
              <tr className="bg-slate-950/50 text-xs font-semibold text-slate-300 border-b border-slate-800">
                <td className="py-2 px-4 pl-8 font-sans">Чистый поток по операционной деятельности (CFO)</td>
                <td colSpan={2} className={`py-2 px-4 text-right font-mono font-bold ${cf.operatingCashFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {fmt(cf.operatingCashFlow)}
                </td>
              </tr>

              {/* 2. INVESTING ACTIVITIES (CFI) */}
              <tr className="bg-cyan-950/20 text-cyan-300 font-bold cursor-pointer" onClick={() => setCfiExpanded(!cfiExpanded)}>
                <td className="py-3 px-4 flex items-center gap-2">
                  {cfiExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  <span className="font-sans">2. ИНВЕСТИЦИОННАЯ ДЕЯТЕЛЬНОСТЬ (CFI)</span>
                </td>
                <td className="py-3 px-4 text-right text-cyan-400 font-bold">{fmt(cf.cfiIn)}</td>
                <td className="py-3 px-4 text-right text-amber-400 font-bold">-{fmt(cf.cfiOut)}</td>
              </tr>
              {cfiExpanded && (
                <>
                  <tr className="text-slate-400 text-xs bg-slate-950/30">
                    <td className="py-2 px-4 pl-10 font-sans">Поступления от продажи оборудования и нематериальных активов</td>
                    <td className="py-2 px-4 text-right text-cyan-400 font-mono">{fmt(cf.investingInflows)}</td>
                    <td className="py-2 px-4 text-right text-slate-500">—</td>
                  </tr>
                  <tr className="text-slate-400 text-xs bg-slate-950/30">
                    <td className="py-2 px-4 pl-10 font-sans">Приобретение станков, оборудования, оргтехники (CAPEX)</td>
                    <td className="py-2 px-4 text-right text-slate-500">—</td>
                    <td className="py-2 px-4 text-right text-amber-400 font-mono">-{fmt(cf.investingPayments)}</td>
                  </tr>
                </>
              )}
              <tr className="bg-slate-950/50 text-xs font-semibold text-slate-300 border-b border-slate-800">
                <td className="py-2 px-4 pl-8 font-sans">Чистый поток по инвестиционной деятельности (CFI)</td>
                <td colSpan={2} className={`py-2 px-4 text-right font-mono font-bold ${cf.investingCashFlow >= 0 ? 'text-cyan-400' : 'text-amber-400'}`}>
                  {fmt(cf.investingCashFlow)}
                </td>
              </tr>

              {/* 3. FINANCING ACTIVITIES (CFF) */}
              <tr className="bg-purple-950/20 text-purple-300 font-bold cursor-pointer" onClick={() => setCffExpanded(!cffExpanded)}>
                <td className="py-3 px-4 flex items-center gap-2">
                  {cffExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  <span className="font-sans">3. ФИНАНСОВАЯ ДЕЯТЕЛЬНОСТЬ (CFF)</span>
                </td>
                <td className="py-3 px-4 text-right text-purple-400 font-bold">{fmt(cf.cffIn)}</td>
                <td className="py-3 px-4 text-right text-rose-400 font-bold">-{fmt(cf.cffOut)}</td>
              </tr>
              {cffExpanded && (
                <>
                  <tr className="text-slate-400 text-xs bg-slate-950/30">
                    <td className="py-2 px-4 pl-10 font-sans">Получение кредитов и займов</td>
                    <td className="py-2 px-4 text-right text-purple-400 font-mono">{fmt(cf.loansReceived)}</td>
                    <td className="py-2 px-4 text-right text-slate-500">—</td>
                  </tr>
                  <tr className="text-slate-400 text-xs bg-slate-950/30">
                    <td className="py-2 px-4 pl-10 font-sans">Пополнение капитала собственником (owner_deposit)</td>
                    <td className="py-2 px-4 text-right text-purple-400 font-mono">{fmt(cf.ownerDeposits)}</td>
                    <td className="py-2 px-4 text-right text-slate-500">—</td>
                  </tr>
                  <tr className="text-slate-400 text-xs bg-slate-950/30">
                    <td className="py-2 px-4 pl-10 font-sans">Погашение кредитов и займов (основной долг)</td>
                    <td className="py-2 px-4 text-right text-slate-500">—</td>
                    <td className="py-2 px-4 text-right text-rose-400 font-mono">-{fmt(cf.loansRepaid)}</td>
                  </tr>
                  <tr className="text-slate-400 text-xs bg-slate-950/30">
                    <td className="py-2 px-4 pl-10 font-sans">Выплата дивидендов / изъятия собственника (owner_withdrawal)</td>
                    <td className="py-2 px-4 text-right text-slate-500">—</td>
                    <td className="py-2 px-4 text-right text-rose-400 font-mono">-{fmt(cf.ownerWithdrawals)}</td>
                  </tr>
                </>
              )}
              <tr className="bg-slate-950/50 text-xs font-semibold text-slate-300 border-b border-slate-800">
                <td className="py-2 px-4 pl-8 font-sans">Чистый поток по финансовой деятельности (CFF)</td>
                <td colSpan={2} className={`py-2 px-4 text-right font-mono font-bold ${cf.financingCashFlow >= 0 ? 'text-purple-400' : 'text-rose-400'}`}>
                  {fmt(cf.financingCashFlow)}
                </td>
              </tr>

              {/* NET CASH FLOW */}
              <tr className="bg-slate-950 font-bold border-t-2 border-b border-slate-700 text-sm">
                <td className="py-3 px-4 font-sans text-slate-100">
                  ЧИСТОЕ ИЗМЕНЕНИЕ ДЕНЕЖНЫХ СРЕДСТВ (CFO + CFI + CFF)
                </td>
                <td colSpan={2} className={`py-3 px-4 text-right text-base font-mono ${cf.netChangeInCash >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {cf.netChangeInCash >= 0 ? `+${fmt(cf.netChangeInCash)}` : fmt(cf.netChangeInCash)}
                </td>
              </tr>

              {/* Ending Balance */}
              <tr className="bg-cyan-950/30 text-cyan-300 font-bold text-base border-b border-cyan-500/30">
                <td className="py-4 px-4 font-sans flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-cyan-400"></div>
                  <span>ОСТАТОК ДЕНЕЖНЫХ СРЕДСТВ НА КОНЕЦ ПЕРИОДА</span>
                </td>
                <td colSpan={2} className="py-4 px-4 text-right text-lg font-mono text-cyan-300">
                  {fmt(cf.totalCashNow)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 30-Day Liquidity Forecast & Cash Gap Chart */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <span>Интеграция с Платежным календарем: Прогноз ликвидности на 30 дней</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Ежедневный прогноз остатка с учетом запланированных поступлений и выплат
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Безопасный остаток
            </span>
            <span className="flex items-center gap-1 text-rose-400">
              <span className="w-2 h-2 rounded-full bg-rose-400"></span> Зона кассового разрыва
            </span>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
              <defs>
                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={val => `${val / 1000}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: 8 }}
                formatter={(val: any) => [fmt(val), 'Остаток']}
              />
              <ReferenceLine y={0} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: 'Ноль ликвидности', fill: '#f43f5e', fontSize: 10 }} />
              <Area type="monotone" dataKey="balance" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#colorBalance)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
