// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/strategies/BaseStrategy.sol";
import "../src/tokens/VirtualUSDC.sol";

contract BaseStrategyTest is Test {
    StrategyFactory public factory;
    VirtualUSDC public usdc;

    address public owner = address(1);
    address public vault = address(2);
    address public user1 = address(3);

    BaseStrategy public lowStrategy;
    BaseStrategy public midStrategy;
    BaseStrategy public highStrategy;

    function setUp() public {
        vm.startPrank(owner);

        // Deploy Mock USDC
        usdc = new VirtualUSDC();

        // Deploy Factory
        factory = new StrategyFactory();

        // Create Low Risk Strategy: 5% APY, 95% min, 10% range (95-105%)
        lowStrategy = BaseStrategy(
            factory.createStrategy(IERC20(address(usdc)), "Low", 500, 95, 10)
        );

        // Create Mid Risk Strategy: 15% APY, 85% min, 30% range (85-115%)
        midStrategy = BaseStrategy(
            factory.createStrategy(IERC20(address(usdc)), "Mid", 1500, 85, 30)
        );

        // Create High Risk Strategy: 30% APY, 70% min, 60% range (70-130%)
        highStrategy = BaseStrategy(
            factory.createStrategy(IERC20(address(usdc)), "High", 3000, 70, 60)
        );

        // Authorize strategies to mint yield
        usdc.addMinter(address(lowStrategy));
        usdc.addMinter(address(midStrategy));
        usdc.addMinter(address(highStrategy));

        // Assign vaults
        lowStrategy.setVault(vault);
        midStrategy.setVault(vault);
        highStrategy.setVault(vault);

        vm.stopPrank();
    }

    function test_InitialState() public view {
        assertEq(lowStrategy.vault(), vault);
        assertEq(lowStrategy.baseAPY(), 500);
        assertEq(midStrategy.baseAPY(), 1500);
        assertEq(highStrategy.baseAPY(), 3000);

        assertEq(lowStrategy.name(), "Aura Low Strategy");
        assertEq(midStrategy.name(), "Aura Mid Strategy");
        assertEq(highStrategy.name(), "Aura High Strategy");
    }

    function test_DepositWithdraw() public {
        uint256 amount = 1000e18;
        deal(address(usdc), vault, amount);

        vm.startPrank(vault);
        usdc.approve(address(lowStrategy), amount);

        // Deposit
        uint256 shares = lowStrategy.deposit(amount, vault);
        assertEq(shares, amount);
        assertEq(lowStrategy.totalAssets(), amount);
        assertEq(usdc.balanceOf(address(lowStrategy)), amount);

        // Withdraw
        lowStrategy.withdraw(amount, vault, vault);
        assertEq(lowStrategy.totalAssets(), 0);
        assertEq(usdc.balanceOf(vault), amount);
        vm.stopPrank();
    }

    function test_YieldAccumulation() public {
        uint256 amount = 1000e18;
        deal(address(usdc), vault, amount);

        vm.startPrank(vault);
        usdc.approve(address(midStrategy), amount);
        midStrategy.deposit(amount, vault);
        vm.stopPrank();

        // Warp time by 6 months
        vm.warp(block.timestamp + 182 days);

        uint256 midAssets = midStrategy.totalAssets();
        // 15% APY -> ~7.5% in 6 months
        // 1000 + (1000 * 0.15 * 0.5) = 1075
        // Since random factor is 85-115, it should be between 1063 and 1086

        assertGt(midAssets, amount, "Yield should be positive");
        console.log("Mid strategy assets after 6 months:", midAssets);
    }

    function test_Harvest() public {
        uint256 amount = 1000e18;
        deal(address(usdc), vault, amount);

        vm.startPrank(vault);
        usdc.approve(address(highStrategy), amount);
        highStrategy.deposit(amount, vault);

        // Warp 1 year
        vm.warp(block.timestamp + 365 days);

        uint256 assetsBefore = highStrategy.totalAssets();

        // Harvest yield to the vault
        uint256 harvested = highStrategy.harvest();

        assertGt(harvested, 0, "Should harvest some yield");
        assertEq(
            usdc.balanceOf(vault),
            harvested,
            "Vault should receive yield"
        );

        // totalAssets should still reflect the principal + any pending yield generated since harvest call start
        // Actually harvest calls _generateYield first.
        assertEq(highStrategy.accumulatedYield(), 0);

        vm.stopPrank();
    }

    function test_OnlyVaultCanInteract() public {
        uint256 amount = 100e18;
        deal(address(usdc), user1, amount);

        vm.startPrank(user1);
        usdc.approve(address(lowStrategy), amount);

        vm.expectRevert(BaseStrategy.OnlyVault.selector);
        lowStrategy.deposit(amount, user1);

        vm.expectRevert(BaseStrategy.OnlyVault.selector);
        lowStrategy.harvest();
        vm.stopPrank();
    }

    function test_RestrictSetters() public {
        vm.startPrank(user1);
        vm.expectRevert(
            abi.encodeWithSignature(
                "OwnableUnauthorizedAccount(address)",
                user1
            )
        );
        lowStrategy.setBaseAPY(1000);
        vm.stopPrank();

        vm.startPrank(owner);
        lowStrategy.setBaseAPY(1000);
        assertEq(lowStrategy.baseAPY(), 1000);
        vm.stopPrank();
    }
}
