// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface INitroliteVault {
    function settleRebalance(
        uint8 riskTier,
        uint256[] calldata indices,
        uint8[] calldata allocations,
        uint256 nonce,
        bytes calldata signature
    ) external;

    function settleTransfer(
        address user,
        uint256 amount,
        bool isWithdraw
    ) external;
}
