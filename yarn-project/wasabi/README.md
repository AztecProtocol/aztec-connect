# Wasabi

Load testing tool

## What does it do?

Creates multiple agents funds them with balances, makes accounts then performs a load of transactions. There are multiple agent types to pick from, including:

1. Element agent
2. Swapping agent (uniswap)
3. Payment
4. Lido curve

## Env vars

| Name               | Description                                                                            | Default                 |
| ------------------ | -------------------------------------------------------------------------------------- | ----------------------- |
| ETHEREUM_HOST      | Eth node to point to                                                                   | 'http://localhost:8545' |
| PRIVATE_KEY        | If running one test, provide a private key                                             | None                    |
| MNEMONIC           | Provide a Mnemonic to test with multiple accounts                                      | None                    |
| ACCOUNT_OFFSET     | TODO                                                                                   | '0'                     |
| AGENT_TYPE         | The type of agent test to run, pick from options above                                 | 'payment'               |
| ASSETS             | Comma separated list of ASSET IDS e.g. 0,1,2                                           | 0                       |
| NUM_AGENTS         | The Number of agents created by the agent manager                                      | 1                       |
| NUM_TXS_PER_AGENT  | The number of txs for each agent to make                                               | 1                       |
| NUM_CONCURRENT_TXS | Relevant to the payment agent, The number of payments made each iteration              | 1                       |
| NUM_FORKS          | The number of processes to run with                                                    | 8                       |
| ACCOUNT            | SDK configuration: Account to init the sdk with                                        | None                    |
| ROLLUP_HOST        | Sequencer node                                                                         | 'http://localhost:8081' |
| CONFS              | SDK configuration: Number of block confirmations                                       | 1                       |
| LOOPS              | The number of loops to run, each loop will initialise and perform an agent interaction | None                    |
| GAS_PRICE_GWEI     | Tx gas price                                                                           | 50                      |
