use soroban_sdk::{contracttype, Address};

/// Pending orders must be paid or explicitly cleaned up within fifteen minutes.
pub const PENDING_ORDER_TTL_SECONDS: u64 = 15 * 60;

/// Lifecycle of an order.
///
/// * `Pending`  - buyer called `create_order`; nothing escrowed yet.
/// * `Paid`     - `pay` escrowed funds into the contract (buyer -> contract).
/// * `Shipped`  - merchant called `dispatch`; escrow released (contract -> merchant).
/// * `Refunded` - merchant called `refund`; escrow returned (contract -> buyer).
#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
pub enum Status {
    Pending = 0,
    Paid = 1,
    Shipped = 2,
    Refunded = 3,
}

/// An on-chain order record.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
pub struct Order {
    /// The address that funded (or will fund) the order.
    pub buyer: Address,
    /// The amount escrowed, in raw token units.
    pub amount: i128,
    /// The SEP-41 token contract used to settle the order.
    pub token: Address,
    /// Ledger timestamp of the last status transition.
    pub timestamp: u64,
    /// Current lifecycle state.
    pub status: Status,
}

impl Order {
    /// True once funds have actually been received into escrow.
    pub fn is_paid(&self) -> bool {
        matches!(self.status, Status::Paid | Status::Shipped)
    }

    /// True when the escrow is still held by the contract.
    pub fn is_escrowed(&self) -> bool {
        self.status == Status::Paid
    }
}
