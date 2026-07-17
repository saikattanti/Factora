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

The invoice factoring contract is written in Rust and implements the following interface:

- `initialize(admin: Address, token: Address)`: Registers the contract admin and USDC payment token.
- `create_invoice(id: Symbol, business: Address, amount: i128, interest: u32, funding_goal: i128, due_date: u64)`: Tokenizes a new invoice. Only callable by the invoice issuer.
- `fund_invoice(id: Symbol, investor: Address, amount: i128)`: Deposits stablecoins into the factoring escrow. Automatically transfers capital to the business when fully funded.
- `cancel_invoice(id: Symbol)`: Cancels the invoice listing and refunds all investors (only if published/partially funded).
- `mark_paid(id: Symbol, payer: Address)`: Repays the invoice principal plus the offered yield interest.
- `withdraw_return(id: Symbol, investor: Address)`: Claims return payout (principal + interest yield) for an investor.
- `get_invoice(id: Symbol)`: Fetches invoice details from ledger storage.
- `get_all_invoices()`: Lists all invoices.

### Running Contract Tests
```bash
cd contracts/invoice-factoring
cargo test
```

---

## 💳 Wallet Configuration & Demo Mode

1. **Stellar Wallet Extensions:** Connect Freighter, xBull, or Albedo to test on Stellar Testnet. Make sure your extension network is set to "Testnet".
2. **Simulated Wallet (Demo Mode):** Select the "Simulated Wallet" option from the connect modal. This lets you test the full platform lifecycle instantly, including:
   - Funding simulated invoices.
   - Claiming mock USDC from the **Faucet** button in the navbar.
   - Settling invoices as the Business and claiming returns as the Investor.

---

## 📜 License

Distributed under the MIT License.
