## `RollupProcessor`






### `constructor(address _linkedToken, uint256 _scalingFactor)` (public)





### `processRollup(bytes proofData)` (external)



Process a rollup - decode the rollup, update relevant state variables and
verify the proof


### `decodeProof(bytes proofData) → uint256 rollupId, uint256 dataStartIndex, bytes32 oldDataRoot, bytes32 newDataRoot, bytes32 oldNullRoot, bytes32 newNullRoot, bytes32 oldRootRoot, bytes32 newRootRoot, uint256 numTxs` (internal)



Decode the public inputs component of proofData. Required to update state variables


### `processInnerProofs(bytes innerProofData, uint256 numTxs)` (internal)



Process all inner proof data - extract the data, verify the proof and perform
any transfer of tokens


### `transferTokens(bytes proof)` (internal)



Transfer tokens in and out of the Rollup contract, as appropriate depending on whether a 
deposit or withdrawal is taking place


### `deposit(uint256 depositValue, address depositorAddress)` (internal)



Internal utility function to deposit funds into the contract


### `withdraw(uint256 withdrawValue, address receiverAddress)` (internal)



Internal utility function to withdraw funds from the contract to a receiver address



### `RollupProcessed(uint256 rollupId, bytes32 dataRoot, bytes32 nullRoot)`





### `Deposit(address depositorAddress, uint256 depositValue)`





### `Withdraw(address withdrawAddress, uint256 withdrawValue)`





