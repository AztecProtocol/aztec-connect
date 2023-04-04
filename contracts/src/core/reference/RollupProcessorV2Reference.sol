// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec.
pragma solidity >=0.8.4;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import {IVerifier} from "../interfaces/IVerifier.sol";
import {IRollupProcessorV2, IRollupProcessor} from "rollup-encoder/interfaces/IRollupProcessorV2.sol";
import {IDefiBridge} from "../interfaces/IDefiBridge.sol";

import {Decoder} from "../Decoder.sol";
import {AztecTypes} from "rollup-encoder/libraries/AztecTypes.sol";

import {TokenTransfers} from "../libraries/TokenTransfers.sol";
import {RollupProcessorLibrary} from "rollup-encoder/libraries/RollupProcessorLibrary.sol";
import {SafeCast} from "../libraries/SafeCast.sol";

/**
 * @title Rollup Processor
 * @dev Smart contract responsible for processing Aztec zkRollups, relaying them to a verifier
 *      contract for validation and performing all the relevant ERC20 token transfers
 */
contract RollupProcessorV2Reference is IRollupProcessorV2, Decoder, Initializable, AccessControl {
    using SafeCast for uint256;
    /*----------------------------------------
      ERROR TAGS
      ----------------------------------------*/

    error PAUSED();
    error NOT_PAUSED();
    error LOCKED_NO_REENTER();
    error INVALID_PROVIDER();
    error THIRD_PARTY_CONTRACTS_FLAG_NOT_SET();
    error INSUFFICIENT_DEPOSIT();
    error INVALID_ADDRESS_NO_CODE();
    error INVALID_ASSET_GAS();
    error INVALID_ASSET_ID();
    error INVALID_ASSET_ADDRESS();
    error INVALID_BRIDGE_GAS();
    error INVALID_BRIDGE_CALL_DATA();
    error INVALID_BRIDGE_ADDRESS();
    error INVALID_ESCAPE_BOUNDS();
    error INCONSISTENT_BRIDGE_CALL_DATA();
    error BRIDGE_WITH_IDENTICAL_INPUT_ASSETS(uint256 inputAssetId);
    error BRIDGE_WITH_IDENTICAL_OUTPUT_ASSETS(uint256 outputAssetId);
    error ZERO_TOTAL_INPUT_VALUE();
    error ARRAY_OVERFLOW();
    error MSG_VALUE_WRONG_AMOUNT();
    error INSUFFICIENT_ETH_PAYMENT();
    error WITHDRAW_TO_ZERO_ADDRESS();
    error DEPOSIT_TOKENS_WRONG_PAYMENT_TYPE();
    error INSUFFICIENT_TOKEN_APPROVAL();
    error NONZERO_OUTPUT_VALUE_ON_NOT_USED_ASSET(uint256 outputValue);
    error INCORRECT_STATE_HASH(bytes32 oldStateHash, bytes32 newStateHash);
    error INCORRECT_DATA_START_INDEX(uint256 providedIndex, uint256 expectedIndex);
    error INCORRECT_PREVIOUS_DEFI_INTERACTION_HASH(
        bytes32 providedDefiInteractionHash, bytes32 expectedDefiInteractionHash
    );
    error PUBLIC_INPUTS_HASH_VERIFICATION_FAILED(uint256, uint256);
    error PROOF_VERIFICATION_FAILED();
    error PENDING_CAP_SURPASSED();
    error DAILY_CAP_SURPASSED();

    /*----------------------------------------
      EVENTS
      ----------------------------------------*/
    event OffchainData(uint256 indexed rollupId, uint256 chunk, uint256 totalChunks, address sender);
    event RollupProcessed(uint256 indexed rollupId, bytes32[] nextExpectedDefiHashes, address sender);
    event DefiBridgeProcessed(
        uint256 indexed encodedBridgeCallData,
        uint256 indexed nonce,
        uint256 totalInputValue,
        uint256 totalOutputValueA,
        uint256 totalOutputValueB,
        bool result,
        bytes errorReason
    );
    event AsyncDefiBridgeProcessed(
        uint256 indexed encodedBridgeCallData, uint256 indexed nonce, uint256 totalInputValue
    );
    event Deposit(uint256 indexed assetId, address indexed depositorAddress, uint256 depositValue);
    event AssetAdded(uint256 indexed assetId, address indexed assetAddress, uint256 assetGasLimit);
    event BridgeAdded(uint256 indexed bridgeAddressId, address indexed bridgeAddress, uint256 bridgeGasLimit);
    event RollupProviderUpdated(address indexed providerAddress, bool valid);
    event VerifierUpdated(address indexed verifierAddress);
    event AllowThirdPartyContractsUpdated(bool allowed);
    event DefiBridgeProxyUpdated(address defiBridgeProxy);
    event Paused(address account);
    event Unpaused(address account);
    event DelayBeforeEscapeHatchUpdated(uint32 delay);
    event AssetCapUpdated(uint256 assetId, uint256 pendingCap, uint256 dailyCap);
    event CappedUpdated(bool isCapped);

    /*----------------------------------------
      STRUCTS
      ----------------------------------------*/

    // @dev ALLOW_ASYNC_REENTER lock is present to allow calling of `processAsyncDefiInteraction(...)` from within
    //      bridge's `convert(...)` method.
    enum Lock {
        UNLOCKED,
        ALLOW_ASYNC_REENTER,
        LOCKED
    }

    /**
     * @dev RollupState struct contains the following data:
     *
     * | bit offset   | num bits    | description |
     * | ---          | ---         | ---         |
     * | 0            | 160         | PLONK verifier contract address |
     * | 160          | 32          | datasize: number of filled entries in note tree |
     * | 192          | 16          | asyncDefiInteractionHashes.length : number of entries in asyncDefiInteractionHashes array |
     * | 208          | 16          | defiInteractionHashes.length : number of entries in defiInteractionHashes array |
     * | 224          | 8           | Lock enum used to guard against reentrancy attacks (minimum value to store in is uint8)
     * | 232          | 8           | pause flag, true if contract is paused, false otherwise
     * | 240          | 8           | capped flag, true if assets should check cap, false otherwise
     *
     * Note: (RollupState struct gets packed to 1 storage slot -> bit offset signifies location withing the 256 bit string)
     */
    struct RollupState {
        IVerifier verifier;
        uint32 datasize;
        uint16 numAsyncDefiInteractionHashes;
        uint16 numDefiInteractionHashes;
        Lock lock;
        bool paused;
        bool capped;
    }

    /**
     * @dev Contains information that describes a specific call to a bridge
     */
    struct FullBridgeCallData {
        uint256 bridgeAddressId;
        address bridgeAddress;
        uint256 inputAssetIdA;
        uint256 inputAssetIdB;
        uint256 outputAssetIdA;
        uint256 outputAssetIdB;
        uint256 auxData;
        bool firstInputVirtual;
        bool secondInputVirtual;
        bool firstOutputVirtual;
        bool secondOutputVirtual;
        bool secondInputInUse;
        bool secondOutputInUse;
        uint256 bridgeGasLimit;
    }

    /**
     * @dev Represents an asynchronous DeFi bridge interaction that has not been resolved
     * @param encodedBridgeCallData bit-string encoded bridge call data
     * @param totalInputValue number of tokens/wei sent to the bridge
     */
    struct PendingDefiBridgeInteraction {
        uint256 encodedBridgeCallData;
        uint256 totalInputValue;
    }

    /**
     * @dev Container for the results of a DeFi interaction
     * @param outputValueA amount of output asset A returned from the interaction
     * @param outputValueB amount of output asset B returned from the interaction (0 if asset B unused)
     * @param isAsync true if the interaction is asynchronous, false otherwise
     * @param success true if the call succeeded, false otherwise
     */
    struct BridgeResult {
        uint256 outputValueA;
        uint256 outputValueB;
        bool isAsync;
        bool success;
        bytes errorReason;
    }

    /**
     * @dev Container for the inputs of a DeFi interaction
     * @param totalInputValue number of tokens/wei sent to the bridge
     * @param interactionNonce the unique id of the interaction
     * @param auxData additional input specific to the type of interaction
     */
    struct InteractionInputs {
        uint256 totalInputValue;
        uint256 interactionNonce;
        uint64 auxData;
    }

    /**
     * @dev Container for asset cap restrictions
     * @dev Caps used to limit usefulness of using Aztec to "wash" larger hacks
     * @param available The amount of tokens that can be deposited, bounded by `dailyCap * 10 ** decimals`.
     * @param lastUpdatedTimestamp The timestamp of the last deposit with caps activated
     * @param pendingCap The cap for each individual pending deposit measured in whole tokens
     * @param dailyCap The cap for total amount that can be added to `available` in 24 hours, measured in whole tokens
     * @param precision The number of decimals in the precision for specific asset.
     */
    struct AssetCap {
        uint128 available;
        uint32 lastUpdatedTimestamp;
        uint32 pendingCap;
        uint32 dailyCap;
        uint8 precision;
    }

    /**
     * @dev Container for variables used in `processBridgeCalls(...)` to work around stack too deep errors
     */
    struct ProcessBridgeCallVariables {
        uint256 defiInteractionHashesLength;
        uint256 encodedBridgeCallData;
        BridgeResult bridgeResult;
        AztecTypes.AztecAsset inputAssetA;
        AztecTypes.AztecAsset inputAssetB;
        AztecTypes.AztecAsset outputAssetA;
        AztecTypes.AztecAsset outputAssetB;
        uint256 totalInputValue;
        uint256 interactionNonce;
        uint256 paymentsSlot;
        address rollupBeneficiary;
    }

    /*----------------------------------------
      FUNCTION SELECTORS (PRECOMPUTED)
      ----------------------------------------*/
    // DEFI_BRIDGE_PROXY_CONVERT_SELECTOR = function signature of:
    //   function convert(
    //       address,
    //       AztecTypes.AztecAsset memory inputAssetA,
    //       AztecTypes.AztecAsset memory inputAssetB,
    //       AztecTypes.AztecAsset memory outputAssetA,
    //       AztecTypes.AztecAsset memory outputAssetB,
    //       uint256 totalInputValue,
    //       uint256 interactionNonce,
    //       uint256 auxData,
    //       uint256 ethPaymentsSlot
    //       address rollupBeneficary)
    // N.B. this is the selector of the 'convert' function of the DefiBridgeProxy contract.
    //      This has a different interface to the IDefiBridge.convert function
    bytes4 private constant DEFI_BRIDGE_PROXY_CONVERT_SELECTOR = 0x4bd947a8;

    bytes4 private constant INVALID_ADDRESS_NO_CODE_SELECTOR = 0x21409272; // bytes4(keccak256('INVALID_ADDRESS_NO_CODE()'));

    bytes4 private constant ARRAY_OVERFLOW_SELECTOR = 0x58a4ab0e; // bytes4(keccak256('ARRAY_OVERFLOW()'));

    /*----------------------------------------
      CONSTANT STATE VARIABLES
      ----------------------------------------*/
    uint256 private constant ETH_ASSET_ID = 0; // if assetId == ETH_ASSET_ID, treat as native ETH and not ERC20 token

    // starting root hash of the DeFi interaction result Merkle tree
    bytes32 private constant INIT_DEFI_ROOT = 0x2e4ab7889ab3139204945f9e722c7a8fdb84e66439d787bd066c3d896dba04ea;

    // We need to cap the amount of gas sent to the DeFi bridge contract for two reasons:
    // 1. To provide consistency to rollup providers around costs,
    // 2. to prevent griefing attacks where a bridge consumes all our gas.
    uint256 private constant MIN_BRIDGE_GAS_LIMIT = 35000;
    uint256 private constant MIN_ERC20_GAS_LIMIT = 55000;
    uint256 private constant MAX_BRIDGE_GAS_LIMIT = 5000000;
    uint256 private constant MAX_ERC20_GAS_LIMIT = 1500000;

    // Bit offsets and bit masks used to extract values from `uint256 encodedBridgeCallData` to FullBridgeCallData struct
    uint256 private constant INPUT_ASSET_ID_A_SHIFT = 32;
    uint256 private constant INPUT_ASSET_ID_B_SHIFT = 62;
    uint256 private constant OUTPUT_ASSET_ID_A_SHIFT = 92;
    uint256 private constant OUTPUT_ASSET_ID_B_SHIFT = 122;
    uint256 private constant BITCONFIG_SHIFT = 152;
    uint256 private constant AUX_DATA_SHIFT = 184;
    uint256 private constant VIRTUAL_ASSET_ID_FLAG_SHIFT = 29;
    uint256 private constant VIRTUAL_ASSET_ID_FLAG = 0x2000_0000; // 2 ** 29
    uint256 private constant MASK_THIRTY_TWO_BITS = 0xffff_ffff;
    uint256 private constant MASK_THIRTY_BITS = 0x3fff_ffff;
    uint256 private constant MASK_SIXTY_FOUR_BITS = 0xffff_ffff_ffff_ffff;

    // Offsets and masks used to encode/decode the rollupState storage variable of RollupProcessor
    uint256 private constant DATASIZE_BIT_OFFSET = 160;
    uint256 private constant ASYNCDEFIINTERACTIONHASHES_BIT_OFFSET = 192;
    uint256 private constant DEFIINTERACTIONHASHES_BIT_OFFSET = 208;
    uint256 private constant ARRAY_LENGTH_MASK = 0x3ff; // 1023
    uint256 private constant DATASIZE_MASK = 0xffff_ffff;

    // the value of hashing a 'zeroed' DeFi interaction result
    bytes32 private constant DEFI_RESULT_ZERO_HASH = 0x2d25a1e3a51eb293004c4b56abe12ed0da6bca2b4a21936752a85d102593c1b4;

    // roles used in access control
    bytes32 public constant OWNER_ROLE = keccak256("OWNER_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
    bytes32 public constant LISTER_ROLE = keccak256("LISTER_ROLE");
    bytes32 public constant RESUME_ROLE = keccak256("RESUME_ROLE");

    // bounds used for escape hatch
    uint256 public immutable escapeBlockLowerBound;
    uint256 public immutable escapeBlockUpperBound;

    /*----------------------------------------
      STATE VARIABLES
      ----------------------------------------*/
    RollupState internal rollupState;

    // An array of addresses of supported ERC20 tokens
    address[] internal supportedAssets;

    // An array of addresses of supported bridges
    // @dev `bridgeAddressId` is an index of the bridge's address in this array incremented by 1
    address[] internal supportedBridges;

    // A mapping from index to async interaction hash (emulates an array)
    // @dev next index is stored in `RollupState.numAsyncDefiInteractionHashes`
    mapping(uint256 => bytes32) public asyncDefiInteractionHashes;

    // A mapping from index to interaction hash (emulates an array)
    // @dev next index is stored in the `RollupState.numDefiInteractionHashes`
    mapping(uint256 => bytes32) public defiInteractionHashes;

    // A mapping from assetId to a mapping of userAddress to the user's public pending balance
    mapping(uint256 => mapping(address => uint256)) public userPendingDeposits;

    // A mapping from user's address to a mapping of proof hashes to a boolean which indicates approval
    mapping(address => mapping(bytes32 => bool)) public depositProofApprovals;

    // A hash of the latest rollup state
    bytes32 public override(IRollupProcessor) rollupStateHash;

    // An address of DefiBridgeProxy contract
    address public override(IRollupProcessor) defiBridgeProxy;

    // A flag indicating whether addresses without a LISTER role can list assets and bridges
    // Note: will be set to true once Aztec Connect is no longer in BETA
    bool public allowThirdPartyContracts;

    // A mapping from an address to a boolean which indicates whether address is an approved rollup provider
    // @dev A rollup provider is an address which is allowed to call `processRollup(...)` out of escape hatch window.
    mapping(address => bool) public rollupProviders;

    // A mapping from interactionNonce to PendingDefiBridgeInteraction struct
    mapping(uint256 => PendingDefiBridgeInteraction) public pendingDefiInteractions;

    // A mapping from interactionNonce to ETH amount which was received for that interaction.
    // interaction
    mapping(uint256 => uint256) public ethPayments;

    // A mapping from an `assetId` to a gas limit
    mapping(uint256 => uint256) public assetGasLimits;

    // A mapping from a `bridgeAddressId` to a gas limit
    mapping(uint256 => uint256) public bridgeGasLimits;

    // A hash of hashes of pending DeFi interactions, the notes of which are expected to be added in the 'next' rollup
    bytes32 public override(IRollupProcessor) prevDefiInteractionsHash;

    // The timestamp of the last rollup that was performed by a rollup provider
    uint32 public lastRollupTimeStamp;
    // The delay in seconds from `lastRollupTimeStamp` until the escape hatch can be used.
    uint32 public delayBeforeEscapeHatch;

    mapping(uint256 => AssetCap) public caps;

    /*----------------------------------------
      MODIFIERS
      ----------------------------------------*/
    /**
     * @notice A modifier forbidding functions from being called by addresses without LISTER role when Aztec Connect
     *         is still in BETA (`allowThirdPartyContracts` variable set to false)
     */
    modifier checkThirdPartyContractStatus() {
        if (!hasRole(LISTER_ROLE, msg.sender) && !allowThirdPartyContracts) {
            revert THIRD_PARTY_CONTRACTS_FLAG_NOT_SET();
        }
        _;
    }

    /**
     * @notice A modifier reverting if this contract is paused
     */
    modifier whenNotPaused() {
        if (rollupState.paused) {
            revert PAUSED();
        }
        _;
    }

    /**
     * @notice A modifier reverting if this contract is NOT paused
     */
    modifier whenPaused() {
        if (!rollupState.paused) {
            revert NOT_PAUSED();
        }
        _;
    }

    /**
     * @notice A modifier reverting on any re-enter
     */
    modifier noReenter() {
        if (rollupState.lock != Lock.UNLOCKED) {
            revert LOCKED_NO_REENTER();
        }
        rollupState.lock = Lock.LOCKED;
        _;
        rollupState.lock = Lock.UNLOCKED;
    }

    /**
     * @notice A modifier reverting on any re-enter but allowing async to be called
     */
    modifier allowAsyncReenter() {
        if (rollupState.lock != Lock.UNLOCKED) {
            revert LOCKED_NO_REENTER();
        }
        rollupState.lock = Lock.ALLOW_ASYNC_REENTER;
        _;
        rollupState.lock = Lock.UNLOCKED;
    }

    /**
     * @notice A modifier reverting if re-entering after locking, but passes if unlocked or if async is re-enter is
     *         allowed
     */
    modifier noReenterButAsync() {
        Lock lock = rollupState.lock;
        if (lock == Lock.ALLOW_ASYNC_REENTER) {
            _;
        } else if (lock == Lock.UNLOCKED) {
            rollupState.lock = Lock.ALLOW_ASYNC_REENTER;
            _;
            rollupState.lock = Lock.UNLOCKED;
        } else {
            revert LOCKED_NO_REENTER();
        }
    }

    /**
     * @notice A modifier which reverts if a given `_assetId` represents a virtual asset
     * @param _assetId 30-bit integer that describes the asset
     * @dev If _assetId's 29th bit is set, it represents a virtual asset with no ERC20 equivalent
     *      Virtual assets are used by the bridges to track non-token data. E.g. to represent a loan.
     *      If an _assetId is *not* a virtual asset, its ERC20 address can be recovered from
     *      `supportedAssets[_assetId]`
     */
    modifier validateAssetIdIsNotVirtual(uint256 _assetId) {
        if (_assetId > 0x1fffffff) {
            revert INVALID_ASSET_ID();
        }
        _;
    }

    /*----------------------------------------
      CONSTRUCTORS & INITIALIZERS
      ----------------------------------------*/
    /**
     * @notice Constructor sets escape hatch window and ensure that the implementation cannot be initialized
     * @param _escapeBlockLowerBound a block number which defines a start of the escape hatch window
     * @param _escapeBlockUpperBound a block number which defines an end of the escape hatch window
     */
    constructor(uint256 _escapeBlockLowerBound, uint256 _escapeBlockUpperBound) {
        if (_escapeBlockLowerBound == 0 || _escapeBlockLowerBound >= _escapeBlockUpperBound) {
            revert INVALID_ESCAPE_BOUNDS();
        }

        // Set storage in implementation.
        // Disable initializers to ensure no-one can call initialize on implementation directly
        // Pause to limit possibility for user error
        _disableInitializers();
        rollupState.paused = true;

        // Set immutables (part of code) so will be used in proxy calls as well
        escapeBlockLowerBound = _escapeBlockLowerBound;
        escapeBlockUpperBound = _escapeBlockUpperBound;
    }

    /**
     * @notice Initialiser function which emulates constructor behaviour for upgradeable contracts
     */
    function initialize() external reinitializer(getImplementationVersion()) {
        rollupState.capped = true;
        lastRollupTimeStamp = uint32(block.timestamp);

        // Set Eth asset caps. 6 Eth to cover 5 eth deposits + fee up to 1 eth.
        caps[0] = AssetCap({
            available: uint128(1000e18),
            lastUpdatedTimestamp: uint32(block.timestamp),
            pendingCap: 6,
            dailyCap: 1000,
            precision: 18
        });

        // Set Dai asset cap. 10100 Dai to cover 10K deposits + fee up to 100 dai.
        caps[1] = AssetCap({
            available: uint128(1e24),
            lastUpdatedTimestamp: uint32(block.timestamp),
            pendingCap: 10100,
            dailyCap: 1e6,
            precision: 18
        });

        emit AssetCapUpdated(0, 6, 1000);
        emit AssetCapUpdated(1, 10100, 1e6);
    }

    /*----------------------------------------
      MUTATING FUNCTIONS WITH ACCESS CONTROL 
      ----------------------------------------*/
    /**
     * @notice A function which allow the holders of the EMERGENCY_ROLE role to pause the contract
     */
    function pause() public override(IRollupProcessor) whenNotPaused onlyRole(EMERGENCY_ROLE) noReenter {
        rollupState.paused = true;
        emit Paused(msg.sender);
    }

    /**
     * @dev Allow the holders of the RESUME_ROLE to unpause the contract.
     */
    function unpause() public override(IRollupProcessor) whenPaused onlyRole(RESUME_ROLE) noReenter {
        rollupState.paused = false;
        emit Unpaused(msg.sender);
    }

    /**
     * @notice A function which allows holders of OWNER_ROLE to set the capped flag
     * @dev When going from uncapped to capped, will update `lastRollupTimeStamp`
     * @param _isCapped a flag indicating whether caps are used or not
     */
    function setCapped(bool _isCapped) external onlyRole(OWNER_ROLE) noReenter {
        if (_isCapped == rollupState.capped) return;

        if (_isCapped) {
            lastRollupTimeStamp = uint32(block.timestamp);
        }

        rollupState.capped = _isCapped;
        emit CappedUpdated(_isCapped);
    }

    /**
     * @notice A function which allows holders of OWNER_ROLE to add and remove a rollup provider.
     * @param _provider an address of the rollup provider
     * @param _valid a flag indicating whether `_provider` is valid
     */
    function setRollupProvider(address _provider, bool _valid)
        external
        override(IRollupProcessor)
        onlyRole(OWNER_ROLE)
        noReenter
    {
        rollupProviders[_provider] = _valid;
        emit RollupProviderUpdated(_provider, _valid);
    }

    /**
     * @notice A function which allows holders of the LISTER_ROLE to update asset caps
     * @param _assetId The asset id to update the cap for
     * @param _pendingCap The pending cap in whole tokens
     * @param _dailyCap The daily "accrual" to available deposits in whole tokens
     * @param _precision The precision (decimals) to multiply the caps with
     */
    function setAssetCap(uint256 _assetId, uint32 _pendingCap, uint32 _dailyCap, uint8 _precision)
        external
        onlyRole(LISTER_ROLE)
        noReenter
    {
        caps[_assetId] = AssetCap({
            available: (uint256(_dailyCap) * 10 ** _precision).toU128(),
            lastUpdatedTimestamp: uint32(block.timestamp),
            pendingCap: _pendingCap,
            dailyCap: _dailyCap,
            precision: _precision
        });

        emit AssetCapUpdated(_assetId, _pendingCap, _dailyCap);
    }

    /**
     * @notice A function which allows holders of the OWNER_ROLE to specify the delay before escapehatch is possible
     * @param _delay the delay in seconds between last rollup by a provider, and escape hatch being possible
     */
    function setDelayBeforeEscapeHatch(uint32 _delay) external onlyRole(OWNER_ROLE) noReenter {
        delayBeforeEscapeHatch = _delay;
        emit DelayBeforeEscapeHatchUpdated(_delay);
    }

    /**
     * @notice A function which allows holders of OWNER_ROLE to set the address of the PLONK verification smart
     *  (         contract
     * @param _verifier an address of the verification smart contract
     */
    function setVerifier(address _verifier) public override(IRollupProcessor) onlyRole(OWNER_ROLE) noReenter {
        if (_verifier.code.length == 0) {
            revert INVALID_ADDRESS_NO_CODE();
        }

        rollupState.verifier = IVerifier(_verifier);
        emit VerifierUpdated(_verifier);
    }

    /**
     * @notice A function which allows holders of OWNER_ROLE to set `allowThirdPartyContracts` flag
     * @param _allowThirdPartyContracts A flag indicating true if allowing third parties to register, false otherwise
     */
    function setAllowThirdPartyContracts(bool _allowThirdPartyContracts)
        external
        override(IRollupProcessor)
        onlyRole(OWNER_ROLE)
        noReenter
    {
        allowThirdPartyContracts = _allowThirdPartyContracts;
        emit AllowThirdPartyContractsUpdated(_allowThirdPartyContracts);
    }

    /**
     * @notice A function which allows holders of OWNER_ROLE to set address of `DefiBridgeProxy` contract
     * @param _defiBridgeProxy an address of `DefiBridgeProxy` contract
     */
    function setDefiBridgeProxy(address _defiBridgeProxy)
        public
        override(IRollupProcessor)
        onlyRole(OWNER_ROLE)
        noReenter
    {
        if (_defiBridgeProxy.code.length == 0) {
            revert INVALID_ADDRESS_NO_CODE();
        }
        defiBridgeProxy = _defiBridgeProxy;
        emit DefiBridgeProxyUpdated(_defiBridgeProxy);
    }

    /**
     * @notice Registers an ERC20 token as a supported asset
     * @param _token address of the ERC20 token
     * @param _gasLimit gas limit used when transferring the token (in withdraw or transferFee)
     */
    function setSupportedAsset(address _token, uint256 _gasLimit)
        external
        override(IRollupProcessor)
        whenNotPaused
        checkThirdPartyContractStatus
        noReenter
    {
        if (_token.code.length == 0) {
            revert INVALID_ADDRESS_NO_CODE();
        }
        if (_gasLimit < MIN_ERC20_GAS_LIMIT || _gasLimit > MAX_ERC20_GAS_LIMIT) {
            revert INVALID_ASSET_GAS();
        }

        supportedAssets.push(_token);
        uint256 assetId = supportedAssets.length;
        assetGasLimits[assetId] = _gasLimit;
        emit AssetAdded(assetId, _token, assetGasLimits[assetId]);
    }

    /**
     * @dev Appends a bridge contract to the supportedBridges
     * @param _bridge address of the bridge contract
     * @param _gasLimit gas limit forwarded to the DefiBridgeProxy to perform convert
     */
    function setSupportedBridge(address _bridge, uint256 _gasLimit)
        external
        override(IRollupProcessor)
        whenNotPaused
        checkThirdPartyContractStatus
        noReenter
    {
        if (_bridge.code.length == 0) {
            revert INVALID_ADDRESS_NO_CODE();
        }
        if (_gasLimit < MIN_BRIDGE_GAS_LIMIT || _gasLimit > MAX_BRIDGE_GAS_LIMIT) {
            revert INVALID_BRIDGE_GAS();
        }

        supportedBridges.push(_bridge);
        uint256 bridgeAddressId = supportedBridges.length;
        bridgeGasLimits[bridgeAddressId] = _gasLimit;
        emit BridgeAdded(bridgeAddressId, _bridge, bridgeGasLimits[bridgeAddressId]);
    }

    /**
     * @notice A function which processes a rollup
     * @dev Rollup processing consists of decoding a rollup, verifying the corresponding proof and updating relevant
     *      state variables
     * @dev The `encodedProofData` is unnamed param as we are reading it directly from calldata when decoding
     *      and creating the `proofData` in `Decoder::decodeProof()`.
     * @dev For the rollup to be processed `msg.sender` has to be an authorised rollup provider or escape hatch has
     *      to be open
     * @dev This function always transfers fees to the `rollupBeneficiary` encoded in the proof data
     *
     * @param - cryptographic proof data associated with a rollup
     * @param _signatures a byte array of secp256k1 ECDSA signatures, authorising a transfer of tokens from
     *                    the publicOwner for the particular inner proof in question
     *
     * Structure of each signature in the bytes array is:
     * 0x00 - 0x20 : r
     * 0x20 - 0x40 : s
     * 0x40 - 0x60 : v (in form: 0x0000....0001b for example)
     */
    function processRollup(
        bytes calldata,
        /* encodedProofData */
        bytes calldata _signatures
    ) external override(IRollupProcessor) whenNotPaused allowAsyncReenter {
        if (rollupProviders[msg.sender]) {
            if (rollupState.capped) {
                lastRollupTimeStamp = uint32(block.timestamp);
            }
        } else {
            (bool isOpen,) = getEscapeHatchStatus();
            if (!isOpen) {
                revert INVALID_PROVIDER();
            }
        }

        (bytes memory proofData, uint256 numTxs, uint256 publicInputsHash) = decodeProof();
        address rollupBeneficiary = extractRollupBeneficiary(proofData);

        processRollupProof(proofData, _signatures, numTxs, publicInputsHash, rollupBeneficiary);

        transferFee(proofData, rollupBeneficiary);
    }

    /*----------------------------------------
      PUBLIC/EXTERNAL MUTATING FUNCTIONS 
      ----------------------------------------*/

    /**
     * @notice A function used by bridges to send ETH to the RollupProcessor during an interaction
     * @param _interactionNonce an interaction nonce that used as an ID of this payment
     */
    function receiveEthFromBridge(uint256 _interactionNonce) external payable override(IRollupProcessor) {
        ethPayments[_interactionNonce] += msg.value;
    }

    /**
     * @notice A function which approves a proofHash to spend the user's pending deposited funds
     * @dev this function is one way and must be called by the owner of the funds
     * @param _proofHash keccak256 hash of the inner proof public inputs
     */
    function approveProof(bytes32 _proofHash) public override(IRollupProcessor) whenNotPaused {
        depositProofApprovals[msg.sender][_proofHash] = true;
    }

    /**
     * @notice A function which deposits funds to the contract
     * @dev This is the first stage of a 2 stage deposit process. In the second stage funds are claimed by the user on
     *      L2.
     * @param _assetId asset ID which was assigned during asset registration
     * @param _amount token deposit amount
     * @param _owner address that can spend the deposited funds
     * @param _proofHash 32 byte transaction id that can spend the deposited funds
     */
    function depositPendingFunds(uint256 _assetId, uint256 _amount, address _owner, bytes32 _proofHash)
        external
        payable
        override(IRollupProcessor)
        whenNotPaused
        noReenter
    {
        // Perform sanity checks on user input
        if (_assetId == ETH_ASSET_ID && msg.value != _amount) {
            revert MSG_VALUE_WRONG_AMOUNT();
        }
        if (_assetId != ETH_ASSET_ID && msg.value != 0) {
            revert DEPOSIT_TOKENS_WRONG_PAYMENT_TYPE();
        }

        increasePendingDepositBalance(_assetId, _owner, _amount);

        if (_proofHash != 0) approveProof(_proofHash);

        emit Deposit(_assetId, _owner, _amount);

        if (_assetId != ETH_ASSET_ID) {
            address assetAddress = getSupportedAsset(_assetId);
            // check user approved contract to transfer funds, so can throw helpful error to user
            if (IERC20(assetAddress).allowance(msg.sender, address(this)) < _amount) {
                revert INSUFFICIENT_TOKEN_APPROVAL();
            }
            TokenTransfers.safeTransferFrom(assetAddress, msg.sender, address(this), _amount);
        }
    }

    /**
     * @notice A function used to publish data that doesn't need to be accessible on-chain
     * @dev This function can be called multiple times to work around maximum tx size limits
     * @dev The data is expected to be reconstructed by the client
     * @param _rollupId rollup id this data is related to
     * @param _chunk the chunk number, from 0 to totalChunks-1.
     * @param _totalChunks the total number of chunks.
     * @param - the data
     */
    function offchainData(uint256 _rollupId, uint256 _chunk, uint256 _totalChunks, bytes calldata /* offchainTxData */ )
        external
        override(IRollupProcessor)
        whenNotPaused
    {
        emit OffchainData(_rollupId, _chunk, _totalChunks, msg.sender);
    }

    /**
     * @notice A function which process async bridge interaction
     * @param _interactionNonce unique id of the interaction
     * @return true if successful, false otherwise
     */
    function processAsyncDefiInteraction(uint256 _interactionNonce)
        external
        override(IRollupProcessor)
        whenNotPaused
        noReenterButAsync
        returns (bool)
    {
        PendingDefiBridgeInteraction memory interaction = pendingDefiInteractions[_interactionNonce];

        if (interaction.encodedBridgeCallData == 0) {
            revert INVALID_BRIDGE_CALL_DATA();
        }
        FullBridgeCallData memory fullBridgeCallData = getFullBridgeCallData(interaction.encodedBridgeCallData);

        (
            AztecTypes.AztecAsset memory inputAssetA,
            AztecTypes.AztecAsset memory inputAssetB,
            AztecTypes.AztecAsset memory outputAssetA,
            AztecTypes.AztecAsset memory outputAssetB
        ) = getAztecAssetTypes(fullBridgeCallData, _interactionNonce);

        // Extract the bridge address from the encodedBridgeCallData
        IDefiBridge bridgeContract = IDefiBridge(getSupportedBridge(interaction.encodedBridgeCallData & 0xffffffff));
        if (address(bridgeContract) == address(0)) {
            revert INVALID_BRIDGE_ADDRESS();
        }

        // delete pendingDefiInteractions[interactionNonce]
        // N.B. only need to delete 1st slot value `encodedBridgeCallData`. Deleting vars costs gas post-London
        // setting encodedBridgeCallData to 0 is enough to cause future calls with this interaction nonce to fail
        pendingDefiInteractions[_interactionNonce].encodedBridgeCallData = 0;

        // Copy some variables to front of stack to get around stack too deep errors
        InteractionInputs memory inputs =
            InteractionInputs(interaction.totalInputValue, _interactionNonce, uint64(fullBridgeCallData.auxData));
        (uint256 outputValueA, uint256 outputValueB, bool interactionCompleted) = bridgeContract.finalise(
            inputAssetA, inputAssetB, outputAssetA, outputAssetB, inputs.interactionNonce, inputs.auxData
        );

        if (!interactionCompleted) {
            pendingDefiInteractions[inputs.interactionNonce].encodedBridgeCallData = interaction.encodedBridgeCallData;
            return false;
        }

        if (outputValueB > 0 && outputAssetB.assetType == AztecTypes.AztecAssetType.NOT_USED) {
            revert NONZERO_OUTPUT_VALUE_ON_NOT_USED_ASSET(outputValueB);
        }

        bool result = !(outputValueA == 0 && outputValueB == 0);
        if (!result) {
            // issue refund.
            transferTokensAsync(address(bridgeContract), inputAssetA, inputs.totalInputValue, inputs.interactionNonce);
            transferTokensAsync(address(bridgeContract), inputAssetB, inputs.totalInputValue, inputs.interactionNonce);
        } else {
            // transfer output tokens to rollup contract
            transferTokensAsync(address(bridgeContract), outputAssetA, outputValueA, inputs.interactionNonce);
            transferTokensAsync(address(bridgeContract), outputAssetB, outputValueB, inputs.interactionNonce);
        }

        uint16 asyncArrayLen = rollupState.numAsyncDefiInteractionHashes;
        if (asyncArrayLen + rollupState.numDefiInteractionHashes + 1 > 512) {
            revert ARRAY_OVERFLOW();
        }

        {
            asyncDefiInteractionHashes[asyncArrayLen] = computeDefiInteractionHash(
                interaction.encodedBridgeCallData,
                inputs.interactionNonce,
                inputs.totalInputValue,
                outputValueA,
                outputValueB,
                result
            );
        }
        rollupState.numAsyncDefiInteractionHashes = asyncArrayLen + 1;

        emit DefiBridgeProcessed(
            interaction.encodedBridgeCallData,
            inputs.interactionNonce,
            inputs.totalInputValue,
            outputValueA,
            outputValueB,
            result,
            ""
            );

        return true;
    }

    /*----------------------------------------
      INTERNAL/PRIVATE MUTATING FUNCTIONS 
      ----------------------------------------*/

    /**
     * @notice A function which increasees pending deposit amount in the `userPendingDeposits` mapping
     * @dev Implemented in assembly in order to reduce compiled bytecode size and improve gas costs
     * @param _assetId asset ID which was assigned during asset registration
     * @param _owner address that can spend the deposited funds
     * @param _amount deposit token amount
     */
    function increasePendingDepositBalance(uint256 _assetId, address _owner, uint256 _amount)
        internal
        validateAssetIdIsNotVirtual(_assetId)
    {
        uint256 pending = userPendingDeposits[_assetId][_owner];

        if (rollupState.capped) {
            AssetCap memory cap = caps[_assetId];
            uint256 precision = 10 ** cap.precision;

            if (cap.pendingCap == 0 || pending + _amount > uint256(cap.pendingCap) * precision) {
                revert PENDING_CAP_SURPASSED();
            }

            if (cap.dailyCap == 0) {
                revert DAILY_CAP_SURPASSED();
            } else {
                // Increase the available amount, capped by dailyCap
                uint256 capVal = uint256(cap.dailyCap) * precision;
                uint256 rate = capVal / 1 days;
                cap.available += (rate * (block.timestamp - cap.lastUpdatedTimestamp)).toU128();
                if (cap.available > capVal) {
                    cap.available = capVal.toU128();
                }
                if (_amount > cap.available) {
                    revert DAILY_CAP_SURPASSED();
                }
                // Update available and timestamp
                cap.available -= _amount.toU128();
                cap.lastUpdatedTimestamp = uint32(block.timestamp);
                caps[_assetId] = cap;
            }
        }

        userPendingDeposits[_assetId][_owner] = pending + _amount;
    }

    /**
     * @notice A function which decreases pending deposit amount in the `userPendingDeposits` mapping
     * @dev Implemented in assembly in order to reduce compiled bytecode size and improve gas costs
     * @param _assetId asset ID which was assigned during asset registration
     * @param _owner address that owns the pending deposit
     * @param _amount amount of tokens to decrease pending by
     */
    function decreasePendingDepositBalance(uint256 _assetId, address _owner, uint256 _amount)
        internal
        validateAssetIdIsNotVirtual(_assetId)
    {
        uint256 userPendingDeposit = userPendingDeposits[_assetId][_owner];
        if (userPendingDeposit < _amount) {
            revert INSUFFICIENT_DEPOSIT();
        }
        userPendingDeposits[_assetId][_owner] = userPendingDeposit - _amount;
    }

    /**
     * @notice A function that processes a rollup proof
     * @dev Processing a rollup proof consists of:
     *          1) Verifying the proof's correctness,
     *          2) using the provided proof data to update rollup state + merkle roots,
     *          3) validate/enacting any deposits/withdrawals,
     *          4) processing bridge calls.
     * @param _proofData decoded rollup proof data
     * @param _signatures ECDSA signatures from users authorizing deposit transactions
     * @param _numTxs the number of transactions in the block
     * @param _publicInputsHash the SHA256 hash of the proof's public inputs
     * @param _rollupBeneficiary The address to be paid any subsidy for bridge calls and rollup fees
     */
    function processRollupProof(
        bytes memory _proofData,
        bytes memory _signatures,
        uint256 _numTxs,
        uint256 _publicInputsHash,
        address _rollupBeneficiary
    ) internal {
        uint256 rollupId = verifyProofAndUpdateState(_proofData, _publicInputsHash);
        processDepositsAndWithdrawals(_proofData, _numTxs, _signatures);
        bytes32[] memory nextDefiHashes = processBridgeCalls(_proofData, _rollupBeneficiary);
        emit RollupProcessed(rollupId, nextDefiHashes, msg.sender);
    }

    /**
     * @notice A function which verifies zk proof and updates the contract's state variables
     * @dev encodedProofData is read from calldata passed into the transaction and differs from `_proofData`
     * @param _proofData decoded rollup proof data
     * @param _publicInputsHash a hash of public inputs (computed by `Decoder.sol`)
     * @return rollupId id of the rollup which is being processed
     */
    function verifyProofAndUpdateState(bytes memory _proofData, uint256 _publicInputsHash)
        internal
        returns (uint256 rollupId)
    {
        // Verify the rollup proof.
        //
        // We manually call the verifier contract via assembly to save on gas costs and to reduce contract bytecode size
        assembly {
            /**
             * Validate correctness of zk proof.
             *
             * 1st Item is to format verifier calldata.
             *
             */

            // The `encodedProofData` (in calldata) contains the concatenation of
            // encoded 'broadcasted inputs' and the actual zk proof data.
            // (The `boadcasted inputs` is converted into a 32-byte SHA256 hash, which is
            // validated to equal the first public inputs of the zk proof. This is done in `Decoder.sol`).
            // We need to identify the location in calldata that points to the start of the zk proof data.

            // Step 1: compute size of zk proof data and its calldata pointer.
            /**
             * Data layout for `bytes encodedProofData`...
             *
             *             0x00 : 0x20 : length of array
             *             0x20 : 0x20 + header : root rollup header data
             *             0x20 + header : 0x24 + header : X, the length of encoded inner join-split public inputs
             *             0x24 + header : 0x24 + header + X : (inner join-split public inputs)
             *             0x24 + header + X : 0x28 + header + X : Y, the length of the zk proof data
             *             0x28 + header + X : 0x28 + haeder + X + Y : zk proof data
             *
             *             We need to recover the numeric value of `0x28 + header + X` and `Y`
             *
             */
            // Begin by getting length of encoded inner join-split public inputs.
            // `calldataload(0x04)` points to start of bytes array. Add 0x24 to skip over length param and function signature.
            // The calldata param 4 bytes *after* the header is the length of the pub inputs array. However it is a packed 4-byte param.
            // To extract it, we subtract 24 bytes from the calldata pointer and mask off all but the 4 least significant bytes.
            let encodedInnerDataSize :=
                and(calldataload(add(add(calldataload(0x04), 0x24), sub(ROLLUP_HEADER_LENGTH, 0x18))), 0xffffffff)

            // add 8 bytes to skip over the two packed params that follow the rollup header data
            // broadcastedDataSize = inner join-split pubinput size + header size
            let broadcastedDataSize := add(add(ROLLUP_HEADER_LENGTH, 8), encodedInnerDataSize)

            // Compute zk proof data size by subtracting broadcastedDataSize from overall length of bytes encodedProofsData
            let zkProofDataSize := sub(calldataload(add(calldataload(0x04), 0x04)), broadcastedDataSize)

            // Compute calldata pointer to start of zk proof data by adding calldata offset to broadcastedDataSize
            // (+0x24 skips over function signature and length param of bytes encodedProofData)
            let zkProofDataPtr := add(broadcastedDataSize, add(calldataload(0x04), 0x24))

            // Step 2: Format calldata for verifier contract call.

            // Get free memory pointer - we copy calldata into memory starting here
            let dataPtr := mload(0x40)

            // We call the function `verify(bytes,uint256)`
            // The function signature is 0xac318c5d
            // Calldata map is:
            // 0x00 - 0x04 : 0xac318c5d
            // 0x04 - 0x24 : 0x40 (number of bytes between 0x04 and the start of the `proofData` array at 0x44)
            // 0x24 - 0x44 : publicInputsHash
            // 0x44 - .... : proofData
            mstore8(dataPtr, 0xac)
            mstore8(add(dataPtr, 0x01), 0x31)
            mstore8(add(dataPtr, 0x02), 0x8c)
            mstore8(add(dataPtr, 0x03), 0x5d)
            mstore(add(dataPtr, 0x04), 0x40)
            mstore(add(dataPtr, 0x24), _publicInputsHash)
            mstore(add(dataPtr, 0x44), zkProofDataSize) // length of zkProofData bytes array
            calldatacopy(add(dataPtr, 0x64), zkProofDataPtr, zkProofDataSize) // copy the zk proof data into memory

            // Step 3: Call our verifier contract. It does not return any values, but will throw an error if the proof is not valid
            // i.e. verified == false if proof is not valid
            let verifierAddress := and(sload(rollupState.slot), ADDRESS_MASK)
            if iszero(extcodesize(verifierAddress)) {
                mstore(0, INVALID_ADDRESS_NO_CODE_SELECTOR)
                revert(0, 0x4)
            }
            let proof_verified := staticcall(gas(), verifierAddress, dataPtr, add(zkProofDataSize, 0x64), 0x00, 0x00)

            // Check the proof is valid!
            if iszero(proof_verified) {
                returndatacopy(0, 0, returndatasize())
                revert(0, returndatasize())
            }
        }

        // Validate and update state hash
        rollupId = validateAndUpdateMerkleRoots(_proofData);
    }

    /**
     * @notice Extracts roots from public inputs and validate that they are inline with current contract `rollupState`
     * @param _proofData decoded rollup proof data
     * @return rollup id
     * @dev To make the circuits happy, we want to only insert at the next subtree. The subtrees that we are using are
     *      28 leafs in size. They could be smaller but we just want them to be of same size for circuit related
     *      reasons.
     *          When we have the case that the `storedDataSize % numDataLeaves == 0`, we are perfectly dividing. This
     *      means that the incoming rollup matches perfectly with a boundry of the next subtree.
     *          When this is not the case, we have to compute an offset that we then apply so that the full state can
     *      be built with a bunch of same-sized trees (when the rollup is not full we insert a tree with some zero
     *      leaves). This offset can be computed as `numDataLeaves - (storedDataSize % numDataLeaves)` and is,
     *      essentially, how big a "space" we should leave so that the currently inserted subtree ends exactly at
     *      the subtree boundry. The value is always >= 0. In the function below we won’t hit the zero case, because
     *      that would be cought by the "if-branch".
     *
     *      Example: We have just had 32 rollups of size 28 (`storedDataSize = 896`). Now there is a small rollup with
     *      only 6 transactions. We are not perfectly dividing, hence we compute the offset as `6 - 896 % 6 = 4`.
     *      The start index is `896 + 4 = 900`. With the added leaves, the stored data size now becomes `906`.
     *          Now, comes another full rollup (28 txs). We compute `906 % 28 = 10`. The value is non-zero which means
     *      that we don’t perfectly divide and have to compute an offset `28 - 906 % 28 = 18`. The start index is
     *      `906 + 18 = 924`. Notice that `924 % 28 == 0`, so this will land us exactly at a location where everything
     *      in the past could have been subtrees of size 28.
     */
    function validateAndUpdateMerkleRoots(bytes memory _proofData) internal returns (uint256) {
        (uint256 rollupId, bytes32 oldStateHash, bytes32 newStateHash, uint32 numDataLeaves, uint32 dataStartIndex) =
            computeRootHashes(_proofData);

        if (oldStateHash != rollupStateHash) {
            revert INCORRECT_STATE_HASH(oldStateHash, newStateHash);
        }

        unchecked {
            uint32 storedDataSize = rollupState.datasize;
            // Ensure we are inserting at the next subtree boundary.
            if (storedDataSize % numDataLeaves == 0) {
                if (dataStartIndex != storedDataSize) {
                    revert INCORRECT_DATA_START_INDEX(dataStartIndex, storedDataSize);
                }
            } else {
                uint256 expected = storedDataSize + numDataLeaves - (storedDataSize % numDataLeaves);
                if (dataStartIndex != expected) {
                    revert INCORRECT_DATA_START_INDEX(dataStartIndex, expected);
                }
            }

            rollupStateHash = newStateHash;
            rollupState.datasize = dataStartIndex + numDataLeaves;
        }
        return rollupId;
    }

    /**
     * @notice A function which processes deposits and withdrawls
     * @param _proofData decoded rollup proof data
     * @param _numTxs number of transactions rolled up in the proof
     * @param _signatures byte array of secp256k1 ECDSA signatures, authorising a transfer of tokens
     */
    function processDepositsAndWithdrawals(bytes memory _proofData, uint256 _numTxs, bytes memory _signatures)
        internal
    {
        uint256 sigIndex = 0x00;
        uint256 proofDataPtr;
        uint256 end;
        assembly {
            // add 0x20 to skip over 1st member of the bytes type (the length field).
            // Also skip over the rollup header.
            proofDataPtr := add(ROLLUP_HEADER_LENGTH, add(_proofData, 0x20))

            // compute the position of proofDataPtr after we iterate through every transaction
            end := add(proofDataPtr, mul(_numTxs, TX_PUBLIC_INPUT_LENGTH))
        }

        // This is a bit of a hot loop, we iterate over every tx to determine whether to process deposits or withdrawals.
        while (proofDataPtr < end) {
            // extract the minimum information we need to determine whether to skip this iteration
            uint256 publicValue;
            assembly {
                publicValue := mload(add(proofDataPtr, 0xa0))
            }
            if (publicValue > 0) {
                uint256 proofId;
                uint256 assetId;
                address publicOwner;
                assembly {
                    proofId := mload(proofDataPtr)
                    assetId := mload(add(proofDataPtr, 0xe0))
                    publicOwner := mload(add(proofDataPtr, 0xc0))
                }

                if (proofId == 1) {
                    // validate user has approved deposit
                    bytes32 digest;
                    assembly {
                        // compute the tx id to check if user has approved tx
                        digest := keccak256(proofDataPtr, TX_PUBLIC_INPUT_LENGTH)
                    }
                    // check if there is an existing entry in depositProofApprovals
                    // if there is, no further work required.
                    // we don't need to clear `depositProofApprovals[publicOwner][digest]` because proofs cannot be re-used.
                    // A single proof describes the creation of 2 output notes and the addition of 2 input note nullifiers
                    // (both of these nullifiers can be categorised as "fake". They may not map to existing notes but are still inserted in the nullifier set)
                    // Replaying the proof will fail to satisfy the rollup circuit's non-membership check on the input nullifiers.
                    // We avoid resetting `depositProofApprovals` because that would cost additional gas post-London hard fork.
                    if (!depositProofApprovals[publicOwner][digest]) {
                        // extract and validate signature
                        // we can create a bytes memory container for the signature without allocating new memory,
                        // by overwriting the previous 32 bytes in the `signatures` array with the 'length' of our synthetic byte array (96)
                        // we store the memory we overwrite in `temp`, so that we can restore it
                        bytes memory signature;
                        uint256 temp;
                        // We use assembly to handle byte manipulation
                        assembly {
                            // set `signature` to point to 32 bytes less than the desired `r, s, v` values in `signatures`
                            signature := add(_signatures, sigIndex)
                            // cache the memory we're about to overwrite
                            temp := mload(signature)
                            // write in a 96-byte 'length' parameter into the `signature` bytes array
                            mstore(signature, 0x60)
                        }

                        bytes32 hashedMessage = RollupProcessorLibrary.getSignedMessageForTxId(digest);

                        RollupProcessorLibrary.validateShieldSignatureUnpacked(hashedMessage, signature, publicOwner);
                        // restore the memory we overwrote
                        assembly {
                            mstore(signature, temp)
                            sigIndex := add(sigIndex, 0x60)
                        }
                    }
                    decreasePendingDepositBalance(assetId, publicOwner, publicValue);
                }

                if (proofId == 2) {
                    withdraw(publicValue, publicOwner, assetId);
                }
            }
            // don't check for overflow, would take > 2^200 iterations of this loop for that to happen!
            unchecked {
                proofDataPtr += TX_PUBLIC_INPUT_LENGTH;
            }
        }
    }

    /**
     * @notice A function which pulls tokens from a bridge
     * @dev Calls `transferFrom` if asset is of type ERC20. If asset is ETH we validate a payment has been made
     *      against the provided interaction nonce. This function is used by `processAsyncDefiInteraction`.
     * @param _bridge address of bridge contract we're transferring tokens from
     * @param _asset the AztecAsset being transferred
     * @param _outputValue the expected value transferred
     * @param _interactionNonce the defi interaction nonce of the interaction
     */
    function transferTokensAsync(
        address _bridge,
        AztecTypes.AztecAsset memory _asset,
        uint256 _outputValue,
        uint256 _interactionNonce
    ) internal {
        if (_outputValue == 0) {
            return;
        }
        if (_asset.assetType == AztecTypes.AztecAssetType.ETH) {
            if (_outputValue > ethPayments[_interactionNonce]) {
                revert INSUFFICIENT_ETH_PAYMENT();
            }
            ethPayments[_interactionNonce] = 0;
        } else if (_asset.assetType == AztecTypes.AztecAssetType.ERC20) {
            address tokenAddress = _asset.erc20Address;
            TokenTransfers.safeTransferFrom(tokenAddress, _bridge, address(this), _outputValue);
        }
    }

    /**
     * @notice A function which transfers fees to the `_feeReceiver`
     * @dev Note: function will not revert if underlying transfers fails
     * @param _proofData decoded rollup proof data
     * @param _feeReceiver fee beneficiary as described by the rollup provider
     */
    function transferFee(bytes memory _proofData, address _feeReceiver) internal {
        for (uint256 i = 0; i < NUMBER_OF_ASSETS; i++) {
            uint256 txFee = extractTotalTxFee(_proofData, i);
            if (txFee > 0) {
                uint256 assetId = extractFeeAssetId(_proofData, i);
                if (assetId == ETH_ASSET_ID) {
                    // We explicitly do not throw if this call fails, as this opens up the possiblity of griefing
                    // attacks --> engineering a failed fee would invalidate an entire rollup block. As griefing could
                    // be done by consuming all gas in the `_feeReceiver` fallback only 50K gas is forwarded. We are
                    // forwarding a bit more gas than in the withdraw function because this code will only be hit
                    // at most once each rollup-block and we want to give the provider a bit more flexibility.
                    assembly {
                        pop(call(50000, _feeReceiver, txFee, 0, 0, 0, 0))
                    }
                } else {
                    address assetAddress = getSupportedAsset(assetId);
                    TokenTransfers.transferToDoNotBubbleErrors(
                        assetAddress, _feeReceiver, txFee, assetGasLimits[assetId]
                    );
                }
            }
        }
    }

    /**
     * @notice Internal utility function which withdraws funds from the contract to a receiver address
     * @param _withdrawValue - value being withdrawn from the contract
     * @param _receiver - address receiving public ERC20 tokens
     * @param _assetId - ID of the asset for which a withdrawal is being performed
     * @dev The function doesn't throw if the inner call fails, as this opens up the possiblity of griefing attacks
     *      -> engineering a failed withdrawal would invalidate an entire rollup block.
     *      A griefing attack could be done by consuming all gas in the `_receiver` fallback and for this reason we
     *      only forward 30K gas. This still allows the recipient to handle accounting if recipient is a contract.
     *      The user should ensure their withdrawal will succeed or they will lose the funds.
     */
    function withdraw(uint256 _withdrawValue, address _receiver, uint256 _assetId) internal {
        if (_receiver == address(0)) {
            revert WITHDRAW_TO_ZERO_ADDRESS();
        }
        if (_assetId == 0) {
            assembly {
                pop(call(30000, _receiver, _withdrawValue, 0, 0, 0, 0))
            }
            // payable(_receiver).call{gas: 30000, value: _withdrawValue}('');
        } else {
            address assetAddress = getSupportedAsset(_assetId);
            TokenTransfers.transferToDoNotBubbleErrors(
                assetAddress, _receiver, _withdrawValue, assetGasLimits[_assetId]
            );
        }
    }

    /*----------------------------------------
      PUBLIC/EXTERNAL NON-MUTATING FUNCTIONS 
      ----------------------------------------*/

    /**
     * @notice Get implementation's version number
     * @return version version number of the implementation
     */
    function getImplementationVersion() public view virtual returns (uint8 version) {
        return 2;
    }

    /**
     * @notice Get true if the contract is paused, false otherwise
     * @return isPaused - True if paused, false otherwise
     */
    function paused() external view override(IRollupProcessor) returns (bool isPaused) {
        return rollupState.paused;
    }

    /**
     * @notice Gets the number of filled entries in the data tree
     * @return dataSize number of filled entries in the data tree (equivalent to the number of notes created on L2)
     */
    function getDataSize() public view override(IRollupProcessor) returns (uint256 dataSize) {
        return rollupState.datasize;
    }

    /**
     * @notice Returns true if deposits are capped, false otherwise
     * @return capped - True if deposits are capped, false otherwise
     */
    function getCapped() public view override(IRollupProcessorV2) returns (bool capped) {
        return rollupState.capped;
    }

    /**
     * @notice Gets the number of pending defi interactions that have resolved but have not yet been added into the
     *         DeFi tree
     * @return - the number of pending interactions
     * @dev This value can never exceed 512. This limit is set in order to prevent griefing attacks - `processRollup`
     *      iterates through `asyncDefiInteractionHashes` and copies their values into `defiInteractionHashes`. Loop
     *      is bounded to < 512 so that tx does not exceed block gas limit.
     */
    function getPendingDefiInteractionHashesLength() public view override(IRollupProcessor) returns (uint256) {
        return rollupState.numAsyncDefiInteractionHashes + rollupState.numDefiInteractionHashes;
    }

    /**
     * @notice Gets the address of the PLONK verification smart contract
     * @return - address of the verification smart contract
     */
    function verifier() public view override(IRollupProcessor) returns (address) {
        return address(rollupState.verifier);
    }

    /**
     * @notice Gets the number of supported bridges
     * @return - the number of supported bridges
     */
    function getSupportedBridgesLength() external view override(IRollupProcessor) returns (uint256) {
        return supportedBridges.length;
    }

    /**
     * @notice Gets the bridge contract address for a given bridgeAddressId
     * @param _bridgeAddressId identifier used to denote a particular bridge
     * @return - the address of the matching bridge contract
     */
    function getSupportedBridge(uint256 _bridgeAddressId) public view override(IRollupProcessor) returns (address) {
        return supportedBridges[_bridgeAddressId - 1];
    }

    /**
     * @notice Gets the number of supported assets
     * @return - the number of supported assets
     */
    function getSupportedAssetsLength() external view override(IRollupProcessor) returns (uint256) {
        return supportedAssets.length;
    }

    /**
     * @notice Gets the ERC20 token address of a supported asset for a given `_assetId`
     * @param _assetId identifier used to denote a particular asset
     * @return - the address of the matching asset
     */
    function getSupportedAsset(uint256 _assetId)
        public
        view
        override(IRollupProcessor)
        validateAssetIdIsNotVirtual(_assetId)
        returns (address)
    {
        // If assetId == ETH_ASSET_ID (i.e. 0), this represents native ETH.
        // ERC20 token asset id values start at 1
        if (_assetId == ETH_ASSET_ID) {
            return address(0x0);
        }
        address result = supportedAssets[_assetId - 1];
        if (result == address(0)) {
            revert INVALID_ASSET_ADDRESS();
        }
        return result;
    }

    /**
     * @notice Gets the status of the escape hatch.
     * @return True if escape hatch is open, false otherwise
     * @return The number of blocks until the next opening/closing of escape hatch
     */
    function getEscapeHatchStatus() public view override(IRollupProcessor) returns (bool, uint256) {
        uint256 blockNum = block.number;

        bool isOpen = blockNum % escapeBlockUpperBound >= escapeBlockLowerBound;
        uint256 blocksRemaining = 0;
        if (isOpen) {
            if (block.timestamp < uint256(lastRollupTimeStamp) + delayBeforeEscapeHatch) {
                isOpen = false;
            }
            // num blocks escape hatch will remain open for
            blocksRemaining = escapeBlockUpperBound - (blockNum % escapeBlockUpperBound);
        } else {
            // num blocks until escape hatch will be opened
            blocksRemaining = escapeBlockLowerBound - (blockNum % escapeBlockUpperBound);
        }
        return (isOpen, blocksRemaining);
    }

    /**
     * @notice Gets the number of defi interaction hashes
     * @dev A defi interaction hash represents a defi interaction that has resolved, but whose
     *      result data has not yet been added into the Aztec Defi Merkle tree. This step is needed in order to convert
     *      L2 Defi claim notes into L2 value notes.
     * @return - the number of pending defi interaction hashes
     */
    function getDefiInteractionHashesLength() public view override(IRollupProcessor) returns (uint256) {
        return rollupState.numDefiInteractionHashes;
    }

    /**
     * @notice Gets the number of asynchronous defi interaction hashes
     * @dev A defi interaction hash represents an asynchronous defi interaction that has resolved, but whose interaction
     *      result data has not yet been added into the Aztec Defi Merkle tree. This step is needed in order to convert
     *      L2 Defi claim notes into L2 value notes.
     * @return - the number of pending async defi interaction hashes
     */
    function getAsyncDefiInteractionHashesLength() public view override(IRollupProcessor) returns (uint256) {
        return rollupState.numAsyncDefiInteractionHashes;
    }

    /*----------------------------------------
      INTERNAL/PRIVATE NON-MUTATING FUNCTIONS
      ----------------------------------------*/

    /**
     * @notice A function which constructs a FullBridgeCallData struct based on values from `_encodedBridgeCallData`
     * @param _encodedBridgeCallData a bit-array that contains data describing a specific bridge call
     *
     * Structure of the bit array is as follows (starting at the least significant bit):
     * | bit range | parameter       | description |
     * | 0 - 32    | bridgeAddressId | The address ID. Bridge address = `supportedBridges[bridgeAddressId]` |
     * | 32 - 62   | inputAssetIdA   | First input asset ID. |
     * | 62 - 92   | inputAssetIdB   | Second input asset ID. Must be 0 if bridge does not have a 2nd input asset. |
     * | 92 - 122  | outputAssetIdA  | First output asset ID. |
     * | 122 - 152 | outputAssetIdB  | Second output asset ID. Must be 0 if bridge does not have a 2nd output asset. |
     * | 152 - 184 | bitConfig       | Bit-array that contains boolean bridge settings. |
     * | 184 - 248 | auxData         | 64 bits of custom data to be passed to the bridge contract. Structure of auxData
     *                                 is defined/checked by the bridge contract. |
     *
     * Structure of the `bitConfig` parameter is as follows
     * | bit | parameter               | description |
     * | 0   | secondInputInUse        | Does the bridge have a second input asset? |
     * | 1   | secondOutputInUse       | Does the bridge have a second output asset? |
     *
     * @dev Note: Virtual assets are assets that don't have an ERC20 token analogue and exist solely as notes within
     *            the Aztec network. They can be created/spent within bridge calls. They are used to enable bridges
     *            to track internally-defined data without having to mint a new token on-chain. An example use of
     *            a virtual asset would be a virtual loan asset that tracks an outstanding debt that must be repaid
     *            to recover a collateral deposited into the bridge.
     *
     * @return fullBridgeCallData a struct that contains information defining a specific bridge call
     */
    function getFullBridgeCallData(uint256 _encodedBridgeCallData)
        internal
        view
        returns (FullBridgeCallData memory fullBridgeCallData)
    {
        assembly {
            mstore(fullBridgeCallData, and(_encodedBridgeCallData, MASK_THIRTY_TWO_BITS)) // bridgeAddressId
            mstore(
                add(fullBridgeCallData, 0x40),
                and(shr(INPUT_ASSET_ID_A_SHIFT, _encodedBridgeCallData), MASK_THIRTY_BITS)
            ) // inputAssetIdA
            mstore(
                add(fullBridgeCallData, 0x60),
                and(shr(INPUT_ASSET_ID_B_SHIFT, _encodedBridgeCallData), MASK_THIRTY_BITS)
            ) // inputAssetIdB
            mstore(
                add(fullBridgeCallData, 0x80),
                and(shr(OUTPUT_ASSET_ID_A_SHIFT, _encodedBridgeCallData), MASK_THIRTY_BITS)
            ) // outputAssetIdA
            mstore(
                add(fullBridgeCallData, 0xa0),
                and(shr(OUTPUT_ASSET_ID_B_SHIFT, _encodedBridgeCallData), MASK_THIRTY_BITS)
            ) // outputAssetIdB
            mstore(
                add(fullBridgeCallData, 0xc0), and(shr(AUX_DATA_SHIFT, _encodedBridgeCallData), MASK_SIXTY_FOUR_BITS)
            ) // auxData

            mstore(
                add(fullBridgeCallData, 0xe0),
                and(shr(add(INPUT_ASSET_ID_A_SHIFT, VIRTUAL_ASSET_ID_FLAG_SHIFT), _encodedBridgeCallData), 1)
            ) // firstInputVirtual (30th bit of inputAssetIdA) == 1
            mstore(
                add(fullBridgeCallData, 0x100),
                and(shr(add(INPUT_ASSET_ID_B_SHIFT, VIRTUAL_ASSET_ID_FLAG_SHIFT), _encodedBridgeCallData), 1)
            ) // secondInputVirtual (30th bit of inputAssetIdB) == 1
            mstore(
                add(fullBridgeCallData, 0x120),
                and(shr(add(OUTPUT_ASSET_ID_A_SHIFT, VIRTUAL_ASSET_ID_FLAG_SHIFT), _encodedBridgeCallData), 1)
            ) // firstOutputVirtual (30th bit of outputAssetIdA) == 1
            mstore(
                add(fullBridgeCallData, 0x140),
                and(shr(add(OUTPUT_ASSET_ID_B_SHIFT, VIRTUAL_ASSET_ID_FLAG_SHIFT), _encodedBridgeCallData), 1)
            ) // secondOutputVirtual (30th bit of outputAssetIdB) == 1
            let bitConfig := and(shr(BITCONFIG_SHIFT, _encodedBridgeCallData), MASK_THIRTY_TWO_BITS)
            // bitConfig = bit mask that contains bridge ID settings
            // bit 0 = second input asset in use?
            // bit 1 = second output asset in use?
            mstore(add(fullBridgeCallData, 0x160), eq(and(bitConfig, 1), 1)) // secondInputInUse (bitConfig & 1) == 1
            mstore(add(fullBridgeCallData, 0x180), eq(and(shr(1, bitConfig), 1), 1)) // secondOutputInUse ((bitConfig >> 1) & 1) == 1
        }
        fullBridgeCallData.bridgeAddress = supportedBridges[fullBridgeCallData.bridgeAddressId - 1];
        fullBridgeCallData.bridgeGasLimit = bridgeGasLimits[fullBridgeCallData.bridgeAddressId];

        // potential conflicting states that are explicitly ruled out by circuit constraints:
        if (!fullBridgeCallData.secondInputInUse && fullBridgeCallData.inputAssetIdB > 0) {
            revert INCONSISTENT_BRIDGE_CALL_DATA();
        }
        if (!fullBridgeCallData.secondOutputInUse && fullBridgeCallData.outputAssetIdB > 0) {
            revert INCONSISTENT_BRIDGE_CALL_DATA();
        }
        if (
            fullBridgeCallData.secondInputInUse
                && (fullBridgeCallData.inputAssetIdA == fullBridgeCallData.inputAssetIdB)
        ) {
            revert BRIDGE_WITH_IDENTICAL_INPUT_ASSETS(fullBridgeCallData.inputAssetIdA);
        }
        // Outputs can both be virtual. In that case, their asset ids will both be 2 ** 29.
        bool secondOutputReal = fullBridgeCallData.secondOutputInUse && !fullBridgeCallData.secondOutputVirtual;
        if (secondOutputReal && fullBridgeCallData.outputAssetIdA == fullBridgeCallData.outputAssetIdB) {
            revert BRIDGE_WITH_IDENTICAL_OUTPUT_ASSETS(fullBridgeCallData.outputAssetIdA);
        }
    }

    /**
     * @notice Gets the four input/output assets associated with a specific bridge call
     * @param _fullBridgeCallData a struct that contains information defining a specific bridge call
     * @param _interactionNonce interaction nonce of a corresponding bridge call
     * @dev `_interactionNonce` param is here because it is used as an ID of output virtual asset
     *
     * @return inputAssetA the first input asset
     * @return inputAssetB the second input asset
     * @return outputAssetA the first output asset
     * @return outputAssetB the second output asset
     */
    function getAztecAssetTypes(FullBridgeCallData memory _fullBridgeCallData, uint256 _interactionNonce)
        internal
        view
        returns (
            AztecTypes.AztecAsset memory inputAssetA,
            AztecTypes.AztecAsset memory inputAssetB,
            AztecTypes.AztecAsset memory outputAssetA,
            AztecTypes.AztecAsset memory outputAssetB
        )
    {
        inputAssetA = getAztecAsset(
            _fullBridgeCallData.inputAssetIdA, _interactionNonce, true, _fullBridgeCallData.firstInputVirtual, true
        );
        inputAssetB = getAztecAsset(
            _fullBridgeCallData.inputAssetIdB,
            _interactionNonce,
            true,
            _fullBridgeCallData.secondInputVirtual,
            _fullBridgeCallData.secondInputInUse
        );

        outputAssetA = getAztecAsset(
            _fullBridgeCallData.outputAssetIdA, _interactionNonce, false, _fullBridgeCallData.firstOutputVirtual, true
        );
        outputAssetB = getAztecAsset(
            _fullBridgeCallData.outputAssetIdB,
            _interactionNonce,
            false,
            _fullBridgeCallData.secondOutputVirtual,
            _fullBridgeCallData.secondOutputInUse
        );
    }

    function getAztecAsset(uint256 _assetId, uint256 _interactionNonce, bool _isInput, bool _isVirtual, bool _isUsed)
        internal
        view
        returns (AztecTypes.AztecAsset memory asset)
    {
        if (!_isUsed) {
            return AztecTypes.AztecAsset(0, address(0x0), AztecTypes.AztecAssetType.NOT_USED);
        }

        if (_isVirtual) {
            // asset id is a nonce of the interaction in which the virtual asset was created
            // TODO: We are missing a test that actually need the virtual asset id to be specific.
            // Can probably be handled with just a event test.
            asset.id = (_isInput || false) ? _assetId - VIRTUAL_ASSET_ID_FLAG : _interactionNonce;
            asset.erc20Address = address(0x0);
            asset.assetType = AztecTypes.AztecAssetType.VIRTUAL;
        } else {
            asset.id = _assetId;
            asset.erc20Address = getSupportedAsset(_assetId);
            asset.assetType =
                asset.erc20Address == address(0x0) ? AztecTypes.AztecAssetType.ETH : AztecTypes.AztecAssetType.ERC20;
        }
    }

    /**
     * @notice Gets the length of the defi interaction hashes array and the number of pending interactions
     *
     * @return defiInteractionHashesLength the complete length of the defi interaction array
     * @return numPendingInteractions the current number of pending defi interactions
     * @dev `numPendingInteractions` is capped at `NUMBER_OF_BRIDGE_CALLS`
     */
    function getDefiHashesLengthsAndNumPendingInteractions()
        internal
        view
        returns (uint256 defiInteractionHashesLength, uint256 numPendingInteractions)
    {
        numPendingInteractions = defiInteractionHashesLength = rollupState.numDefiInteractionHashes;
        if (numPendingInteractions > NUMBER_OF_BRIDGE_CALLS) {
            numPendingInteractions = NUMBER_OF_BRIDGE_CALLS;
        }
    }

    /**
     * @notice Gets the set of hashes that comprise the current pending interactions and nextExpectedHash
     *
     * @return hashes the set of valid (i.e. non-zero) hashes that comprise the pending interactions
     * @return nextExpectedHash the hash of all hashes (including zero hashes) that comprise the pending interactions
     */
    function getPendingAndNextExpectedHashes()
        internal
        view
        returns (bytes32[] memory hashes, bytes32 nextExpectedHash)
    {
        /**
         * ----------------------------------------
         * Compute nextExpectedHash
         * -----------------------------------------
         *
         * The `defiInteractionHashes` mapping emulates an array that represents the
         * set of defi interactions from previous blocks that have been resolved.
         *
         * We need to take the interaction result data from each of the above defi interactions,
         * and add that data into the Aztec L2 merkle tree that contains defi interaction results
         * (the "Defi Tree". Its merkle root is one of the inputs to the storage variable `rollupStateHash`)
         *
         * It is the rollup provider's responsibility to perform these additions.
         * In the current block being processed, the rollup provider must take these pending interaction results,
         * create commitments to each result and insert each commitment into the next empty leaf of the defi tree.
         *
         * The following code validates that this has happened! This is how:
         *
         * Part 1: What are we checking?
         *
         * The rollup circuit will receive, as a private input from the rollup provider, the pending defi interaction
         * results
         * (`encodedBridgeCallData`, `totalInputValue`, `totalOutputValueA`, `totalOutputValueB`, `result`)
         * The rollup circuit will compute the SHA256 hash of each interaction result (the defiInteractionHash)
         * Finally the SHA256 hash of `NUMBER_OF_BRIDGE_CALLS` of these defiInteractionHash values is computed.
         * (if there are fewer than `NUMBER_OF_BRIDGE_CALLS` pending defi interaction results, the SHA256 hash of
         * an empty defi interaction result is used instead. i.e. all variable values are set to 0)
         * The computed SHA256 hash, the `pendingDefiInteractionHash`, is one of the broadcasted values that forms
         * the `publicInputsHash` public input to the rollup circuit.
         * When verifying a rollup proof, this smart contract will compute `publicInputsHash` from the input calldata.
         * The PLONK Verifier smart contract will then validate that our computed value for `publicInputHash` matches
         * the value used when generating the rollup proof.
         *
         * TLDR of the above: our proof data contains a variable called `pendingDefiInteractionHash`, which is
         * the CLAIMED VALUE of SHA256 hashing the SHA256 hashes of the defi interactions that have resolved but whose
         * data has not yet been added into the defi tree.
         *
         * Part 2: How do we check `pendingDefiInteractionHash` is correct???
         *
         * This contract will call `DefiBridgeProxy.convert` (via delegatecall) on every new defi interaction present
         * in the block. The return values from the bridge proxy contract are used to construct a defi interaction
         * result. Its hash is then computed and stored in `defiInteractionHashes`.
         *
         * N.B. It's very important that DefiBridgeProxy does not call selfdestruct, or makes a delegatecall out to
         *      a contract that can selfdestruct :o
         *
         * Similarly, when async defi interactions resolve, the interaction result is stored in
         * `asyncDefiInteractionHashes`. At the end of the processBridgeCalls function, the contents of the async array
         * is copied into `defiInteractionHashes` (i.e. async interaction results are delayed by 1 rollup block.
         * This is to prevent griefing attacks where the rollup state changes between the time taken for a rollup tx
         * to be constructed and the rollup tx to be mined)
         *
         * We use the contents of `defiInteractionHashes` to reconstruct `pendingDefiInteractionHash`, and validate it
         * matches the value present in calldata and therefore the value used in the rollup circuit when this block's
         * rollup proof was constructed. This validates that all of the required defi interaction results were added
         * into the defi tree by the rollup provider (the circuit logic enforces this, we just need to check the rollup
         * provider used the correct inputs)
         */
        (uint256 defiInteractionHashesLength, uint256 numPendingInteractions) =
            getDefiHashesLengthsAndNumPendingInteractions();
        uint256 offset = defiInteractionHashesLength - numPendingInteractions;
        hashes = new bytes32[](NUMBER_OF_BRIDGE_CALLS);

        for (uint256 i = 0; i < NUMBER_OF_BRIDGE_CALLS; i++) {
            if (i < numPendingInteractions) {
                hashes[i] = defiInteractionHashes[offset + i];
            } else {
                hashes[i] = DEFI_RESULT_ZERO_HASH;
            }
        }
        nextExpectedHash = bytes32(uint256(sha256(abi.encodePacked(hashes))) % CIRCUIT_MODULUS);
        // Only return non-zero hashes
        assembly {
            mstore(hashes, numPendingInteractions)
        }
    }

    /**
     * @notice A function that processes bridge calls.
     * @dev 1. pop NUMBER_OF_BRIDGE_CALLS (if available) interaction hashes off of `defiInteractionHashes`,
     *         validate their hash (calculated at the end of the previous rollup and stored as
     *         nextExpectedDefiInteractionsHash) equals `numPendingInteractions` (this validates that rollup block
     *         has added these interaction results into the L2 data tree)
     *      2. iterate over rollup block's new defi interactions (up to NUMBER_OF_BRIDGE_CALLS). Trigger interactions
     *         by calling DefiBridgeProxy contract. Record results in either `defiInteractionHashes` (for synchrohnous
     *         txns) or, for async txns, the `pendingDefiInteractions` mapping
     *      3. copy the contents of `asyncInteractionHashes` into `defiInteractionHashes` && clear
     *         `asyncInteractionHashes`
     *      4. calculate the next value of nextExpectedDefiInteractionsHash from the new set of defiInteractionHashes
     * @param _proofData decoded rollup proof data
     * @param _rollupBeneficiary the address that should be paid any subsidy for processing a bridge call
     * @return nextExpectedHashes the set of non-zero hashes that comprise the current pending defi interactions
     */
    function processBridgeCalls(bytes memory _proofData, address _rollupBeneficiary)
        internal
        returns (bytes32[] memory nextExpectedHashes)
    {
        ProcessBridgeCallVariables memory vars;

        // Verify that nextExpectedDefiInteractionsHash equals the value given in the rollup
        // Then remove the set of pending hashes
        {
            // Extract the claimed value of previousDefiInteractionHash present in the proof data
            bytes32 providedDefiInteractionsHash = extractPrevDefiInteractionHash(_proofData);

            // Validate the stored interactionHash matches the value used when making the rollup proof!
            if (providedDefiInteractionsHash != prevDefiInteractionsHash) {
                revert INCORRECT_PREVIOUS_DEFI_INTERACTION_HASH(providedDefiInteractionsHash, prevDefiInteractionsHash);
            }
            uint256 numPendingInteractions;
            (vars.defiInteractionHashesLength, numPendingInteractions) = getDefiHashesLengthsAndNumPendingInteractions();
            // numPendingInteraction equals the number of interactions expected to be in the given rollup
            // this is the length of the defiInteractionHashes array, capped at the NUM_BRIDGE_CALLS as per the following
            // numPendingInteractions = min(defiInteractionsHashesLength, numberOfBridgeCalls)

            // Reduce DefiInteractionHashes.length by numPendingInteractions
            vars.defiInteractionHashesLength -= numPendingInteractions;

            // We can safely cast to uint16 as the value is reduced, so it must be less than 2^16
            rollupState.numDefiInteractionHashes = uint16(vars.defiInteractionHashesLength);

            uint256 paymentsSlot;
            assembly {
                paymentsSlot := ethPayments.slot
            }
            vars.paymentsSlot = paymentsSlot;
        }
        vars.rollupBeneficiary = _rollupBeneficiary;
        vars.interactionNonce = getRollupId(_proofData) * NUMBER_OF_BRIDGE_CALLS;

        // ### Process bridge calls
        uint256 proofDataPtr;
        assembly {
            proofDataPtr := add(_proofData, BRIDGE_CALL_DATAS_OFFSET)
        }
        if (defiBridgeProxy.code.length == 0) {
            revert INVALID_ADDRESS_NO_CODE();
        }

        for (uint256 i = 0; i < NUMBER_OF_BRIDGE_CALLS; i++) {
            {
                uint256 encodedBridgeCallData;
                uint256 totalInputValue;
                assembly {
                    encodedBridgeCallData := mload(proofDataPtr)
                    totalInputValue := mload(add(proofDataPtr, mul(0x20, NUMBER_OF_BRIDGE_CALLS)))
                }
                vars.encodedBridgeCallData = encodedBridgeCallData;
                vars.totalInputValue = totalInputValue;
            }
            if (vars.encodedBridgeCallData == 0) {
                // no more bridges to call
                break;
            }
            if (vars.totalInputValue == 0) {
                revert ZERO_TOTAL_INPUT_VALUE();
            }

            FullBridgeCallData memory fullBridgeCallData = getFullBridgeCallData(vars.encodedBridgeCallData);
            vars.bridgeResult =
                BridgeResult({success: false, errorReason: "", outputValueA: 0, outputValueB: 0, isAsync: false});

            (vars.inputAssetA, vars.inputAssetB, vars.outputAssetA, vars.outputAssetB) =
                getAztecAssetTypes(fullBridgeCallData, vars.interactionNonce);

            {
                (vars.bridgeResult.success, vars.bridgeResult.errorReason) = defiBridgeProxy.delegatecall{
                    gas: fullBridgeCallData.bridgeGasLimit
                }(
                    abi.encodeWithSelector(
                        DEFI_BRIDGE_PROXY_CONVERT_SELECTOR,
                        fullBridgeCallData.bridgeAddress,
                        vars.inputAssetA,
                        vars.inputAssetB,
                        vars.outputAssetA,
                        vars.outputAssetB,
                        vars.totalInputValue,
                        vars.interactionNonce,
                        fullBridgeCallData.auxData,
                        vars.paymentsSlot,
                        vars.rollupBeneficiary
                    )
                );

                if (vars.bridgeResult.success) {
                    // Decode the output values from the call
                    (vars.bridgeResult.outputValueA, vars.bridgeResult.outputValueB, vars.bridgeResult.isAsync) =
                        abi.decode(vars.bridgeResult.errorReason, (uint256, uint256, bool));
                    // Reset errorReason to empty string
                    vars.bridgeResult.errorReason = "";
                }
            }

            if (!fullBridgeCallData.secondOutputInUse) {
                vars.bridgeResult.outputValueB = 0;
            }

            if (vars.bridgeResult.isAsync) {
                emit AsyncDefiBridgeProcessed(vars.encodedBridgeCallData, vars.interactionNonce, vars.totalInputValue);
                pendingDefiInteractions[vars.interactionNonce] =
                    PendingDefiBridgeInteraction(vars.encodedBridgeCallData, vars.totalInputValue);
            } else {
                emit DefiBridgeProcessed(
                    vars.encodedBridgeCallData,
                    vars.interactionNonce,
                    vars.totalInputValue,
                    vars.bridgeResult.outputValueA,
                    vars.bridgeResult.outputValueB,
                    vars.bridgeResult.success,
                    vars.bridgeResult.errorReason
                    );

                // if interaction is synchronous, compute the interaction hash and add to defiInteractionHashes
                defiInteractionHashes[vars.defiInteractionHashesLength++] = computeDefiInteractionHash(
                    vars.encodedBridgeCallData,
                    vars.interactionNonce,
                    vars.totalInputValue,
                    vars.bridgeResult.outputValueA,
                    vars.bridgeResult.outputValueB,
                    vars.bridgeResult.success
                );
            }

            vars.interactionNonce++;
            assembly {
                proofDataPtr := add(proofDataPtr, 0x20)
            }
        }

        uint16 asyncDefiInteractionHashesLength = rollupState.numAsyncDefiInteractionHashes;
        if (asyncDefiInteractionHashesLength + vars.defiInteractionHashesLength > ARRAY_LENGTH_MASK) {
            revert ARRAY_OVERFLOW();
        }

        for (uint256 i = 0; i < asyncDefiInteractionHashesLength; i++) {
            defiInteractionHashes[vars.defiInteractionHashesLength + i] = asyncDefiInteractionHashes[i];
        }
        rollupState.numAsyncDefiInteractionHashes = 0;
        rollupState.numDefiInteractionHashes =
            uint16(vars.defiInteractionHashesLength) + asyncDefiInteractionHashesLength;

        // now we want to extract the next set of pending defi interaction hashes and calculate their hash to store
        // for the next rollup
        (bytes32[] memory hashes, bytes32 nextExpectedHash) = getPendingAndNextExpectedHashes();
        nextExpectedHashes = hashes;
        prevDefiInteractionsHash = nextExpectedHash;
    }

    function computeDefiInteractionHash(
        uint256 _encodedBridgeCallData,
        uint256 _interactionNonce,
        uint256 _totalInputValue,
        uint256 _outputValueA,
        uint256 _outputValueB,
        bool _result
    ) internal pure returns (bytes32) {
        return bytes32(
            uint256(
                sha256(
                    abi.encode(
                        _encodedBridgeCallData,
                        _interactionNonce,
                        _totalInputValue,
                        _outputValueA,
                        _outputValueB,
                        _result
                    )
                )
            ) % CIRCUIT_MODULUS
        );
    }
}
