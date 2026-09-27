import React, { useState } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Users,
  AlertTriangle,
  ArrowRight,
  FileText,
  ThumbsUp,
  ThumbsDown,
  X,
  MessageSquare,
} from 'lucide-react';
import { ApprovalRequest, Role, UserProfile } from '../types';

interface ApprovalWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  requests: ApprovalRequest[];
  currentUser: UserProfile;
  allUsers: UserProfile[];
  onCastVote: (requestId: string, decision: 'approve' | 'reject', comment?: string) => void;
}

export const ApprovalWorkflowModal: React.FC<ApprovalWorkflowModalProps> = ({
  isOpen,
  onClose,
  requests,
  currentUser,
  allUsers,
  onCastVote,
}) => {
  const [selectedReqId, setSelectedReqId] = useState<string>(requests[0]?.id || '');
  const [voteComment, setVoteComment] = useState<string>('');
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');

  if (!isOpen) return null;

  const filteredRequests = requests.filter(r => (filter === 'pending' ? r.status === 'pending_approval' : true));
  const activeReq = requests.find(r => r.id === selectedReqId) || filteredRequests[0];

  const handleVote = (decision: 'approve' | 'reject') => {
    if (!activeReq) return;
    onCastVote(activeReq.id, decision, voteComment.trim() || undefined);
    setVoteComment('');
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'delete_transaction':
        return 'Удаление проводки из Главной книги';
      case 'update_transaction':
        return 'Редактирование параметров проводки';
      case 'delete_payment_plan':
        return 'Удаление планового платежа из календаря';
      case 'update_payment_plan':
        return 'Изменение планового платежа';
      case 'delete_revenue_plan':
        return 'Удаление статьи плана доходов (БДР)';
      case 'update_revenue_plan':
        return 'Изменение статьи плана доходов';
      default:
        return action;
    }
  };

  const formatSnapshot = (rawJson: string) => {
    try {
      const obj = JSON.parse(rawJson);
      return JSON.stringify(obj, null, 2);
    } catch {
      return rawJson;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-4 text-slate-200 text-xs max-h-[90vh] flex flex-col">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Коллективное согласование изменений (ТЗ v1.1)
              </h3>
              <p className="text-[11px] text-slate-400">
                Любое редактирование или удаление данных вступает в силу строго при 100% согласии участников
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-800/60 pb-2">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition ${
                filter === 'pending'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Ожидают решения ({requests.filter(r => r.status === 'pending_approval').length})
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition ${
                filter === 'all'
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Все запросы ({requests.length})
            </button>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 font-mono">
            <span>Вы вошли как:</span>
            <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded">
              {currentUser.name} ({currentUser.role})
            </span>
          </div>
        </div>

        {/* Main Body: List + Detail */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 min-h-[360px] overflow-hidden">
          {/* Requests List */}
          <div className="border border-slate-800 rounded-xl overflow-y-auto p-2 space-y-2 bg-slate-950/60">
            {filteredRequests.length === 0 ? (
              <div className="p-6 text-center text-slate-500">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500/50" />
                <span>Все запросы согласованы или отсутствуют</span>
              </div>
            ) : (
              filteredRequests.map(req => {
                const isSelected = activeReq?.id === req.id;
                const userVote = req.votes.find(v => v.participant_id === currentUser.id);

                return (
                  <div
                    key={req.id}
                    onClick={() => setSelectedReqId(req.id)}
                    className={`p-3 rounded-lg border transition cursor-pointer space-y-1.5 ${
                      isSelected
                        ? 'bg-indigo-950/40 border-indigo-500/60 text-white'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          req.status === 'approved'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : req.status === 'rejected'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}
                      >
                        {req.status === 'pending_approval' ? 'Голосование' : req.status}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(req.created_at).toLocaleDateString('ru-RU')}
                      </span>
                    </div>

                    <div className="font-semibold text-xs text-slate-100">{getActionLabel(req.action_type)}</div>
                    <div className="text-[11px] text-slate-400 line-clamp-1">Причина: {req.reason}</div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/60">
                      <span>Инициатор: {req.initiator_name}</span>
                      <span className="font-mono">
                        Голосов: {req.votes.length}/{req.required_participant_ids.length}
                      </span>
                    </div>

                    {userVote && (
                      <div className="text-[10px] flex items-center gap-1 font-semibold text-teal-400">
                        ✓ Ваш голос: {userVote.decision === 'approve' ? 'ОДОБРЕНО' : 'ОТКЛОНЕНО'}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Request Detail Panel */}
          <div className="md:col-span-2 border border-slate-800 rounded-xl p-4 bg-slate-900/60 flex flex-col justify-between overflow-y-auto space-y-4">
            {activeReq ? (
              <div className="space-y-4">
                {/* Header Info */}
                <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-400" />
                      {getActionLabel(activeReq.action_type)}
                    </h4>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      ID запроса: {activeReq.id} • Объект: {activeReq.entity_type} ({activeReq.entity_id})
                    </p>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded text-xs font-bold uppercase ${
                      activeReq.status === 'approved'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : activeReq.status === 'rejected'
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}
                  >
                    {activeReq.status}
                  </span>
                </div>

                {/* Reason & Initiator */}
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
                  <div className="text-[11px] text-slate-400 font-semibold uppercase">Обоснование инициатора:</div>
                  <div className="text-xs text-slate-200">{activeReq.reason}</div>
                  <div className="text-[10px] text-slate-500 font-mono pt-1">
                    Инициатор: {activeReq.initiator_name} ({activeReq.initiator_role}) • Создано: {new Date(activeReq.created_at).toLocaleString('ru-RU')}
                  </div>
                </div>

                {/* Comparison Snapshot */}
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold text-slate-300">Снимок данных до операции (Current State):</div>
                  <pre className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-36">
                    {formatSnapshot(activeReq.old_version_snapshot)}
                  </pre>
                  {activeReq.proposed_payload && (
                    <>
                      <div className="text-[11px] font-semibold text-indigo-300">Предлагаемые изменения (Proposed State):</div>
                      <pre className="p-2.5 bg-indigo-950/30 rounded-lg border border-indigo-900/50 text-[11px] font-mono text-indigo-200 overflow-x-auto max-h-36">
                        {formatSnapshot(activeReq.proposed_payload)}
                      </pre>
                    </>
                  )}
                </div>

                {/* Voting Quorum Table */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
                    <span>Участники компании и их голоса:</span>
                    <span className="font-mono text-indigo-400">
                      Необходимо 100% одобрение ({activeReq.votes.filter(v => v.decision === 'approve').length} из {activeReq.required_participant_ids.length})
                    </span>
                  </div>

                  <div className="border border-slate-800 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="py-2 px-3">Участник</th>
                          <th className="py-2 px-3">Роль</th>
                          <th className="py-2 px-3">Решение</th>
                          <th className="py-2 px-3">Комментарий</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                        {activeReq.required_participant_ids.map(userId => {
                          const userObj = allUsers.find(u => u.id === userId) || { name: userId, role: 'director' };
                          const vote = activeReq.votes.find(v => v.participant_id === userId);

                          return (
                            <tr key={userId} className="hover:bg-slate-800/30">
                              <td className="py-2 px-3 font-medium text-slate-200">{userObj.name}</td>
                              <td className="py-2 px-3 uppercase text-[10px] text-slate-400">{userObj.role}</td>
                              <td className="py-2 px-3">
                                {vote ? (
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold text-[10px] ${
                                      vote.decision === 'approve'
                                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                        : 'bg-rose-950 text-rose-300 border border-rose-800'
                                    }`}
                                  >
                                    {vote.decision === 'approve' ? 'ОДОБРЕНО' : 'ОТКЛОНЕНО'}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-slate-500 font-mono text-[10px]">
                                    <Clock className="w-3 h-3" /> Ожидает ответа
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-slate-400">{vote?.comment || '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Vote Action Area */}
                {activeReq.status === 'pending_approval' && (
                  <div className="pt-3 border-t border-slate-800 space-y-3">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={voteComment}
                        onChange={e => setVoteComment(e.target.value)}
                        placeholder="Комментарий к вашему голосу (необязательно)..."
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[10px] text-amber-400 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Отказ хотя бы одного участника безвозвратно блокирует операцию</span>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleVote('reject')}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-950 hover:bg-rose-900 border border-rose-700 text-rose-200 rounded-lg font-semibold text-xs transition cursor-pointer"
                        >
                          <ThumbsDown className="w-3.5 h-3.5" />
                          Отклонить
                        </button>
                        <button
                          onClick={() => handleVote('approve')}
                          className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold text-xs transition cursor-pointer shadow-sm"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                          Одобрить
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 text-center text-slate-500">Выберите запрос для просмотра деталей</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
