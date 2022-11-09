#!/bin/bash
set -e

. ./scripts/export_address.sh ROLLUP_CONTRACT_ADDRESS rollupContractAddress
. ./scripts/export_address.sh PERMIT_HELPER_CONTRACT_ADDRESS permitHelperAddress
. ./scripts/export_address.sh PRICE_FEED_CONTRACT_ADDRESSES priceFeedContractAddresses
. ./scripts/export_address.sh BRIDGE_DATA_PROVIDER_CONTRACT_ADDRESS bridgeDataProviderContractAddress