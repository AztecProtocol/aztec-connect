---
tags: Specs
---




# Aztec 2.0 -  JoinSplit Circuit

[![hackmd-github-sync-badge](https://hackmd.io/zwjbbtxkTKm00nAOvAJY-w/badge)](https://hackmd.io/zwjbbtxkTKm00nAOvAJY-w)

### ◈ Circuit Description

This circuit allows notes to be spent.

The circuit takes in two input notes, and two new output notes, and updates the Note Tree and Nullifier Tree accordingly.

### ◈ Circuit Inputs: Summary

The inputs for the join-split circuit are:

$$ \text{JoinSplit Inputs} = (\text{Public Inputs}, \text{Private Inputs}) \in \mathbb{F}_p^{13} \times \mathbb{F}_p^{28}$$

Where the field $\mathbb{F}_p$ is from the BN254 specification.

### ◈ Public Inputs: Detail

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

### ◈ Private Inputs: Detail 

1. `input_note_1.val`
2. `input_note_1.secret`
3. `input_note_1.account_id`
4. `input_note_1.asset_id`
5. `input_note_2.val`
6. `input_note_2.secret`
7. `input_note_2.account_id`
8. `input_note_2.asset_id`
9. `index_1`
10. `index_2`
11. `input_note_2.asset_id`
12. `output_note_1.val`
13. `output_note_1.secret`
14. `output_note_1.account_id`
15. `output_note_1.asset_id`
16. `output_note_1.nonce`
17. `output_note_2.val`
18. `output_note_2.secret`
19. `output_note_2.account_id`
20. `output_note_2.asset_id`
21. `output_note_2.nonce`
22.  `account_note.account_id`
23.  `account_note.npk` (npk=nullifier public key)
24.  `account_note.spk` (spk=spending public key)
25.  `index_ac`
26.  `note_num`
27.  `nk` (nullifier private key)
28.  `signature`

### ◈ Index of Functions

In the Pseudocode to follow, we use the following function names:

+ `NC` **Note commitment function**, which is assumed to be
    + Collision-resistant
    + Field-friendly, which means the output value only depends on the inputs as field elements, and doesn’t change e.g. when input changes from a to a+r as bit string.
+ `CompressNC` **Note Commitment Compressor** takes a note commitment (an elliptic curve point) and compresses by just taking the x coordinate
+ `NF` **Nullifier Function**, which we assume can be modeled as a random oracle, and only depends on $\text{nk } mod \text{ } r$
+ `AC` **Account Note Commitment**, which is assumed to be collision resistant
+ `Update` **Merkle Update Function** inserts a set of compressed note commitments into the note tree and validates the correctness of the associated merkle root update

### ◈ Circuit Logic (Pseudocode)

#### 1. Range Checks

```
for i = 1,2
  {
    let input_note_i =
      (
        input_note_i.val,
        input_note_i.secret,
        input_note_i.account_id,
        input_note_i.asset_id,
        input_note_i.nonce
      )
      
      
    check range
      (input_note_i.val, NOTE_VALUE_BIT_LENGTH))
      == true
      
    check range
      (input_note_i.asset_id, NUM_ASSETS_BIT_LENGTH)
      == true
      
    check
      input_note_i.account_id = account_note.account_id`
  }  
``` 

#### 2. Check inputs notes are valid

```
for i = 1,2
{
  compute nc_i = NC(input_note_i)
    
    check membership
      (CompressNC(nc_i,) index_i, data_tree_root)
      == (note_num >= i)
}
```  

#### 3. Check Nullifiers Correctly Computed

```
for i = 1,2
  {
    check nullifier_i = NF(nc_i, index_i, nk)
  }
``` 
#### 4. Verify Account Ownership

```
let account_note =
  (
    account_note.npk,
    account_note.spk,
    account_note.account_id
  )
  
let ac = AC(account_note)

check membership(ac, index_ac, data_tree_root)
check NPK(nk)=account_note.npk

let output_note_nc_i = 
  (
    output_note_nc_i_x,
    output_note_nc_i_y
  )

let message =
  (
    nc_1, nc_2, output_note_nc_1,
    output_note_nc_2, output_owner
  )

check CHECKSIG
  (
    message,
    signature,
    account_note.spk
  )
``` 
#### 5. Check Notes Above Max Output Notes Do Not Carry Value

```
if (note_num < 2) 
  { 
    validate input_note_2.value == 0
  }
  
if (num_num < 1)
  {
    validate input_note_1.value == 0
  }
``` 
#### 6. Check Notes In = Notes Out

```
let total_in_value =
  public_input +
  input_note_1.value +
  input_note_2.value
  
let total_out_value =
  public_output +
  output_note_1.value +
  output_note_2.value

check
  total_in_value == total_out_value
``` 
#### 7. Asset Type Checks

```
check
  input_note_1.asset_id == input_note_2.asset_id
  
check
  output_note_1.asset_id == input_note_2.asset_id
  
check
  output_note_2.asset_id == output_note_1.asset_id
  
check
  public_asset_id == input_note_1.asset_id
  ⟺
  (public_input != 0 || public_output != 0)
```
