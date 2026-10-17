# Stellar and Soroban glossary

This glossary introduces the terms used by ShoeSafari's Stellar checkout.

| Term | Meaning |
| --- | --- |
| **Account** | A Stellar address and its on-chain balances and activity. An address starts with `G`; keep its secret key private. [Stellar accounts](https://developers.stellar.org/docs/learn/fundamentals/stellar-data-structures/accounts) |
| **Asset** | A value issued on Stellar, such as USDC. Most assets are identified by both a code and the issuer's public address. [Assets](https://developers.stellar.org/docs/learn/fundamentals/stellar-data-structures/assets) |
| **Horizon** | Stellar's HTTP API for reading account, payment, and ledger data. [Horizon](https://developers.stellar.org/docs/data/apis/horizon) |
| **Ledger** | A shared record of validated Stellar transactions. Ledgers close in sequence and provide the network's history. [Ledgers](https://developers.stellar.org/docs/learn/fundamentals/stellar-data-structures/ledgers) |
| **Soroban** | Stellar's smart-contract platform. ShoeSafari uses a Soroban contract to manage checkout and escrow actions. [Soroban](https://developers.stellar.org/docs/learn/soroban) |
| **RPC server** | An HTTP endpoint used by applications to simulate and submit Soroban contract transactions. [Soroban RPC](https://developers.stellar.org/docs/data/rpc) |
| **SEP-41 token** | Stellar's common interface for fungible smart-contract tokens, including token balance and transfer operations. [SEP-41](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0041.md) |
| **Testnet** | A public Stellar network for development. Its test assets have no real-world value. [Networks](https://developers.stellar.org/docs/networks) |
| **Transaction XDR** | A structured, base64-encoded representation of a Stellar transaction that a wallet can review and sign. [Transaction building](https://developers.stellar.org/docs/build/guides/transactions/build-an-atomic-transaction) |
| **Trustline** | An account's authorization to hold a particular issued asset. It is not needed for native XLM. [Trustlines](https://developers.stellar.org/docs/learn/fundamentals/stellar-data-structures/accounts#trustlines) |

Never share a wallet secret or approve a transaction without checking its network, destination, and amount.
