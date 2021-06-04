---
tags: Specs
---
# Defi Bridge Contract Interface

## External Methods

### getInfo

A defi bridge's info must be immutable. Clients will use the return values to derive a bridge id.[^1]

```solidity
function getInfo()
    external
    view
    returns (
        uint32 numOutputAssets,
        address inputAsset,
        address outputAssetA,
        address outputAssetB
    );
```

###### Return Values:

| Name              | Type      | Description |
| ----------------- | --------- | ----------- |
| `numOutputAssets` | *uint32*  | Number of output assets. Must be either 1 or 2. |
| `inputAsset`      | *address* | Contract address of the input asset. |
| `outputAssetA`    | *address* | Contract address of the first output asset. |
| `outputAssetB`    | *address* | Contract address of the second output asset. Must be *address(0)* if `numOutputAssets` is 1. |


### convert

Initiate a DeFi interaction and inform the rollup contract of the proceeds. If the DeFi interaction cannot proceed for any reason, it is expected that the convert method will throw.

```solidity
function convert(uint256 inputValue)
    external
    returns (
        uint256 outputValueA,
        uint256 outputValueB
    );
```

###### Input Values:

| Name         | Type      | Description |
| ------------ | --------- | ----------- |
| `inputValue` | *uint256* | The amount of `inputAsset` this bridge contract is allowed to transfer from the rollup contract. |

###### Return Values:

| Name           | Type      | Description |
| -------------- | --------- | ----------- |
| `outputValueA` | *uint256* | The amount of `outputAssetA` the rollup contract will be able to transfer from this bridge contract. Must be greater than 0 if `numOutputAssets` is 1. |
| `outputValueB` | *uint256* | The amount of `outputAssetB` the rollup contract will be able to transfer from this bridge contract. Must be 0 if `numOutputAssets` is 1. |

In the unfortunate event when both output values are zeros, this function should throw so that the rollup contract could refund `inputValue` back to the users.


[^1]: Bridge id is a 252-bit concatenation of:
`address(this)` (160 bits)
`numOutputAssets` (2 bits)
`inputAsset` (32 bits)
`outputAssetA` (32 bits)
`outputAssetB` (26 bits)
