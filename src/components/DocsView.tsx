import React, { useState } from 'react';
import {
  BookOpen,
  FileText,
  DollarSign,
  AlertTriangle,
  Calculator,
  CheckCircle2,
  HelpCircle,
  TrendingUp,
  ArrowRight,
  Shield,
  Layers,
  ArrowDownRight,
  ArrowUpRight,
  Percent,
  Sparkles,
} from 'lucide-react';
import { TranslationDictionary } from '../i18n';

interface DocsViewProps {
  t: TranslationDictionary;
}

type DocLanguage = 'ru' | 'uk' | 'en';
type ActiveSection = 'pnl' | 'cashflow' | 'cashgap' | 'simulator' | 'architecture';

export const DocsView: React.FC<DocsViewProps> = ({ t }) => {
  const [lang, setLang] = useState<DocLanguage>('ru');
  const [activeSection, setActiveSection] = useState<ActiveSection>('pnl');

  // Interactive Simulator State for SMB Owner
  const [simRevenue, setSimRevenue] = useState<number>(500000); // Выручка по актам
  const [simCashInflow, setSimCashInflow] = useState<number>(320000); // Фактически пришло денег на счет
  const [simCogs, setSimCogs] = useState<number>(250000); // Себестоимость отгруженной продукции
  const [simCashOutflowSuppliers, setSimCashOutflowSuppliers] = useState<number>(280000); // Фактически оплачено поставщикам
  const [simOpex, setSimOpex] = useState<number>(120000); // Аренда, ФОТ, налоги
  const [simOpeningCash, setSimOpeningCash] = useState<number>(90000); // Начальный остаток на счетах

  // Calculated Metrics
  const simGrossProfit = simRevenue - simCogs;
  const simNetProfit = simGrossProfit - simOpex; // P&L
  const simNetCashFlow = simCashInflow - simCashOutflowSuppliers - simOpex; // Cash Flow
  const simClosingCash = simOpeningCash + simNetCashFlow;
  const simDiscrepancy = simNetProfit - simNetCashFlow; // Почему прибыль != деньги

  const content = {
    ru: {
      title: 'Документация и финансовое руководство',
      subtitle: 'Интерактивный справочник собственника МСБ: логика отчетов, защита от кассовых разрывов и архитектура системы',
      tabs: {
        pnl: '1. P&L (Метод начисления)',
        cashflow: '2. Cash Flow (Кассовый метод)',
        cashgap: '3. Кассовые разрывы',
        simulator: '4. Интерактивный симулятор',
        architecture: '5. Архитектура и безопасность',
      },
      pnl: {
        heading: 'Как читать Отчет о прибылях и убытках (P&L / ОПУ)',
        tagline: 'Метод начисления (Accrual Accounting): оценка реальной экономической эффективности бизнеса',
        paradox: 'Главный парадокс собственника: «Прибыль на бумаге есть, а денег на счете нет». Почему так происходит?',
        paradoxText:
          'В P&L доходы и расходы признаются в момент совершения хозяйственной операции (подписание акта, отгрузка товара со склада), вне зависимости от того, когда фактически поступили деньги на банковский счет.',
        structureTitle: 'Ключевая структура и формулы P&L:',
        steps: [
          {
            term: 'Выручка (Revenue)',
            desc: 'Сумма отгруженного товара или оказанных услуг за период. Авансы клиентов НЕ являются выручкой!',
          },
          {
            term: 'Себестоимость (COGS)',
            desc: 'Прямые переменные расходы на производство отгруженных товаров (материалы, закупка, сдельная оплата).',
          },
          {
            term: 'Валовая прибыль (Gross Profit)',
            desc: 'Формула: Выручка − Себестоимость. Показывает базовую маржинальность продукта/услуги.',
          },
          {
            term: 'Операционные расходы (OPEX)',
            desc: 'Постоянные расходы бизнеса: аренда офиса/склада, оклады персонала, маркетинг, бухгалтерия, связь.',
          },
          {
            term: 'Операционная прибыль (EBITDA / EBIT)',
            desc: 'Прибыль до вычета процентов, налогов и амортизации. Индикатор жизнеспособности бизнес-модели.',
          },
          {
            term: 'Чистая прибыль (Net Profit)',
            desc: 'Итоговый финансовый результат компании. Только из чистой прибыли можно законно выплачивать дивиденды!',
          },
        ],
        checklistTitle: 'Чек-лист собственника при ежемесячном анализе P&L:',
        checklist: [
          'Не растет ли доля себестоимости быстрее темпа роста выручки?',
          'Какова рентабельность по чистой прибыли (Net Margin % = Чистая прибыль / Выручка × 100%)?',
          'Не «проедают» ли раздутые постоянные расходы (OPEX) всю валовую маржу?',
        ],
      },
      cashflow: {
        heading: 'Как вести Отчет о движении денежных средств (Cash Flow / ДДС)',
        tagline: 'Кассовый метод (Cash Basis): учет фактических притоков и оттоков реальных денег',
        rule: 'Золотое правило ликвидности: Остаток на конец = Остаток на начало + Приток денег − Отток денег.',
        threeStreamsTitle: 'Три обязательных потока денег в компании:',
        streams: [
          {
            title: '1. Операционный денежный поток (Operating Cash Flow / OCF)',
            desc: 'Деньги от основной деятельности: оплата от клиентов минус оплата поставщикам, аренда, зарплаты и налоги. OCF обязан быть положительным!',
          },
          {
            title: '2. Инвестиционный денежный поток (Investing Cash Flow / ICF)',
            desc: 'Покупка или продажа оборудования, транспорта, лицензий, вложения в модернизацию основных средств.',
          },
          {
            title: '3. Финансовый денежный поток (Financing Cash Flow / FCF)',
            desc: 'Кредиты, займы, лизинг, внесение капитала учредителем и выплата дивидендов собственнику.',
          },
        ],
        trapTitle: 'Ловушка предоплат (авансов клиентов):',
        trapText:
          'Если клиент внес 100 000 грн предоплаты, на вашем расчетном счете стало больше денег (+100 000 в Cash Flow), но прибыли еще нет (0 в P&L). Эти деньги — ваш долг перед клиентом до момента выполнения работ!',
      },
      cashgap: {
        heading: 'Как трактовать предупреждения о кассовых разрывах (Cash Gap Alerts)',
        tagline: 'Кассовый разрыв — это временная нехватка живых денег на оплату обязательств при положительной прибыли',
        warningLevelsTitle: 'Градация рисков платежного календаря:',
        levels: [
          {
            badge: 'Красный уровень (Критический разрыв)',
            desc: 'Остаток денег уйдет в минус в течение 1–7 дней. Требуются экстренные управленческие решения сегодня.',
            color: 'rose',
          },
          {
            badge: 'Желтый уровень (Повышенный риск)',
            desc: 'Остаток приблизится к лимиту неснижаемого резерва в горизонте 8–14 дней. Повод для маневра.',
            color: 'amber',
          },
          {
            badge: 'Зеленый уровень (Стабильная ликвидность)',
            desc: 'Подушка ликвидности покрывает все плановые заявки на 30+ дней вперед.',
            color: 'emerald',
          },
        ],
        actionTitle: '5 безотлагательных действий собственника при кассовом разрыве:',
        actions: [
          'Ранжировать заявки на оплату по матрице приоритетов (A — критические: налоги, зарплата; B — поставщики сырья; C — неприоритетные).',
          'Связаться с ключевыми дебиторами и предложить скидку 2–3% за досрочную оплату прямо сегодня.',
          'Перенести выплаты поставщикам с разбивкой на еженедельные транши по согласованию.',
          'Задействовать согласованный банковский овердрафт или кредитную линию.',
          'Категорически заморозить выплату дивидендов до восстановления положительного операционного потока.',
        ],
      },
      simulator: {
        heading: 'Интерактивный тренажер: P&L vs Cash Flow в реальном времени',
        tagline: 'Изменяйте ползунки ниже, чтобы увидеть, как отсрочки клиентам создают дефицит денег при высокой прибыли',
      },
      architecture: {
        heading: 'Архитектурный манифест Release Candidate 1 (RC-1)',
        points: [
          'Native SQLite (SQLCipher): Полное исключение небезопасного IndexedDB. Все таблицы хранятся в реляционной БД с шифрованием AES-256.',
          'Write-Ahead Logging (WAL): Конкурентный доступ на чтение и запись без блокировки интерфейса и риска коррупции данных.',
          'No-Cloud P2P Sync: Синхронизация ПК и смартфона выполняется исключительно по локальной сети через порт 3001 и эфемерные QR-токены.',
          'MASVS-STORAGE & MASVS-CRYPTO: Соответствие строгим стандартам защиты корпоративных финансовых данных.',
        ],
      },
    },
    uk: {
      title: 'Документація та фінансовий посібник',
      subtitle: 'Інтерактивний довідник власника МСБ: логіка звітів, захист від касових розривів та архітектура системи',
      tabs: {
        pnl: '1. P&L (Метод нарахування)',
        cashflow: '2. Cash Flow (Касовий метод)',
        cashgap: '3. Касові розриви',
        simulator: '4. Інтерактивний симулятор',
        architecture: '5. Архітектура та безпека',
      },
      pnl: {
        heading: 'Як читати Звіт про прибутки та збитки (P&L / ЗПЗ)',
        tagline: 'Метод нарахування (Accrual Accounting): оцінка реальної економічної ефективності бізнесу',
        paradox: 'Головний парадокс власника: «Прибуток на папері є, а грошей на рахунку немає». Чому так?',
        paradoxText:
          'У P&L доходи та витрати визнаються в момент здійснення операції (підписання акта, відвантаження товару), незалежно від фактичного надходження коштів на банківський рахунок.',
        structureTitle: 'Ключова структура та формули P&L:',
        steps: [
          {
            term: 'Виручка (Revenue)',
            desc: 'Сума відвантаженого товару чи наданих послуг за період. Аванси клієнтів НЕ є виручкою!',
          },
          {
            term: 'Собівартість (COGS)',
            desc: 'Прямі змінні витрати на виробництво відвантаженої продукції (матеріали, закупівля, відрядна оплата).',
          },
          {
            term: 'Валовий прибуток (Gross Profit)',
            desc: 'Формула: Виручка − Собівартість. Показує базову маржинальність продукту/послуги.',
          },
          {
            term: 'Операційні витрати (OPEX)',
            desc: 'Постійні витрати бізнесу: оренда офісу, оклади персоналу, маркетинг, звʼязок.',
          },
          {
            term: 'Операційний прибуток (EBITDA)',
            desc: 'Прибуток до вирахування відсотків, податків та амортизації. Індикатор життєздатності бізнес-моделі.',
          },
          {
            term: 'Чистий прибуток (Net Profit)',
            desc: 'Підсумковий фінансовий результат компанії. Тільки з чистого прибутку можна виплачувати дивіденди!',
          },
        ],
        checklistTitle: 'Чек-лист власника при щомісячному аналізі P&L:',
        checklist: [
          'Чи не зростає частка собівартості швидше за темп зростання виручки?',
          'Яка рентабельність за чистим прибутком (Net Margin % = Чистий прибуток / Виручка × 100%)?',
          'Чи не «проїдають» роздуті постійні витрати (OPEX) всю валову маржу?',
        ],
      },
      cashflow: {
        heading: 'Як вести Звіт про рух грошових коштів (Cash Flow / ДДС)',
        tagline: 'Касовий метод (Cash Basis): облік фактичних надходжень та списань реальних грошей',
        rule: 'Золоте правило ліквідності: Залишок на кінець = Залишок на початок + Надходження − Списання.',
        threeStreamsTitle: 'Три обовʼязкові потоки грошей у компанії:',
        streams: [
          {
            title: '1. Операційний грошовий потік (Operating Cash Flow / OCF)',
            desc: 'Гроші від основної діяльності: надходження від клієнтів мінус виплати постачальникам, оренда, зарплати і податки. OCF зобовʼязаний бути додатним!',
          },
          {
            title: '2. Інвестиційний грошовий потік (Investing Cash Flow / ICF)',
            desc: 'Купівля або продаж обладнання, транспорту, ліцензій, вкладення в модернізацію основних засобів.',
          },
          {
            title: '3. Фінансовий грошовий потік (Financing Cash Flow / FCF)',
            desc: 'Кредити, позики, лізинг, внесення капіталу засновником та виплата дивідендів.',
          },
        ],
        trapTitle: 'Пастка передоплат (авансів клієнтів):',
        trapText:
          'Якщо клієнт вніс 100 000 грн авансу, на рахунку стало більше грошей (+100 000 у Cash Flow), але прибутку ще немає (0 у P&L). Це ваш борг перед клієнтом до виконання зобовʼязань!',
      },
      cashgap: {
        heading: 'Як трактувати попередження про касові розриви (Cash Gap Alerts)',
        tagline: 'Касовий розрив — тимчасовий брак грошей на рахунках для виплат за наявності прибутку на папері',
        warningLevelsTitle: 'Градація ризиків платіжного календаря:',
        levels: [
          {
            badge: 'Червоний рівень (Критичний розрив)',
            desc: 'Залишок грошей стане відʼємним протягом 1–7 днів. Потрібні термінові управлінські дії сьогодні.',
            color: 'rose',
          },
          {
            badge: 'Жовтий рівень (Підвищений ризик)',
            desc: 'Залишок наблизиться до мінімального резерву в горизонті 8–14 днів.',
            color: 'amber',
          },
          {
            badge: 'Зелений рівень (Стабільна ліквідність)',
            desc: 'Подушка безпеки покриває всі планові платежі на 30+ днів уперед.',
            color: 'emerald',
          },
        ],
        actionTitle: '5 невідкладних дій власника при виявленні касового розриву:',
        actions: [
          'Ранжувати заявки на оплату (A — критичні: податки, зарплата; B — постачальники сировини; C — другорядні).',
          'Звʼязатися з ключовими дебіторами та запропонувати знижку 2–3% за оплату сьогодні.',
          'Перенести виплати постачальникам щотижневими траншами за попереднім узгодженням.',
          'Задіяти узгоджений овердрафт чи кредитну лінію.',
          'Категорично заморозити виплату дивідендів до відновлення додатного операційного потоку.',
        ],
      },
      simulator: {
        heading: 'Інтерактивний тренажер: P&L проти Cash Flow у реальному часі',
        tagline: 'Змінюйте параметри нижче, щоб побачити, як відстрочки клієнтам призводять до дефіциту грошей',
      },
      architecture: {
        heading: 'Архітектурний маніфест Release Candidate 1 (RC-1)',
        points: [
          'Native SQLite (SQLCipher): Повна відмова від IndexedDB. Реляційні таблиці із шифруванням AES-256.',
          'Write-Ahead Logging (WAL): Конкурентний доступ без ризику блокування чи пошкодження даних.',
          'No-Cloud P2P Sync: Синхронізація ПК і смартфона виключно в локальній мережі через порт 3001 та QR-коди.',
          'MASVS-STORAGE & MASVS-CRYPTO: Суворе дотримання стандартів захисту корпоративних фінансів.',
        ],
      },
    },
    en: {
      title: 'Financial Knowledge Base & Docs',
      subtitle: 'Interactive SMB Owner Guide: P&L accrual logic, Cash Flow discipline, and cash gap mitigation',
      tabs: {
        pnl: '1. P&L (Accrual Method)',
        cashflow: '2. Cash Flow (Cash Basis)',
        cashgap: '3. Cash Gap Alerts',
        simulator: '4. Interactive Simulator',
        architecture: '5. Architecture & Security',
      },
      pnl: {
        heading: 'How to Read Profit & Loss Statement (P&L)',
        tagline: 'Accrual Accounting: true economic viability and profitability evaluation',
        paradox: 'The SMB Owner Paradox: "Why does P&L show profit while the bank account is empty?"',
        paradoxText:
          'Under accrual accounting, revenues and expenses are recognized when goods or services are delivered, regardless of when cash hits the bank account.',
        structureTitle: 'Core P&L Structure & Formulas:',
        steps: [
          {
            term: 'Revenue',
            desc: 'Total invoiced goods or services delivered during the period. Prepayments are NOT revenue!',
          },
          {
            term: 'COGS (Cost of Goods Sold)',
            desc: 'Direct variable expenses incurred to produce delivered goods (raw materials, direct labor).',
          },
          {
            term: 'Gross Profit',
            desc: 'Formula: Revenue − COGS. Shows baseline product profitability.',
          },
          {
            term: 'OPEX (Operating Expenses)',
            desc: 'Fixed business overheads: rent, administrative salaries, marketing, utilities.',
          },
          {
            term: 'Operating Profit (EBITDA)',
            desc: 'Earnings before interest, taxes, depreciation and amortization. Operational health score.',
          },
          {
            term: 'Net Profit',
            desc: 'Final bottom-line earnings. Dividends may only be legitimately drawn from Net Profit!',
          },
        ],
        checklistTitle: 'Owner Monthly P&L Review Checklist:',
        checklist: [
          'Are direct costs (COGS) growing faster than revenue?',
          'What is the Net Margin % (Net Profit / Revenue × 100%)?',
          'Are excessive fixed expenses (OPEX) eating away gross margin?',
        ],
      },
      cashflow: {
        heading: 'How to Manage Cash Flow Statement',
        tagline: 'Cash Basis Accounting: tracking actual physical inflows and outflows of liquidity',
        rule: 'Golden Rule of Liquidity: Ending Cash = Beginning Cash + Inflows − Outflows.',
        threeStreamsTitle: 'Three Mandatory Cash Streams:',
        streams: [
          {
            title: '1. Operating Cash Flow (OCF)',
            desc: 'Cash generated by core business operations: customer collections minus supplier bills, payroll, rent, and taxes. Must be positive!',
          },
          {
            title: '2. Investing Cash Flow (ICF)',
            desc: 'Capital expenditures (CAPEX): buying or selling machinery, vehicles, software licenses, or facilities.',
          },
          {
            title: '3. Financing Cash Flow (FCF)',
            desc: 'Debt servicing, bank loans, equity injections from founders, and dividend disbursements.',
          },
        ],
        trapTitle: 'The Prepayment Trap:',
        trapText:
          'When a client pays a $10,000 upfront deposit, your cash increases (+10,000 in Cash Flow), but profit is 0 in P&L. This money is your liability until fulfillment is completed!',
      },
      cashgap: {
        heading: 'How to Interpret Cash Gap Alerts',
        tagline: 'A cash gap is a temporary liquidity shortfall where cash drops below obligations, even in profitable businesses',
        warningLevelsTitle: 'Payment Calendar Risk Tiers:',
        levels: [
          {
            badge: 'Red Level (Critical Gap)',
            desc: 'Projected cash balance turns negative within 1–7 days. Requires immediate executive action.',
            color: 'rose',
          },
          {
            badge: 'Yellow Level (Elevated Risk)',
            desc: 'Cash balance drops near the safety reserve in an 8–14 day horizon.',
            color: 'amber',
          },
          {
            badge: 'Green Level (Stable Liquidity)',
            desc: 'Liquidity cushion covers all committed outlays for 30+ days.',
            color: 'emerald',
          },
        ],
        actionTitle: '5 Immediate Actions for Cash Gap Elimination:',
        actions: [
          'Rank payment vouchers by strict priority (Tier A: taxes, salaries; Tier B: raw material vendors; Tier C: discretionary).',
          'Offer prompt-payment discounts (2–3%) to key receivables clients for same-day settlement.',
          'Negotiate supplier payment terms into structured weekly installments.',
          'Draw upon pre-arranged credit lines or emergency overdraft facilities.',
          'Freeze owner dividend drawings until operating cash flow turns sustainably positive.',
        ],
      },
      simulator: {
        heading: 'Interactive Simulator: P&L vs. Cash Flow Live Comparison',
        tagline: 'Adjust parameters below to see how accounts receivable delay creates cash shortages despite positive profits',
      },
      architecture: {
        heading: 'Release Candidate 1 (RC-1) Architectural Blueprint',
        points: [
          'Native SQLite (SQLCipher): Total replacement of legacy IndexedDB. All ledger entities stored in relational tables encrypted with AES-256.',
          'Write-Ahead Logging (WAL): Concurrent read/write queries without UI freezing or database corruption.',
          'No-Cloud P2P Sync: Direct local Wi-Fi handshake over port 3001 using ephemeral QR tokens.',
          'MASVS-STORAGE & MASVS-CRYPTO: Strict compliance with enterprise data security guidelines.',
        ],
      },
    },
  };

  const tCurrent = content[lang];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-xs selection:bg-emerald-500 selection:text-white">
      {/* Header with Language Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-400" />
            {tCurrent.title}
          </h2>
          <p className="text-slate-400 mt-0.5">{tCurrent.subtitle}</p>
        </div>

        {/* Trilingual Switcher */}
        <div className="bg-slate-900 border border-slate-800 p-1 rounded-xl flex items-center gap-1 shadow-sm">
          {(['ru', 'uk', 'en'] as DocLanguage[]).map(l => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-3 py-1 rounded-lg font-bold text-xs uppercase tracking-wider transition cursor-pointer ${
                lang === l
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {l === 'ru' ? 'Русский' : l === 'uk' ? 'Українська' : 'English'}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation Sections Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        {(
          [
            { id: 'pnl', label: tCurrent.tabs.pnl, icon: <FileText className="w-4 h-4" /> },
            { id: 'cashflow', label: tCurrent.tabs.cashflow, icon: <DollarSign className="w-4 h-4" /> },
            { id: 'cashgap', label: tCurrent.tabs.cashgap, icon: <AlertTriangle className="w-4 h-4" /> },
            { id: 'simulator', label: tCurrent.tabs.simulator, icon: <Calculator className="w-4 h-4" /> },
            { id: 'architecture', label: tCurrent.tabs.architecture, icon: <Shield className="w-4 h-4" /> },
          ] as { id: ActiveSection; label: string; icon: React.ReactNode }[]
        ).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold transition cursor-pointer text-xs ${
              activeSection === tab.id
                ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* SECTION 1: P&L (Accrual Method) */}
      {activeSection === 'pnl' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
            <div>
              <span className="text-emerald-400 font-mono text-[11px] font-semibold tracking-wider uppercase">
                {tCurrent.pnl.tagline}
              </span>
              <h3 className="text-lg font-bold text-white mt-1">{tCurrent.pnl.heading}</h3>
            </div>

            {/* Paradox Card */}
            <div className="bg-slate-950 border border-amber-900/60 p-4 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                {tCurrent.pnl.paradox}
              </div>
              <p className="text-slate-300 leading-relaxed text-xs">{tCurrent.pnl.paradoxText}</p>
            </div>

            {/* Structure steps */}
            <div className="space-y-3 pt-2">
              <h4 className="font-bold text-white text-sm">{tCurrent.pnl.structureTitle}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {tCurrent.pnl.steps.map((step, idx) => (
                  <div key={idx} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-emerald-400 font-semibold block text-xs">{step.term}</span>
                    <p className="text-slate-400 text-[11px] leading-relaxed">{step.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Checklist */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5">
              <h4 className="font-bold text-white text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                {tCurrent.pnl.checklistTitle}
              </h4>
              <ul className="space-y-1.5 text-slate-300 text-xs">
                {tCurrent.pnl.checklist.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: Cash Flow (Cash Basis) */}
      {activeSection === 'cashflow' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
            <div>
              <span className="text-emerald-400 font-mono text-[11px] font-semibold tracking-wider uppercase">
                {tCurrent.cashflow.tagline}
              </span>
              <h3 className="text-lg font-bold text-white mt-1">{tCurrent.cashflow.heading}</h3>
            </div>

            <div className="bg-emerald-950/40 border border-emerald-800/80 p-4 rounded-xl text-emerald-200 font-semibold text-xs flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              {tCurrent.cashflow.rule}
            </div>

            {/* Three Streams */}
            <div className="space-y-3 pt-2">
              <h4 className="font-bold text-white text-sm">{tCurrent.cashflow.threeStreamsTitle}</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {tCurrent.cashflow.streams.map((stream, idx) => (
                  <div key={idx} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                    <span className="text-teal-300 font-semibold block text-xs">{stream.title}</span>
                    <p className="text-slate-400 text-[11px] leading-relaxed">{stream.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Prepayment Trap */}
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-rose-300 font-bold text-xs">
                <HelpCircle className="w-4 h-4 text-rose-400" />
                {tCurrent.cashflow.trapTitle}
              </div>
              <p className="text-slate-300 leading-relaxed text-xs">{tCurrent.cashflow.trapText}</p>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: Cash Gap Alerts */}
      {activeSection === 'cashgap' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
            <div>
              <span className="text-amber-400 font-mono text-[11px] font-semibold tracking-wider uppercase">
                Система раннего предупреждения ликвидности
              </span>
              <h3 className="text-lg font-bold text-white mt-1">{tCurrent.cashgap.heading}</h3>
              <p className="text-slate-400 text-xs mt-1">{tCurrent.cashgap.tagline}</p>
            </div>

            {/* Levels */}
            <div className="space-y-3 pt-2">
              <h4 className="font-bold text-white text-sm">{tCurrent.cashgap.warningLevelsTitle}</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {tCurrent.cashgap.levels.map((lvl, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border space-y-2 ${
                      lvl.color === 'rose'
                        ? 'bg-rose-950/30 border-rose-800/80 text-rose-200'
                        : lvl.color === 'amber'
                        ? 'bg-amber-950/30 border-amber-800/80 text-amber-200'
                        : 'bg-emerald-950/30 border-emerald-800/80 text-emerald-200'
                    }`}
                  >
                    <span className="font-bold block text-xs">{lvl.badge}</span>
                    <p className="text-slate-300 text-[11px] leading-relaxed">{lvl.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 5 Actions */}
            <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3">
              <h4 className="font-bold text-white text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                {tCurrent.cashgap.actionTitle}
              </h4>
              <div className="space-y-2">
                {tCurrent.cashgap.actions.map((act, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-slate-300 text-xs">
                    <span className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-emerald-400 flex-shrink-0">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed">{act}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: Interactive Simulator */}
      {activeSection === 'simulator' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-sm">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                {tCurrent.simulator.heading}
              </h3>
              <p className="text-slate-400 text-xs mt-0.5">{tCurrent.simulator.tagline}</p>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-slate-950 p-5 rounded-xl border border-slate-800">
              <div className="space-y-1">
                <label className="text-slate-400 text-[11px] font-medium flex justify-between">
                  <span>Выручка по актам (P&L):</span>
                  <span className="text-emerald-400 font-mono font-bold">{simRevenue.toLocaleString()} ₴</span>
                </label>
                <input
                  type="range"
                  min={100000}
                  max={2000000}
                  step={10000}
                  value={simRevenue}
                  onChange={e => setSimRevenue(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 text-[11px] font-medium flex justify-between">
                  <span>Фактически пришло денег (CF):</span>
                  <span className="text-teal-400 font-mono font-bold">{simCashInflow.toLocaleString()} ₴</span>
                </label>
                <input
                  type="range"
                  min={50000}
                  max={2000000}
                  step={10000}
                  value={simCashInflow}
                  onChange={e => setSimCashInflow(Number(e.target.value))}
                  className="w-full accent-teal-500 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 text-[11px] font-medium flex justify-between">
                  <span>Себестоимость отгрузки (COGS):</span>
                  <span className="text-amber-400 font-mono font-bold">{simCogs.toLocaleString()} ₴</span>
                </label>
                <input
                  type="range"
                  min={50000}
                  max={1000000}
                  step={10000}
                  value={simCogs}
                  onChange={e => setSimCogs(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 text-[11px] font-medium flex justify-between">
                  <span>Оплачено поставщикам (CF):</span>
                  <span className="text-rose-400 font-mono font-bold">{simCashOutflowSuppliers.toLocaleString()} ₴</span>
                </label>
                <input
                  type="range"
                  min={50000}
                  max={1000000}
                  step={10000}
                  value={simCashOutflowSuppliers}
                  onChange={e => setSimCashOutflowSuppliers(Number(e.target.value))}
                  className="w-full accent-rose-500 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 text-[11px] font-medium flex justify-between">
                  <span>OPEX (Аренда, Зарплаты, Налоги):</span>
                  <span className="text-slate-200 font-mono font-bold">{simOpex.toLocaleString()} ₴</span>
                </label>
                <input
                  type="range"
                  min={20000}
                  max={500000}
                  step={5000}
                  value={simOpex}
                  onChange={e => setSimOpex(Number(e.target.value))}
                  className="w-full accent-slate-400 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 text-[11px] font-medium flex justify-between">
                  <span>Начальный остаток на счетах:</span>
                  <span className="text-emerald-300 font-mono font-bold">{simOpeningCash.toLocaleString()} ₴</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={500000}
                  step={5000}
                  value={simOpeningCash}
                  onChange={e => setSimOpeningCash(Number(e.target.value))}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
              </div>
            </div>

            {/* Simulation Results Side-by-Side Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* P&L Column */}
              <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-white text-sm">Отчет P&L (Начисление)</span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                    Экономика
                  </span>
                </div>
                <div className="space-y-2 text-slate-300 text-xs font-mono">
                  <div className="flex justify-between">
                    <span>Выручка:</span>
                    <span className="text-white font-bold">{simRevenue.toLocaleString()} ₴</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>− Себестоимость:</span>
                    <span>−{simCogs.toLocaleString()} ₴</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-800 pt-1 text-slate-200">
                    <span>= Валовая прибыль:</span>
                    <span>{simGrossProfit.toLocaleString()} ₴</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>− Постоянные OPEX:</span>
                    <span>−{simOpex.toLocaleString()} ₴</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-800 pt-2 text-sm font-bold">
                    <span className="text-white">= ЧИСТАЯ ПРИБЫЛЬ:</span>
                    <span className={simNetProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      {simNetProfit.toLocaleString()} ₴
                    </span>
                  </div>
                </div>
              </div>

              {/* Cash Flow Column */}
              <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-white text-sm">Отчет Cash Flow (Деньги)</span>
                  <span className="text-[10px] font-mono text-teal-400 bg-teal-950/80 px-2 py-0.5 rounded border border-teal-800">
                    Ликвидность
                  </span>
                </div>
                <div className="space-y-2 text-slate-300 text-xs font-mono">
                  <div className="flex justify-between">
                    <span>Начальный остаток:</span>
                    <span className="text-slate-300">{simOpeningCash.toLocaleString()} ₴</span>
                  </div>
                  <div className="flex justify-between text-teal-300">
                    <span>+ Поступления от клиентов:</span>
                    <span>+{simCashInflow.toLocaleString()} ₴</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>− Оплата поставщикам:</span>
                    <span>−{simCashOutflowSuppliers.toLocaleString()} ₴</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>− Выплаты OPEX (ФОТ, налоги):</span>
                    <span>−{simOpex.toLocaleString()} ₴</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-800 pt-1 text-slate-200">
                    <span>= Чистый денежный поток:</span>
                    <span className={simNetCashFlow >= 0 ? 'text-teal-400 font-bold' : 'text-rose-400 font-bold'}>
                      {simNetCashFlow.toLocaleString()} ₴
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-slate-800 pt-2 text-sm font-bold">
                    <span className="text-white">= ОСТАТОК НА СЧЕТЕ:</span>
                    <span className={simClosingCash >= 0 ? 'text-emerald-400' : 'text-rose-500 font-extrabold animate-pulse'}>
                      {simClosingCash.toLocaleString()} ₴
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Verdict Box */}
            <div
              className={`p-4 rounded-xl border ${
                simClosingCash < 0
                  ? 'bg-rose-950/40 border-rose-800 text-rose-200'
                  : 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm">
                {simClosingCash < 0 ? (
                  <>
                    <AlertTriangle className="w-5 h-5 text-rose-400" />
                    ОБНАРУЖЕН КАССОВЫЙ РАЗРЫВ: Денег не хватает на выплату обязательств ({simClosingCash.toLocaleString()} ₴)!
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    Баланс ликвидности положительный: запас денег составляет {simClosingCash.toLocaleString()} ₴.
                  </>
                )}
              </div>
              <p className="text-xs opacity-90 mt-1">
                Разница между прибылью и деньгами:{' '}
                <strong>{Math.abs(simDiscrepancy).toLocaleString()} ₴</strong> заморожено в неоплаченной дебиторке покупателей или переплатах поставщикам.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: Architecture */}
      {activeSection === 'architecture' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
            <div>
              <span className="text-teal-400 font-mono text-[11px] font-semibold tracking-wider uppercase">
                Инфраструктурный слой
              </span>
              <h3 className="text-lg font-bold text-white mt-1">{tCurrent.architecture.heading}</h3>
            </div>

            <div className="space-y-3">
              {tCurrent.architecture.points.map((pt, idx) => (
                <div key={idx} className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-300 leading-relaxed text-xs">{pt}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
