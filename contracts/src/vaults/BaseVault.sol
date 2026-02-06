// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/interfaces/IERC4626.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "../interfaces/IStrategy.sol";

import "../interfaces/INitroliteVault.sol";
import "../NitroliteIntegration.sol";

contract BaseVault is
    ERC4626,
    Ownable,
    ReentrancyGuard,
    NitroliteIntegration,
    INitroliteVault,
    EIP712
{
    using SafeERC20 for IERC20;

    bytes32 private constant REBALANCE_TYPEHASH =
        keccak256(
            "Rebalance(uint8 riskTier,uint256[] indices,uint8[] allocations,uint256 nonce)"
        );
    mapping(address => uint256) public nonces;

    struct StrategyAllocation {
        address strategy;
        uint16 allocationBps;
        bool active;
    }

    StrategyAllocation[] public strategies;

    uint256 public performanceFeeBps = 1000;
    address public feeRecipient;
    uint256 public totalHarvested;
    uint256 public lastHarvestTime;

    event StrategyAdded(address indexed strategy, uint16 allocationBps);
    event StrategyRemoved(uint256 indexed index);
    event AllocationsUpdated(uint256[] indices, uint16[] allocations);
    event Harvested(uint256 totalYield, uint256 fee, uint256 timestamp);
    event Rebalanced(uint256 timestamp, uint256 totalAssets);
    event PerformanceFeeUpdated(uint256 oldFee, uint256 newFee);
    event FeeRecipientUpdated(
        address indexed oldRecipient,
        address indexed newRecipient
    );
    event EmergencyExit(uint256 indexed strategyIndex, uint256 assetsRecovered);
    event UserRebalanceSettled(address indexed user);

    error InvalidStrategy();
    error InvalidAllocation();
    error AllocationMustBe100();
    error FeeTooHigh();
    error InvalidAddress();
    error StrategyNotActive();

    constructor(
        IERC20 _asset,
        string memory _name,
        string memory _symbol,
        address _feeRecipient
    )
        ERC4626(_asset)
        ERC20(_name, _symbol)
        Ownable(msg.sender)
        EIP712("AuraVault", "1")
    {
        if (_feeRecipient == address(0)) revert InvalidAddress();
        feeRecipient = _feeRecipient;
    }

    function addStrategy(
        address strategy,
        uint16 allocationBps
    ) external onlyOwner {
        if (strategy == address(0)) revert InvalidStrategy();
        // Allow 0 allocation to enable adding strategies when vault is full,
        // which can then be rebalanced via updateAllocations
        // if (allocationBps == 0) revert InvalidAllocation();

        uint256 totalAlloc = allocationBps;
        for (uint256 i = 0; i < strategies.length; i++) {
            if (strategies[i].active) {
                totalAlloc += strategies[i].allocationBps;
            }
        }
        if (totalAlloc > 10000) revert InvalidAllocation();

        strategies.push(
            StrategyAllocation({
                strategy: strategy,
                allocationBps: allocationBps,
                active: true
            })
        );

        emit StrategyAdded(strategy, allocationBps);
    }

    function removeStrategy(uint256 index) external onlyOwner nonReentrant {
        if (index >= strategies.length) revert InvalidStrategy();
        if (!strategies[index].active) revert StrategyNotActive();

        IStrategy(strategies[index].strategy).withdrawAll();

        strategies[index].active = false;
        strategies[index].allocationBps = 0;

        emit StrategyRemoved(index);
    }

    function updateAllocations(
        uint256[] calldata indices,
        uint16[] memory allocations
    ) public onlyOwner {
        _updateAllocations(indices, allocations);
    }

    function _updateAllocations(
        uint256[] memory indices,
        uint16[] memory allocations
    ) internal {
        if (indices.length != allocations.length || indices.length == 0)
            revert InvalidAllocation();

        uint256 totalAlloc = 0;

        for (uint256 i = 0; i < indices.length; i++) {
            if (indices[i] >= strategies.length) revert InvalidStrategy();
            if (!strategies[indices[i]].active) revert StrategyNotActive();
            totalAlloc += allocations[i];
        }

        for (uint256 i = 0; i < strategies.length; i++) {
            if (strategies[i].active) {
                bool isUpdated = false;
                for (uint256 j = 0; j < indices.length; j++) {
                    if (indices[j] == i) {
                        isUpdated = true;
                        break;
                    }
                }
                if (!isUpdated) {
                    totalAlloc += strategies[i].allocationBps;
                }
            }
        }

        if (totalAlloc != 10000) revert AllocationMustBe100();

        for (uint256 i = 0; i < indices.length; i++) {
            strategies[indices[i]].allocationBps = allocations[i];
        }

        emit AllocationsUpdated(indices, allocations);
    }

    function deposit(
        uint256 assets,
        address receiver
    ) public virtual override nonReentrant returns (uint256 shares) {
        shares = previewDeposit(assets);
        IERC20(asset()).safeTransferFrom(msg.sender, address(this), assets);
        _mint(receiver, shares);
        _allocateToStrategies(assets);
        emit Deposit(msg.sender, receiver, assets, shares);
    }

    function withdraw(
        uint256 assets,
        address receiver,
        address owner
    ) public virtual override nonReentrant returns (uint256 shares) {
        shares = previewWithdraw(assets);

        if (msg.sender != owner) {
            _spendAllowance(owner, msg.sender, shares);
        }

        uint256 balance = IERC20(asset()).balanceOf(address(this));
        if (balance < assets) {
            _withdrawFromStrategies(assets - balance);
            balance = IERC20(asset()).balanceOf(address(this));
        }

        if (assets > balance) {
            assets = balance;
        }

        _burn(owner, shares);
        IERC20(asset()).safeTransfer(receiver, assets);

        emit Withdraw(msg.sender, receiver, owner, assets, shares);
    }

    function redeem(
        uint256 shares,
        address receiver,
        address owner
    ) public virtual override nonReentrant returns (uint256 assets) {
        if (msg.sender != owner) {
            _spendAllowance(owner, msg.sender, shares);
        }

        assets = previewRedeem(shares);

        uint256 balance = IERC20(asset()).balanceOf(address(this));
        if (balance < assets) {
            _withdrawFromStrategies(assets - balance);
            balance = IERC20(asset()).balanceOf(address(this));
        }

        if (assets > balance) {
            assets = balance;
        }

        _burn(owner, shares);
        IERC20(asset()).safeTransfer(receiver, assets);

        emit Withdraw(msg.sender, receiver, owner, assets, shares);
    }

    /**
     * @notice Harvests yield from all strategies
     * @dev Can be called by owner or authorized Nitrolite operators (e.g., VaultRouter)
     * @return Net yield after fees
     */
    function harvest() external nonReentrant returns (uint256) {
        // Allow owner OR Nitrolite operators (like VaultRouter) to harvest
        require(
            msg.sender == owner() || verifiedNitroliteOperators[msg.sender],
            "Not authorized to harvest"
        );

        uint256 balanceBefore = IERC20(asset()).balanceOf(address(this));

        for (uint256 i = 0; i < strategies.length; i++) {
            if (strategies[i].active) {
                IStrategy(strategies[i].strategy).harvest();
            }
        }

        uint256 balanceAfter = IERC20(asset()).balanceOf(address(this));
        uint256 yield = balanceAfter > balanceBefore
            ? balanceAfter - balanceBefore
            : 0;

        uint256 fee = 0;
        if (yield > 0) {
            fee = (yield * performanceFeeBps) / 10000;
            if (fee > 0) {
                IERC20(asset()).safeTransfer(feeRecipient, fee);
            }
        }

        totalHarvested += (yield - fee);
        lastHarvestTime = block.timestamp;

        emit Harvested(yield, fee, block.timestamp);
        return yield - fee;
    }

    function rebalance() external nonReentrant onlyOwner {
        _rebalance();
    }

    function batchRebalanceUsers(
        address[] calldata users
    ) external nonReentrant onlyVerifiedNitroliteOperator {
        _rebalance();

        for (uint256 i = 0; i < users.length; i++) {
            emit UserRebalanceSettled(users[i]);
        }
    }

    function _rebalance() internal {
        uint256 totalVaultAssets = totalAssets();
        if (totalVaultAssets == 0) return;

        // 🔑 CRITICAL: Harvest FIRST to collect all accumulated yield
        // Without this, yield stays trapped in strategies during rebalancing
        for (uint256 i = 0; i < strategies.length; i++) {
            if (strategies[i].active) {
                IStrategy(strategies[i].strategy).harvest();
            }
        }

        // Then withdraw everything
        for (uint256 i = 0; i < strategies.length; i++) {
            if (strategies[i].active) {
                IStrategy(strategies[i].strategy).withdrawAll();
            }
        }

        uint256 vaultBalance = IERC20(asset()).balanceOf(address(this));
        _allocateToStrategies(vaultBalance);

        emit Rebalanced(block.timestamp, totalVaultAssets);
    }

    function _allocateToStrategies(uint256 amount) internal {
        if (amount == 0) return;

        for (uint256 i = 0; i < strategies.length; i++) {
            if (strategies[i].active) {
                uint256 strategyAmount = (amount *
                    strategies[i].allocationBps) / 10000;
                if (strategyAmount > 0) {
                    IERC20(asset()).forceApprove(
                        strategies[i].strategy,
                        strategyAmount
                    );
                    IStrategy(strategies[i].strategy).deposit(
                        strategyAmount,
                        address(this)
                    );
                }
            }
        }
    }

    function _withdrawFromStrategies(uint256 amount) internal {
        if (amount == 0) return;

        uint256 totalStrategyAssets = 0;
        uint256[] memory strategyAssets = new uint256[](strategies.length);

        for (uint256 i = 0; i < strategies.length; i++) {
            if (strategies[i].active) {
                strategyAssets[i] = IStrategy(strategies[i].strategy)
                    .totalAssets();
                totalStrategyAssets += strategyAssets[i];
            }
        }

        uint256 withdrawn = 0;
        for (uint256 i = 0; i < strategies.length; i++) {
            if (strategies[i].active && strategyAssets[i] > 0) {
                uint256 toWithdraw = (amount * strategyAssets[i]) /
                    totalStrategyAssets;

                // Cap at available strategy assets
                if (toWithdraw > strategyAssets[i]) {
                    toWithdraw = strategyAssets[i];
                }

                if (toWithdraw > 0) {
                    withdrawn += IStrategy(strategies[i].strategy).withdraw(
                        toWithdraw,
                        address(this),
                        address(this)
                    );
                }
            }
        }

        if (withdrawn < amount) {
            uint256 balance = IERC20(asset()).balanceOf(address(this));
            if (balance < amount) {
                // Shortfall handled by calling function
            }
        }
    }

    function totalAssets() public view virtual override returns (uint256) {
        uint256 total = IERC20(asset()).balanceOf(address(this));

        for (uint256 i = 0; i < strategies.length; i++) {
            if (strategies[i].active) {
                total += IStrategy(strategies[i].strategy).totalAssets();
            }
        }

        return total;
    }

    function estimatedAPY() external view returns (uint256) {
        uint256 totalWeightedAPY = 0;
        uint256 totalAssetValue = 0;

        for (uint256 i = 0; i < strategies.length; i++) {
            if (strategies[i].active) {
                uint256 stratAssets = IStrategy(strategies[i].strategy)
                    .totalAssets();
                uint256 stratAPY = IStrategy(strategies[i].strategy)
                    .estimatedAPY();
                totalWeightedAPY += stratAssets * stratAPY;
                totalAssetValue += stratAssets;
            }
        }

        return totalAssetValue == 0 ? 0 : totalWeightedAPY / totalAssetValue;
    }

    function getAllStrategies()
        external
        view
        returns (StrategyAllocation[] memory)
    {
        return strategies;
    }

    function getStrategy(
        uint256 index
    )
        external
        view
        returns (
            address strategy,
            uint16 allocationBps,
            bool active,
            uint256 totalAssets_
        )
    {
        if (index >= strategies.length) revert InvalidStrategy();

        StrategyAllocation memory s = strategies[index];
        strategy = s.strategy;
        allocationBps = s.allocationBps;
        active = s.active;
        totalAssets_ = active ? IStrategy(s.strategy).totalAssets() : 0;
    }

    function isAllocationValid() external view returns (bool, uint256) {
        uint256 total = 0;
        for (uint256 i = 0; i < strategies.length; i++) {
            if (strategies[i].active) {
                total += strategies[i].allocationBps;
            }
        }
        return (total == 10000, total);
    }

    function setPerformanceFee(uint256 _feeBps) external onlyOwner {
        if (_feeBps > 2000) revert FeeTooHigh();
        uint256 oldFee = performanceFeeBps;
        performanceFeeBps = _feeBps;
        emit PerformanceFeeUpdated(oldFee, _feeBps);
    }

    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        if (_feeRecipient == address(0)) revert InvalidAddress();
        address oldRecipient = feeRecipient;
        feeRecipient = _feeRecipient;
        emit FeeRecipientUpdated(oldRecipient, _feeRecipient);
    }

    function emergencyWithdraw(
        uint256 strategyIndex
    ) external onlyOwner nonReentrant {
        if (strategyIndex >= strategies.length) revert InvalidStrategy();
        if (!strategies[strategyIndex].active) revert StrategyNotActive();

        uint256 recovered = IStrategy(strategies[strategyIndex].strategy)
            .withdrawAll();
        emit EmergencyExit(strategyIndex, recovered);
    }

    function settleRebalance(
        uint8 riskTier,
        uint256[] calldata indices,
        uint8[] calldata allocations,
        uint256 nonce,
        bytes calldata signature
    ) external override {
        bytes32 structHash = keccak256(
            abi.encode(
                REBALANCE_TYPEHASH,
                riskTier,
                keccak256(abi.encodePacked(indices)),
                keccak256(abi.encodePacked(allocations)),
                nonce
            )
        );

        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, signature);

        require(
            verifiedNitroliteOperators[signer],
            "Invalid signature or unauthorized operator"
        );
        require(nonces[signer] == nonce, "Invalid nonce");
        nonces[signer]++;

        // Implement rebalance logic for Nitrolite operator
        uint16[] memory allocations16 = new uint16[](allocations.length);
        for (uint256 i = 0; i < allocations.length; i++) {
            allocations16[i] = uint16(allocations[i]) * 100;
        }
        _updateAllocations(indices, allocations16);
    }

    function settleTransfer(
        address user,
        uint256 amount,
        bool isWithdraw
    ) external override onlyVerifiedNitroliteOperator {
        revert("Not implemented");
    }
}
