// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../interfaces/IVirtualUSDC.sol";
import "../interfaces/IStrategy.sol";
import "../interfaces/IYieldReserve.sol";

abstract contract BaseStrategy is ERC4626, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    error OnlyVault();
    error InvalidVault();
    error InvalidAPY();
    error InvalidPeriod();
    error MinFactorTooHigh();
    error RangeTooWide();
    error InvalidYieldReserve();

    address public vault;
    address public yieldReserve;
    uint256 public lastHarvest;
    uint256 public totalHarvested;
    uint256 public baseAPY;
    uint256 public yieldPeriod = 360;
    uint256 public lastYieldUpdate;
    uint256 public accumulatedYield;
    uint256 public lastRandomFactor = 100;

    uint256 public immutable minRandomFactor;
    uint256 public immutable randomRange;

    event Harvested(uint256 amount, uint256 timestamp);
    event YieldGenerated(uint256 amount);
    event VaultUpdated(address indexed oldVault, address indexed newVault);
    event BaseAPYUpdated(uint256 oldAPY, uint256 newAPY);
    event YieldPeriodUpdated(uint256 oldPeriod, uint256 newPeriod);
    event YieldReserveUpdated(
        address indexed oldReserve,
        address indexed newReserve
    );
    event YieldReserveFailed(uint256 requestedAmount, uint256 availableReserve);

    modifier onlyVault() {
        if (msg.sender != vault) revert OnlyVault();
        _;
    }

    constructor(
        IERC20 _asset,
        string memory _name,
        string memory _symbol,
        uint256 _baseAPY,
        uint256 _minRandomFactor,
        uint256 _randomRange,
        address _owner
    ) ERC4626(_asset) ERC20(_name, _symbol) Ownable(_owner) {
        require(_minRandomFactor <= 200, "min too high");
        require(_randomRange <= 100, "range too wide");

        baseAPY = _baseAPY;
        minRandomFactor = _minRandomFactor;
        randomRange = _randomRange;
        lastYieldUpdate = block.timestamp;
    }

    function setVault(address _vault) external onlyOwner {
        if (_vault == address(0)) revert InvalidVault();
        address oldVault = vault;
        vault = _vault;
        emit VaultUpdated(oldVault, _vault);
    }

    function setYieldReserve(address _yieldReserve) external onlyOwner {
        if (_yieldReserve == address(0)) revert InvalidYieldReserve();
        address oldReserve = yieldReserve;
        yieldReserve = _yieldReserve;
        emit YieldReserveUpdated(oldReserve, _yieldReserve);
    }

    function setBaseAPY(uint256 _baseAPY) external onlyOwner {
        if (_baseAPY == 0 || _baseAPY > 10000) revert InvalidAPY();
        uint256 oldAPY = baseAPY;
        baseAPY = _baseAPY;
        emit BaseAPYUpdated(oldAPY, _baseAPY);
    }

    function _generateYield() internal {
        uint256 timeElapsed = block.timestamp - lastYieldUpdate;
        if (timeElapsed == 0) return;

        uint256 baseAssets = IERC20(asset()).balanceOf(address(this));

        if (baseAssets == 0) {
            lastYieldUpdate = block.timestamp;
            return;
        }

        uint256 baseYield = (baseAssets * baseAPY * timeElapsed) /
            (yieldPeriod * 10000);
        uint256 randomSeed = uint256(
            keccak256(
                abi.encodePacked(
                    block.timestamp,
                    block.prevrandao,
                    address(this)
                )
            )
        );
        uint256 randomFactor = (randomSeed % randomRange) + minRandomFactor;
        lastRandomFactor = randomFactor;

        uint256 yieldAmount = (baseYield * randomFactor) / 100;

        // ✅ Request yield from reserve instead of minting
        if (yieldAmount > 0 && yieldReserve != address(0)) {
            try
                IYieldReserve(yieldReserve).distributeYield(
                    address(this),
                    yieldAmount
                )
            {
                accumulatedYield += yieldAmount;
                emit YieldGenerated(yieldAmount);
            } catch {
                // Reserve empty or insufficient - emit event for monitoring
                uint256 available = IYieldReserve(yieldReserve)
                    .availableReserve();
                emit YieldReserveFailed(yieldAmount, available);
                // Continue without generating yield
            }
        }

        lastYieldUpdate = block.timestamp;
    }

    function estimatedAPY() external view virtual returns (uint256) {
        return baseAPY;
    }

    /**
     * @notice Preview function for UI - simulates yield without modifying state
     * @dev UI should use this for smooth yield animations
     * @return Estimated total assets including simulated pending yield
     */
    function previewTotalAssets() external view returns (uint256) {
        uint256 baseAssets = IERC20(asset()).balanceOf(address(this));
        uint256 timeElapsed = block.timestamp - lastYieldUpdate;

        if (timeElapsed == 0 || baseAssets == 0) {
            return baseAssets;
        }

        // Simulate yield calculation without state modification
        uint256 baseYield = (baseAssets * baseAPY * timeElapsed) /
            (yieldPeriod * 10000);

        // Use last known random factor for estimation
        uint256 simulatedYield = (baseYield * lastRandomFactor) / 100;

        return baseAssets + simulatedYield;
    }

    /**
     * @notice Returns REAL balance only - truth source for withdrawals
     * @dev Never returns simulated/pending yield - only actual balance
     */
    function totalAssets() public view virtual override returns (uint256) {
        return IERC20(asset()).balanceOf(address(this));
    }

    function withdrawAll()
        external
        virtual
        onlyVault
        nonReentrant
        returns (uint256)
    {
        uint256 shares = balanceOf(msg.sender);
        if (shares == 0) return 0;
        return redeem(shares, msg.sender, msg.sender);
    }

    function deposit(
        uint256 assets,
        address receiver
    ) public virtual override onlyVault nonReentrant returns (uint256) {
        // _generateYield();
        return super.deposit(assets, receiver);
    }

    function withdraw(
        uint256 assets,
        address receiver,
        address owner
    ) public virtual override onlyVault nonReentrant returns (uint256) {
        return super.withdraw(assets, receiver, owner);
    }

    function harvest() external onlyVault nonReentrant returns (uint256) {
        _generateYield();
        uint256 harvestedAmount = accumulatedYield;
        if (harvestedAmount > 0) {
            totalHarvested += harvestedAmount;
            accumulatedYield = 0;
            lastHarvest = block.timestamp;
            IERC20(asset()).safeTransfer(vault, harvestedAmount);
            emit Harvested(harvestedAmount, block.timestamp);
        }
        return harvestedAmount;
    }
}

contract GenericStrategy is BaseStrategy {
    constructor(
        IERC20 _asset,
        string memory _name,
        string memory _symbol,
        uint256 _baseAPY,
        uint256 _minRandomFactor,
        uint256 _randomRange,
        address _owner
    )
        BaseStrategy(
            _asset,
            _name,
            _symbol,
            _baseAPY,
            _minRandomFactor,
            _randomRange,
            _owner
        )
    {}
}

contract StrategyFactory is Ownable {
    address[] public allStrategies;
    mapping(string => address) public getStrategyByName;

    event StrategyCreated(
        address indexed strategy,
        string name,
        uint256 baseAPY
    );

    constructor() Ownable(msg.sender) {}

    function createStrategy(
        IERC20 _asset,
        string calldata _riskLevel,
        uint256 _baseAPY,
        uint256 _minRandomFactor,
        uint256 _randomRange
    ) external onlyOwner returns (address) {
        string memory name = string(
            abi.encodePacked("Aura ", _riskLevel, " Strategy")
        );
        string memory symbol = string(abi.encodePacked("sAURA-", _riskLevel));
        GenericStrategy strategy = new GenericStrategy(
            _asset,
            name,
            symbol,
            _baseAPY,
            _minRandomFactor,
            _randomRange,
            msg.sender
        );
        address strategyAddr = address(strategy);
        allStrategies.push(strategyAddr);
        getStrategyByName[_riskLevel] = strategyAddr;
        emit StrategyCreated(strategyAddr, _riskLevel, _baseAPY);
        return strategyAddr;
    }

    function getStrategiesCount() external view returns (uint256) {
        return allStrategies.length;
    }
}
