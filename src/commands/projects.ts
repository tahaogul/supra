import {
  getActiveAccount,
  getAccount,
  getAccounts,
} from '../lib/config.js';
import { getProjects, getProjectApiKeys } from '../lib/supabase.js';
import {
  heading,
  info,
  error,
  spinner,
  createTable,
} from '../utils/ui.js';
import chalk from 'chalk';

export async function projectsCommand(aliasArg?: string): Promise<void> {
  const alias = aliasArg || getActiveAccount();

  if (!alias) {
    info('No active account. Run: supra switch <alias>');
    return;
  }

  const account = getAccount(alias);
  if (!account) {
    error(`Account "${alias}" not found.`);
    return;
  }

  heading(`Projects — ${account.alias} (${account.email})`);

  const spin = spinner('Fetching projects...');

  try {
    const projects = await getProjects(alias);
    spin.stop();

    if (projects.length === 0) {
      info('No projects in this account.');
      return;
    }

    const table = createTable([
      'Ref',
      'Name',
      'Region',
      'Status',
      'Created',
    ]);

    for (const p of projects) {
      table.push([
        p.id,
        p.name,
        p.region,
        p.status === 'ACTIVE_HEALTHY'
          ? chalk.green(p.status)
          : chalk.yellow(p.status),
        new Date(p.created_at).toLocaleDateString(),
      ]);
    }

    console.log(table.toString());
  } catch (err) {
    spin.stop();
    error(`Failed to fetch projects: ${(err as Error).message}`);
  }
}

export async function projectsAllCommand(): Promise<void> {
  const accounts = getAccounts();

  if (accounts.length === 0) {
    info('No accounts added yet. Run: supra add');
    return;
  }

  heading('All Projects Across Accounts');

  const spin = spinner('Fetching all projects...');

  const table = createTable([
    'Account',
    'Ref',
    'Name',
    'Region',
    'Status',
  ]);

  for (const account of accounts) {
    try {
      const projects = await getProjects(account.alias);
      for (const p of projects) {
        table.push([
          account.alias,
          p.id,
          p.name,
          p.region,
          p.status === 'ACTIVE_HEALTHY'
            ? chalk.green('healthy')
            : chalk.yellow(p.status),
        ]);
      }
    } catch {
      table.push([
        account.alias,
        chalk.red('—'),
        chalk.red('auth failed'),
        '—',
        '—',
      ]);
    }
  }

  spin.stop();
  console.log(table.toString());
}
