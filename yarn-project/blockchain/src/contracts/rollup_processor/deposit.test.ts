import { EthAddress } from '@aztec/barretenberg/address';
import { Asset, EthereumProvider, EthereumRpc } from '@aztec/barretenberg/blockchain';
import { createPermitData, createPermitDataNonStandard } from '../../create_permit_data.js';
import { JsonRpcProvider } from '../../provider/index.js';
import { Web3Signer } from '../../signer/index.js';
import { createDepositProof, createRollupProof } from './fixtures/create_mock_proof.js';
import { setupTestRollupProcessor } from './fixtures/setup_upgradeable_test_rollup_processor.js';
import { RollupProcessor } from './rollup_processor.js';
import ganache, { Server } from 'ganache';

describe('rollup_processor: deposit', () => {
  let rollupProcessor: RollupProcessor;
  let assets: Asset[];
  let userAddresses: EthAddress[];
  const depositAmount = 60n;
  const chainId = 31337;

  let snapshot: string;
  let provider: EthereumProvider;
  let server: Server<'ethereum'>;

  const testMnemonic = 'test test test test test test test test test test test junk';

  beforeAll(async () => {
    server = ganache.server({ logging: { quiet: true }, wallet: { mnemonic: testMnemonic }, chain: { chainId } });
    const PORT = 8542;
    server.listen(PORT, err => {
      if (err) throw err;
    });

    provider = new JsonRpcProvider(`http://127.0.0.1:${PORT}`);
    const ethRpc = new EthereumRpc(provider);
    const addresses = await ethRpc.getAccounts();
    [, ...userAddresses] = addresses;
    ({ assets, rollupProcessor } = await setupTestRollupProcessor(provider, addresses));
  });

  afterAll(async () => {
    await server.close();
  });

  beforeEach(async () => {
    snapshot = await provider.request({ method: 'evm_snapshot', params: [] });
  });

  afterEach(async () => {
    await provider.request({ method: 'evm_revert', params: [snapshot] });
  });

  // Workaround the most peculiar bug. expect(fn).rejects.toThrow() doesn't work...
  const shouldThrow = async (fn: Promise<any>, msg?: string) => {
    await fn
      .then(() => expect(false).toBeTruthy())
      .catch((err: any) => {
        if (msg) {
          expect(err.message.includes(msg)).toBe(true);
        }
      });
  };

  it('should deposit eth', async () => {
    const ethAsset = assets[0];
    await rollupProcessor.depositPendingFunds(0, depositAmount, undefined, {
      signingAddress: userAddresses[0],
    });

    {
      const userBalance = await rollupProcessor.getUserPendingDeposit(0, userAddresses[0]);
      expect(userBalance).toBe(depositAmount);

      const rollupBalance = await ethAsset.balanceOf(rollupProcessor.address);
      expect(rollupBalance).toBe(depositAmount);
    }
  });

  it('should deposit erc20s', async () => {
    const erc20Asset = assets[1];
    await erc20Asset.approve(depositAmount, userAddresses[0], rollupProcessor.address);
    await rollupProcessor.depositPendingFunds(1, depositAmount, undefined, {
      signingAddress: userAddresses[0],
    });

    {
      const userBalance = await rollupProcessor.getUserPendingDeposit(1, userAddresses[0]);
      expect(userBalance).toBe(depositAmount);

      const rollupBalance = await erc20Asset.balanceOf(rollupProcessor.address);
      expect(rollupBalance).toBe(depositAmount);
    }
  });

  it('should deposit funds via permit flow', async () => {
    const asset = assets[1];
    const depositor = userAddresses[0];
    const deadline = 0xffffffffn;
    const nonce = await asset.getUserNonce(depositor);
    const name = asset.getStaticInfo().name;
    const permitData = createPermitData(
      name,
      depositor,
      EthAddress.fromString(rollupProcessor.permitHelper.address),
      depositAmount,
      nonce,
      deadline,
      asset.getStaticInfo().address,
      chainId,
    );
    await rollupProcessor
      .getHelperContractWithSigner({ signingAddress: depositor })
      .preApprove(asset.getStaticInfo().address.toString());

    const signer = new Web3Signer(provider);
    const signature = await signer.signTypedData(permitData, depositor);

    await rollupProcessor.depositPendingFundsPermit(1, depositAmount, deadline, signature, {
      signingAddress: depositor,
    });

    expect(await rollupProcessor.getUserPendingDeposit(1, depositor)).toBe(depositAmount);
    expect(await asset.getUserNonce(depositor)).toBe(nonce + 1n);
  });

  it('should revert deposit funds via permit flow on behalf of someone else', async () => {
    const asset = assets[1];
    const depositor = userAddresses[0];
    const deadline = 0xffffffffn;
    const nonce = await asset.getUserNonce(depositor);
    const name = asset.getStaticInfo().name;
    const permitData = createPermitData(
      name,
      depositor,
      EthAddress.fromString(rollupProcessor.permitHelper.address),
      depositAmount,
      nonce,
      deadline,
      asset.getStaticInfo().address,
      chainId,
    );
    const signer = new Web3Signer(provider);
    const signature = await signer.signTypedData(permitData, depositor);

    await shouldThrow(
      rollupProcessor
        .getHelperContractWithSigner({ signingAddress: userAddresses[1] })
        .depositPendingFundsPermit(
          1,
          depositAmount,
          depositor.toString(),
          deadline,
          signature.v,
          signature.r,
          signature.s,
        ),
    ); //'INVALID_SIGNATURE');

    expect(await rollupProcessor.getUserPendingDeposit(1, depositor)).toBe(0n);
    expect(await asset.getUserNonce(depositor)).toBe(nonce);
  });

  it('should deposit funds via non standard permit flow', async () => {
    const assetId = 1;
    const asset = assets[assetId];
    const depositor = userAddresses[0];
    const deadline = 0xffffffffn;
    const nonce = await asset.getUserNonce(depositor);
    const name = asset.getStaticInfo().name;
    const permitData = createPermitDataNonStandard(
      name,
      depositor,
      EthAddress.fromString(rollupProcessor.permitHelper.address),
      nonce,
      deadline,
      asset.getStaticInfo().address,
      chainId,
    );
    await rollupProcessor
      .getHelperContractWithSigner({ signingAddress: depositor })
      .preApprove(asset.getStaticInfo().address.toString());

    const signer = new Web3Signer(provider);
    const signature = await signer.signTypedData(permitData, depositor);

    await rollupProcessor.depositPendingFundsPermitNonStandard(assetId, depositAmount, nonce, deadline, signature, {
      signingAddress: depositor,
    });

    expect(await rollupProcessor.getUserPendingDeposit(assetId, depositor)).toBe(depositAmount);
    expect(await asset.getUserNonce(depositor)).toBe(nonce + 1n);
  });

  it('should revert deposit funds via non standard permit flow on behalf of someone else', async () => {
    const assetId = 1;
    const asset = assets[assetId];
    const depositor = userAddresses[0];
    const deadline = 0xffffffffn;
    const nonce = await asset.getUserNonce(depositor);
    const name = asset.getStaticInfo().name;
    const permitData = createPermitDataNonStandard(
      name,
      depositor,
      EthAddress.fromString(rollupProcessor.permitHelper.address),
      nonce,
      deadline,
      asset.getStaticInfo().address,
      chainId,
    );
    const signer = new Web3Signer(provider);
    const signature = await signer.signTypedData(permitData, depositor);

    await shouldThrow(
      rollupProcessor
        .getHelperContractWithSigner({ signingAddress: userAddresses[1] })
        .depositPendingFundsPermitNonStandard(
          assetId,
          depositAmount,
          depositor.toString(),
          nonce,
          deadline,
          signature.v,
          signature.r,
          signature.s,
        ),
    ); //'INVALID_SIGNATURE');

    expect(await rollupProcessor.getUserPendingDeposit(assetId, depositor)).toBe(0n);
    expect(await asset.getUserNonce(depositor)).toBe(nonce);
  });

  it('should deposit funds using proof approval', async () => {
    const erc20 = assets[1];
    const signingAddress = userAddresses[0];

    await erc20.approve(depositAmount, userAddresses[0], rollupProcessor.address);
    await rollupProcessor.depositPendingFunds(1, depositAmount, undefined, { signingAddress });

    const innerProofData = await createDepositProof(depositAmount, signingAddress, provider, 1);
    const { encodedProofData } = createRollupProof(innerProofData);

    await rollupProcessor.approveProof(innerProofData.innerProofs[0].txId, { signingAddress });

    const tx = await rollupProcessor.createRollupProofTx(encodedProofData, [], []);
    await rollupProcessor.sendTx(tx);

    expect(await rollupProcessor.getUserPendingDeposit(1, signingAddress)).toBe(0n);
  });

  it('should reject deposit with bad signature', async () => {
    const erc20 = assets[1];
    const signingAddress = userAddresses[0];

    await erc20.approve(depositAmount, userAddresses[0], rollupProcessor.address);
    await rollupProcessor.depositPendingFunds(1, depositAmount, undefined, { signingAddress });

    const innerProofData = await createDepositProof(depositAmount, signingAddress, provider, 1);
    const { encodedProofData } = createRollupProof(innerProofData);

    const badSignature = await new Web3Signer(provider).signMessage(
      innerProofData.innerProofs[0].getDepositSigningData(),
      userAddresses[1],
    );

    const tx = await rollupProcessor.createRollupProofTx(encodedProofData, [badSignature], []);
    await shouldThrow(rollupProcessor.sendTx(tx)); //('INVALID_SIGNATURE');
  });
});
