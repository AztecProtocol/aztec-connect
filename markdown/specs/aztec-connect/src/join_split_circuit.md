# JoinSplit Circuit

[![hackmd-github-sync-badge](https://hackmd.io/zwjbbtxkTKm00nAOvAJY-w/badge)](https://hackmd.io/zwjbbtxkTKm00nAOvAJY-w)

### Circuit Description

This circuit allows notes to be spent.

The circuit takes in two input notes, and two new output notes, and updates the Note Tree and Nullifier Tree accordingly.

### Circuit Inputs: Summary

The inputs for the join-split circuit are:

$$ \text{JoinSplit Inputs} = (\text{Public Inputs}, \text{Private Inputs}) \in \mathbb{F}\_p^{13} \times \mathbb{F}\_p^{28}$$

Where the field $\mathbb{F}_p$ is from the BN254 specification.

### Public Inputs: Detail

1. `proof_id`
1. `output_note_commitment_1`
1. `output_note_commitment_2`
1. `nullifier_1`
1. `nullifier_2`
1. `public_value`
1. `public_owner` // WARNING: public_owner doesn't seem to be constrained to anything, except a nonzero check.
1. `public_asset_id`

1. `old_data_tree_root`
1. `tx_fee`
1. `tx_fee_asset_id`
1. `bridge_id`
1. `defi_deposit_value`
1. `propagated_input_index`
1. `backward_link`
1. `allow_chain`

1. `defi_root` // note: this will not be used by the circuit, but is included so that the number of public inputs is uniform across base-level circuits.

### Private Inputs: Detail

1. `asset_id` // TODO: possibly redundant field, given this info is already contained within input_note_i
1. `nonce` // TODO: possibly redundant field, given this info is already contained within input_note_i
1. `num_input_notes`

1. `input_note_1_index`
1. `input_note_2_index`
1. `input_note_1_path`
1. `input_note_2_path`

1. `input_note_1.value`
1. `input_note_1.secret`
1. `input_note_1.owner`
1. `input_note_1.asset_id`
1. `input_note_1.nonce`
1. `input_note_1.creator_pk` (creator_pk = optional public key of note creator)
1. `input_note_1.input_nullifier`

1. `input_note_2.value`
1. `input_note_2.secret`
1. `input_note_2.owner`
1. `input_note_2.asset_id`
1. `input_note_1.nonce`
1. `input_note_2.creator_pk`
1. `input_note_2.input_nullifier`

1. `output_note_1.value`
1. `output_note_1.secret`
1. `output_note_1.owner`
1. `output_note_1.asset_id`
1. `output_note_1.nonce`
1. `output_note_1.creator_pk`
1. `output_note_1.input_nullifier`

1. `output_note_2.value`
1. `output_note_2.secret`
1. `output_note_2.owner`
1. `output_note_2.asset_id`
1. `output_note_2.nonce`
1. `output_note_2.creator_pk`
1. `output_note_2.input_nullifier`

1. `claim_note.deposit_value`
1. `claim_note.bridge_id_data.bridge_contract_address`
1. `claim_note.bridge_id_data.num_output_notes`
1. `claim_note.bridge_id_data.input_asset_id`
1. `claim_note.bridge_id_data.output_asset_id_a`
1. `claim_note.bridge_id_data.output_asset_id_b`
1. `claim_note.note_secret`
1. `claim_note.input_nullifier`

1. `account_private_key` (a.k.a. nullifier private key)
1. `alias_hash`
1. `account_note_index`
1. `account_note_path`

1. `signing_pk` (a.k.a. spending public key)
1. `signature`

### Index of Functions

In the Pseudocode to follow, we use the following function names:

- `value_note_commit()` **Value note commitment function**, which is assumed to be
  - Collision-resistant
  - Field-friendly, which means the output value only depends on the inputs as field elements, and doesn’t change e.g. when input changes from a to a+r as bit string.
- `partial_value_note_commit()` **Partial value note commitment function**. Has the same assumptions as `value_note_commit`. Uses a different generator. Stresses that the data being committed to is _partial_ - a subset of the data committed to by `value_note_commit`.
- `claim_note_commit()` **Claim note commitment function**. Has the same assumptions as the `value_note_commit`. Uses a different generator.
- `partial_claim_note_commit()` **Partial claim note commitment function**. Has the same assumptions as `claim_note_commit`. Uses a different generator. Stresses that the data being committed to is _partial_ - a subset of the data committed to by `claim_note_commit`.
- `compute_nullifier()` **Nullifier Function**, which we assume can be modeled as a random oracle, and only depends on `account_private_key` $mod r$.
- `account_note_commit()` **Account Note Commitment**, which is assumed to be collision resistant.
- `public_key()` derives a public key from a given secret key.
- `update()` **Merkle Update Function** inserts a set of compressed note commitments into the note tree and validates the correctness of the associated merkle root update.

### Circuit Logic (Pseudocode)

#### Establish booleans

```
let:
  is_deposit = proof_id == DEPOSIT
  is_withdraw = proof_id == WITHDRAW
  is_public_tx = is_deposit || is_withdraw
  is_defi_deposit = proof_id == DEFI_DEPOSIT
```

#### Calculations

```
let:

// public info
  public_input = is_deposit ? public_value : 0
  public_output = is_withdraw ? public_value : 0

  public_asset_id = is_public_tx ? asset_id : 0

// account
  account_pk = public_key(account_private_key)
  signer_pk = nonce ? signing_pk.x : account_pk.x

  account_alias_id = concat( nonce, alias_hash )

  account_note = {
    account_alias_id,
    account_pk,
    signer_pk,
  }
  account_note_commitment = account_note_commit(account_note)

// commitments
  for i in 1,2
  {
    input_note_i.commitment = value_note_commit(input_note_i)
    output_note_i.commitment = value_note_commit(output_note_i)
  }

// adjustment to the output_note_1 commitment in the case of a defi deposit
  bridge_id = is_defi_deposit ? claim_note.bridge_id_data.to_field() : 0

  partial_value_note = {
    claim_note.note_secret,
    input_note_1.owner,
    input_note_1.nonce
  }
  partial_value_note_commitment = partial_value_note_commit(partial_value_note)

  partial_claim_note = {
    deposit_value: claim_note.deposit_value,
    bridge_id: claim_note.bridge_id_data.to_field(),
    partial_value_note_commitment,
    input_nullifier: claim_note.input_nullifier,
  }
  partial_claim_note_commitment = partial_claim_note_commit(partial_claim_note)

  output_note_1_commitment = is_defi_deposit ? partial_claim_note_commitment : output_note_1.commitment // supersedes output_note_1.commitment hereonin

// note values
  defi_deposit_value = is_defi_deposit ? claim_note.deposit_value : 0

  total_in_value = public_input + input_note_1.value + input_note_2.value
  total_out_value = public_output + (is_defi_deposit ? defi_deposit_value : output_note_1.value) + output_note_2.valuue

// fee
  tx_fee = total_in_value - total_out_value

// nullifier
  for i = 1,2
  {
    is_real_i = num_input_notes >= i

    nullifier_i = compute_nullifier(
      input_note_i.commitment,
      account_private_key,
      is_real_i,
    )
  }
```

#### Range Checks

```

for i = 1,2
{
  check:
    input_note_i.value <= 2 ** NOTE_VALUE_BIT_LENGTH // WARNING: these don't look to be checked in the join_split circuit?
    output_note_i.value <= 2 ** NOTE_VALUE_BIT_LENGTH // WARNING: these don't look to be checked in the join_split circuit?
}

claim_note.deposit_value <= 2 ** DEFI_DEPOSIT_VALUE_BIT_LENGTH

asset_id <= 2 ** MAX_NUM_ASSETS_BIT_LENGTH
public_value <= 2 ** NOTE_VALUE_BIT_LENGTH
tx_fee <= 2 ** TX_FEE_BIT_LENGTH
alias_hash <= 2 ** 224 // TODO: create config variable for this 224 value?

num_input_notes in {0, 1, 2}
propagated_input_index in {0, 1, 2}
allow_chain in {0, 1, 2}
```

#### Consistency checks

```
check:
  asset_id == input_note_1.asset_id == input_note_2.asset_id == output_note_1.asset_id == output_note_2.asset_id

  nonce == input_note_1.nonce == input_note_2.nonce
  // QUESTION: should output_note_i.nonce == nonce for output notes belonging to the sender?

  account_pk == input_note_1.owner == input_note_2.owner

  output_note_1.creator_pk == account_pk.x or 0
  output_note_2.creator_pk == account_pk.x or 0

  !is_public_tx <=> public_value == 0 && public_owner == 0

  output_note_1.input_nullifier == nullifier_1
  output_note_2.input_nullifier == nullifier_2
  claim_note.input_nullifier == is_defi_deposit ? nullifier_1 : 0

  total_in_value == total_out_value
```

#### Check inputs notes are valid

```
for i = 1,2
{
  compute input_note_commitment_i = value_note_commit(input_note_i)

  check membership
    (input_note_commitment_i, input_note_i_index, input_note_i_path, data_tree_root)
    == is_real_i

  if (!is_real_i) {
    ensure input_note_i.value == 0
  }
}
```

#### Verify Account Ownership

```
check membership(account_note_commitment, account_note_index, account_note_path, data_tree_root)

let message =
  (
    public_value,
    public_owner,
    public_asset_id,
    output_note_1_commitment, // notice this is NOT output_note_1.commitment
    output_note_2.commitment,
    nullifier_1,
    nullifier_2,
    propagated_input_index,
    backward_link,
    allow_chain,
  )

check CHECKSIG
  (
    message,
    signature,
    signer_pk
  )
```

#### Check chained tx inputs are valid

```
  is_defi_deposit => allow_chain != 1

  (propagated_input_index == 1) => (backward_link == input_note_1.commitment)
  (propagated_input_index == 2) => (backward_link == input_note_2.commitment)

  (allow_chain == 1) => (output_note_1.owner == input_note_1.owner)
  (allow_chain == 2) => (output_note_2.owner == input_note_1.owner)
```

#### Constrain unused public inputs to zero

```
defi_root == 0
```
