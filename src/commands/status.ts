import { getAccounts, getActiveAccount, getConfigPath } from '../lib/config.js';
import { getProjects } from '../lib/supabase.js';
import {
  heading,
  info,
  spinner,
  createTable,
  slotBar,
} from '../utils/ui.js';
import { getLinkInfo } from './link.js';
import chalk from 'chalk';

const FREE_TIER_LIMIT = 2;

export async function statusCommand(): Promise<void> {
  const accounts = getAccounts();
  const active = getActiveAccount();

  heading('Supra Status');

  if (accounts.length === 0) {
    info('No accounts configured. Run: supra add');
    return;
  }

  const spin = spinner('Fetching status...');

  let totalProjects = 0;
  let totalSlots = accounts.length * FREE_TIER_LIMIT;

  const accountSummaries: Array<{
    alias: string;
    email: string;
    count: number;
    ok: boolean;
  }> = [];

  for (const account of accounts) {
    try {
      const projects = await getProjects(account.alias);
      totalProjects += projects.length;
      accountSummaries.push({
        alias: account.alias,
        email: account.email,
        count: projects.length,
        ok: true,
      });
    } catch {
      accountSummaries.push({
        alias: account.alias,
        email: account.email,
        count: 0,
        ok: false,
      });
    }
  }

  spin.stop();

  console.log(chalk.bold('  Accounts:'), accounts.length);
  console.log(chalk.bold('  Active:'), active ? chalk.green(active) : chalk.gray('none'));
  console.log(
    chalk.bold('  Projects:'),
    `${totalProjects}/${totalSlots}`,
    slotBar(totalProjects, totalSlots)
  );
  console.log(
    chalk.bold('  Free slots:'),
    chalk.green(`${totalSlots - totalProjects}`)
  );
  console.log();

  const table = createTable(['Alias', 'Email', 'Slots', 'Status']);
  for (const s of accountSummaries) {
    table.push([
      s.alias === active ? chalk.green(`► ${s.alias}`) : `  ${s.alias}`,
      s.email,
      slotBar(s.count, FREE_TIER_LIMIT),
      s.ok ? chalk.green('connected') : chalk.red('auth error'),
    ]);
  }
  console.log(table.toString());

  const link = getLinkInfo();
  if (link) {
    console.log();
    info(
      `Current dir linked to: ${chalk.cyan(link.projectName)} (${link.accountAlias})`
    );
  }

  console.log();
  info(`Config: ${getConfigPath()}`);
}
