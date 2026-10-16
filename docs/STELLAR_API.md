# Stellar integration API reference

The browser and server helpers for the ShoeSafari Stellar checkout live in `lib/stellar/`. Import only the module needed by the caller; `checkout.ts` is the payment entry point, while the other modules expose lower-level wallet, account, event, and contract helpers.

The public Soroban checkout surface is versioned in
[`contracts/checkout/interface/checkout-v1.json`](../contracts/checkout/interface/checkout-v1.json).
It is the reference for contract method signatures, argument order, event
names, and order status values. Run `npm run check:checkout-interface` when
changing the frontend decoder or the contract interface.

## Payment

### `lib/stellar/checkout.ts`

| Export | Purpose |
| --- | --- |
| `PayOptions` | Inputs for `payWithStellar`, including the signed quote, wallet key, and optional status callbacks. |
| `PayResult` | Successful transaction hash, receipt, raw and display amounts, and preflight report. |
| `usdToRawUnits(amountUsd)` | Convert a USD amount to the token's 7-decimal integer units. Rejects non-finite or non-positive amounts. |
| `orderIdHash(orderId)` | Return the hexadecimal SHA-256 hash used for the on-chain order reference. |
| `payWithStellar(options)` | Validate the signed checkout quote, check wallet readiness, simulate and submit the Soroban payment, then wait for transaction status. |
| `fundTestnetAccount(publicKey)` | Re-export of the testnet Friendbot helper from `account.ts`. |

`PayOptions` accepts `amountUsd`, `orderId`, `quoteToken`, and `publicKey`. `onStatus` receives progress messages; `onSubmitted` receives the transaction hash once submission is accepted or its result is uncertain. `payWithStellar` resolves to `PayResult` or throws a typed wallet or transaction error.

## Wallet and account

### `lib/stellar/freighter.ts`

| Export | Purpose |
| --- | --- |
| `WalletError` | Error with a stable `code` and optional transaction hash for wallet and payment failures. |
| `freighterAvailable()` | Check whether Freighter is connected and available. |
| `connectWallet()` | Request wallet permission and return its public key. |
| `currentAddress()` | Return the authorized public key, or `null` without prompting. |
| `ensureNetwork()` | Confirm Freighter is using the configured network. |
| `signWithFreighter(transactionXdr, publicKey)` | Ask Freighter to sign a transaction XDR. |
| `shortAddress(address, chars?)` | Shorten a public key for display while retaining its beginning and end. |

### `lib/stellar/account.ts`

| Export | Purpose |
| --- | --- |
| `MIN_NATIVE_RESERVE` | Minimum native XLM reserve required by the payment readiness check. |
| `LoadedAccount`, `TrustlineInfo`, `PaymentReadiness` | Result shapes for account loading, trustline inspection, and readiness checks. |
| `loadAccount(server, publicKey, opts?)` | Load an account, optionally funding a missing testnet account. |
| `fundTestnetAccount(publicKey)` | Fund an account through Friendbot when the configured network allows it. |
| `getNativeBalance(server, publicKey)` | Read the account's native XLM balance in stroops. |
| `getTrustline(server, publicKey, token)` | Read trustline existence, authorization, and balance for a token. |
| `assertPaymentReady(server, publicKey, opts)` | Check account existence, trustline, token balance, and XLM reserve. By default, throws on the first blocking issue. |
| `formatAmount(raw, decimals)` | Format an integer token amount using its decimal precision. |

## Network configuration and token amounts

### `lib/stellar/config.ts`

| Export | Purpose |
| --- | --- |
| `NETWORK`, `IS_MAINNET`, `RPC_URL`, `NETWORK_PASSPHRASE` | Current Stellar network selection and RPC configuration. |
| `CHECKOUT_CONTRACT_ID` | Configured checkout contract ID. |
| `TESTNET_USDC_CONTRACT_ID`, `TESTNET_USDC_ISSUER`, `TESTNET_NATIVE_ASSET_CONTRACT_ID`, `MAINNET_NATIVE_ASSET_CONTRACT_ID`, `NATIVE_ASSET_CONTRACT_ID`, `USDC_CONTRACT_ID` | Token contract and issuer IDs for supported networks. |
| `TokenConfig`, `SUPPORTED_TOKENS` | Token metadata and supported payment tokens. |
| `defaultToken()` | Return the default supported payment token. |
| `tokenForContract(contractId)` | Find supported token metadata by contract ID. |
| `tokenSymbolForContract(contractId?)` | Resolve a contract ID to a display symbol, with an unknown-token fallback. |
| `formatTokenAmount(amountRaw, contractId?)` | Format a raw integer amount using the selected token's decimals. |
| `USDC_DECIMALS`, `TX_TIMEOUT_SECONDS`, `TX_POLL_INTERVAL_MS`, `EVENT_POLL_INTERVAL_MS`, `EVENT_START_LEDGER_BACKFILL`, `FEE_BUFFER_STROOPS` | Precision, polling, timeout, backfill, and fee constants used by the helpers. |
| `FRIENDBOT_URL`, `isFriendbotAllowed()` | Friendbot endpoint and network guard for testnet funding. |

## Transaction events and indexing

### `lib/stellar/events.ts`

| Export | Purpose |
| --- | --- |
| `PaymentReceipt` | Decoded checkout payment fields, transaction hash, and ledger. |
| `waitForTransaction(hash)` | Poll RPC until the transaction succeeds or fails/times out. |
| `checkTransactionStatus(hash)` | Poll a saved transaction hash with bounded backoff; decode its receipt on success, report a final failure, or leave it pending on timeout. It never resubmits the transaction. |
| `decodePaymentEvent(transaction)` | Find and decode the checkout payment event from a successful transaction. |
| `bytesToHex(bytes)` | Re-export of the byte conversion helper in `scval.ts`. |

### `lib/stellar/indexer.ts` and `lib/stellar/eventDeduplicator.ts`

| Export | Purpose |
| --- | --- |
| `IndexedEvent`, `IndexerStatus`, `IndexerCallbacks` | Event, status, and callback shapes for the payment event indexer. |
| `PaymentEventIndexer` | Poll contract events, decode relevant events, track a cursor, and report status. `start(callbacks)` begins polling; `stop()` ends it; `status` returns the current snapshot. |
| `MAX_SEEN_EVENT_IDS` | Maximum number of recent event IDs retained for deduplication. |
| `EventDeduplicator` | Bounded FIFO set that filters duplicate event IDs; `remember(id)` returns whether the ID is new, and `size` reports retained IDs. |

## Orders

### `lib/stellar/orders.ts`

| Export | Purpose |
| --- | --- |
| `OrderStatus`, `OrderDetails`, `OrderActionResult`, `OrderEvent` | Order state, contract-read, action, and decoded event shapes. |
| `ReadOrderResult`, `OrderReadError` | Discriminated read outcome (`found`, `not-found`, or typed `error`) and failure details. |
| `readOrder(orderId)` | Simulate a read-only contract query without wallet or funding lookup; returns a typed found, missing, or error result. |
| `dispatchOrder(orderId)` | Ask the connected wallet to dispatch a paid order. |
| `refundOrder(orderId)` | Ask the connected wallet to refund an eligible order. |
| `eventToOrder(event)` | Convert a decoded contract event into an order event record. |

## Soroban values and transaction simulation

### `lib/stellar/scval.ts`

| Export | Purpose |
| --- | --- |
| `i128ToScVal(value)` | Convert an integer value to a Soroban `i128` value. |
| `bytes32ToScVal(bytes)` | Convert 32-byte data or its hex form to a Soroban bytes value. |
| `addressToScVal(address)` | Convert a Stellar address to a Soroban address value. |
| `symbolToScVal(symbol)` | Convert a string to a Soroban symbol value. |
| `scValToString(value)` | Convert supported Soroban values to a display string. |
| `scValToNativeSafe(value)` | Convert supported Soroban values to native JavaScript data without throwing on unknown variants. |
| `hexToBytes(hex)`, `bytesToHex(bytes)` | Convert between hexadecimal strings and byte arrays. |
| `hashOrderId(orderId)` | Return the SHA-256 bytes used as the on-chain order key. |

### `lib/stellar/simulate.ts`

| Export | Purpose |
| --- | --- |
| `PreflightError`, `SimulationReport` | Error and result shapes for Soroban transaction preflight. |
| `buildInvocationTransaction(...)` | Build a contract invocation transaction for simulation. |
| `simulateContractRead(...)` | Simulate a read-only contract invocation. |
| `readTokenBalance(server, tokenContractId, address)` | Read a token balance from a Soroban contract. |
| `readTokenDecimals(server, tokenContractId)` | Read token precision from its contract. |
| `preflight(server, transaction)` | Simulate a transaction and return resource and fee information. |
| `prepareAndReport(server, transaction)` | Prepare a transaction and return its preflight report. |
| `recommendedInclusionFee(server)` | Read a recommended inclusion fee from RPC. |
| `budgetFee(...)` | Calculate a fee budget from simulation requirements and the configured buffer. |

## Pending payment recovery

### `lib/stellar/recovery.ts`

| Export | Purpose |
| --- | --- |
| `PendingPayment` | The submitted transaction hash and its non-sensitive order reference. |
| `savePendingPayment(payment)` | Save a pending transaction reference in browser local storage. |
| `loadPendingPayment()` | Load and validate the saved reference, discarding malformed data. |
| `clearPendingPayment()` | Remove the pending reference from local storage. |

## Configuration

Set `NEXT_PUBLIC_STELLAR_NETWORK` and `NEXT_PUBLIC_CHECKOUT_CONTRACT_ID` for the storefront. The RPC URL and network passphrase are selected by `config.ts`; Friendbot funding is restricted to testnet. Never place signing secrets in these public variables.
