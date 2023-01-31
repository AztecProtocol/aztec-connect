# nym-gateway

The nym gateway is a service that can interface between Aztec's services and the nym network, using HTTP.
It works by:

- Running a nym client whose address will be shared to our front-end services
- Connecting to that nym client via a websocket and then transporting nym messages downstream, as regular HTTP messages.

## nym-client binary download

Native websocket nym client binaries can be downloaded from here:
https://github.com/nymtech/nym/releases/download/nym-binaries-1.1.6/nym-client

Latest version is currently 1.1.6
