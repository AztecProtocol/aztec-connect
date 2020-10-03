The SDK supports all major ERC20 tokens as well as native ETH transfers. The test network uses a mintable ERC20 Token `TestDai`. The mainnet launch will include all major ERC20 tokens.

## The Aztec privacy shield

The Aztec network acts as a privacy shield for ERC20 Token transfers and other DeFi Interactions. Tokens are added to Aztec network by a deposit, this deposit happens to the ACE contract on Layer 1 and is public. Once a deposit is confirmed and included in a rollup block, the user is minted a set of UTXO notes representing the amount of deposited tokens.

<br/><br/>

<img src="/images/tokens.jpg" style="width:100%;" />
<br/><br/>

Once the tokens are inside the Aztec network, all subsequent transfers are confidenital and anonymous and conducted via the SDK's `.transfer()` method. Under the hood the SDK will pick the most appropriate UTXO's for the transaction and construct a proof that is relayed to the rollup provider.

## See Also

- **[Deposit](/#/ERC20%20Tokens/deposit)**
- **[Withdraw](/#/ERC20%20Tokens/withdraw)**
- **[Transfer](/#/ERC20%20Tokens/transfer)**
- **[Public Transfer](/#/ERC20%20Tokens/publicTransfer)**
