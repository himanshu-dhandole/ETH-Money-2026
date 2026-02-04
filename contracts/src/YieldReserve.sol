// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title YieldReserve
 * @notice Holds USDC to simulate yield distribution to strategies
 * @dev Owner pre-funds this contract with USDC for demonstrations
 *
 * This contract acts as a "yield bank" that strategies can draw from
 * to simulate realistic yield generation without needing to mint tokens.
 * Perfect for hackathon demos with real USDC on Arc testnet!
 */
contract YieldReserve is Ownable {
    IERC20 public immutable usdc;

    /// @notice Authorized strategies that can claim yield
    mapping(address => bool) public authorizedStrategies;

    /// @notice Track total distributed to monitor reserve health
    uint256 public totalDistributed;

    /// @notice Track distributions per strategy for analytics
    mapping(address => uint256) public distributedPerStrategy;

    event YieldDistributed(address indexed strategy, uint256 amount);
    event StrategyAuthorized(address indexed strategy, bool authorized);
    event Funded(address indexed funder, uint256 amount);
    event EmergencyWithdraw(address indexed recipient, uint256 amount);

    error Unauthorized();
    error InsufficientReserve();
    error ZeroAmount();
    error ZeroAddress();

    constructor(address _usdc) Ownable(msg.sender) {
        if (_usdc == address(0)) revert ZeroAddress();
        usdc = IERC20(_usdc);
    }

    /**
     * @notice Fund the reserve with USDC
     * @param amount Amount of USDC to deposit
     * @dev Anyone can fund the reserve to support yield generation
     */
    function fund(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        usdc.transferFrom(msg.sender, address(this), amount);
        emit Funded(msg.sender, amount);
    }

    /**
     * @notice Authorize a strategy to claim yield
     * @param strategy Strategy contract address
     * @param authorized Whether the strategy is authorized
     */
    function authorizeStrategy(
        address strategy,
        bool authorized
    ) external onlyOwner {
        if (strategy == address(0)) revert ZeroAddress();
        authorizedStrategies[strategy] = authorized;
        emit StrategyAuthorized(strategy, authorized);
    }

    /**
     * @notice Batch authorize multiple strategies
     * @param strategies Array of strategy addresses
     * @param authorized Authorization status for all strategies
     */
    function batchAuthorizeStrategies(
        address[] calldata strategies,
        bool authorized
    ) external onlyOwner {
        for (uint256 i = 0; i < strategies.length; i++) {
            if (strategies[i] == address(0)) revert ZeroAddress();
            authorizedStrategies[strategies[i]] = authorized;
            emit StrategyAuthorized(strategies[i], authorized);
        }
    }

    /**
     * @notice Distribute yield to a strategy
     * @param strategy Strategy address to receive yield
     * @param amount Amount of USDC to distribute
     * @dev Only callable by authorized strategies
     */
    function distributeYield(address strategy, uint256 amount) external {
        if (!authorizedStrategies[msg.sender]) revert Unauthorized();
        if (amount == 0) revert ZeroAmount();

        uint256 available = usdc.balanceOf(address(this));
        if (available < amount) revert InsufficientReserve();

        totalDistributed += amount;
        distributedPerStrategy[msg.sender] += amount;

        usdc.transfer(strategy, amount);

        emit YieldDistributed(strategy, amount);
    }

    /**
     * @notice Get available reserve balance
     * @return Available USDC in the reserve
     */
    function availableReserve() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }

    /**
     * @notice Get reserve health as percentage (100 = healthy, 0 = empty)
     * @param targetReserve Target reserve amount for comparison
     * @return Health percentage (0-100)
     */
    function reserveHealth(
        uint256 targetReserve
    ) external view returns (uint256) {
        if (targetReserve == 0) return 100;
        uint256 current = usdc.balanceOf(address(this));
        if (current >= targetReserve) return 100;
        return (current * 100) / targetReserve;
    }

    /**
     * @notice Emergency withdraw (owner only)
     * @param amount Amount to withdraw (0 = withdraw all)
     * @dev Use with caution - will stop yield generation if reserve is emptied
     */
    function emergencyWithdraw(uint256 amount) external onlyOwner {
        uint256 balance = usdc.balanceOf(address(this));
        uint256 withdrawAmount = amount == 0 ? balance : amount;

        if (withdrawAmount > balance) revert InsufficientReserve();

        usdc.transfer(owner(), withdrawAmount);
        emit EmergencyWithdraw(owner(), withdrawAmount);
    }

    /**
     * @notice Get statistics for monitoring
     * @return available Current USDC balance
     * @return distributed Total USDC distributed to strategies
     * @return efficiency Percentage of reserve used (0-100)
     */
    function getStats()
        external
        view
        returns (uint256 available, uint256 distributed, uint256 efficiency)
    {
        available = usdc.balanceOf(address(this));
        distributed = totalDistributed;

        uint256 total = available + distributed;
        efficiency = total == 0 ? 0 : (distributed * 100) / total;
    }
}
