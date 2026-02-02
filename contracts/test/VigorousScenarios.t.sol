// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/vaults/BaseVault.sol";
import "../src/strategies/BaseStrategy.sol";
import "../src/tokens/VirtualUSDC.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract VigorousScenariosTest is Test {
    using SafeERC20 for IERC20;

    VirtualUSDC public asset;
    BaseVault public vault;
    StrategyFactory public factory;

    address public user = address(0x1000);
    address public feeRecipient = address(0x2000);

    function setUp() public {
        vm.startPrank(user);
        asset = new VirtualUSDC();
        factory = new StrategyFactory();

        vault = new BaseVault(
            IERC20(address(asset)),
            "Scenarios Vault",
            "AURA-S",
            feeRecipient
        );

        // Add 1 high APY strategy (20%)
        address strat1 = factory.createStrategy(
            IERC20(address(asset)),
            "High1",
            2000,
            95,
            10
        );
        BaseStrategy(strat1).setVault(address(vault));
        asset.addMinter(strat1);
        vault.addStrategy(strat1, 5000); // 50%

        // Add 1 mid APY strategy (10%)
        address strat2 = factory.createStrategy(
            IERC20(address(asset)),
            "Mid1",
            1000,
            95,
            10
        );
        BaseStrategy(strat2).setVault(address(vault));
        asset.addMinter(strat2);
        vault.addStrategy(strat2, 5000); // 50%

        vm.stopPrank();
    }

    function test_PartialWithdrawalFlow() public {
        vm.startPrank(user);
        uint256 depositAmt = 100_000e18;
        asset.mint(user, depositAmt);
        IERC20(address(asset)).forceApprove(address(vault), depositAmt);

        vault.deposit(depositAmt, user);

        // Advance time 6 months
        vm.warp(block.timestamp + 182 days);
        // vault.harvest(); // Harvest updates indices. Withdraw also generates yield internally in strategy.

        // 1. Withdraw 10%
        uint256 withdraw1 = 10_000e18;
        vault.withdraw(withdraw1, user, user);

        uint256 balanceAfter1 = asset.balanceOf(user);
        assertGe(balanceAfter1, withdraw1, "Should have withdrawn 10k");

        // 2. Withdraw 50% of REMAINING shares
        uint256 shares = vault.balanceOf(user);
        vault.redeem(shares / 2, user, user);

        // 3. Withdraw ALL remaining
        uint256 remainingShares = vault.balanceOf(user);
        vault.redeem(remainingShares, user, user);

        assertLe(vault.totalAssets(), 1e15, "Vault should be empty");
        vm.stopPrank();
    }

    function test_EmergencyWithdrawalLifecycle() public {
        vm.startPrank(user);
        uint256 depositAmt = 100_000e18;
        asset.mint(user, depositAmt);
        IERC20(address(asset)).forceApprove(address(vault), depositAmt);
        vault.deposit(depositAmt, user);

        // Verify strategies have funds
        (address stratAddr, , , ) = vault.getStrategy(0);
        assertGt(IStrategy(stratAddr).totalAssets(), 0);

        // Emergency withdraw strategy 0
        vault.emergencyWithdraw(0);

        // Strategy 0 SHOULD be empty
        assertEq(
            IStrategy(stratAddr).totalAssets(),
            0,
            "Strategy should be empty"
        );

        // Vault should hold the funds as idle
        uint256 idle = IERC20(address(asset)).balanceOf(address(vault));
        // Should be approx 50k (allocation was 50%)
        assertApproxEqAbs(idle, 50_000e18, 1e18);

        // Strategy is still ACTIVE in storage (as logic dictates)
        // So a rebalance or deposit might send funds back?
        // Let's call rebalance
        vault.rebalance();

        // Funds should be sent back to strategies based on allocation
        // Since strat 0 is active and has 50% alloc, it should get funds back
        assertGt(
            IStrategy(stratAddr).totalAssets(),
            40_000e18,
            "Strategy should receive funds again after rebalance"
        );

        vm.stopPrank();
    }

    function test_HarvestAndFees() public {
        vm.startPrank(user);
        uint256 depositAmt = 100_000e18;
        asset.mint(user, depositAmt);
        IERC20(address(asset)).forceApprove(address(vault), depositAmt);
        vault.deposit(depositAmt, user);

        vm.warp(block.timestamp + 365 days);

        uint256 vaultAssetsBefore = vault.totalAssets();

        // Harvest
        vault.harvest();

        // Fee recipient check
        uint256 feeBalance = asset.balanceOf(feeRecipient);
        assertGt(feeBalance, 0, "Fee recipient should get paid");

        // If 20% APY on 50k and 10% APY on 50k -> Avg 15% APY on 100k -> 15k yield.
        // Fee 10% of 15k = 1.5k.
        console.log("Fee Paid:", feeBalance);
        assertApproxEqAbs(feeBalance, 1_500e18, 200e18); // Allow randomness variance

        vm.stopPrank();
    }

    function test_PanicMode() public {
        // Simulate a scenario where we want to exit a strategy completely and deactivate it
        vm.startPrank(user);
        uint256 depositAmt = 100_000e18;
        asset.mint(user, depositAmt);
        IERC20(address(asset)).forceApprove(address(vault), depositAmt);
        vault.deposit(depositAmt, user);

        // Remove strategy 0
        vault.removeStrategy(0);

        // Verify it's inactive
        (, , bool active, ) = vault.getStrategy(0);
        assertFalse(active);

        // Verify funds moved to idle or other strategy?
        // removeStrategy calls withdrawAll. Funds sit in vault idle.
        // We can update allocations of remaining strategy to 100% and rebalance.

        uint256[] memory indices = new uint256[](1);
        indices[0] = 1;
        uint16[] memory allocs = new uint16[](1);
        allocs[0] = 10000;

        vault.updateAllocations(indices, allocs);
        vault.rebalance();

        // Strategy 1 should now have ~100k (plus yield)
        (address strat2, , , ) = vault.getStrategy(1);
        assertApproxEqAbs(
            IStrategy(strat2).totalAssets(),
            100_000e18,
            5_000e18
        );

        vm.stopPrank();
    }
}
