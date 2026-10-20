import { confirm, select } from '@inquirer/prompts';
import { getAccounts, removeAccount } from '../lib/config.js';
import { success, error, info, warn } from '../utils/ui.js';

export async function removeCommand(aliasArg?: string): Promise<void> {
  const accounts = getAccounts();

  if (accounts.length === 0) {
    info('No accounts to remove.');
    return;
  }

  let alias = aliasArg;

  if (!alias) {
    alias = await select({
      message: 'Select account to remove:',
      choices: accounts.map((a) => ({
        name: `${a.alias} (${a.email})`,
        value: a.alias,
      })),
    });
  }

  const account = accounts.find((a) => a.alias === alias);
  if (!account) {
    error(`Account "${alias}" not found.`);
    return;
  }

  const confirmed = await confirm({
    message: `Remove account "${alias}" (${account.email})? This only removes it from supra, not from Supabase.`,
    default: false,
  });

  if (!confirmed) {
    info('Cancelled.');
    return;
  }

  // Keychain'deki token'lar da silinir
  if (await removeAccount(alias)) {
    success(`Account "${alias}" removed from supra.`);
  } else {
    error(`Failed to remove "${alias}".`);
  }
}
