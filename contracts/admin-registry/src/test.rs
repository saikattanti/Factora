#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env};

#[test]
fn test_verification_flow() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, AdminRegistryContract);
    let client = AdminRegistryContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let business = Address::generate(&env);

    client.initialize(&admin);

    assert_eq!(client.is_verified(&business), false);

    client.verify_business(&business);
    assert_eq!(client.is_verified(&business), true);

    client.revoke_business(&business);
    assert_eq!(client.is_verified(&business), false);
}
