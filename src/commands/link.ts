import { select } from '@inquirer/prompts';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import {
  getActiveAccount,
  getAccount,
  getAccounts,
} from '../lib/config.js';
import { getProjects, getProjectApiKeys } from '../lib/supabase.js';
import { success, error, info, spinner, heading } from '../utils/ui.js';
import { execSync } from 'child_process';

interface SupraLink {
  accountAlias: string;
  projectRef: string;
  projectName: string;
  supabaseUrl: string;
  anonKey: string;
}

const LINK_FILE = '.supra';

export async function linkCommand(): Promise<void> {
  const accounts = getAccounts();

  if (accounts.length === 0) {
    info('No accounts added yet. Run: supra add');
    return;
  }

  const accountAlias = await select({
    message: 'Select account:',
    choices: accounts.map((a) => ({
      name: `${a.alias} (${a.email})`,
      value: a.alias,
    })),
  });

  const spin = spinner('Fetching projects...');
  let projects;
  try {
    projects = await getProjects(accountAlias);
    spin.stop();
  } catch (err) {
    spin.stop();
    error(`Failed to fetch projects: ${(err as Error).message}`);
    return;
  }

  if (projects.length === 0) {
    info('No projects in this account. Create one in the Supabase dashboard first.');
    return;
  }

  const projectRef = await select({
    message: 'Select project to link:',
    choices: projects.map((p) => ({
      name: `${p.name} (${p.id}) — ${p.region}`,
      value: p.id,
    })),
  });

  const project = projects.find((p) => p.id === projectRef)!;

  const spin2 = spinner('Fetching API keys...');
  try {
    const keys = await getProjectApiKeys(accountAlias, projectRef);
    spin2.stop();

    const anonKey = keys.find((k) => k.name === 'anon')?.api_key || '';

    const linkData: SupraLink = {
      accountAlias,
      projectRef,
      projectName: project.name,
      supabaseUrl: `https://${projectRef}.supabase.co`,
      anonKey,
    };

    writeFileSync(
      join(process.cwd(), LINK_FILE),
      JSON.stringify(linkData, null, 2)
    );

    success(`Linked to "${project.name}" (${projectRef})`);
    info(`Supabase URL: https://${projectRef}.supabase.co`);
    info(`Config saved to .supra`);

    try {
      const account = getAccount(accountAlias)!;
      execSync(
        `npx supabase link --project-ref ${projectRef}`,
        { stdio: 'ignore' }
      );
    } catch {
      // Supabase CLI might not be installed
    }
  } catch (err) {
    spin2.stop();
    error(`Failed to fetch API keys: ${(err as Error).message}`);
  }
}

export async function unlinkCommand(): Promise<void> {
  const linkPath = join(process.cwd(), LINK_FILE);
  if (!existsSync(linkPath)) {
    info('No .supra link file in current directory.');
    return;
  }

  const { unlinkSync } = await import('fs');
  unlinkSync(linkPath);
  success('Unlinked from Supabase project.');
}

export function getLinkInfo(): SupraLink | null {
  const linkPath = join(process.cwd(), LINK_FILE);
  if (!existsSync(linkPath)) return null;
  try {
    return JSON.parse(readFileSync(linkPath, 'utf-8'));
  } catch {
    return null;
  }
}
