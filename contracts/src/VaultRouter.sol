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

    IVault public immutable lowRiskVault;
    IVault public immutable medRiskVault;
    IVault public immutable highRiskVault;

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
    event Rebalanced(address indexed user, uint256 timestamp);

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
        lowRiskVault = IVault(_lowRiskVault);
        medRiskVault = IVault(_medRiskVault);
        highRiskVault = IVault(_highRiskVault);
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

        uint256 lowAlloc = (amount * profile.lowPct) / 100;
        uint256 medAlloc = (amount * profile.medPct) / 100;
        uint256 highAlloc = amount - lowAlloc - medAlloc;

        depositToken.safeTransferFrom(msg.sender, address(this), amount);

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

    function rebalance() external nonReentrant {
        if (!riskNFT.hasProfile(msg.sender)) revert NoProfile();

        UserPosition memory oldPos = userPositions[msg.sender];
        if (
            oldPos.lowShares == 0 &&
            oldPos.medShares == 0 &&
            oldPos.highShares == 0
        ) {
            revert NoPosition();
        }

        uint256 currentValue = getUserTotalValue(msg.sender);
        if (currentValue == 0) revert ZeroAmount();

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

        uint256 totalAssets = lowAssets + medAssets + highAssets;

        IRiskNFT.RiskProfile memory newProfile = riskNFT.getRiskProfile(
            msg.sender
        );

        uint256 newLowAlloc = (totalAssets * newProfile.lowPct) / 100;
        uint256 newMedAlloc = (totalAssets * newProfile.medPct) / 100;
        uint256 newHighAlloc = totalAssets - newLowAlloc - newMedAlloc;

        uint256 newLowShares = 0;
        uint256 newMedShares = 0;
        uint256 newHighShares = 0;

        if (newLowAlloc > 0) {
            depositToken.forceApprove(address(lowRiskVault), newLowAlloc);
            newLowShares = lowRiskVault.deposit(newLowAlloc, address(this));
        }

        if (newMedAlloc > 0) {
            depositToken.forceApprove(address(medRiskVault), newMedAlloc);
            newMedShares = medRiskVault.deposit(newMedAlloc, address(this));
        }

        if (newHighAlloc > 0) {
            depositToken.forceApprove(address(highRiskVault), newHighAlloc);
            newHighShares = highRiskVault.deposit(newHighAlloc, address(this));
        }

        UserPosition storage pos = userPositions[msg.sender];
        pos.lowShares = newLowShares;
        pos.medShares = newMedShares;
        pos.highShares = newHighShares;

        emit Rebalanced(msg.sender, block.timestamp);
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
}
