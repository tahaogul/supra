#!/usr/bin/env node

import { Command } from 'commander';
import { addCommand } from './commands/add.js';
import { listCommand } from './commands/list.js';
import { switchCommand } from './commands/switch.js';
import { projectsCommand, projectsAllCommand } from './commands/projects.js';
import { linkCommand, unlinkCommand } from './commands/link.js';
import { statusCommand } from './commands/status.js';
import { removeCommand } from './commands/remove.js';

const program = new Command();

program
  .name('supra')
  .description('Supabase Multi-Account CLI Manager')
  .version('0.1.0');

program
  .command('add [alias]')
  .description('Add a new Supabase account')
  .option('-e, --email <email>', 'Supabase email')
  .option('-p, --password <password>', 'Supabase password')
  .action(addCommand);

program
  .command('list')
  .alias('ls')
  .description('List all accounts with project slots')
  .action(listCommand);

program
  .command('switch [alias]')
  .alias('sw')
  .description('Switch active Supabase account')
  .action(switchCommand);

program
  .command('projects [alias]')
  .alias('ps')
  .description('List projects for an account')
  .action(projectsCommand);

program
  .command('projects-all')
  .alias('pa')
  .description('List all projects across all accounts')
  .action(projectsAllCommand);

program
  .command('link')
  .description('Link current directory to a Supabase project')
  .action(linkCommand);

program
  .command('unlink')
  .description('Remove .supra link from current directory')
  .action(unlinkCommand);

program
  .command('status')
  .alias('st')
  .description('Show overall status and slot usage')
  .action(statusCommand);

program
  .command('remove [alias]')
  .alias('rm')
  .description('Remove an account from supra')
  .action(removeCommand);

program.parse();
