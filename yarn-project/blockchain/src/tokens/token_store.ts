import { BigNumber, Contract, utils } from 'ethers';
import { Uniswap, addressesAreSame, fixEthersStackTrace } from './uniswap.js';
import { getTokenBalance, approveToken, transferToken } from './index.js';
import { MainnetAddresses } from './mainnet_addresses.js';
import { EthereumProvider } from '@aztec/barretenberg/blockchain';
import { Web3Provider } from '@ethersproject/providers';
import { EthAddress } from '@aztec/barretenberg/address';
import { CurveStablePool, FactoryAbi, ProviderAbi, RegistryAbi, Zap, ERC20 } from '../abis.js';
import { HardhatRpc } from '../ganache/hardhat_rpc.js';

interface SlotInfo {
  slot: bigint;
  isVyper: boolean;
}

export class TokenStore {
  private providerContract?: Contract;
  private registryContract?: Contract;
  private factoryContract?: Contract;
  private ethersProvider: Web3Provider;
  private hardhatRpc: HardhatRpc;

  private constructor(private provider: EthereumProvider) {
    this.ethersProvider = new Web3Provider(provider);
    this.hardhatRpc = new HardhatRpc(provider);
  }

  private async init() {
    this.providerContract = new Contract(
      MainnetAddresses.Contracts['CURVE_PROVIDER'],
      ProviderAbi.abi,
      this.ethersProvider,
    );
    const registryAddress = await this.providerContract.get_registry();
    this.registryContract = new Contract(registryAddress, RegistryAbi.abi, this.ethersProvider);
    this.factoryContract = new Contract(
      MainnetAddresses.Contracts['CURVE_FACTORY'],
      FactoryAbi.abi,
      this.ethersProvider,
    );
  }

  static async create(provider: EthereumProvider) {
    const store = new TokenStore(provider);
    await store.init();
    return store;
  }

  // private async logAllStablePools() {
  //   const poolCount = (await this.registryContract!.pool_count()).toNumber();
  //   const mappings = new Map<string, string>();
  //   for (let i = 0; i < poolCount; i++) {
  //     const poolAddress = (await this.registryContract!.pool_list(i)).toString();
  //     const tokenAddress = await this.registryContract!.get_lp_token(poolAddress);
  //     mappings.set(poolAddress, tokenAddress);
  //   }
  //   console.log('Token mappings ', mappings);
  // }

  // private async logAllMetaPools() {
  //   const poolCount = (await this.factoryContract!.pool_count()).toNumber();
  //   const tokens = [];
  //   for (let i = 0; i < poolCount; i++) {
  //     const poolAddress = (await this.factoryContract!.pool_list(i)).toString();
  //     tokens.push(poolAddress);
  //   }
  //   console.log('Tokens ', tokens);
  // }

  private async depositToStablePool(
    spender: EthAddress,
    recipient: EthAddress,
    token: { erc20Address: EthAddress; amount: bigint },
    amountInMaximum: bigint,
  ) {
    let amountToDeposit = token.amount;
    const poolAddress = (await this.registryContract!.get_pool_from_lp_token(token.erc20Address.toString())).toString();
    const numCoinsResult = await this.registryContract!.get_n_coins(poolAddress);
    const numCoins = numCoinsResult[1].toNumber();
    const coins = (await this.registryContract!.get_coins(poolAddress)).map((x: string) => EthAddress.fromString(x));
    const inputAssetIndex = this.findPreferredAssset(coins);
    if (inputAssetIndex === -1) {
      throw new Error('Asset not supported');
    }
    const inputAsset = coins[inputAssetIndex];
    const signer = this.ethersProvider.getSigner(spender.toString());
    if (!addressesAreSame(inputAsset.toString(), MainnetAddresses.Tokens['ETH'])) {
      // need to uniswap to the preferred input asset
      const uniswap = new Uniswap(this.provider);
      amountToDeposit = await uniswap.swapFromEth(
        spender,
        spender,
        { erc20Address: inputAsset, amount: token.amount },
        amountInMaximum,
      );
    }
    await approveToken(inputAsset, spender, poolAddress, this.provider, amountToDeposit);
    const amounts = new Array(numCoins).fill(BigInt(0));
    amounts[inputAssetIndex] = amountToDeposit;
    const poolContract = new Contract(poolAddress, CurveStablePool.abi, signer);
    const depositFunc = poolContract.functions[`add_liquidity(uint256[${numCoins}],uint256)`];
    const amountBefore = await getTokenBalance(token.erc20Address, spender, this.provider);
    const depositResponse = await depositFunc(amounts, BigInt(0), {
      value: addressesAreSame(inputAsset.toString(), MainnetAddresses.Tokens['ETH']) ? amountToDeposit : BigInt(0),
    }).catch(fixEthersStackTrace);
    await depositResponse.wait();
    const amountAfter = await getTokenBalance(token.erc20Address, spender, this.provider);
    const amountMinted = BigInt(amountAfter) - BigInt(amountBefore);
    await transferToken(token.erc20Address, spender, recipient, this.provider, amountMinted);
    return amountMinted;
  }

  private findPreferredAssset(availableAssets: EthAddress[]) {
    const ethIndex = availableAssets.findIndex(asset =>
      addressesAreSame(asset.toString(), MainnetAddresses.Tokens['ETH']),
    );
    if (ethIndex !== -1) {
      return ethIndex;
    }
    const wethIndex = availableAssets.findIndex(asset =>
      addressesAreSame(asset.toString(), MainnetAddresses.Tokens['WETH']),
    );
    if (wethIndex !== -1) {
      return wethIndex;
    }
    const stableIndex = availableAssets.findIndex(asset => Uniswap.isSupportedAsset(asset));
    return stableIndex;
  }

  private async depositToMetaPool(
    spender: EthAddress,
    recipient: EthAddress,
    token: { erc20Address: EthAddress; amount: bigint },
    amountInMaximum: bigint,
  ) {
    let amountToDeposit = token.amount;
    const numCoinsResult = await this.factoryContract!.get_n_coins(token.erc20Address.toString());
    const numCoins = numCoinsResult[1].toNumber();

    const coins = (await this.factoryContract!.get_underlying_coins(token.erc20Address.toString())).map((x: string) =>
      EthAddress.fromString(x),
    );
    const inputAssetIndex = this.findPreferredAssset(coins);
    if (inputAssetIndex === -1) {
      throw new Error('Asset not supported');
    }
    const inputAsset = coins[inputAssetIndex];
    if (!addressesAreSame(inputAsset.toString(), MainnetAddresses.Tokens['ETH'])) {
      // need to uniswap to the preferred input asset
      const uniswap = new Uniswap(this.provider);
      amountToDeposit = await uniswap.swapFromEth(
        spender,
        spender,
        { erc20Address: inputAsset, amount: token.amount },
        amountInMaximum,
      );
    }
    await approveToken(
      inputAsset,
      spender,
      EthAddress.fromString(MainnetAddresses.Contracts['CURVE_ZAP']),
      this.provider,
      amountToDeposit,
    );
    const amounts = new Array(numCoins).fill(BigInt(0));
    amounts[inputAssetIndex] = amountToDeposit;
    const signer = this.ethersProvider.getSigner(spender.toString());
    const zapDepositor = new Contract(MainnetAddresses.Contracts['CURVE_ZAP'], Zap.abi, signer);
    const depositFunc = zapDepositor.functions[`add_liquidity(address,uint256[${numCoins}],uint256,address)`];
    const amountBefore = await getTokenBalance(token.erc20Address, recipient, this.provider);
    const depositResponse = await depositFunc(token.erc20Address.toString(), amounts, BigInt(0), recipient.toString(), {
      value: addressesAreSame(inputAsset.toString(), MainnetAddresses.Tokens['ETH']) ? amountToDeposit : BigInt(0),
    }).catch(fixEthersStackTrace);
    await depositResponse.wait();
    const amountAfter = await getTokenBalance(token.erc20Address, recipient, this.provider);
    const amountMinted = BigInt(amountAfter) - BigInt(amountBefore);
    return amountMinted;
  }

  private async getPoolForLpToken(lpTokenAddress: EthAddress) {
    const poolAddress = (await this.registryContract!.get_pool_from_lp_token(lpTokenAddress.toString())).toString();
    return poolAddress;
  }

  private async isMetaPool(lpTokenAddress: EthAddress) {
    const poolAddress = await this.getPoolForLpToken(lpTokenAddress);
    // for meta pools, the pool is the lp token. for stable pools, it's not
    return addressesAreSame(poolAddress, lpTokenAddress.toString());
  }

  /**
   * Will attempt to purchase or mint tokens from uniswap or curve
   * The desired token is specified by the erc20 address and quantity
   * We will attempt to achieve this quantity by
   * 1. Attempting to purchase from uniswap if it is one of our supported uniswap assets or
   * 2. Attempting to deposit to a curve pool and minting the requested tokens, this may first require us to purchase a stablecoin from uniswap
   *
   * In the case of 1 above, we ask uniswap for outputToken.amount of the requested asset and specify amountInMaximum as the maximum amount to spend
   *
   * In the case of 2 above. If we have to purchase a stable coin then we ask uniswap for outputToken.amount of the stable coin and specify amountInMaximum as the maximum amount to spend
   * Once we have the stablecoin, we deposit it all into curve to extract the lp tokens. If we don't need to purchase a stable coin, then we deposit outputToken.amount of ETH/WETH
   * to curve and mint the resulting tokens.
   */
  async purchase(
    spender: EthAddress,
    recipient: EthAddress,
    outputToken: { erc20Address: EthAddress; amount: bigint },
    amountInMaximum: bigint,
  ) {
    const uniswap = new Uniswap(this.provider);
    if (Uniswap.isSupportedAsset(outputToken.erc20Address)) {
      return await uniswap.swapFromEth(spender, recipient, outputToken, amountInMaximum);
    }
    const isMetaPool = await this.isMetaPool(outputToken.erc20Address);
    if (isMetaPool) {
      return await this.depositToMetaPool(spender, recipient, outputToken, amountInMaximum);
    } else {
      return await this.depositToStablePool(spender, recipient, outputToken, amountInMaximum);
    }
  }

  /**
   * This function allows for setting balances of ERC20 tokens. To achieve that "hardhat_setStorageAt" RPC
   * functionality is leveraged. This method is not compatible with non-hardhat nodes.
   * @param tokenAddr Contract address of the token
   * @param userAddr Address to set token balance to
   * @param balance Amount of token to set
   */
  async setBalance(tokenAddr: EthAddress, userAddr: EthAddress, balance: bigint) {
    const slotInfo = await this.findBalancesSlot(tokenAddr);

    const userBalanceSlot = slotInfo.isVyper
      ? BigInt(utils.keccak256(utils.defaultAbiCoder.encode(['uint', 'address'], [slotInfo.slot, userAddr.toString()])))
      : BigInt(
          utils.keccak256(utils.defaultAbiCoder.encode(['address', 'uint'], [userAddr.toString(), slotInfo.slot])),
        );

    const result = await this.hardhatRpc.setStorageAt(tokenAddr, userBalanceSlot, balance);
    if (!result) {
      throw new Error('Setting token balance failed');
    }
  }

  /**
   * This function finds a slot number of balances mapping and detects whether the token was implemented in Vyper.
   * @param tokenAddr Address of a token on which balances slot is to be found
   * @returns Balances slot number and a boolean indicating whether token was implemented in Vyper
   */
  private async findBalancesSlot(tokenAddr: EthAddress): Promise<SlotInfo> {
    const token = new Contract(tokenAddr.toString(), ERC20.abi, this.ethersProvider);
    const randomAddress = '0x8b359fb7a31620691dc153cddd9d463259bcf29b';
    const probeValue = BigInt(356);

    for (let i = BigInt(0); i < 100; i++) {
      const userBalanceSlot = BigInt(
        utils.keccak256(utils.defaultAbiCoder.encode(['address', 'uint'], [randomAddress, i])),
      );
      await this.hardhatRpc.setStorageAt(tokenAddr, userBalanceSlot, probeValue);
      const balance: BigNumber = await token.balanceOf(randomAddress);
      if (balance.eq(probeValue)) {
        return { slot: i, isVyper: false };
      }
    }

    for (let i = BigInt(0); i < 100; i++) {
      const userBalanceSlot = BigInt(
        utils.keccak256(utils.defaultAbiCoder.encode(['uint', 'address'], [i, randomAddress])),
      );
      await this.hardhatRpc.setStorageAt(tokenAddr, userBalanceSlot, probeValue);
      const balance: BigNumber = await token.balanceOf(randomAddress);
      if (balance.eq(probeValue)) {
        return { slot: i, isVyper: true };
      }
    }
    throw new Error('Balances slot not found');
  }
}
