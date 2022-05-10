import * as Element from '@aztec/bridge-clients/client-dest/typechain-types/factories/ElementBridge__factory';
import * as ElementVaultConfig from './ElementVaultConfig.json';
import { Contract, Signer } from 'ethers';

const TRANCHE_BYTECODE_HASH = Buffer.from('f481a073666136ab1f5e93b296e84df58092065256d0db23b2d22b62c68e978d', 'hex');
const ELEMENT_REGISTRY_ADDRESS = '0xc68e2BAb13a7A2344bb81badBeA626012C62C510';
const gasLimit = 6000000;

export const elementTokenAddresses = ElementVaultConfig.tokens;
// eslint-disable-next-line camelcase
export type ElementTokens = keyof typeof ElementVaultConfig.wrappedPositions.v1_1.yearn;

interface ElementPoolSpec {
  asset: string;
  wrappedPosition: string;
  expiry: number;
  poolAddress: string;
}

async function setupElementPool(spec: ElementPoolSpec, bridgeContract: Contract) {
  const dateString = new Date(spec.expiry * 1000).toDateString();
  console.error(`Registering convergent pool ${spec.poolAddress} for ${spec.asset} and expiry ${dateString}...`);
  await bridgeContract.registerConvergentPoolAddress(spec.poolAddress, spec.wrappedPosition, spec.expiry, {
    gasLimit,
  });
}

export async function deployElementBridge(
  signer: Signer,
  rollup: Contract,
  assets: ElementTokens[],
  tranchesAfter: Date,
) {
  console.error('Deploying ElementBridge...');
  const elementBridge = await new Element.ElementBridge__factory(signer).deploy(
    rollup.address,
    ElementVaultConfig.trancheFactory,
    TRANCHE_BYTECODE_HASH,
    ElementVaultConfig.balancerVault,
    ELEMENT_REGISTRY_ADDRESS,
    {
      gasLimit,
    },
  );
  console.error(`ElementBridge contract address: ${elementBridge.address}`);

  await rollup.setSupportedBridge(elementBridge.address, 800000n, { gasLimit });

  for (const asset of assets) {
    const assetTranches = ElementVaultConfig.tranches[asset].filter(
      tranche => tranche.expiration * 1000 > tranchesAfter.getTime(),
    );
    for (const tranche of assetTranches) {
      await setupElementPool(
        {
          asset,
          wrappedPosition: ElementVaultConfig.wrappedPositions.v1_1.yearn[asset],
          expiry: tranche.expiration,
          poolAddress: tranche.ptPool.address,
        },
        elementBridge,
      );
    }
  }
}
