// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/interfaces/IERC4626.sol";

interface IVault is IERC4626 {
    function estimatedAPY() external view returns (uint256);
}
