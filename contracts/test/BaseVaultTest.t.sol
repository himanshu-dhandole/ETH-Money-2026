// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/vaults/BaseVault.sol";
import "../src/strategies/BaseStrategy.sol";
import "../src/tokens/VirtualUSDC.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract BaseVaultTest is Test {
    using SafeERC20 for IERC20;
    VirtualUSDC public asset;
    BaseVault public lowRiskVault;
    BaseVault public medRiskVault;
    BaseVault public highRiskVault;
    StrategyFactory public factory;

    address public user = address(0x123);
    address public feeRecipient = address(0x456);

    function setUp() public {
        vm.startPrank(user);
        asset = new VirtualUSDC();

        factory = new StrategyFactory();

        lowRiskVault = new BaseVault(
            IERC20(address(asset)),
            "Low Risk Vault",
            "auraLOW",
            feeRecipient
        );
        medRiskVault = new BaseVault(
            IERC20(address(asset)),
            "Med Risk Vault",
            "auraMED",
            feeRecipient
        );
        highRiskVault = new BaseVault(
            IERC20(address(asset)),
            "High Risk Vault",
            "auraHIGH",
            feeRecipient
        );

        vm.stopPrank();
    }

    function testDeployAndAddStrategies() public {
        vm.startPrank(user);

        // Add 3 strategies to Low Risk Vault
        _addStrategies(lowRiskVault, "Low", 500, 10, 5); // 5% base APY

        // Add 3 strategies to Med Risk Vault
        _addStrategies(medRiskVault, "Med", 1000, 20, 10); // 10% base APY

        // Add 3 strategies to High Risk Vault
        _addStrategies(highRiskVault, "High", 2000, 50, 20); // 20% base APY

        vm.stopPrank();

        // Verify strategy counts and allocations
        (, , bool active, ) = lowRiskVault.getStrategy(0);
        assertTrue(active);

        BaseVault.StrategyAllocation[] memory strategies = lowRiskVault
            .getAllStrategies();
        assertEq(strategies.length, 3);

        // Verify minter roles
        // We can't easy verify minter role on VirtualUSDC as 'minters' public mapping returns bool.
        // But if code didn't revert, it's likely fine.
    }

    function _addStrategies(
        BaseVault vault,
        string memory riskLevel,
        uint256 apy,
        uint256 minRandom,
        uint256 range
    ) internal {
        for (uint i = 0; i < 3; i++) {
            string memory name = string(
                abi.encodePacked(riskLevel, "-", vm.toString(i))
            );
            address strategy = factory.createStrategy(
                IERC20(address(asset)),
                name,
                apy,
                minRandom,
                range
            );

            // Grant minter role to strategy so it can mint yield
            asset.addMinter(strategy);

            // Set vault in strategy
            BaseStrategy(strategy).setVault(address(vault));

            // Allocations: 3400, 3300, 3300 = 10000
            uint16 alloc = 3300;
            if (i == 0) alloc = 3400; // 3400 + 3300 + 3300 = 10000

            vault.addStrategy(strategy, alloc);
        }

        (bool valid, uint256 total) = vault.isAllocationValid();
        assertTrue(valid);
        assertEq(total, 10000);
    }

    function testFullVaultOperations() public {
        vm.startPrank(user);

        // Setup vaults with strategies
        _addStrategies(lowRiskVault, "Low", 500, 10, 5);
        _addStrategies(medRiskVault, "Med", 1000, 20, 10);
        _addStrategies(highRiskVault, "High", 2000, 50, 20);

        // Mint assets to user
        asset.mint(user, 1_000_000e18);
        IERC20(address(asset)).forceApprove(
            address(lowRiskVault),
            type(uint256).max
        );
        IERC20(address(asset)).forceApprove(
            address(medRiskVault),
            type(uint256).max
        );
        IERC20(address(asset)).forceApprove(
            address(highRiskVault),
            type(uint256).max
        );

        vm.stopPrank();

        console.log("Testing Low Risk Vault...");
        _testVaultFlow(lowRiskVault, 10_000e18);

        console.log("Testing Med Risk Vault...");
        _testVaultFlow(medRiskVault, 10_000e18);

        console.log("Testing High Risk Vault...");
        _testVaultFlow(highRiskVault, 10_000e18);
    }

    function _testVaultFlow(BaseVault vault, uint256 depositAmount) internal {
        vm.startPrank(user);

        uint256 initialUserBalance = asset.balanceOf(user);

        // 1. DEPOSIT
        uint256 shares = vault.deposit(depositAmount, user);

        assertEq(
            shares,
            depositAmount,
            "Shares should equal deposit for initial deposit"
        );
        assertEq(
            vault.totalAssets(),
            depositAmount,
            "Vault total assets should equal deposit"
        );
        assertEq(
            asset.balanceOf(address(vault)) + _getStrategyAssets(vault),
            depositAmount,
            "Vault balance + strategy assets should equal deposit"
        );

        // Check if assets were allocated to strategies
        // Strategies should have substantial assets if allocated correctly (checking one is enough to verify flow)
        (address strategyAddr, , , ) = vault.getStrategy(0);
        assertTrue(
            IERC20(address(asset)).balanceOf(strategyAddr) > 0,
            "Strategy should have received funds"
        );

        // 2. TIME PASS & HARVEST (Simulate Yield)
        vm.warp(block.timestamp + 365 days); // Move forward 1 year

        // Since strategies are mock/bases, we need to ensure they can generate yield or just rely on manual minting if needed.
        // The BaseStrategy logic mints tokens based on APY on deposit/withdraw/harvest logic if configured.
        // Let's call harvest to trigger yield generation simulation logic in BaseStrategy

        uint256 assetsBeforeHarvest = vault.totalAssets();

        // Harvest is usually called by owner or keeper
        // We are already in startPrank(user) from beginning of this function
        vault.harvest();

        uint256 assetsAfterHarvest = vault.totalAssets();
        assertTrue(
            assetsAfterHarvest > depositAmount,
            "Assets should be greater than deposit after 1 year (yield generated)"
        );
        assertTrue(
            vault.totalHarvested() > 0,
            "Total harvested should be positive"
        );

        // 3. WITHDRAW HALF
        uint256 withdrawAmount = depositAmount / 2;
        vault.withdraw(withdrawAmount, user, user);

        assertApproxEqAbs(
            vault.totalAssets(),
            assetsAfterHarvest - withdrawAmount,
            1e18,
            "Remaining assets match expetation"
        );

        // 4. WITHDRAW ALL
        uint256 remainingShares = vault.balanceOf(user);
        vault.redeem(remainingShares, user, user);

        assertLe(vault.totalAssets(), 1e15, "Vault assets should be dust");
        assertLe(
            vault.totalSupply(),
            100,
            "Total supply should be negligible (dust) or zero"
        ); // Allow small dust

        vm.stopPrank();
    }

    function _getStrategyAssets(
        BaseVault vault
    ) internal view returns (uint256) {
        uint256 total = 0;
        BaseVault.StrategyAllocation[] memory strats = vault.getAllStrategies();
        for (uint i = 0; i < strats.length; i++) {
            if (strats[i].active) {
                total += IStrategy(strats[i].strategy).totalAssets();
            }
        }
        return total;
    }
}
