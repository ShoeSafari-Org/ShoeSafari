#!/usr/bin/env bash
# Run one disposable checkout against Stellar testnet and refund it.
# This script is opt-in because it submits real testnet transactions.

set -euo pipefail

if [[ "${RUN_TESTNET_SMOKE:-}" != "1" ]]; then
  echo "Set RUN_TESTNET_SMOKE=1 to run the testnet release smoke test." >&2
  exit 2
fi

NETWORK="${STELLAR_NETWORK:-testnet}"
if [[ "$NETWORK" != "testnet" ]]; then
  echo "Refusing to run outside Stellar testnet (STELLAR_NETWORK=$NETWORK)." >&2
  exit 2
fi

: "${STELLAR_SOURCE_ACCOUNT:?Set STELLAR_SOURCE_ACCOUNT to a funded testnet buyer account.}"
: "${NEXT_PUBLIC_CHECKOUT_CONTRACT_ID:?Set NEXT_PUBLIC_CHECKOUT_CONTRACT_ID to the testnet checkout contract.}"
: "${TESTNET_SMOKE_TOKEN_CONTRACT_ID:?Set TESTNET_SMOKE_TOKEN_CONTRACT_ID to an allowlisted testnet token.}"

MERCHANT_ACCOUNT="${STELLAR_MERCHANT_ACCOUNT:-$STELLAR_SOURCE_ACCOUNT}"
AMOUNT="${TESTNET_SMOKE_AMOUNT:-1}"
ORDER_ID="$(openssl rand -hex 32)"
LOG_FILE="${TESTNET_SMOKE_LOG:-testnet-release-smoke-${ORDER_ID}.log}"
BUYER_ADDRESS="$(stellar keys address "$STELLAR_SOURCE_ACCOUNT")"

if [[ ! "$NEXT_PUBLIC_CHECKOUT_CONTRACT_ID" =~ ^C[A-Z2-7]{55}$ ]]; then
  echo "Refusing an invalid Soroban contract id." >&2
  exit 2
fi
if [[ ! "$TESTNET_SMOKE_TOKEN_CONTRACT_ID" =~ ^C[A-Z2-7]{55}$ ]]; then
  echo "Refusing an invalid testnet token contract id." >&2
  exit 2
fi
if [[ ! "$AMOUNT" =~ ^[1-9][0-9]*$ ]]; then
  echo "TESTNET_SMOKE_AMOUNT must be a positive integer in raw token units." >&2
  exit 2
fi

exec > >(tee "$LOG_FILE") 2>&1
echo "Testnet smoke order: $ORDER_ID"
echo "Network: $NETWORK"
echo "Contract: $NEXT_PUBLIC_CHECKOUT_CONTRACT_ID"
echo "Token: $TESTNET_SMOKE_TOKEN_CONTRACT_ID"
echo "Buyer: $BUYER_ADDRESS"
echo "Amount: $AMOUNT raw units"

paid=0
cleanup() {
  if [[ "$paid" == "1" ]]; then
    echo "Refunding disposable smoke-test order..."
    stellar contract invoke \
      --id "$NEXT_PUBLIC_CHECKOUT_CONTRACT_ID" \
      --source-account "$MERCHANT_ACCOUNT" \
      --network testnet -- \
      refund --order_id "$ORDER_ID" || echo "WARNING: refund failed; use the transaction log for cleanup."
  fi
}
trap cleanup EXIT

echo "Paying disposable testnet order..."
stellar contract invoke \
  --id "$NEXT_PUBLIC_CHECKOUT_CONTRACT_ID" \
  --source-account "$STELLAR_SOURCE_ACCOUNT" \
  --network testnet -- \
  pay \
  --token "$TESTNET_SMOKE_TOKEN_CONTRACT_ID" \
  --buyer "$BUYER_ADDRESS" \
  --order_id "$ORDER_ID" \
  --amount "$AMOUNT"
paid=1

echo "Reading on-chain order state..."
stellar contract invoke \
  --id "$NEXT_PUBLIC_CHECKOUT_CONTRACT_ID" \
  --source-account "$STELLAR_SOURCE_ACCOUNT" \
  --network testnet -- \
  order --order_id "$ORDER_ID"

echo "Smoke payment completed; cleanup will refund the order. Log: $LOG_FILE"
