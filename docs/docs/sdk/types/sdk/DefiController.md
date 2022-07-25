```ts
class DefiController {
    readonly userId: GrumpkinAddress;
    private readonly userSigner;
    readonly bridgeCallData: BridgeCallData;
    readonly depositValue: AssetValue;
    readonly fee: AssetValue;
    private readonly core;
    private proofOutput?;
    private jsProofOutput?;
    private feeProofOutput?;
    private txIds;
    constructor(userId: GrumpkinAddress, userSigner: Signer, bridgeCallData: BridgeCallData, depositValue: AssetValue, fee: AssetValue, core: CoreSdkInterface);
    createProof(): Promise<void>;
    send(): Promise<TxId>;
    awaitDefiDepositCompletion(timeout?: number): Promise<void>;
    awaitDefiFinalisation(timeout?: number): Promise<void>;
    awaitSettlement(timeout?: number): Promise<void>;
    getInteractionNonce(): Promise<number | undefined>;
    private getDefiTxId;
}
```