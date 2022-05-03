# Account Circuit

## Background

Aztec accounts are different from Ethereum addresses, mainly because deriving an Ethereum address is expensive (constraint-wise) within a circuit (although there are plans to implement Ethereum address derivation methods soon). Also, Aztec accounts have several extra features:

- A human-readable name (an 'alias') can be associated with an account public key. (In fact, multiple aliases can point to the same account public key, but this is something of a 'bug-feature').
- Multiple (unlimited) spending keys (a.k.a. signing keys) can be associated with an account `alias` and its `account_public_key`, to enable users to more-easily spend from multiple devices (for example).
- Spending keys can also be used for account recovery (e.g. with the aid of a 3rd party).
- If the account key is compromised, a user can migrate to a new account key.

Keys:

- Spending/signing keys are used to _spend_ value notes.
- Account keys are used to decrypt encrypted value note data.
  - Also, initially (before any alias or signing keys are linked to the account), the 0th account key serves as a spending key for a user's value notes. Thereafter only spending keys can be used to spend notes.

_See the diagram (below) for derivations of the various keys._

An **account note** links together a user's `account_nonce`, `alias`, `account_public_key` and `signer_public_key`, pedersen-committing to those items. Note, a user's account can have _multiple_ valid, 'current' (not-yet-nullified) account notes at once; each with a different `signer_public_key` linked to it. By design, all 'current' account notes have the same `account_nonce`, and all 'current' account notes can be nullified in one fell swoop by a single nullifier.

An **account nullifier** actually nullifies an `(account_nonce, alias)` pair, rather than an individual account note. Upon nullifying such a pair, the account circuit increments the `account_nonce` by `1` and a set of new account notes must be created containing this new `account_nonce`, via the account circuit. _All_ previous spending keys (associated with account notes which contained a lower nonce) can no-longer be used to spend any of the user's value notes (unless new account notes are created to link those spending keys with the newly-incremented `account_nonce`).

It's worth noting, then that unlike the join-split circuit (for example), which always produces nullifiers, the account circuit only conditionally produces one nullifier when migrating, but not when simply adding spending keys to an account.

In all, the account circuit can be used to:

- Migrate
  - Migration is the act of:
    - Incrementing a user's `account_nonce`; and/or
    - Updating a user's `account_public_key` to a new one; and/or
    - Associating an alias with an `account_public_key` (if the `account_nonce == 0`).
- Add spending keys to an account.
  - I.e. link a `spending_public_key` to an `(account_nonce, alias, acount_public_key)` trio.


## More on Nullifiers

It's possible for `nullifier_1` to be `0` (when not migrating):
- `nullifier_1` = `migrate ? pedersen::compress(account_alias_id) : 0;`

`nullifier_2` is always `0`.

**Both of these nullifier derivations differ from the already-deployed mainnet code (Aztec 1.0).** In Aztec 1.0, both nullifiers are always nonzero (the nullifier_2 is a gibberish nullifier with a unique (random) nonce being input into the circuit).

The rollup circuit for Aztec 2.0 permits unlimited `0` nullifiers to be added to the nullifier tree, because:
- Each nullifier is added to the nullifier tree at the leafIndex which is equal to the nullifier value.
- So the rollup circuit will try to add `nullifier = 0` to `leafIndex = 0`.
- First it checks whether the leaf is empty. Well `0` implies "empty", so this check will pass, and the value `0` will be once-again added to the 0th leaf.

## Diagram

[Here's](https://drive.google.com/file/d/1iscYm-B89I9LIB7YgM_L9cHaV6SSMjRT/view?usp=sharing) a detailed diagram of how all of Aztec's different keypairs are derived, and the flow of account creation and migration. (Edits are welcome - let Mike know if the link doesn't work).

# The circuit

## Account Circuit: Worked Example

_There's a little diagram at the diagrams link too._

1. Alice generates a grumpkin key pair `(account_private_key, account_public_key)`.
1. Alice can receive funds prior to registering an `alias` at `(account_public_key, account_nonce = 0)`
   - I.e. a sender can send Alice funds by creating a value note with preimage values:
     - `owner = account_public_key`
     - `account_nonce = account_nonce = 0`
1. Alice can register the alias `alice` against her `account_public_key` using the account circuit.
   - The `account_alias_id = (alice, 0)` gets nullified, effectively 'reserving' the alias `alice` to prevent anyone else using it.
   - Alice's `account_public_key`, her new 'account alias id' `(alice, 1)`, and two new spending keys, are all linked together via two new account notes which get added to the data tree.
1. Alice must then transfer any previously-received funds that were sent to `(account_public_key, 0)` (i.e. value notes containing that (owner, account_nonce) info in their preimages), to `(account_public_key, 1)`.
1. Alice can register unlimited additional spending keys to `(alice, 1)`, via additional calls to the account circuit.
1. If a spending key becomes compromised, Alice can nullify `account_alias_id = (alice, 1)` using the account circuit, and can associate new spending keys with `(alice, 2)`.
1. Alice must then transfers funds at `(account_public_key, 1)`, to `(account_public_key, 2)`.
1. Similarly, if Alice's `account_private_key` becomes compromised, she can use the account circuit to migrate to a new `account_public_key`.

## Circuit Inputs: Summary

The inputs for the account circuit are:

$$ \text{Account Inputs} = (\text{Public Inputs}, \text{Private Inputs}) \in \mathbb{F}\_p^{13} \times \mathbb{F}\_p^{25}$$

As previously, the field $\mathbb{F}_p$ is from the BN254 specification.

### Public Inputs: Detail

Recall that all inner circuits must have the **same number of public inputs** as they will be used homogenously by the rollup circuit. Hence, most of the account circuit's public inputs are 0, because they're not actually needed for the account circuit's functionality.

1. `proof_id = PublicInputs::ACCOUNT` (i.e. this is effectively a witness which can only take one valid value).
1. `output_note_commitment_1`
1. `output_note_commitment_2`
1. `nullifier_1`
1. `nullifier_2 = 0` - Notice this nullifier is always set to 0.
1. `public_value = 0`
1. `public_owner = 0`
1. `asset_id = 0`
1. `data_tree_root`
1. `tx_fee = 0`
1. `tx_fee_asset_id = 0`
1. `bridge_id = 0`
1. `defi_deposit_value = 0`
1. `defi_root = 0`
1. `backward_link = 0`
1. `allow_chain = 0`

### Private Inputs: Detail

1. `account_public_key`
1. `new_account_public_key`
1. `signing_public_key`
1. `signature`
1. `new_signing_public_key_1`
1. `new_signing_public_key_1`
1. `alias_hash = blake2s(alias).slice(0, 28)`
1. `account_nonce`
1. `migrate` (bool)
1. `account_note_index`
1. `account_note_path`

## Circuit Logic (Pseudocode)

Computed vars:

- `account_alias_id = concat(account_nonce, alias_hash)`
- `output_account_nonce` = `migrate + nonce`
- `output_account_alias_id` = `concat(output_account_nonce, alias_hash)`
- `signer` = `account_nonce == 0 ? account_public_key : signing_public_key`
- `message` = `pedersen::compress(account_alias_id, account_public_key.x, new_account_public_key.x, spending_public_key_1.x, spending_public_key_2.x)`
- `account_note_commitment` = `pedersen::compress(account_alias_id, account_public_key.x, signer.x)`

Computed public inputs:

- `output_note_commitment_1` = `pedersen::compress(output_account_alias_id, new_account_public_key.x, spending_public_key_1.x)`
- `output_note_commitment_2` = `pedersen::compress(output_account_alias_id, new_account_public_key.x, spending_public_key_2.x)`
- `nullifier_1` = `migrate ? pedersen::compress(account_alias_id) : 0;`

Circuit constraints:

- `migrate == 1 || migrate == 0`
- `if (account_nonce == 0) { require(migrate == true); }`
- `if (account_public_key != new_account_public_key) { require(migrate == true); }`
- `verify_signature(message, signer, signature) == true`
- `if (account_nonce != 0) { require(membership_check(account_note_data, account_note_index, account_note_path, data_tree_root) == true) }`
- Assert all 'zeroed' public inputs are indeed zero.
