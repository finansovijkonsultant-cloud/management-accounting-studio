import React, { useEffect, useState, useCallback } from 'react';
import { Repository } from './services/storage/repository';
import { BackupService, EncryptedBackupPayload } from './services/storage/backupService';
import {
  Account,
  AuditLogEntry,
  Currency,
  InventoryItem,
  PaymentPlanItem,
  RegisteredDevice,
  RiskAlert,
  Role,
  Transaction,
  UserProfile,
  ApprovalRequest,
} from './types';
import { getTranslation, SupportedLocale, I18nProvider } from './i18n';
import { Header } from './components/Header';
import { Sidebar, NavigationTab } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { MoneyView } from './components/MoneyView';
import { TransactionsView } from './components/TransactionsView';
import { CalendarView } from './components/CalendarView';
import { InventoryView } from './components/InventoryView';
import { ProfitAndLossView } from './components/ProfitAndLossView';
import { CashFlowView } from './components/CashFlowView';
import { BalanceSheetView } from './components/BalanceSheetView';
import { PlanFactView } from './components/PlanFactView';
import { AiConsultantView } from './components/AiConsultantView';
import { ImportExportView } from './components/ImportExportView';
import { DevicePairingView } from './components/DevicePairingView';
import { SecurityAuditView } from './components/SecurityAuditView';
import { SettingsView } from './components/SettingsView';
import { LoginScreen } from './components/LoginScreen';
import { DocsView } from './components/DocsView';
import { ApprovalWorkflowModal } from './components/ApprovalWorkflowModal';
import { ParsedStatementTransaction } from './services/banking';
import { getRuntimeFeatureFlags } from './lib/config/featureFlags';

export default function App() {
  const repo = Repository.getInstance();

  // Core App State & Authentication
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => repo.getCurrentUser());
  const [activeCompanyId, setActiveCompanyId] = useState<string>(() => repo.getActiveCompanyId());
  const [isLocked, setIsLocked] = useState<boolean>(() => !repo.getCurrentUser());
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [locale, setLocale] = useState<SupportedLocale>(() => {
    try {
      const saved = localStorage.getItem('app_locale') as SupportedLocale;
      if (saved === 'ru' || saved === 'uk' || saved === 'en') return saved;
    } catch {}
    return 'ru';
  });
  const [currency, setCurrency] = useState<Currency>('UAH');
  const [aiMode, setAiMode] = useState<'ollama' | 'gemini' | 'claude' | 'chatgpt' | 'openrouter' | 'mock' | 'disabled'>('gemini');
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  // Repository Data State (filtered by activeCompanyId)
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [payments, setPayments] = useState<PaymentPlanItem[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [riskAlerts, setRiskAlerts] = useState<RiskAlert[]>([]);
  const [devices, setDevices] = useState<RegisteredDevice[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [approvalRequests, setApprovalRequests] = useState<ApprovalRequest[]>([]);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState<boolean>(false);

  const t = getTranslation(locale);
  const featureFlags = getRuntimeFeatureFlags();

  // Load state scoped by activeCompanyId
  const refreshData = useCallback(() => {
    const compId = repo.getActiveCompanyId();
    const comp = repo.getCompany(compId);
    if (comp) {
      setCurrency(comp.currency);
    }
    setAccounts([...repo.getAccounts(compId)]);
    setTransactions([...repo.getTransactions(compId)]);
    setPayments([...repo.getPaymentPlans(compId)]);
    setInventory([...repo.getInventory(compId)]);
    setRiskAlerts([...repo.getRiskAlerts(compId)]);
    setDevices([...repo.getDevices(compId)]);
    setAuditLogs([...repo.getAuditLogs(compId)]);
    setApprovalRequests([...repo.getApprovalRequests(compId)]);
  }, [repo]);

  useEffect(() => {
    refreshData();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refreshData, activeCompanyId]);

  // Company change handler with strict cache invalidation & isolation
  const handleCompanyChange = (companyId: string) => {
    // 1. Force flush current memory cache state to completely prevent cross-company data leakage
    setAccounts([]);
    setTransactions([]);
    setPayments([]);
    setInventory([]);
    setRiskAlerts([]);
    setDevices([]);
    setAuditLogs([]);
    setApprovalRequests([]);

    // 2. Set active company ID in persistent repository and local state
    repo.setActiveCompanyId(companyId);
    setActiveCompanyId(companyId);

    // 3. Immediately reload clean scoped dataset for target business_id
    const comp = repo.getCompany(companyId);
    if (comp) {
      setCurrency(comp.currency);
    }
    setAccounts([...repo.getAccounts(companyId)]);
    setTransactions([...repo.getTransactions(companyId)]);
    setPayments([...repo.getPaymentPlans(companyId)]);
    setInventory([...repo.getInventory(companyId)]);
    setRiskAlerts([...repo.getRiskAlerts(companyId)]);
    setDevices([...repo.getDevices(companyId)]);
    setAuditLogs([...repo.getAuditLogs(companyId)]);
  };

  // Locale change handler with persistence and data refresh
  const handleLocaleChange = useCallback((newLocale: SupportedLocale) => {
    setLocale(newLocale);
    try {
      localStorage.setItem('app_locale', newLocale);
    } catch {}
    refreshData();
  }, [refreshData]);

  // Login handler
  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    setIsLocked(false);
    refreshData();
  };

  // Lock App
  const handleLockApp = () => {
    setIsLocked(true);
  };

  // Total balance computation across accounts for active company
  const totalBalance = (accounts || []).reduce((acc, a) => acc + a.balance, 0);

  // Transactions Handlers with Multi-business tagging & Collective Approval Workflow
  const handleSaveTransaction = (tx: Transaction) => {
    const scopedTx: Transaction = {
      ...tx,
      business_id: tx.business_id || activeCompanyId,
    };
    const res = repo.saveTransaction(scopedTx);
    if (!res.success) {
      // If direct update is blocked by collective approval requirement, create approval request
      if (res.error?.includes('DIRECT_UPDATE_BLOCKED')) {
        const reason = window.prompt(
          'Изменение существующей проводки требует 100% согласия всех участников компании (ТЗ v1.1).\nУкажите обоснование изменения:'
        );
        if (reason && reason.trim()) {
          repo.createApprovalRequest({
            entity_type: 'transaction',
            entity_id: tx.id,
            action_type: 'update_transaction',
            reason: reason.trim(),
            proposed_payload: scopedTx,
          });
          alert('Запрос на изменение проводки создан и ожидает голосования всех участников.');
        }
      } else {
        alert(res.error || 'Ошибка сохранения операции');
      }
    }
    refreshData();
  };

  const handleDeleteTransaction = (id: string) => {
    if (!currentUser) return;
    const allUsers = repo.getUsers();
    if (allUsers.length > 1) {
      const reason = window.prompt(
        `Удаление проводки #${id} требует 100% согласия всех зарегистрированных участников компании (ТЗ v1.1).\nУкажите причину удаления:`
      );
      if (reason && reason.trim()) {
        const res = repo.createApprovalRequest({
          entity_type: 'transaction',
          entity_id: id,
          action_type: 'delete_transaction',
          reason: reason.trim(),
        });
        if (res.success) {
          alert('Запрос на удаление проводки успешно создан. Операция будет удалена только после одобрения всеми участниками.');
          refreshData();
        } else {
          alert(`Ошибка: ${res.error}`);
        }
      }
      return;
    }

    try {
      repo.deleteTransaction(id, currentUser.role);
      refreshData();
    } catch (err: any) {
      alert(err.message || 'Ошибка удаления.');
    }
  };

  const handleApproveTransaction = (id: string) => {
    const target = transactions.find(t => t.id === id);
    if (target) {
      repo.saveTransaction({
        ...target,
        status: 'confirmed',
        approved_by: currentUser ? `${currentUser.name} (${currentUser.role})` : 'Владелец',
      });
      refreshData();
    }
  };

  // Planned Payments Handlers with Collective Approval
  const handleSavePayment = (plan: PaymentPlanItem) => {
    const scopedPlan: PaymentPlanItem = {
      ...plan,
      business_id: plan.business_id || activeCompanyId,
    };
    try {
      repo.savePaymentPlan(scopedPlan);
      refreshData();
    } catch (err: any) {
      if (err?.message?.includes('DIRECT_UPDATE_BLOCKED')) {
        const reason = window.prompt(
          'Изменение планового платежа требует согласия всех участников (ТЗ v1.1).\nУкажите обоснование:'
        );
        if (reason && reason.trim()) {
          repo.createApprovalRequest({
            entity_type: 'payment_plan',
            entity_id: plan.id,
            action_type: 'update_payment_plan',
            reason: reason.trim(),
            proposed_payload: scopedPlan,
          });
          alert('Запрос на изменение платежа передан на согласование.');
          refreshData();
        }
      } else {
        alert(err?.message || 'Ошибка сохранения платежа');
      }
    }
  };

  const handleDeletePayment = (id: string) => {
    if (!currentUser) return;
    const allUsers = repo.getUsers();
    if (allUsers.length > 1) {
      const reason = window.prompt(
        `Удаление планового платежа #${id} требует согласия всех участников компании (ТЗ v1.1).\nУкажите причину удаления:`
      );
      if (reason && reason.trim()) {
        const res = repo.createApprovalRequest({
          entity_type: 'payment_plan',
          entity_id: id,
          action_type: 'delete_payment_plan',
          reason: reason.trim(),
        });
        if (res.success) {
          alert('Запрос на удаление платежа создан и ожидает единогласного решения всех участников.');
          refreshData();
        } else {
          alert(`Ошибка: ${res.error}`);
        }
      }
      return;
    }

    try {
      repo.deletePaymentPlan(id, currentUser.role);
      refreshData();
    } catch (err: any) {
      alert(err.message || 'Ошибка удаления.');
    }
  };

  // Approval Engine Vote Handler
  const handleCastApprovalVote = (requestId: string, decision: 'approve' | 'reject', comment?: string) => {
    const result = repo.castApprovalVote(requestId, decision, comment);
    alert(result.message);
    refreshData();
  };

  const handleExecutePayment = (planId: string) => {
    const plan = payments.find(p => p.id === planId);
    if (!plan) return;

    // Convert planned payment into real confirmed transaction
    const newTx: Transaction = {
      id: 'tx-exec-' + Date.now(),
      business_id: activeCompanyId,
      date: new Date().toISOString().substring(0, 10),
      time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      type: plan.type === 'inflow' ? 'payment_receipt' : 'expense',
      status: 'confirmed',
      account_id: plan.account_id,
      amount: plan.amount,
      currency: plan.currency,
      category_id: plan.category_id,
      counterparty_id: plan.counterparty_id,
      description: `Исполнение по платежному календарю: ${plan.notes || ''}`,
      responsible_person: plan.responsible_person || (currentUser ? currentUser.name : 'Владелец'),
      idempotency_key: 'idemp-exec-' + planId + '-' + Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      source: 'manual',
      sync_status: 'synced',
      version: 1,
      owner_id: currentUser?.id || 'usr-owner-1',
    };

    repo.saveTransaction(newTx);
    repo.savePaymentPlan({ ...plan, status: 'completed' });
    refreshData();
  };

  // Inventory Handlers
  const handleSaveInventory = (item: InventoryItem) => {
    repo.saveInventoryItem(item);
    refreshData();
  };

  const handleRecordStockMovement = (movement: any) => {
    repo.recordStockMovement(movement);
    refreshData();
  };

  // Money & Account Handlers
  const handleAddAccount = (account: Account) => {
    const scopedAccount: Account = {
      ...account,
      business_id: account.business_id || activeCompanyId,
    };
    repo.saveAccount(scopedAccount);
    refreshData();
  };

  const handleTransferMoney = (
    sourceAccountId: string,
    targetAccountId: string,
    amount: number,
    comment?: string
  ) => {
    const src = accounts.find(a => a.id === sourceAccountId);
    const tgt = accounts.find(a => a.id === targetAccountId);
    if (!src || !tgt) return;

    const fxRates: Record<string, number> = { UAH: 1, USD: 41.2, EUR: 44.5, PLN: 10.4, KZT: 0.086 };
    const srcRate = fxRates[src.currency] || 1;
    const tgtRate = fxRates[tgt.currency] || 1;
    const receivedAmount = (amount * srcRate) / tgtRate;

    const updatedSrc: Account = {
      ...src,
      balance: src.balance - amount,
      updated_at: new Date().toISOString(),
      version: src.version + 1,
    };

    const updatedTgt: Account = {
      ...tgt,
      balance: tgt.balance + receivedAmount,
      updated_at: new Date().toISOString(),
      version: tgt.version + 1,
    };

    repo.saveAccount(updatedSrc);
    repo.saveAccount(updatedTgt);

    const transferTx: Transaction = {
      id: 'tx-trf-' + Date.now(),
      business_id: activeCompanyId,
      date: new Date().toISOString().substring(0, 10),
      time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      type: 'transfer',
      status: 'confirmed',
      account_id: sourceAccountId,
      amount: amount,
      currency: src.currency,
      category_id: 'cat-transfer',
      category: 'Внутренний перевод',
      description: comment || `Перевод со счета ${src.name} на счет ${tgt.name}`,
      responsible_person: currentUser?.name || 'Собственник',
      idempotency_key: 'idemp-trf-' + Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      source: 'manual',
      sync_status: 'synced',
      version: 1,
      owner_id: currentUser?.id || 'usr-owner-1',
    };
    repo.saveTransaction(transferTx);
    refreshData();
  };

  // Risk Handler
  const handleConfirmRisk = (riskId: string) => {
    repo.confirmRiskAlert(riskId);
    refreshData();
  };

  // Import Statement Handler with SHA-256 Idempotency Key Deduplication
  const handleImportTransactions = (
    rows: ParsedStatementTransaction[],
    targetAccountId: string
  ): { imported: number; duplicatesSkipped: number } => {
    const existingTransactions = repo.getTransactions();
    const existingKeys = new Set(existingTransactions.map(t => t.idempotency_key).filter(Boolean));

    let importedCount = 0;
    let duplicateCount = 0;

    for (const r of rows) {
      if (existingKeys.has(r.idempotency_key)) {
        duplicateCount++;
        continue;
      }

      const tx: Transaction = {
        id: 'tx-imp-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
        business_id: activeCompanyId,
        date: r.date,
        time: '12:00',
        type: r.type === 'income' ? 'payment_receipt' : 'expense',
        status: 'imported',
        account_id: targetAccountId,
        amount: r.amount,
        currency: r.currency as Currency,
        category_id: 'cat-banking',
        category: 'Банковские операции',
        description: r.description,
        counterparty_id: r.counterparty ? 'cp-auto' : undefined,
        external_id: r.idempotency_key,
        idempotency_key: r.idempotency_key,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        source: 'imported',
        sync_status: 'synced',
        version: 1,
        owner_id: currentUser?.id || 'usr-owner-1',
      };

      repo.saveTransaction(tx);
      existingKeys.add(r.idempotency_key);
      importedCount++;
    }

    repo.logAudit(
      'IMPORT_STATEMENT',
      'Statement',
      targetAccountId,
      `Импортировано выписок: ${importedCount}, отсечено дубликатов по SHA-256: ${duplicateCount}`
    );
    refreshData();
    return { imported: importedCount, duplicatesSkipped: duplicateCount };
  };

  // Backup & Restore Handlers
  const handleExportBackup = async () => {
    const rawBackup = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      settings: repo.getSettings(),
      accounts: repo.getAccounts(),
      categories: repo.getCategories(),
      counterparties: repo.getCounterparties(),
      transactions: repo.getTransactions(),
      payments: repo.getPaymentPlans(),
      inventory: repo.getInventory(),
      devices: repo.getDevices(),
      audit: repo.getAuditLogs(),
    };

    const password = window.prompt(
      'Введите мастер-пароль для шифрования бэкапа (AES-GCM 256-bit). Все API-ключи будут автоматически вырезаны:'
    );
    if (!password) return;

    try {
      const encryptedPayload = await BackupService.createEncryptedBackup(rawBackup, password);
      const blob = new Blob([JSON.stringify(encryptedPayload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `erp_encrypted_backup_aes256_${new Date().toISOString().substring(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      repo.logAudit('BACKUP_EXPORT_ENCRYPTED', 'System', 'all', 'Сформирована зашифрованная копия базы данных (AES-GCM-256)');
      refreshData();
    } catch (err: any) {
      alert(`Ошибка при создании крипто-бэкапа: ${err?.message || 'Неизвестная ошибка'}`);
    }
  };

  const handleRestoreBackup = async (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      let data: any = parsed;

      if (parsed.format === 'ERP_ENCRYPTED_BACKUP_V1') {
        const password = window.prompt(
          'Обнаружен зашифрованный бэкап AES-GCM. Введите мастер-пароль для расшифровки:'
        );
        if (!password) return;
        data = await BackupService.restoreEncryptedBackup(parsed as EncryptedBackupPayload, password);
      }

      if (!data.accounts || !data.transactions) {
        alert('Неверный формат файла резервной копии.');
        return;
      }

      if (window.confirm('Восстановить базу данных из резервной копии? Текущие данные будут замещены.')) {
        localStorage.setItem('mgmt_acct_accounts', JSON.stringify(data.accounts));
        localStorage.setItem('mgmt_acct_transactions', JSON.stringify(data.transactions));
        if (data.payments) localStorage.setItem('mgmt_acct_payments', JSON.stringify(data.payments));
        if (data.inventory) localStorage.setItem('mgmt_acct_inventory', JSON.stringify(data.inventory));
        if (data.settings) localStorage.setItem('mgmt_acct_settings', JSON.stringify(data.settings));
        if (data.categories) localStorage.setItem('mgmt_acct_categories', JSON.stringify(data.categories));
        if (data.counterparties) localStorage.setItem('mgmt_acct_counterparties', JSON.stringify(data.counterparties));
        refreshData();
        alert('База данных успешно расшифрована и восстановлена!');
      }
    } catch (err: any) {
      alert(`Ошибка при восстановлении резервной копии: ${err?.message || 'Неверный пароль или поврежденный файл'}`);
    }
  };

  // Device Pairing Handlers
  const handleAddDevice = (device: RegisteredDevice) => {
    const current = repo.getDevices();
    current.push(device);
    localStorage.setItem('mgmt_acct_devices', JSON.stringify(current));
    repo.logAudit('DEVICE_PAIR', 'Device', device.device_id, `Связано новое устройство ${device.name}`);
    refreshData();
  };

  const handleRevokeDevice = (deviceId: string) => {
    repo.revokeDevice(deviceId);
    refreshData();
  };

  const pendingApprovalCount =
    (transactions || []).filter(t => t.status === 'pending_approval' || t.status === 'requires_review').length +
    (approvalRequests || []).filter(a => a.status === 'pending_approval').length;

  // If user is not authenticated or session is locked, render LoginScreen
  if (!currentUser || isLocked) {
    return (
      <I18nProvider locale={locale} setLocale={handleLocaleChange}>
        <LoginScreen
          t={t}
          locale={locale}
          onLoginSuccess={handleLoginSuccess}
          onLocaleChange={handleLocaleChange}
        />
      </I18nProvider>
    );
  }

  return (
    <I18nProvider locale={locale} setLocale={handleLocaleChange}>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
        {/* Top Header with Multi-Business Selector, 3-Language i18n, and User Profile */}
        <Header
          t={t}
          locale={locale}
          currentUser={currentUser}
          activeCompanyId={activeCompanyId}
          isOnline={isOnline}
          aiMode={aiMode}
          isLocked={isLocked}
          onCompanyChange={handleCompanyChange}
          onLocaleChange={handleLocaleChange}
          onLockApp={handleLockApp}
          onOpenSettings={() => setActiveTab('settings')}
        />

        {/* Main Layout Area */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Navigation Sidebar */}
          <Sidebar
            t={t}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            currentRole={currentUser.role}
            riskCount={(riskAlerts || []).filter(r => !r.confirmed_at && !r.resolved).length}
            pendingApprovalCount={pendingApprovalCount}
            featureFlags={featureFlags}
          />

          {/* View Content Area: Key ensures complete React redraw of all 11 pages on locale or company change */}
          <main key={`${locale}-${activeCompanyId}`} className="flex-1 overflow-y-auto bg-slate-950/70 relative">
          {activeTab === 'dashboard' && (
            <DashboardView
              t={t}
              accounts={accounts}
              transactions={transactions}
              payments={payments}
              inventory={inventory}
              riskAlerts={riskAlerts}
              onNavigate={setActiveTab}
              onConfirmRisk={handleConfirmRisk}
              currency={currency}
            />
          )}

          {activeTab === 'money' && (
            <MoneyView
              t={t}
              accounts={accounts}
              onAddAccount={handleAddAccount}
              onTransferMoney={handleTransferMoney}
              currency={currency}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === 'transactions' && (
            <TransactionsView
              t={t}
              transactions={transactions}
              accounts={accounts}
              currentRole={currentUser.role}
              aiMode={aiMode}
              onSaveTransaction={handleSaveTransaction}
              onDeleteTransaction={handleDeleteTransaction}
              onApproveTransaction={handleApproveTransaction}
              currency={currency}
            />
          )}

          {activeTab === 'calendar' && (
            <CalendarView
              t={t}
              payments={payments}
              accounts={accounts}
              currentRole={currentUser.role}
              aiMode={aiMode}
              onSavePayment={handleSavePayment}
              onExecutePayment={handleExecutePayment}
              onDeletePayment={handleDeletePayment}
              currency={currency}
            />
          )}

          {activeTab === 'inventory' && (
            <InventoryView
              t={t}
              inventory={inventory}
              aiMode={aiMode}
              onSaveItem={handleSaveInventory}
              onRecordMovement={handleRecordStockMovement}
              currency={currency}
            />
          )}

          {(activeTab === 'pnl' || activeTab === 'reports') && (
            <ProfitAndLossView
              t={t}
              transactions={transactions}
              currency={currency}
            />
          )}

          {activeTab === 'cashflow' && (
            <CashFlowView
              t={t}
              transactions={transactions}
              accounts={accounts}
              currency={currency}
            />
          )}

          {activeTab === 'balance' && (
            <BalanceSheetView
              t={t}
              accounts={accounts}
              inventory={inventory}
              currency={currency}
            />
          )}

          {activeTab === 'planFact' && (
            <PlanFactView
              t={t}
              transactions={transactions}
              payments={payments}
              currency={currency}
              locale={locale}
            />
          )}

          {(activeTab === 'ai' || activeTab === 'aiConsultant') && (
            <AiConsultantView
              t={t}
              aiMode={aiMode}
              onAiModeChange={setAiMode}
              riskAlerts={riskAlerts}
              onConfirmRisk={handleConfirmRisk}
              transactions={transactions}
              accounts={accounts}
              payments={payments}
              inventory={inventory}
            />
          )}

          {activeTab === 'approvals' && (
            <div className="p-6 max-w-5xl mx-auto space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Система коллективного согласования</h2>
                  <p className="text-xs text-slate-400">
                    Согласно ТЗ v1.1, изменение или удаление любых существующих данных выполняется только при 100% согласии участников
                  </p>
                </div>
                <button
                  onClick={() => setIsApprovalModalOpen(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-sm transition cursor-pointer"
                >
                  Открыть центр голосования
                </button>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 divide-y divide-slate-800">
                {approvalRequests.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-xs">
                    Нет активных запросов на согласование. Любая попытка изменить или удалить существующую запись сформирует здесь запрос.
                  </div>
                ) : (
                  approvalRequests.map(req => (
                    <div key={req.id} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-slate-200">{req.action_type} • {req.entity_type} ({req.entity_id})</div>
                        <div className="text-[11px] text-slate-400">Обоснование: {req.reason}</div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          Инициатор: {req.initiator_name} ({req.initiator_role}) • Собрано голосов: {req.votes.length}/{req.required_participant_ids.length}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          req.status === 'approved'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : req.status === 'rejected'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}>
                          {req.status}
                        </span>
                        <button
                          onClick={() => setIsApprovalModalOpen(true)}
                          className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs transition cursor-pointer"
                        >
                          Голосовать
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {(activeTab === 'import' || activeTab === 'importExport') && (
            <ImportExportView
              t={t}
              accounts={accounts}
              onImportTransactions={handleImportTransactions}
              onExportBackup={handleExportBackup}
              onRestoreBackup={handleRestoreBackup}
            />
          )}

          {(activeTab === 'pairing' || activeTab === 'devicePairing') && (
            <DevicePairingView
              t={t}
              devices={devices}
              onRevokeDevice={handleRevokeDevice}
              onAddDevice={handleAddDevice}
              transactions={transactions}
              onUpdateTransactions={updatedTxs => {
                for (const ut of updatedTxs) {
                  repo.saveTransaction(ut);
                }
                refreshData();
              }}
            />
          )}

          {(activeTab === 'security' || activeTab === 'securityAudit') && (
            <SecurityAuditView
              t={t}
              auditLogs={auditLogs}
              isLocked={isLocked}
              onToggleLock={() => setIsLocked(!isLocked)}
              conflictedTransactions={transactions.filter(tx => tx.sync_conflict)}
              onResolveConflict={txId => {
                const target = transactions.find(t => t.id === txId);
                if (target) {
                  repo.saveTransaction({
                    ...target,
                    sync_conflict: false,
                    sync_status: 'synced',
                    description: target.description.replace('[КОНФЛИКТ СИНХРОНИЗАЦИИ P2P] ', ''),
                  });
                  repo.logAudit('CONFLICT_RESOLVED', 'Transaction', txId, 'Конфликт P2P вручную разрешен аудитором');
                  refreshData();
                }
              }}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              t={t}
              locale={locale}
              currentUser={currentUser}
              activeCompanyId={activeCompanyId}
              onCompanyChange={handleCompanyChange}
              onLocaleChange={handleLocaleChange}
              onRefreshData={refreshData}
            />
          )}

          {activeTab === 'docs' && (
            <DocsView t={t} />
          )}
        </main>
      </div>

      {/* Collective Approval Modal Guard (ТЗ v1.1) */}
      <ApprovalWorkflowModal
        isOpen={isApprovalModalOpen}
        onClose={() => setIsApprovalModalOpen(false)}
        requests={approvalRequests}
        currentUser={currentUser}
        allUsers={repo.getUsers()}
        onCastVote={handleCastApprovalVote}
      />
    </div>
    </I18nProvider>
  );
}
