// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IYieldReserve
 * @notice Interface for the YieldReserve contract
 */
interface IYieldReserve {
    /**
     * @notice Distribute yield to a strategy
     * @param strategy Strategy address to receive yield
     * @param amount Amount of USDC to distribute
     */
    function distributeYield(address strategy, uint256 amount) external;

    /**
     * @notice Get available reserve balance
     * @return Available USDC in the reserve
     */
    function availableReserve() external view returns (uint256);

    /**
     * @notice Check if a strategy is authorized
     * @param strategy Strategy address to check
     * @return Whether the strategy is authorized
     */
    function authorizedStrategies(
        address strategy
    ) external view returns (bool);
}
