# Notes and Nullifiers

## Global Constants

See [constants.hpp](../../barretenberg/src/aztec/rollup/proofs/notes/constants.hpp) and [constants.hpp](../../barretenberg/src/aztec/rollup/constants.hpp) for cosntants.

## Pedersen background

A note on pedersen hashing.

- `pedersen::commit` returns a point.
- `pedersen::compress` returns the x-coordinate of `pedersen::commit`.

A different generator is used for each type of note and nullifier (including different generators for partial vs complete commitments).

Note: `pedersen::compress` is collision resistant (see the large comment above the `hash_single` function in the codebase), so this can be used in place of `pedersen::commit` for note commitments & nullifiers.

## Notes and Commitments

### Account note

An **Account Note** associates a spending key with an account. It consists of the following three field elements. Se the dedicated `account_circuit.md` for more details.

- `account_alias_id`: a concatentation of the 224 bit `alias_hash`, with the 32-bit `account_nonce`. `account_alias_id` is enforced to be smaller than $p$ (the bn-254 curve size), thus not all 32 byte values are possible.
- `account_public_key.x`: the x-coordinate of the account public key
- `spending_public_key.x`: the x-coordinate of the spending key that is been assigned to this account via this note.

An account note commitment is:

- `pedersen::compress(account_alias_id, account_public_key.x, signing_pub_key.x)`
  - Pedersen GeneratorIndex: `ACCOUNT_NOTE_COMMITMENT`
  - `allow_zero_inputs = true`

### Value note

**partial commitment**

- `pedersen::compress(secret, owner.x, owner.y, account_nonce, creator_pubkey)`
  - Pedersen GeneratorIndex: `VALUE_NOTE_PARTIAL_COMMITMENT`
  - `allow_zero_inputs = true`
    - `creator_pubkey` can be zero.

> _Note:_ The `account_nonce` plays a role in enabling the revocation of spending keys. The `secret` is to construct a hiding Pedersen commitment to hide the note details.

**complete commitment**

- `pedersen::compress(value_note_partial_commitment, value, asset_id, input_nullifier)`
  - Pedersen GeneratorIndex: `VALUE_NOTE_COMMITMENT`
  - `allow_zero_inputs = true`
    - `value` and `asset_id` can be zero

In other words:

$$
Comm(\text{ValueNote}) = \big( [(note.secret \cdot g_0 + note.owner.x \cdot g_1 + note.owner.y \cdot g_2 + note.account\_nonce \cdot g_3 + note.creator\_pubkey \cdot g_4).x] \cdot h_0 + \\ note.value \cdot h_1 + note.asset\_id \cdot h_2 + note.input\_nullifier \cdot h_5 \big) .x
$$

(The generator indexing is just for illustration. Consult the code.)

### Claim note

**partial commitment**

- `pedersen::compress(deposit_value, bridge_id, value_note_partial_commitment, input_nullifier)`
  - Pedersen GeneratorIndex: `CLAIM_NOTE_PARTIAL_COMMITMENT`
  - `allow_zero_inputs = true`
    - `bridge_id` can be zero.

**complete commitment**

- `pedersen::compress(claim_note_partial_commitment, defi_interaction_nonce, fee)`
  - Pedersen GeneratorIndex: `CLAIM_NOTE_COMMITMENT`
  - `allow_zero_inputs = true`
    - `fee` and `defi_interaction_nonce` could be zero.

### Defi Interaction note

**commitment**

- `pedersen::compress(bridge_id, total_input_value, total_output_value_a, total_output_value_b, interaction_nonce, interaction_result)`
  - Pedersen GeneratorIndex: `DEFI_INTERACTION_NOTE_COMMITMENT`
  - `allow_zero_inputs = true`

# Note encryption and decryption

Details on this are found [here](https://hackmd.io/@aztec-network/BJKHah_4d)

# Nullifiers

## Value note nullifier

**Objectives** of this nullifier:

- Only the owner of a note may be able to produce the note's nullifier.
- No collisions. Each nullifier can only be produced for one value note commitment. Duplicate nullifiers must not be derivable from different note commitments.
- No collisions between nullifiers of other notes (i.e. claim notes or defi interaction notes).
- No double-spending. Each commitment must have one, and only one, nullifier.
- The nullifier must only be accepted and added to the nullifier tree if it is the output of a join-split circuit which 'spends' the corresponding note.

**Calculation**
We set out the computation steps below, with suggestions for changes:

- `hashed_pk = account_private_key * G` (where `G` is a generator unique to this operation).
  - This `hashed_pk` is useful to demonstrate to a 3rd party that you've nullified something without having to provide your secret key.
- `compressed_inputs = pedersen::compress(value_note_commitment, hashed_pk.x, hashed_pk.y, is_real_note)`
  - This compression step reduces the cost (constrain-wise) of the blake2s hash which is done next.
- `nullifier = blake2s(compressed_inputs);`
  - blake2s is needed, because a pedersen commitment alone can leak data (see comment in the code for more details on this).

Pedersen GeneratorIndex:

- `JOIN_SPLIT_NULLIFIER_ACCOUNT_PRIVATE_KEY` for the hashed_pk
  - `allow_zero_inputs = false`
- `JOIN_SPLIT_NULLIFIER` to compress the inputs
  - `allow_zero_inputs = true`

## Claim note nullifier

**Objectives** of this nullifier:

- Anyone (notably the rollup provider) may be able to produce this nullifier.
- No collisions. Each nullifier can only be produced for one claim note commitment. Duplicate nullifiers must not be derivable from different claim note commitments.
- No collisions between nullifiers of other notes (i.e. value notes or defi interaction notes).
- This nullifier must only be added to the nullifier tree if it is the output of a claim circuit which 'spends' the corresponding claim note.
- No double-spending. Each claim note commitment must have one, and only one, nullifier.

**Calculation**

- `nullifier = pedersen::compress(claim_note_commitment);`
  - Note: it is ok that observers can see which claim note is being nullified, since values in a defi interaction are public (only owners are private). Furthermore, the rollup priovider needs to be able to generate the claim proof and doesn't have access to any user secrets - so this nullifier allows this use case.
  - Pedersen GeneratorIndex:`CLAIM_NOTE_NULLIFIER`
  - `allow_zero_inputs = true`

## Defi Interaction note 'dummy' nullifier

**Objectives** of this nullifier:

- This is not a 'conventional' nullifier, in the sense that it doesn't prevent others from 'referring' to the defi interaction note. It's really only needed so that _something_ unique may be fed into the `output_note_2` output of the claim circuit.
- Anyone (notably the rollup provider) may be able to produce a valid 'dummy nullifier' on behalf of any user who partook in the corresponding defi interaction.
- No collisions between nullifiers of other notes (i.e. value notes or claim notes).
- This nullifier must only be added to the nullifier tree if it is the output of a claim circuit which 'refers' the corresponding defi interaction note note and 'spends' a claim note which was created during that defi interaction.

**Calculation:**

- `nullifier = pedersen::compress(defi_interaction_note_commitment, nonce);`
  - The `nonce` is a unique value generated by the sdk, allowing multiple users to all 'refer to' the `defi_interaction_note`, without properly nullifying it.
  - Pedersen GeneratorIndex:`CLAIM_NOTE_NULLIFIER`
  - `allow_zero_inputs = true`
