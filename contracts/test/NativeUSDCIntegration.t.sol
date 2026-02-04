// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/YieldReserve.sol";
import "../src/RiskNFT.sol";
import "../src/vaults/BaseVault.sol";
import "../src/VaultRouter.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title NativeUSDCIntegrationTest
 * @notice Integration test for native Arc USDC compatibility
 * @dev Tests the entire flow with native USDC (6 decimals)
 */
contract NativeUSDCIntegrationTest is Test {
    // Native Arc USDC address
    address constant ARC_USDC = 0x3600000000000000000000000000000000000000;

    IERC20 usdc;
    YieldReserve yieldReserve;
    RiskNFT riskNFT;
    BaseVault lowVault;
    BaseVault medVault;
    BaseVault highVault;
    VaultRouter router;

    address deployer = address(this);
    address user1 = address(0x1);
    address user2 = address(0x2);

    function setUp() public {
        // Use native Arc USDC
        usdc = IERC20(ARC_USDC);

        // Deploy YieldReserve
        yieldReserve = new YieldReserve(ARC_USDC);

        // Deploy RiskNFT
        riskNFT = new RiskNFT();

        // Deploy Vaults
        lowVault = new BaseVault(
            usdc,
            "Aura Low Risk Vault",
            "AURA-LOW",
            deployer
        );

        medVault = new BaseVault(
            usdc,
            "Aura Medium Risk Vault",
            "AURA-MED",
            deployer
        );

        highVault = new BaseVault(
            usdc,
            "Aura High Risk Vault",
            "AURA-HIGH",
            deployer
        );

        // Deploy Router
        router = new VaultRouter(
            ARC_USDC,
            address(riskNFT),
            address(lowVault),
            address(medVault),
            address(highVault)
        );

        // Authorize router as Nitrolite operator
        lowVault.setNitroliteOperator(address(router), true);
        medVault.setNitroliteOperator(address(router), true);
        highVault.setNitroliteOperator(address(router), true);
    }

    function testYieldReserveUsesCorrectUSDC() public view {
        // Verify YieldReserve uses correct USDC
        assertEq(
            address(yieldReserve.usdc()),
            ARC_USDC,
            "YieldReserve should use Arc USDC"
        );
    }

    function testVaultsUseCorrectUSDC() public view {
        // Verify all vaults use correct USDC
        assertEq(lowVault.asset(), ARC_USDC, "Low vault should use Arc USDC");
        assertEq(medVault.asset(), ARC_USDC, "Med vault should use Arc USDC");
        assertEq(highVault.asset(), ARC_USDC, "High vault should use Arc USDC");
    }

    function testRouterUsesCorrectUSDC() public view {
        // Verify router uses correct USDC
        assertEq(
            address(router.depositToken()),
            ARC_USDC,
            "Router should use Arc USDC"
        );
    }

    function testFundYieldReserveWith6Decimals() public {
        // Simulate having USDC (6 decimals)
        uint256 fundAmount = 1000e6; // 1000 USDC

        // Mock USDC balance
        deal(ARC_USDC, deployer, fundAmount);

        // Approve and fund
        usdc.approve(address(yieldReserve), fundAmount);
        yieldReserve.fund(fundAmount);

        // Verify funding
        (uint256 available, , ) = yieldReserve.getStats();
        assertEq(available, fundAmount, "Reserve should have 1000 USDC");
    }

    function testDepositWithdrawFlow() public {
        // Setup: Fund reserve and give user USDC
        uint256 reserveFund = 1000e6; // 1000 USDC
        uint256 userDeposit = 100e6; // 100 USDC

        deal(ARC_USDC, deployer, reserveFund);
        deal(ARC_USDC, user1, userDeposit);

        // Fund reserve
        usdc.approve(address(yieldReserve), reserveFund);
        yieldReserve.fund(reserveFund);

        // Create risk profile for user
        vm.prank(user1);
        riskNFT.mint(30, 40, 30); // 30% low, 40% med, 30% high

        // User deposits
        vm.startPrank(user1);
        usdc.approve(address(router), userDeposit);
        router.deposit(userDeposit);
        vm.stopPrank();

        // Verify deposit
        uint256 userValue = router.getUserTotalValue(user1);
        assertGt(userValue, 0, "User should have value in vaults");
        assertApproxEqAbs(
            userValue,
            userDeposit,
            1,
            "User value should be close to deposit"
        );

        // User withdraws
        vm.prank(user1);
        uint256 withdrawn = router.withdrawAll();

        // Verify withdrawal
        assertGt(withdrawn, 0, "User should receive USDC");
        assertEq(
            usdc.balanceOf(user1),
            withdrawn,
            "User should have withdrawn USDC"
        );
        assertApproxEqAbs(
            withdrawn,
            userDeposit,
            1,
            "Withdrawn should be close to deposit"
        );
    }

    function testCorrectDecimalHandling() public pure {
        // Test that amounts are handled correctly with 6 decimals
        uint256 amount1000USDC = 1000e6;
        uint256 amount100USDC = 100e6;
        uint256 amount1USDC = 1e6;

        assertEq(amount1000USDC, 1000000000, "1000 USDC should be 1000000000");
        assertEq(amount100USDC, 100000000, "100 USDC should be 100000000");
        assertEq(amount1USDC, 1000000, "1 USDC should be 1000000");
    }

    function testReserveStatsWithCorrectDecimals() public {
        uint256 fundAmount = 500e6; // 500 USDC

        deal(ARC_USDC, deployer, fundAmount);
        usdc.approve(address(yieldReserve), fundAmount);
        yieldReserve.fund(fundAmount);

        (
            uint256 available,
            uint256 distributed,
            uint256 efficiency
        ) = yieldReserve.getStats();

        assertEq(available, 500e6, "Available should be 500 USDC");
        assertEq(distributed, 0, "Distributed should be 0");
        assertEq(efficiency, 0, "Efficiency should be 0%");
    }

    function testMultipleUsersDepositWithdraw() public {
        // Setup
        uint256 reserveFund = 10000e6; // 10000 USDC
        deal(ARC_USDC, deployer, reserveFund);
        usdc.approve(address(yieldReserve), reserveFund);
        yieldReserve.fund(reserveFund);

        // User 1 deposits 100 USDC
        deal(ARC_USDC, user1, 100e6);
        vm.startPrank(user1);
        riskNFT.mint(30, 40, 30);
        usdc.approve(address(router), 100e6);
        router.deposit(100e6);
        vm.stopPrank();

        // User 2 deposits 200 USDC
        deal(ARC_USDC, user2, 200e6);
        vm.startPrank(user2);
        riskNFT.mint(20, 50, 30);
        usdc.approve(address(router), 200e6);
        router.deposit(200e6);
        vm.stopPrank();

        // Verify both users have positions
        assertGt(router.getUserTotalValue(user1), 0, "User1 should have value");
        assertGt(router.getUserTotalValue(user2), 0, "User2 should have value");

        // User 1 withdraws
        vm.prank(user1);
        uint256 withdrawn1 = router.withdrawAll();
        assertGt(withdrawn1, 0, "User1 should receive USDC");

        // User 2 still has position
        assertGt(
            router.getUserTotalValue(user2),
            0,
            "User2 should still have value"
        );

        // User 2 withdraws
        vm.prank(user2);
        uint256 withdrawn2 = router.withdrawAll();
        assertGt(withdrawn2, 0, "User2 should receive USDC");
    }
}
