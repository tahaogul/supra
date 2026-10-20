import Conf from 'conf';
import { chmodSync, existsSync } from 'fs';
import { dirname } from 'path';

/**
 * GÜVENLİK NOTU (supra PUBLIC bir repo):
 *
 * Eskiden Supabase access/refresh token'ları `conf` paketi ile
 * ~/Library/Preferences/supra-nodejs/config.json içine DÜZ METİN olarak
 * yazılıyordu (encryptionKey yok, dosya izni 0644). Yani makinedeki her
 * kullanıcı/işlem tüm Supabase hesaplarının token'larını okuyabiliyordu.
 *
 * Yeni model:
 *  - Token'lar OS keychain'de (keytar) saklanır.
 *  - `conf` dosyasında YALNIZCA token olmayan meta veri tutulur
 *    (alias, e-posta, son kullanma zamanı).
 *  - keytar kullanılamıyorsa (native modül yüklenemedi) yedek yol olarak
 *    dosya kullanılır AMA dosya 0600, dizin 0700 izinlerine çekilir.
 */

/** Dosyada saklanan, token İÇERMEYEN hesap meta verisi. */
export interface AccountMeta {
  alias: string;
  email: string;
  /** Access token'ın son kullanma zamanı (ms epoch) — gizli bilgi değil. */
  expiresAt: number;
  /**
   * YEDEK YOL: keytar yoksa token'lar burada tutulur.
   * keytar çalışıyorsa bu alanlar bulunmaz.
   */
  accessToken?: string;
  refreshToken?: string;
}

/** Token'larla birlikte tam hesap bilgisi (sadece bellekte dolaşır). */
export interface AccountConfig extends AccountMeta {
  accessToken: string;
  refreshToken: string;
}

export interface ProjectLink {
  projectRef: string;
  accountAlias: string;
  name: string;
}

export interface SupraConfig {
  accounts: AccountMeta[];
  activeAccount: string | null;
}

const KEYCHAIN_SERVICE = 'supra-cli';

const config = new Conf<SupraConfig>({
  projectName: 'supra',
  defaults: {
    accounts: [],
    activeAccount: null,
  },
});

/* ------------------------------------------------------------------ */
/* Dosya izinleri                                                      */
/* ------------------------------------------------------------------ */

/**
 * Config dosyasını ve dizinini sadece sahibinin okuyabileceği hale getirir.
 * Her yazma sonrası ve başlangıçta çağrılır (mevcut kurulumlar için migration).
 */
export function hardenConfigPermissions(): void {
  try {
    const p = config.path;
    if (existsSync(dirname(p))) chmodSync(dirname(p), 0o700);
    if (existsSync(p)) chmodSync(p, 0o600);
  } catch {
    // İzin ayarlanamadıysa sessiz geç (ör. Windows) — işlevselliği bozma
  }
}

// Modül yüklenir yüklenmez mevcut dosyanın iznini düzelt (migration)
hardenConfigPermissions();

/** conf.set sarmalayıcısı: her yazmadan sonra izinleri yeniden sıkılaştır. */
function setAndHarden<K extends keyof SupraConfig>(
  key: K,
  value: SupraConfig[K]
): void {
  config.set(key, value as never);
  hardenConfigPermissions();
}

/* ------------------------------------------------------------------ */
/* Keychain (keytar) — opsiyonel native modül                          */
/* ------------------------------------------------------------------ */

type Keytar = {
  getPassword(service: string, account: string): Promise<string | null>;
  setPassword(service: string, account: string, password: string): Promise<void>;
  deletePassword(service: string, account: string): Promise<boolean>;
};

let keytarPromise: Promise<Keytar | null> | null = null;

/** keytar'ı bir kez yüklemeyi dener; yoksa null döner (yedek yola düşülür). */
function loadKeytar(): Promise<Keytar | null> {
  if (!keytarPromise) {
    // Modül adı değişkende: keytar native bir bağımlılık, kurulu olmayabilir.
    // Statik import derleme/çalışma zamanında patlardı; dinamik import ile
    // yoksa sessizce yedek yola düşülür.
    const moduleName = 'keytar';
    keytarPromise = import(moduleName)
      .then((m) => ((m as { default?: Keytar }).default ?? (m as unknown as Keytar)))
      .catch(() => null);
  }
  return keytarPromise;
}

/** keytar kullanılabiliyor mu? (UI'da uyarı göstermek için) */
export async function isKeychainAvailable(): Promise<boolean> {
  return (await loadKeytar()) !== null;
}

function keyFor(alias: string, kind: 'access' | 'refresh'): string {
  return `${alias}:${kind}`;
}

/* ------------------------------------------------------------------ */
/* Meta veri (senkron — token içermez)                                 */
/* ------------------------------------------------------------------ */

export function getAccounts(): AccountMeta[] {
  return config.get('accounts');
}

export function getAccount(alias: string): AccountMeta | undefined {
  return getAccounts().find((a) => a.alias === alias);
}

export function getActiveAccount(): string | null {
  return config.get('activeAccount');
}

export function setActiveAccount(alias: string | null): void {
  setAndHarden('activeAccount', alias);
}

export function getConfigPath(): string {
  return config.path;
}

/* ------------------------------------------------------------------ */
/* Token'lar (asenkron — keychain)                                     */
/* ------------------------------------------------------------------ */

/**
 * Hesabı token'larıyla birlikte döner.
 * Eski sürümden kalan düz metin token'lar bulunursa otomatik olarak
 * keychain'e taşınır ve dosyadan silinir (migration).
 */
export async function getAccountWithTokens(
  alias: string
): Promise<AccountConfig | undefined> {
  const meta = getAccount(alias);
  if (!meta) return undefined;

  const keytar = await loadKeytar();

  if (keytar) {
    const accessToken = await keytar.getPassword(KEYCHAIN_SERVICE, keyFor(alias, 'access'));
    const refreshToken = await keytar.getPassword(KEYCHAIN_SERVICE, keyFor(alias, 'refresh'));

    if (accessToken && refreshToken) {
      return { ...meta, accessToken, refreshToken };
    }

    // Migration: dosyada kalmış düz metin token'ları keychain'e taşı
    if (meta.accessToken && meta.refreshToken) {
      await setAccountTokens(alias, meta.accessToken, meta.refreshToken, meta.expiresAt);
      return {
        ...meta,
        accessToken: meta.accessToken,
        refreshToken: meta.refreshToken,
      };
    }

    return undefined;
  }

  // Yedek yol: keytar yok → dosyadaki token'lar (dosya 0600'e çekilmiş durumda)
  if (meta.accessToken && meta.refreshToken) {
    return {
      ...meta,
      accessToken: meta.accessToken,
      refreshToken: meta.refreshToken,
    };
  }

  return undefined;
}

/** Token'ları keychain'e (yoksa dosyaya) yazar; dosyadaki kopyaları temizler. */
export async function setAccountTokens(
  alias: string,
  accessToken: string,
  refreshToken: string,
  expiresAt: number
): Promise<void> {
  const keytar = await loadKeytar();
  const accounts = getAccounts();
  const account = accounts.find((a) => a.alias === alias);
  if (!account) return;

  account.expiresAt = expiresAt;

  if (keytar) {
    await keytar.setPassword(KEYCHAIN_SERVICE, keyFor(alias, 'access'), accessToken);
    await keytar.setPassword(KEYCHAIN_SERVICE, keyFor(alias, 'refresh'), refreshToken);
    // Dosyada token BIRAKMA
    delete account.accessToken;
    delete account.refreshToken;
  } else {
    // Yedek yol — dosya 0600 olacak şekilde yazılır
    account.accessToken = accessToken;
    account.refreshToken = refreshToken;
  }

  setAndHarden('accounts', accounts);
}

/** Hesabı ekler/günceller ve token'larını güvenli depoya yazar. */
export async function addAccount(account: AccountConfig): Promise<void> {
  const accounts = getAccounts();
  const meta: AccountMeta = {
    alias: account.alias,
    email: account.email,
    expiresAt: account.expiresAt,
  };

  const existing = accounts.findIndex((a) => a.alias === account.alias);
  if (existing >= 0) {
    accounts[existing] = meta;
  } else {
    accounts.push(meta);
  }
  setAndHarden('accounts', accounts);

  await setAccountTokens(
    account.alias,
    account.accessToken,
    account.refreshToken,
    account.expiresAt
  );
}

/** Hesabı ve keychain'deki token'larını siler. */
export async function removeAccount(alias: string): Promise<boolean> {
  const accounts = getAccounts();
  const filtered = accounts.filter((a) => a.alias !== alias);
  if (filtered.length === accounts.length) return false;

  setAndHarden('accounts', filtered);
  if (config.get('activeAccount') === alias) {
    setAndHarden('activeAccount', null);
  }

  const keytar = await loadKeytar();
  if (keytar) {
    try {
      await keytar.deletePassword(KEYCHAIN_SERVICE, keyFor(alias, 'access'));
      await keytar.deletePassword(KEYCHAIN_SERVICE, keyFor(alias, 'refresh'));
    } catch {
      // Keychain kaydı zaten yoksa sorun değil
    }
  }

  return true;
}

/** Token yenileme sonrası çağrılır. */
export async function updateAccountTokens(
  alias: string,
  accessToken: string,
  refreshToken: string,
  expiresAt: number
): Promise<void> {
  await setAccountTokens(alias, accessToken, refreshToken, expiresAt);
}
