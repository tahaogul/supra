import { input, password } from '@inquirer/prompts';
import { addAccount, getAccount } from '../lib/config.js';
import { login } from '../lib/supabase.js';
import { success, error, spinner } from '../utils/ui.js';

export async function addCommand(aliasArg?: string): Promise<void> {
  const alias =
    aliasArg ||
    (await input({
      message: 'Alias for this account (e.g. "personal", "work"):',
      validate: (v) => (v.trim() ? true : 'Alias is required'),
    }));

  const existing = getAccount(alias);
  if (existing) {
    error(`Account "${alias}" already exists. Remove it first or use a different alias.`);
    return;
  }

  const email = await input({
    message: 'Supabase email:',
    validate: (v) => (v.includes('@') ? true : 'Enter a valid email'),
  });

  const pwd = await password({
    message: 'Supabase password:',
    mask: '*',
  });

  const spin = spinner('Logging in to Supabase...');

  try {
    const auth = await login(email, pwd);
    addAccount({
      alias,
      email,
      accessToken: auth.access_token,
      refreshToken: auth.refresh_token,
      expiresAt: Date.now() + auth.expires_in * 1000,
    });
    spin.stop();
    success(`Account "${alias}" (${email}) added successfully.`);
  } catch (err) {
    spin.stop();
    error(`Failed to add account: ${(err as Error).message}`);
  }
}
