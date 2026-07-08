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

- Accounts are stored in `~/.config/supra/config.json` (tokens are encrypted at rest via OS keychain in future versions)
- When you `supra switch`, the Supabase CLI is automatically re-authenticated with the selected account's token
- `supra link` creates a `.supra` file in your project directory with the connection info
- Tokens are automatically refreshed when expired

## Platforms

- macOS
- Windows
- Linux

## License

MIT
