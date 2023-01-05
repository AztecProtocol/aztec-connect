import { EthAddress } from '@aztec/sdk';
import { mapObj } from '../../app/util/objects.js';
import { RegisteredAssetLabel } from '../registrations_data/registrations_data_types.js';

export const KNOWN_MAINNET_ASSET_ADDRESS_STRS = {
  Eth: '0x0000000000000000000000000000000000000000',
  DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  wstETH: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0',
  stETH: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84',
  yvWETH: '0xa258C4606Ca8206D8aA700cE2143D7db854D168c',
  yvDAI: '0xdA816459F1AB5631232FE5e97a05BBBb94970c95',
  WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  weWETH: '0x3c66B18F67CA6C1A71F829E2F6a0c987f97462d0',
  wewstETH: '0x60897720AA966452e8706e74296B018990aEc527',
  weDAI: '0x4169Df1B7820702f566cc10938DA51F6F597d264',
  wa2WETH: '0xc21F107933612eCF5677894d45fc060767479A9b',
  wa2DAI: '0xbcb91e0B4Ad56b0d41e0C168E3090361c0039abC',
  LUSD: '0x5f98805A4E8be255a32880FDeC7F6728C6568bA0',
  wcDAI: '0x6D088fe2500Da41D7fA7ab39c76a506D7c91f53b',
  icETH: '0x7C07F7aBe10CE8e33DC6C5aD68FE033085256A84',
} as const;

type KnownAssetAddressKey = keyof typeof KNOWN_MAINNET_ASSET_ADDRESS_STRS;

// The type beneath is useful for checking for asset label misalignments.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type Debug_UnaddressedAssets = Exclude<KnownAssetAddressKey, RegisteredAssetLabel>;

export const KNOWN_MAINNET_ASSET_ADDRESSES = mapObj(KNOWN_MAINNET_ASSET_ADDRESS_STRS, EthAddress.fromString);

const ADDR = KNOWN_MAINNET_ASSET_ADDRESSES;
export const SHIELDABLE_ASSET_ADDRESSES = [ADDR.Eth, ADDR.DAI];
