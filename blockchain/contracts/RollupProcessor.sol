// SPDX-License-Identifier: GPL-2.0-only

pragma solidity >=0.6.10 <0.7.0;

import {IVerifier} from './interfaces/IVerifier.sol';
import {Verifier} from './Verifier.sol';
import {IRollupProcessor} from './interfaces/IRollupProcessor.sol';

import {SafeMath} from '@openzeppelin/contracts/math/SafeMath.sol';
import {IERC20} from '@openzeppelin/contracts/token/ERC20/IERC20.sol';

import "@nomiclabs/buidler/console.sol";

contract RollupProcessor is IRollupProcessor {
    using SafeMath for uint256;

    bytes32 public dataRoot = 0x1df6bde50516dd1201088fd8dda84c97eda5652428d1c7e86af529cc5e0eb821;
    bytes32 public nullRoot = 0x152175cffcb23dfbd80262802e32efe7db5fdcb91ba0a0527ab1ffb323bf3fc0;
    bytes32 public rootRoot = 0x1b22ef607ae08588bc83a79ffacec507347bd2dee44c846181b7051285c32c0a;

    uint256 public dataSize;
    uint256 public nextRollupId;

    IVerifier public verifier;
    IERC20 public linkedToken;
    uint256 public scalingFactor; // scale between Aztec note units and ERC20 units

    event RollupProcessed(uint256 indexed rollupId, bytes32 dataRoot, bytes32 nullRoot);
    event Deposit(address depositorAddress, uint256 depositValue);
    event Withdraw(address withdrawAddress, uint256 withdrawValue);

    constructor(address _linkedToken, uint256 _scalingFactor) public {
        require(_linkedToken != address(0x0), 'Rollup Processor: ZERO_ADDRESS');
        require(_scalingFactor != uint256(0), 'Rollup Processor: ZERO_SCALING_FACTOR');

        linkedToken = IERC20(_linkedToken);
        scalingFactor = _scalingFactor;
        verifier = new Verifier();
    }

    /**
     * @dev Process a rollup - decode the rollup, update relevant state variables and
     * verify the proof
     * @param proofData - cryptographic proof data associated with a rollup
     */
    function processRollup(
        bytes calldata proofData,
        bytes calldata viewingKeys,
        uint256 rollupSize
    ) external override {
        (
            uint256 rollupId,
            uint256 dataStartIndex,
            bytes32 oldDataRoot,
            bytes32 newDataRoot,
            bytes32 oldNullRoot,
            bytes32 newNullRoot,
            bytes32 oldRootRoot,
            bytes32 newRootRoot,
            uint256 numTxs
        ) = decodeProof(proofData);

        // data consistency checks
        require(oldDataRoot == dataRoot, 'Rollup Processor: INCORRECT_DATA_ROOT');
        require(oldNullRoot == nullRoot, 'Rollup Processor: INCORRECT_NULL_ROOT');
        require(oldRootRoot == rootRoot, 'Rollup Processor: INCORRECT_ROOT_ROOT');
        require(rollupId == nextRollupId, 'Rollup Processor: ID_NOT_SEQUENTIAL');
        require(dataStartIndex == dataSize, 'Rollup Processor: INCORRECT_DATA_START_INDEX');
        require(numTxs > 0, 'Rollup Processor: NUM_TX_IS_ZERO');

        verifier.verify(proofData);
        uint256 innerProofStart = 0x120;
        processInnerProofs(proofData[innerProofStart:], numTxs);

        // update state variables
        dataRoot = newDataRoot;
        nullRoot = newNullRoot;
        nextRollupId = rollupId.add(1);
        rootRoot = newRootRoot;
        dataSize = dataSize.add(rollupSize.mul(2));

        emit RollupProcessed(rollupId, newDataRoot, newNullRoot);
    }

    /**
     * @dev Decode the public inputs component of proofData. Required to update state variables
     * @param proofData - cryptographic proofData associated with a rollup
     */
    function decodeProof(bytes memory proofData)
        internal
        pure
        returns (
            uint256 rollupId,
            uint256 dataStartIndex,
            bytes32 oldDataRoot,
            bytes32 newDataRoot,
            bytes32 oldNullRoot,
            bytes32 newNullRoot,
            bytes32 oldRootRoot,
            bytes32 newRootRoot,
            uint256 numTxs
        )
    {
        assembly {
            let dataStart := add(proofData, 0x20) // jump over first word, it's length of data
            rollupId := mload(dataStart)
            dataStartIndex := mload(add(dataStart, 0x20))
            oldDataRoot := mload(add(dataStart, 0x40))
            newDataRoot := mload(add(dataStart, 0x60))
            oldNullRoot := mload(add(dataStart, 0x80))
            newNullRoot := mload(add(dataStart, 0xa0))
            oldRootRoot := mload(add(dataStart, 0xc0))
            newRootRoot := mload(add(dataStart, 0xe0))
            numTxs := mload(add(dataStart, 0x100))
        }
    }

    /**
     * @dev Process all inner proof data - extract the data, verify the proof and perform
     * any transfer of tokens
     * @param innerProofData - all proofData associated with the rolled up transactions
     * @param numTxs - number of transactions rolled up in the proof
     */
    function processInnerProofs(bytes calldata innerProofData, uint256 numTxs) internal {
        uint256 proofLength = 0x120;

        for (uint256 i = 0; i < numTxs; i += 1) {
            uint256 startIndex = i.mul(proofLength);
            uint256 finishIndex = startIndex.add(proofLength);
            bytes calldata proof = innerProofData[startIndex:finishIndex];
            transferTokens(proof);
        }
    }

    /**
     * @dev Transfer tokens in and out of the Rollup contract, as appropriate depending on whether a
     * deposit or withdrawal is taking place
     * @param proof - inner proof data for a single transaction. Includes deposit and withdrawal data
     */
    function transferTokens(bytes memory proof) internal {
        uint256 publicInput;
        uint256 publicOutput;
        address activeAddress;

        assembly {
            publicInput := mload(add(proof, 0x20))
            publicOutput := mload(add(proof, 0x40))
            activeAddress := mload(add(proof, 0x120))
        }

        uint256 transferValue;
        if (publicInput > publicOutput) {
            // deposit
            transferValue = publicInput.sub(publicOutput).mul(scalingFactor);
            deposit(transferValue, activeAddress);
        } else if (publicOutput > publicInput) {
            // withdraw
            transferValue = publicOutput.sub(publicInput).mul(scalingFactor);
            withdraw(transferValue, activeAddress);
        }
    }

    /**
     * @dev Internal utility function to deposit funds into the contract
     * @param depositValue - value being deposited into the contract, in return for
     * zk notes
     * @param depositorAddress - address which is depositing into the contract
     * and receiving zk notes. ERC20s are transferred from this address
     */
    function deposit(uint256 depositValue, address depositorAddress) internal {
        require(depositorAddress != address(0), 'Rollup Processor: ZERO_ADDRESS');

        // check user approved contract to transfer funds, so can throw helpful error to user
        uint256 rollupAllowance = linkedToken.allowance(depositorAddress, address(this));
        require(rollupAllowance >= depositValue, 'Rollup Processor: INSUFFICIENT_TOKEN_APPROVAL');

        linkedToken.transferFrom(depositorAddress, address(this), depositValue);
        emit Deposit(depositorAddress, depositValue);
    }

    /**
     * @dev Internal utility function to withdraw funds from the contract to a receiver address
     * @param withdrawValue - value being withdrawn from the contract
     * @param receiverAddress - address receiving public ERC20 tokens
     */
    function withdraw(uint256 withdrawValue, address receiverAddress) internal {
        require(receiverAddress != address(0), 'Rollup Processor: ZERO_ADDRESS');

        uint256 rollupBalance = linkedToken.balanceOf(address(this));
        require(withdrawValue <= rollupBalance, 'Rollup Processor: INSUFFICIENT_FUNDS');

        linkedToken.transfer(receiverAddress, withdrawValue);
        emit Withdraw(receiverAddress, withdrawValue);
    }
}
