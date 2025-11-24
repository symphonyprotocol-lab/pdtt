# PDTT (Personal Data Trading & Targeting)

PDTT is a privacy-preserving platform that allows users to monetize their personal offline data (such as shopping receipts) while enabling advertisers to target specific user demographics effectively. By leveraging AI for data validation and the Aptos blockchain for secure, transparent rewards, PDTT bridges the gap between physical consumer behavior and on-chain value.

## 🌟 Key Features

- **Receipt Scanning & AI Validation**: Users upload receipts, which are analyzed by AI (OpenAI) to verify purchases and extract data without compromising privacy.
- **Targeted Campaigns**: Advertisers can create campaigns targeting specific user portraits (e.g., "Coffee Lovers", "Gym Goers").
- **Token Rewards (SYM)**: Users earn SYM tokens for valid data contributions.
- **Secure Claiming**: Rewards are claimed on-chain using Merkle proofs, ensuring that only eligible users can claim tokens.
- **Voucher System**: Matched receipts unlock "vouchers" that can be redeemed for crypto rewards.
- **Privacy First**: Personal data is processed securely, with only necessary proofs submitted on-chain.

## 🏗 Architecture

The project consists of three main components:

1.  **Smart Contract (`contract/`)**: Written in Aptos Move. Handles the `ad_rewards` logic, token distribution, and Merkle root verification.
2.  **Backend (`backend/`)**: A FastAPI application. Handles receipt processing, AI validation, campaign management, and Merkle proof generation.
3.  **Web App (`web-app/`)**: A Next.js frontend. Provides the user interface for scanning receipts, viewing vouchers, and claiming rewards via Aptos wallets.

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18+)
- **Python** (v3.10+)
- **Aptos CLI**
- **PostgreSQL**
- **uv** (Python package manager) - Optional but recommended

### 1. Smart Contract Setup

Navigate to the `contract` directory and publish the module to the Aptos blockchain.

```bash
cd contract
aptos move publish --named-addresses pdtt=default
```

*Note: Update the `Move.toml` or pass the correct address for `pdtt`.*

### 2. Backend Setup

The backend uses `uv` for dependency management.

```bash
cd backend

# Install dependencies
uv sync

# Create .env file
cp .env.example .env # (Create one if it doesn't exist)
# Required Env Vars:
# DATABASE_URL=postgresql://user:pass@localhost/pdtt
# OPENAI_API_KEY=sk-...

# Initialize Database
uv run init_db.py

# Run Server
uv run fastapi dev main.py
```

The API will be available at `http://localhost:8000`.

### 3. Frontend Setup

Navigate to the `web-app` directory.

```bash
cd web-app

# Install dependencies
npm install

# Create .env.local
# Required Env Vars:
# NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
# NEXT_PUBLIC_MODULE_ADDRESS=<YOUR_CONTRACT_ADDRESS>

# Run Development Server
npm run dev
```

The app will be available at `http://localhost:3000`.

## 📱 Usage

1.  **Connect Wallet**: Connect your Petra or other Aptos wallet in the web app.
2.  **Upload Receipt**: Take a photo of a shopping receipt and upload it in the chat interface.
3.  **AI Analysis**: The system analyzes the receipt. If it matches an active campaign (e.g., "Buy 2 Coffees"), you receive a voucher.
4.  **Claim Reward**: Click "Claim Reward" on the voucher. This submits a transaction to the Aptos blockchain.
5.  **Earn Tokens**: Once confirmed, SYM tokens are transferred to your wallet!

## 🛠 Tech Stack

-   **Blockchain**: Aptos Move
-   **Backend**: Python, FastAPI, SQLAlchemy, OpenAI GPT-4o
-   **Frontend**: TypeScript, Next.js, Tailwind CSS, shadcn/ui
-   **Database**: PostgreSQL
