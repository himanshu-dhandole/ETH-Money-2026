// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/interfaces/IERC4626.sol";
import "./interfaces/IVault.sol";

interface IRiskNFT {
    struct RiskProfile {
        uint8 lowPct;
        uint8 medPct;
        uint8 highPct;
    }
    function hasProfile(address user) external view returns (bool);
    function getRiskProfile(
        address user
    ) external view returns (RiskProfile memory);
}

interface IVaultWithHarvest is IVault {
    function harvest() external returns (uint256);
}

contract VaultRouter is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct UserPosition {
        uint256 lowShares;
        uint256 medShares;
        uint256 highShares;
        uint256 totalDeposited;
        uint256 depositTimestamp;
    }

    IERC20 public immutable depositToken;
    IRiskNFT public immutable riskNFT;

    IVaultWithHarvest public immutable lowRiskVault;
    IVaultWithHarvest public immutable medRiskVault;
    IVaultWithHarvest public immutable highRiskVault;

    mapping(address => UserPosition) public userPositions;

    event Deposited(
        address indexed user,
        uint256 amount,
        uint256 lowShares,
        uint256 medShares,
        uint256 highShares
    );
    event Withdrawn(
        address indexed user,
        uint256 amountReceived,
        uint256 lowSharesBurned,
        uint256 medSharesBurned,
        uint256 highSharesBurned
    );
    event PartialWithdrawal(
        address indexed user,
        uint256 percentage,
        uint256 amountReceived
    );
    event Rebalanced(
        address indexed user,
        uint256 timestamp,
        uint256 totalHarvested
    );
    event Harvested(
        uint256 lowVaultYield,
        uint256 medVaultYield,
        uint256 highVaultYield,
        uint256 totalYield
    );
    event BatchRebalance(address[] users);

    error NoProfile();
    error ZeroAmount();
    error NoPosition();
    error InsufficientShares();
    error InvalidPercentage();
    error InvalidAddress();

    constructor(
        address _depositToken,
        address _riskNFT,
        address _lowRiskVault,
        address _medRiskVault,
        address _highRiskVault
    ) Ownable(msg.sender) {
        if (
            _depositToken == address(0) ||
            _riskNFT == address(0) ||
            _lowRiskVault == address(0) ||
            _medRiskVault == address(0) ||
            _highRiskVault == address(0)
        ) {
            revert InvalidAddress();
        }

        depositToken = IERC20(_depositToken);
        riskNFT = IRiskNFT(_riskNFT);
        lowRiskVault = IVaultWithHarvest(_lowRiskVault);
        medRiskVault = IVaultWithHarvest(_medRiskVault);
        highRiskVault = IVaultWithHarvest(_highRiskVault);
    }

    function deposit(
        uint256 amount
    )
        external
        nonReentrant
        returns (uint256 lowShares, uint256 medShares, uint256 highShares)
    {
        if (amount == 0) revert ZeroAmount();
        if (!riskNFT.hasProfile(msg.sender)) revert NoProfile();

        IRiskNFT.RiskProfile memory profile = riskNFT.getRiskProfile(
            msg.sender
        );

        depositToken.safeTransferFrom(msg.sender, address(this), amount);

        (lowShares, medShares, highShares) = _depositByProfile(amount, profile);

        UserPosition storage pos = userPositions[msg.sender];
        pos.lowShares += lowShares;
        pos.medShares += medShares;
        pos.highShares += highShares;
        pos.totalDeposited += amount;
        pos.depositTimestamp = block.timestamp;

        emit Deposited(msg.sender, amount, lowShares, medShares, highShares);
    }

    function withdrawAll()
        external
        nonReentrant
        returns (uint256 totalReceived)
    {
        UserPosition memory pos = userPositions[msg.sender];
        if (pos.lowShares == 0 && pos.medShares == 0 && pos.highShares == 0) {
            revert NoPosition();
        }

        uint256 lowAssets = 0;
        uint256 medAssets = 0;
        uint256 highAssets = 0;

        if (pos.lowShares > 0) {
            lowAssets = lowRiskVault.redeem(
                pos.lowShares,
                address(this),
                address(this)
            );
        }
        if (pos.medShares > 0) {
            medAssets = medRiskVault.redeem(
                pos.medShares,
                address(this),
                address(this)
            );
        }
        if (pos.highShares > 0) {
            highAssets = highRiskVault.redeem(
                pos.highShares,
                address(this),
                address(this)
            );
        }

        totalReceived = lowAssets + medAssets + highAssets;

        delete userPositions[msg.sender];

        depositToken.safeTransfer(msg.sender, totalReceived);

        emit Withdrawn(
            msg.sender,
            totalReceived,
            pos.lowShares,
            pos.medShares,
            pos.highShares
        );
    }

    function withdrawPartial(
        uint256 percentageBps
    ) external nonReentrant returns (uint256 totalReceived) {
        if (percentageBps == 0 || percentageBps > 10000)
            revert InvalidPercentage();

        UserPosition storage pos = userPositions[msg.sender];
        if (pos.lowShares == 0 && pos.medShares == 0 && pos.highShares == 0) {
            revert NoPosition();
        }

        uint256 lowSharesToRedeem = (pos.lowShares * percentageBps) / 10000;
        uint256 medSharesToRedeem = (pos.medShares * percentageBps) / 10000;
        uint256 highSharesToRedeem = (pos.highShares * percentageBps) / 10000;

        uint256 lowAssets = 0;
        uint256 medAssets = 0;
        uint256 highAssets = 0;

        if (lowSharesToRedeem > 0) {
            lowAssets = lowRiskVault.redeem(
                lowSharesToRedeem,
                address(this),
                address(this)
            );
            pos.lowShares -= lowSharesToRedeem;
        }
        if (medSharesToRedeem > 0) {
            medAssets = medRiskVault.redeem(
                medSharesToRedeem,
                address(this),
                address(this)
            );
            pos.medShares -= medSharesToRedeem;
        }
        if (highSharesToRedeem > 0) {
            highAssets = highRiskVault.redeem(
                highSharesToRedeem,
                address(this),
                address(this)
            );
            pos.highShares -= highSharesToRedeem;
        }

        totalReceived = lowAssets + medAssets + highAssets;
        pos.totalDeposited =
            (pos.totalDeposited * (10000 - percentageBps)) /
            10000;

        depositToken.safeTransfer(msg.sender, totalReceived);

        emit PartialWithdrawal(msg.sender, percentageBps, totalReceived);
    }

    /**
     * @notice Rebalances user's position according to their updated risk profile
     * @dev Automatically harvests from all vaults before rebalancing to maximize user value
     * @dev Resets cost basis to prevent permanent negative PnL
     */
    function rebalance(address user) public nonReentrant {
        if (!riskNFT.hasProfile(user)) revert NoProfile();

        UserPosition memory oldPos = userPositions[user];
        if (
            oldPos.lowShares == 0 &&
            oldPos.medShares == 0 &&
            oldPos.highShares == 0
        ) {
            revert NoPosition();
        }

        // STEP 1: Harvest all vaults FIRST
        uint256 totalHarvested = _harvestAll();

        // STEP 2: Withdraw everything and get total assets
        uint256 totalAssets = _withdrawAllUserShares(oldPos);
        if (totalAssets == 0) revert ZeroAmount();

        // STEP 3: Deposit according to new risk profile
        IRiskNFT.RiskProfile memory newProfile = riskNFT.getRiskProfile(user);
        (
            uint256 newLowShares,
            uint256 newMedShares,
            uint256 newHighShares
        ) = _depositByProfile(totalAssets, newProfile);

        // STEP 4: Update user position and reset cost basis
        UserPosition storage pos = userPositions[user];
        pos.lowShares = newLowShares;
        pos.medShares = newMedShares;
        pos.highShares = newHighShares;
        pos.totalDeposited = totalAssets; // Reset cost basis
        pos.depositTimestamp = block.timestamp;

        emit Rebalanced(user, block.timestamp, totalHarvested);
    }

    /**
     * @notice Withdraws all user shares from vaults
     * @param oldPos User's current position
     * @return totalAssets Total assets withdrawn
     */
    function _withdrawAllUserShares(
        UserPosition memory oldPos
    ) internal returns (uint256 totalAssets) {
        uint256 lowAssets = 0;
        uint256 medAssets = 0;
        uint256 highAssets = 0;

        if (oldPos.lowShares > 0) {
            lowAssets = lowRiskVault.redeem(
                oldPos.lowShares,
                address(this),
                address(this)
            );
        }
        if (oldPos.medShares > 0) {
            medAssets = medRiskVault.redeem(
                oldPos.medShares,
                address(this),
                address(this)
            );
        }
        if (oldPos.highShares > 0) {
            highAssets = highRiskVault.redeem(
                oldPos.highShares,
                address(this),
                address(this)
            );
        }

        return lowAssets + medAssets + highAssets;
    }

    /**
     * @notice Deposits assets according to risk profile
     * @param totalAssets Total assets to allocate
     * @param profile Risk profile with allocation percentages
     * @return lowShares Shares received from low risk vault
     * @return medShares Shares received from medium risk vault
     * @return highShares Shares received from high risk vault
     */
    function _depositByProfile(
        uint256 totalAssets,
        IRiskNFT.RiskProfile memory profile
    )
        internal
        returns (uint256 lowShares, uint256 medShares, uint256 highShares)
    {
        uint256 lowAlloc = (totalAssets * profile.lowPct) / 100;
        uint256 medAlloc = (totalAssets * profile.medPct) / 100;
        uint256 highAlloc = totalAssets - lowAlloc - medAlloc;

        if (lowAlloc > 0) {
            depositToken.forceApprove(address(lowRiskVault), lowAlloc);
            lowShares = lowRiskVault.deposit(lowAlloc, address(this));
        }

        if (medAlloc > 0) {
            depositToken.forceApprove(address(medRiskVault), medAlloc);
            medShares = medRiskVault.deposit(medAlloc, address(this));
        }

        if (highAlloc > 0) {
            depositToken.forceApprove(address(highRiskVault), highAlloc);
            highShares = highRiskVault.deposit(highAlloc, address(this));
        }

        return (lowShares, medShares, highShares);
    }

    /**
     * @notice Harvests yield from all three vaults
     * @dev Internal function called during rebalance, can also be called standalone
     * @return totalHarvested Total yield harvested from all vaults
     */
    function _harvestAll() internal returns (uint256 totalHarvested) {
        uint256 lowHarvest = 0;
        uint256 medHarvest = 0;
        uint256 highHarvest = 0;

        try lowRiskVault.harvest() returns (uint256 h) {
            lowHarvest = h;
        } catch {}
        try medRiskVault.harvest() returns (uint256 h) {
            medHarvest = h;
        } catch {}
        try highRiskVault.harvest() returns (uint256 h) {
            highHarvest = h;
        } catch {}
        totalHarvested = lowHarvest + medHarvest + highHarvest;

        if (totalHarvested > 0) {
            emit Harvested(lowHarvest, medHarvest, highHarvest, totalHarvested);
        }

        return totalHarvested;
    }

    /**
     * @notice Manually harvest all vaults (callable by anyone if router is authorized)
     * @dev Only works if VaultRouter is authorized as Nitrolite operator
     * @return totalHarvested Total yield harvested from all vaults
     */
    function harvestAll() external returns (uint256 totalHarvested) {
        totalHarvested = _harvestAll();
        if (totalHarvested == 0) revert ZeroAmount();
        return totalHarvested;
    }

    function getUserTotalValue(address user) public view returns (uint256) {
        UserPosition memory pos = userPositions[user];

        uint256 lowValue = pos.lowShares > 0
            ? lowRiskVault.convertToAssets(pos.lowShares)
            : 0;
        uint256 medValue = pos.medShares > 0
            ? medRiskVault.convertToAssets(pos.medShares)
            : 0;
        uint256 highValue = pos.highShares > 0
            ? highRiskVault.convertToAssets(pos.highShares)
            : 0;

        return lowValue + medValue + highValue;
    }

    function getUserPosition(
        address user
    )
        external
        view
        returns (
            uint256 lowShares,
            uint256 medShares,
            uint256 highShares,
            uint256 lowValue,
            uint256 medValue,
            uint256 highValue,
            uint256 totalValue,
            uint256 totalDeposited,
            int256 profitLoss
        )
    {
        UserPosition memory pos = userPositions[user];

        lowShares = pos.lowShares;
        medShares = pos.medShares;
        highShares = pos.highShares;

        lowValue = pos.lowShares > 0
            ? lowRiskVault.convertToAssets(pos.lowShares)
            : 0;
        medValue = pos.medShares > 0
            ? medRiskVault.convertToAssets(pos.medShares)
            : 0;
        highValue = pos.highShares > 0
            ? highRiskVault.convertToAssets(pos.highShares)
            : 0;

        totalValue = lowValue + medValue + highValue;
        totalDeposited = pos.totalDeposited;
        profitLoss = int256(totalValue) - int256(totalDeposited);
    }

    function getUserVaultShares(
        address user
    )
        external
        view
        returns (uint256 lowShares, uint256 medShares, uint256 highShares)
    {
        UserPosition memory pos = userPositions[user];
        return (pos.lowShares, pos.medShares, pos.highShares);
    }

    function getVaults()
        external
        view
        returns (address low, address med, address high)
    {
        return (
            address(lowRiskVault),
            address(medRiskVault),
            address(highRiskVault)
        );
    }

    function getUserEstimatedAPY(address user) external view returns (uint256) {
        UserPosition memory pos = userPositions[user];

        uint256 lowValue = pos.lowShares > 0
            ? lowRiskVault.convertToAssets(pos.lowShares)
            : 0;
        uint256 medValue = pos.medShares > 0
            ? medRiskVault.convertToAssets(pos.medShares)
            : 0;
        uint256 highValue = pos.highShares > 0
            ? highRiskVault.convertToAssets(pos.highShares)
            : 0;

        uint256 totalValue = lowValue + medValue + highValue;
        if (totalValue == 0) return 0;

        uint256 weightedAPY = 0;

        if (lowValue > 0) {
            weightedAPY +=
                (lowValue * lowRiskVault.estimatedAPY()) /
                totalValue;
        }
        if (medValue > 0) {
            weightedAPY +=
                (medValue * medRiskVault.estimatedAPY()) /
                totalValue;
        }
        if (highValue > 0) {
            weightedAPY +=
                (highValue * highRiskVault.estimatedAPY()) /
                totalValue;
        }

        return weightedAPY;
    }

    function getProtocolStats()
        external
        view
        returns (
            uint256 totalValueLocked,
            uint256 lowVaultTVL,
            uint256 medVaultTVL,
            uint256 highVaultTVL
        )
    {
        lowVaultTVL = lowRiskVault.totalAssets();
        medVaultTVL = medRiskVault.totalAssets();
        highVaultTVL = highRiskVault.totalAssets();
        totalValueLocked = lowVaultTVL + medVaultTVL + highVaultTVL;
    }

    function getVaultAPYs()
        external
        view
        returns (uint256 lowAPY, uint256 medAPY, uint256 highAPY)
    {
        return (
            lowRiskVault.estimatedAPY(),
            medRiskVault.estimatedAPY(),
            highRiskVault.estimatedAPY()
        );
    }

    function batchRebalance(address[] calldata users) external {
        for (uint256 i = 0; i < users.length; i++) {
            rebalance(users[i]);
        }
        emit BatchRebalance(users);
    }
}
