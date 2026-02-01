// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

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
