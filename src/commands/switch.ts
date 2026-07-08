import { select } from '@inquirer/prompts';
import {
  getAccounts,
  getAccount,
  setActiveAccount,
  getActiveAccount,
} from '../lib/config.js';
import { success, error, info, spinner } from '../utils/ui.js';
import { getProjects } from '../lib/supabase.js';
import { execSync } from 'child_process';

export async function switchCommand(aliasArg?: string): Promise<void> {
  const accounts = getAccounts();

  if (accounts.length === 0) {
    info('No accounts added yet. Run: supra add');
    return;
  }

  let alias = aliasArg;

  if (!alias) {
    const active = getActiveAccount();
    alias = await select({
      message: 'Select account:',
      choices: accounts.map((a) => ({
        name: `${a.alias} (${a.email})${a.alias === active ? ' ← active' : ''}`,
        value: a.alias,
      })),
    });
  }

  const account = getAccount(alias);
  if (!account) {
    error(`Account "${alias}" not found.`);
    return;
  }

  const spin = spinner(`Switching to "${alias}"...`);

  try {
    await getProjects(alias);

    setActiveAccount(alias);

    try {
      execSync(`npx supabase login --token ${account.accessToken}`, {
        stdio: 'ignore',
      });
    } catch {
      // Supabase CLI might not be installed — that's fine
    }

    spin.stop();
    success(`Switched to "${alias}" (${account.email})`);
  } catch (err) {
    spin.stop();
    error(`Failed to switch: ${(err as Error).message}`);
  }
}
