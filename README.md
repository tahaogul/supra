# Supra

**Supabase Multi-Account CLI Manager**

Manage multiple Supabase accounts from one terminal. Supabase free tier limits you to 2 projects per account — Supra lets you manage multiple accounts and their project slots from a single CLI.

## Install

```bash
npm install -g supra-cli
```

## Usage

```bash
# Add accounts
supra add personal
supra add work
supra add client1

# See all accounts and slot usage
supra list

# Switch active account
supra switch personal

# View projects
supra projects          # active account
supra projects-all      # all accounts

# Link current directory to a project
supra link

# Overall status
supra status

# Remove an account
supra remove client1
```

## Commands

| Command | Alias | Description |
|---|---|---|
| `supra add [alias]` | | Add a new Supabase account |
| `supra list` | `ls` | List all accounts with slot usage |
| `supra switch [alias]` | `sw` | Switch active account & bind CLI |
| `supra projects [alias]` | `ps` | List projects for an account |
| `supra projects-all` | `pa` | List all projects across accounts |
| `supra link` | | Link current dir to a Supabase project |
| `supra unlink` | | Remove project link from current dir |
| `supra status` | `st` | Show overall status |
| `supra remove [alias]` | `rm` | Remove an account from supra |

## How It Works

- **Access & refresh tokens are stored in the OS keychain** (via `keytar`) — never in a plain-text file.
- Non-secret metadata (alias, email, token expiry) is stored by [`conf`](https://github.com/sindresorhus/conf):
  - macOS: `~/Library/Preferences/supra-nodejs/config.json`
  - Linux: `~/.config/supra-nodejs/config.json`
  - Windows: `%APPDATA%\supra-nodejs\Config\config.json`
- If the OS keychain is unavailable, Supra falls back to storing tokens in that file — and enforces `0600` on the file and `0700` on its directory. You will see a warning when this happens.
- Upgrading from an older version: any plain-text tokens left in `config.json` are migrated into the keychain on first use, and the file permissions are tightened automatically.
- When you `supra switch`, the Supabase CLI is re-authenticated using the `SUPABASE_ACCESS_TOKEN` environment variable — the token is **never** passed as a command-line argument (which would be visible to any user via `ps`).
- `supra link` creates a `.supra` file in your project directory with the connection info. It is written with `0600` permissions and automatically added to your project's `.gitignore` — **do not commit it**.
- Tokens are automatically refreshed when expired.

> **Upgrading from v0.1.0 or earlier?** Tokens were previously stored in plain text with world-readable permissions. Consider rotating your Supabase access tokens from the dashboard after upgrading.

## Platforms

- macOS
- Windows
- Linux

## License

MIT
