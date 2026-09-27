import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  UserCheck,
  ChevronRight,
  Fingerprint,
  Building2,
  KeyRound,
  AlertCircle,
  Globe2,
  Crown,
  Briefcase,
} from 'lucide-react';
import { TranslationDictionary, SupportedLocale, LANGUAGE_LABELS } from '../i18n';
import { UserProfile, Role } from '../types';
import { Repository } from '../services/storage/repository';

interface LoginScreenProps {
  t: TranslationDictionary;
  locale: SupportedLocale;
  onLocaleChange: (locale: SupportedLocale) => void;
  onLoginSuccess: (user: UserProfile) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  t,
  locale,
  onLocaleChange,
  onLoginSuccess,
}) => {
  const repo = Repository.getInstance();
  const users = repo.getUsers();
  const activeCompany = repo.getActiveCompany();

  const [selectedUserId, setSelectedUserId] = useState<string>(users[0]?.id || 'usr-owner-1');
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLangOpen, setIsLangOpen] = useState(false);

  const selectedUser = users.find(u => u.id === selectedUserId) || users[0];

  const handlePinDigit = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      setError(null);
      if (newPin.length === 4) {
        attemptLogin(newPin);
      }
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setError(null);
  };

  const handleClear = () => {
    setPin('');
    setError(null);
  };

  const attemptLogin = (pinToTest: string) => {
    const result = repo.authenticate(selectedUser.id, pinToTest);
    if (result.success && result.user) {
      setError(null);
      onLoginSuccess(result.user);
    } else {
      setError(t.login.wrongPin || 'Неверный PIN-код. Повторите попытку.');
      setPin('');
    }
  };

  const handleQuickTestUnlock = (role: Role) => {
    const targetUser = users.find(u => u.role === role) || selectedUser;
    setSelectedUserId(targetUser.id);
    const testPin = role === 'owner' ? '1234' : '5678';
    setPin(testPin);
    setTimeout(() => {
      attemptLogin(testPin);
    }, 150);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 text-slate-100 p-4 font-sans select-none overflow-y-auto">
      {/* Background Decorative Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md bg-slate-900/90 border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl flex flex-col items-center">
        {/* Top Bar with Language Switcher */}
        <div className="w-full flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <Building2 className="w-4 h-4 text-emerald-400" />
            <span className="truncate max-w-[180px]">{activeCompany.name}</span>
          </div>

          <div className="relative">
            <button
              onClick={() => setIsLangOpen(!isLangOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs font-medium text-slate-200 transition"
              title="Change Language"
            >
              <Globe2 className="w-3.5 h-3.5 text-slate-400" />
              <span>{LANGUAGE_LABELS[locale]?.flag}</span>
              <span className="uppercase text-[11px] font-mono">{locale}</span>
            </button>

            {isLangOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1 z-50 max-h-60 overflow-y-auto">
                {(Object.keys(LANGUAGE_LABELS) as SupportedLocale[]).map(langKey => (
                  <button
                    key={langKey}
                    onClick={() => {
                      onLocaleChange(langKey);
                      setIsLangOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition ${
                      locale === langKey
                        ? 'bg-emerald-600/20 text-emerald-300 font-semibold'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>{LANGUAGE_LABELS[langKey].flag}</span>
                    <span>{LANGUAGE_LABELS[langKey].native}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-3">
            <ShieldCheck className="w-8 h-8 text-slate-950 stroke-[2.2]" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">{t.login.title}</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">{t.login.subtitle}</p>
        </div>

        {/* Profile Switcher Tabs */}
        <div className="w-full mb-6">
          <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-2">
            {t.login.selectUser}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {users.map(u => {
              const isSelected = u.id === selectedUser.id;
              const isOwner = u.role === 'owner';
              return (
                <button
                  key={u.id}
                  onClick={() => {
                    setSelectedUserId(u.id);
                    setPin('');
                    setError(null);
                  }}
                  className={`flex flex-col items-start p-3 rounded-xl border text-left transition relative cursor-pointer ${
                    isSelected
                      ? isOwner
                        ? 'bg-emerald-950/40 border-emerald-500/80 shadow-md shadow-emerald-500/10'
                        : 'bg-blue-950/40 border-blue-500/80 shadow-md shadow-blue-500/10'
                      : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/80 text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-1.5 w-full mb-1">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: u.avatar_color || (isOwner ? '#10b981' : '#3b82f6') }}
                    />
                    <span className="text-xs font-semibold text-white truncate">{u.name.split(' ')[0]}</span>
                    {isOwner ? (
                      <Crown className="w-3 h-3 text-amber-400 ml-auto" />
                    ) : (
                      <Briefcase className="w-3 h-3 text-blue-400 ml-auto" />
                    )}
                  </div>
                  <span className="text-[10px] uppercase font-mono font-medium text-slate-400">
                    {isOwner ? 'Владелец' : 'Директор'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Profile Info Banner */}
        <div className="w-full bg-slate-950/60 border border-slate-800 rounded-xl p-3 mb-5 flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-slate-950 text-sm"
            style={{ backgroundColor: selectedUser.avatar_color || '#10b981' }}
          >
            {selectedUser.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold text-white truncate">{selectedUser.name}</p>
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                  selectedUser.role === 'owner'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : 'bg-blue-950 text-blue-300 border border-blue-800'
                }`}
              >
                {selectedUser.role === 'owner' ? 'Owner' : 'Director'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">
              {selectedUser.role === 'owner' ? t.login.ownerBadge : t.login.directorBadge}
            </p>
          </div>
        </div>

        {/* PIN Code Dots Display */}
        <div className="flex flex-col items-center mb-6">
          <div className="flex items-center gap-4 mb-2">
            {[0, 1, 2, 3].map(idx => (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                  pin.length > idx
                    ? selectedUser.role === 'owner'
                      ? 'bg-emerald-400 border-emerald-400 scale-110 shadow-lg shadow-emerald-400/50'
                      : 'bg-blue-400 border-blue-400 scale-110 shadow-lg shadow-blue-400/50'
                    : 'border-slate-600 bg-slate-800/50'
                }`}
              />
            ))}
          </div>

          {error ? (
            <p className="text-xs text-rose-400 font-medium flex items-center gap-1 mt-1 animate-shake">
              <AlertCircle className="w-3.5 h-3.5" />
              {error}
            </p>
          ) : (
            <p className="text-[11px] text-slate-500 font-mono mt-1">{t.login.enterPin}</p>
          )}
        </div>

        {/* Numeric PIN Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[280px] mb-6">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(digit => (
            <button
              key={digit}
              onClick={() => handlePinDigit(digit)}
              className="h-12 rounded-xl bg-slate-800/70 hover:bg-slate-700/80 active:bg-slate-600/90 text-white font-mono text-lg font-semibold border border-slate-700/60 shadow-sm transition flex items-center justify-center cursor-pointer active:scale-95"
            >
              {digit}
            </button>
          ))}
          <button
            onClick={handleClear}
            className="h-12 rounded-xl bg-slate-800/30 hover:bg-slate-800/60 text-slate-400 text-xs font-semibold border border-slate-800 transition flex items-center justify-center cursor-pointer"
          >
            C
          </button>
          <button
            onClick={() => handlePinDigit('0')}
            className="h-12 rounded-xl bg-slate-800/70 hover:bg-slate-700/80 active:bg-slate-600/90 text-white font-mono text-lg font-semibold border border-slate-700/60 shadow-sm transition flex items-center justify-center cursor-pointer active:scale-95"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            className="h-12 rounded-xl bg-slate-800/30 hover:bg-slate-800/60 text-slate-400 text-xs font-semibold border border-slate-800 transition flex items-center justify-center cursor-pointer"
            title="Backspace"
          >
            ⌫
          </button>
        </div>

        {/* Quick Test Demo Helpers */}
        <div className="w-full pt-4 border-t border-slate-800/80 flex flex-col items-center">
          <p className="text-[11px] text-slate-400 font-medium mb-2">{t.login.testPinHint}</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleQuickTestUnlock('owner')}
              className="px-3 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-700/70 text-emerald-300 text-[11px] font-medium transition cursor-pointer flex items-center gap-1.5"
            >
              <Crown className="w-3 h-3 text-amber-400" />
              Войти как Владелец (1234)
            </button>
            <button
              onClick={() => handleQuickTestUnlock('director')}
              className="px-3 py-1.5 rounded-lg bg-blue-950/60 hover:bg-blue-900/80 border border-blue-700/70 text-blue-300 text-[11px] font-medium transition cursor-pointer flex items-center gap-1.5"
            >
              <Briefcase className="w-3 h-3 text-blue-400" />
              Войти как Директор (5678)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
