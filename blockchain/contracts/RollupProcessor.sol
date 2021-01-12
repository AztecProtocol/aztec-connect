// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd
pragma solidity >=0.6.10 <0.7.0;

import {IERC20} from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';
import {SafeMath} from '@openzeppelin/contracts/math/SafeMath.sol';

import {IVerifier} from './interfaces/IVerifier.sol';
import {IRollupProcessor} from './interfaces/IRollupProcessor.sol';
import {IERC20Permit} from './interfaces/IERC20Permit.sol';
import {Decoder} from './Decoder.sol';
import './libraries/RollupProcessorLibrary.sol';

/**
 * @title Rollup Processor
 * @dev Smart contract responsible for processing Aztec zkRollups, including relaying them to a verifier
 * contract for validation and performing all relevant ERC20 token transfers
 */
contract RollupProcessor is IRollupProcessor, Decoder, Ownable {
    using SafeMath for uint256;

    bytes32 public dataRoot = 0x2708a627d38d74d478f645ec3b4e91afa325331acf1acebe9077891146b75e39;
    bytes32 public nullRoot = 0x2694dbe3c71a25d92213422d392479e7b8ef437add81e1e17244462e6edca9b1;
    bytes32 public rootRoot = 0x2d264e93dc455751a721aead9dba9ee2a9fef5460921aeede73f63f6210e6851;

    uint256 public dataSize;
    uint256 public nextRollupId;

    IVerifier public verifier;

    uint256 public constant txNumPubInputs = 12;
    uint256 public constant rollupNumPubInputs = 11;
    uint256 public constant txPubInputLength = txNumPubInputs * 32; // public inputs length for of each inner proof tx
    uint256 public constant rollupPubInputLength = rollupNumPubInputs * 32;
    uint256 public constant ethAssetId = 0;
    uint256 public immutable escapeBlockLowerBound;
    uint256 public immutable escapeBlockUpperBound;

    event RollupProcessed(uint256 indexed rollupId, bytes32 dataRoot, bytes32 nullRoot);
    event Deposit(uint256 assetId, address depositorAddress, uint256 depositValue);
    event Withdraw(uint256 assetId, address withdrawAddress, uint256 withdrawValue);
    event WithdrawError(bytes errorReason);
    event AssetAdded(uint256 indexed assetId, address indexed assetAddress);
    event RollupProviderUpdated(address indexed providerAddress, bool valid);

    // Array of supported ERC20 token address. The array index of the ERC20 token address
    // corresponds to the assetId of the asset
    address[] public supportedAssets;

    // Mapping which maps an asset address to a bool, determining whether it supports
    // permit as according to ERC-2612
    mapping(address => bool) assetPermitSupport;

    // Mapping from assetId to mapping of userAddress to public userBalance stored on this contract
    mapping(uint256 => mapping(address => uint256)) public userPendingDeposits;

    mapping(address => bool) public rollupProviders;

    address payable public feeDistributor;

    constructor(
        address _verifierAddress,
        uint256 _escapeBlockLowerBound,
        uint256 _escapeBlockUpperBound
    ) public {
        verifier = IVerifier(_verifierAddress);
        escapeBlockLowerBound = _escapeBlockLowerBound;
        escapeBlockUpperBound = _escapeBlockUpperBound;
        rollupProviders[msg.sender] = true;
    }

    function setRollupProvider(address provderAddress, bool valid) public override onlyOwner {
        rollupProviders[provderAddress] = valid;
        emit RollupProviderUpdated(provderAddress, valid);
    }

    function setFeeDistributor(address payable feeDistributorAddress) public override onlyOwner {
        feeDistributor = feeDistributorAddress;
    }

    /**
     * @dev Get the ERC20 token address of a supported asset, for a given assetId
     * @param assetId - identifier used to denote a particular asset
     */
    function getSupportedAssetAddress(uint256 assetId) public view override returns (address) {
        return supportedAssets[assetId];
    }

    /**
     * @dev Get the addresses of all supported ERC20 tokens
     */
    function getSupportedAssets() external view override returns (address[] memory) {
        return supportedAssets;
    }

    /**
     * @dev Get the number of supported ERC20 tokens
     */
    function getNumSupportedAssets() external view override returns (uint256) {
        return supportedAssets.length;
    }

    /**
     * @dev Get the status of whether an asset supports the permit ERC-2612 approval flow
     * @param assetId - unique identifier of the supported asset
     */
    function getAssetPermitSupport(uint256 assetId) external view override returns (bool) {
        address assetAddress = supportedAssets[assetId];
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

        userPendingDeposits[assetId][transferFromAddress] = userPendingDeposits[assetId][transferFromAddress].sub(
            amount
        );
    }

    /**
     * @dev Set the mapping between an assetId and the address of the linked asset.
     * Protected by onlyOwner
     * @param linkedToken - address of the asset
     * @param supportsPermit - bool determining whether this supports permit
     */
    function setSupportedAsset(address linkedToken, bool supportsPermit) public override onlyOwner {
        require(linkedToken != address(0x0), 'Rollup Processor: ZERO_ADDRESS');
        supportedAssets.push(linkedToken);
        assetPermitSupport[linkedToken] = supportsPermit;

        uint256 assetId = supportedAssets.length.sub(1);
        emit AssetAdded(assetId, linkedToken);
    }

    function txFeeBalance() external view override returns (uint256) {
        return feeDistributor.balance;
    }

    function depositTxFee(uint256 amount) external payable override {
        (bool success, ) = feeDistributor.call{value: msg.value}(abi.encodeWithSignature('deposit(uint256)', amount));
        require(success, 'Rollup Processor: DEPOSIT_TX_FEE_FAILED');
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
    ) external payable override {
        if (assetId == ethAssetId) {
            require(amount == msg.value, 'Rollup Processor: INSUFFICIENT_ETH_TRANSFER');
            increasePendingDepositBalance(assetId, depositorAddress, amount);
        } else {
            address assetAddress = getSupportedAssetAddress(assetId);
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
    ) external override {
        address assetAddress = getSupportedAssetAddress(assetId);
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
        increasePendingDepositBalance(assetId, depositorAddress, amount);

        // check user approved contract to transfer funds, so can throw helpful error to user
        uint256 rollupAllowance = IERC20(assetAddress).allowance(depositorAddress, address(this));
        require(rollupAllowance >= amount, 'Rollup Processor: INSUFFICIENT_TOKEN_APPROVAL');

        IERC20(assetAddress).transferFrom(depositorAddress, address(this), amount);
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
     * @param sigIndexes - array specifying which innerProof each signature corresponds to. This is needed
     * as proofs without a token transfer do not require a token transfer authorisation signature.
     *
     * For example:
     * If sigIndexes = [0, 2, 3] this would mean that:
     * signature[0] corresponds to innerProof[0]
     * signature[1] corresponds to innerProof[2]
     * signature[2] corresponds to innerProof[3]
     * @param viewingKeys - viewingKeys for the notes submitted in the rollup. Note: not used in the logic
     * of the rollupProcessor contract, but called here as a convenient to place data on chain
     */
    function escapeHatch(
        bytes calldata proofData,
        bytes calldata signatures,
        uint256[] calldata sigIndexes,
        bytes calldata viewingKeys
    ) external override {
        (bool isOpen, ) = getEscapeHatchStatus();
        require(isOpen, 'Rollup Processor: ESCAPE_BLOCK_RANGE_INCORRECT');

        processRollupProof(proofData, signatures, sigIndexes, viewingKeys);
    }

    function processRollup(
        bytes calldata proofData,
        bytes calldata signatures,
        uint256[] calldata sigIndexes,
        bytes calldata viewingKeys,
        bytes calldata providerSignature,
        address provider,
        address payable feeReceiver,
        uint256 feeLimit
    ) external override {
        uint256 initialGas = gasleft();

        require(rollupProviders[provider], 'Rollup Processor: UNKNOWN_PROVIDER');
        bytes memory sigData =
            abi.encodePacked(proofData[0:rollupPubInputLength], feeReceiver, feeLimit, feeDistributor);
        RollupProcessorLibrary.validateSignature(sigData, providerSignature, provider);

        processRollupProof(proofData, signatures, sigIndexes, viewingKeys);

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
        uint256[] calldata sigIndexes,
        bytes calldata viewingKeys
    ) internal {
        uint256 numTxs = updateAndVerifyProof(proofData);
        processTransactions(proofData[rollupPubInputLength:], numTxs, signatures, sigIndexes);
    }

    /**
     * @dev Validate that the supplied Merkle roots are correct, verify the zk proof and update the contract state
     * variables with those provided by the rollup
     *
     * @param proofData - cryptographic zk proof data. Passed to the verifier for verification
     */
    function updateAndVerifyProof(bytes memory proofData) internal returns (uint256) {
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

        // update state variables
        dataRoot = newDataRoot;
        nullRoot = newNullRoot;
        nextRollupId = rollupId.add(1);
        rootRoot = newRootRoot;
        dataSize = newDataSize;

        emit RollupProcessed(rollupId, newDataRoot, newNullRoot);
        return numTxs;
    }

    /**
     * @dev Decode a proof to extract the Merkle roots and validate they are as expected
     * Return needed variables
     * @param proofData - cryptographic proof data associated with a rollup
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
        ) = decodeProof(proofData);

        // Escape hatch denominated by a rollup size of 0, which means inserting 2 new entries.
        uint256 toInsert = nums[1] == 0 ? 2 : nums[1].mul(2);
        if (dataSize % toInsert == 0) {
            require(nums[2] == dataSize, 'Rollup Processor: INCORRECT_DATA_START_INDEX');
        } else {
            uint256 expected = dataSize + toInsert - (dataSize % toInsert);
            require(nums[2] == expected, 'Rollup Processor: INCORRECT_DATA_START_INDEX');
        }

        // data validation checks
        require(oldDataRoot == dataRoot, 'Rollup Processor: INCORRECT_DATA_ROOT');
        require(oldNullRoot == nullRoot, 'Rollup Processor: INCORRECT_NULL_ROOT');
        require(oldRootRoot == rootRoot, 'Rollup Processor: INCORRECT_ROOT_ROOT');
        require(nums[0] == nextRollupId, 'Rollup Processor: ID_NOT_SEQUENTIAL');
        require(nums[3] > 0, 'Rollup Processor: NUM_TX_IS_ZERO');

        return (newDataRoot, newNullRoot, nums[0], nums[1], newRootRoot, nums[3], nums[2] + toInsert);
    }

    /**
     * @dev Process all inner proof data - extract the data, verify the proof and perform
     * any transfer of tokens
     * @param innerProofData - all proofData associated with the rolled up transactions
     * @param numTxs - number of transactions rolled up in the proof
     * @param signatures - bytes array of secp256k1 ECDSA signatures, authorising a transfer of tokens
     * @param sigIndexes - array specifying which innerProof each signature corresponds to. This is needed
     * as proofs without a token transfer do not require a token transfer authorisation signature
     *
     * For example:
     * If sigIndexes = [0, 2, 3] this would mean that:
     * signature[0] corresponds to innerProof[0]
     * signature[1] corresponds to innerProof[2]
     * signature[2] corresponds to innerProof[3]
     *
     * 1st signature = 2nd inner proof
     */
    function processTransactions(
        bytes calldata innerProofData,
        uint256 numTxs,
        bytes calldata signatures,
        uint256[] calldata sigIndexes
    ) internal {
        for (uint256 i = 0; i < numTxs; i += 1) {
            bytes calldata proof =
                innerProofData[i.mul(txPubInputLength):i.mul(txPubInputLength).add(txPubInputLength)];
            (
                uint256 proofId,
                uint256 publicInput,
                uint256 publicOutput,
                uint256 assetId,
                address inputOwner,
                address outputOwner
            ) = extractTxComponents(proof);

            if (proofId == 0) {
                if (publicInput > 0) {
                    bytes memory signature = extractSignature(signatures, findSigIndex(sigIndexes, i));
                    RollupProcessorLibrary.validateSignature(proof, signature, inputOwner);
                    decreasePendingDepositBalance(assetId, inputOwner, publicInput);
                }

                if (publicOutput > 0) {
                    assetId == ethAssetId
                        ? withdrawETH(publicOutput, outputOwner, assetId)
                        : withdrawERC20(publicOutput, outputOwner, assetId);
                }
            }
        }
    }

    function transferFee(bytes calldata proofData) internal {
        uint256 totalTxFee = extractTotalTxFee(proofData);
        if (totalTxFee > 0) {
            (bool success, ) = feeDistributor.call{value: totalTxFee}('');
            require(success, 'Rollup Processor: DEPOSIT_TX_FEE_FAILED');
        }
    }

    /**
     * @dev Internal utility function to withdraw funds from the contract to a receiver address
     * @param withdrawValue - value being withdrawn from the contract
     * @param receiverAddress - address receiving public ERC20 tokens
     * @param assetId - ID of the asset for which a withdrawl is being performed
     */
    function withdrawETH(
        uint256 withdrawValue,
        address receiverAddress,
        uint256 assetId
    ) internal {
        require(receiverAddress != address(0), 'Rollup Processor: ZERO_ADDRESS');

        bool success = payable(receiverAddress).send(withdrawValue);
        require(success, 'Rollup Processor: WITHDRAW_ETH_FAILED');

        emit Withdraw(assetId, receiverAddress, withdrawValue);
    }

    /**
     * @dev Internal utility function to withdraw ERC20 funds from the contract to a receiver address
     * @param withdrawValue - value being withdrawn from the contract
     * @param receiverAddress - address receiving public ERC20 tokens
     * @param assetId - ID of the asset for which a withdrawl is being performed
     */
    function withdrawERC20(
        uint256 withdrawValue,
        address receiverAddress,
        uint256 assetId
    ) internal {
        require(receiverAddress != address(0), 'Rollup Processor: ZERO_ADDRESS');

        address assetAddress = getSupportedAssetAddress(assetId);

        try IERC20(assetAddress).transfer(receiverAddress, withdrawValue) {
            emit Withdraw(assetId, receiverAddress, withdrawValue);
        } catch (bytes memory reason) {
            emit WithdrawError(reason);
        }
    }
}
