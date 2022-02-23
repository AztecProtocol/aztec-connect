// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.6.10 <=0.8.10;
pragma abicoder v2;

import { IERC20Permit, IERC20 } from "../IERC20Permit.sol";
import { IVault } from "../balancer/IVault.sol";

interface IPool is IERC20Permit {
  /// @dev Returns the poolId for this pool
  /// @return The poolId for this pool
  function getPoolId() external view returns (bytes32);

  function underlying() external view returns (IERC20);

  function expiration() external view returns (uint256);

  function getVault() external view returns (IVault);
}
