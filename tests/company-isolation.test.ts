import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { Repository } from '../src/services/storage/repository.ts';

const keys = {
  settings: 'mgmt_acct_settings',
  activeCompany: 'mgmt_acct_active_company_id',
  companies: 'mgmt_acct_companies',
  accounts: 'mgmt_acct_accounts',
  transactions: 'mgmt_acct_transactions',
  payments: 'mgmt_acct_payments',
  inventory: 'mgmt_acct_inventory',
  users: 'mgmt_acct_users',
};

describe('company-scoped repository reads', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    globalThis.localStorage = {
      getItem: key => store.get(key) ?? null,
      setItem: (key, value) => { store.set(key, value); },
      removeItem: key => { store.delete(key); },
      clear: () => { store.clear(); },
      key: index => Array.from(store.keys())[index] ?? null,
      length: 0,
    } as Storage;

    (Repository as any).instance = undefined;
    localStorage.setItem(keys.settings, JSON.stringify({ id: 'org-test', ai_allow_cloud: false }));
    localStorage.setItem(keys.activeCompany, JSON.stringify('company-a'));
    localStorage.setItem(keys.companies, JSON.stringify([
      { id: 'company-a', name: 'A' },
      { id: 'company-b', name: 'B' },
    ]));
    localStorage.setItem(keys.accounts, JSON.stringify([
      { id: 'account-a', business_id: 'company-a' },
      { id: 'account-b', business_id: 'company-b' },
    ]));
    localStorage.setItem(keys.transactions, JSON.stringify([
      { id: 'transaction-a', business_id: 'company-a' },
      { id: 'transaction-b', business_id: 'company-b' },
    ]));
    localStorage.setItem(keys.payments, JSON.stringify([
      { id: 'payment-a', business_id: 'company-a' },
      { id: 'payment-b', business_id: 'company-b' },
    ]));
    localStorage.setItem(keys.inventory, JSON.stringify([
      { id: 'inventory-a', business_id: 'company-a' },
      { id: 'inventory-b', business_id: 'company-b' },
    ]));
    localStorage.setItem(keys.users, JSON.stringify([
      { id: 'user-a', name: 'A', role: 'owner', company_id: 'company-a' },
      { id: 'user-b', name: 'B', role: 'owner', company_id: 'company-b' },
      { id: 'unscoped-user', name: 'Unscoped', role: 'owner' },
    ]));
  });

  test('returns only records belonging to the requested company', () => {
    const repository = Repository.getInstance();

    assert.deepEqual(repository.getAccounts('company-a').map(item => item.id), ['account-a']);
    assert.deepEqual(repository.getTransactions('company-a').map(item => item.id), ['transaction-a']);
    assert.deepEqual(repository.getPaymentPlans('company-a').map(item => item.id), ['payment-a']);
    assert.deepEqual(repository.getInventory('company-a').map(item => item.id), ['inventory-a']);
    assert.deepEqual(repository.getUsersByCompany('company-a').map(item => item.id), ['user-a']);
  });

  test('writes audit entries with the active company context', () => {
    const repository = Repository.getInstance();

    repository.logAudit('TEST', 'Company', 'company-a', 'Company-scoped audit entry');

    const logs = repository.getAuditLogs('company-a');
    assert.equal(logs.length, 1);
    assert.equal(logs[0].business_id, 'company-a');
  });
});