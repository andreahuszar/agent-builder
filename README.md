This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Quick Start

Prerequisites: Node 18+, Docker Desktop (for PostgreSQL).

1) Install deps
```bash
npm install
```

2) Start local database (Postgres 16 on host port 5433)
```bash
npm run db:dev
```

3) Configure environment
Create `.env.local` with your database URL and any AI keys.
```env
DATABASE_URL=postgres://postgres:postgres@localhost:5433/xelix_invoice_dev
# Optional
# OPENAI_API_KEY=...
# ANTHROPIC_API_KEY=...
```

4) Sync schema and seed (optional)
```bash
npm run db:push
npm run db:seed
```

5) Run the app (port 3001)
```bash
PORT=3001 npm run dev
# Visit http://localhost:3001
```

6) Visual tests (Playwright)
```bash
npm run test:visual
```
This will reuse/start the dev server on port 3001. Update snapshots when UI changes are intentional:
```bash
npm run test:visual:update
```

Useful:
- Stop DB: `npm run db:down`
- Inspect DB: `npm run db:studio`

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3001](http://localhost:3001) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
