type AddressMap = {
  [key: string]: string;
};

export class MainnetAddresses {
  static readonly Tokens: AddressMap = {
    USDC: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    WETH: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    DAI: '0x6b175474e89094c44da98b954eedeac495271d0f',
    'LUSD3CRV-F': '0xed279fdd11ca84beef15af5d39bb4d4bee23f0ca',
    CRVTRICRYPTO: '0xca3d75ac011bf5ad07a98d02f18225f9bd9a6bdf',
    STECRV: '0x06325440d014e39736583c165c2963ba99faf14e',
    CRV3CRYPTO: '0xc4ad29ba4b3c580e6d59105fff484999997675ff',
    WBTC: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
    'ALUSD3CRV-F': '0x43b4fdfd4ff969587185cdb6f0bd875c5fc83f8c',
    'MIM-3LP3CRV-F': '0x5a6a4d54456819380173272a5e8e9b9904bdf41b',
    EURSCRV: '0x194ebd173f6cdace046c53eacce9b953f28411d1',
    EUR: '0xdb25f211ab05b1c97d595516f45794528a807ad8',
    ETH: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  };

  static readonly Contracts: AddressMap = {
    UNISWAP: '0xe592427a0aece92de3edee1f18e0157c05861564',
    CURVE_PROVIDER: '0x0000000022d53366457f9d5e68ec105046fc4383',
    CURVE_ZAP: '0xa79828df1850e8a3a3064576f380d90aecdd3359',
    CURVE_FACTORY: '0x0959158b6040d32d04c301a72cbfd6b39e21c9ae',
    BALANCER: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
  };
}
