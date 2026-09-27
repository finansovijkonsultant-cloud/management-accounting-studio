import React, { useState } from 'react';
import {
  ArrowUpDown,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  FileText,
  FileCode,
  Settings2,
  Hash,
  Database,
  Layers,
} from 'lucide-react';
import { TranslationDictionary } from '../i18n';
import {
  BankingParserService,
  ParseResult,
  RawParsedRow,
  ColumnMapping,
  ParsedStatementTransaction,
} from '../services/banking';
import { Account, Transaction } from '../types';

export interface ImportResultLog {
  totalParsed: number;
  imported: number;
  duplicatesSkipped: number;
  targetAccountName: string;
  timestamp: string;
  items: Array<{
    date: string;
    description: string;
    amount: number;
    currency: string;
    idempotency_key: string;
    status: 'imported' | 'duplicate_skipped' | 'error';
  }>;
}

interface ImportExportViewProps {
  t: TranslationDictionary;
  accounts?: Account[];
  onImportTransactions?: (
    rows: ParsedStatementTransaction[],
    targetAccountId: string
  ) => { imported: number; duplicatesSkipped: number };
  onExportBackup?: () => void;
  onRestoreBackup?: (jsonData: string) => void;
}

export const ImportExportView: React.FC<ImportExportViewProps> = ({
  t,
  accounts = [],
  onImportTransactions,
  onExportBackup,
  onRestoreBackup,
}) => {
  // Step 1: Upload, Step 2: Interactive Column Mapping, Step 3: Result Log
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fileName, setFileName] = useState<string>('');
  const [fileEncoding, setFileEncoding] = useState<'UTF-8' | 'Windows-1251'>('UTF-8');
  const [delimiter, setDelimiter] = useState<string>(';');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<RawParsedRow[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id || '');

  // Column Mapping state
  const [dateColIdx, setDateColIdx] = useState<number>(0);
  const [amountColIdx, setAmountColIdx] = useState<number>(1);
  const [descColIdx, setDescColIdx] = useState<number>(2);
  const [cpColIdx, setCpColIdx] = useState<number>(3);
  const [currencyColIdx, setCurrencyColIdx] = useState<number>(-1);

  // Prepared transactions preview
  const [previewTxs, setPreviewTxs] = useState<ParsedStatementTransaction[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Import Result Log
  const [importLog, setImportLog] = useState<ImportResultLog | null>(null);

  // Handle file drop / input: Supports Excel (.xlsx, .xls) and CSV
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);

    try {
      const buffer = await file.arrayBuffer();
      let parseResult: ParseResult;

      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        parseResult = await BankingParserService.parseExcelFile(buffer, file.name);
      } else {
        const { text, encoding } = BankingParserService.decodeFileContent(buffer);
        parseResult = BankingParserService.parseCSVContent(text);
        parseResult.encoding = encoding;
        parseResult.filename = file.name;
      }

      setHeaders(parseResult.headers);
      setRawRows(parseResult.rawRows);
      setFileEncoding(parseResult.encoding);
      setDelimiter(parseResult.detectedDelimiter);

      // Heuristic auto-mapping based on header names
      const lowerHeaders = parseResult.headers.map(h => h.toLowerCase());
      const findIdx = (keywords: string[], fallback: number) => {
        const idx = lowerHeaders.findIndex(h => keywords.some(k => h.includes(k)));
        return idx >= 0 ? idx : fallback;
      };

      const guessedDate = findIdx(['дата', 'date', 'время', 'час'], 0);
      const guessedAmount = findIdx(['сума', 'сумма', 'amount', 'оборот'], 1);
      const guessedDesc = findIdx(['призначення', 'назначение', 'опис', 'description', 'детали'], 2);
      const guessedCp = findIdx(['контрагент', 'одержувач', 'получатель', 'платник', 'payer', 'counterparty'], 3);

      setDateColIdx(guessedDate);
      setAmountColIdx(guessedAmount);
      setDescColIdx(guessedDesc);
      setCpColIdx(guessedCp);

      // Generate initial preview with auto-mapping
      const mapping: ColumnMapping = {
        dateColIndex: guessedDate,
        amountColIndex: guessedAmount,
        descriptionColIndex: guessedDesc,
        counterpartyColIndex: guessedCp,
      };

      const preview = await BankingParserService.mapRowsToTransactions(
        parseResult.rawRows.slice(0, 100),
        mapping,
        selectedAccountId || accounts[0]?.id || 'acc-main',
        accounts[0]?.currency || 'UAH'
      );

      setPreviewTxs(preview);
      setStep(2);
    } catch (err: any) {
      alert(`Ошибка при чтении файла выписки: ${err?.message || 'Неизвестная ошибка'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const recomputePreview = async (newMapping: {
    date: number;
    amount: number;
    desc: number;
    cp: number;
    curr: number;
  }) => {
    const mapping: ColumnMapping = {
      dateColIndex: newMapping.date,
      amountColIndex: newMapping.amount,
      descriptionColIndex: newMapping.desc,
      counterpartyColIndex: newMapping.cp >= 0 ? newMapping.cp : undefined,
      currencyColIndex: newMapping.curr >= 0 ? newMapping.curr : undefined,
    };

    const preview = await BankingParserService.mapRowsToTransactions(
      rawRows.slice(0, 100),
      mapping,
      selectedAccountId,
      'UAH'
    );
    setPreviewTxs(preview);
  };

  const loadSamplePrivat24CSV = async () => {
    const sample = `Дата;Контрагент;Назначение платежа;Сумма;Валюта
10.09.2026;ТОВ «ПромТех Постач»;Оплата за постачання обладнання №41;-85000.00;UAH
11.09.2026;ПП «АгроТрейд Сервіс»;Попередня оплата за продукцію зернову;240000.00;UAH
11.09.2026;ФОП Бондаренко В.О.;Надання юридичних та консалтингових послуг;-18500.00;UAH
12.09.2026;АТ «УкрТелеком»;Абонентська плата за телекомунікаційні послуги;-3200.00;UAH
12.09.2026;ТОВ «Вектор Рітейл»;Виторг за роздрібні реалізації товару;115000.00;UAH`;

    setFileName('privat24_sample_statement.csv');
    setFileEncoding('UTF-8');
    setDelimiter(';');

    const parsed = BankingParserService.parseCSVContent(sample, ';');
    setHeaders(parsed.headers);
    setRawRows(parsed.rawRows);

    setDateColIdx(0);
    setCpColIdx(1);
    setDescColIdx(2);
    setAmountColIdx(3);
    setCurrencyColIdx(4);

    const mapping: ColumnMapping = {
      dateColIndex: 0,
      counterpartyColIndex: 1,
      descriptionColIndex: 2,
      amountColIndex: 3,
      currencyColIndex: 4,
    };

    const preview = await BankingParserService.mapRowsToTransactions(
      parsed.rawRows,
      mapping,
      selectedAccountId || accounts[0]?.id || 'acc-main',
      'UAH'
    );
    setPreviewTxs(preview);
    setStep(2);
  };

  const handleExecuteImport = async () => {
    if (rawRows.length === 0) {
      alert('Нет строк для импорта.');
      return;
    }

    setIsProcessing(true);

    const mapping: ColumnMapping = {
      dateColIndex: dateColIdx,
      amountColIndex: amountColIdx,
      descriptionColIndex: descColIdx,
      counterpartyColIndex: cpColIdx >= 0 ? cpColIdx : undefined,
      currencyColIndex: currencyColIdx >= 0 ? currencyColIdx : undefined,
    };

    // Process all rows with SHA-256 idempotency keys
    const allTransactions = await BankingParserService.mapRowsToTransactions(
      rawRows,
      mapping,
      selectedAccountId,
      (accounts.find(a => a.id === selectedAccountId)?.currency as any) || 'UAH'
    );

    let res = { imported: allTransactions.length, duplicatesSkipped: 0 };
    if (onImportTransactions) {
      res = onImportTransactions(allTransactions, selectedAccountId);
    }

    const targetAcc = accounts.find(a => a.id === selectedAccountId)?.name || selectedAccountId;

    const log: ImportResultLog = {
      totalParsed: allTransactions.length,
      imported: res.imported,
      duplicatesSkipped: res.duplicatesSkipped,
      targetAccountName: targetAcc,
      timestamp: new Date().toISOString(),
      items: allTransactions.map((tx, i) => ({
        date: tx.date,
        description: tx.description,
        amount: tx.amount,
        currency: tx.currency,
        idempotency_key: tx.idempotency_key,
        status: i < res.imported ? 'imported' : 'duplicate_skipped',
      })),
    };

    setImportLog(log);
    setIsProcessing(false);
    setStep(3);
  };

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      const data = ev.target?.result as string;
      if (onRestoreBackup) {
        onRestoreBackup(data);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">{t.importExport.title}</h2>
          <p className="text-xs text-slate-400">
            Универсальный файловый импорт банковских выписок (Excel .xlsx/.xls, CSV) с защитой от дубликатов по SHA-256
          </p>
        </div>
      </div>

      {/* Main Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: 3-step Guided Parser Wizard */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Upload className="w-5 h-5 text-emerald-400" />
              Универсальный банковский парсер
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                Шаг {step} из 3
              </span>
            </div>
          </div>

          {/* STEP 1: Drag & Drop File Upload */}
          {step === 1 && (
            <div className="space-y-4 text-xs">
              <div className="border-2 border-dashed border-slate-700 hover:border-emerald-500/50 rounded-2xl p-8 text-center transition space-y-3">
                <FileSpreadsheet className="w-12 h-12 text-slate-500 mx-auto" />
                <div className="text-slate-200 font-medium text-sm">
                  Перетащите файл банковской выписки или выберите на устройстве
                </div>
                <div className="text-[11px] text-slate-400 max-w-md mx-auto leading-relaxed">
                  Поддерживаются исключительно локальные таблицы <strong>Excel (.xlsx, .xls)</strong> и <strong>CSV</strong>.
                  Автоматическое определение разделителей (, ; \t) и декодирование кириллицы из <strong>Windows-1251</strong> в UTF-8.
                </div>
                <div className="pt-2">
                  <label className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-lg font-semibold cursor-pointer transition inline-flex items-center gap-2 shadow-sm">
                    <Upload className="w-4 h-4" />
                    Выбрать файл Excel / CSV
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls,.txt"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="text-center pt-2">
                <button
                  onClick={loadSamplePrivat24CSV}
                  className="text-xs text-teal-400 hover:text-teal-300 font-medium cursor-pointer underline"
                >
                  Загрузить образец выписки Приват24 / Монобанк (.CSV)
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Interactive Column Mapping & SHA-256 Preview */}
          {step === 2 && (
            <div className="space-y-4 text-xs">
              {/* File Info Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                <div>
                  <div className="font-semibold text-white flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    {fileName}
                  </div>
                  <div className="text-slate-400 text-[11px] mt-0.5">
                    Строк: <strong className="text-emerald-400">{rawRows.length}</strong> • Кодировка:{' '}
                    <span className="font-mono text-teal-300">{fileEncoding}</span> • Разделитель:{' '}
                    <span className="font-mono text-amber-300">[{delimiter === '\t' ? 'TAB' : delimiter}]</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-slate-300 font-medium">Зачислить на счет:</label>
                  <select
                    value={selectedAccountId}
                    onChange={e => setSelectedAccountId(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none font-medium"
                  >
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.currency})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Interactive Column Mapping Panel */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white flex items-center gap-1.5 text-xs">
                    <Settings2 className="w-4 h-4 text-teal-400" />
                    Интерактивный маппинг колонок выписки
                  </h4>
                  <span className="text-[11px] text-slate-400">Укажите соответствие полей файла</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                  {/* Date Column */}
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Колонка Даты *</label>
                    <select
                      value={dateColIdx}
                      onChange={e => {
                        const val = parseInt(e.target.value);
                        setDateColIdx(val);
                        recomputePreview({
                          date: val,
                          amount: amountColIdx,
                          desc: descColIdx,
                          cp: cpColIdx,
                          curr: currencyColIdx,
                        });
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 focus:border-emerald-500"
                    >
                      {headers.map((h, i) => (
                        <option key={i} value={i}>
                          [{i + 1}] {h || `Колонка ${i + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Amount Column */}
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Колонка Суммы *</label>
                    <select
                      value={amountColIdx}
                      onChange={e => {
                        const val = parseInt(e.target.value);
                        setAmountColIdx(val);
                        recomputePreview({
                          date: dateColIdx,
                          amount: val,
                          desc: descColIdx,
                          cp: cpColIdx,
                          curr: currencyColIdx,
                        });
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 focus:border-emerald-500"
                    >
                      {headers.map((h, i) => (
                        <option key={i} value={i}>
                          [{i + 1}] {h || `Колонка ${i + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Description Column */}
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Назначение платежа *</label>
                    <select
                      value={descColIdx}
                      onChange={e => {
                        const val = parseInt(e.target.value);
                        setDescColIdx(val);
                        recomputePreview({
                          date: dateColIdx,
                          amount: amountColIdx,
                          desc: val,
                          cp: cpColIdx,
                          curr: currencyColIdx,
                        });
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 focus:border-emerald-500"
                    >
                      {headers.map((h, i) => (
                        <option key={i} value={i}>
                          [{i + 1}] {h || `Колонка ${i + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Counterparty Column */}
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Контрагент (опц.)</label>
                    <select
                      value={cpColIdx}
                      onChange={e => {
                        const val = parseInt(e.target.value);
                        setCpColIdx(val);
                        recomputePreview({
                          date: dateColIdx,
                          amount: amountColIdx,
                          desc: descColIdx,
                          cp: val,
                          curr: currencyColIdx,
                        });
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 focus:border-emerald-500"
                    >
                      <option value={-1}>— Не использовать —</option>
                      {headers.map((h, i) => (
                        <option key={i} value={i}>
                          [{i + 1}] {h || `Колонка ${i + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Data Preview Table */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span>Предпросмотр с расчетом SHA-256 ключей дедупликации:</span>
                  <span className="font-mono text-emerald-400">idempotency_key = sha256(date+amount+acc+desc)</span>
                </div>

                <div className="border border-slate-800 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3">Дата</th>
                        <th className="py-2.5 px-3">Контрагент</th>
                        <th className="py-2.5 px-3">Назначение платежа</th>
                        <th className="py-2.5 px-3">Idempotency SHA-256</th>
                        <th className="py-2.5 px-3 text-right">Сумма</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {previewTxs.slice(0, 15).map((r, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/40">
                          <td className="py-2 px-3 font-mono text-slate-400">{r.date}</td>
                          <td className="py-2 px-3 font-medium text-white">{r.counterparty}</td>
                          <td className="py-2 px-3 text-slate-300 truncate max-w-xs">{r.description}</td>
                          <td className="py-2 px-3 font-mono text-[10px] text-teal-400 truncate max-w-[120px]">
                            {r.idempotency_key.substring(0, 12)}...
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold">
                            <span className={r.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}>
                              {r.type === 'income' ? '+' : '-'}
                              {r.amount.toLocaleString()} {r.currency}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                >
                  Назад
                </button>
                <button
                  onClick={handleExecuteImport}
                  disabled={isProcessing}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-lg cursor-pointer transition shadow-sm flex items-center gap-2"
                >
                  <Database className="w-4 h-4" />
                  Выполнить безопасный импорт ({rawRows.length} строк)
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Detailed Import Results Log */}
          {step === 3 && importLog && (
            <div className="space-y-4 text-xs">
              <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 text-center space-y-2">
                <div className="w-12 h-12 bg-emerald-950/80 border border-emerald-700 rounded-full flex items-center justify-center mx-auto text-emerald-400">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-white">Банковская выписка успешно обработана</h4>
                <p className="text-slate-400 max-w-md mx-auto">
                  Счет зачисления: <strong className="text-white">{importLog.targetAccountName}</strong>
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-slate-800/60 border border-slate-700 p-3 rounded-xl">
                  <div className="text-[11px] text-slate-400">Всего в файле</div>
                  <div className="text-lg font-bold text-white font-mono mt-0.5">{importLog.totalParsed}</div>
                </div>
                <div className="bg-emerald-950/40 border border-emerald-800 p-3 rounded-xl">
                  <div className="text-[11px] text-emerald-400">Успешно внесено</div>
                  <div className="text-lg font-bold text-emerald-300 font-mono mt-0.5">{importLog.imported}</div>
                </div>
                <div className="bg-amber-950/40 border border-amber-800 p-3 rounded-xl">
                  <div className="text-[11px] text-amber-400">Дубликатов отсечено (SHA-256)</div>
                  <div className="text-lg font-bold text-amber-300 font-mono mt-0.5">
                    {importLog.duplicatesSkipped}
                  </div>
                </div>
              </div>

              {/* Detailed Transaction Import Log */}
              <div className="space-y-1 pt-1">
                <div className="text-slate-400 text-[11px] font-semibold">
                  Детальный лог операций и статусов дедупликации:
                </div>
                <div className="border border-slate-800 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider sticky top-0">
                      <tr>
                        <th className="py-2 px-3">Дата</th>
                        <th className="py-2 px-3">Назначение</th>
                        <th className="py-2 px-3">Сумма</th>
                        <th className="py-2 px-3 text-right">Статус в БД SQLite</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {importLog.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/30">
                          <td className="py-1.5 px-3 font-mono text-slate-400 text-[11px]">{item.date}</td>
                          <td className="py-1.5 px-3 truncate max-w-xs">{item.description}</td>
                          <td className="py-1.5 px-3 font-mono font-bold">
                            {item.amount.toLocaleString()} {item.currency}
                          </td>
                          <td className="py-1.5 px-3 text-right">
                            {item.status === 'imported' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800">
                                Записано
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] bg-amber-950 text-amber-400 border border-amber-800">
                                Пропущен (Дубликат)
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="pt-2 flex justify-center">
                <button
                  onClick={() => {
                    setStep(1);
                    setRawRows([]);
                    setPreviewTxs([]);
                    setImportLog(null);
                  }}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-5 py-2 rounded-lg font-medium transition cursor-pointer"
                >
                  Загрузить еще один файл
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Encrypted Backup & Restore Vault */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              Криптографический бэкап
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950/80 text-emerald-400 border border-emerald-800">
              AES-GCM-256
            </span>
          </div>

          <p className="text-slate-400 leading-relaxed">
            Резервная копия шифруется мастер-паролем по военному стандарту AES-GCM с деривацией ключа PBKDF2 (100 000 итераций). Облачные API-ключи и банковские секреты принудительно вырезаются перед выгрузкой.
          </p>

          <div className="space-y-3 pt-2">
            <button
              onClick={onExportBackup}
              className="w-full flex items-center justify-center gap-2 bg-emerald-700/80 hover:bg-emerald-600 text-white font-medium p-3 rounded-xl border border-emerald-600 transition cursor-pointer shadow-sm"
            >
              <Download className="w-4 h-4 text-emerald-200" />
              Экспорт крипто-бэкапа (AES-GCM .json)
            </button>

            <label className="w-full flex items-center justify-center gap-2 bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-medium p-3 rounded-xl border border-slate-700 transition cursor-pointer">
              <RotateCcw className="w-4 h-4 text-teal-400" />
              Расшифровать и восстановить бэкап
              <input type="file" accept=".json" onChange={handleRestoreFile} className="hidden" />
            </label>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1 text-[11px] text-slate-400">
            <div className="font-semibold text-slate-300">Стандарт защиты OWASP MASVS:</div>
            <div>• Принудительная санитизация: ключи ИИ и токены банков не экспортируются;</div>
            <div>• Атомарная проверка целостности шифротекста (Authentication Tag).</div>
          </div>
        </div>
      </div>
    </div>
  );
};
