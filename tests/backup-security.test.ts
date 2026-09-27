import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { BackupService } from '../src/services/storage/backupService.ts';

describe('encrypted backup security', () => {
  test('sanitizes secrets and restores encrypted payload', async () => {
    const source = {
      settings: {
        ai_provider_keys: { gemini: 'secret-key' },
        ai_allow_cloud: false,
      },
      accounts: [{ id: 'acc-1', bank_api_token: 'bank-secret', balance: 1250 }],
    };

    const backup = await BackupService.createEncryptedBackup(source, 'strong-passphrase');
    const restored = await BackupService.restoreEncryptedBackup(backup, 'strong-passphrase');

    assert.equal(backup.format, 'ERP_ENCRYPTED_BACKUP_V1');
    assert.equal(backup.cipher, 'AES-GCM-256');
    assert.equal(backup.kdf, 'PBKDF2-SHA256');
    assert.deepEqual(restored.settings.ai_provider_keys, {});
    assert.equal(restored.accounts[0].bank_api_token, undefined);
    assert.equal(restored.accounts[0].balance, 1250);
  });

  test('rejects an incorrect password', async () => {
    const backup = await BackupService.createEncryptedBackup({ value: 'protected' }, 'strong-passphrase');

    await assert.rejects(
      BackupService.restoreEncryptedBackup(backup, 'wrong-passphrase'),
      /Decryption failed/,
    );
  });
});