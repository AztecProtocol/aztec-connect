// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.6.10 <=0.8.10;

import "../IERC20Permit.sol";

interface IWrappedPosition is IERC20Permit {
    function token() external view returns (IERC20);

    function vault() external view returns (IERC20);

    function balanceOfUnderlying(address who) external view returns (uint256);

    function getSharesToUnderlying(uint256 shares)
        external
        view
        returns (uint256);

    function deposit(address sender, uint256 amount) external returns (uint256);

    function withdraw(
        address sender,
        uint256 _shares,
        uint256 _minUnderlying
    ) external returns (uint256);

    function withdrawUnderlying(
        address _destination,
        uint256 _amount,
        uint256 _minUnderlying
    ) external returns (uint256, uint256);

    function prefundedDeposit(address _destination)
        external
        returns (
            uint256,
            uint256,
            uint256
        );
}