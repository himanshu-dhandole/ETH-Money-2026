// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/YieldReserve.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title DeployYieldReserve
 * @notice Deploy YieldReserve contract ONCE and fund it with native Arc USDC
 * @dev Run with: forge script script/DeployYieldReserve.s.sol:DeployYieldReserve --broadcast --rpc-url <RPC>
 *
 * PREREQUISITES:
 * - Get USDC from Circle faucet: https://faucet.circle.com
 * - Set USDC_ADDRESS in .env (default: 0x3600000000000000000000000000000000000000)
 *
 * IMPORTANT: Run this ONCE, save the address, then use it in Deploy.s.sol
 */
contract DeployYieldReserve is Script {
    // Native Arc USDC address (6 decimals)
    address constant ARC_USDC = 0x3600000000000000000000000000000000000000;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deploying YieldReserve with address:", deployer);
        console.log("\n===========================================");

        // Use native Arc USDC
        address usdcAddress = vm.envOr("USDC_ADDRESS", ARC_USDC);
        console.log("Using Arc USDC at:", usdcAddress);

        IERC20 usdc = IERC20(usdcAddress);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy YieldReserve
        YieldReserve yieldReserve = new YieldReserve(usdcAddress);
        console.log("YieldReserve deployed at:", address(yieldReserve));

        // Check deployer's USDC balance
        uint256 deployerBalance = usdc.balanceOf(deployer);
        console.log("\nDeployer USDC balance:", deployerBalance / 1e6, "USDC");

        // Fund the reserve if deployer has USDC
        uint256 fundAmount = vm.envOr("RESERVE_FUND_AMOUNT", uint256(1000e6)); // 1000 USDC (6 decimals)

        if (deployerBalance >= fundAmount) {
            console.log("Funding reserve with:", fundAmount / 1e6, "USDC");
            usdc.approve(address(yieldReserve), fundAmount);
            yieldReserve.fund(fundAmount);

            // Verify funding
            (
                uint256 available,
                uint256 distributed,
                uint256 efficiency
            ) = yieldReserve.getStats();
            console.log("Reserve funded successfully!");
            console.log("  Available:", available / 1e6, "USDC");
            console.log("  Distributed:", distributed / 1e6, "USDC");
            console.log("  Efficiency:", efficiency, "%");
        } else {
            console.log(
                "\n[!] WARNING: Insufficient USDC balance to fund reserve!"
            );
            console.log("[!] You have:", deployerBalance / 1e6, "USDC");
            console.log("[!] Need:", fundAmount / 1e6, "USDC");
            console.log("\n[!] Get USDC from Circle faucet:");
            console.log("[!] https://faucet.circle.com");
            console.log("\n[!] Then fund the reserve manually:");
            console.log(
                "[!] cast send <YIELD_RESERVE> 'fund(uint256)' <AMOUNT> --rpc-url $RPC_URL"
            );
        }

        vm.stopBroadcast();

        // Print summary
        console.log("\n========== DEPLOYMENT SUMMARY ==========");
        console.log("Arc USDC:          ", usdcAddress);
        console.log("YieldReserve:      ", address(yieldReserve));
        console.log("Owner:             ", deployer);
        if (deployerBalance >= fundAmount) {
            console.log("Initial Funding:   ", fundAmount / 1e6, "USDC");
        } else {
            console.log("Initial Funding:    0 USDC (insufficient balance)");
        }
        console.log("\n[!] IMPORTANT: Save these addresses!");
        console.log("\nAdd to your .env file:");
        console.log("USDC_ADDRESS=", usdcAddress);
        console.log("YIELD_RESERVE_ADDRESS=", address(yieldReserve));
        console.log("\nThen run the main deployment script.");
        console.log("========================================\n");
    }
}
