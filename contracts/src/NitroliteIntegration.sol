// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

abstract contract NitroliteIntegration is Ownable {
    mapping(address => bool) public verifiedNitroliteOperators;
    event NitroliteOperatorUpdated(address indexed operator, bool verified);

    modifier onlyVerifiedNitroliteOperator() {
        require(verifiedNitroliteOperators[msg.sender], "Not a verified Nitrolite operator");
        _;
    }

    function setNitroliteOperator(address operator, bool verified) external onlyOwner {
        verifiedNitroliteOperators[operator] = verified;
        emit NitroliteOperatorUpdated(operator, verified);
    }
}
