# Contributing to Brightly

Thanks for your interest in contributing! Brightly is an open-source AI tutoring platform for PSLE preparation, and contributions of all kinds — code, documentation, bug reports, and ideas — are welcome.

This project is licensed under the [MIT License](LICENSE). By contributing, you agree that your contributions will be licensed under the same license.

## Ways to contribute

- **Report bugs or request features** — [open an issue](https://github.com/andrewchengg/edcel/issues).
- **Improve documentation** — typo fixes, clearer explanations, and new guides are all appreciated.
- **Contribute code** — pick up an open issue or propose your own improvement via a pull request.

## Development setup

### Prerequisites

- Node.js v18 or higher
- npm (the repo uses `package-lock.json`)
- A [Supabase](https://supabase.com) project (database + auth)
- A Postgres database (Prisma is used for the schema/ORM)

### Getting started

```bash
# 1. Fork the repo on GitHub, then clone your fork
git clone https://github.com/<your-username>/edcel.git
cd edcel

# 2. Install dependencies
npm install

# 3. Set up environment variables
#    See ENVIRONMENT_SETUP.md for the full list of required keys.
cp .env.example .env.local   # then fill in your own values

# 4. Generate the Prisma client and run the app
npx prisma generate
npm run dev
```

The app runs at http://localhost:3000.

> **Never commit real secrets.** `.env`, `.env.local`, and `*.pem` files are
> git-ignored. Only commit `*.example` files with placeholder values.

## Making changes

1. Create a branch off the default branch:

   ```bash
   git checkout -b my-feature
   ```

2. Make your changes, keeping them focused — one logical change per pull request is easier to review.

3. Verify before pushing:

   ```bash
   npm run lint
   npm run build
   ```

4. Commit with a clear message, push to your fork, and open a pull request. Describe what you changed and link any related issues.

## Code style

- The project uses **TypeScript**, **Next.js (App Router)**, **Tailwind CSS**, and **Prisma**.
- Match the style of the surrounding code — naming, formatting, and file organization.
- Make sure `npm run lint` passes before opening a PR.

## Security

Please **do not** open public issues for security vulnerabilities. See [SECURITY.md](SECURITY.md) for how to report them privately.

## Code of Conduct

Be respectful and constructive. We want this to be a welcoming project for contributors of all backgrounds and experience levels.

---

Questions? Open an issue or start a discussion. Thanks for helping make learning better for every student! 🎓
