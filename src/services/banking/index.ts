/**
 * Banking Integrations & Statement Parsers
 * Local universal file parser (CSV / Excel .xlsx / .xls) with Windows-1251 decoding
 * and SHA-256 idempotency key deduplication.
 */
export * from './bankingParserService';

import { BankAccount, BankingProvider, BankingTransaction, Currency } from '../../types';

export class MockBankingProvider implements BankingProvider {
  public id = 'mock_bank';
  public name = 'Банковский интегратор (Mock / Open Banking)';
  public supportsWebhooks = true;
  public supportsHistoricalData = true;
  public supportsRealtimeData = true;

  private isConnected = true;

  async connect() {
    this.isConnected = true;
    return { success: true, message: 'Успешное защищенное подключение по протоколу Open Banking (OAuth 2.0 PKCE).' };
  }

  async refreshConnection() {
    return { success: true, message: 'OAuth токен доступа успешно обновлен через Refresh Token.' };
  }

  async getAccounts(): Promise<BankAccount[]> {
    return [
      {
        id: 'mock-acc-1',
        iban: 'UA483052990000026007891234567',
        name: 'Поточний рахунок підприємства',
        currency: 'UAH',
        balance: 245000,
        available_balance: 245000,
        bank_name: 'ПриватБанк для Бізнесу',
      },
      {
        id: 'mock-acc-2',
        iban: 'UA823220010000026001239876543',
        name: 'Корпоративна картка ФОП/ТОВ',
        currency: 'UAH',
        balance: 118400,
        available_balance: 118400,
        bank_name: 'Монобанк (Універсал Банк)',
      },
    ];
  }

  async getBalances() {
    const accs = await this.getAccounts();
    return accs.map(a => ({ account_id: a.id, balance: a.balance, currency: a.currency }));
  }

  async getHistoricalTransactions(): Promise<BankingTransaction[]> {
    return [
      {
        id: 'bank-tx-101',
        account_id: 'mock-acc-1',
        date: '2026-09-08T10:15:00Z',
        amount: 145000,
        currency: 'UAH',
        description: 'Оплата за партію продукції згідно договору №14/09',
        counterparty_name: 'ПП «МегаБуд Сервіс»',
        counterparty_iban: 'UA553220010000026009876543210',
        status: 'confirmed',
        fee: 0,
      },
      {
        id: 'bank-tx-102',
        account_id: 'mock-acc-1',
        date: '2026-09-09T14:20:00Z',
        amount: -48000,
        currency: 'UAH',
        description: 'Оплата за комплектуючі',
        counterparty_name: 'ТОВ «АвтоДеталь Постач»',
        counterparty_iban: 'UA333052990000026001112223334',
        status: 'confirmed',
        fee: 15,
      },
    ];
  }

  async getCurrentTransactions(): Promise<BankingTransaction[]> {
    return this.getHistoricalTransactions();
  }

  async disconnect() {
    this.isConnected = false;
  }
}

/**
 * Universal Bank Statement Parser
 * Parses CSV, OFX, and MT940 bank statement strings into standardized transactions.
 */
export interface ParsedStatementRow {
  date: string;
  amount: number;
  currency: Currency;
  description: string;
  counterparty: string;
  iban?: string;
  type: 'income' | 'expense';
  external_id?: string;
  externalId?: string;
}

export function parseStatementCSV(csvContent: string): ParsedStatementRow[] {
  const lines = csvContent.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  // Determine separator: comma, semicolon, tab
  const header = lines[0];
  let sep = ',';
  if (header.includes(';')) sep = ';';
  else if (header.includes('\t')) sep = '\t';

  const rows: ParsedStatementRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep).map(c => c.replace(/^["']|["']$/g, '').trim());
    if (cols.length < 3) continue;

    // Typical formats: Date, Description, Amount, Currency, Counterparty
    const dateStr = cols[0];
    const desc = cols[1] || 'Операція по виписці';
    const rawAmt = cols[2].replace(/\s/g, '').replace(',', '.');
    const amountNum = parseFloat(rawAmt);
    if (isNaN(amountNum)) continue;

    const currency: Currency = (cols[3]?.toUpperCase() as Currency) || 'UAH';
    const counterparty = cols[4] || 'Контрагент з виписки';

    rows.push({
      date: dateStr.includes('T') ? dateStr : new Date(dateStr).toISOString(),
      amount: Math.abs(amountNum),
      currency,
      description: desc,
      counterparty,
      type: amountNum >= 0 ? 'income' : 'expense',
      external_id: `imp-${i}-${Date.now().toString(36)}`,
    });
  }
  return rows;
}

export function parseStatementOFX(ofxContent: string): ParsedStatementRow[] {
  const rows: ParsedStatementRow[] = [];
  const stmtMatches = ofxContent.match(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi);
  if (!stmtMatches) return rows;

  for (const block of stmtMatches) {
    const trnType = block.match(/<TRNTYPE>(.*?)(\r?\n|<)/i)?.[1]?.trim() || '';
    const dtPosted = block.match(/<DTPOSTED>(.*?)(\r?\n|<)/i)?.[1]?.trim() || '';
    const trnAmt = block.match(/<TRNAMT>(.*?)(\r?\n|<)/i)?.[1]?.trim() || '0';
    const name = block.match(/<NAME>(.*?)(\r?\n|<)/i)?.[1]?.trim() || '';
    const memo = block.match(/<MEMO>(.*?)(\r?\n|<)/i)?.[1]?.trim() || name;
    const fitid = block.match(/<FITID>(.*?)(\r?\n|<)/i)?.[1]?.trim() || '';

    const amount = parseFloat(trnAmt);
    if (isNaN(amount)) continue;

    let isoDate = new Date().toISOString();
    if (dtPosted && dtPosted.length >= 8) {
      const year = dtPosted.substring(0, 4);
      const month = dtPosted.substring(4, 6);
      const day = dtPosted.substring(6, 8);
      isoDate = `${year}-${month}-${day}T12:00:00Z`;
    }

    rows.push({
      date: isoDate,
      amount: Math.abs(amount),
      currency: 'UAH',
      description: memo || 'OFX банківська операція',
      counterparty: name || 'Контрагент',
      type: amount >= 0 ? 'income' : 'expense',
      external_id: fitid,
    });
  }

  return rows;
}

export function parseStatementMT940(mtContent: string): ParsedStatementRow[] {
  const rows: ParsedStatementRow[] = [];
  const lines = mtContent.split(/\r?\n/);
  let currentEntry: Partial<ParsedStatementRow> | null = null;

  for (const line of lines) {
    // :61: Statement line: :61:YYMMDD[MMDD]C/D[currency]Amount...
    if (line.startsWith(':61:')) {
      if (currentEntry && currentEntry.amount) {
        rows.push(currentEntry as ParsedStatementRow);
      }
      const raw = line.substring(4);
      const datePart = raw.substring(0, 6); // YYMMDD
      const year = '20' + datePart.substring(0, 2);
      const month = datePart.substring(2, 4);
      const day = datePart.substring(4, 6);
      const isCredit = raw.includes('C');

      const amtMatch = raw.match(/[CD]([0-9,.]+)/);
      const amount = amtMatch ? parseFloat(amtMatch[1].replace(',', '.')) : 0;

      currentEntry = {
        date: `${year}-${month}-${day}T10:00:00Z`,
        amount: Math.abs(amount),
        currency: 'UAH',
        type: isCredit ? 'income' : 'expense',
        description: 'MT940 банківська операція',
        counterparty: 'Контрагент з виписки',
        external_id: 'mt940-' + Math.random().toString(36).substring(2, 8),
      };
    } else if (line.startsWith(':86:') && currentEntry) {
      currentEntry.description = line.substring(4).trim();
    }
  }

  if (currentEntry && currentEntry.amount) {
    rows.push(currentEntry as ParsedStatementRow);
  }

  return rows;
}
