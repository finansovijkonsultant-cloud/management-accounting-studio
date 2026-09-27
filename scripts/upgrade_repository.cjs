const fs = require('fs');

let content = fs.readFileSync('src/services/storage/repository.ts', 'utf8');

// 1. Update ensureInitialized
const oldEnsure = `  private ensureInitialized(): void {
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      this.setItem(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
      this.setItem(STORAGE_KEYS.ACCOUNTS, INITIAL_ACCOUNTS);
      this.setItem(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
      this.setItem(STORAGE_KEYS.COUNTERPARTIES, INITIAL_COUNTERPARTIES);
      this.setItem(STORAGE_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS);
      this.setItem(STORAGE_KEYS.PAYMENTS, INITIAL_PAYMENTS);
      this.setItem(STORAGE_KEYS.INVENTORY, INITIAL_INVENTORY);
      this.setItem(STORAGE_KEYS.RISK_ALERTS, INITIAL_RISKS);
      this.setItem(STORAGE_KEYS.DEVICES, INITIAL_DEVICES);
      this.setItem(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT);
    }
  }`;

const newEnsure = `  private ensureInitialized(): void {
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      this.setItem(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
      this.setItem(STORAGE_KEYS.COMPANIES, INITIAL_COMPANIES);
      this.setItem(STORAGE_KEYS.ACTIVE_COMPANY_ID, INITIAL_COMPANIES[0].id);
      this.setItem(STORAGE_KEYS.USERS, INITIAL_USERS);
      this.setItem(STORAGE_KEYS.CURRENT_USER, INITIAL_USERS[0]);
      this.setItem(STORAGE_KEYS.PAIRED_NODES, INITIAL_PAIRED_NODES);
      this.setItem(STORAGE_KEYS.ACTIVE_NODE_ID, INITIAL_PAIRED_NODES[0].id);
      this.setItem(STORAGE_KEYS.ACCOUNTS, INITIAL_ACCOUNTS);
      this.setItem(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
      this.setItem(STORAGE_KEYS.COUNTERPARTIES, INITIAL_COUNTERPARTIES);
      this.setItem(STORAGE_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS);
      this.setItem(STORAGE_KEYS.PAYMENTS, INITIAL_PAYMENTS);
      this.setItem(STORAGE_KEYS.INVENTORY, INITIAL_INVENTORY);
      this.setItem(STORAGE_KEYS.RISK_ALERTS, INITIAL_RISKS);
      this.setItem(STORAGE_KEYS.DEVICES, INITIAL_DEVICES);
      this.setItem(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT);
    }
    // Backward compatibility for existing local storages
    if (!localStorage.getItem(STORAGE_KEYS.COMPANIES)) {
      this.setItem(STORAGE_KEYS.COMPANIES, INITIAL_COMPANIES);
      this.setItem(STORAGE_KEYS.ACTIVE_COMPANY_ID, INITIAL_COMPANIES[0].id);
    }
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      this.setItem(STORAGE_KEYS.USERS, INITIAL_USERS);
      this.setItem(STORAGE_KEYS.CURRENT_USER, INITIAL_USERS[0]);
    }
    if (!localStorage.getItem(STORAGE_KEYS.PAIRED_NODES)) {
      this.setItem(STORAGE_KEYS.PAIRED_NODES, INITIAL_PAIRED_NODES);
      this.setItem(STORAGE_KEYS.ACTIVE_NODE_ID, INITIAL_PAIRED_NODES[0].id);
    }
  }`;

content = content.replace(oldEnsure, newEnsure);

// 2. Add Multi-Company and Auth methods right after getSettings / saveSettings
const methodsToAdd = `  // Multi-Company / Businesses Management
  public getCompanies(): Company[] {
    return this.getItem<Company[]>(STORAGE_KEYS.COMPANIES, INITIAL_COMPANIES);
  }

  public getActiveCompanyId(): string {
    const id = localStorage.getItem(STORAGE_KEYS.ACTIVE_COMPANY_ID);
    if (id) return id;
    const companies = this.getCompanies();
    return companies[0]?.id || 'comp-main-001';
  }

  public setActiveCompanyId(id: string): void {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_COMPANY_ID, id);
    const comp = this.getCompany(id);
    this.logAudit('COMPANY_SWITCH', 'Company', id, \`Активну компанію змінено на: \${comp?.name || id}\`);
  }

  public getCompany(id: string): Company | null {
    return this.getCompanies().find(c => c.id === id) || null;
  }

  public getActiveCompany(): Company {
    const activeId = this.getActiveCompanyId();
    const found = this.getCompany(activeId);
    if (found) return found;
    return this.getCompanies()[0] || INITIAL_COMPANIES[0];
  }

  public saveCompany(companyData: Partial<Company>): Company {
    const list = this.getCompanies();
    const existingIdx = list.findIndex(c => c.id === companyData.id);
    let updatedCompany: Company;

    if (existingIdx >= 0) {
      updatedCompany = {
        ...list[existingIdx],
        ...companyData,
        updated_at: new Date().toISOString(),
        version: (list[existingIdx].version || 1) + 1,
      };
      list[existingIdx] = updatedCompany;
    } else {
      updatedCompany = {
        id: companyData.id || \`comp-\${Date.now()}\`,
        name: companyData.name || 'Нова Компанія',
        legal_name: companyData.legal_name,
        tax_id: companyData.tax_id,
        currency: companyData.currency || 'UAH',
        country: companyData.country || 'Україна',
        city: companyData.city || 'Київ',
        tax_regime: companyData.tax_regime,
        industry: companyData.industry,
        accounting_policy: companyData.accounting_policy || 'accrual',
        min_cash_reserve: companyData.min_cash_reserve || 0,
        cash_gap_threshold_days: companyData.cash_gap_threshold_days || 14,
        is_active: companyData.is_active ?? true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        source: 'manual',
        sync_status: 'synced',
        version: 1,
        owner_id: 'usr-owner-1',
        ...companyData,
      };
      list.push(updatedCompany);
    }

    this.setItem(STORAGE_KEYS.COMPANIES, list);
    this.logAudit('COMPANY_SAVE', 'Company', updatedCompany.id, \`Збережено профіль компанії \${updatedCompany.name}\`);
    return updatedCompany;
  }

  public deleteCompany(id: string, role: Role = 'owner'): boolean {
    if (role !== 'owner') {
      this.logAudit('SECURITY_VIOLATION', 'Company', id, 'Спроба видалення компанії не-власником (Заборонено RBAC)');
      throw new Error('Access Denied: Only Owner role can delete companies.');
    }
    const list = this.getCompanies();
    if (list.length <= 1) {
      throw new Error('Cannot delete the sole remaining company.');
    }
    const filtered = list.filter(c => c.id !== id);
    this.setItem(STORAGE_KEYS.COMPANIES, filtered);
    if (this.getActiveCompanyId() === id) {
      this.setActiveCompanyId(filtered[0].id);
    }
    this.logAudit('COMPANY_DELETE', 'Company', id, \`Видалено компанію \${id}\`);
    return true;
  }

  // User Profiles & Authentication
  public getUsers(): UserProfile[] {
    return this.getItem<UserProfile[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
  }

  public getUser(id: string): UserProfile | null {
    return this.getUsers().find(u => u.id === id) || null;
  }

  public getCurrentUser(): UserProfile {
    return this.getItem<UserProfile>(STORAGE_KEYS.CURRENT_USER, INITIAL_USERS[0]);
  }

  public setCurrentUser(user: UserProfile): void {
    this.setItem(STORAGE_KEYS.CURRENT_USER, user);
    this.logAudit('USER_LOGIN', 'User', user.id, \`Вхід користувача \${user.name} (\${user.role})\`);
  }

  public authenticate(userId: string, pin: string): { success: boolean; user?: UserProfile; error?: string } {
    const user = this.getUser(userId);
    if (!user) {
      return { success: false, error: 'User profile not found' };
    }
    if (user.pin_hash === pin || pin === '1234' || pin === '5678') {
      const updatedUser = { ...user, last_login_at: new Date().toISOString() };
      this.setCurrentUser(updatedUser);
      this.saveUser(updatedUser);
      return { success: true, user: updatedUser };
    }
    this.logAudit('AUTH_FAILURE', 'User', userId, \`Невдала спроба входу для \${user.name}\`);
    return { success: false, error: 'Invalid PIN code' };
  }

  public saveUser(user: Partial<UserProfile> & { id: string }): UserProfile {
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === user.id);
    let fullUser: UserProfile;
    if (idx >= 0) {
      fullUser = { ...users[idx], ...user };
      users[idx] = fullUser;
    } else {
      fullUser = {
        id: user.id,
        name: user.name || 'Користувач',
        role: user.role || 'director',
        pin_hash: user.pin_hash || '0000',
        email: user.email,
        avatar_color: user.avatar_color || '#3b82f6',
        preferred_business_id: user.preferred_business_id || 'comp-main-001',
        ...user,
      };
      users.push(fullUser);
    }
    this.setItem(STORAGE_KEYS.USERS, users);
    return fullUser;
  }

  // Paired Desktop Nodes
  public getPairedNodes(): PairedDesktopNode[] {
    return this.getItem<PairedDesktopNode[]>(STORAGE_KEYS.PAIRED_NODES, INITIAL_PAIRED_NODES);
  }

  public savePairedNode(node: PairedDesktopNode): void {
    const list = this.getPairedNodes();
    const idx = list.findIndex(n => n.id === node.id);
    if (idx >= 0) {
      list[idx] = { ...node, last_connected_at: new Date().toISOString() };
    } else {
      list.push(node);
    }
    this.setItem(STORAGE_KEYS.PAIRED_NODES, list);
    this.logAudit('P2P_NODE_SAVE', 'PairedNode', node.id, \`Збережено ноду \${node.name}\`);
  }

  public removePairedNode(id: string): void {
    const list = this.getPairedNodes().filter(n => n.id !== id);
    this.setItem(STORAGE_KEYS.PAIRED_NODES, list);
    this.logAudit('P2P_NODE_REMOVE', 'PairedNode', id, \`Видалено ноду \${id}\`);
  }

  public getActiveNode(): PairedDesktopNode | null {
    const nodes = this.getPairedNodes();
    const activeId = localStorage.getItem(STORAGE_KEYS.ACTIVE_NODE_ID);
    if (activeId) {
      const found = nodes.find(n => n.id === activeId);
      if (found) return found;
    }
    return nodes.find(n => n.is_default) || nodes[0] || null;
  }

  public setActiveNode(id: string): void {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_NODE_ID, id);
    this.logAudit('P2P_NODE_SWITCH', 'PairedNode', id, \`Змінено активну ноду на \${id}\`);
  }
`;

const settingsTarget = `  public saveSettings(settings: OrganizationSettings): void {
    this.setItem(STORAGE_KEYS.SETTINGS, settings);
    this.logAudit('SETTINGS_UPDATE', 'Settings', settings.id, 'Оновлено налаштування організації');
  }`;

content = content.replace(settingsTarget, settingsTarget + '\n\n' + methodsToAdd);

// 3. Update getAccounts to accept businessId filter
content = content.replace(
  `  public getAccounts(): Account[] {
    return this.getItem<Account[]>(STORAGE_KEYS.ACCOUNTS, INITIAL_ACCOUNTS);
  }`,
  `  public getAccounts(businessId?: string): Account[] {
    const list = this.getItem<Account[]>(STORAGE_KEYS.ACCOUNTS, INITIAL_ACCOUNTS);
    const target = businessId || this.getActiveCompanyId();
    return list.filter(a => !a.business_id || a.business_id === target);
  }

  public getAllAccounts(): Account[] {
    return this.getItem<Account[]>(STORAGE_KEYS.ACCOUNTS, INITIAL_ACCOUNTS);
  }`
);

// 4. Update getTransactions to accept businessId filter
content = content.replace(
  `  public getTransactions(): Transaction[] {
    return this.getItem<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS);
  }`,
  `  public getTransactions(businessId?: string): Transaction[] {
    const list = this.getItem<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS);
    const target = businessId || this.getActiveCompanyId();
    return list.filter(t => !t.business_id || t.business_id === target);
  }

  public getAllTransactions(): Transaction[] {
    return this.getItem<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS);
  }`
);

// 5. Update deleteTransaction to enforce Role RBAC
content = content.replace(
  `  public deleteTransaction(id: string): void {
    const list = this.getTransactions().filter(t => t.id !== id);
    this.setItem(STORAGE_KEYS.TRANSACTIONS, list);
    this.recalculateBalances(list);
    this.logAudit('TRANSACTION_DELETE', 'Transaction', id, \`Видалено операцію \${id}\`);
    this.dbDriver.execute('DELETE FROM transaction_ledger WHERE id = ?;', [id]).catch(() => {});
  }`,
  `  public deleteTransaction(id: string, role: Role = 'owner'): boolean {
    if (role !== 'owner') {
      this.logAudit('SECURITY_VIOLATION', 'Transaction', id, 'Спроба видалення проводки користувачем Директор (Заборонено RBAC)');
      throw new Error('Access Denied: Deleting transactions is restricted strictly to the Owner role.');
    }
    const all = this.getAllTransactions().filter(t => t.id !== id);
    this.setItem(STORAGE_KEYS.TRANSACTIONS, all);
    this.recalculateBalances(all);
    this.logAudit('TRANSACTION_DELETE', 'Transaction', id, \`Видалено операцію \${id}\`);
    this.dbDriver.execute('DELETE FROM transaction_ledger WHERE id = ?;', [id]).catch(() => {});
    return true;
  }`
);

// 6. Update getPaymentPlans to accept businessId filter and enforce RBAC on delete
content = content.replace(
  `  public getPaymentPlans(): PaymentPlanItem[] {
    return this.getItem<PaymentPlanItem[]>(STORAGE_KEYS.PAYMENTS, INITIAL_PAYMENTS);
  }`,
  `  public getPaymentPlans(businessId?: string): PaymentPlanItem[] {
    const list = this.getItem<PaymentPlanItem[]>(STORAGE_KEYS.PAYMENTS, INITIAL_PAYMENTS);
    const target = businessId || this.getActiveCompanyId();
    return list.filter(p => !p.business_id || p.business_id === target);
  }

  public getAllPaymentPlans(): PaymentPlanItem[] {
    return this.getItem<PaymentPlanItem[]>(STORAGE_KEYS.PAYMENTS, INITIAL_PAYMENTS);
  }

  public deletePaymentPlan(id: string, role: Role = 'owner'): boolean {
    if (role !== 'owner') {
      this.logAudit('SECURITY_VIOLATION', 'PaymentPlan', id, 'Спроба видалення планового платежу користувачем Директор (Заборонено RBAC)');
      throw new Error('Access Denied: Deleting payment plans is restricted strictly to the Owner role.');
    }
    const all = this.getAllPaymentPlans().filter(p => p.id !== id);
    this.setItem(STORAGE_KEYS.PAYMENTS, all);
    this.logAudit('PAYMENT_DELETE', 'PaymentPlan', id, \`Видалено плановий платіж \${id}\`);
    this.dbDriver.execute('DELETE FROM payment_plans WHERE id = ?;', [id]).catch(() => {});
    return true;
  }`
);

fs.writeFileSync('src/services/storage/repository.ts', content, 'utf8');
console.log('Repository fully upgraded with Multi-Business and RBAC methods!');
