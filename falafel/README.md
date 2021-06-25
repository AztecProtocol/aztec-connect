# Falafel

Falafel is the reference implementation of an Aztec rollup service. It's responsible for:

- Listening for rollup blocks from an Ethereum chain, and processing them to maintain the various system merkle trees, index the transactions, etc.
- Listening for and storing transactions from users, verifying they're valid, have correct fees, etc.
- Constructing new rollups at the appropriate time or when enough transactions are received.
- Publishing of rollups to an Ethereum chain.

## Escape Hatch

The current mainnet contract has a two hour escape hatch window every 24 hours in which anyone can publish a rollup to the contract. If a user wants to escape they can run an instance of falafel, point their sdk or dapp at this local instance, and send a transaction.
