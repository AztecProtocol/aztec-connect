---
tags: Specs
---

[edit link](https://hackmd.io/ou6xa5oAQIWmEepHZQEm-Q)

# Rollup circuit

### ◈ Circuit Description

The rollup circuit aggregates proofs from a defined set of ‘inner’ circuits.

Each inner circuit has 13 public inputs. The rollup circuit will execute several defined subroutines on the public inputs.

### ◈ Public Inputs: Detail

There are $27 + 12 \times \text{rollup_size}$ public inputs, in three sections:

1. **Rollup Proof Data:** (13 + 2 \* `NUM_BRIDGE_CALLS_PER_BLOCK`) elements from $\mathbb{F}_p$ that define the rollup block information (described below)
2. **Rolled-Up Transactions Data:** Inner-circuit public inputs with `txFee` and `MerkleRoot` omitted ($12 \times \text{rollup_size}$ inputs; $12$ inputs per rolled up transaction)
3. **Recursive Proof Data:** $4$ elements from $\mathbb{F}_q$, represented as $16$ elements from $\mathbb{F}_p$, whose values are $<2^{68}$; see [here](https://hackmd.io/LoEG5nRHQe-PvstVaD51Yw) for explanation.

All are field elements. The first (13 + 2 \* `NUM_BRIDGE_CALLS_PER_BLOCK`) public inputs are the following:

1. `rollup_id`
2. `rollup_size`
3. `data_start_index`
4. `old_data_root`
5. `new_data_root`
6. `old_null_root`
7. `new_null_root`
8. `old_data_root_root`
9. `new_data_root_root`
10. `old_defi_root = 0`
11. `new_defi_root`
12. `bridge_ids` (size: `NUM_BRIDGE_CALLS_PER_BLOCK`)
13. `defi_deposit_sums` (size: `NUM_BRIDGE_CALLS_PER_BLOCK`)
14. `total_tx_fee`
15. `num_txs`

### ◈ Private Inputs: Detail

The following inputs are private to reduce proof size:

1. The recursive proof output of each inner proof (4 $\mathbb{F}_q$ elements represented as 16 $\mathbb{F}_p$ elements, see above)
2. The remaining 2 public inputs of each inner-circuit proof (the transaction fee and a claimed root of the data tree)

### ◈ Index of Functions

- `Extract` **Extraction Function** extracts 14 public inputs from a proof, validates the result matches the rollup’s inner public inputs
- `Aggregate` **Proof Aggregation Function** for ultimate batch verification outside the circuit, given a verification key and (optional, defined by 4th input parameter) a previous output of Aggregate. Returns a BN254 point pair
- `NonMembershipUpdate` **Nullifier Update Function** checks a nullifier is not in a nullifier set given its root, then inserts the nullifier and validates the correctness of the associated merkle root update
- `BatchUpdate` **Batch Update Function** inserts a set of compressed note commitments into the note tree and validates the corretness of the associated merkle root update
  Update - inserts a single leaf into the root tree and validates the corretness of the associated merkle root update
- `ProcessDefiDeposit` **Processes Defi Deposit** ensures that if a given inner proof is a defi deposit proof, it has a valid bridge id that matches one of the input bridge ids to the rollup. Further, it also adds the `defi_interaction_nonce` in the encrypted claim note of a defi deposit proof.
- `ProcessClaim` **Process Claims** checks if the claim proof is using the correct defi root.

### ◈ Circuit Logic (Pseudocode)

1. Let `Q_0 = [0, 0]`
2. Validate `num_inputs == N`
3. For `i = 1, ..., num_inputs`
   1. Let `pub_inputs = Extract(PI_i)`
   1. Let `vk = vks[proof_id_i]`
   1. Let `Q_i = Aggregate(PI_i, pub_inputs, vk, Q_{i-1}, (i > 1))`
   1. Let $\text{leaf}_{2i}$ = `output_nc_1_i`
   1. Let $\text{leaf}_{2i+1}$ = `output_nc_2_i`
   1. Validate `NonMembershipUpdate(`$\text{null_root}_{2i}$, $\text{null_root}_{2i+1}$, `nullifier_1_i)`
   1. Validate `NonMembershipUpdate(`$\text{null_root}_{2i + 1}$, $\text{null_root}_{2i+2}$`, nullifier_2_i)`
   1. Validate `Membership(old_data_roots_root, data_tree_root_index_i, data_tree_root_i)`
   1. If `pub_inputs.PROOF_ID = DEFI_DEPOSIT` then `ProcessDefiDeposit`:
      - Check `pub_inputs.ASSET_ID` matches _only_ one (say `k`th) bridge id in `bridge_ids`
      - Update `defi_deposit_sums[k] += pub_inputs.PUBLIC_OUTPUT`
      - Update `encrypted_claim_note += (defi_interaction_nonce * rollup_id + k) * G_j`, `k ⋹ 0, 1, 2, 3`
   1. Validate `ProcessClaim(pub_inputs, new_defi_root)`
4. Validate `[P1, P2] = Q_{num_inputs}`
5. Validate `BatchUpdate(old_data_root, new_data_root, data_start_index, leaf_1, ..., leaf_{2 * num_inputs})`
6. Validate `old_null_root = null_root_1`
7. Validate `new_null_root = null_root_{2 * num_inputs + 1}`
