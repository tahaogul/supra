import { select } from '@inquirer/prompts';
import { writeFileSync, existsSync, readFileSync, appendFileSync, chmodSync } from 'fs';
import { join } from 'path';
import { getAccounts } from '../lib/config.js';
import { getProjects, getProjectApiKeys } from '../lib/supabase.js';
import { success, error, info, spinner, heading, warn } from '../utils/ui.js';
import { execFileSync } from 'child_process';

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

    const linkPath = join(process.cwd(), LINK_FILE);
    // .supra proje anahtarları içerir → yalnızca sahibi okuyabilsin (0600)
    writeFileSync(linkPath, JSON.stringify(linkData, null, 2), { mode: 0o600 });
    try {
      chmodSync(linkPath, 0o600);
    } catch {
      // Windows vb. platformlarda izin ayarlanamayabilir
    }

    success(`Linked to "${project.name}" (${projectRef})`);
    info(`Supabase URL: https://${projectRef}.supabase.co`);
    info(`Config saved to .supra`);

    // .supra ASLA commit edilmemeli — .gitignore'a ekle
    ensureGitignored();

    try {
      // Argümanlar dizi olarak geçirilir (shell yok, enjeksiyon yok)
      execFileSync('npx', ['supabase', 'link', '--project-ref', projectRef], {
        stdio: 'ignore',
        shell: false,
      });
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

/**
 * .supra dosyası proje anahtarları içerdiği için repoya girmemeli.
 * Proje .gitignore'unda yoksa ekler (dosya yoksa oluşturur) ve kullanıcıyı bilgilendirir.
 */
function ensureGitignored(): void {
  const gitignorePath = join(process.cwd(), '.gitignore');
  try {
    if (existsSync(gitignorePath)) {
      const content = readFileSync(gitignorePath, 'utf-8');
      const alreadyListed = content
        .split(/\r?\n/)
        .some((line) => line.trim() === '.supra' || line.trim() === '/.supra');
      if (alreadyListed) return;

      const prefix = content.endsWith('\n') || content === '' ? '' : '\n';
      appendFileSync(gitignorePath, `${prefix}\n# supra project link (contains API keys)\n.supra\n`);
    } else {
      writeFileSync(
        gitignorePath,
        '# supra project link (contains API keys)\n.supra\n'
      );
    }
    info('.supra added to .gitignore — do not commit it.');
  } catch (err) {
    warn(`Could not update .gitignore: ${(err as Error).message}. Add ".supra" manually!`);
  }
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
