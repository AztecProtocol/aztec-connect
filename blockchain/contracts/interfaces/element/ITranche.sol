// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.6.10 <=0.8.10;

import "../IERC20Permit.sol";

interface ITranche is IERC20Permit {
  function deposit(uint256 _shares, address destination)
    external
    returns (uint256, uint256);

  function prefundedDeposit(address _destination)
    external
    returns (uint256, uint256);

  function withdrawPrincipal(uint256 _amount, address _destination)
    external
    returns (uint256);

  function withdrawInterest(uint256 _amount, address _destination)
    external
    returns (uint256);

  function interestSupply() external view returns (uint128);

  function position() external view returns (IERC20);

  function underlying() external view returns (IERC20);

  function speedbump() external view returns (uint256);
}
