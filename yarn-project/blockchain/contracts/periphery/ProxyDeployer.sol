// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec
pragma solidity >=0.8.4;

import {TransparentUpgradeableProxy} from '@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol';

contract ProxyDeployer {
    event ProxyDeployed(address logic, address admin, bytes32 salt, address proxy);

    constructor() {}

    function deployProxy(
        address _logic,
        address _admin,
        bytes memory _data,
        bytes32 _salt
    ) public returns (address) {
        TransparentUpgradeableProxy proxy = new TransparentUpgradeableProxy{salt: _salt}(_logic, _admin, _data);

        emit ProxyDeployed(_logic, _admin, _salt, address(proxy));

        return address(proxy);
    }
}
