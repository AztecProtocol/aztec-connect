# Running the Rollup Provider Backend Service

The rollup provider backend platform consists of 4 primary components:

1. The sequencer [Falafel](./falafel/README.md)
2. The proof generator [Halloumi](./halloumi/README.md)
3. The block server [Block-Server](./block-server/README.md)
4. The blockchain proxy [Kebab](./kebab/README.md)

At a high-level this is the function and configuration of each component.

## The Sequencer (Falafel)

Falafel provides a number of HTTP interfaces:

1. An interface for client and administrative access. Enables the querying of rollup state and the submission of transactions. Also allows for modification of runtime configuration.
2. Up to 2 interfaces for Halloumi instances to request proof generation 'jobs'.

Beyond the provision of these interfaces, it is the beating heart of the rollup provider network. It maintains a local copy of the complete rollup history to provide to clients. It accumulates client transactions and when deemed economical, orchestrates the construction of rollups. It publishes those rollups and maintains all Merkle tree state.

## The Proof Generator (Halloumi)

As mentioned above, Halloumi makes contact with Falafel by making HTTP requests to an exposed endpoint. It does this to request proof construction 'jobs' that need to be completed as part of the process of building rollups. Falafel will distribute these 'jobs' to any available Halloumis at the point it requires proofs to fulfil rollup construction. Halloumi then posts back the resulting proofs via the same interface before continuing to request more work.

The requests that Halloumi receives will be one of the following types:

1. A request for a verification key. Either for the account circuit or the join-split circuit.
2. A request for creation of a claim proof.
3. A request for a rollup proof, either an 'inner' (transaction) rollup proof or an 'outer' (root) rollup proof.
4. A request for a root verifier proof.

## The Block Server

Part of the role of Falafel is to store a copy of all rollups produced historically and make them available for clients to download. This is necessary in order for a client to be able to 'sync' the system state and produce proofs. Serving this data to clients however can be resource intensive. Particularly if clients are having to 're-sync' from block 0. The block server is a fairly simple service that maintains a cache of block data in a format that is ready to serve to clients, taking the load of doing so away from Falafel. If blocks are requested that it does not contain it will forward the request to Falafel's client HTTP interface and cache the received blocks for further use.

## The Blockchain Proxy (Kebab)

Kebab is a blockchain proxy offering a JSON RPC interface identical to that of an Ethereum node. It performs a couple of important roles within the platform.

1. Various parts of the platform (including the SDK and Zk.Money) make many requests to the Ethereum blockchain, either reading data or submitting transactions. Most of these requests are routed through Kebab where opportunities are taken to cache responses reducing the request rate placed on the ultimate ETH node.
2. The process of scanning ethereum blocks for published events can be slow and cumbersome when dealing directly with a JSON RPC node. Indeed, some chain simulation applications can crash if you attempt to scan for blocks over too large a range etc. To abstract this away from core parts of the system, Kebab performs this scanning function for published rollups and stores the block data in a local database. Kebab is aware of the type of ETH node it is a proxy to and scans in a sypathetic manner to avoid problems.
3. Where `eth_getLogs` requests are sent to Kebab for topics that Kebab is configured to store, Kebab will return them from it's local cache. This allows for coarse block ranges to be used by other parts of the system when making those requests.
