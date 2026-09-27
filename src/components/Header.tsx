import React, { useState, useRef, useEffect } from 'react';
import {
  Lock,
  Unlock,
  Wifi,
  WifiOff,
  Cpu,
  RefreshCw,
  Building2,
  ChevronDown,
  Globe2,
  Crown,
  Briefcase,
  Plus,
  Settings,
  LogOut,
  Check,
} from 'lucide-react';
import { SupportedLocale, TranslationDictionary, LANGUAGE_LABELS, getLocalizedName } from '../i18n';
import { Company, Role, UserProfile } from '../types';
import { Repository } from '../services/storage/repository';

interface HeaderProps {
  t: TranslationDictionary;
  locale: SupportedLocale;
  currentUser: UserProfile;
  activeCompanyId: string;
  isOnline: boolean;
  aiMode: string;
  syncStatus?: 'synced' | 'syncing' | 'error';
  isLocked?: boolean;
  onCompanyChange: (companyId: string) => void;
  onLocaleChange: (locale: SupportedLocale) => void;
  onLockApp: () => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  t,
  locale,
  currentUser,
  activeCompanyId,
  isOnline,
  aiMode,
  syncStatus = 'synced',
  isLocked = false,
  onCompanyChange,
  onLocaleChange,
  onLockApp,
  onOpenSettings,
}) => {
  const repo = Repository.getInstance();
  const companies = repo.getCompanies();
  const activeCompany = repo.getCompany(activeCompanyId) || companies[0];

  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);

  const companyDropdownRef = useRef<HTMLDivElement>(null);
  const langDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (companyDropdownRef.current && !companyDropdownRef.current.contains(event.target as Node)) {
        setIsCompanyDropdownOpen(false);
      }
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
        setIsLangDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isOwner = currentUser.role === 'owner';

  return (
    <header className="bg-slate-900 text-slate-100 border-b border-slate-800 px-4 py-2.5 sticky top-0 z-30 font-sans shadow-md">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Left Section: Brand & Multi-Business Selector */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center font-bold text-slate-950 text-xs shadow-md shadow-emerald-600/20">
            ERP
          </div>

          {/* Multi-Company Dropdown Selector */}
          <div className="relative" ref={companyDropdownRef}>
            <button
              onClick={() => setIsCompanyDropdownOpen(!isCompanyDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700/90 border border-slate-700/80 text-xs transition cursor-pointer group text-left"
              title="Переключить активную компанию / бизнес"
            >
              <Building2 className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-105 transition-transform" />
              <div className="flex flex-col">
                <span className="font-bold text-white max-w-[170px] truncate leading-tight">
                  {getLocalizedName(activeCompany, locale)}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {activeCompany.currency} • {activeCompany.tax_id || 'ID: ' + activeCompany.id.slice(0, 8)}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
            </button>

            {isCompanyDropdownOpen && (
              <div className="absolute left-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95">
                <div className="px-3 py-1.5 border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {t.settings?.companies || 'Бизнесы и юридические лица'}
                </div>
                <div className="max-h-60 overflow-y-auto py-1">
                  {companies.map(comp => {
                    const isSelected = comp.id === activeCompany.id;
                    return (
                      <button
                        key={comp.id}
                        onClick={() => {
                          onCompanyChange(comp.id);
                          setIsCompanyDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-950/40 text-emerald-300 font-semibold'
                            : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="truncate font-medium">{getLocalizedName(comp, locale)}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {comp.currency} • {comp.city || comp.country}
                          </div>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
                <div className="pt-1.5 mt-1 border-t border-slate-800 px-2">
                  <button
                    onClick={() => {
                      setIsCompanyDropdownOpen(false);
                      onOpenSettings();
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-300 text-xs font-medium border border-emerald-800/40 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {t.settings?.addCompany || 'Управление бизнесами'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center: System Status Indicators */}
        <div className="hidden lg:flex items-center gap-2 text-xs">
          {/* Network Status */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${
              isOnline
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                : 'bg-amber-950/40 border-amber-800/60 text-amber-300'
            }`}
            title={isOnline ? t.status.online : t.status.offline}
          >
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            <span className="font-medium text-[11px]">{isOnline ? 'Online' : 'Offline'}</span>
          </div>

          {/* AI Mode */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-slate-800/80 border-slate-700 text-slate-300"
            title={`AI Provider: ${aiMode}`}
          >
            <Cpu className="w-3.5 h-3.5 text-teal-400" />
            <span className="font-medium text-[11px] capitalize">
              {aiMode === 'ollama' ? 'Ollama (Local)' : aiMode === 'gemini' ? 'Gemini Cloud' : 'Local Engine'}
            </span>
          </div>

          {/* P2P Sync Indicator */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${
              syncStatus === 'synced'
                ? 'bg-slate-800/80 border-slate-700 text-slate-300'
                : syncStatus === 'syncing'
                ? 'bg-blue-950/50 border-blue-800 text-blue-300 animate-pulse'
                : 'bg-rose-950/50 border-rose-800 text-rose-300'
            }`}
          >
            <RefreshCw className={`w-3 h-3 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
            <span className="text-[11px]">{syncStatus === 'synced' ? 'P2P Ready' : syncStatus}</span>
          </div>
        </div>

        {/* Right Section: Language Switcher, User Profile, Lock Session */}
        <div className="flex items-center gap-2.5">
          {/* Full European Language Selector */}
          <div className="relative" ref={langDropdownRef}>
            <button
              onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700/90 border border-slate-700 text-xs font-medium text-slate-200 transition cursor-pointer"
              title="Язык интерфейса / Language"
            >
              <Globe2 className="w-3.5 h-3.5 text-slate-400" />
              <span>{LANGUAGE_LABELS[locale]?.flag}</span>
              <span className="uppercase text-[11px] font-mono font-semibold">{locale}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isLangDropdownOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl py-2 z-50 max-h-72 overflow-y-auto animate-in fade-in zoom-in-95">
                <div className="px-3 py-1 border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {locale === 'uk' ? 'Мова інтерфейсу' : locale === 'en' ? 'Interface Language' : 'Язык интерфейса'}
                </div>
                {(Object.keys(LANGUAGE_LABELS) as SupportedLocale[]).map(langKey => (
                  <button
                    key={langKey}
                    onClick={() => {
                      onLocaleChange(langKey);
                      setIsLangDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition cursor-pointer ${
                      locale === langKey
                        ? 'bg-emerald-600/20 text-emerald-300 font-semibold'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{LANGUAGE_LABELS[langKey].flag}</span>
                      <span>{LANGUAGE_LABELS[langKey].native}</span>
                    </div>
                    <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold">
                      {langKey}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* User Profile & Role Pill */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-white text-xs shadow-sm"
              style={{ backgroundColor: currentUser.avatar_color || (isOwner ? '#10b981' : '#3b82f6') }}
              title={currentUser.name}
            >
              {currentUser.name.slice(0, 2).toUpperCase()}
            </div>

            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-bold text-white leading-tight truncate max-w-[110px]">
                {currentUser.name.split(' ')[0]}
              </span>
              <span className="text-[10px] font-bold tracking-wider uppercase flex items-center gap-1 text-slate-400">
                {isOwner ? (
                  <>
                    <Crown className="w-2.5 h-2.5 text-amber-400" />
                    <span className="text-emerald-400 font-mono">Owner</span>
                  </>
                ) : (
                  <>
                    <Briefcase className="w-2.5 h-2.5 text-blue-400" />
                    <span className="text-blue-400 font-mono">Director</span>
                  </>
                )}
              </span>
            </div>

            {/* Lock / Logout Session Button */}
            <button
              onClick={onLockApp}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-300 border border-slate-700/80 transition cursor-pointer ml-1"
              title="Заблокировать сессию / Сменить пользователя"
            >
              <Lock className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
