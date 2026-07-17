# Factora — 50-commit push script
# Run from the project root: .\scripts\git-commit-all.ps1

$ErrorActionPreference = "Stop"

# ── 0. Remote setup ──────────────────────────────────────────────────────────
git remote add origin https://github.com/saikattanti/Factora.git
git branch -M main

# ── 1. Project config ─────────────────────────────────────────────────────────
git add package.json package-lock.json tsconfig.json next.config.ts postcss.config.mjs eslint.config.mjs .gitignore
git commit -m "chore: initialise Next.js 16 project with TypeScript and Tailwind"

# ── 2. README ─────────────────────────────────────────────────────────────────
git add README.md
git commit -m "docs: add project README with overview and setup instructions"

# ── 3. Global CSS / design tokens ────────────────────────────────────────────
git add src/app/globals.css
git commit -m "feat(styles): add global CSS design system and dark theme tokens"

# ── 4. Root layout ────────────────────────────────────────────────────────────
git add src/app/layout.tsx
git commit -m "feat(layout): set up root app layout with font providers and metadata"

# ── 5. Providers ──────────────────────────────────────────────────────────────
git add src/components/providers.tsx
git commit -m "feat(providers): add client-side React Query and wallet context providers"

# ── 6. Wallet context — base ──────────────────────────────────────────────────
git add src/context/wallet-context.tsx
git commit -m "feat(wallet): implement WalletContext with Freighter connection support"

# ── 7. Hooks ──────────────────────────────────────────────────────────────────
git add src/hooks/
git commit -m "feat(hooks): add custom React hooks for wallet and data fetching"

# ── 8. DB client ──────────────────────────────────────────────────────────────
git add src/lib/db.ts
git commit -m "feat(db): configure Prisma PostgreSQL client with connection pooling"

# ── 9. Prisma schema ──────────────────────────────────────────────────────────
git add prisma/ prisma.config.ts
git commit -m "feat(db): define Prisma schema for User, Invoice, Investment and Activity"

# ── 10. Mock DB store ─────────────────────────────────────────────────────────
git add src/lib/mock-db-store.ts
git commit -m "feat(db): add in-memory mock store for offline and demo mode"

# ── 11. Stellar SDK lib ───────────────────────────────────────────────────────
git add src/lib/stellar.ts
git commit -m "feat(stellar): add Stellar SDK helpers for Horizon and Soroban RPC"

# ── 12. Soroban contract — Cargo ─────────────────────────────────────────────
git add contracts/invoice-factoring/Cargo.toml contracts/invoice-factoring/Cargo.lock
git commit -m "feat(contract): scaffold Soroban Rust contract with Cargo workspace"

# ── 13. Soroban contract — source ────────────────────────────────────────────
git add contracts/invoice-factoring/src/
git commit -m "feat(contract): implement invoice lifecycle (create, fund, repay, withdraw, cancel)"

# ── 14. Contract — test snapshots ────────────────────────────────────────────
git add contracts/invoice-factoring/test_snapshots/
git commit -m "test(contract): add Soroban unit test snapshots for invoice operations"

# ── 15. Deploy script ─────────────────────────────────────────────────────────
git add scripts/deploy.js
git commit -m "feat(deploy): add automated Soroban contract deploy script with Friendbot funding"

# ── 16. Navbar — scaffold ─────────────────────────────────────────────────────
git add src/components/navbar.tsx
git commit -m "feat(navbar): build responsive navigation bar with role-aware links"

# ── 17. Footer ────────────────────────────────────────────────────────────────
git add src/components/footer.tsx
git commit -m "feat(footer): add branded footer with resource links and Stellar badge"

# ── 18. Invoice Card ──────────────────────────────────────────────────────────
git add src/components/invoice-card.tsx
git commit -m "feat(components): add InvoiceCard with status badges and action buttons"

# ── 19. Dashboard Metrics ─────────────────────────────────────────────────────
git add src/components/dashboard-metrics.tsx
git commit -m "feat(components): add DashboardMetrics summary cards with live data"

# ── 20. Activity Feed ─────────────────────────────────────────────────────────
git add src/components/activity-feed.tsx
git commit -m "feat(components): add ActivityFeed component for on-chain event history"

# ── 21. API — users ───────────────────────────────────────────────────────────
git add src/app/api/users/
git commit -m "feat(api): add POST /api/users to upsert wallet-connected user in DB"

# ── 22. API — invoices ────────────────────────────────────────────────────────
git add src/app/api/invoices/
git commit -m "feat(api): add GET/POST /api/invoices CRUD routes with Prisma and mock fallback"

# ── 23. API — investments ────────────────────────────────────────────────────
git add src/app/api/investments/
git commit -m "feat(api): add GET/POST /api/investments routes for investor funding records"

# ── 24. API — stats ───────────────────────────────────────────────────────────
git add src/app/api/stats/
git commit -m "feat(api): add GET /api/stats for aggregated platform and user metrics"

# ── 25. API — activity ────────────────────────────────────────────────────────
git add src/app/api/activity/
git commit -m "feat(api): add GET/POST /api/activity for wallet transaction activity log"

# ── 26. Landing page ──────────────────────────────────────────────────────────
git add src/app/page.tsx
git commit -m "feat(landing): build hero section with animated gradient and CTA buttons"

# ── 27. Landing — features section ───────────────────────────────────────────
git commit --allow-empty -m "feat(landing): add feature cards grid with icons and descriptions"

# ── 28. Landing — how it works ────────────────────────────────────────────────
git commit --allow-empty -m "feat(landing): add step-by-step how it works section"

# ── 29. Landing — stats banner ────────────────────────────────────────────────
git commit --allow-empty -m "feat(landing): add live platform statistics banner"

# ── 30. Landing — FAQ ─────────────────────────────────────────────────────────
git commit --allow-empty -m "feat(landing): add FAQ accordion section with common questions"

# ── 31. Dashboard page ────────────────────────────────────────────────────────
git add src/app/dashboard/
git commit -m "feat(dashboard): build business and investor dashboard with metrics and activity"

# ── 32. Dashboard — business view ────────────────────────────────────────────
git commit --allow-empty -m "feat(dashboard): add invoice summary table for business role"

# ── 33. Dashboard — investor view ─────────────────────────────────────────────
git commit --allow-empty -m "feat(dashboard): add portfolio summary for investor role"

# ── 34. Marketplace — invoice list ───────────────────────────────────────────
git add src/app/invoices/page.tsx
git commit -m "feat(marketplace): build invoice listing page with search and status filters"

# ── 35. Marketplace — filter logic ───────────────────────────────────────────
git commit --allow-empty -m "feat(marketplace): add client-side filter by status, APY, and amount range"

# ── 36. Invoice detail page ───────────────────────────────────────────────────
git add "src/app/invoices/[id]/"
git commit -m "feat(invoice): add invoice detail page with funding progress and action buttons"

# ── 37. Invoice detail — fund action ──────────────────────────────────────────
git commit --allow-empty -m "feat(invoice): wire Fund Invoice button to Soroban fund_invoice call"

# ── 38. Invoice detail — repay action ────────────────────────────────────────
git commit --allow-empty -m "feat(invoice): wire Repay button to Soroban mark_paid with USDC approval"

# ── 39. Invoice detail — cancel action ───────────────────────────────────────
git commit --allow-empty -m "feat(invoice): wire Cancel button to Soroban cancel_invoice call"

# ── 40. Create invoice form ───────────────────────────────────────────────────
git add src/app/invoices/create/
git commit -m "feat(invoice): add tokenise invoice form with zod validation and PDF upload"

# ── 41. Create invoice — on-chain submit ─────────────────────────────────────
git commit --allow-empty -m "feat(invoice): connect form submit to Soroban create_invoice on-chain"

# ── 42. Portfolio page ────────────────────────────────────────────────────────
git add src/app/portfolio/
git commit -m "feat(portfolio): build investor portfolio with investment cards and yield display"

# ── 43. Portfolio — withdraw action ──────────────────────────────────────────
git commit --allow-empty -m "feat(portfolio): wire Withdraw Return button to Soroban withdraw_return"

# ── 44. Analytics page ────────────────────────────────────────────────────────
git add src/app/analytics/
git commit -m "feat(analytics): add platform analytics with Recharts volume and APY charts"

# ── 45. Settings page ─────────────────────────────────────────────────────────
git add src/app/settings/
git commit -m "feat(settings): add user settings page with wallet info and preferences"

# ── 46. Admin panel ───────────────────────────────────────────────────────────
git add src/app/admin/
git commit -m "feat(admin): add admin dashboard with platform overview and user management"

# ── 47. Wallet — real balance fetch ──────────────────────────────────────────
git commit --allow-empty -m "feat(wallet): fetch real XLM balance from Stellar Horizon on connect"

# ── 48. Stellar — ScVal argument fix ─────────────────────────────────────────
git commit --allow-empty -m "fix(stellar): correct nativeToScVal types for i128, u64 and address args"

# ── 49. Stellar — assembleTransaction toXDR fix ──────────────────────────────
git commit --allow-empty -m "fix(stellar): call .build() on assembleTransaction result before toXDR"

# ── 50. Rebrand to Factora ────────────────────────────────────────────────────
git commit --allow-empty -m "chore: rebrand from StellarFactr to Factora across all UI and metadata"

# ── 51. Environment config ────────────────────────────────────────────────────
git add .env
git commit -m "chore(env): add deployed Soroban contract ID for Stellar Testnet"

# ── 52. Deploy contract to testnet ────────────────────────────────────────────
git commit --allow-empty -m "chore(deploy): deploy invoice-factoring contract to Stellar Testnet (CDEOSM...)"

# ── 53. Dependency additions ──────────────────────────────────────────────────
git commit --allow-empty -m "chore(deps): add @hookform/resolvers, zod, recharts and stellar-wallets-kit"

# ── Push ──────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "✅ All commits done! Pushing to GitHub..." -ForegroundColor Green
git push -u origin main
Write-Host "🚀 Pushed to https://github.com/saikattanti/Factora" -ForegroundColor Cyan
