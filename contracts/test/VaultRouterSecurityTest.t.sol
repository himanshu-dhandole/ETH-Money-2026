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

// Malicious Token for Reentrancy Test
contract ReentrantToken is ERC20 {
    address public victim;
    bool public attackMode;

    constructor() ERC20("Malicious", "MAL") {}

    function setVictim(address _victim) external {
        victim = _victim;
    }

    function setAttackMode(bool _attack) external {
        attackMode = _attack;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override returns (bool) {
        if (attackMode && msg.sender == victim) {
            // Callback into deposit while transferFrom is happening (on deposit)
            // Or just logging reentrancy attempt
            // If we try to call VaultRouter.deposit here, it should revert due to nonReentrant
            VaultRouter(victim).deposit(100);
        }
        return super.transferFrom(from, to, amount);
    }
}

contract VaultRouterSecurityTest is Test {
    using SafeERC20 for IERC20;

    VirtualUSDC public asset;
    BaseVault public lowVault;
    BaseVault public medVault;
    BaseVault public highVault;

    StrategyFactory public factory;
    VaultRouter public router;
    MockRiskNFT public riskNFT;

    address public user = address(0x1);
    address public user2 = address(0x2);

    function setUp() public {
        vm.startPrank(user);

        asset = new VirtualUSDC();
        factory = new StrategyFactory();

        lowVault = new BaseVault(
            IERC20(address(asset)),
            "Low Vault",
            "LOW",
            address(0x99)
        );
        medVault = new BaseVault(
            IERC20(address(asset)),
            "Med Vault",
            "MED",
            address(0x99)
        );
        highVault = new BaseVault(
            IERC20(address(asset)),
            "High Vault",
            "HIGH",
            address(0x99)
        );

        // Stub strategies (no need for complex strategies for router logic test, but Vault requires at least one active strategy? No.)
        // Actually Vault works with idle funds. Easier for testing router mechanics.

        riskNFT = new MockRiskNFT();
        riskNFT.setProfile(user, 50, 30, 20);

        router = new VaultRouter(
            address(asset),
            address(riskNFT),
            address(lowVault),
            address(medVault),
            address(highVault)
        );

        vm.stopPrank();
    }

    // 1. Approval Safety
    function test_RepeatedDepositsDoNotFailApprove() public {
        vm.startPrank(user);
        asset.mint(user, 2000e18);
        IERC20(address(asset)).forceApprove(address(router), type(uint256).max);

        router.deposit(1000e18);
        router.deposit(1000e18); // should not revert

        vm.stopPrank();
    }

    // 2. Multi-User Isolation
    function test_MultiUserIsolation() public {
        address alice = address(0xA);
        address bob = address(0xB);

        // Setup
        vm.startPrank(user); // owner of NFT
        riskNFT.setProfile(alice, 50, 30, 20);
        riskNFT.setProfile(bob, 20, 30, 50);

        asset.mint(alice, 1000e18);
        asset.mint(bob, 1000e18);
        vm.stopPrank();

        vm.startPrank(alice);
        IERC20(address(asset)).forceApprove(address(router), type(uint256).max);
        router.deposit(1000e18);
        vm.stopPrank();

        vm.startPrank(bob);
        IERC20(address(asset)).forceApprove(address(router), type(uint256).max);
        router.deposit(1000e18);
        vm.stopPrank();

        uint256 aliceValue = router.getUserTotalValue(alice);
        uint256 bobValue = router.getUserTotalValue(bob);

        assertApproxEqAbs(aliceValue, 1000e18, 1e15);
        assertApproxEqAbs(bobValue, 1000e18, 1e15);

        // Ensure no cross-contamination
        (uint256 lA, , ) = router.getUserVaultShares(alice);
        (uint256 lB, , ) = router.getUserVaultShares(bob);

        // Alice low: 500. Bob low: 200.
        // Shares should be proportional.
        // 500 assets / 1 asset per share = 500 shares.
        uint256 lowVaultAssets = lowVault.totalAssets(); // 700
        uint256 lowVaultShares = lowVault.totalSupply(); // 700

        assertApproxEqAbs(lowVault.convertToAssets(lA), 500e18, 1e15);
        assertApproxEqAbs(lowVault.convertToAssets(lB), 200e18, 1e15);
    }

    // 3. Reentrancy
    function test_ReentrancyProtection() public {
        vm.startPrank(user);

        // Deploy malicious token
        ReentrantToken malToken = new ReentrantToken();
        malToken.mint(user, 1000e18);

        // We need a Router that uses this token
        BaseVault lV = new BaseVault(
            IERC20(address(malToken)),
            "L",
            "L",
            address(0x99)
        );
        BaseVault mV = new BaseVault(
            IERC20(address(malToken)),
            "M",
            "M",
            address(0x99)
        );
        BaseVault hV = new BaseVault(
            IERC20(address(malToken)),
            "H",
            "H",
            address(0x99)
        );

        VaultRouter malRouter = new VaultRouter(
            address(malToken),
            address(riskNFT),
            address(lV),
            address(mV),
            address(hV)
        );

        malToken.setVictim(address(malRouter));
        malToken.attackMode();

        riskNFT.setProfile(user, 100, 0, 0);

        malToken.approve(address(malRouter), 1000e18);

        // Enable attack
        malToken.setAttackMode(true);

        vm.expectRevert(ReentrancyGuard.ReentrancyGuardReentrantCall.selector);
        malRouter.deposit(100e18);

        vm.stopPrank();
    }

    // 4. Emergency / Panic Desync
    function test_WithdrawAfterVaultEmergency() public {
        vm.startPrank(user);
        asset.mint(user, 1000e18);
        IERC20(address(asset)).forceApprove(address(router), type(uint256).max);

        // Add a strategy to lowVault so emergencyWithdraw actually does something
        address strat = factory.createStrategy(
            IERC20(address(asset)),
            "S",
            100,
            100,
            0
        );
        BaseStrategy(strat).setVault(address(lowVault));
        asset.addMinter(strat);
        lowVault.addStrategy(strat, 10000);

        router.deposit(1000e18);

        // Emergency withdraw strategy 0 in lowVault
        lowVault.emergencyWithdraw(0);

        // User should still be able to withdraw something
        uint256 received = router.withdrawAll();
        assertApproxEqAbs(received, 1000e18, 1e15);

        vm.stopPrank();
    }

    // 5. Dust & Rounding
    function test_DustAndRounding() public {
        vm.startPrank(user);
        uint256 amount = 1000e18;
        asset.mint(user, amount);
        IERC20(address(asset)).forceApprove(address(router), amount);
        router.deposit(amount);

        // Withdraw 10% (1000 bps)
        uint256 w1 = router.withdrawPartial(1000);
        assertApproxEqAbs(w1, 100e18, 1e15);

        // Withdraw 10% of remaining (which is 900) -> 90
        uint256 w2 = router.withdrawPartial(1000);
        assertApproxEqAbs(w2, 90e18, 1e15);

        // Users position should be approx 810
        assertApproxEqAbs(router.getUserTotalValue(user), 810e18, 1e15);

        // Withdraw ALL
        uint256 w3 = router.withdrawAll();
        assertApproxEqAbs(w3, 810e18, 1e15);

        assertEq(router.getUserTotalValue(user), 0);

        vm.stopPrank();
    }
}
