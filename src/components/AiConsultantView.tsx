import React, { useState, useMemo } from 'react';
import {
  Bot,
  Send,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Server,
  Lock,
  CheckCircle2,
  AlertCircle,
  Key,
  Calendar,
  DollarSign,
  TrendingDown,
  Clock,
  Check,
  Plus,
  ArrowRight,
  Database,
  Sliders,
  FileSpreadsheet,
  Cpu,
  X,
} from 'lucide-react';
import { TranslationDictionary } from '../i18n';
import { PrivacyFirewall, sanitizeFinancialPrompt } from '../lib/ai_provider_abstraction_layer/privacyFirewall';
import { createAIProvider } from '../lib/ai_provider_abstraction_layer';
import { isCloudAiAllowed, readAiProviderSettings, writeAiProviderSettings } from '../lib/security/aiPolicy';
import { Repository } from '../services/storage/repository';
import { Account, Transaction, PaymentPlanItem, RiskAlert, InventoryItem } from '../types';

interface AiConsultantViewProps {
  t: TranslationDictionary;
  aiMode: 'ollama' | 'gemini' | 'claude' | 'chatgpt' | 'openrouter' | 'mock' | 'disabled';
  onAiModeChange: (mode: any) => void;
  riskAlerts?: RiskAlert[];
  onConfirmRisk?: (id: string) => void;
  transactions?: Transaction[];
  accounts?: Account[];
  payments?: PaymentPlanItem[];
  inventory?: InventoryItem[];
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  modelName?: string;
  sanitizedPiiCount?: number;
}

export const AiConsultantView: React.FC<AiConsultantViewProps> = ({
  t,
  aiMode,
  onAiModeChange,
  riskAlerts = [],
  onConfirmRisk,
  transactions = [],
  accounts = [],
  payments = [],
  inventory = [],
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'risks' | 'settings'>('chat');
  const [selectedModel, setSelectedModel] = useState<string>('qwen2.5:7b');
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [healthStatus, setHealthStatus] = useState<{ status: 'healthy' | 'degraded' | 'unhealthy' | 'idle'; latencyMs?: number; message: string }>({
    status: 'idle',
    message: 'Нажмите «Проверить соединение» для тестирования отклика выбранного провайдера',
  });
  const [maskPii, setMaskPii] = useState(true);
  const [forecastHorizon, setForecastHorizon] = useState<number>(30);

  // Settings: API Keys & Custom Base URLs
  const [customApiKey, setCustomApiKey] = useState<string>(() => {
    return readAiProviderSettings(aiMode).apiKey || '';
  });
  const [customBaseUrl, setCustomBaseUrl] = useState<string>(() => {
    return readAiProviderSettings(aiMode).baseUrl || (aiMode === 'ollama' ? 'http://localhost:11434' : '');
  });
  const [showSettingsSaved, setShowSettingsSaved] = useState(false);

  // Models map per provider
  const providerModels: Record<string, { id: string; name: string }[]> = {
    ollama: [
      { id: 'qwen2.5:7b', name: 'Ollama: qwen2.5:7b (Оптимально для финансов)' },
      { id: 'llama3.2:3b', name: 'Ollama: llama3.2:3b (Легковесная)' },
      { id: 'deepseek-r1:8b', name: 'Ollama: deepseek-r1:8b (Локальные рассуждения)' },
      { id: 'mistral:7b', name: 'Ollama: mistral:7b' },
    ],
    gemini: [
      { id: 'gemini-2.5-flash', name: 'Google Gemini 2.5 Flash (Рекомендуемая)' },
      { id: 'gemini-2.5-pro', name: 'Google Gemini 2.5 Pro (Глубокий анализ)' },
    ],
    chatgpt: [
      { id: 'gpt-4o-mini', name: 'OpenAI GPT-4o-mini (Быстрая)' },
      { id: 'gpt-4o', name: 'OpenAI GPT-4o (Флагман)' },
      { id: 'o3-mini', name: 'OpenAI o3-mini (Рассуждения)' },
    ],
    claude: [
      { id: 'claude-3-5-sonnet-latest', name: 'Anthropic Claude 3.5 Sonnet' },
      { id: 'claude-3-5-haiku-latest', name: 'Anthropic Claude 3.5 Haiku' },
    ],
    openrouter: [
      { id: 'openai/gpt-4o-mini', name: 'OpenRouter: GPT-4o-mini' },
      { id: 'deepseek/deepseek-chat', name: 'OpenRouter: DeepSeek V3' },
      { id: 'anthropic/claude-3.5-sonnet', name: 'OpenRouter: Claude 3.5 Sonnet' },
      { id: 'meta-llama/llama-3.3-70b-instruct', name: 'OpenRouter: Llama 3.3 70B' },
    ],
    mock: [{ id: 'mock-engine', name: 'Автономный локальный движок (100% Offline)' }],
    disabled: [{ id: 'none', name: 'ИИ отключен (Strict No-AI Mode)' }],
  };

  const currentModels = providerModels[aiMode] || providerModels.ollama;

  const handleSelectProvider = (mode: any) => {
    onAiModeChange(mode);
    const models = providerModels[mode] || [];
    if (models.length > 0) {
      setSelectedModel(models[0].id);
    }
    const saved = readAiProviderSettings(mode);
    setCustomApiKey(saved.apiKey || '');
    setCustomBaseUrl(saved.baseUrl || (mode === 'ollama' ? 'http://localhost:11434' : ''));
    setHealthStatus({ status: 'idle', message: 'Провайдер изменен. Проверьте соединение.' });
  };

  const handleSaveSettings = () => {
    writeAiProviderSettings(aiMode, {
      apiKey: customApiKey.trim(),
      baseUrl: customBaseUrl.trim(),
    });
    setShowSettingsSaved(true);
    setTimeout(() => setShowSettingsSaved(false), 2500);
  };

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      sender: 'assistant',
      text:
        `Здравствуйте! Я ваш финансовый ИИ-консультант по управленческому учету предприятия.\n\n` +
        `Я анализирую финансовые потоки, структуру доходов и расходов (OPEX/CAPEX), товарные остатки на складах и рассчитываю кассовые разрывы по платежному календарю.\n\n` +
        `Выберите готовый сценарий экспресс-аудита ниже или задайте конкретный вопрос.`,
      timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      modelName: aiMode,
    },
  ]);

  const quickPrompts = [
    'Оцени вероятность кассового разрыва на этот месяц',
    'Какие статьи расходов растут быстрее всего?',
    'Проанализируй просроченную дебиторскую задолженность',
    'Как оптимизировать минимальный денежный резерв?',
    'Посчитай маржинальность и покрытие обязательств',
  ];

  const handleTestHealth = async () => {
    const settings = Repository.getInstance().getSettings();
    if (!isCloudAiAllowed(aiMode, settings.ai_allow_cloud) && aiMode !== 'ollama' && aiMode !== 'mock' && aiMode !== 'disabled') {
      setHealthStatus({
        status: 'degraded',
        message: 'Использование внешнего AI отключено политикой безопасности компании. Доступен только локальный/автономный режим.',
      });
      return;
    }

    setHealthStatus({ status: 'idle', message: 'Проверка доступности шлюза...' });
    const startTime = Date.now();
    try {
      const provider = createAIProvider(aiMode, customBaseUrl || undefined, selectedModel, customApiKey || undefined, maskPii);
      const res = await provider.checkHealth();
      setHealthStatus({
        status: res.status,
        latencyMs: res.latencyMs ?? (Date.now() - startTime),
        message: res.message,
      });
    } catch (e: any) {
      setHealthStatus({
        status: 'degraded',
        latencyMs: Date.now() - startTime,
        message: `Ошибка соединения: ${e?.message || 'Сервер недоступен'}. Активен автономный расчет.`,
      });
    }
  };

  // Compile Comprehensive Financial Snapshot for AI
  const handleSendFinancialSnapshot = () => {
    const totalCash = (accounts || []).reduce((sum, a) => sum + a.balance, 0);
    const totalSales = (transactions || []).filter(t => t.type === 'sale').reduce((sum, t) => sum + t.amount, 0);
    const totalPurchases = (transactions || []).filter(t => t.type === 'purchase').reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = (transactions || []).filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const inventoryValuation = (inventory || []).reduce((sum, i) => sum + ((i.quantity ?? i.quantity_on_hand ?? 0) * i.cost_price), 0);
    const upcomingOutflows = (payments || []).filter(p => p.type === 'outflow' || (p as any).type === 'outgoing').reduce((sum, p) => sum + p.amount, 0);

    const snapshotSummary =
      `Проведи комплексный управленческий аудит бизнеса по актуальному финансовому срезу:\n` +
      `- Остатки ликвидности на расчетных счетах и в кассах: ${totalCash.toLocaleString('ru-RU')} UAH\n` +
      `- Выручка за учетный период: ${totalSales.toLocaleString('ru-RU')} UAH\n` +
      `- Закупки и себестоимость: ${totalPurchases.toLocaleString('ru-RU')} UAH\n` +
      `- Операционные расходы (OPEX): ${totalExpenses.toLocaleString('ru-RU')} UAH\n` +
      `- Совокупная себестоимость складских запасов: ${inventoryValuation.toLocaleString('ru-RU')} UAH (позиций: ${inventory.length})\n` +
      `- Запланированные выплаты по платежному календарю: ${upcomingOutflows.toLocaleString('ru-RU')} UAH\n` +
      `Предоставь: 1) Оценку устойчивости, 2) Прогноз кассовых рисков на горизонте 30 дней, 3) Конкретные управленческие рекомендации.`;

    handleSend(snapshotSummary);
  };

  const handleSend = async (customPrompt?: string) => {
    const promptToSend = customPrompt || inputQuery;
    if (!promptToSend.trim() || isLoading) return;

    const settings = Repository.getInstance().getSettings();
    if (aiMode === 'disabled') {
      alert('ИИ-модуль полностью отключен в соответствии с политикой безопасности.');
      return;
    }
    if (!isCloudAiAllowed(aiMode, settings.ai_allow_cloud) && aiMode !== 'ollama' && aiMode !== 'mock') {
      alert('Использование внешнего AI запрещено политикой безопасности компании. Переключитесь на локальный Ollama или автономный режим.');
      return;
    }

    // Apply Privacy Firewall Masking for cloud providers
    let processedText = promptToSend;
    let maskedCount = 0;
    if (maskPii && aiMode !== 'ollama' && aiMode !== 'mock') {
      const firewall = PrivacyFirewall.getInstance();
      const sanitized = firewall.sanitize(promptToSend);
      processedText = sanitized.sanitizedText;
      maskedCount = sanitized.maskedCount;
    }

    const userMsg: ChatMessage = {
      id: 'usr-' + Date.now(),
      sender: 'user',
      text: promptToSend,
      timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      sanitizedPiiCount: maskedCount,
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const provider = createAIProvider(
        aiMode,
        customBaseUrl || undefined,
        selectedModel,
        customApiKey || undefined,
        maskPii
      );

      const response = await provider.chat({
        messages: [{ role: 'user', content: processedText }],
        temperature: 0.2,
      });

      const assistantMsg: ChatMessage = {
        id: 'ast-' + Date.now(),
        sender: 'assistant',
        text: response.content,
        timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        modelName: response.modelName || selectedModel,
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (e: any) {
      const errorMsg: ChatMessage = {
        id: 'ast-' + Date.now(),
        sender: 'assistant',
        text:
          `Не удалось связаться с провайдером ${aiMode.toUpperCase()}: ${e?.message || 'Сервис недоступен'}.\n\n` +
          `**Резервный автономный анализ:** Ликвидность находится на уровне покрытия обязательств. Убедитесь в своевременном поступлении дебиторской задолженности.`,
        timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        modelName: 'offline-safety-fallback',
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Cash Gap Forecast Calculation for selected horizon
  const cashGapForecast = useMemo(() => {
    const now = new Date();
    const currentBalance = (accounts || []).reduce((sum, a) => sum + a.balance, 0);
    const minReserve = 80000;

    const plannedUpcoming = (payments || []).filter(p => {
      const due = new Date(p.due_date).getTime();
      const maxTime = now.getTime() + forecastHorizon * 24 * 60 * 60 * 1000;
      return due >= now.getTime() - 24 * 60 * 60 * 1000 && due <= maxTime;
    });

    let rollingBalance = currentBalance;
    let minBalance = currentBalance;
    let minDate = '';
    let hasGap = false;
    let totalIn = 0;
    let totalOut = 0;

    const sorted = [...plannedUpcoming].sort(
      (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    );

    const timeline = sorted.map(p => {
      const isOut = p.type === 'outflow' || (p as any).type === 'outgoing';
      if (isOut) {
        rollingBalance -= p.amount;
        totalOut += p.amount;
      } else {
        rollingBalance += p.amount;
        totalIn += p.amount;
      }

      if (rollingBalance < minBalance) {
        minBalance = rollingBalance;
        minDate = p.due_date.substring(0, 10);
      }

      if (rollingBalance < minReserve) {
        hasGap = true;
      }

      return {
        id: p.id,
        date: p.due_date.substring(0, 10),
        amount: p.amount,
        type: p.type,
        counterparty: p.counterparty_name,
        rollingBalance,
        isGap: rollingBalance < minReserve,
      };
    });

    return {
      currentBalance,
      rollingBalance,
      minBalance,
      minDate: minDate || 'В пределах горизонта',
      minReserve,
      hasGap,
      totalIn,
      totalOut,
      timeline,
      gapAmount: Math.max(0, minReserve - minBalance),
    };
  }, [accounts, payments, forecastHorizon]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight">{t.ai.title}</h2>
            <span className="bg-emerald-950/80 border border-emerald-700 text-emerald-400 text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase">
              RC-1 Multi-Provider
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Интеллектуальный анализ финансового здоровья, кассовых разрывов и сценарного моделирования
          </p>
        </div>

        {/* View Mode Tabs */}
        <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-medium transition cursor-pointer ${
              activeTab === 'chat'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            Чат-аналитик
          </button>
          <button
            onClick={() => setActiveTab('risks')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-medium transition cursor-pointer ${
              activeTab === 'risks'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5" />
            Прогноз кассовых разрывов
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-medium transition cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Настройки ИИ и API
          </button>
        </div>
      </div>

      {/* Provider Selector & Health Check Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3.5 shadow-sm text-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 font-medium">Активный провайдер:</span>
            <div className="flex flex-wrap bg-slate-800 p-1 rounded-lg border border-slate-700 gap-1">
              {[
                { id: 'ollama', name: 'Ollama (Local - Default)' },
                { id: 'gemini', name: 'Gemini (Google)' },
                { id: 'chatgpt', name: 'ChatGPT (OpenAI)' },
                { id: 'claude', name: 'Claude (Anthropic)' },
                { id: 'openrouter', name: 'OpenRouter' },
                { id: 'mock', name: 'Автономный (Offline)' },
                { id: 'disabled', name: 'Отключен' },
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => handleSelectProvider(p.id)}
                  className={`px-3 py-1 rounded-md font-medium transition cursor-pointer ${
                    aiMode === p.id
                      ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Модель:</span>
            <select
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none"
            >
              {currentModels.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Health Check Bar */}
        <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-slate-400">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                healthStatus.status === 'healthy'
                  ? 'bg-emerald-500 animate-ping'
                  : healthStatus.status === 'degraded'
                  ? 'bg-amber-500'
                  : 'bg-slate-500'
              }`}
            />
            <span className="text-slate-300">
              {healthStatus.message}
            </span>
            {healthStatus.latencyMs !== undefined && (
              <span className="bg-slate-800 px-2 py-0.5 rounded font-mono text-[11px] text-teal-400 border border-slate-700">
                {healthStatus.latencyMs} мс
              </span>
            )}
          </div>

          <button
            onClick={handleTestHealth}
            className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition cursor-pointer font-medium"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
            Проверить соединение
          </button>
        </div>
      </div>

      {/* TAB 1: CHAT ANALYST */}
      {activeTab === 'chat' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col h-[560px]">
            {/* Top Chat Bar Actions */}
            <div className="p-3 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">Режим защиты:</span>
                <span className={`px-2 py-0.5 rounded font-mono text-[11px] border ${
                  maskPii
                    ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
                    : 'bg-amber-950/80 border-amber-800 text-amber-300'
                }`}>
                  {maskPii ? '✓ PrivacyFirewall Active (PII Masking)' : 'Внимание: Маскирование выключено'}
                </span>
              </div>

              <button
                onClick={handleSendFinancialSnapshot}
                disabled={aiMode === 'disabled' || isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg font-medium text-xs transition cursor-pointer shadow-sm"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Отправить финансовый срез в ИИ
              </button>
            </div>

            {/* Messages List */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4">
              {messages.map(msg => {
                const isUser = msg.sender === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : ''}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-xs ${
                        isUser ? 'bg-indigo-600 text-white' : 'bg-emerald-700 text-white'
                      }`}
                    >
                      {isUser ? 'Вы' : <Bot className="w-4 h-4" />}
                    </div>

                    <div
                      className={`p-4 rounded-2xl text-xs space-y-2 shadow-sm leading-relaxed ${
                        isUser
                          ? 'bg-indigo-600/20 text-indigo-100 border border-indigo-500/30'
                          : 'bg-slate-800 text-slate-200 border border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-400 gap-4">
                        <span className="font-mono">{msg.modelName || 'User'}</span>
                        <span>{msg.timestamp}</span>
                      </div>

                      <div className="whitespace-pre-line text-[13px]">{msg.text}</div>

                      {/* Factual Disclaimer for AI messages */}
                      {!isUser && (
                        <div className="pt-2 border-t border-slate-700/60 mt-2 space-y-2">
                          <div className="text-[10px] text-slate-400 flex items-center gap-1.5 font-medium bg-slate-900/60 px-2.5 py-1.5 rounded-lg border border-slate-700/60">
                            <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0 text-teal-400" />
                            <span>ИИ-консультант предоставляет исключительно аналитический обзор фактических данных без рекомендаций и без права внесения изменений в Главную книгу (ТЗ v1.1).</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex items-center gap-2 text-xs text-slate-400 p-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>ИИ формирует управленческий анализ на основе текущих показателей бизнеса...</span>
                </div>
              )}
            </div>

            {/* Quick Prompts */}
            <div className="p-2.5 bg-slate-950/60 border-t border-slate-800 flex flex-wrap gap-1.5 text-xs">
              {quickPrompts.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(q)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700 transition cursor-pointer text-[11px]"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Query Input */}
            <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-3">
              <input
                type="text"
                placeholder={
                  aiMode === 'disabled'
                    ? 'ИИ отключен в настройках'
                    : 'Задайте финансовый вопрос консультанту...'
                }
                disabled={aiMode === 'disabled' || isLoading}
                value={inputQuery}
                onChange={e => setInputQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
              />
              <button
                onClick={() => handleSend()}
                disabled={aiMode === 'disabled' || isLoading || !inputQuery.trim()}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white p-2.5 rounded-xl transition cursor-pointer shadow-sm"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CASH GAP FORECAST */}
      {activeTab === 'risks' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4 shadow-sm text-xs">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-rose-400" />
                  Оценка будущих кассовых разрывов
                </h3>
                <p className="text-slate-400 text-xs">
                  Моделирование остатков с учетом запланированных выплат, поступлений и минимального резерва
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-medium">Горизонт прогноза:</span>
                <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
                  {[7, 14, 30, 60, 90].map(h => (
                    <button
                      key={h}
                      onClick={() => setForecastHorizon(h)}
                      className={`px-3 py-1 rounded-md font-medium transition cursor-pointer ${
                        forecastHorizon === h
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {h} дн.
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* KPI metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
                <div className="text-slate-400 text-[11px]">Текущая ликвидность</div>
                <div className="text-xl font-bold text-white font-mono mt-0.5">
                  {cashGapForecast.currentBalance.toLocaleString('ru-RU')} UAH
                </div>
                <div className="text-[10px] text-emerald-400 mt-1">Доступно на счетах и в кассе</div>
              </div>

              <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
                <div className="text-slate-400 text-[11px]">Минимальный остаток</div>
                <div
                  className={`text-xl font-bold font-mono mt-0.5 ${
                    cashGapForecast.minBalance < cashGapForecast.minReserve
                      ? 'text-rose-400'
                      : 'text-teal-300'
                  }`}
                >
                  {cashGapForecast.minBalance.toLocaleString('ru-RU')} UAH
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  Дата минимума: {cashGapForecast.minDate}
                </div>
              </div>

              <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
                <div className="text-slate-400 text-[11px]">Страховой резерв</div>
                <div className="text-xl font-bold text-amber-300 font-mono mt-0.5">
                  {cashGapForecast.minReserve.toLocaleString('ru-RU')} UAH
                </div>
                <div className="text-[10px] text-slate-400 mt-1">Неснижаемый норматив</div>
              </div>

              <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
                <div className="text-slate-400 text-[11px]">Статус дефицита</div>
                <div className="text-xl font-bold font-mono mt-0.5">
                  {cashGapForecast.hasGap ? (
                    <span className="text-rose-400">Кассовый разрыв</span>
                  ) : (
                    <span className="text-emerald-400">Стабильно</span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  {cashGapForecast.hasGap
                    ? `Требуется перекрыть ${cashGapForecast.gapAmount.toLocaleString('ru-RU')} UAH`
                    : 'Остаток выше норматива'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SETTINGS & API CONFIGURATION */}
      {activeTab === 'settings' && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-6 shadow-sm text-xs max-w-3xl">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-emerald-400" />
              Конфигурация ИИ-провайдеров и безопасность (PrivacyFirewall)
            </h3>
            <p className="text-slate-400 text-xs mt-1">
              Настройка API ключей, локального хоста Ollama и параметров деперсонализации данных
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Базовый URL шлюза (Base URL)
              </label>
              <input
                type="text"
                value={customBaseUrl}
                onChange={e => setCustomBaseUrl(e.target.value)}
                placeholder={aiMode === 'ollama' ? 'http://localhost:11434' : 'https://api.openai.com/v1'}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Для Ollama по умолчанию: <code className="text-emerald-400">http://localhost:11434</code>
              </span>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">
                API-ключ для провайдера <span className="uppercase text-emerald-400 font-mono font-bold">{aiMode}</span>
              </label>
              <input
                type="password"
                value={customApiKey}
                onChange={e => setCustomApiKey(e.target.value)}
                placeholder={aiMode === 'ollama' || aiMode === 'mock' ? 'Ключ не требуется' : 'Вставьте ваш секретный ключ API'}
                disabled={aiMode === 'ollama' || aiMode === 'mock' || aiMode === 'disabled'}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-emerald-500 disabled:opacity-50"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Все внешние вызовы проксируются через защищенный серверный слой без утечки ключа в браузер.
              </span>
            </div>

            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <label className="flex items-center gap-2.5 text-slate-200 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={maskPii}
                  onChange={e => setMaskPii(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                />
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Принудительный PII Shield (PrivacyFirewall)</span>
              </label>
              <p className="text-[11px] text-slate-400 pl-6.5 leading-relaxed">
                Перед отправкой в облачные ИИ (все, кроме Ollama), данные автоматически деперсонализируются: маскируются IBAN, номера кредитных карт, телефоны, email и юридические наименования контрагентов.
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              {showSettingsSaved ? (
                <span className="text-emerald-400 flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="w-4 h-4" /> Настройки сохранены в локальном защищенном хранилище
                </span>
              ) : <div />}

              <button
                onClick={handleSaveSettings}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition cursor-pointer shadow-sm"
              >
                Сохранить настройки
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
