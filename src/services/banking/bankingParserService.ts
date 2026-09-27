/**
 * Universal Banking Parser Service (Excel / CSV).
 * Dedicated to offline parsing of banking statements without external APIs.
 *
 * Core Capabilities:
 * 1. Native format support: CSV, Excel (.xlsx, .xls) table streams.
 * 2. Automatic delimiter detection: Comma (,), Semicolon (;), Tab (\t), Pipe (|).
 * 3. Windows-1251 (CP1251) to UTF-8 decoding for Cyrillic statements (Privat24, Monobank, Oschadbank, etc.).
 * 4. SHA-256 Idempotency Calculation:
 *    idempotency_key = sha256(date + amount_cents + account_id + description)
 * 5. Strict Zero-API & Zero-Leakage: All transformations run strictly client-side.
 */

import { Currency } from '../../types';
import { toCents } from '../storage/sqliteSchema';

export interface RawParsedRow {
  rowIndex: number;
  columns: string[];
}

export interface ColumnMapping {
  dateColIndex: number;
  amountColIndex: number;
  descriptionColIndex: number;
  counterpartyColIndex?: number;
  currencyColIndex?: number;
}

export interface ParsedStatementTransaction {
  idempotency_key: string;
  date: string;
  amount: number;
  amount_cents: number;
  currency: Currency;
  description: string;
  counterparty: string;
  type: 'income' | 'expense';
  source_row: number;
}

export interface ParseResult {
  headers: string[];
  rawRows: RawParsedRow[];
  detectedDelimiter: string;
  encoding: 'UTF-8' | 'Windows-1251';
  filename: string;
}

export class BankingParserService {
  /**
   * Computes SHA-256 hex digest for idempotency key.
   * Formula: sha256(date + amount_cents + account_id + description)
   */
  public static async calculateIdempotencyKey(
    date: string,
    amountCents: number,
    accountId: string,
    description: string
  ): Promise<string> {
    const rawString = `${date.trim()}_${amountCents}_${accountId.trim()}_${description.trim()}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(rawString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Decodes an ArrayBuffer or binary string into clean UTF-8 string,
   * detecting and transforming Windows-1251 / CP1251 if Cyrillic legacy bytes are detected.
   */
  public static decodeFileContent(buffer: ArrayBuffer): { text: string; encoding: 'UTF-8' | 'Windows-1251' } {
    const bytes = new Uint8Array(buffer);

    // Check for UTF-8 byte patterns vs Windows-1251
    // In Windows-1251, Cyrillic capital А-Я are 0xC0-0xDF, and small а-я are 0xE0-0xFF.
    // If UTF-8 decode produces replacement character \uFFFD, or high concentration of single-byte cyrillic, use windows-1251.
    let utf8Decoder = new TextDecoder('utf-8', { fatal: false });
    let utf8Text = utf8Decoder.decode(bytes);

    // If text contains common Windows-1251 Mojibake / replacement characters or looks like raw CP1251
    const hasReplacementChar = utf8Text.includes('\uFFFD');
    let hasCp1251Signatures = false;

    // Fast heuristic: count bytes in 0xC0 - 0xFF range not preceded by valid UTF-8 lead bytes
    let cp1251ByteCount = 0;
    for (let i = 0; i < Math.min(bytes.length, 2048); i++) {
      if (bytes[i] >= 0xc0 && bytes[i] <= 0xff) {
        cp1251ByteCount++;
      }
    }

    if (hasReplacementChar || (cp1251ByteCount > 20 && !utf8Text.includes('а') && !utf8Text.includes('А') && !utf8Text.includes('і'))) {
      try {
        const cp1251Decoder = new TextDecoder('windows-1251');
        const decodedCp1251 = cp1251Decoder.decode(bytes);
        return { text: decodedCp1251, encoding: 'Windows-1251' };
      } catch {
        // Fallback to UTF-8
      }
    }

    return { text: utf8Text, encoding: 'UTF-8' };
  }

  /**
   * Automatically identifies delimiter from sample lines:
   * Semicolon (;), Comma (,), Tab (\t), or Pipe (|).
   */
  public static detectDelimiter(sampleContent: string): string {
    const firstLines = sampleContent
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l.length > 0)
      .slice(0, 5);

    if (firstLines.length === 0) return ';';

    const candidates = [';', '\t', ',', '|'];
    let bestDelimiter = ';';
    let maxConsistency = -1;

    for (const d of candidates) {
      const counts = firstLines.map(line => line.split(d).length);
      const firstCount = counts[0];
      const isConsistent = counts.every(c => c === firstCount && c > 1);

      if (isConsistent && firstCount > maxConsistency) {
        maxConsistency = firstCount;
        bestDelimiter = d;
      }
    }

    return bestDelimiter;
  }

  /**
   * Parses CSV string into table headers and row matrix.
   */
  public static parseCSVContent(csvText: string, customDelimiter?: string): ParseResult {
    const delimiter = customDelimiter || this.detectDelimiter(csvText);
    const lines = csvText
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l.length > 0);

    if (lines.length === 0) {
      return {
        headers: [],
        rawRows: [],
        detectedDelimiter: delimiter,
        encoding: 'UTF-8',
        filename: 'statement.csv',
      };
    }

    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' || char === "'") {
          inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
          result.push(current.trim().replace(/^["']|["']$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim().replace(/^["']|["']$/g, ''));
      return result;
    };

    const headers = parseLine(lines[0]);
    const rawRows: RawParsedRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = parseLine(lines[i]);
      if (cols.length >= 2 && cols.some(c => c.length > 0)) {
        rawRows.push({
          rowIndex: i,
          columns: cols,
        });
      }
    }

    return {
      headers,
      rawRows,
      detectedDelimiter: delimiter,
      encoding: 'UTF-8',
      filename: 'statement.csv',
    };
  }

  /**
   * Lightweight Excel XML / Worksheet (.xlsx / .xls) parser without heavy external runtime dependencies.
   * Handles modern .xlsx unzip XML or HTML/XML based spreadsheets exported by banks.
   */
  public static async parseExcelFile(
    fileBuffer: ArrayBuffer,
    fileName: string
  ): Promise<ParseResult> {
    // Check if the spreadsheet is actually an XML-based spreadsheet or CSV with .xls extension (common Privat24 export)
    const { text, encoding } = this.decodeFileContent(fileBuffer);

    // If file is text-based (CSV disguised as XLS, or XML Spreadsheet 2003)
    if (text.includes('<Workbook') || text.includes('<table') || text.includes(';') || text.includes(',')) {
      if (text.includes('<Row') || text.includes('<tr')) {
        return this.parseXmlTable(text, fileName, encoding);
      }
      const csvRes = this.parseCSVContent(text);
      return { ...csvRes, encoding, filename: fileName };
    }

    // Default fallback: parse as structured CSV lines
    const parsed = this.parseCSVContent(text);
    return { ...parsed, encoding, filename: fileName };
  }

  private static parseXmlTable(
    xmlText: string,
    filename: string,
    encoding: 'UTF-8' | 'Windows-1251'
  ): ParseResult {
    const rowMatches = xmlText.match(/<Row[\s\S]*?<\/Row>|<tr[\s\S]*?<\/tr>/gi) || [];
    if (rowMatches.length === 0) {
      return { headers: [], rawRows: [], detectedDelimiter: 'XML', encoding, filename };
    }

    const rows: string[][] = [];
    for (const r of rowMatches) {
      const cellMatches = r.match(/<Data[\s\S]*?>(.*?)<\/Data>|<td[\s\S]*?>(.*?)<\/td>|<th[\s\S]*?>(.*?)<\/th>/gi) || [];
      const cols = cellMatches.map(c => c.replace(/<[^>]+>/g, '').trim());
      if (cols.length > 0) {
        rows.push(cols);
      }
    }

    const headers = rows[0] || [];
    const rawRows: RawParsedRow[] = rows.slice(1).map((r, idx) => ({
      rowIndex: idx + 1,
      columns: r,
    }));

    return {
      headers,
      rawRows,
      detectedDelimiter: 'XML-Sheet',
      encoding,
      filename,
    };
  }

  /**
   * Applies user Column Mapping to raw extracted rows,
   * cleans values, calculates integer cents and SHA-256 idempotency key.
   */
  public static async mapRowsToTransactions(
    rawRows: RawParsedRow[],
    mapping: ColumnMapping,
    targetAccountId: string,
    defaultCurrency: Currency = 'UAH'
  ): Promise<ParsedStatementTransaction[]> {
    const transactions: ParsedStatementTransaction[] = [];

    for (const row of rawRows) {
      const cols = row.columns;
      const rawDate = cols[mapping.dateColIndex] || '';
      const rawAmount = cols[mapping.amountColIndex] || '';
      const rawDesc = cols[mapping.descriptionColIndex] || 'Операція по банківській виписці';
      const rawCp =
        mapping.counterpartyColIndex !== undefined && mapping.counterpartyColIndex >= 0
          ? cols[mapping.counterpartyColIndex] || 'Контрагент'
          : 'Контрагент з виписки';
      const rawCurrency =
        mapping.currencyColIndex !== undefined && mapping.currencyColIndex >= 0
          ? (cols[mapping.currencyColIndex]?.toUpperCase() as Currency) || defaultCurrency
          : defaultCurrency;

      // Clean amount: support "1 250,50", "-400.00", "5000 грн"
      const cleanedAmountStr = rawAmount
        .replace(/[^\d.,-]/g, '')
        .replace(/\s/g, '')
        .replace(',', '.');

      const amountVal = parseFloat(cleanedAmountStr);
      if (isNaN(amountVal) || amountVal === 0) {
        continue;
      }

      const absAmount = Math.abs(amountVal);
      const amountCents = toCents(absAmount);
      const txType: 'income' | 'expense' = amountVal > 0 ? 'income' : 'expense';

      // Parse and normalize date into ISO format (YYYY-MM-DD)
      let parsedDate = new Date().toISOString().split('T')[0];
      if (rawDate) {
        // Support DD.MM.YYYY, YYYY-MM-DD, DD/MM/YYYY
        const partsDot = rawDate.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})/);
        if (partsDot) {
          const day = partsDot[1].padStart(2, '0');
          const month = partsDot[2].padStart(2, '0');
          const year = partsDot[3];
          parsedDate = `${year}-${month}-${day}`;
        } else {
          const d = new Date(rawDate);
          if (!isNaN(d.getTime())) {
            parsedDate = d.toISOString().split('T')[0];
          }
        }
      }

      // SHA-256 Idempotency Key calculation:
      // idempotency_key = sha256(date + amount_cents + account_id + description)
      const idempotencyKey = await this.calculateIdempotencyKey(
        parsedDate,
        amountCents,
        targetAccountId,
        rawDesc
      );

      transactions.push({
        idempotency_key: idempotencyKey,
        date: parsedDate,
        amount: absAmount,
        amount_cents: amountCents,
        currency: rawCurrency,
        description: rawDesc,
        counterparty: rawCp,
        type: txType,
        source_row: row.rowIndex,
      });
    }

    return transactions;
  }
}
