# Security Policy

## Reporting a vulnerability

If you discover a security vulnerability in Brightly, please **do not open a public issue**. Public disclosure before a fix is available puts users at risk.

Instead, report it privately using GitHub's [private vulnerability reporting](https://github.com/andrewchengg/edcel/security/advisories/new), or contact the maintainers directly.

Please include:

- A description of the vulnerability and its impact
- Steps to reproduce it
- Any suggested fix, if you have one

We'll acknowledge your report as quickly as we can and keep you updated on the fix.

## Handling secrets

This project uses environment variables for all secrets (Supabase keys, database credentials, API keys, private keys). To keep them safe:

- **Never commit real secrets.** `.env`, `.env.local`, `.env*.local`, and `*.pem` files are git-ignored. Only `*.example` files with placeholder values belong in version control.
- `NEXT_PUBLIC_*` values (such as the Supabase anon key) are designed to be public and ship in the browser bundle.
- Service-role keys, database connection strings, and private keys (`.pem`) are **highly sensitive** — they must only ever exist in server-side environments and never reach the client or the repo.

If you ever accidentally commit a secret, treat it as compromised: **rotate the key immediately** in the relevant provider (Supabase, your database, etc.), and remove it from git history.
