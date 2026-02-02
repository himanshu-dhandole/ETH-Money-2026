// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/vaults/BaseVault.sol";
import "../src/strategies/BaseStrategy.sol";
import "../src/tokens/VirtualUSDC.sol";

contract VigorousBaseTests is Test {
    VirtualUSDC public asset;
    BaseVault public vault;
    BaseStrategy public strategy;
    StrategyFactory public factory;

    address public user = address(0x100);
    address public user2 = address(0x101);
    address public feeRecipient = address(0x200);

    function setUp() public {
        vm.startPrank(user);
        asset = new VirtualUSDC();
        factory = new StrategyFactory();

        vault = new BaseVault(
            IERC20(address(asset)),
            "High Risk Vault",
            "AURA-H",
            feeRecipient
        );

        // Create a strategy via factory
        // APY: 20%, MinRandom: 90, Range: 20 -> Returns 90% to 110% of base yield
        address stratAddr = factory.createStrategy(
            IERC20(address(asset)),
            "High",
            2000,
            90,
            20
        );
        strategy = BaseStrategy(stratAddr);
        asset.addMinter(stratAddr);

        strategy.setVault(address(vault));
        vault.addStrategy(stratAddr, 10000); // 100% allocation

        vm.stopPrank();
    }

    /// @notice Fuzz test for single user deposit and withdraw life cycle
    function testFuzz_DepositWithdraw(uint256 amount) public {
        // Upper bound to prevent overflow in minting or large math
        amount = bound(amount, 1e6, 1_000_000_000e18);

        vm.startPrank(user);
        asset.mint(user, amount);
        asset.approve(address(vault), amount);

        uint256 shares = vault.deposit(amount, user);

        assertEq(shares, amount, "Shares not 1:1 on initial deposit");
        assertApproxEqAbs(vault.totalAssets(), amount, 1e18, "Assets mismatch");

        // Fast forward time to generate some yield
        vm.roll(block.number + 1000);
        vm.warp(block.timestamp + 30 days);

        // Harvest logic happens on withdraw/deposit automatically in strategy, but vault harvest function triggers fee
        vault.harvest();

        uint256 maxWithdraw = vault.maxWithdraw(user);
        assertTrue(
            maxWithdraw >= amount,
            "Should be able to withdraw at least principal + yield - fees"
        );

        uint256 received = vault.withdraw(maxWithdraw, user, user);

        // Assert user has more or equal to original amount (assuming positive yield and reasonable fees)
        // With 20% APY and 30 days, yield is approx 1.6%. Fee is 10%. User nets ~1.44%.
        if (amount > 1e6) {
            assertGe(received, amount, "User lost principal?");
        }

        assertLe(
            vault.totalAssets(),
            1e15,
            "Vault should be effectively empty"
        );
        vm.stopPrank();
    }

    /// @notice Test multiple strategies with rebalancing
    function test_MultiStrategyRebalance() public {
        vm.startPrank(user);

        // Add 2nd strategy
        address strat2 = factory.createStrategy(
            IERC20(address(asset)),
            "Mid",
            1000,
            95,
            10
        );
        BaseStrategy(strat2).setVault(address(vault));
        asset.addMinter(strat2);

        // Update allocations: 50% / 50%
        uint256[] memory indices = new uint256[](2);
        indices[0] = 0;
        indices[1] = 1;
        uint16[] memory allocs = new uint16[](2);
        allocs[0] = 5000;
        allocs[1] = 5000;

        // Need to add strategy first correctly
        // The first strategy is at index 0. We need to add the second one.
        // But addStrategy pushes to array. So we call addStrategy with 0 allocation first if we want to update later,
        // OR we just use updateAllocations to shift.
        // Current vault: strategy[0] = 10000.

        // Let's add new strategy with 0 allocation then update
        vault.addStrategy(strat2, 0);

        // Revert expected because total > 10000? NO, addStrategy checks total active.
        // Wait, addStrategy checks: totalAlloc + newAlloc <= 10000.
        // Currently totalAlloc is 10000. So adding with 0 is fine.

        vault.updateAllocations(indices, allocs);

        // Deposit
        uint256 depositAmt = 100_000e18;
        asset.mint(user, depositAmt);
        asset.approve(address(vault), depositAmt);
        vault.deposit(depositAmt, user);

        // Check allocations
        // The deposit function calls _allocateToStrategies
        // So both strategies should have approx 50%

        assertApproxEqAbs(
            IERC20(address(asset)).balanceOf(address(strategy)),
            depositAmt / 2,
            1e18
        );
        assertApproxEqAbs(
            IERC20(address(asset)).balanceOf(strat2),
            depositAmt / 2,
            1e18
        );

        vm.stopPrank();
    }

    /// @notice Test removing a strategy
    function test_RemoveStrategy() public {
        vm.startPrank(user);
        uint256 depositAmt = 100_000e18;
        asset.mint(user, depositAmt);
        asset.approve(address(vault), depositAmt);
        vault.deposit(depositAmt, user);

        // Strategy 0 has 100k
        assertGt(strategy.totalAssets(), 0);

        // Remove strategy 0
        vault.removeStrategy(0);

        // Should have withdrawn all
        assertEq(strategy.totalAssets(), 0);

        // Assets should be in vault idle
        assertEq(asset.balanceOf(address(vault)), depositAmt);

        vm.stopPrank();
    }

    /// @notice Test emergency exit
    function test_EmergencyExit() public {
        vm.startPrank(user);
        uint256 depositAmt = 100_000e18;
        asset.mint(user, depositAmt);
        asset.approve(address(vault), depositAmt);
        vault.deposit(depositAmt, user);

        vault.emergencyWithdraw(0); // non standard function, but present in BaseVault
        // Wait, emergencyWithdraw in BaseVault calls withdrawAll on strategy but DOES NOT return assets to user, stays in vault?
        // Checking BaseVault code:
        // IStrategy(strategies[strategyIndex].strategy).withdrawAll();
        // emit EmergencyExit...
        // Yes, it pulls to vault.

        assertEq(strategy.totalAssets(), 0);
        assertEq(asset.balanceOf(address(vault)), depositAmt);
        vm.stopPrank();
    }

    /// @notice Test unauthorized strategy interaction
    function test_UnauthorizedInteract() public {
        deal(address(asset), user2, 100e18);
        vm.startPrank(user2);
        asset.approve(address(strategy), 100e18);

        vm.expectRevert(BaseStrategy.OnlyVault.selector);
        strategy.deposit(100e18, user2);

        vm.expectRevert(BaseStrategy.OnlyVault.selector);
        strategy.withdraw(100e18, user2, user2);

        vm.stopPrank();
    }

    function test_AllocationValidation() public {
        vm.startPrank(user);

        address strat2 = factory.createStrategy(
            IERC20(address(asset)),
            "Mid",
            1000,
            95,
            10
        );
        BaseStrategy(strat2).setVault(address(vault));
        asset.addMinter(strat2);

        // Try adding strategy that exceeds 100%
        // Current is 100% (10000 bps)
        vm.expectRevert(BaseVault.InvalidAllocation.selector);
        vault.addStrategy(strat2, 100);

        vm.stopPrank();
    }
}
