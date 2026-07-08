import chalk from 'chalk';
import ora, { type Ora } from 'ora';
import Table from 'cli-table3';

export function success(msg: string): void {
  console.log(chalk.green('✓'), msg);
}

export function error(msg: string): void {
  console.log(chalk.red('✗'), msg);
}

export function info(msg: string): void {
  console.log(chalk.blue('ℹ'), msg);
}

export function warn(msg: string): void {
  console.log(chalk.yellow('⚠'), msg);
}

export function heading(msg: string): void {
  console.log(chalk.bold.cyan(`\n${msg}\n`));
}

export function spinner(text: string): Ora {
  return ora({ text, color: 'cyan' }).start();
}

export function createTable(
  head: string[],
  colWidths?: number[]
): Table.Table {
  return new Table({
    head: head.map((h) => chalk.bold.white(h)),
    colWidths,
    style: { head: [], border: ['gray'] },
  });
}

export function slotBar(used: number, total: number): string {
  const filled = chalk.green('█'.repeat(used));
  const empty = chalk.gray('░'.repeat(total - used));
  return `${filled}${empty} ${used}/${total}`;
}
