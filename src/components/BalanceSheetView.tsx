import React, { useState, useMemo } from 'react';
import {
  Scale,
  Download,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Building2,
  Coins,
  ShieldCheck,
  TrendingUp,
  Percent,
  FileCheck,
} from 'lucide-react';
import { Account, InventoryItem, Currency } from '../types';
import { Repository } from '../services/storage/repository';
import { TranslationDictionary } from '../i18n';

interface BalanceSheetViewProps {
  t: TranslationDictionary;
  accounts: Account[];
  inventory: InventoryItem[];
  currency: Currency;
}

export const BalanceSheetView: React.FC<BalanceSheetViewProps> = ({
  t,
  accounts,
  inventory,
  currency,
}) => {
  const repo = Repository.getInstance();
  const [asOfDate, setAsOfDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Calculate Balance Sheet from Repository
  const balance = useMemo(() => {
    return repo.calculateBalanceSheet(asOfDate);
  }, [repo, asOfDate, accounts, inventory]);

  const fmt = (val: number) => {
    const num = Number(val) || 0;
    return new Intl.NumberFormat('ru-RU', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num) + ` ${currency}`;
  };

  const fmtPct = (pct: number) => {
    return (pct || 0).toFixed(1) + '%';
  };

  // Export to CSV with UTF-8 BOM
  const handleExportCSV = () => {
    const rows = [
      ['Управленческий баланс компании (Balance Sheet)'],
      ['По состоянию на дату:', asOfDate],
      ['Дата формирования:', new Date().toLocaleString('ru-RU')],
      ['Статус сходимости:', balance.isBalanced ? 'СХОДИТСЯ (Дельта = 0)' : `НЕ СХОДИТСЯ (Дельта = ${balance.delta})`],
      [],
      ['АКТИВЫ (Assets)', 'Сумма (' + currency + ')', 'ПАССИВЫ И КАПИТАЛ (Liabilities & Equity)', 'Сумма (' + currency + ')'],
      ['Оборотные активы:', '', 'Краткосрочные обязательства:', ''],
      ['  Денежные средства на счетах и в кассе', balance.cash, '  Кредиторская задолженность поставщикам', balance.accountsPayable],
      ['  Дебиторская задолженность покупателей', balance.accountsReceivable, '  Задолженность по зарплате (ФОТ)', balance.salaryPayables],
      ['  Запасы товаров и сырья на складе', balance.inventoryValue, '  Налоги и сборы к уплате', balance.taxesPayable],
      ['  Авансы, выданные поставщикам', balance.prepaidSuppliers, '  Краткосрочные кредиты и займы', balance.shortTermLoans],
      ['Итого оборотные активы', balance.currentAssets, 'Итого обязательства', balance.totalLiabilities],
      [],
      ['Внеоборотные активы:', '', 'Собственный капитал (Equity):', ''],
      ['  Оборудование и станки', balance.equipment, '  Уставный / внесенный капитал', balance.retainedCapital],
      ['  Транспортные средства', balance.vehicles, '  Нераспределенная чистая прибыль', balance.retainedEarnings],
      ['  Недвижимость и помещения', balance.realEstate, 'Итого собственный капитал', balance.equity],
      ['  Накопленная амортизация (-)', -balance.accumulatedDepreciation, '', ''],
      ['Итого внеоборотные активы', balance.fixedAssets, '', ''],
      [],
      ['ИТОГО АКТИВЫ', balance.totalAssets, 'ИТОГО ПАССИВЫ И КАПИТАЛ', balance.totalLiabilitiesAndEquity],
      [],
      ['АНАЛИТИЧЕСКИЕ КОЭФФИЦИЕНТЫ:', ''],
      ['Коэффициент текущей ликвидности (Current Ratio):', balance.currentRatio.toFixed(2)],
      ['Коэффициент автономии (Equity Ratio):', (balance.equityRatio * 100).toFixed(1) + '%'],
      ['Чистые оборотные активы (NWC):', balance.workingCapital],
    ];

    const csvContent = '\uFEFF' + rows.map(r => r.map(c => `"${c}"`).join(';')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Balance_Sheet_${asOfDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="balance-sheet-view-container" className="p-6 space-y-6 max-w-7xl mx-auto text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
                Управленческий баланс (Balance Sheet)
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Срезовый отчет состояния компании: Активы = Обязательства + Собственный капитал
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>На дату:</span>
            <input
              type="date"
              value={asOfDate}
              onChange={e => setAsOfDate(e.target.value)}
              className="bg-transparent border-0 text-slate-100 font-mono focus:outline-none cursor-pointer"
            />
          </div>

          <button
            id="balance-export-csv-btn"
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium border border-slate-700 transition cursor-pointer shadow-sm"
          >
            <Download className="w-4 h-4 text-purple-400" />
            <span>Экспорт в Excel / CSV</span>
          </button>
        </div>
      </div>

      {/* Balance Equilibrium Indicator */}
      <div className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm ${
        balance.isBalanced
          ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
          : 'bg-rose-950/30 border-rose-500/40 text-rose-200'
      }`}>
        <div className="flex items-center gap-3">
          {balance.isBalanced ? (
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center flex-shrink-0 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
          )}
          <div>
            <div className="font-semibold text-sm md:text-base flex items-center gap-2">
              {balance.isBalanced ? (
                <span>Балансовое равенство строго соблюдено (Дельта = 0.00 ₴)</span>
              ) : (
                <span>Внимание: Нарушение балансового равенства!</span>
              )}
            </div>
            <div className="text-xs opacity-90 mt-0.5">
              {balance.isBalanced ? (
                <span>Активы ({fmt(balance.totalAssets)}) в точности равны сумме Пассивов и Собственного капитала ({fmt(balance.totalLiabilitiesAndEquity)}).</span>
              ) : (
                <span>
                  Разница между активами и пассивами составляет <span className="font-mono font-bold text-rose-300">{fmt(balance.delta)}</span>. Проверьте незакрытые проводки или списания.
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs self-end md:self-auto font-mono">
          <div className="bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="text-slate-400 mr-2">Активы:</span>
            <span className="font-bold text-slate-100">{fmt(balance.totalAssets)}</span>
          </div>
          <div className="bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="text-slate-400 mr-2">Пассивы:</span>
            <span className="font-bold text-slate-100">{fmt(balance.totalLiabilitiesAndEquity)}</span>
          </div>
        </div>
      </div>

      {/* Financial Health & Solvency Ratios */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Текущая ликвидность (CR)</span>
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${
              balance.currentRatio >= 1.5 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
            }`}>
              Норма &gt; 1.5
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-100 mt-2 font-mono">
            {balance.currentRatio.toFixed(2)}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Оборотные активы ({fmt(balance.currentAssets)}) к обязательствам ({fmt(balance.totalLiabilities)})
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Коэффициент автономии</span>
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${
              balance.equityRatio >= 0.5 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
            }`}>
              Норма &gt; 50%
            </span>
          </div>
          <div className="text-2xl font-bold text-cyan-300 mt-2 font-mono">
            {(balance.equityRatio * 100).toFixed(1)}%
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Доля собственного капитала ({fmt(balance.equity)}) во всех активах компании
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Чистые оборотные средства</span>
            <span className="text-xs text-slate-400">NWC (Working Capital)</span>
          </div>
          <div className={`text-2xl font-bold mt-2 font-mono ${balance.workingCapital >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {fmt(balance.workingCapital)}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Запас свободной операционной ликвидности компании
          </p>
        </div>
      </div>

      {/* Two Classical Columns Layout: Assets vs Liabilities & Equity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN: ASSETS */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-lg flex flex-col justify-between">
          <div>
            <div className="p-4 bg-emerald-950/30 border-b border-emerald-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-emerald-400" />
                <span className="font-bold text-slate-100">АКТИВЫ (Чем владеет компания)</span>
              </div>
              <span className="text-sm font-bold text-emerald-400 font-mono">{fmt(balance.totalAssets)}</span>
            </div>

            <div className="p-4 space-y-4">
              {/* Section 1: Current Assets */}
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-emerald-400/90 pb-2 border-b border-slate-800 flex justify-between">
                  <span>1. Оборотные активы</span>
                  <span className="font-mono">{fmt(balance.currentAssets)}</span>
                </div>
                <div className="divide-y divide-slate-800/40 font-mono text-xs">
                  <div className="py-2.5 flex justify-between items-center">
                    <span className="font-sans text-slate-300">Денежные средства на расчетных счетах и в кассе</span>
                    <span className="text-slate-100 font-bold">{fmt(balance.cash)}</span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center">
                    <span className="font-sans text-slate-300">Дебиторская задолженность (клиенты должны нам)</span>
                    <span className="text-slate-100 font-bold">{fmt(balance.accountsReceivable)}</span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center">
                    <span className="font-sans text-slate-300">Запасы товаров, готовой продукции и сырья на складе</span>
                    <span className="text-slate-100 font-bold">{fmt(balance.inventoryValue)}</span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center">
                    <span className="font-sans text-slate-300">Авансы выданные поставщикам и подрядчикам</span>
                    <span className="text-slate-100">{fmt(balance.prepaidSuppliers)}</span>
                  </div>
                </div>
              </div>

              {/* Section 2: Non-Current / Fixed Assets */}
              <div className="pt-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-emerald-400/90 pb-2 border-b border-slate-800 flex justify-between">
                  <span>2. Внеоборотные активы (Основные средства)</span>
                  <span className="font-mono">{fmt(balance.fixedAssets)}</span>
                </div>
                <div className="divide-y divide-slate-800/40 font-mono text-xs">
                  <div className="py-2.5 flex justify-between items-center">
                    <span className="font-sans text-slate-300">Оборудование, техника, серверы и станки</span>
                    <span className="text-slate-100">{fmt(balance.equipment)}</span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center">
                    <span className="font-sans text-slate-300">Транспортные средства и спецтехника</span>
                    <span className="text-slate-100">{fmt(balance.vehicles)}</span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center">
                    <span className="font-sans text-slate-300">Недвижимость, офисы и производственные склады</span>
                    <span className="text-slate-100">{fmt(balance.realEstate)}</span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center text-rose-300">
                    <span className="font-sans">Накопленная амортизация основных средств (-)</span>
                    <span className="text-rose-400">-{fmt(balance.accumulatedDepreciation)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* TOTAL ASSETS FOOTER */}
          <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center font-mono">
            <span className="font-sans font-bold text-slate-200">ИТОГО БАЛАНС АКТИВОВ</span>
            <span className="text-lg font-bold text-emerald-400">{fmt(balance.totalAssets)}</span>
          </div>
        </div>

        {/* RIGHT COLUMN: LIABILITIES & EQUITY */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-lg flex flex-col justify-between">
          <div>
            <div className="p-4 bg-purple-950/30 border-b border-purple-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-purple-400" />
                <span className="font-bold text-slate-100">ПАССИВЫ И КАПИТАЛ (Источники средств)</span>
              </div>
              <span className="text-sm font-bold text-purple-400 font-mono">{fmt(balance.totalLiabilitiesAndEquity)}</span>
            </div>

            <div className="p-4 space-y-4">
              {/* Section 1: Liabilities */}
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-purple-400/90 pb-2 border-b border-slate-800 flex justify-between">
                  <span>1. Обязательства (Долги компании)</span>
                  <span className="font-mono">{fmt(balance.totalLiabilities)}</span>
                </div>
                <div className="divide-y divide-slate-800/40 font-mono text-xs">
                  <div className="py-2.5 flex justify-between items-center">
                    <span className="font-sans text-slate-300">Кредиторская задолженность поставщикам</span>
                    <span className="text-rose-300 font-medium">{fmt(balance.accountsPayable)}</span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center">
                    <span className="font-sans text-slate-300">Задолженность по зарплате (ФОТ сотрудникам)</span>
                    <span className="text-rose-300 font-medium">{fmt(balance.salaryPayables)}</span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center">
                    <span className="font-sans text-slate-300">Начисленные налоги и сборы к уплате</span>
                    <span className="text-rose-300 font-medium">{fmt(balance.taxesPayable)}</span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center">
                    <span className="font-sans text-slate-300">Краткосрочные займы и овердрафты</span>
                    <span className="text-slate-100">{fmt(balance.shortTermLoans)}</span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center">
                    <span className="font-sans text-slate-300">Долгосрочные кредиты и обязательства</span>
                    <span className="text-slate-100">{fmt(balance.longTermLoans)}</span>
                  </div>
                </div>
              </div>

              {/* Section 2: Equity */}
              <div className="pt-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-purple-400/90 pb-2 border-b border-slate-800 flex justify-between">
                  <span>2. Собственный капитал (Equity)</span>
                  <span className="font-mono">{fmt(balance.equity)}</span>
                </div>
                <div className="divide-y divide-slate-800/40 font-mono text-xs">
                  <div className="py-2.5 flex justify-between items-center">
                    <span className="font-sans text-slate-300">Уставный / вложенный капитал собственников</span>
                    <span className="text-slate-100 font-bold">{fmt(balance.retainedCapital)}</span>
                  </div>
                  <div className="py-2.5 flex justify-between items-center">
                    <span className="font-sans text-slate-300">Накопленная нераспределенная чистая прибыль</span>
                    <span className="text-emerald-400 font-bold">{fmt(balance.retainedEarnings)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* TOTAL LIABILITIES & EQUITY FOOTER */}
          <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center font-mono">
            <span className="font-sans font-bold text-slate-200">ИТОГО БАЛАНС ПАССИВОВ И КАПИТАЛА</span>
            <span className="text-lg font-bold text-purple-400">{fmt(balance.totalLiabilitiesAndEquity)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
