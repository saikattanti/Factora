$root = "d:\Projects\Rise-In\Invoice-Factoring-and-Financing"
Set-Location $root

# --- Commit 1: Fix TypeScript implicit 'any' in stats API route ---
git add src/app/api/stats/route.ts
git commit -m "fix(api): resolve implicit any types in stats reduce callbacks"

# --- Commit 2: Fix walletName destructuring and txStatus in invoices/page.tsx ---
git add src/app/invoices/page.tsx
git commit -m "fix(invoices): destructure walletName from useWallet and expand txStatus union"

# --- Commit 3: Fix walletName & statusColors indexing in invoices/[id]/page.tsx ---
git add "src/app/invoices/[id]/page.tsx"
git commit -m "fix(invoice-detail): add walletName and safe statusColors lookup"

# --- Commit 4: Fix walletName destructuring in portfolio/page.tsx ---
git add src/app/portfolio/page.tsx
git commit -m "fix(portfolio): destructure walletName from useWallet hook"

# --- Commit 5: Fix zodResolver type and txStatus union in create/page.tsx ---
git add src/app/invoices/create/page.tsx
git commit -m "fix(create-invoice): fix zodResolver type cast and expand txStatus union"

# --- Commit 6: Add Level 3 inter-contract communication (admin-registry contract) ---
git add contracts/admin-registry
git commit -m "feat(contracts): add admin-registry contract for ICC whitelist verification"

# --- Commit 7: Modularize invoice-factoring contract with storage.rs and TTL bumping ---
git add contracts/invoice-factoring/src/storage.rs contracts/invoice-factoring/src/lib.rs contracts/invoice-factoring/src/test.rs
git commit -m "feat(contracts): modularize invoice-factoring with storage.rs and TTL bumping"

# --- Commit 8: Add GitHub Actions CI/CD pipeline ---
git add .github
git commit -m "feat(ci): add GitHub Actions workflow for automated contract and frontend tests"

# --- Commit 9: Add Vitest frontend testing suite ---
git add vitest.config.ts vitest.setup.ts src/components/invoice-card.test.tsx
git commit -m "feat(tests): add Vitest + React Testing Library frontend test suite"

# --- Commit 10: Update package.json with test script ---
git add package.json
git commit -m "chore: add test script to package.json for vitest"

# --- Commit 11: Upgrade deploy script for multi-contract deployment ---
git add scripts/deploy.js
git commit -m "feat(deploy): upgrade deployment script for multi-contract ICC workflow"

# --- Commit 12: Update README for Level 3 compliance ---
git add README.md
git commit -m "docs: update README with ICC architecture, CI/CD, contributing, and known limitations"

# --- Commit 13: Push all commits ---
git push origin main

Write-Host "`n✅ All 12 commits pushed to origin/main!" -ForegroundColor Green
