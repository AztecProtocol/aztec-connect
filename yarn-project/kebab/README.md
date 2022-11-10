# Kebab
Kebab is a proxy server that sits in front of the ETH node that falafel & other services use to interact with ethereum chain.
It's responsible for:
- Caching Aztec's Ethereum event logs so they can be quickly queried without relying on the node's `eth_getLogs`
- For devnet & testnet, filters out requests that do **not** start with `eth_`. This is to prevent users from using debugging methods, e.g. `evm_increaseTime
`
