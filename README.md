# Invoice Factoring & Financing Platform

A production-ready, decentralized marketplace built on **Stellar Soroban** and **Next.js 15 (App Router)**. This platform enables businesses to tokenize their outstanding invoices (accounts receivable) to secure early financing from global investors. Repayments and yield returns are managed securely via decentralized escrow smart contracts.

---

## 🌟 Key Features

### 1. Business Dashboard
- **Wallet Connection:** Supports Freighter, xBull, Albedo, and a local Simulated mode.
- **Invoice Tokenization:** Create, validate (via Zod + React Hook Form), and deploy invoices to Stellar Soroban.
- **Escrow Cash-out:** Once fully funded, the smart contract automatically releases principal capital to the business.
- **Invoice Tracking:** Monitor invoice status from draft to fully settled/repaid.

### 2. Investor Dashboard
- **Marketplace Grid:** Browse outstanding factoring requests.
- **Calculators:** View expected yield returns (APY) and interest payout calculations dynamically.
- **Portfolio Management:** Track active funding positions, historical yield statistics, and execute payout withdrawals.

### 3. System Admin Console
- **Analytics & Visuals:** Interactive monthly volume charting built with Recharts.
- **Operations Audit:** Approve flagged suspicious invoices and manage active platform users.

---

## 🌐 Live Demo & Deployment Info

- **Video Demo (Level 3):** [YouTube Demo Link Here](#) *(Replace with actual link)*
- **Live Platform:** [https://factora-app.vercel.app](https://factora-app.vercel.app) *(Placeholder)*
- **Invoice Factoring Contract (Testnet):** `CDJGXXABINDCQH6ZP35S2V6WFXEK2O5LINUUMWOJDPAKMWY2Q5WETGFB`
- **Admin Registry Contract (Testnet):** `CCESJJH4JPAUP7J6Z57JUTKJEQSDPUMFICTLXHCEY7CVGGJRUMZZF5GC`

---

## 🏗️ Technology Stack

- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS v4, Framer Motion, React Hook Form, Zod, TanStack Query.
- **Backend API:** Next.js API route handlers.
- **Blockchain:** Stellar Soroban, `@creit.tech/stellar-wallets-kit`, Rust `soroban-sdk`.
- **Database:** PostgreSQL (with SQLite option), Prisma ORM v7 (using the new `prisma.config.ts` and `@prisma/adapter-pg` driver).

---

## 📂 Project Structure

```text
invoice-factoring-and-financing/
├── contracts/
│   └── invoice-factoring/
│       ├── Cargo.toml
│       └── src/
│           ├── lib.rs            # Soroban Contract Core
│           └── test.rs           # Soroban Lifecycle Tests
├── prisma/
│   └── schema.prisma             # Prisma Database models
├── src/
│   ├── app/                      # Next.js 15 Pages & API routes
│   │   ├── api/                  # REST Controllers (Syncing DB & Contract states)
│   │   ├── admin/                # Admin Panel
│   │   ├── invoices/             # Marketplace & Create Forms
│   │   ├── portfolio/            # Investor Portfolio
│   │   ├── analytics/            # Recharts Graphics
│   │   ├── settings/             # Horizon/RPC node config
│   │   ├── layout.tsx
│   │   └── page.tsx              # Fintech Landing Page
│   ├── components/               # Navbars, Footers, and Widgets
│   ├── context/
│   │   └── wallet-context.tsx    # Wallet state (Simulated & SDK connectors)
│   ├── hooks/
│   │   └── use-stellar-wallet.ts
│   └── lib/
│       ├── db.ts                 # Prisma Client Singleton (Prisma 7 compatible)
│       └── mock-db-store.ts      # Server-side DB fallback
├── prisma.config.ts              # Prisma 7 configurations
└── README.md
```

---

## 🛠️ Setup & Local Development

### 1. Prerequisites
- **Node.js:** v18.17.0 or higher.
- **Rust & Cargo:** (Optional, for compiling the Soroban smart contract).

### 2. Installation
Clone the repository, navigate to the folder, and install dependencies:
```bash
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory (a template is available in `.env`):
```env
# Database connection URL for PostgreSQL (Prisma 7)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/invoice_factoring?schema=public"

# Stellar Soroban Testnet Configuration
NEXT_PUBLIC_SOROBAN_RPC_URL="https://soroban-testnet.stellar.org"
NEXT_PUBLIC_HORIZON_URL="https://horizon-testnet.stellar.org"
NEXT_PUBLIC_USDC_CONTRACT_ADDRESS="GBBD47R7F2C5PZ2PQQ5HVS2C2W6A5Y3K1L1C4S2B2W3K1S1C4S2B2W3K"
```

### 4. Database Initialization
If you have PostgreSQL running, push the Prisma schemas:
```bash
npx prisma db push
```
*Note: If PostgreSQL is not available, the app's Next.js API routes will automatically fall back to a persistent in-memory database store (`src/lib/mock-db-store.ts`), meaning the dashboard, marketplace, and factoring process remain 100% interactive and functional.*

### 5. Running the Application
Launch the Next.js development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🦀 Soroban Smart Contract Architecture

The project employs **Inter-Contract Communication (ICC)** between two deployed smart contracts:

1. **Admin Registry Contract**: Manages a verified whitelist of business wallets.
2. **Invoice Factoring Contract**: The core financial escrow. During `create_invoice`, it invokes the Admin Registry (`env.invoke_contract()`) to verify the business's authorization before tokenizing the invoice.

### Invoice Factoring Interface

- `initialize(admin: Address, token: Address, registry: Address)`: Registers the contract admin, USDC token, and Admin Registry address.
- `create_invoice(...)`: Tokenizes a new invoice. Verifies the business via ICC. Includes TTL storage bumping.
- `fund_invoice(id: Symbol, investor: Address, amount: i128)`: Deposits stablecoins into escrow.
- `cancel_invoice(id: Symbol)`: Cancels the invoice listing.
- `mark_paid(id: Symbol, payer: Address)`: Repays the principal + interest.
- `withdraw_return(id: Symbol, investor: Address)`: Claims return payout.

### Running Tests (CI/CD Integrated)
We enforce quality via **GitHub Actions** (`.github/workflows/ci.yml`). To run tests locally:
```bash
# Contract Tests
cd contracts/invoice-factoring && cargo test
cd contracts/admin-registry && cargo test

# Frontend & Integration Tests
npm test
```

---

## 📸 Screenshots

![Landing Page View](./public/landing-page.png)
![Dashboard View](./public/dashboard.png)
![Marketplace View](./public/marketplace.png)
![Analytics View](./public/analytics.png)

---

## 💳 Wallet Configuration & Demo Mode

1. **Stellar Wallet Extensions:** Connect Freighter, xBull, or Albedo to test on Stellar Testnet. Make sure your extension network is set to "Testnet".
2. **Simulated Wallet (Demo Mode):** Select the "Simulated Wallet" option from the connect modal. This lets you test the full platform lifecycle instantly, including:
   - Funding simulated invoices.
   - Claiming mock USDC from the **Faucet** button in the navbar.
   - Settling invoices as the Business and claiming returns as the Investor.

---

## ⚠️ Known Limitations
- **Stablecoin Standard**: Currently hardcoded to a mock USDC asset.
- **Oracle Integrations**: Real-world FIAT conversion rates are not currently streamed via Oracle.
- **Frontend Subscriptions**: UI updates rely on TanStack Query polling (`refetchInterval: 5000`) rather than native WebSocket events due to current RPC limitations.

---

## 🤝 Contributing
Contributions are welcome for Level 4 (Black Belt) improvements!
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Ensure CI/CD passes (Run `npm test` and `cargo test`)
5. Push to the branch and open a Pull Request.

---

## 📜 License

Distributed under the MIT License.
