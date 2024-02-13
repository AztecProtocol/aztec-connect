# Falafel

At a high level, Falafel performs the following roles within the system:

- Listening for rollup blocks from an Ethereum chain, and processing them to maintain the various system merkle trees, index the transactions, etc.
- Listening for and storing transactions from users, verifying they're valid, have correct fees, etc.
- Orchestrating the construction of new rollups at the appropriate time or when enough transactions are received.
- Publishing of rollups to an Ethereum chain.

In order to achieve this it implements the following number of software modules/components. These components have various resource and configuration requirements which we will detail here.

- An HTTP service providing a number of endpoints allowing clients to query the current state of the system, download historical published rollup data, request transaction fees, submit new transactions to be included in a later rollup and administrative functions like configuration updates.
- A SQL database storing all historical rollup data and all transactions yet to be included within a rollup
- Blockchain connectivity and contract abstractions for querying historically published rollups, submitting new rollups and reading on-chain configuration data such as permitted assets and bridge contracts
- World state reconciliation periodically querying the rollup contract for published rollups and updating the persisted store of rollup data and Merkle tree state
- A companion process, 'db_cli' which it automatically starts and communicates with via stdio. db_cli is an efficient Merkle tree implementation using level db for persistence
- A file system used to store Merkle Tree state and runtime configuration
- Transaction fee computation based off current gas price and asset price valuations
- A sequencer module selecting and ordering transactions for inclusion in a new rollup.
- A rollup creator module orchestrating the construction of rollup proofs
- A rollup publisher managing the process of publishing rollup transactions and associated 'off-chain' data (which is currently published on chain)

## The Configuration System

Falafel configuration is composed of 2 parts, `StartupConfig` and `RuntimeConfig`. Generally speaking, `StartupConfig` contains 'static' information that is unlikely to ever change and will take values hardcoded or from Environment Variables. `RuntimeConfig` contains configuration that gets updated more frequently and can be updated via a HTTP POST request. Both sets of configurations are written to the filesystem and upon startup the following order applies to the priority of values adopted for each:

`StartupConfig`: Environment, saved, defaults.
`RuntimeConfig`: Saved, Initial, Environment, defaults.

2 environment variables specify values outside of this configuration system:

`DATA_DIR` specifies the directory that Falafel uses for all of it's non PostgresDB persistence.
`INITIAL_RUNTIME_CONFIG_PATH` specifies a file that contains initial runtime configuration. This is useful in test environments.

The following detail these two sets of parameters and the environment variables used to specify them at startup. Most of the `RuntimeConfig` values are not set by environment variable. Instead, they adopt a default value and can be updated by an administrative call to the `/runtime-config` http endpoint.

```
interface StartupConfig {
  // A string of the form MAJ.MIN.SUB returned in the status request so clients can be notified of breaking api changes. Env: FALAFEL_VERSION_OVERRIDE
  version: string;
  // The port number on which to start the http service. Env: PORT
  port: number;
  // An optional postgres DB connection string, if absent Falafel will use a local SQLite DB. Env: DB_URL
  dbUrl?: string;
  // The address of the rollup contract. Env: ROLLUP_CONTRACT_ADDRESS
  rollupContractAddress: EthAddress;
  // The address of the permit helper contract. Env: PERMIT_HELPER_CONTRACT_ADDRESS
  permitHelperContractAddress: EthAddress;
  // Addresses of price feed contracts for pricing gas and asset valuations Env: PRICE_FEED_CONTRACT_ADDRESSES
  priceFeedContractAddresses: EthAddress[];
  // Address of data provider contract. Env: BRIDGE_DATA_PROVIDER_CONTRACT_ADDRESS
  bridgeDataProviderAddress: EthAddress;
  // URL of JSON RPC endpoint for all blockchain interactions. Env: ETHEREUM_HOST
  ethereumHost: string;
  // Optional period with which to poll for new rollups. Env: ETHEREUM_POLL_INTERVAL
  ethereumPollInterval?: number;
  // A string specifying the mode under which halloumi proof constructors are deployed. Valid values are 'split' and 'local'. Anything else defaults to 'normal'. Env: PROOF_GENERATOR_MODE
  proofGeneratorMode: string;
  // The private key to be used for publishing rollups. Env: PRIVATE_KEY
  privateKey: Buffer;
  // The number of txs within an 'inner' rollup. Env: NUM_INNER_ROLLUP_TXS
  numInnerRollupTxs: number;
  // The number of txs within an 'outer' rollup. Env: NUM_OUTER_ROLLUP_PROOFS
  numOuterRollupProofs: number;
  // The prefix used as part of all api routes e.g. https://api.aztec.network/<api prefix>/status. Env: API_PREFIX
  apiPrefix: string;
  // String required to be specified in the 'server-auth-token' header of administrative requests. Env: SERVER_AUTH_TOKEN
  serverAuthToken: string;
  // The number of confirmations required for a rollup to be accepted. Env: MIN_CONFIRMATION
  minConfirmation: number;
  // The number of confirmations required for a rollup to be accepted within the Escape Hatch. Env: MIN_CONFIRMATION_ESCAPE_HATCH_WINDOW
  minConfirmationEHW: number;
  // A flag specifying whether additional logging be added to DB calls. Env: TYPEORM_LOGGING
  typeOrmLogging: boolean;
  // A flag specifying whether the system should be run as 'proverless'. This should only used within test environments. Env: PROVERLESS
  proverless: boolean;
  // The maximum amount of call data that can be consumed by a rollup. Env: CALL_DATA_LIMIT_KB
  rollupCallDataLimit: number;
}

interface RuntimeConfig {
  // A flag specifying if new transactions should be accepted into the tx pool
  acceptingTxs: boolean;
  // Unused
  useKeyCache: boolean;
  // A time period after which a rollup should be published, regardless of the economics of doing so
  publishInterval: number;
  // A time period after which a rollup should be published if no transactions have been received, only used for test environments
  flushAfterIdle: number;
  // An upper limit on the amount of gas that a sinle rollup transaction should consume
  gasLimit: number;
  // The amount of gas consumed by executing the verification step of the rollup transaction
  verificationGas: number;
  // An upper limit on the gas price used for providing fee quotes to users
  maxFeeGasPrice: bigint;
  // A gas price multiplier to use when producing fee quotes, allowing for rollup provider 'markup'
  feeGasPriceMultiplier: number;
  // The number of significant figures to which fee quotes should be rounded up. Increases privacy by making fees adopt more discrete values
  feeRoundUpSignificantFigures: number;
  // The maximum base gas price that will be accepted when publishing rollups
  maxFeePerGas: bigint;
  // The maximum priority gas price that will be accepted when publishing rollups
  maxPriorityFeePerGas: bigint;
  // The maximum number of pending transactions in the system (new transactions will be rejected once this limit is reached)
  maxUnsettledTxs: number;
  // Unused
  defaultDeFiBatchSize: number;
  // The current set of bridge configurations
  bridgeConfigs: BridgeConfig[];
  // The id values of assets that the rollup provider will accept for the payment of fees
  feePayingAssetIds: number[];
  // Current example privacy sets for client display
  privacySets: { [key: number]: PrivacySet[] };
  // Address of the fee distributor contract
  rollupBeneficiary?: EthAddress;
  // The maximum number of deposits a single IP Address can make within 24 hours
  depositLimit: number;
  // An optional set of addresses from which deposits will not be accepted
  blacklist?: EthAddress[];
}

```

The following sections will provide more detail around some of the software components and how parts of the configuration apply to them.

## Proof Construction

Proof construction can be performed 'locally' within Falafel, by specifying `local` as the value of the `PROOF_GENERATOR_MODE` environment variable. Alternatively it can use separate instances of the 'Halloumi' service. When using separate instances, this can further be configured as `split` mode or `normal`.

When configured in `normal` mode, an additional HTTP server will be created on port 8082. All corresponding halloumi instances will need to have their `JOB_SERVER_URL` configuration set with a port of 8082.

When configured in `split` mode, 2 additional HTTP servers will be created, the first on port 8082 and the second on 8083. 2 sets of Halloumi instances will then be needed, one set configured to point at 8082, the other to 8083. The purpose of this configuration is to designate a set of proof generators for construction of 'inner' proofs and then an additional proof generator for the single 'outer' proof thus lowering the resource requirements of any given instance.

For further information, see the [Halloumi Documentation](../halloumi/README.md)

## Blockchain Connectivity

Falafel needs to remain in sync with state as it changes on-chain. It does this via a configured RPC endpoint specified in `ETHEREUM_HOST` and a number of contract address variables. The most complex interaction takes place against the `RollupProcessor` contract specified by `ROLLUP_CONTRACT_ADDRESS`. This contract emits a `RollupProcessed` event and `OffchainData` events with every published rollup. Additionally it emits events related to defi interactions. Falafel periodically polls the contract for newly published events and reconciles them into single `Block` objects that are persisted and distributed throughout the system.

Falafel expects the RPC endpoint implementation to have an efficiently indexed store of events, such as the Kebab service or a managed Geth node operator such as Infura.

Within the repository is a module called `earliest_block`. This contains hardocded configuration for the 'start' block of various environments. The purpose of this value is twofold:

1. On forked environmentts such as Testnet it provides the fork block number.
2. On all environments it provides a marker from which the system will begin searching for events emitted from the `RollupProcessor` contract.

```
export function getEarliestBlock(chainId: number) {
  switch (chainId) {
    case 1:
      return { earliestBlock: 14728000, chunk: 100000, offchainSearchLead: 6 * 60 * 24 };
    case 0xa57ec:
    case 0xdef:
    case 0x57a93:
      return { earliestBlock: 15918000, chunk: 100000, offchainSearchLead: 10 };
    case 0xe2e:
      return { earliestBlock: 15918000, chunk: 10, offchainSearchLead: 10 };
    case 1337:
      return { earliestBlock: 0, chunk: 10, offchainSearchLead: 10 };
    default:
      return { earliestBlock: 0, chunk: 100000, offchainSearchLead: 6 * 60 * 24 };
  }
}
```

## HTTP Service

Falafel will create a HTTP service on the specified `PORT` value. This is how Falafel implements client interactions whether it be syncing state, submitting transactions or performing administrative functions. Administrative function require the presence of a 'server-auth-token' header equal in value to that specified in `SERVER_AUTH_TOKEN`.

The `/status` endpoint is a good place to start when getting a system up and running. It will provide a lot of information about the state of the system.

The `/runtime-config` endpoint allows for the administrative task of updating the runtime configuration. When making a request to this endpoint, the body of them message should a JSON message containing new values for the items of configuration that need to be changed. Any keys not present in the request will be left unmodified.

## World State

Falafel stores a copy of the entire world state. That includes the Merkle trees and all rollup and transaction data. Whilst none of this data is proprietary, having an efficiently indexed store of this data greatly improves client experience.

The `DATA_DIR` variable is required to specify a directory on an accessible file system. This is used to store Merkle tree state as well as the current configuration.

The `DATA_URL` variable allows for the specification of a PostgresDB database connection string. If this is not provided then Falafel will create a SQLite instance within the `DATA_DIR`. For production usage we would recommend provisioning a Postgres database.

## Sequencing and Fees

The sequencer periodically retrieves pending transactions from the database, filters those that are not able to be included in a rollup and then evaluates the remaining to see if publishing a rollup would be economical. Once it has been determined that a rollup is ready to be published, the application provisionally updates the world state and orchestrates the construction of the necessary proofs before submitting the rollup to chain.

The economic profitability has a number of factors that involve configuration and understanding. A rollup consists of the following costs and limitations:

- The computational cost (in gas) of verifying the rollup proof, specified in the runtime configuration variable `verificationGas`
- The computational cost (in gas) of executing the transaction. e.g. for a withdraw, sending funds to an external address
- The limitation placed on the number of transactions that can be included in a rollup by the amount of call data required for a transaction type. e.g. deposits require more call data, limiting the number of them that can be included in a rollup. The maximum call data consumption per rollup is specified in the startup configuration variable `rollupCallDataLimit`
- The computational cost (in gas) of executing bridge interactions
- The limitation on number of transactions imposed by the proving system, currently 896 transactions per rollup specified by the product of the startup configuration variables `numInnerRollupTxs` and `numOuterRollupProofs`

Falafel internally considers all of the above to produce a measure of gas (aztecGas), very similar to Ethereum gas but accounting for the fact that call data limitations may mean the amount of aztecGas for a transaction is higher than the amount of Ethereum gas. It then provides fee quotations based on this amount of aztecGas and the rollup provider's specified `FEE_GAS_PRICE_MULTIPLIER` value.

When a transaction is received it is verified to have sufficient fees associated with it to cover the required amount of aztecGas before being inserted into the transaction pool along with the amount of aztecGas that was paid for. Once a transaction is in the pool, it is assumed to have covered the minimum fee required for the transaction and any additional fee will contribute towards accelerating the production of a rollup. Once enough aztecGas has been accumulated for a rollup to be economical, a rollup is produced.

Bridge interactions provide some additional complexity and configuration. Bridges have a fixed gas cost associated with them, this is specified on the `RollupProcessor` contract. Aztec Connect aims to batch together transactions for the same bridge and amortise this gas cost over all transactions in the batch. Therefore, there is a per bridge id configuration maintained in Falafel as part of the `RuntimeConfig`:

```
interface BridgeConfig {
  bridgeAddressId: number;
  numTxs: number;
  // The total amount of gas the bridge is expected to use, from which we compute the fees.
  // e.g. The gas for a single tx is gas / numTxs. This can then be converted to a fee in whichever asset.
  gas?: number;
  permittedAssets: number[];
}
```

The `gas` value is an optional override for the value stored on chain. The `numTxs` value is used to divide the `gas` and compute the minimum fee required for a user to submit a transaction for that bridge. Note, this is on top of the fee required as detailed above. The `permittedAssets` configuration specifies the set of asset ids within which the bridge interaction's input/output assets must all exist.

The above bridge configuration means that defi deposit transactions are accumulated on a fully specified bridge interaction basis, i.e. the combination of:

- BridgeAddressId
- Input assets
- Output Assets
- Aux Data

Once the set of defi deposits against a fully specified bridge interaction have accumulated enough fees to cover the cost of executing the bridge then all transactions for that fully specified bridge interaction will be considered for the next rollup.

## Monitoring

There are 2 primary methods of monitoring. Firslty, the application writes log messages to the console. Secondly it implements a number of (https://prometheus.io/) based metrics which can be accessed and visualised with a prometheus/grafana setup.

## Example Configuration

As of the time of writing, querying the status endpoint produces the following output (some superfluous information removed), demonstrating a significant portion of the current operational configuration:

```
{
    "version": "2.1.6",
    "numTxsPerRollup": 896,
    "proverless": false,
    "rollupSize": 1024,
    "blockchainStatus": {
        "chainId": 1,
        "rollupContractAddress": "0xff1f2b4adb9df6fc8eafecdcbf96a2b351680455",
        "permitHelperContractAddress": "0xf4f1e0b0b93b7b2b7b6992b99f2a1678b07cd70c",
        "verifierContractAddress": "0xb656f4219f565b93df57d531b574e17fe0f25939",
        "bridgeDataProvider": "0x8b2e54fa4398c8f7502f30ac94cb1f354390c8ab",
        "numEscapeBlocksRemaining": 2015,
        "allowThirdPartyContracts": false,
        "assets": [
            {
                "name": "Eth",
                "symbol": "ETH",
                "decimals": 18,
                "gasLimit": 30000,
                "address": "0x0000000000000000000000000000000000000000"
            },
            {
                "name": "Dai Stablecoin",
                "symbol": "DAI",
                "decimals": 18,
                "gasLimit": 55000,
                "address": "0x6b175474e89094c44da98b954eedeac495271d0f"
            },
            {
                "name": "Wrapped liquid staked Ether 2.0",
                "symbol": "wstETH",
                "decimals": 18,
                "gasLimit": 55000,
                "address": "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0"
            },
            {
                "name": "DAI yVault",
                "symbol": "yvDAI",
                "decimals": 18,
                "gasLimit": 55000,
                "address": "0xda816459f1ab5631232fe5e97a05bbbb94970c95"
            },
            {
                "name": "WETH yVault",
                "symbol": "yvWETH",
                "decimals": 18,
                "gasLimit": 55000,
                "address": "0xa258c4606ca8206d8aa700ce2143d7db854d168c"
            },
            {
                "name": "ERC4626-Wrapped Euler WETH",
                "symbol": "weWETH",
                "decimals": 18,
                "gasLimit": 55000,
                "address": "0x3c66b18f67ca6c1a71f829e2f6a0c987f97462d0"
            },
            {
                "name": "ERC4626-Wrapped Euler wstETH",
                "symbol": "wewstETH",
                "decimals": 18,
                "gasLimit": 55000,
                "address": "0x60897720aa966452e8706e74296b018990aec527"
            },
            {
                "name": "ERC4626-Wrapped Euler DAI",
                "symbol": "weDAI",
                "decimals": 18,
                "gasLimit": 55000,
                "address": "0x4169df1b7820702f566cc10938da51f6f597d264"
            },
            {
                "name": "ERC4626-Wrapped Aave v2 DAI",
                "symbol": "wa2DAI",
                "decimals": 18,
                "gasLimit": 55000,
                "address": "0xbcb91e0b4ad56b0d41e0c168e3090361c0039abc"
            },
            {
                "name": "ERC4626-Wrapped Aave v2 WETH",
                "symbol": "wa2WETH",
                "decimals": 18,
                "gasLimit": 55000,
                "address": "0xc21f107933612ecf5677894d45fc060767479a9b"
            },
            {
                "name": "LUSD Stablecoin",
                "symbol": "LUSD",
                "decimals": 18,
                "gasLimit": 55000,
                "address": "0x5f98805a4e8be255a32880fdec7f6728c6568ba0"
            },
            {
                "name": "TroveBridge",
                "symbol": "TB-275",
                "decimals": 18,
                "gasLimit": 55000,
                "address": "0x998650bf01a6424f9b11debd85a29090906cb559"
            },
            {
                "name": "TroveBridge",
                "symbol": "TB-400",
                "decimals": 18,
                "gasLimit": 55000,
                "address": "0x646df2dc98741a0ab5798deac6fc62411da41d96"
            },
            {
                "name": "ERC4626-Wrapped Compound DAI",
                "symbol": "wcDAI",
                "decimals": 18,
                "gasLimit": 55000,
                "address": "0x6d088fe2500da41d7fa7ab39c76a506d7c91f53b"
            },
            {
                "name": "Interest Compounding ETH Index",
                "symbol": "icETH",
                "decimals": 18,
                "gasLimit": 55000,
                "address": "0x7c07f7abe10ce8e33dc6c5ad68fe033085256a84"
            },
            {
                "name": "LUSD yVault",
                "symbol": "yvLUSD",
                "decimals": 18,
                "gasLimit": 55000,
                "address": "0x378cb52b00f9d0921cb46dfc099cff73b42419dc"
            }
        ],
        "bridges": [
            {
                "id": 1,
                "gasLimit": 800000,
                "address": "0xaed181779a8aabd8ce996949853fea442c2cdb47"
            },
            {
                "id": 2,
                "gasLimit": 175000,
                "address": "0x381abf150b53cc699f0dbbbef3c5c0d1fa4b3efd"
            },
            {
                "id": 3,
                "gasLimit": 250000,
                "address": "0x381abf150b53cc699f0dbbbef3c5c0d1fa4b3efd"
            },
            {
                "id": 4,
                "gasLimit": 300000,
                "address": "0x0eb7f9464060289fe4fddfde2258f518c6347a70"
            },
            {
                "id": 5,
                "gasLimit": 250000,
                "address": "0x0031130c56162e00a7e9c01ee4147b11cbac8776"
            },
            {
                "id": 6,
                "gasLimit": 250000,
                "address": "0xe09801da4c74e62fb42dfc8303a1c1bd68073d1a"
            },
            {
                "id": 7,
                "gasLimit": 250000,
                "address": "0xe71a50a78cccff7e20d8349eed295f12f0c8c9ef"
            },
            {
                "id": 8,
                "gasLimit": 800000,
                "address": "0xe71a50a78cccff7e20d8349eed295f12f0c8c9ef"
            },
            {
                "id": 9,
                "gasLimit": 2000000,
                "address": "0xaed181779a8aabd8ce996949853fea442c2cdb47"
            },
            {
                "id": 10,
                "gasLimit": 300000,
                "address": "0x3578d6d5e1b4f07a48bb1c958cbfec135bef7d98"
            },
            {
                "id": 11,
                "gasLimit": 400000,
                "address": "0x94679a39679ffe53b53b6a1187aa1c649a101321"
            },
            {
                "id": 12,
                "gasLimit": 500000,
                "address": "0x3578d6d5e1b4f07a48bb1c958cbfec135bef7d98"
            },
            {
                "id": 13,
                "gasLimit": 400000,
                "address": "0x3578d6d5e1b4f07a48bb1c958cbfec135bef7d98"
            },
            {
                "id": 14,
                "gasLimit": 700000,
                "address": "0x998650bf01a6424f9b11debd85a29090906cb559"
            },
            {
                "id": 15,
                "gasLimit": 700000,
                "address": "0x646df2dc98741a0ab5798deac6fc62411da41d96"
            },
            {
                "id": 16,
                "gasLimit": 500000,
                "address": "0x5594808e8a7b44da9d2382e6d72ad50a3e2571e0"
            },
            {
                "id": 17,
                "gasLimit": 800000,
                "address": "0x5594808e8a7b44da9d2382e6d72ad50a3e2571e0"
            }
        ]
    },
    "nextPublishTime": "2023-02-24T20:00:00.000Z",
    "runtimeConfig": {
        "acceptingTxs": true,
        "useKeyCache": false,
        "publishInterval": 14400,
        "flushAfterIdle": 0,
        "gasLimit": 12000000,
        "verificationGas": 500000,
        "feeGasPriceMultiplier": 1,
        "feeRoundUpSignificantFigures": 2,
        "maxUnsettledTxs": 10000,
        "defaultDeFiBatchSize": 5,
        "bridgeConfigs": [
            {
                "numTxs": 40,
                "gas": 500000,
                "bridgeAddressId": 1,
                "permittedAssets": [
                    1
                ]
            },
            {
                "numTxs": 1,
                "gas": 300000,
                "bridgeAddressId": 4,
                "permittedAssets": [
                    0
                ]
            },
            {
                "numTxs": 50,
                "gas": 250000,
                "bridgeAddressId": 5,
                "permittedAssets": [
                    0,
                    2
                ]
            },
            {
                "numTxs": 50,
                "gas": 250000,
                "bridgeAddressId": 6,
                "permittedAssets": [
                    0,
                    2
                ]
            },
            {
                "numTxs": 30,
                "gas": 250000,
                "bridgeAddressId": 7,
                "permittedAssets": [
                    0,
                    1,
                    3,
                    4,
                    10,
                    15
                ]
            },
            {
                "numTxs": 30,
                "gas": 800000,
                "bridgeAddressId": 8,
                "permittedAssets": [
                    0,
                    1,
                    3,
                    4,
                    10,
                    15
                ]
            },
            {
                "numTxs": 20,
                "gas": 500000,
                "bridgeAddressId": 9,
                "permittedAssets": [
                    1
                ]
            },
            {
                "numTxs": 30,
                "gas": 300000,
                "bridgeAddressId": 10,
                "permittedAssets": [
                    0,
                    1,
                    2,
                    5,
                    6,
                    7,
                    13
                ]
            },
            {
                "numTxs": 20,
                "gas": 400000,
                "bridgeAddressId": 11,
                "permittedAssets": [
                    0,
                    1
                ]
            },
            {
                "numTxs": 30,
                "gas": 400000,
                "bridgeAddressId": 13,
                "permittedAssets": [
                    0,
                    1,
                    8,
                    9,
                    13
                ]
            },
            {
                "numTxs": 10,
                "gas": 700000,
                "bridgeAddressId": 14,
                "permittedAssets": [
                    0,
                    10,
                    11
                ]
            },
            {
                "numTxs": 20,
                "gas": 500000,
                "bridgeAddressId": 16,
                "permittedAssets": [
                    0,
                    1,
                    2,
                    10,
                    14
                ]
            },
            {
                "numTxs": 20,
                "gas": 800000,
                "bridgeAddressId": 17,
                "permittedAssets": [
                    0,
                    1,
                    2,
                    10,
                    14
                ]
            }
        ],
        "feePayingAssetIds": [
            0,
            1
        ],
        "depositLimit": 10,
        "baseTxGas": 10000,
        "maxFeeGasPrice": "250000000000",
        "maxFeePerGas": "150000000000",
        "maxPriorityFeePerGas": "2500000000",
        "privacySets": {
            "0": [
                {
                    "value": "1000000000000000",
                    "users": 8298
                },
                {
                    "value": "100000000000000000",
                    "users": 5600
                },
                {
                    "value": "1000000000000000000",
                    "users": 3196
                },
                {
                    "value": "5000000000000000000",
                    "users": 1200
                }
            ],
            "1": [
                {
                    "value": "100000000000000000000",
                    "users": 1700
                },
                {
                    "value": "1000000000000000000000",
                    "users": 850
                },
                {
                    "value": "10000000000000000000000",
                    "users": 178
                }
            ]
        },
        "rollupBeneficiary": "0x4cf32670a53657596e641dfcc6d40f01e4d64927"
    }
}
```

## Infrastructure Resource Requirements

The following are snippets of Terraform that demonstrate some of the resources deployed to the current production environment and the configuration applied. The environment consists of a dockerised Falafel deployment using a 'split' proof generator mode with a provisioned Postgres DB instance and an elastically scalable filesystem. These persistent stores are then configured into the container task definition. Where information is deemed possibly sensitive, it's been redacted.

```
# Configure a Postgres db.

resource "aws_db_instance" "postgres" {
  allocated_storage      = 20
  max_allocated_storage  = 100
  engine                 = "postgres"
  engine_version         = "13.7"
  instance_class         = "db.t4g.large"
  storage_type           = "gp2"
}

# Configure an EFS filesystem.
resource "aws_efs_file_system" "falafel_data_store" {
  throughput_mode                 = "provisioned"
  provisioned_throughput_in_mibps = 20

  lifecycle_policy {
    transition_to_ia = "AFTER_14_DAYS"
  }
}

# Define task definition and service.
resource "aws_ecs_task_definition" "falafel" {
  family                   = "${var.DEPLOY_TAG}-falafel"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "4096"
  memory                   = "16384"

  volume {
    name = "efs-data-store"
    efs_volume_configuration {
      file_system_id = aws_efs_file_system.falafel_data_store.id
    }
  }

  container_definitions = <<DEFINITIONS
[
  {
    "name": "${var.DEPLOY_TAG}-falafel",
    "essential": true,
    "memoryReservation": 3840,
    "portMappings": [
      {
        "containerPort": 80
      }
    ],
    "environment": [
      {
        "name": "DEPLOY_TAG",
        "value": "${var.DEPLOY_TAG}"
      },
      {
        "name": "NODE_ENV",
        "value": "production"
      },
      {
        "name": "PORT",
        "value": "80"
      },
      {
        "name": "DB_URL",
        "value": "postgres://<REDACTED>:<REDACTED>@${aws_db_instance.postgres.endpoint}"
      },
      {
        "name": "ETHEREUM_HOST",
        "value": "<REDACTED>"
      },
      {
        "name": "ROLLUP_CONTRACT_ADDRESS",
        "value": "0xFF1F2B4ADb9dF6FC8eAFecDcbF96A2B351680455"
      },
      {
        "name": "PERMIT_HELPER_CONTRACT_ADDRESS",
        "value": "0xf4F1e0B0b93b7b2b7b6992B99F2A1678b07Cd70C"
      },
      {
        "name": "FEE_DISTRIBUTOR_ADDRESS",
        "value": "0x4cf32670a53657596E641DFCC6d40f01e4d64927"
      },
      {
        "name": "PRICE_FEED_CONTRACT_ADDRESSES",
        "value": "0x169e633a2d1e6c10dd91238ba11c4a708dfef37c,0x773616E4d11A78F511299002da57A0a94577F1f4"
      },
      {
        "name": "BRIDGE_DATA_PROVIDER_CONTRACT_ADDRESS",
        "value": "0x8b2e54fa4398c8f7502f30ac94cb1f354390c8ab"
      },
      {
        "name": "PRIVATE_KEY",
        "value": "<REDACTED>"
      },
      {
        "name": "SERVER_AUTH_TOKEN",
        "value": "<REDACTED>"
      },
      {
        "name": "API_PREFIX",
        "value": "/${var.DEPLOY_TAG}/falafel"
      },
      {
        "name": "NUM_INNER_ROLLUP_TXS",
        "value": "28"
      },
      {
        "name": "NUM_OUTER_ROLLUP_PROOFS",
        "value": "32"
      },
      {
        "name": "MIN_CONFIRMATION",
        "value": "3"
      },
      {
        "name": "PROOF_GENERATOR_MODE",
        "value": "split"
      },
      {
        "name": "PUBLISH_INTERVAL",
        "value": "14400"
      }
    ],
    "mountPoints": [
      {
        "containerPath": "/usr/src/yarn-project/falafel/data",
        "sourceVolume": "efs-data-store"
      }
    ]
  }
]
DEFINITIONS
}

resource "aws_ecs_service" "falafel" {
  name                               = "${var.DEPLOY_TAG}-falafel"
  launch_type                        = "FARGATE"
  desired_count                      = 1
  deployment_maximum_percent         = 100
  deployment_minimum_healthy_percent = 0
  platform_version                   = "1.4.0"

  task_definition = aws_ecs_task_definition.falafel.family
}
```

## Escape Hatch

The current mainnet contract has a two hour escape hatch window every 24 hours in which anyone can publish a rollup to the contract. If a user wants to escape they can run an instance of falafel, point their sdk or dapp at this local instance, and send a transaction.
