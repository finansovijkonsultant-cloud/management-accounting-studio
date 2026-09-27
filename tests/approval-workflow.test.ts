import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { Repository } from '../src/services/storage/repository.ts';

const STORAGE_KEYS = {
  COMPANIES: 'mgmt_acct_companies',
  ACTIVE_COMPANY_ID: 'mgmt_acct_active_company_id',
  USERS: 'mgmt_acct_users',
  CURRENT_USER: 'mgmt_acct_current_user',
  TRANSACTIONS: 'mgmt_acct_transactions',
  ACCOUNTS: 'mgmt_acct_accounts',
  APPROVAL_REQUESTS: 'mgmt_acct_approval_requests',
  SETTINGS: 'mgmt_acct_settings',
};

describe('approval workflow domain enforcement', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    globalThis.localStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => { store.set(key, value); },
      removeItem: (key: string) => { store.delete(key); },
      clear: () => { store.clear(); },
      key: (index: number) => Array.from(store.keys())[index] ?? null,
      length: 0,
    } as Storage;

    (Repository as any).instance = undefined;

    const users = [
      { id: 'usr-owner-1', name: 'Owner', role: 'owner', pin_hash: '1234', email: 'a@a.com', company_id: 'comp-main-001', preferred_business_id: 'comp-main-001' },
      { id: 'usr-director-2', name: 'Director', role: 'director', pin_hash: '5678', email: 'b@b.com', company_id: 'comp-main-001', preferred_business_id: 'comp-main-001' },
    ];

    const accounts = [
      { id: 'acc-1', business_id: 'comp-main-001', name: 'Main', type: 'bank', currency: 'UAH', balance: 1000, initial_balance: 1000, initial_balance_date: '2026-01-01', responsible_person: 'Owner', is_active: true, include_in_calendar: true, created_at: '2026-01-01', updated_at: '2026-01-01', source: 'manual', sync_status: 'synced', version: 1, owner_id: 'usr-owner-1' },
    ];

    const tx = {
      id: 'tx-1',
      business_id: 'comp-main-001',
      date: '2026-01-01',
      type: 'sale',
      account_id: 'acc-1',
      amount: 100,
      currency: 'UAH',
      category_id: 'cat-inc-sale',
      description: 'Demo sale',
      status: 'confirmed',
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
      source: 'manual',
      sync_status: 'synced',
      version: 1,
      owner_id: 'usr-owner-1',
    };

    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify({ id: 'org-test', ai_allow_cloud: false }));
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(users[0]));
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([tx]));
    localStorage.setItem(STORAGE_KEYS.COMPANIES, JSON.stringify([{ id: 'comp-main-001', name: 'Demo', currency: 'UAH', country: 'UA', city: 'Kyiv', tax_regime: 'tax', industry: 'retail', accounting_policy: 'accrual', min_cash_reserve: 0, cash_gap_threshold_days: 30, is_active: true, is_default: true, created_at: '2026-01-01', updated_at: '2026-01-01', source: 'system', sync_status: 'synced', version: 1, owner_id: 'usr-owner-1' }]));
    localStorage.setItem(STORAGE_KEYS.ACTIVE_COMPANY_ID, 'comp-main-001');
    localStorage.setItem(STORAGE_KEYS.APPROVAL_REQUESTS, JSON.stringify([]));
  });

  test('createApprovalRequest does not automatically count the initiator as a vote', () => {
    const repo = Repository.getInstance();

    const result = repo.createApprovalRequest({
      entity_type: 'transaction',
      entity_id: 'tx-1',
      action_type: 'update_transaction',
      reason: 'Need review',
      company_id: 'comp-main-001',
    });

    assert.equal(result.success, true);
    assert.equal(result.request?.status, 'pending_approval');
    assert.ok(result.request?.required_participant_ids.includes('usr-owner-1'));
    assert.ok(result.request?.required_participant_ids.includes('usr-director-2'));
    assert.equal(result.request?.votes.length, 0);
  });

  test('company-scoped delete validation uses company members instead of global list', () => {
    const repo = Repository.getInstance();
    const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) ?? '[]');
    const companyId = 'comp-main-001';

    users.push({ id: 'usr-fin-3', name: 'Finance', role: 'accountant', pin_hash: '9999', email: 'c@c.com', company_id: companyId, preferred_business_id: companyId });
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

    const plan = {
      id: 'p-1',
      business_id: companyId,
      type: 'outflow',
      amount: 50,
      currency: 'UAH',
      account_id: 'acc-1',
      category_id: 'cat-exp',
      planned_date: '2026-01-15',
      responsible_person: 'Owner',
      status: 'planned',
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
      version: 1,
      owner_id: 'usr-owner-1',
    };

    localStorage.setItem('mgmt_acct_payments', JSON.stringify([plan]));

    assert.throws(() => repo.deletePaymentPlan('p-1'), /DIRECT_DELETE_BLOCKED|collective/i);
  });
});
