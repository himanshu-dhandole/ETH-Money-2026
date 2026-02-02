// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/vaults/BaseVault.sol";

contract AddOperator is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address operator = 0x1967A8Bacec9Af4E06C5B8626837aa16a9678b8f; // From backend .env

        address lowVault = 0xD4b1b84E1F55c7c2DCDCa8EdD538654C1b762FC7;
        address medVault = 0x112b2f395bB6121a9b5eF1Ad7340eF9Af5e3C4d4;
        address highVault = 0x5f8Ce0E1534C62d0297235d31016eb5b8B225189;

        vm.startBroadcast(deployerPrivateKey);

        BaseVault(lowVault).setNitroliteOperator(operator, true);
        BaseVault(medVault).setNitroliteOperator(operator, true);
        BaseVault(highVault).setNitroliteOperator(operator, true);

        vm.stopBroadcast();

        console.log("Operator authorized for all vaults:", operator);
    }
}
