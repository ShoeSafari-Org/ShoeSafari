use soroban_sdk::{contractevent, Address, BytesN};

/// Emitted on every successful payment into escrow.
///
/// Topics: `pay`, token, buyer, merchant, order_id
/// Data:   `{ amount }` (i128, raw token units)
#[contractevent]
pub struct PaymentReceived {
    /// The SEP-41 token contract used for the payment.
    #[topic]
    pub token: Address,
    /// The address that paid.
    #[topic]
    pub buyer: Address,
    /// The merchant the order belongs to.
    #[topic]
    pub merchant: Address,
    /// The 32-byte order id this payment settles.
    #[topic]
    pub order_id: BytesN<32>,
    /// The amount escrowed, in raw token units.
    pub amount: i128,
}

/// Emitted when a buyer registers an order before paying.
///
/// Topics: `create_order`, token, buyer, order_id
/// Data:   `{ amount, timestamp }`
#[contractevent]
pub struct OrderCreated {
    /// The SEP-41 token the buyer intends to pay with.
    #[topic]
    pub token: Address,
    /// The buyer that will fund the order.
    #[topic]
    pub buyer: Address,
    /// The 32-byte order id.
    #[topic]
    pub order_id: BytesN<32>,
    /// The intended amount, in raw token units.
    pub amount: i128,
    /// Ledger timestamp of creation.
    pub timestamp: u64,
}

/// Emitted when the merchant dispatches an order and the escrow is released.
///
/// Topics: `dispatch`, order_id, merchant
/// Data:   `{ amount }`
#[contractevent]
pub struct OrderShipped {
    /// The 32-byte order id that was dispatched.
    #[topic]
    pub order_id: BytesN<32>,
    /// The merchant that released the escrow.
    #[topic]
    pub merchant: Address,
    /// The amount released, in raw token units.
    pub amount: i128,
}

/// Emitted when the merchant refunds a paid order back to the buyer.
///
/// Topics: `refund`, order_id, buyer
/// Data:   `{ amount }`
#[contractevent]
pub struct OrderRefunded {
    /// The 32-byte order id that was refunded.
    #[topic]
    pub order_id: BytesN<32>,
    /// The buyer that received the refund.
    #[topic]
    pub buyer: Address,
    /// The amount refunded, in raw token units.
    pub amount: i128,
}

/// Versioned event emitted after the merchant address changes.
///
/// Topics: `merchant_changed_v1`, previous_merchant, new_merchant
#[contractevent]
pub struct MerchantChangedV1 {
    /// The merchant address before the change.
    #[topic]
    pub previous_merchant: Address,
    /// The merchant address after the change.
    #[topic]
    pub new_merchant: Address,
}

/// Versioned event emitted after a token is added to or removed from the allowlist.
///
/// Topics: `token_allowlist_changed_v1`, token
/// Data:   `{ allowed }`
#[contractevent]
pub struct TokenAllowlistChangedV1 {
    /// The token whose allowlist status changed.
    #[topic]
    pub token: Address,
    /// Whether the token is allowed after this change.
    pub allowed: bool,
}
