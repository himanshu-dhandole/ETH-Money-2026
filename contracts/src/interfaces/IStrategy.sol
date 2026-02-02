// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/interfaces/IERC4626.sol";

interface IStrategy is IERC4626 {
    function withdrawAll() external returns (uint256);
    function harvest() external returns (uint256);
    function estimatedAPY() external view returns (uint256);
}
