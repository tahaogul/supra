import { input, password } from '@inquirer/prompts';
import { addAccount, getAccount, isKeychainAvailable } from '../lib/config.js';
import { login } from '../lib/supabase.js';
import { success, error, spinner, warn } from '../utils/ui.js';

interface AddOptions {
  email?: string;
  password?: string;
}

export async function addCommand(
  aliasArg: string | undefined,
  options: AddOptions
): Promise<void> {
  const nonInteractive = options.email && options.password;

  const alias =
    aliasArg ||
    (await input({
      message: 'Alias for this account (e.g. "personal", "work"):',
      validate: (v) => (v.trim() ? true : 'Alias is required'),
    }));

  const existing = getAccount(alias);
  if (existing) {
    error(
      `Account "${alias}" already exists. Remove it first or use a different alias.`
    );
    return;
  }

  const emailAddr = options.email || (await input({
    message: 'Supabase email:',
    validate: (v) => (v.includes('@') ? true : 'Enter a valid email'),
  }));

  const pwd = options.password || (await password({
    message: 'Supabase password:',
    mask: '*',
  }));

  const spin = spinner('Logging in to Supabase...');

  try {
    const auth = await login(emailAddr, pwd);
    // Token'lar OS keychain'e yazılır (dosyaya düz metin yazılmaz)
    await addAccount({
      alias,
      email: emailAddr,
      accessToken: auth.access_token,
      refreshToken: auth.refresh_token,
      expiresAt: Date.now() + auth.expires_in * 1000,
    });
    spin.stop();
    success(`Account "${alias}" (${emailAddr}) added successfully.`);

    // keytar yoksa token dosyada tutulur — kullanıcıyı bilgilendir
    if (!(await isKeychainAvailable())) {
      warn(
        'OS keychain (keytar) unavailable — tokens are stored in a local file with 0600 permissions. Install keytar for stronger protection.'
      );
    }
  } catch (err) {
    spin.stop();
    error(`Failed to add account: ${(err as Error).message}`);
  }
}
