// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract AztecFaucet {
    IERC20 public immutable DAI = IERC20(0x6B175474E89094C44Da98b954EedeAC495271d0F);
    uint256 public ETH_AMOUNT = 1e19; //10 ETH
    uint256 public DAI_AMOUNT = 5e20; //500 DAI
    mapping(address => bool) public approvedOperators;
    mapping(address => bool) public superOperators;

    modifier isSuperOperator() {
        require(superOperators[msg.sender], "Not super operator");
        _;
    }

    modifier isApprovedOperator() {
        require(approvedOperators[msg.sender] || superOperators[msg.sender], "Not approved operator");
        _;
    }

    event FaucetDripped(address indexed recipient);
    event FaucetDrained(address indexed recipient);
    event OperatorUpdated(address indexed operator, bool status);
    event SuperOperatorUpdated(address indexed operator, bool status);

    constructor() {
        superOperators[msg.sender] = true;
    }

    function drip(address _recipient) external isApprovedOperator {
        (bool sent,) = _recipient.call{value: ETH_AMOUNT}("");
        require(sent, "Failed dripping ETH");

        require(DAI.transfer(_recipient, DAI_AMOUNT), "Failed dripping DAI");

        emit FaucetDripped(_recipient);
    }

    function availableDrips() public view returns (uint256 ethDrips, uint256 daiDrips) {
        ethDrips = address(this).balance / ETH_AMOUNT;
        daiDrips = DAI.balanceOf(address(this)) / DAI_AMOUNT;
    }

    function drain(address _recipient) external isSuperOperator {
        (bool sent,) = _recipient.call{value: address(this).balance}("");
        require(sent, "Failed draining ETH");

        uint256 daiBalance = DAI.balanceOf(address(this));
        require(DAI.transfer(_recipient, daiBalance), "Failed draining DAI");

        emit FaucetDrained(_recipient);
    }

    function updateApprovedOperator(address _operator, bool _status) external isSuperOperator {
        approvedOperators[_operator] = _status;
        emit OperatorUpdated(_operator, _status);
    }

    function updateSuperOperator(address _operator, bool _status) external isSuperOperator {
        superOperators[_operator] = _status;
        emit SuperOperatorUpdated(_operator, _status);
    }

    function updateDripAmounts(uint256 _ethAmount, uint256 _daiAmount) external isSuperOperator {
        ETH_AMOUNT = _ethAmount;
        DAI_AMOUNT = _daiAmount;
    }

    receive() external payable {}
}
