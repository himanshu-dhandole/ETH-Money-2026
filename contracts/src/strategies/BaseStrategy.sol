// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../interfaces/IVirtualUSDC.sol";
import "../interfaces/IStrategy.sol";

abstract contract BaseStrategy is ERC4626, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    error OnlyVault();
    error InvalidVault();
    error InvalidAPY();
    error InvalidPeriod();
    error MinFactorTooHigh();
    error RangeTooWide();

    address public vault;
    uint256 public lastHarvest;
    uint256 public totalHarvested;
    uint256 public baseAPY;
    uint256 public yieldPeriod = 365 days;
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
        if (yieldAmount > 0) {
            IVirtualUSDC(address(asset())).mint(address(this), yieldAmount);
        }

        accumulatedYield += yieldAmount;
        lastYieldUpdate = block.timestamp;
        emit YieldGenerated(yieldAmount);
    }

    function estimatedAPY() external view virtual returns (uint256) {
        return baseAPY;
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
        _generateYield();
        return super.deposit(assets, receiver);
    }

    function withdraw(
        uint256 assets,
        address receiver,
        address owner
    ) public virtual override onlyVault nonReentrant returns (uint256) {
        _generateYield();
        return super.withdraw(assets, receiver, owner);
    }

    function totalAssets() public view virtual override returns (uint256) {
        return IERC20(asset()).balanceOf(address(this));
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
