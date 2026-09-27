import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Download,
  Filter,
  Calendar,
  Layers,
  Briefcase,
  ChevronDown,
  ChevronRight,
  Info,
  DollarSign,
  Percent,
  TrendingDown,
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
import { Transaction, Currency } from '../types';
import { Repository } from '../services/storage/repository';
import { TranslationDictionary } from '../i18n';

interface ProfitAndLossViewProps {
  t: TranslationDictionary;
  transactions: Transaction[];
  currency: Currency;
}

type PeriodType = 'month' | 'quarter' | 'year' | 'custom';

export const ProfitAndLossView: React.FC<ProfitAndLossViewProps> = ({
  t,
  transactions,
  currency,
}) => {
  const repo = Repository.getInstance();

  // Filter States
  const [periodType, setPeriodType] = useState<PeriodType>('month');
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-09');
  const [selectedQuarter, setSelectedQuarter] = useState<string>('Q3-2026');
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [customFrom, setCustomFrom] = useState<string>('2026-09-01');
  const [customTo, setCustomTo] = useState<string>('2026-09-30');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('ALL');
  const [selectedProject, setSelectedProject] = useState<string>('ALL');

  // Accordion state
  const [cogsExpanded, setCogsExpanded] = useState<boolean>(true);
  const [opexExpanded, setOpexExpanded] = useState<boolean>(true);

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

  // Extract unique departments & projects from transactions
  const { departments, projects } = useMemo(() => {
    const deps = new Set<string>();
    const projs = new Set<string>();
    transactions.forEach(t => {
      if (t.department) deps.add(t.department);
      if (t.project) projs.add(t.project);
    });
    return {
      departments: Array.from(deps),
      projects: Array.from(projs),
    };
  }, [transactions]);

  // Calculate Accrual PnL from Repository
  const pnl = useMemo(() => {
    return repo.calculatePnL({
      fromDate,
      toDate,
      department: selectedDepartment,
      project: selectedProject,
    });
  }, [repo, fromDate, toDate, selectedDepartment, selectedProject, transactions]);

  // Format currency helper
  const fmt = (centsOrAmount: number) => {
    const val = Number(centsOrAmount) || 0;
    return new Intl.NumberFormat('ru-RU', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val) + ` ${currency}`;
  };

  const fmtPct = (pct: number) => {
    return (pct || 0).toFixed(1) + '%';
  };

  // Export to CSV with UTF-8 BOM
  const handleExportCSV = () => {
    const rows = [
      ['Отчет о прибылях и убытках (ОПУ) / P&L Statement'],
      ['Метод расчета:', 'Метод начисления (Accrual Basis)'],
      ['Период:', periodLabel],
      ['Подразделение:', selectedDepartment === 'ALL' ? 'Все' : selectedDepartment],
      ['Проект:', selectedProject === 'ALL' ? 'Все' : selectedProject],
      ['Дата выгрузки:', new Date().toLocaleString('ru-RU')],
      [],
      ['Статья отчета', 'Сумма (' + currency + ')', '% от Выручки'],
      ['1. ВЫРУЧКА (Доходы от реализации)', pnl.revenue, '100.0%'],
      ['2. Переменные расходы (Себестоимость / CoGS)', -pnl.cogs, fmtPct((pnl.cogs / (pnl.revenue || 1)) * 100)],
      ['= ВАЛОВАЯ ПРИБЫЛЬ (Маржинальный доход)', pnl.marginalIncome, fmtPct(pnl.marginalMarginPct)],
      ['3. Постоянные операционные расходы (OPEX)', -pnl.opex, fmtPct(pnl.opexMarginPct)],
      ['  - Аренда помещений и склада', -pnl.rent, ''],
      ['  - Фонд оплаты труда (ФОТ / Зарплаты)', -pnl.salary, ''],
      ['  - Маркетинг и реклама', -pnl.marketing, ''],
      ['  - Административные и офисные расходы', -pnl.adminExpenses, ''],
      ['  - Логистика и доставка', -pnl.logistics, ''],
      ['  - Банковские комиссии и эквайринг', -pnl.bankFees, ''],
      ['  - Прочие операционные расходы', -pnl.otherOpex, ''],
      ['= EBITDA (Операционная прибыль до амортизации и %)', pnl.ebitda, fmtPct(pnl.ebitdaMarginPct)],
      ['4. Амортизация основных средств', -pnl.depreciation, ''],
      ['5. Финансовые расходы (Проценты по займам)', -pnl.interestExpenses, ''],
      ['= EBT (Прибыль до налогообложения)', pnl.ebt, ''],
      ['6. Налоги и сборы', -pnl.taxes, ''],
      ['7. Списания и безнадежные потери', -pnl.writeOffs, ''],
      ['= ЧИСТАЯ ПРИБЫЛЬ ПЕРИОДА (Net Profit)', pnl.netProfit, fmtPct(pnl.netMarginPct)],
    ];

    const csvContent = '\uFEFF' + rows.map(r => r.map(c => `"${c}"`).join(';')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `P_and_L_${fromDate}_to_${toDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Waterfall/Bar Chart Data for P&L structure
  const chartData = [
    { name: 'Выручка', amount: pnl.revenue, fill: '#10b981' },
    { name: 'Себестоимость', amount: -pnl.cogs, fill: '#f43f5e' },
    { name: 'Марж. доход', amount: pnl.marginalIncome, fill: '#06b6d4' },
    { name: 'OPEX', amount: -pnl.opex, fill: '#f59e0b' },
    { name: 'EBITDA', amount: pnl.ebitda, fill: '#8b5cf6' },
    { name: 'Налоги & Аморт', amount: -(pnl.taxes + pnl.depreciation + pnl.interestExpenses), fill: '#ef4444' },
    { name: 'Чистая прибыль', amount: pnl.netProfit, fill: pnl.netProfit >= 0 ? '#10b981' : '#f43f5e' },
  ];

  return (
    <div id="pnl-view-container" className="p-6 space-y-6 max-w-7xl mx-auto text-slate-100">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
                Отчет о прибылях и убытках (ОПУ / P&L)
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Метод начисления (Accrual Basis) по дате актов и реализации <span className="font-mono text-emerald-400/90 text-[11px]">(accrual_date)</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="pnl-export-csv-btn"
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium border border-slate-700 transition cursor-pointer shadow-sm"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Экспорт в Excel / CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div id="pnl-filters-bar" className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Period Type Selector */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setPeriodType('month')}
              className={`px-3 py-1.5 rounded-md font-medium transition cursor-pointer ${
                periodType === 'month' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Месяц
            </button>
            <button
              onClick={() => setPeriodType('quarter')}
              className={`px-3 py-1.5 rounded-md font-medium transition cursor-pointer ${
                periodType === 'quarter' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Квартал
            </button>
            <button
              onClick={() => setPeriodType('year')}
              className={`px-3 py-1.5 rounded-md font-medium transition cursor-pointer ${
                periodType === 'year' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Год
            </button>
            <button
              onClick={() => setPeriodType('custom')}
              className={`px-3 py-1.5 rounded-md font-medium transition cursor-pointer ${
                periodType === 'custom' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
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
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
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
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
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
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
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
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
                <span className="text-slate-500">—</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={e => setCustomTo(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}
          </div>

          {/* Department & Project Selectors */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedDepartment}
                onChange={e => setSelectedDepartment(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="ALL">Все подразделения</option>
                <option value="Оптовые продажи">Оптовые продажи</option>
                <option value="Розничная сеть">Розничная сеть</option>
                <option value="Сервис и услуги">Сервис и услуги</option>
                <option value="Администрация">Администрация</option>
                {departments.map(d => (
                  !['Оптовые продажи', 'Розничная сеть', 'Сервис и услуги', 'Администрация'].includes(d) && (
                    <option key={d} value={d}>{d}</option>
                  )
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedProject}
                onChange={e => setSelectedProject(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="ALL">Все проекты</option>
                <option value="Проект Альфа">Проект Альфа</option>
                <option value="Складское пополнение">Складское пополнение</option>
                {projects.map(p => (
                  !['Проект Альфа', 'Складское пополнение'].includes(p) && (
                    <option key={p} value={p}>{p}</option>
                  )
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Выручка (Revenue)</div>
          <div className="text-lg font-bold text-slate-100 mt-1">{fmt(pnl.revenue)}</div>
          <div className="text-[11px] text-emerald-400 mt-1 font-medium">100% базы</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Марж. доход</div>
          <div className="text-lg font-bold text-cyan-300 mt-1">{fmt(pnl.marginalIncome)}</div>
          <div className="text-[11px] text-cyan-400/90 mt-1 font-medium">Маржа: {fmtPct(pnl.marginalMarginPct)}</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">OPEX (Постоянные)</div>
          <div className="text-lg font-bold text-amber-300 mt-1">{fmt(pnl.opex)}</div>
          <div className="text-[11px] text-amber-400/90 mt-1 font-medium">{fmtPct(pnl.opexMarginPct)} от выручки</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">EBITDA</div>
          <div className={`text-lg font-bold mt-1 ${pnl.ebitda >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {fmt(pnl.ebitda)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-medium">Рент-ть: {fmtPct(pnl.ebitdaMarginPct)}</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">EBT (До налогов)</div>
          <div className={`text-lg font-bold mt-1 ${pnl.ebt >= 0 ? 'text-slate-100' : 'text-rose-400'}`}>
            {fmt(pnl.ebt)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-medium">Аморт: {fmt(pnl.depreciation)}</div>
        </div>

        <div className={`border rounded-xl p-3.5 ${
          pnl.netProfit >= 0
            ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
            : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
        }`}>
          <div className="text-[11px] font-medium uppercase tracking-wider opacity-90">Чистая прибыль (Net)</div>
          <div className="text-lg font-bold mt-1">{fmt(pnl.netProfit)}</div>
          <div className="text-[11px] mt-1 font-semibold">ROS: {fmtPct(pnl.netMarginPct)}</div>
        </div>
      </div>

      {/* Main Classical Vertical P&L Statement Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-200">Классическая вертикальная форма ОПУ</span>
            <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded">Период: {periodLabel}</span>
          </div>
          <span className="text-xs text-slate-500">Все суммы в копейках / базовой валюте {currency}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-xs text-slate-400 uppercase font-semibold">
                <th className="py-3 px-4 w-1/2">Статья доходов и расходов</th>
                <th className="py-3 px-4 text-right w-1/4">Сумма ({currency})</th>
                <th className="py-3 px-4 text-right w-1/4">Доля в выручке (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[13px]">
              {/* 1. Revenue */}
              <tr className="bg-emerald-950/20 font-semibold text-emerald-300">
                <td className="py-3 px-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span className="font-sans font-bold">1. ВЫРУЧКА (Доходы от реализации / Revenue)</span>
                </td>
                <td className="py-3 px-4 text-right text-emerald-400 font-bold">{fmt(pnl.revenue)}</td>
                <td className="py-3 px-4 text-right text-slate-300">100.0%</td>
              </tr>

              {/* 2. CoGS Accordion */}
              <tr className="hover:bg-slate-800/30 text-rose-300 cursor-pointer" onClick={() => setCogsExpanded(!cogsExpanded)}>
                <td className="py-2.5 px-4 flex items-center gap-2 pl-6">
                  {cogsExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                  <span className="font-sans">2. (-) Переменные расходы (Себестоимость / CoGS)</span>
                </td>
                <td className="py-2.5 px-4 text-right text-rose-400 font-medium">-{fmt(pnl.cogs)}</td>
                <td className="py-2.5 px-4 text-right text-slate-400">{fmtPct((pnl.cogs / (pnl.revenue || 1)) * 100)}</td>
              </tr>
              {cogsExpanded && (
                <>
                  <tr className="text-slate-400 text-xs bg-slate-950/30">
                    <td className="py-2 px-4 pl-12 font-sans">Закупки товаров и комплектующих</td>
                    <td className="py-2 px-4 text-right">-{fmt(pnl.cogs)}</td>
                    <td className="py-2 px-4 text-right text-slate-500">{fmtPct((pnl.cogs / (pnl.revenue || 1)) * 100)}</td>
                  </tr>
                </>
              )}

              {/* 3. Marginal Income */}
              <tr className="bg-cyan-950/20 font-bold text-cyan-300 border-t border-b border-cyan-500/20">
                <td className="py-3 px-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                  <span className="font-sans">(=) МАРЖИНАЛЬНЫЙ ДОХОД (Валовая прибыль / Gross Margin)</span>
                </td>
                <td className="py-3 px-4 text-right text-cyan-300">{fmt(pnl.marginalIncome)}</td>
                <td className="py-3 px-4 text-right text-cyan-300">{fmtPct(pnl.marginalMarginPct)}</td>
              </tr>

              {/* 4. OPEX Accordion */}
              <tr className="hover:bg-slate-800/30 text-amber-300 cursor-pointer" onClick={() => setOpexExpanded(!opexExpanded)}>
                <td className="py-2.5 px-4 flex items-center gap-2 pl-6">
                  {opexExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                  <span className="font-sans">4. (-) Постоянные операционные расходы (OPEX)</span>
                </td>
                <td className="py-2.5 px-4 text-right text-amber-400 font-medium">-{fmt(pnl.opex)}</td>
                <td className="py-2.5 px-4 text-right text-slate-400">{fmtPct(pnl.opexMarginPct)}</td>
              </tr>
              {opexExpanded && (
                <>
                  <tr className="text-slate-400 text-xs bg-slate-950/30">
                    <td className="py-1.5 px-4 pl-12 font-sans">Аренда офиса, помещений и складов</td>
                    <td className="py-1.5 px-4 text-right">-{fmt(pnl.rent)}</td>
                    <td className="py-1.5 px-4 text-right text-slate-500">{fmtPct((pnl.rent / (pnl.revenue || 1)) * 100)}</td>
                  </tr>
                  <tr className="text-slate-400 text-xs bg-slate-950/30">
                    <td className="py-1.5 px-4 pl-12 font-sans">Фонд оплаты труда (ФОТ / Зарплаты)</td>
                    <td className="py-1.5 px-4 text-right">-{fmt(pnl.salary)}</td>
                    <td className="py-1.5 px-4 text-right text-slate-500">{fmtPct((pnl.salary / (pnl.revenue || 1)) * 100)}</td>
                  </tr>
                  <tr className="text-slate-400 text-xs bg-slate-950/30">
                    <td className="py-1.5 px-4 pl-12 font-sans">Маркетинг, реклама и лидогенерация</td>
                    <td className="py-1.5 px-4 text-right">-{fmt(pnl.marketing)}</td>
                    <td className="py-1.5 px-4 text-right text-slate-500">{fmtPct((pnl.marketing / (pnl.revenue || 1)) * 100)}</td>
                  </tr>
                  <tr className="text-slate-400 text-xs bg-slate-950/30">
                    <td className="py-1.5 px-4 pl-12 font-sans">Административно-хозяйственные расходы</td>
                    <td className="py-1.5 px-4 text-right">-{fmt(pnl.adminExpenses)}</td>
                    <td className="py-1.5 px-4 text-right text-slate-500">{fmtPct((pnl.adminExpenses / (pnl.revenue || 1)) * 100)}</td>
                  </tr>
                  <tr className="text-slate-400 text-xs bg-slate-950/30">
                    <td className="py-1.5 px-4 pl-12 font-sans">Логистика, транспорт и доставка</td>
                    <td className="py-1.5 px-4 text-right">-{fmt(pnl.logistics)}</td>
                    <td className="py-1.5 px-4 text-right text-slate-500">{fmtPct((pnl.logistics / (pnl.revenue || 1)) * 100)}</td>
                  </tr>
                  <tr className="text-slate-400 text-xs bg-slate-950/30">
                    <td className="py-1.5 px-4 pl-12 font-sans">Банковское обслуживание и эквайринг</td>
                    <td className="py-1.5 px-4 text-right">-{fmt(pnl.bankFees)}</td>
                    <td className="py-1.5 px-4 text-right text-slate-500">{fmtPct((pnl.bankFees / (pnl.revenue || 1)) * 100)}</td>
                  </tr>
                  <tr className="text-slate-400 text-xs bg-slate-950/30">
                    <td className="py-1.5 px-4 pl-12 font-sans">Прочие операционные расходы</td>
                    <td className="py-1.5 px-4 text-right">-{fmt(pnl.otherOpex)}</td>
                    <td className="py-1.5 px-4 text-right text-slate-500">{fmtPct((pnl.otherOpex / (pnl.revenue || 1)) * 100)}</td>
                  </tr>
                </>
              )}

              {/* 5. EBITDA */}
              <tr className="bg-purple-950/20 font-bold text-purple-300 border-t border-b border-purple-500/20">
                <td className="py-3 px-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                  <span className="font-sans">(=) EBITDA (Прибыль до вычета процентов, налогов и амортизации)</span>
                </td>
                <td className={`py-3 px-4 text-right font-bold ${pnl.ebitda >= 0 ? 'text-purple-300' : 'text-rose-400'}`}>
                  {fmt(pnl.ebitda)}
                </td>
                <td className="py-3 px-4 text-right text-purple-300">{fmtPct(pnl.ebitdaMarginPct)}</td>
              </tr>

              {/* 6. Depreciation */}
              <tr className="text-slate-400 hover:bg-slate-800/20">
                <td className="py-2 px-4 pl-8 font-sans">6. (-) Амортизация основных средств (Depreciation)</td>
                <td className="py-2 px-4 text-right text-slate-400">-{fmt(pnl.depreciation)}</td>
                <td className="py-2 px-4 text-right text-slate-500">{fmtPct((pnl.depreciation / (pnl.revenue || 1)) * 100)}</td>
              </tr>

              {/* 7. Financial Expenses */}
              <tr className="text-slate-400 hover:bg-slate-800/20">
                <td className="py-2 px-4 pl-8 font-sans">7. (-) Финансовые расходы (Проценты по кредитам / лизингу)</td>
                <td className="py-2 px-4 text-right text-slate-400">-{fmt(pnl.interestExpenses)}</td>
                <td className="py-2 px-4 text-right text-slate-500">{fmtPct((pnl.interestExpenses / (pnl.revenue || 1)) * 100)}</td>
              </tr>

              {/* 8. EBT */}
              <tr className="bg-slate-950/50 font-bold text-slate-200 border-t border-b border-slate-800">
                <td className="py-2.5 px-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                  <span className="font-sans">(=) EBT (Прибыль до налогообложения / Earnings Before Taxes)</span>
                </td>
                <td className={`py-2.5 px-4 text-right ${pnl.ebt >= 0 ? 'text-slate-200' : 'text-rose-400'}`}>
                  {fmt(pnl.ebt)}
                </td>
                <td className="py-2.5 px-4 text-right text-slate-400">{fmtPct((pnl.ebt / (pnl.revenue || 1)) * 100)}</td>
              </tr>

              {/* 9. Taxes */}
              <tr className="text-rose-300 hover:bg-slate-800/20">
                <td className="py-2 px-4 pl-8 font-sans">9. (-) Налоги и сборы (Единый налог, ЕСВ, военный сбор)</td>
                <td className="py-2 px-4 text-right text-rose-400">-{fmt(pnl.taxes)}</td>
                <td className="py-2 px-4 text-right text-slate-500">{fmtPct((pnl.taxes / (pnl.revenue || 1)) * 100)}</td>
              </tr>

              {/* 10. Write-offs if any */}
              {pnl.writeOffs > 0 && (
                <tr className="text-rose-300 hover:bg-slate-800/20">
                  <td className="py-2 px-4 pl-8 font-sans">10. (-) Списания недостач и безнадежные потери</td>
                  <td className="py-2 px-4 text-right text-rose-400">-{fmt(pnl.writeOffs)}</td>
                  <td className="py-2 px-4 text-right text-slate-500">{fmtPct((pnl.writeOffs / (pnl.revenue || 1)) * 100)}</td>
                </tr>
              )}

              {/* 11. NET PROFIT */}
              <tr className={`border-t-2 text-base font-bold ${
                pnl.netProfit >= 0
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/50'
                  : 'bg-rose-950/40 text-rose-300 border-rose-500/50'
              }`}>
                <td className="py-4 px-4 flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${pnl.netProfit >= 0 ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></div>
                  <span className="font-sans text-sm md:text-base tracking-wide">
                    (=) ЧИСТАЯ ПРИБЫЛЬ (Net Profit / Итоговый финансовый результат)
                  </span>
                </td>
                <td className="py-4 px-4 text-right text-base md:text-lg">
                  {fmt(pnl.netProfit)}
                </td>
                <td className="py-4 px-4 text-right text-base">
                  {fmtPct(pnl.netMarginPct)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Visual Chart of P&L Structure */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg">
        <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <span>Каскадная структура формирования чистой прибыли</span>
          <span className="text-xs text-slate-400 font-normal">({periodLabel})</span>
        </h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} interval={0} angle={-15} textAnchor="end" />
              <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={val => `${val / 1000}k`} />
              <Tooltip
                trigger={"item" as any}
                shared={false}
                cursor={{ fill: 'transparent' }}
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: 8 }}
                formatter={(val: any) => [fmt(val), 'Сумма']}
              />
              <Bar
                dataKey="amount"
                radius={[4, 4, 0, 0]}
                activeBar={{ fill: '#38bdf8', stroke: '#ffffff', strokeWidth: 1.5 }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
