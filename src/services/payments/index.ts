/**
 * Payment Gateways & Merchant Acquiring Integrations
 * Supports: Stripe-like gateways, LiqPay, WayForPay, settlements reconciliation, webhooks, and MockPaymentProvider.
 */

import { Currency, PaymentProvider, PaymentSettlement } from '../../types';

export interface AcquiringCharge {
  id: string;
  order_id: string;
  amount: number;
  fee: number;
  net_amount: number;
  currency: Currency;
  status: 'succeeded' | 'pending' | 'failed' | 'refunded' | 'chargeback';
  created_at: string;
  customer_email?: string;
  payment_method: string;
}

export class MockPaymentProvider implements PaymentProvider {
  public id = 'mock_acquiring';
  public name = 'Интернет-Эквайринг & Платежный шлюз (Mock)';

  async connect() {
    return { success: true, message: 'Успешное подключение к защищенному шлюзу эквайринга.' };
  }

  async getTransactions() {
    const list: AcquiringCharge[] = [
      {
        id: 'ch_948192',
        order_id: 'ORD-1092',
        amount: 3200,
        fee: 64, // 2% acquiring fee
        net_amount: 3136,
        currency: 'UAH',
        status: 'succeeded',
        created_at: '2026-09-10T16:20:00Z',
        customer_email: 'client@example.com',
        payment_method: 'Apple Pay / Visa',
      },
      {
        id: 'ch_948193',
        order_id: 'ORD-1093',
        amount: 8500,
        fee: 170,
        net_amount: 8330,
        currency: 'UAH',
        status: 'succeeded',
        created_at: '2026-09-11T09:10:00Z',
        customer_email: 'buyer@example.com',
        payment_method: 'MasterCard / Google Pay',
      },
    ];
    return list;
  }

  async getSettlements(): Promise<PaymentSettlement[]> {
    return [
      {
        id: 'stl-20260910',
        date: '2026-09-10',
        gross_amount: 45000,
        fees: 900,
        net_amount: 44100,
        currency: 'UAH',
        status: 'paid',
        payout_date: '2026-09-11',
      },
      {
        id: 'stl-20260911',
        date: '2026-09-11',
        gross_amount: 11700,
        fees: 234,
        net_amount: 11466,
        currency: 'UAH',
        status: 'pending',
      },
    ];
  }

  async getCurrentStatus() {
    return { connected: true, provider: 'Mock Merchant Acquiring' };
  }

  async registerWebhook() {
    return {
      success: true,
      webhook_url: 'https://localhost:3000/api/payments/webhook/mock-acquiring',
    };
  }

  async disconnect() {}
}
