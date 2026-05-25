# KENUXA KENUX Wallet System

## What is KENUX?

KENUX is the KENUXA ecosystem utility currency. It powers every platform service and creates a unified economy across all KENUXA products.

```
100 KENUX = ₦50 NGN ≈ $0.05 USD
```

---

## Ownership

**KENUXA CORE owns the wallet.** No other app stores wallet data or transaction history. All wallet operations call Core.

```
REACH needs to debit KENUX for a campaign
  → REACH calls Core: POST /api/wallet { action: "debit", ... }
  → Core validates balance
  → Core runs debit_kenux() PostgreSQL function (atomic)
  → Core returns updated transaction
  → REACH proceeds or returns 402 to user
```

---

## Transaction Types

| Type | Direction | Description |
|---|---|---|
| `welcome_bonus` | + | 100 KENUX on signup |
| `purchase` | + | Bought via Paystack |
| `earn` | + | Contributed data, referrals |
| `subscription_credit` | + | Monthly tier bonus |
| `marketplace_sale` | + | Sold dataset or report |
| `admin_grant` | + | Admin issued credit |
| `spend` | − | Platform services (AI, campaigns) |
| `transfer_out` | − | Sent to another user |
| `transfer_in` | + | Received from another user |
| `refund` | + | Admin or system refund |

---

## Atomic Operations

Wallet operations use PostgreSQL stored functions for atomicity. No partial credits/debits — either the full operation succeeds or it fails.

```sql
-- Credit (safe, idempotent upsert):
select credit_kenux(user_id, amount, type, description, reference, metadata);

-- Debit (fails if balance < amount):
select debit_kenux(user_id, amount, type, description, reference, metadata);
```

---

## KENUX Packages (Paystack)

| Package | KENUX | NGN | USD |
|---|---|---|---|
| Starter | 100 | ₦50 | $0.05 |
| Basic | 500 | ₦200 | $0.20 |
| Standard | 1,000 | ₦350 | $0.35 |
| Pro | 5,000 | ₦1,500 | $1.50 |
| Power | 10,000 | ₦2,500 | $2.50 |

---

## Per-App Cost Model

### KENUXA REACH
| Service | Cost |
|---|---|
| Email campaign (per recipient) | 0.1 KENUX |
| SMS campaign (per recipient) | 0.5 KENUX |
| WhatsApp message | 0.3 KENUX |
| Telegram message | 0.1 KENUX |
| AI fast inference | 0.5 KENUX |
| AI balanced inference | 2 KENUX |
| AI powerful inference | 10 KENUX |
| Marketplace purchase | As listed |

### KENUXA OPS *(planned)*
| Service | Cost |
|---|---|
| Voice command processing | 1 KENUX |
| Workflow execution | 0.5 KENUX |
| Automation run | 2 KENUX |

---

## Wallet API Reference

All calls require `X-Service-Key: <KENUXA_CORE_API_KEY>` header.

### Get wallet
```
GET /api/wallet?user_id=<uuid>
```

### Credit
```json
POST /api/wallet
{
  "action": "credit",
  "userId": "uuid",
  "amount": 100,
  "type": "welcome_bonus",
  "description": "Welcome to KENUXA! 100 KENUX to get you started.",
  "reference": "WELCOME_uuid",
  "metadata": {}
}
```

### Debit (402 if insufficient)
```json
POST /api/wallet
{
  "action": "debit",
  "userId": "uuid",
  "amount": 5,
  "type": "spend",
  "description": "AI classification for entity extraction"
}
```

### Transfer
```json
POST /api/wallet
{
  "action": "transfer",
  "fromUserId": "uuid",
  "toUserId": "uuid",
  "amount": 50,
  "description": "Payment for dataset"
}
```

### Welcome bonus
```json
POST /api/wallet
{
  "action": "welcome_bonus",
  "userId": "uuid"
}
```
Returns 409 if already claimed.

---

## SDK Usage

```typescript
import { getWalletClient } from '@kenuxa/wallet'

const wallet = getWalletClient()

// Check balance before spending
const sufficient = await wallet.hasSufficientBalance(userId, 10)
if (!sufficient) return { error: 'Insufficient KENUX' }

// Debit
const tx = await wallet.debit({
  userId,
  amount: 10,
  type: 'spend',
  description: 'Marketplace purchase: Dataset XYZ',
  reference: `MKTPL_${assetId}`,
})

// Get history
const history = await wallet.getTransactions(userId, { limit: 20, offset: 0 })
```
