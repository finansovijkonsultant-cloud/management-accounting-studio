import React from 'react';
import {
  LayoutDashboard,
  Wallet,
  Receipt,
  CalendarDays,
  TrendingUp,
  Scale,
  Target,
  FileSpreadsheet,
  Boxes,
  Bot,
  ArrowUpDown,
  Smartphone,
  Landmark,
  ShieldCheck,
  Compass,
  BookOpen,
  Settings,
  Users,
} from 'lucide-react';
import { TranslationDictionary } from '../i18n';
import { FeatureFlags } from '../lib/config/featureFlags';

export type TabKey =
  | 'dashboard'
  | 'money'
  | 'transactions'
  | 'calendar'
  | 'pnl'
  | 'cashflow'
  | 'balance'
  | 'planFact'
  | 'reports'
  | 'inventory'
  | 'aiConsultant'
  | 'ai'
  | 'importExport'
  | 'import'
  | 'devicePairing'
  | 'pairing'
  | 'securityAudit'
  | 'security'
  | 'approvals'
  | 'settings'
  | 'docs';

export type NavigationTab = TabKey;

interface SidebarProps {
  t: TranslationDictionary;
  activeTab: TabKey;
  onTabSelect?: (tab: TabKey) => void;
  onTabChange?: (tab: TabKey) => void;
  currentRole?: string;
  riskCount?: number;
  pendingApprovalCount?: number;
  unresolvedAlertsCount?: number;
  featureFlags?: FeatureFlags;
}

export const Sidebar: React.FC<SidebarProps> = ({
  t,
  activeTab,
  onTabSelect,
  onTabChange,
  currentRole,
  riskCount = 0,
  pendingApprovalCount = 0,
  unresolvedAlertsCount = 0,
  featureFlags = { cloudAi: false, p2pSync: false },
}) => {
  const handleSelect = (tab: TabKey) => {
    if (onTabChange) onTabChange(tab);
    if (onTabSelect) onTabSelect(tab);
  };
  const navItems: { key: TabKey; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: 'dashboard', label: t.nav.dashboard, icon: <LayoutDashboard className="w-4 h-4" /> },
    { key: 'money', label: t.nav.money, icon: <Wallet className="w-4 h-4" /> },
    { key: 'transactions', label: t.nav.transactions, icon: <Receipt className="w-4 h-4" /> },
    { key: 'calendar', label: t.nav.calendar, icon: <CalendarDays className="w-4 h-4" /> },
    { key: 'pnl', label: t.nav.pnl, icon: <TrendingUp className="w-4 h-4" /> },
    { key: 'cashflow', label: t.nav.cashflow, icon: <ArrowUpDown className="w-4 h-4" /> },
    { key: 'balance', label: t.nav.balance, icon: <Scale className="w-4 h-4" /> },
    { key: 'planFact', label: t.nav.planFact, icon: <Target className="w-4 h-4" /> },
    { key: 'inventory', label: t.nav.inventory, icon: <Boxes className="w-4 h-4" /> },
    ...(featureFlags.cloudAi ? [{
      key: 'aiConsultant' as TabKey,
      label: t.nav.aiConsultant,
      icon: <Bot className="w-4 h-4" />,
      badge: unresolvedAlertsCount > 0 ? unresolvedAlertsCount : undefined,
    }] : []),
    { key: 'importExport' as TabKey, label: t.nav.importExport, icon: <ArrowUpDown className="w-4 h-4" /> },
    ...(featureFlags.p2pSync ? [{ key: 'devicePairing' as TabKey, label: t.nav.devicePairing, icon: <Smartphone className="w-4 h-4" /> }] : []),
    { key: 'securityAudit' as TabKey, label: t.nav.securityAudit, icon: <ShieldCheck className="w-4 h-4" /> },
    {
      key: 'approvals' as TabKey,
      label: 'Согласование (ТЗ)',
      icon: <Users className="w-4 h-4" />,
      badge: pendingApprovalCount > 0 ? pendingApprovalCount : undefined,
    },
    { key: 'settings' as TabKey, label: t.nav.settings || 'Настройки', icon: <Settings className="w-4 h-4" /> },
    { key: 'docs' as TabKey, label: t.nav.docs, icon: <BookOpen className="w-4 h-4" /> },
  ];

  return (
    <aside className="w-64 bg-slate-950 text-slate-300 border-r border-slate-800 flex flex-col flex-shrink-0 min-h-[calc(100vh-61px)]">
      <div className="p-3 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
        {t.appName}
      </div>

      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const isActive = activeTab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => handleSelect(item.key)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition cursor-pointer ${
                isActive
                  ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-300 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={isActive ? 'text-emerald-400' : 'text-slate-400'}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="bg-amber-500/20 text-amber-300 text-xs px-2 py-0.5 rounded-full border border-amber-500/40">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/60 text-xs text-slate-500">
        <div className="flex items-center justify-between">
          <span>СУБД: Offline Local</span>
          <span className="text-emerald-400 font-mono">SQLite Ready</span>
        </div>
        <div className="text-[11px] text-slate-500 mt-1">Cross-platform: Win / Mac / Android</div>
      </div>
    </aside>
  );
};
