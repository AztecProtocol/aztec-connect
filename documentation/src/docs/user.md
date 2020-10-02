## Accounts

The Aztec SDK supports accounts defined on the `Grumpkin` Elliptic Curve. Future versions of the SDK will support accounts defined on the Ethereum curve `SCEPK256K1` and `Curve 25519` for use in platform hardware security modules on iPhone and Android.

<br/><br/>

Each account in the SDK is defined by an `alias`, a `privacyKey` and a set of `spendingKeys`. An alias can be used to lookup an accounts `privacyPublickey` via a short name e.g `joe`. The `privacyKey` is used to encrypt private data for any given user. The user will need to be able to derive or store this key in order to decrypt their private balance. A `spendingKey` is the public key from a keypair on the `Grumpkin` curve, there is no limit to the number of spending keys an account can have, spending keys can be revoked at any time. The rollup can also be used without creating an account and with no external transaction, by sharing the users `privacyPublicKey` to encrypt notes.

## Social Recovery

<img src="/images/recovery.png" style="width:100%;" /> 
<br/><br/>
Accounts support social recovery out of the gate. A on-time temporary recovery key can be added on account creation. This key signs a pre-crafted message, authorising a trusted party as an admin who can recover the account.

The recovery signature can be used at a later date to add in the trusted admin key and give the user back control of their account. The recovery signature can be split between trusted parties to make account recovery more secure. More than one signature can also be generated to ensure redundancy between trusted parties.
