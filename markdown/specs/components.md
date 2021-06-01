---
tags: spec
---

[edit](https://hackmd.io/ywdNv3YQSRSElBuUlpeFxg)

# Protocol Components and Constants

### Global Constants


+ `NUM_ASSETS_BIT_LENGTH` = 2
+ `NUM_ASSETS` = 1
+ `DATA_TREE_DEPTH` = 32
+ `NULL_TREE_DEPTH` = 256
+ `ROOT_TREE_DEPTH` = 28
+ `MAX_TXS_BIT_LENGTH` = 10
+ `NOTE_VALUE_BIT_LENGTH` = 252
+ `TX_FEE_BIT_LENGTH` = 254 - `MAX_TXS_BIT_LENGTH`


## Notes and Commitments

A **Note** is encoded as follows:

+ `note.nonce`
+ `note.asset_id`
+ `note.val`
+ `note.secret`
+ `note.owner.x`
+ `note.owner.y`

> *Note:* The nonce plays a role in enabling the revocation of spending keys. The secret is to construct a hiding Pedersen commitment to hide the note details.

Each is a field element in $\mathbb{F}_p$ from the BN254 spec. So a note is an element of $\mathbb{F}_p^6$.

A **Note Commitment** is a Pedersen Commitment:

$$ Comm(\text{Note}) = note.value\cdot h_0 + note.secret\cdot h_1 + note.assetid\cdot h_2$$ $$ + note.owner.x \cdot h_3 +  note.owner.y\cdot h_4 + note.nonce\cdot h_5$$

An **Account Note** associates a spending key with an account. It consists of the following three field elements.

* `account_alias_id`- a concatentation of the 224 bit `alias_hash`, with the 32-bit `nonce`. `account_alias_id` is enforced to be smaller than $p$ (the bn-254 curve size), thus not all 32 byte values are possible. 
* `account_public_key.x`: the x-coordinate of the account public key
* `spending_public_key.x`: the x-coordinate of the spending key that is been assigned to this account via this note.  

The *commitment* to an account note $A$, denoted $cm(A)$, is a pedersen commitment of $A$:
$$ Cm(A) = A.accountaliasid\cdot h_{20} + A.accountpublickey.x\cdot h_{21} + A.spendingpublickey.x\cdot h_{22}$$
(The start from 20 is according to the constant `ACCOUNT_NOTE_HASH_INDEX` )
The **Account Nullifier** $nf(A)$ of an account note $A$ is a pedersen hash of 
* 1 - (the account circuit proof id)
* `A.account_alias_id`



## Note encryption and decryption
Details on this are found [here](https://hackmd.io/@aztec-network/BJKHah_4d)

