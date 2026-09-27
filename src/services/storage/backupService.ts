/**
 * AES-GCM (256-bit) Encrypted Backup Engine with PBKDF2 Key Derivation.
 * Compliant with OWASP MASVS-STORAGE and MASVS-CRYPTO standards.
 *
 * Security Guarantees:
 * 1. PBKDF2 with 100,000 iterations of SHA-256 + 128-bit cryptographically random salt.
 * 2. AES-GCM authenticated encryption with 96-bit unique IV per export.
 * 3. Enforced Data Sanitization: All personal cloud AI keys (GEMINI_API_KEY, OPENAI_API_KEY),
 *    bank tokens (Monobank/Privat24 API secrets), and private credentials are FORCE-STRIPPED
 *    prior to serialization.
 * 4. Tamper Detection: AES-GCM authentication tag ensures backup cannot be modified in transit.
 */

export interface EncryptedBackupPayload {
  format: 'ERP_ENCRYPTED_BACKUP_V1';
  cipher: 'AES-GCM-256';
  kdf: 'PBKDF2-SHA256';
  iterations: number;
  saltHex: string;
  ivHex: string;
  dataHex: string;
  createdAt: string;
  sanitized: true;
}

export class BackupService {
  private static readonly PBKDF2_ITERATIONS = 100000;
  private static readonly SALT_BYTES = 16;
  private static readonly IV_BYTES = 12;

  /**
   * Sanitizes all sensitive operational secrets (AI keys, banking tokens)
   * from the payload prior to export.
   */
  public static sanitizeDataForBackup(rawPayload: Record<string, any>): Record<string, any> {
    const cloned = JSON.parse(JSON.stringify(rawPayload));

    const sanitizeSecretsDeep = (value: any): any => {
      if (Array.isArray(value)) {
        return value.map(item => sanitizeSecretsDeep(item));
      }

      if (!value || typeof value !== 'object') {
        return value;
      }

      const next: Record<string, any> = {};
      for (const [key, nestedValue] of Object.entries(value)) {
        if (/(api[_-]?key|secret|token|password|passphrase|private[_-]?key|client[_-]?secret|bank[_-]?api|auth[_-]?credentials)/i.test(key)) {
          continue;
        }
        next[key] = sanitizeSecretsDeep(nestedValue);
      }
      return next;
    };

    const sanitized = sanitizeSecretsDeep(cloned);

    // 1. Sanitize Settings
    if (sanitized.settings) {
      delete sanitized.settings.gemini_api_key;
      delete sanitized.settings.openai_api_key;
      delete sanitized.settings.anthropic_api_key;
      delete sanitized.settings.bank_tokens;
      delete sanitized.settings.api_secrets;
      if (sanitized.settings.ai_provider_keys) {
        sanitized.settings.ai_provider_keys = {};
      }
    }

    // 2. Sanitize Accounts
    if (Array.isArray(sanitized.accounts)) {
      for (const acc of sanitized.accounts) {
        delete acc.bank_api_token;
        delete acc.auth_credentials;
        delete acc.client_secret;
      }
    }

    // 3. Strip any transient memory sessions
    delete sanitized.syncSessions;
    delete sanitized.tempTokens;

    return sanitized;
  }

  /**
   * Encrypts plain JSON database payload using AES-GCM (256-bit) and PBKDF2 password derivation.
   */
  public static async createEncryptedBackup(
    data: Record<string, any>,
    masterPassword: string
  ): Promise<EncryptedBackupPayload> {
    if (!masterPassword || masterPassword.length < 6) {
      throw new Error('Master password must be at least 6 characters long.');
    }

    // Enforce data sanitization (zero API keys or bank tokens in exported file)
    const sanitizedData = this.sanitizeDataForBackup(data);
    const jsonString = JSON.stringify(sanitizedData);
    const textEncoder = new TextEncoder();
    const dataBytes = textEncoder.encode(jsonString);

    // Generate random salt and IV
    const salt = crypto.getRandomValues(new Uint8Array(this.SALT_BYTES));
    const iv = crypto.getRandomValues(new Uint8Array(this.IV_BYTES));

    // Derive AES-GCM key using PBKDF2
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      textEncoder.encode(masterPassword),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    const aesKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: this.PBKDF2_ITERATIONS,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );

    // Perform AES-GCM encryption
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      aesKey,
      dataBytes
    );

    return {
      format: 'ERP_ENCRYPTED_BACKUP_V1',
      cipher: 'AES-GCM-256',
      kdf: 'PBKDF2-SHA256',
      iterations: this.PBKDF2_ITERATIONS,
      saltHex: this.buf2hex(salt),
      ivHex: this.buf2hex(iv),
      dataHex: this.buf2hex(new Uint8Array(encryptedBuffer)),
      createdAt: new Date().toISOString(),
      sanitized: true,
    };
  }

  /**
   * Decrypts an AES-GCM encrypted backup file using the user's master password.
   */
  public static async restoreEncryptedBackup(
    payload: EncryptedBackupPayload,
    masterPassword: string
  ): Promise<Record<string, any>> {
    if (payload.format !== 'ERP_ENCRYPTED_BACKUP_V1' || payload.cipher !== 'AES-GCM-256') {
      throw new Error('Unsupported or corrupted backup format.');
    }

    const salt = this.hex2buf(payload.saltHex);
    const iv = this.hex2buf(payload.ivHex);
    const ciphertext = this.hex2buf(payload.dataHex);

    const textEncoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      textEncoder.encode(masterPassword),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    const aesKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: payload.iterations || this.PBKDF2_ITERATIONS,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    try {
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv,
        },
        aesKey,
        ciphertext
      );

      const textDecoder = new TextDecoder();
      const decryptedJson = textDecoder.decode(decryptedBuffer);
      return JSON.parse(decryptedJson);
    } catch {
      throw new Error('Decryption failed. Incorrect master password or corrupted backup file.');
    }
  }

  private static buf2hex(buffer: Uint8Array): string {
    return Array.from(buffer)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private static hex2buf(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
  }
}
