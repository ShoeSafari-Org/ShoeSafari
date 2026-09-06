#![no_std]

mod errors;
mod events;
mod order;
mod storage;
mod test;

use soroban_sdk::token::TokenClient;
use soroban_sdk::{contract, contractimpl, Address, BytesN, Env, MuxedAddress};

use crate::errors::Error;
use crate::events::{OrderCreated, OrderRefunded, OrderShipped, PaymentReceived};
use crate::order::{Order, Status};
use crate::storage::{
    get_admin, get_order, has_admin, is_token_allowed, set_admin, set_order, set_token_allowed,
};

#[contract]
pub struct Checkout;

#[contractimpl]
impl Checkout {
    /// Initialize the contract with the merchant's Stellar public key.
    /// The merchant address must authorize this call (deployer signs).
    pub fn initialize(env: Env, merchant: Address) -> Result<(), Error> {
        if has_admin(&env) {
            return Err(Error::AlreadyInitialized);
        }
        merchant.require_auth();
        set_admin(&env, &merchant);
        Ok(())
    }

    /// Change the merchant wallet that owns the contract.
    /// Only the current merchant can authorize this.
    pub fn set_merchant(env: Env, new_merchant: Address) -> Result<(), Error> {
        let admin = get_admin(&env)?;
        admin.require_auth();
        set_admin(&env, &new_merchant);
        Ok(())
    }

    /// Read the merchant wallet that owns the contract.
    pub fn merchant(env: Env) -> Result<Address, Error> {
        get_admin(&env)
    }

    /// Approve a SEP-41 token contract for payments. Only the merchant can
    /// call this. Every accepted token (USDC, native XLM via its Stellar
    /// Asset Contract, ...) must be whitelisted before it can fund orders.
    pub fn add_token(env: Env, token: Address) -> Result<(), Error> {
        let admin = get_admin(&env)?;
        admin.require_auth();
        set_token_allowed(&env, &token, true);
        Ok(())
    }

    /// Remove a token from the approved list. Only the merchant can call this.
    pub fn remove_token(env: Env, token: Address) -> Result<(), Error> {
        let admin = get_admin(&env)?;
        admin.require_auth();
        set_token_allowed(&env, &token, false);
        Ok(())
    }

    /// Query whether a token contract is accepted for payments.
    pub fn is_token_allowed(env: Env, token: Address) -> bool {
        is_token_allowed(&env, &token)
    }

    /// Register a buyer's intent to fund an order. The buyer authorizes this.
    ///
    /// * `buyer`    - the address that will pay.
    /// * `order_id` - a unique 32-byte identifier for the order.
    /// * `token`    - the SEP-41 token contract the buyer will pay with.
    /// * `amount`   - the intended amount, in raw token units.
    ///
    /// Emits `create_order`. No funds move until `pay` is called.
    pub fn create_order(
        env: Env,
        buyer: Address,
        order_id: BytesN<32>,
        token: Address,
        amount: i128,
    ) -> Result<(), Error> {
        buyer.require_auth();

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        if !is_token_allowed(&env, &token) {
            return Err(Error::TokenNotAllowed);
        }
        if get_order(&env, &order_id).is_some() {
            return Err(Error::OrderAlreadyPaid);
        }

        let timestamp = env.ledger().timestamp();
        let order = Order {
            buyer: buyer.clone(),
            amount,
            token: token.clone(),
            timestamp,
            status: Status::Pending,
        };
        set_order(&env, &order_id, &order);

        OrderCreated {
            token,
            buyer,
            order_id,
            amount,
            timestamp,
        }
        .publish(&env);

        Ok(())
    }

    /// Pay for an order. The buyer authorizes the transfer.
    ///
    /// * `token`    - the [SEP-41 token](https://stellar.org/developers/learn/guides/interoperability/sep-41)
    ///                contract to pay with (whitelisted by the merchant).
    /// * `buyer`    - the address paying for the order (must authorize the transfer).
    /// * `order_id` - a unique 32-byte identifier for the order.
    /// * `amount`   - the exact amount of `token` to escrow, in raw token units.
    ///
    /// Transfers `amount` from `buyer` into the **contract's escrow** and
    /// records the order as `Paid`. Funds are released to the merchant by
    /// calling `dispatch`, or returned to the buyer by calling `refund`.
    ///
    /// Emits `pay` (aliased `payment_received`). An order can only be paid
    /// once; duplicate payments are rejected with `OrderAlreadyPaid`.
    pub fn pay(
        env: Env,
        token: Address,
        buyer: Address,
        order_id: BytesN<32>,
        amount: i128,
    ) -> Result<(), Error> {
        buyer.require_auth();

        // Check initialization before token validation so callers receive the
        // actionable contract-state error when the merchant has not configured
        // the checkout contract yet.
        let merchant = get_admin(&env)?;

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        if !is_token_allowed(&env, &token) {
            return Err(Error::TokenNotAllowed);
        }

        // A previous pay/refund cannot be superseded; a pending order can.
        if let Some(existing) = get_order(&env, &order_id) {
            if existing.status != Status::Pending {
                return Err(Error::OrderAlreadyPaid);
            }
        }

        let token_client = TokenClient::new(&env, &token);

        // Escrow: buyer -> contract. The contract's own authorization on the
        // transfer is derived from this invocation (it holds the funds).
        token_client.transfer(
            &buyer,
            MuxedAddress::from(&env.current_contract_address()),
            &amount,
        );

        // Record the order as Paid, reflecting the actual payment.
        let order = Order {
            buyer: buyer.clone(),
            amount,
            token: token.clone(),
            timestamp: env.ledger().timestamp(),
            status: Status::Paid,
        };
        set_order(&env, &order_id, &order);

        PaymentReceived {
            token: token.clone(),
            buyer: buyer.clone(),
            merchant: merchant.clone(),
            order_id: order_id.clone(),
            amount,
        }
        .publish(&env);

        Ok(())
    }

    /// Release a paid order's escrow to the merchant. Only the merchant can
    /// call this. Once dispatched the order cannot be refunded.
    ///
    /// Emits `dispatch`.
    pub fn dispatch(env: Env, order_id: BytesN<32>) -> Result<(), Error> {
        let merchant = get_admin(&env)?;
        merchant.require_auth();

        let order = get_order(&env, &order_id).ok_or(Error::OrderNotFound)?;
        if order.status != Status::Paid {
            return Err(Error::InvalidOrderStatus);
        }

        let token_client = TokenClient::new(&env, &order.token);

        // Release: contract -> merchant.
        token_client.transfer(
            &env.current_contract_address(),
            MuxedAddress::from(&merchant),
            &order.amount,
        );

        set_order(
            &env,
            &order_id,
            &Order {
                status: Status::Shipped,
                timestamp: env.ledger().timestamp(),
                ..order.clone()
            },
        );

        OrderShipped {
            order_id: order_id.clone(),
            merchant: merchant.clone(),
            amount: order.amount,
        }
        .publish(&env);

        Ok(())
    }

    /// Refund a paid order's escrow back to the buyer. Only the merchant can
    /// call this (e.g. the goods could not be dispatched).
    ///
    /// Emits `refund`.
    pub fn refund(env: Env, order_id: BytesN<32>) -> Result<(), Error> {
        let merchant = get_admin(&env)?;
        merchant.require_auth();

        let order = get_order(&env, &order_id).ok_or(Error::OrderNotFound)?;
        if order.status != Status::Paid {
            return Err(Error::InvalidOrderStatus);
        }

        let token_client = TokenClient::new(&env, &order.token);

        // Refund: contract -> buyer.
        token_client.transfer(
            &env.current_contract_address(),
            MuxedAddress::from(&order.buyer),
            &order.amount,
        );

        set_order(
            &env,
            &order_id,
            &Order {
                status: Status::Refunded,
                timestamp: env.ledger().timestamp(),
                ..order.clone()
            },
        );

        OrderRefunded {
            order_id: order_id.clone(),
            buyer: order.buyer.clone(),
            amount: order.amount,
        }
        .publish(&env);

        Ok(())
    }

    /// Read a full order record, if it exists.
    pub fn order(env: Env, order_id: BytesN<32>) -> Option<Order> {
        get_order(&env, &order_id)
    }

    /// Read the lifecycle status of an order, if it exists.
    pub fn status(env: Env, order_id: BytesN<32>) -> Option<Status> {
        get_order(&env, &order_id).map(|order| order.status)
    }

    /// Query whether an order has received funds (Paid or Shipped).
    pub fn is_paid(env: Env, order_id: BytesN<32>) -> bool {
        match get_order(&env, &order_id) {
            Some(order) => order.is_paid(),
            None => false,
        }
    }
}
