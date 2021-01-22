When a proof is sent to a rollup server and is sucessfully verified, the server will return a txHash. We can then call _aztecSdk.awaitSettlement(txHash)_ to make sure the proof has been rolled up and settled.

@spec barretenberg/rollup_provider/tx_hash.d.ts TxHash
