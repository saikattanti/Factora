#![cfg(test)]

use super::*;
use soroban_sdk::{
    contract, contractimpl,
    testutils::{Address as _, Ledger},
    token, Address, Env, Symbol, Val, Vec
};

#[contract]
pub struct MockRegistry;

#[contractimpl]
impl MockRegistry {
    pub fn is_verified(env: Env, _business: Address) -> bool {
        true
    }
}

#[test]
fn test_invoice_lifecycle() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let business = Address::generate(&env);
    let investor = Address::generate(&env);
    
    let token_address = env.register_stellar_asset_contract(admin.clone());
    let token_client = token::Client::new(&env, &token_address);
    let token_admin = token::StellarAssetClient::new(&env, &token_address);

    let contract_id = env.register_contract(None, InvoiceFactoringContract);
    let client = InvoiceFactoringContractClient::new(&env, &contract_id);

    let registry_id = env.register_contract(None, MockRegistry);

    client.initialize(&admin, &token_address, &registry_id);

    token_admin.mint(&investor, &10_000);
    token_admin.mint(&business, &1_000);

    let invoice_id = Symbol::new(&env, "INV001");
    let amount = 1000i128;
    let interest = 500u32; // 5% (500 basis points)
    let funding_goal = 800i128;
    let current_time = 1000u64;
    let due_date = 2000u64;

    env.ledger().with_mut(|l| {
        l.timestamp = current_time;
    });

    client.create_invoice(&invoice_id, &business, &amount, &interest, &funding_goal, &due_date);

    let invoice = client.get_invoice(&invoice_id).unwrap();
    assert_eq!(invoice.amount, amount);
    assert_eq!(invoice.funding_goal, funding_goal);
    assert_eq!(invoice.status, InvoiceStatus::Published);

    client.fund_invoice(&invoice_id, &investor, &500);
    let invoice = client.get_invoice(&invoice_id).unwrap();
    assert_eq!(invoice.current_funding, 500);
    assert_eq!(invoice.status, InvoiceStatus::PartiallyFunded);
    assert_eq!(token_client.balance(&investor), 9_500);
    assert_eq!(token_client.balance(&contract_id), 500);

    client.fund_invoice(&invoice_id, &investor, &300);
    let invoice = client.get_invoice(&invoice_id).unwrap();
    assert_eq!(invoice.current_funding, 800);
    assert_eq!(invoice.status, InvoiceStatus::AwaitingPayment);
    
    assert_eq!(token_client.balance(&business), 1_800); // 1000 + 800
    assert_eq!(token_client.balance(&contract_id), 0);

    token_admin.mint(&business, &40); // add interest amount to business wallet
    client.mark_paid(&invoice_id, &business);
    let invoice = client.get_invoice(&invoice_id).unwrap();
    assert_eq!(invoice.status, InvoiceStatus::Paid);
    assert_eq!(token_client.balance(&contract_id), 840); // principal (800) + 5% interest (40)

    client.withdraw_return(&invoice_id, &investor);
    let invoice = client.get_invoice(&invoice_id).unwrap();
    assert_eq!(invoice.status, InvoiceStatus::Completed);
    assert_eq!(token_client.balance(&investor), 9_200 + 840);
    assert_eq!(token_client.balance(&contract_id), 0);
}

#[test]
fn test_cancel_invoice() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let business = Address::generate(&env);
    let investor = Address::generate(&env);
    
    let token_address = env.register_stellar_asset_contract(admin.clone());
    let token_client = token::Client::new(&env, &token_address);
    let token_admin = token::StellarAssetClient::new(&env, &token_address);

    let contract_id = env.register_contract(None, InvoiceFactoringContract);
    let client = InvoiceFactoringContractClient::new(&env, &contract_id);

    let registry_id = env.register_contract(None, MockRegistry);

    client.initialize(&admin, &token_address, &registry_id);

    token_admin.mint(&investor, &10_000);

    let invoice_id = Symbol::new(&env, "INV002");
    let amount = 1000i128;
    let interest = 500u32;
    let funding_goal = 800i128;
    let current_time = 1000u64;
    let due_date = 2000u64;

    env.ledger().with_mut(|l| {
        l.timestamp = current_time;
    });

    client.create_invoice(&invoice_id, &business, &amount, &interest, &funding_goal, &due_date);
    client.fund_invoice(&invoice_id, &investor, &400);

    assert_eq!(token_client.balance(&investor), 9_600);
    assert_eq!(token_client.balance(&contract_id), 400);

    // Cancel invoice
    client.cancel_invoice(&invoice_id);
    let invoice = client.get_invoice(&invoice_id).unwrap();
    assert_eq!(invoice.status, InvoiceStatus::Cancelled);

    // Funds returned to investor
    assert_eq!(token_client.balance(&investor), 10_000);
    assert_eq!(token_client.balance(&contract_id), 0);
}
