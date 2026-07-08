import Conf from 'conf';
import { join } from 'path';
import { homedir } from 'os';

export interface AccountConfig {
  alias: string;
  email: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface ProjectLink {
  projectRef: string;
  accountAlias: string;
  name: string;
}

export interface SupraConfig {
  accounts: AccountConfig[];
  activeAccount: string | null;
}

const config = new Conf<SupraConfig>({
  projectName: 'supra',
  defaults: {
    accounts: [],
    activeAccount: null,
  },
});

export function getAccounts(): AccountConfig[] {
  return config.get('accounts');
}

export function getAccount(alias: string): AccountConfig | undefined {
  return getAccounts().find((a) => a.alias === alias);
}

export function addAccount(account: AccountConfig): void {
  const accounts = getAccounts();
  const existing = accounts.findIndex((a) => a.alias === account.alias);
  if (existing >= 0) {
    accounts[existing] = account;
  } else {
    accounts.push(account);
  }
  config.set('accounts', accounts);
}

export function removeAccount(alias: string): boolean {
  const accounts = getAccounts();
  const filtered = accounts.filter((a) => a.alias !== alias);
  if (filtered.length === accounts.length) return false;
  config.set('accounts', filtered);
  if (config.get('activeAccount') === alias) {
    config.set('activeAccount', null);
  }
  return true;
}

export function getActiveAccount(): string | null {
  return config.get('activeAccount');
}

export function setActiveAccount(alias: string | null): void {
  config.set('activeAccount', alias);
}

export function updateAccountTokens(
  alias: string,
  accessToken: string,
  refreshToken: string,
  expiresAt: number
): void {
  const accounts = getAccounts();
  const account = accounts.find((a) => a.alias === alias);
  if (account) {
    account.accessToken = accessToken;
    account.refreshToken = refreshToken;
    account.expiresAt = expiresAt;
    config.set('accounts', accounts);
  }
}

export function getConfigPath(): string {
  return config.path;
}
