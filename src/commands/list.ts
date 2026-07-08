import { getAccounts, getActiveAccount } from '../lib/config.js';
import { getProjects } from '../lib/supabase.js';
import { heading, info, spinner, createTable, slotBar, error } from '../utils/ui.js';
import chalk from 'chalk';

const FREE_TIER_LIMIT = 2;

export async function listCommand(): Promise<void> {
  const accounts = getAccounts();
  const active = getActiveAccount();

  if (accounts.length === 0) {
    info('No accounts added yet. Run: supra add');
    return;
  }

  heading('Supabase Accounts');

  const spin = spinner('Fetching project info...');

  const table = createTable(['', 'Alias', 'Email', 'Projects', 'Slots']);

  let totalProjects = 0;
  let totalSlots = 0;

  for (const account of accounts) {
    try {
      const projects = await getProjects(account.alias);
      const isActive = account.alias === active;
      const marker = isActive ? chalk.green('►') : ' ';

      table.push([
        marker,
        isActive ? chalk.green.bold(account.alias) : account.alias,
        account.email,
        projects.length.toString(),
        slotBar(projects.length, FREE_TIER_LIMIT),
      ]);

      totalProjects += projects.length;
      totalSlots += FREE_TIER_LIMIT;
    } catch (err) {
      table.push([
        account.alias === active ? chalk.green('►') : ' ',
        account.alias,
        account.email,
        chalk.red('error'),
        chalk.red('auth failed'),
      ]);
      totalSlots += FREE_TIER_LIMIT;
    }
  }

  spin.stop();
  console.log(table.toString());
  console.log();
  info(
    `Total: ${totalProjects}/${totalSlots} slots used — ${totalSlots - totalProjects} free`
  );
}
