---
tags: Specs
---
[edit](https://hackmd.io/MKKHuoewSNOD8_QwgOhJCQ)
# Escape-Hatch Circuit

### ◈ Circuit Description

This is an outer circuit, allowing the user to withdraw funds directly from the network without requiring a relayer service to roll up the transaction. It is a temporary safeguard until the node service is decentralised.

The escape hatch circuit consists of a JoinSplit circuit, combined with checks usually done in the rollup circuit. Namely, that the nullifiers and data tree root are valid.

The rollup smart contract will only accept escape hatch proofs for a two-hour window every twenty-four hours, to prevent race conditions between rollup proofs and escape hatch proofs.

#### ◈ Public Inputs: 
A set of public inputs `joinsplit_public` to the Joinsplit circuit. Including in particular ``
1. `proof_id`
2. `public_input`
3. `public_output`
4. `public_asset_id`
5. `output_nc_1_x`  (nc is short for note commitment)
6. `output_nc_1_y`
7. `output_nc_2_x`
8. `output_nc_2_y`
9. `nullifier_1`
10. `nullifier_2`
11. `input_owner`
12. `output_owner`
13. `data_tree_root`

The following additional public inputs
`rollup_id,data_start_index,old_data_root, new_data_root, old_null_root, new_null_root,old_data_roots_root,new_data_roots_root`

### ◈ Private Inputs: Detail
1. A set `joinsplit_private` of private inputs to the joinsplit circuit.

### ◈ Index of Functions

None

### ◈ Circuit Logic (Pseudocode)
1. Check the joinsplit circuit logic on `joinsplit_public,joinsplit_private`
2. Check the rollup circuit logic except proof aggregation and verification key correctness (cause the escape hatch always uses the joinsplit verification key). 
In more detail:
      1. Let `leaf_1 = CompressNC(output_nc_1_x, output_nc_1_y)`
      1. Let `leaf_2 = CompressNC(output_nc_2_x, output_nc_2_y)`
    6. Validate `NonMembershipUpdate(old_null_root,  new_null_root, {nullifier_1,nullifier_2})`
    7. Validate `leaf_1,leaf_2` are in `old_data_root`, and their addition results in `new_data_root` 
    8. Validate `Membership(old_data_roots_root, new_data_roots_root,data_tree_root, rollup_id)`
5. Validate `BatchUpdate(old_data_root, new_data_root, data_start_index`, `$\text{leaf}_{1}, ..., \text{leaf}_{2 * \text{num_inputs}}$)`
