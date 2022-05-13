# JoinSplit Circuit

[![hackmd-github-sync-badge](https://hackmd.io/zwjbbtxkTKm00nAOvAJY-w/badge)](https://hackmd.io/zwjbbtxkTKm00nAOvAJY-w)

### Circuit Description

This circuit allows notes to be spent.

The circuit takes in two input notes, and two new output notes, and updates the Note Tree and Nullifier Tree accordingly.

### Circuit Inputs: Summary

The inputs for the join-split circuit are all elements of the field $\mathbb{F}_p$ from the BN254 specification.

### Public Inputs: Detail

1. `proof_id`
1. `output_note_commitment_1`
1. `output_note_commitment_2`
1. `nullifier_1`
1. `nullifier_2`
1. `public_value`
2. `public_owner`
3. `public_asset_id`

4. `old_data_tree_root`
1. `tx_fee`
2. `tx_fee_asset_id`
3. `bridge_id`
4. `defi_deposit_value`
5. `defi_root` // Note: this will not be used by the circuit, but is included so that the number of public inputs is uniform across base-level circuits.
6. `backward_link`
7. `allow_chain`

### Private Inputs: Detail

```js
{
  asset_id,
  num_input_notes,

  input_note_1_index,
  input_note_2_index,

  input_note_1_path,
  input_note_2_path,

  input_note_1: {
    value,
    secret,
    owner,
    asset_id,
    account_nonce,
    creator_pk,
    input_nullifier,
  },

  input_note_2: {
    value,
    secret,
    owner,
    asset_id,
    account_nonce,
    creator_pk,
    input_nullifier,
  },

  output_note_1: {
    value,
    secret,
    owner,
    asset_id,
    account_nonce,
    creator_pk, // (creator_pk = optional public key of note creator)
    input_nullifier,
  },

  output_note_2: {
    value,
    secret,
    owner,
    asset_id,
    account_nonce,
    creator_pk, // (creator_pk = optional public key of note creator)
    input_nullifier,
  },

  partial_claim_note_data: {
    deposit_value,
    bridge_id_data: {
      bridge_address_id,
      input_asset_id_a,
      input_asset_id_b,
      output_asset_id_a,
      output_asset_id_b,
      config: {
        second_input_in_use,
        second_output_in_use,
      },
      aux_data,
    },
    note_secret,
    input_nullifier,
  },

  account_private_key,
  alias_hash,
  account_nonce,
  account_note_index,
  account_note_path,

  signing_pk, // (a.k.a. spending public key)
  signature,
}
```

### Index of Functions

In the Pseudocode to follow, we use the following function names. See [notes & nullifiers](./notes_and_nullifiers.md) for more details.

- `public_key()` derives a public key from a given secret key.
- `value_note_commit()` - **Value note commitment function**, which is assumed to be
  - Collision-resistant
  - Field-friendly, which means the output value only depends on the inputs as field elements, and doesn’t change e.g. when input changes from a to a+r as bit string.
- `partial_value_note_commit()` - **Partial value note commitment function**. Has the same assumptions as `value_note_commit`. Uses a different generator. Stresses that the data being committed to is _partial_ - a subset of the data committed to by `value_note_commit`.
- `partial_claim_note_commit()` - **Partial claim note commitment function**. Has the same assumptions as `value_note_commit`. Uses a different generator. Stresses that the data being committed to is _partial_ - a subset of the data committed to by `claim_note_commit` (in the claim circuit).
- `account_note_commit()` - **Account note ommitment function**, which is assumed to be collision resistant.
- `compute_nullifier()` - **Nullifier Function**, which we assume can be modeled as a random oracle, and only depends on `account_private_key` $mod r$.


### Circuit Logic (Pseudocode)

```js

// range checks:
  for i = 1,2:
  {
    check:
      input_note_i_index < 2 ** DATA_TREE_DEPTH
      input_note_i.value < 2 ** NOTE_VALUE_BIT_LENGTH
      output_note_i.value < 2 ** NOTE_VALUE_BIT_LENGTH
  }

  partial_claim_note.deposit_value < 2 ** DEFI_DEPOSIT_VALUE_BIT_LENGTH

  asset_id < 2 ** MAX_NUM_ASSETS_BIT_LENGTH
  public_value < 2 ** NOTE_VALUE_BIT_LENGTH
  tx_fee < 2 ** TX_FEE_BIT_LENGTH

  account_note_index < 2 ** DATA_TREE_DEPTH
  alias_hash < 2 ** ALIAS_HASH_BIT_LENGTH
  account_nonce < 2 ** ACCOUNT_NONCE_BIT_LENGTH

  num_input_notes in {0, 1, 2}
  allow_chain in {0, 1, 2, 3}

// tx type initialisations:
  const is_deposit = proof_id == DEPOSIT
  const is_withdraw = proof_id == WITHDRAW
  const is_send = proof_id == SEND
  const is_defi_deposit = proof_id == DEFI_DEPOSIT
  const is_public_tx = is_deposit || is_withdraw

// public value initialisations
  const public_asset_id = is_public_tx ? asset_id : 0;
  const public_input = is_deposit ? public_value : 0;
  const public_output = is_withdraw ? public_value : 0;

// account initialisations
  const account_pk = public_key(account_private_key);
  const signer_pk = account_nonce ? signing_pk.x : account_pk.x;

  const account_alias_id = concat( account_nonce, alias_hash );
  const account_note = {
    account_alias_id,
    account_pk,
    signer_pk,
  };
  const account_note_commitment = account_note_commit(account_note);

// commitments
  for i in 1,2
  {
    input_note_i.commitment = value_note_commit(input_note_i);
    output_note_i.commitment = value_note_commit(output_note_i);
  }

// Data validity checks:
  require(num_input_notes = 0 || 1 || 2); // it's pseudocode!
  require(is_deposit || is_send || is_withdraw || is_defi_deposit);

  if(num_input_notes == 0) require(is_deposit);

  if (is_public_tx) {
    require(public_value > 0);
    require(public_owner > 0);
  } else {
    require(public_value == 0);
    require(public_owner == 0);
  }

  require(input_note_1.commitment != input_note_2.commitment);

  require(
    (asset_id == input_note_1.asset_id) &&
    (asset_id == output_note_1.asset_id) &&
    (asset_id == output_note_2.asset_id) &&
  );

  if (
    (num_input_notes == 2) && 
    !is_defi_deposit
  ) {
    require(input_note_1.asset_id == input_note_2.asset_id);
  }

  require(account_private_key != 0);

  const account_public_key = public_key(account_private_key);
  require(
    account_public_key == input_note_1.owner &&
    account_public_key == input_note_2.owner
  );

  require(
    account_nonce == input_note_1.account_nonce &&
    account_nonce == input_note_2.account_nonce
  );

  if (output_note_1.creator_pubkey) {
    require(account_public_key == output_note_1.creator_pubkey);
  }

  if (output_note_2.creator_pubkey) {
    require(account_public_key == output_note_2.creator_pubkey);
  }

// Defi deposit

  let output_note_1_commitment = output_note_1.commitment; // supersedes output_note_1.commitment frin here on in.
  let input_note_2_value = input_note_2.value; // supersedes input_note_2.value from here on in.
  let output_note_1_value = output_note_1.value;
  let defi_deposit_value = 0;

  if (is_defi_deposit) {
    const partial_value_note = {
      secret: partial_claim_note_data.note_secret,
      owner: input_note_1.owner,
      account_nonce: input_note_1.account_nonce,
      creator_pubkey = 0,
    };
    const partial_value_note_commitment = partial_value_note_commit(partial_value_note);

    const partial_claim_note = {
      deposit_value: partial_claim_note_data.deposit_value,
      bridge_id: partial_claim_note_data.bridge_id_data.to_field(),
      partial_value_note_commitment,
      input_nullifier: partial_claim_note_data.input_nullifier,
    }
    const partial_claim_note_commitment = partial_claim_note_commit(partial_claim_note)

    output_note_1_commitment = partial_claim_note_commitment;

    defi_deposit_value = partial_claim_note.deposit_value;

    require(defi_deposit_value > 0);

    const { bridge_id_data } = partial_claim_note_data;
    const bridge_id = bridge_id_data.to_field();

    require(bridge_id_data.input_asset_id_a == input_note_1.asset_id);

    if (input_note_2_in_use && (input_note_1.asset_id != input_note_2.asset_id)) {
      require(defi_deposit_value == input_note_2.value);
      require(bridge_id_data.config.second_input_in_use);
      input_note_2_value = 0; // set to 0 for the 'conservation of value' equations below.
    }

    if (bridge_id_data.config.second_input_in_use) {
      require(input_note_2_in_use);
      require(input_note_2.asset_id == bridge_id_data.input_asset_id_b);
    }

    output_note_1_value = 0; // set to 0, since the partial claim note replaces it.
  }

// Conservation of value: no value created or destroyed:
  const total_in_value = public_input + input_note_1.value + input_note_2_value
  const total_out_value = public_output + (is_defi_deposit ? defi_deposit_value : output_note_1_value) + output_note_2.valuue

// fee
  const tx_fee = total_in_value - total_out_value // (no underflow allowed)


// Check input notes are valid:
  let input_note_1_in_use = num_input_notes >= 1;
  let input_note_2_in_use = num_input_notes == 2;

  for i = 1,2:
  {
    if (input_note_i_in_use) {
      const input_note_commitment_i = value_note_commit(input_note_i);
      const exists = check_membership(
        input_note_commitment_i, input_note_i_index, input_note_i_path, old_data_tree_root
      );
      require(exists);
    } else {
      require(input_note_i.value == 0);
    }
  }

// Compute nullifiers
  for i = 1,2:
  {
    nullifier_i = compute_nullifier(
      input_note_i.commitment,
      account_private_key,
      input_note_i_in_use,
    );
  }

  require(
    output_note_1.input_nullifier == nullifier_1 &&
    output_note_2.input_nullifier == nullifier_2 &&
    partial_claim_note.input_nullifier == is_defi_deposit ? nullifier_1 : 0;
  )

// Verify account ownership
  check_membership(account_note_commitment, account_note_index, account_note_path, old_data_tree_root);

  message = (
    public_value,
    public_owner,
    public_asset_id,
    output_note_1_commitment, // notice this is NOT output_note_1.commitment
    output_note_2.commitment,
    nullifier_1,
    nullifier_2,
    backward_link,
    allow_chain,
  );

  verify_signature(
    message,
    signature,
    signer_public_key
  );

// Check chained transaction inputs are valid:
  const backward_link_in_use = inputs.backward_link != 0;
  const note1_propagated = inputs.backward_link == input_note_1.commitment;
  const note2_propagated = inputs.backward_link == input_note_2.commitment;

  if (backward_link_in_use) require(note1_propagated || note2_propagated);

  if (is_defi_deposit) require(allow_chain != 1);

  if (inputs.allow_chain == 1) require(output_note_1.owner == input_note_1.owner);
  if (inputs.allow_chain == 2) require(output_note_2.owner == input_note_1.owner);

// Constrain unused public inputs to zero:
  require(defi_root == 0);

// Set public inputs (simply listed here without syntax):
  proof_id,
  output_note_1_commitment,
  output_note_2.commitment,
  nullifier_1,
  nullifier_2,
  public_value,
  public_owner,
  public_asset_id,

  old_data_tree_root,
  tx_fee,
  asset_id,
  bridge_id,
  defi_deposit_value,
  defi_root,
  backward_link,
  allow_chain
```
