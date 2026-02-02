// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/VaultRouter.sol";
import "../src/vaults/BaseVault.sol";
import "../src/strategies/BaseStrategy.sol";
import "../src/tokens/VirtualUSDC.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// Mock Risk NFT
contract MockRiskNFT is IRiskNFT {
    mapping(address => bool) public hasProfileMap;
    mapping(address => RiskProfile) public profiles;

    function setProfile(
        address user,
        uint8 low,
        uint8 med,
        uint8 high
    ) external {
        hasProfileMap[user] = true;
        profiles[user] = RiskProfile(low, med, high);
    }

    function hasProfile(address user) external view returns (bool) {
        return hasProfileMap[user];
    }

    function getRiskProfile(
        address user
    ) external view returns (RiskProfile memory) {
        return profiles[user];
    }
}

contract VaultRouterTest is Test {
    using SafeERC20 for IERC20;

    VirtualUSDC public asset;
    BaseVault public lowVault;
    BaseVault public medVault;
    BaseVault public highVault;

    StrategyFactory public factory;
    VaultRouter public router;
    MockRiskNFT public riskNFT;

    address public user = address(0x1);
    address public feeRecipient = address(0x99);

    function setUp() public {
        vm.startPrank(user);

        // 1. Deploy Asset
        asset = new VirtualUSDC();

        // 2. Deploy Factory
        factory = new StrategyFactory();

        // 3. Deploy Vaults
        lowVault = new BaseVault(
            IERC20(address(asset)),
            "Low Vault",
            "LOW",
            feeRecipient
        );
        medVault = new BaseVault(
            IERC20(address(asset)),
            "Med Vault",
            "MED",
            feeRecipient
        );
        highVault = new BaseVault(
            IERC20(address(asset)),
            "High Vault",
            "HIGH",
            feeRecipient
        );

        // 4. Add Strategies to Vaults (Simplifying with 1 strategy each for now)
        address s1 = factory.createStrategy(
            IERC20(address(asset)),
            "LStrat",
            500,
            95,
            10
        ); // 5%
        BaseStrategy(s1).setVault(address(lowVault));
        asset.addMinter(s1);
        lowVault.addStrategy(s1, 10000);

        address s2 = factory.createStrategy(
            IERC20(address(asset)),
            "MStrat",
            1000,
            95,
            10
        ); // 10%
        BaseStrategy(s2).setVault(address(medVault));
        asset.addMinter(s2);
        medVault.addStrategy(s2, 10000);

        address s3 = factory.createStrategy(
            IERC20(address(asset)),
            "HStrat",
            2000,
            95,
            10
        ); // 20%
        BaseStrategy(s3).setVault(address(highVault));
        asset.addMinter(s3);
        highVault.addStrategy(s3, 10000);

        // 5. Deploy RiskNFT
        riskNFT = new MockRiskNFT();
        riskNFT.setProfile(user, 50, 30, 20); // Default: 50% Low, 30% Med, 20% High

        // 6. Deploy Router
        router = new VaultRouter(
            address(asset),
            address(riskNFT),
            address(lowVault),
            address(medVault),
            address(highVault)
        );

        vm.stopPrank();
    }

    function test_DepositRoutesCorrectly() public {
        vm.startPrank(user);
        uint256 amount = 1000e18;
        asset.mint(user, amount);
        IERC20(address(asset)).forceApprove(address(router), amount);

        router.deposit(amount);

        // Check shares in Router (UserPosition)
        (uint256 lShares, uint256 mShares, uint256 hShares) = router
            .getUserVaultShares(user);

        // Expecting 500 in Low, 300 in Med, 200 in High (in assets terms)
        // Since shares are 1:1 initially:
        assertApproxEqAbs(lowVault.convertToAssets(lShares), 500e18, 1e15);
        assertApproxEqAbs(medVault.convertToAssets(mShares), 300e18, 1e15);
        assertApproxEqAbs(highVault.convertToAssets(hShares), 200e18, 1e15);

        // Check Vault balances
        assertEq(lowVault.totalAssets(), 500e18);
        assertEq(medVault.totalAssets(), 300e18);
        assertEq(highVault.totalAssets(), 200e18);

        vm.stopPrank();
    }

    function test_WithdrawAll() public {
        vm.startPrank(user);
        uint256 amount = 1000e18;
        asset.mint(user, amount);
        IERC20(address(asset)).forceApprove(address(router), amount);
        router.deposit(amount);

        // Simulate yield? Not strictly needed for routing check but good for completeness
        vm.warp(block.timestamp + 100 days);

        uint256 withdrawn = router.withdrawAll();

        assertApproxEqAbs(withdrawn, amount, 1e16); // Should be at least original, maybe more with yield
        assertEq(asset.balanceOf(user), withdrawn);

        // Verify User Position deleted
        (uint256 l, uint256 m, uint256 h) = router.getUserVaultShares(user);
        assertEq(l, 0);
        assertEq(m, 0);
        assertEq(h, 0);

        vm.stopPrank();
    }

    function test_PartialWithdraw() public {
        vm.startPrank(user);
        uint256 amount = 1000e18;
        asset.mint(user, amount);
        IERC20(address(asset)).forceApprove(address(router), amount);
        router.deposit(amount);

        // Withdraw 50% (5000 bps)
        uint256 withdrawn = router.withdrawPartial(5000);

        assertApproxEqAbs(withdrawn, 500e18, 1e15);

        // Remaining should be approx 50%
        uint256 remainingValue = router.getUserTotalValue(user);
        assertApproxEqAbs(remainingValue, 500e18, 1e15);

        vm.stopPrank();
    }

    function test_Rebalance() public {
        vm.startPrank(user);
        // Initial Profile: 50/30/20
        uint256 amount = 1000e18;
        asset.mint(user, amount);
        IERC20(address(asset)).forceApprove(address(router), amount);
        router.deposit(amount);

        // Change Profile to Aggressive: 0/20/80
        riskNFT.setProfile(user, 0, 20, 80);

        router.rebalance();

        // Check new distribution
        (uint256 lShares, uint256 mShares, uint256 hShares) = router
            .getUserVaultShares(user);

        // Low should be 0
        assertEq(lShares, 0);

        // Med should be 20% of 1000 = 200
        assertApproxEqAbs(medVault.convertToAssets(mShares), 200e18, 1e15);

        // High should be 80% of 1000 = 800
        assertApproxEqAbs(highVault.convertToAssets(hShares), 800e18, 1e15);

        vm.stopPrank();
    }

    function test_RevertNoProfile() public {
        vm.startPrank(user);
        asset.mint(address(0xDEAD), 100e18);
        vm.stopPrank();

        vm.startPrank(address(0xDEAD));
        IERC20(address(asset)).forceApprove(address(router), 100e18);

        vm.expectRevert(VaultRouter.NoProfile.selector);
        router.deposit(100e18);
        vm.stopPrank();
    }
}
