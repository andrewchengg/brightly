# Brightly

**Brightly** is an open-source AI tutoring platform that helps students prepare for the PSLE — with practice questions, mock exams, an AI learning assistant ("Bright Ben"), progress tracking, and gamification.

> **100% open source.** Brightly is developed in the open under the permissive [MIT License](LICENSE). Anyone is free to use, copy, fork, self-host, modify, or build on top of it — no permission required. Contributions are welcome; see [Contributing](#contributing).

**Repository:** https://github.com/andrewchengg/edcel

## Tech stack

- **Framework:** Next.js 14 (App Router), TypeScript
- **Styling:** Tailwind CSS
- **Database / ORM:** Postgres via Prisma
- **Auth & backend:** Supabase

## Getting started

### Prerequisites

- Node.js v18 or higher
- npm
- A [Supabase](https://supabase.com) project and a Postgres database

### Installation

```bash
# Install dependencies
npm install
```

### Environment variables

Brightly needs Supabase and database credentials to run. See
[ENVIRONMENT_SETUP.md](ENVIRONMENT_SETUP.md) for the full list, then create a
local env file:

```bash
cp .env.example .env.local
# Edit .env.local with your own values.
```

`.env`, `.env.local`, and `*.pem` files are git-ignored and must **never** be
committed — only `*.example` files with placeholder values belong in version
control.

### Development

```bash
# Generate the Prisma client (first run / after schema changes)
npx prisma generate

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building

```bash
npm run build
npm run start
```

## Features

- AI learning assistant ("Bright Ben") for on-demand help
- Practice modules and mock exams
- Progress tracking and analytics
- Gamification (XP, weekly challenges)
- Parent and student roles

## Contributing

Contributions are welcome and encouraged — whether you're an educator, a parent, or a developer. You can:

- **Report a bug or request a feature** by [opening an issue](https://github.com/andrewchengg/edcel/issues).
- **Contribute code** by forking the repo, creating a branch, and opening a pull request.
- **Fork it and make it your own** — the MIT License lets you do anything you like with the code.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide, and [SECURITY.md](SECURITY.md) for how to report vulnerabilities.

## License

Brightly is licensed under the [MIT License](LICENSE) — you are free to use, modify, and distribute it for any purpose.
