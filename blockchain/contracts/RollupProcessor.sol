// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd
pragma solidity >=0.6.10 <0.8.0;

import {IERC20} from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';
import {Pausable} from '@openzeppelin/contracts/utils/Pausable.sol';
import {SafeMath} from '@openzeppelin/contracts/math/SafeMath.sol';

import {IVerifier} from './interfaces/IVerifier.sol';
import {IRollupProcessor} from './interfaces/IRollupProcessor.sol';
import {IFeeDistributor} from './interfaces/IFeeDistributor.sol';
import {IERC20Permit} from './interfaces/IERC20Permit.sol';
import {Decoder} from './Decoder.sol';
import './libraries/RollupProcessorLibrary.sol';

/**
 * @title Rollup Processor
 * @dev Smart contract responsible for processing Aztec zkRollups, including relaying them to a verifier
 * contract for validation and performing all relevant ERC20 token transfers
 */
contract RollupProcessor is IRollupProcessor, Decoder, Ownable, Pausable {
    using SafeMath for uint256;

    bytes32 public dataRoot = 0x2708a627d38d74d478f645ec3b4e91afa325331acf1acebe9077891146b75e39;
    bytes32 public nullRoot = 0x2694dbe3c71a25d92213422d392479e7b8ef437add81e1e17244462e6edca9b1;
    bytes32 public rootRoot = 0x2d264e93dc455751a721aead9dba9ee2a9fef5460921aeede73f63f6210e6851;

    uint256 public dataSize;
    uint256 public nextRollupId;

    IVerifier public verifier;

    uint256 public constant numberOfAssets = 4;
    uint256 public constant txNumPubInputs = 12;
    uint256 public constant rollupNumPubInputs = 10 + numberOfAssets;
    uint256 public constant txPubInputLength = txNumPubInputs * 32; // public inputs length for of each inner proof tx
    uint256 public constant rollupPubInputLength = rollupNumPubInputs * 32;
    uint256 public constant ethAssetId = 0;
    uint256 public immutable escapeBlockLowerBound;
    uint256 public immutable escapeBlockUpperBound;

    event RollupProcessed(
        uint256 indexed rollupId,
        bytes32 dataRoot,
        bytes32 nullRoot,
        bytes32 rootRoot,
        uint256 dataSize
    );
    event Deposit(uint256 assetId, address depositorAddress, uint256 depositValue);
    event Withdraw(uint256 assetId, address withdrawAddress, uint256 withdrawValue);
    event WithdrawError(bytes errorReason);
    event AssetAdded(uint256 indexed assetId, address indexed assetAddress);
    event RollupProviderUpdated(address indexed providerAddress, bool valid);
    event VerifierUpdated(address indexed verifierAddress);

    // Array of supported ERC20 token address.
    address[] public supportedAssets;

    // Mapping which maps an asset address to a bool, determining whether it supports
    // permit as according to ERC-2612
    mapping(address => bool) assetPermitSupport;

    // Mapping from assetId to mapping of userAddress to public userBalance stored on this contract
    mapping(uint256 => mapping(address => uint256)) public userPendingDeposits;

    mapping(address => mapping(bytes32 => bool)) public depositProofApprovals;

    mapping(address => bool) public rollupProviders;

    address public override feeDistributor;

    // Metrics
    uint256[] public totalPendingDeposit;
    uint256[] public totalDeposited;
    uint256[] public totalWithdrawn;
    uint256[] public totalFees;

    constructor(
        address _verifierAddress,
        uint256 _escapeBlockLowerBound,
        uint256 _escapeBlockUpperBound,
        address _contractOwner
    ) public {
        verifier = IVerifier(_verifierAddress);
        escapeBlockLowerBound = _escapeBlockLowerBound;
        escapeBlockUpperBound = _escapeBlockUpperBound;
        rollupProviders[msg.sender] = true;
        totalPendingDeposit.push(0);
        totalDeposited.push(0);
        totalWithdrawn.push(0);
        totalFees.push(0);
        transferOwnership(_contractOwner);
    }

    function setRollupProvider(address providerAddress, bool valid) public override onlyOwner {
        rollupProviders[providerAddress] = valid;
        emit RollupProviderUpdated(providerAddress, valid);
    }

    function setVerifier(address _verifierAddress) public override onlyOwner {
        verifier = IVerifier(_verifierAddress);
        emit VerifierUpdated(_verifierAddress);
    }

    function setFeeDistributor(address feeDistributorAddress) public override onlyOwner {
        feeDistributor = feeDistributorAddress;
    }

    /**
     * @dev Approve a proofHash for spending a users deposited funds, this is one way and must be called by the owner of the funds
     * @param _proofHash - keccack256 hash of the inner proof public inputs
     */

    function approveProof(bytes32 _proofHash) public override whenNotPaused {
        depositProofApprovals[msg.sender][_proofHash] = true;
    }

    /**
     * @dev Get the ERC20 token address of a supported asset, for a given assetId
     * @param assetId - identifier used to denote a particular asset
     */
    function getSupportedAsset(uint256 assetId) public view override returns (address) {
        if (assetId == ethAssetId) {
            return address(0x0);
        }

        return supportedAssets[assetId - 1];
    }

    /**
     * @dev Get the addresses of all supported ERC20 tokens
     */
    function getSupportedAssets() external view override returns (address[] memory) {
        return supportedAssets;
    }

    function getTotalDeposited() external view override returns (uint256[] memory) {
        return totalDeposited;
    }

    function getTotalWithdrawn() external view override returns (uint256[] memory) {
        return totalWithdrawn;
    }

    function getTotalPendingDeposit() external view override returns (uint256[] memory) {
        return totalPendingDeposit;
    }

    function getTotalFees() external view override returns (uint256[] memory) {
        return totalFees;
    }

    /**
     * @dev Get the status of whether an asset supports the permit ERC-2612 approval flow
     * @param assetId - unique identifier of the supported asset
     */
    function getAssetPermitSupport(uint256 assetId) external view override returns (bool) {
        address assetAddress = getSupportedAsset(assetId);
        return assetPermitSupport[assetAddress];
    }

    /**
     * @dev Get the status of the escape hatch, specifically retrieve whether the
     * hatch is open and also the number of blocks until the hatch will switch from
     * open to closed or vice versa
     */
    function getEscapeHatchStatus() public view override returns (bool, uint256) {
        uint256 blockNum = block.number;

        bool isOpen = blockNum % escapeBlockUpperBound >= escapeBlockLowerBound;
        uint256 blocksRemaining = 0;
        if (isOpen) {
            // num blocks escape hatch will remain open for
            blocksRemaining = escapeBlockUpperBound - (blockNum % escapeBlockUpperBound);
        } else {
            // num blocks until escape hatch will be opened
            blocksRemaining = escapeBlockLowerBound - (blockNum % escapeBlockUpperBound);
        }
        return (isOpen, blocksRemaining);
    }

    /**
     * @dev Get the balance of a user, for a particular asset, held on the user's behalf
     * by this contract
     * @param assetId - unique identifier of the asset
     * @param userAddress - Ethereum address of the user who's balance is being queried
     */
    function getUserPendingDeposit(uint256 assetId, address userAddress) external view override returns (uint256) {
        return userPendingDeposits[assetId][userAddress];
    }

    /**
     * @dev Increase the userPendingDeposits mapping
     */
    function increasePendingDepositBalance(
        uint256 assetId,
        address depositorAddress,
        uint256 amount
    ) internal {
        userPendingDeposits[assetId][depositorAddress] = userPendingDeposits[assetId][depositorAddress].add(amount);
        totalPendingDeposit[assetId] = totalPendingDeposit[assetId].add(amount);
    }

    /**
     * @dev Decrease the userPendingDeposits mapping
     */
    function decreasePendingDepositBalance(
        uint256 assetId,
        address transferFromAddress,
        uint256 amount
    ) internal {
        uint256 userBalance = userPendingDeposits[assetId][transferFromAddress];
        require(userBalance >= amount, 'Rollup Processor: INSUFFICIENT_DEPOSIT');

        userPendingDeposits[assetId][transferFromAddress] = userBalance.sub(amount);
        totalPendingDeposit[assetId] = totalPendingDeposit[assetId].sub(amount);
        totalDeposited[assetId] = totalDeposited[assetId].add(amount);
    }

    /**
     * @dev Set the mapping between an assetId and the address of the linked asset.
     * Protected by onlyOwner
     * @param linkedToken - address of the asset
     * @param supportsPermit - bool determining whether this supports permit
     */
    function setSupportedAsset(address linkedToken, bool supportsPermit) external override onlyOwner {
        require(linkedToken != address(0x0), 'Rollup Processor: ZERO_ADDRESS');

        supportedAssets.push(linkedToken);
        assetPermitSupport[linkedToken] = supportsPermit;

        uint256 assetId = supportedAssets.length;
        require(assetId < numberOfAssets, 'Rollup Processor: MAX_ASSET_REACHED');

        totalPendingDeposit.push(0);
        totalDeposited.push(0);
        totalWithdrawn.push(0);
        totalFees.push(0);

        emit AssetAdded(assetId, linkedToken);
    }

    /**
     * @dev Update the value indicating whether a linked asset supports permit.
     * Protected by onlyOwner
     * @param assetId - unique ID of the asset
     * @param supportsPermit - bool determining whether this supports permit
     */
    function setAssetPermitSupport(uint256 assetId, bool supportsPermit) external override onlyOwner {
        address assetAddress = getSupportedAsset(assetId);
        require(assetAddress != address(0x0), 'Rollup Processor: TOKEN_ASSET_NOT_LINKED');

        assetPermitSupport[assetAddress] = supportsPermit;
    }

    /**
     * @dev Deposit funds as part of the first stage of the two stage deposit. Non-permit flow
     * @param assetId - unique ID of the asset
     * @param amount - number of tokens being deposited
     * @param depositorAddress - address from which funds are being transferred to the contract
     */
    function depositPendingFunds(
        uint256 assetId,
        uint256 amount,
        address depositorAddress
    ) external payable override whenNotPaused {
        if (assetId == ethAssetId) {
            require(msg.value == amount, 'Rollup Processor: WRONG_AMOUNT');

            increasePendingDepositBalance(assetId, depositorAddress, amount);
        } else {
            require(msg.value == 0, 'Rollup Processor: WRONG_PAYMENT_TYPE');

            address assetAddress = getSupportedAsset(assetId);
            internalDeposit(assetId, assetAddress, depositorAddress, amount);
        }
    }

    /**
     * @dev Deposit funds as part of the first stage of the two stage deposit. Permit flow
     * @param assetId - unique ID of the asset
     * @param amount - number of tokens being deposited
     * @param depositorAddress - address from which funds are being transferred to the contract
     * @param spender - address being granted approval to spend the funds
     * @param permitApprovalAmount - amount permit signature is approving
     * @param deadline - when the permit signature expires
     * @param v - ECDSA sig param
     * @param r - ECDSA sig param
     * @param s - ECDSA sig param
     */
    function depositPendingFundsPermit(
        uint256 assetId,
        uint256 amount,
        address depositorAddress,
        address spender,
        uint256 permitApprovalAmount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external override whenNotPaused {
        address assetAddress = getSupportedAsset(assetId);
        IERC20Permit(assetAddress).permit(depositorAddress, spender, permitApprovalAmount, deadline, v, r, s);
        internalDeposit(assetId, assetAddress, depositorAddress, amount);
    }

    /**
     * @dev Deposit funds as part of the first stage of the two stage deposit. Non-permit flow
     * @param assetId - unique ID of the asset
     * @param assetAddress - address of the ERC20 asset
     * @param depositorAddress - address from which funds are being transferred to the contract
     * @param amount - amount being deposited
     */
    function internalDeposit(
        uint256 assetId,
        address assetAddress,
        address depositorAddress,
        uint256 amount
    ) internal {
        // check user approved contract to transfer funds, so can throw helpful error to user
        uint256 rollupAllowance = IERC20(assetAddress).allowance(depositorAddress, address(this));
        require(rollupAllowance >= amount, 'Rollup Processor: INSUFFICIENT_TOKEN_APPROVAL');

        IERC20(assetAddress).transferFrom(depositorAddress, address(this), amount);
        increasePendingDepositBalance(assetId, depositorAddress, amount);

        emit Deposit(assetId, depositorAddress, amount);
    }

    /**
     * @dev Process a rollup - decode the rollup, update relevant state variables and
     * verify the proof
     * @param proofData - cryptographic proof data associated with a rollup
     * @param signatures - bytes array of secp256k1 ECDSA signatures, authorising a transfer of tokens
     * from the publicOwner for the particular inner proof in question. There is a signature for each
     * inner proof.
     *
     * Structure of each signature in the bytes array is:
     * 0x00 - 0x20 : r
     * 0x20 - 0x40 : s
     * 0x40 - 0x60 : v (in form: 0x0000....0001b for example)
     *
     * @param viewingKeys - viewingKeys for the notes submitted in the rollup. Note: not used in the logic
     * of the rollupProcessor contract, but called here as a convenient to place data on chain
     */
    function escapeHatch(
        bytes calldata proofData,
        bytes calldata signatures,
        bytes calldata viewingKeys
    ) external override whenNotPaused {
        (bool isOpen, ) = getEscapeHatchStatus();
        require(isOpen, 'Rollup Processor: ESCAPE_BLOCK_RANGE_INCORRECT');

        processRollupProof(proofData, signatures, viewingKeys);
    }

    function processRollup(
        bytes calldata proofData,
        bytes calldata signatures,
        bytes calldata viewingKeys,
        bytes calldata providerSignature,
        address provider,
        address payable feeReceiver,
        uint256 feeLimit
    ) external override whenNotPaused {
        uint256 initialGas = gasleft();

        require(rollupProviders[provider], 'Rollup Processor: UNKNOWN_PROVIDER');
        bytes memory sigData =
            abi.encodePacked(proofData[0:rollupPubInputLength], feeReceiver, feeLimit, feeDistributor);
        RollupProcessorLibrary.validateSignature(sigData, providerSignature, provider);

        processRollupProof(proofData, signatures, viewingKeys);

        transferFee(proofData);

        (bool success, ) =
            feeDistributor.call(
                abi.encodeWithSignature(
                    'reimburseGas(uint256,uint256,address)',
                    initialGas - gasleft(),
                    feeLimit,
                    feeReceiver
                )
            );
        require(success, 'Rollup Processor: REIMBURSE_GAS_FAILED');
    }

    function processRollupProof(
        bytes calldata proofData,
        bytes calldata signatures,
        bytes calldata viewingKeys
    ) internal {
        uint256 numTxs = verifyProofAndUpdateState(proofData);
        processDepositsAndWithdrawals(proofData[rollupPubInputLength:proofData.length], numTxs, signatures);
    }

    /**
     * @dev Verify the zk proof and update the contract state variables with those provided by the rollup.
     * @param proofData - cryptographic zk proof data. Passed to the verifier for verification.
     */
    function verifyProofAndUpdateState(bytes memory proofData) internal returns (uint256) {
        (
            bytes32 newDataRoot,
            bytes32 newNullRoot,
            uint256 rollupId,
            uint256 rollupSize,
            bytes32 newRootRoot,
            uint256 numTxs,
            uint256 newDataSize
        ) = validateMerkleRoots(proofData);

        verifier.verify(proofData, rollupSize);

        // Update state variables.
        dataRoot = newDataRoot;
        nullRoot = newNullRoot;
        nextRollupId = rollupId.add(1);
        rootRoot = newRootRoot;
        dataSize = newDataSize;

        emit RollupProcessed(rollupId, dataRoot, nullRoot, rootRoot, dataSize);

        return numTxs;
    }

    /**
     * @dev Extract public inputs and validate they are inline with current contract state.
     * @param proofData - Rollup proof data.
     */
    function validateMerkleRoots(bytes memory proofData)
        internal
        view
        returns (
            bytes32,
            bytes32,
            uint256,
            uint256,
            bytes32,
            uint256,
            uint256
        )
    {
        (
            // Stack to deep workaround:
            // 0: rollupId
            // 1: rollupSize
            // 2: dataStartIndex
            // 3: numTxs
            uint256[4] memory nums,
            bytes32 oldDataRoot,
            bytes32 newDataRoot,
            bytes32 oldNullRoot,
            bytes32 newNullRoot,
            bytes32 oldRootRoot,
            bytes32 newRootRoot
        ) = decodeProof(proofData, numberOfAssets);

        // Escape hatch denominated by a rollup size of 0, which means inserting 2 new entries.
        nums[3] = nums[1] == 0 ? 1 : nums[1];

        // Ensure we are inserting at the next subtree boundary.
        uint256 toInsert = nums[3].mul(2);
        if (dataSize % toInsert == 0) {
            require(nums[2] == dataSize, 'Rollup Processor: INCORRECT_DATA_START_INDEX');
        } else {
            uint256 expected = dataSize + toInsert - (dataSize % toInsert);
            require(nums[2] == expected, 'Rollup Processor: INCORRECT_DATA_START_INDEX');
        }

        // Data validation checks.
        require(oldDataRoot == dataRoot, 'Rollup Processor: INCORRECT_DATA_ROOT');
        require(oldNullRoot == nullRoot, 'Rollup Processor: INCORRECT_NULL_ROOT');
        require(oldRootRoot == rootRoot, 'Rollup Processor: INCORRECT_ROOT_ROOT');
        require(nums[0] == nextRollupId, 'Rollup Processor: ID_NOT_SEQUENTIAL');

        return (newDataRoot, newNullRoot, nums[0], nums[1], newRootRoot, nums[3], nums[2] + toInsert);
    }

    /**
     * @dev Process deposits and withdrawls.
     * @param innerProofData - all proofData associated with the rolled up transactions
     * @param numTxs - number of transactions rolled up in the proof
     * @param signatures - bytes array of secp256k1 ECDSA signatures, authorising a transfer of tokens
     */
    function processDepositsAndWithdrawals(
        bytes calldata innerProofData,
        uint256 numTxs,
        bytes calldata signatures
    ) internal {
        uint256 sigIndex = 0;

        for (uint256 i = 0; i < numTxs; i++) {
            bytes calldata txPubInputs =
                innerProofData[i.mul(txPubInputLength):i.mul(txPubInputLength).add(txPubInputLength)];
            (
                uint256 proofId,
                uint256 publicInput,
                uint256 publicOutput,
                uint256 assetId,
                address inputOwner,
                address outputOwner
            ) = extractTxComponents(txPubInputs);

            if (proofId != 0) {
                continue;
            }

            if (publicInput > 0) {
                if (!depositProofApprovals[inputOwner][keccak256(txPubInputs)]) {
                    bytes memory signature = extractSignature(signatures, sigIndex++);
                    RollupProcessorLibrary.validateSignature(txPubInputs, signature, inputOwner);
                }
                decreasePendingDepositBalance(assetId, inputOwner, publicInput);
            }

            if (publicOutput > 0) {
                withdraw(publicOutput, outputOwner, assetId);
            }
        }
    }

    function transferFee(bytes calldata proofData) internal {
        for (uint256 i = 0; i < numberOfAssets; ++i) {
            uint256 txFee = extractTotalTxFee(proofData, i);
            if (txFee > 0) {
                bool success;
                if (i == ethAssetId) {
                    (success, ) = payable(feeDistributor).call{value: txFee}('');
                } else {
                    address assetAddress = getSupportedAsset(i);
                    IERC20(assetAddress).approve(feeDistributor, txFee);
                    (success, ) = feeDistributor.call(abi.encodeWithSignature('deposit(uint256,uint256)', i, txFee));
                }
                require(success, 'Rollup Processor: DEPOSIT_TX_FEE_FAILED');
                totalFees[i] = totalFees[i].add(txFee);
            }
        }
    }

    /**
     * @dev Internal utility function to withdraw funds from the contract to a receiver address
     * @param withdrawValue - value being withdrawn from the contract
     * @param receiverAddress - address receiving public ERC20 tokens
     * @param assetId - ID of the asset for which a withdrawl is being performed
     */
    function withdraw(
        uint256 withdrawValue,
        address receiverAddress,
        uint256 assetId
    ) internal {
        require(receiverAddress != address(0), 'Rollup Processor: ZERO_ADDRESS');
        if (assetId == 0) {
            payable(receiverAddress).call{gas: 30000, value: withdrawValue}('');
        } else {
            address assetAddress = getSupportedAsset(assetId);
            IERC20(assetAddress).transfer(receiverAddress, withdrawValue);
        }
        totalWithdrawn[assetId] = totalWithdrawn[assetId].add(withdrawValue);
    }
}
