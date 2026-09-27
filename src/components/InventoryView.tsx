import React, { useState } from 'react';
import {
  Boxes,
  Plus,
  AlertTriangle,
  ClipboardCheck,
  Search,
  ArrowDownUp,
  X,
  CheckCircle2,
  Mic,
} from 'lucide-react';
import { TranslationDictionary } from '../i18n';
import { Currency, InventoryItem } from '../types';
import { VoiceInputDialog } from './VoiceInputDialog';

interface InventoryViewProps {
  t: TranslationDictionary;
  inventory?: InventoryItem[];
  aiMode?: string;
  onAddItem?: (item: Partial<InventoryItem>) => void;
  onSaveItem?: (item: any) => void;
  onUpdateQuantity?: (id: string, newQty: number) => void;
  onRecordMovement?: (movement: any) => void;
  currency?: Currency;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  t,
  inventory = [],
  aiMode = 'ollama',
  onAddItem,
  onSaveItem,
  onUpdateQuantity,
  onRecordMovement,
  currency = 'UAH',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isStocktakeModalOpen, setIsStocktakeModalOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [stocktakeActuals, setStocktakeActuals] = useState<Record<string, number>>({});

  const getItemQty = (item: InventoryItem) => item.quantity ?? item.quantity_on_hand ?? 0;
  const getItemMin = (item: InventoryItem) => item.min_threshold ?? item.min_quantity ?? 5;

  const handleAdd = (item: Partial<InventoryItem>) => {
    if (onAddItem) {
      onAddItem(item);
    } else if (onSaveItem) {
      const fullItem: InventoryItem = {
        id: item.id || 'inv-' + Date.now(),
        name: item.name || '',
        sku: item.sku || '',
        category: item.category || 'Товары',
        unit: item.unit || 'шт',
        warehouse: item.warehouse || 'Основной склад',
        quantity: Number(item.quantity) || 0,
        quantity_on_hand: Number(item.quantity) || 0,
        min_quantity: Number(item.min_threshold) || 5,
        min_threshold: Number(item.min_threshold) || 5,
        max_quantity: 1000,
        cost_price: Number(item.cost_price) || 0,
        sale_price: Number(item.sale_price) || 0,
        responsible_person: 'Складской менеджер',
        last_movement_date: new Date().toISOString().substring(0, 10),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1,
        sync_status: 'synced',
        source: 'manual',
        owner_id: 'usr-owner-1',
      };
      onSaveItem(fullItem);
    }
  };

  const handleQtyUpdate = (id: string, newQty: number) => {
    if (onUpdateQuantity) {
      onUpdateQuantity(id, newQty);
    } else if (onRecordMovement) {
      const item = (inventory || []).find(i => i.id === id);
      const currentQty = item ? getItemQty(item) : 0;
      const diff = newQty - currentQty;
      onRecordMovement({
        id: 'mov-' + Date.now(),
        item_id: id,
        type: diff >= 0 ? 'surplus' : 'shortage',
        quantity: Math.abs(diff),
        cost_price: item?.cost_price || 0,
        date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1,
        sync_status: 'synced',
        source: 'manual',
        owner_id: 'usr-owner-1',
      });
    }
  };

  // Add Item State
  const [newItem, setNewItem] = useState<{
    name: string;
    sku: string;
    category: string;
    warehouse: string;
    quantity: number;
    unit: string;
    cost_price: number;
    sale_price: number;
    min_threshold: number;
  }>({
    name: '',
    sku: '',
    category: 'Товары',
    warehouse: 'Основной склад',
    quantity: 0,
    unit: 'шт',
    cost_price: 0,
    sale_price: 0,
    min_threshold: 5,
  });

  const filtered = (inventory || []).filter(item => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      item.sku.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
  });

  const totalValuation = (inventory || []).reduce((sum, item) => sum + getItemQty(item) * item.cost_price, 0);
  const lowStockCount = (inventory || []).filter(item => getItemQty(item) <= getItemMin(item)).length;

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name || newItem.cost_price < 0) {
      alert('Заполните обязательные поля позиции.');
      return;
    }
    handleAdd({
      ...newItem,
      quantity: Number(newItem.quantity),
      cost_price: Number(newItem.cost_price),
      sale_price: Number(newItem.sale_price),
      min_threshold: Number(newItem.min_threshold),
      currency: currency,
    });
    setIsAddModalOpen(false);
  };

  const openStocktake = () => {
    const initial: Record<string, number> = {};
    (inventory || []).forEach(item => {
      initial[item.id] = getItemQty(item);
    });
    setStocktakeActuals(initial);
    setIsStocktakeModalOpen(true);
  };

  const applyStocktake = () => {
    Object.entries(stocktakeActuals).forEach(([id, actualQty]) => {
      handleQtyUpdate(id, Number(actualQty));
    });
    setIsStocktakeModalOpen(false);
    alert('Результаты инвентаризации утверждены. Складские остатки обновлены.');
  };

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'UAH',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">{t.inventory.title}</h2>
          <p className="text-xs text-slate-400">
            Учет товаров, сырья, готовой продукции, складских остатков и проведение инвентаризации
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsVoiceModalOpen(true)}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer shadow-sm"
          >
            <Mic className="w-4 h-4" />
            Голосовой ввод
          </button>
          <button
            onClick={openStocktake}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer"
          >
            <ClipboardCheck className="w-4 h-4 text-teal-400" />
            Провести инвентаризацию
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Добавить позицию
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm">
          <div className="text-slate-400 text-xs mb-1">Суммарная себестоимость запасов</div>
          <div className="text-2xl font-bold text-white font-mono">{formatMoney(totalValuation)}</div>
          <div className="text-xs text-slate-500 mt-1">Оценка по FIFO / Средней себестоимости</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm">
          <div className="text-slate-400 text-xs mb-1">Номенклатурных позиций</div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">{inventory.length}</div>
          <div className="text-xs text-slate-500 mt-1">На всех складах компании</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm">
          <div className="text-slate-400 text-xs mb-1">Позиций ниже нормы (Low Stock)</div>
          <div className={`text-2xl font-bold font-mono ${lowStockCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {lowStockCount}
          </div>
          <div className="text-xs text-slate-500 mt-1">Требуют пополнения / закупки</div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Поиск по артикулу (SKU), названию или категории..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="bg-transparent text-slate-100 placeholder-slate-400 focus:outline-none w-full text-xs"
        />
      </div>

      {/* Inventory Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Артикул (SKU)</th>
                <th className="py-3 px-4">Наименование</th>
                <th className="py-3 px-4">Категория</th>
                <th className="py-3 px-4">Склад</th>
                <th className="py-3 px-4 text-center">Остаток</th>
                <th className="py-3 px-4 text-right">Себестоимость</th>
                <th className="py-3 px-4 text-right">Цена продажи</th>
                <th className="py-3 px-4 text-right">Оценка на складе</th>
                <th className="py-3 px-4 text-center">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filtered.map(item => {
                const qty = getItemQty(item);
                const minVal = getItemMin(item);
                const isLow = qty <= minVal;
                const valuation = qty * item.cost_price;

                return (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono text-slate-400">{item.sku}</td>
                    <td className="py-3 px-4 font-medium text-white">{item.name}</td>
                    <td className="py-3 px-4 text-slate-300">{item.category}</td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">{item.warehouse}</td>
                    <td className="py-3 px-4 text-center font-bold font-mono">
                      {qty} {item.unit}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-300">
                      {formatMoney(item.cost_price)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-400 font-medium">
                      {formatMoney(item.sale_price)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-white font-bold">
                      {formatMoney(valuation)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {isLow ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-950/80 text-amber-300 border border-amber-800">
                          <AlertTriangle className="w-2.5 h-2.5" /> Мало
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                          <CheckCircle2 className="w-2.5 h-2.5" /> В норме
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Item Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                Добавить позицию номенклатуры
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Наименование</label>
                  <input
                    type="text"
                    required
                    placeholder="Например: Кабель силовой ВВГнг 3x2.5"
                    value={newItem.name}
                    onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Артикул (SKU)</label>
                  <input
                    type="text"
                    required
                    placeholder="SKU-..."
                    value={newItem.sku}
                    onChange={e => setNewItem({ ...newItem, sku: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Категория</label>
                  <input
                    type="text"
                    value={newItem.category}
                    onChange={e => setNewItem({ ...newItem, category: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Склад хранения</label>
                  <input
                    type="text"
                    value={newItem.warehouse}
                    onChange={e => setNewItem({ ...newItem, warehouse: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Количество</label>
                  <input
                    type="number"
                    value={newItem.quantity || ''}
                    onChange={e => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Себестоимость</label>
                  <input
                    type="number"
                    value={newItem.cost_price || ''}
                    onChange={e => setNewItem({ ...newItem, cost_price: parseFloat(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Цена продажи</label>
                  <input
                    type="number"
                    value={newItem.sale_price || ''}
                    onChange={e => setNewItem({ ...newItem, sale_price: parseFloat(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-2 rounded-lg cursor-pointer transition shadow-sm"
                >
                  Сохранить позицию
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Physical Audit (Stocktake) Modal */}
      {isStocktakeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-teal-400" />
                Проведение инвентаризации остатков
              </h3>
              <button
                onClick={() => setIsStocktakeModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-slate-400 text-xs">
              Введите фактически пересчитанное количество на складе. Система рассчитает недостачи или излишки и сгенерирует корректирующие проводки.
            </p>

            <div className="max-h-80 overflow-y-auto space-y-2">
              {(inventory || []).map(item => {
                const itemQty = getItemQty(item);
                const actual = stocktakeActuals[item.id] ?? itemQty;
                const diff = actual - itemQty;

                return (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-800/60 rounded-xl border border-slate-800 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="font-medium text-white">{item.name}</div>
                      <div className="text-slate-400 text-[11px] font-mono">
                        Учетный остаток: {itemQty} {item.unit}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400 text-[11px]">Факт:</span>
                        <input
                          type="number"
                          value={actual}
                          onChange={e =>
                            setStocktakeActuals({
                              ...stocktakeActuals,
                              [item.id]: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono text-center focus:outline-none"
                        />
                      </div>

                      <div className="w-24 text-right font-mono font-bold text-xs">
                        {diff === 0 ? (
                          <span className="text-slate-500">0</span>
                        ) : diff > 0 ? (
                          <span className="text-emerald-400">+{diff} (излишек)</span>
                        ) : (
                          <span className="text-rose-400">{diff} (недостача)</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsStocktakeModalOpen(false)}
                className="px-4 py-2 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={applyStocktake}
                className="bg-teal-600 hover:bg-teal-500 text-white font-semibold px-5 py-2 rounded-lg cursor-pointer transition shadow-sm"
              >
                Утвердить результаты инвентаризации
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Voice Recognition & Structured Stock Movement Input */}
      <VoiceInputDialog
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        targetType="inventory"
        aiMode={aiMode}
        currency={currency}
        onConfirm={parsedItem => {
          handleAdd({
            name: parsedItem.name || 'Товар из голосовой записи',
            sku: parsedItem.sku || 'SKU-VOICE-' + Date.now().toString(36),
            quantity: Number(parsedItem.quantity) || 1,
            cost_price: Number(parsedItem.cost_price) || 0,
            sale_price: Number(parsedItem.sale_price) || 0,
            unit: parsedItem.unit || 'шт',
            warehouse: parsedItem.warehouse || 'Основной склад',
            category: parsedItem.category || 'Автозапчасти',
            currency: (currency as Currency) || 'UAH',
          });
        }}
      />
    </div>
  );
};
