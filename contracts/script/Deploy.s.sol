// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../src/RiskNFT.sol";
import "../src/vaults/BaseVault.sol";
import "../src/strategies/BaseStrategy.sol";
import "../src/VaultRouter.sol";
import "../src/YieldReserve.sol";

/**
 * @title DeployScript
 * @notice Deploys the complete Aura protocol with 3 vaults and 9 strategies
 * @dev Run with: forge script script/Deploy.s.sol:Deploy --broadcast --rpc-url <RPC>
 *
 * PREREQUISITES:
 * 1. Deploy YieldReserve ONCE using DeployYieldReserve.s.sol
 * 2. Set USDC_ADDRESS (Arc native USDC) and YIELD_RESERVE_ADDRESS in .env
 * 3. Then run this script
 *
 * DEPLOYMENT STRATEGY:
 * - Deployer retains vault ownership for admin control
 * - Router gets Nitrolite operator role to call harvest during rebalancing
 * - YieldReserve is reused across deployments (not redeployed)
 * - Uses native Arc USDC (6 decimals) - NOT VirtualUSDC
 */
contract Deploy is Script {
    // Native Arc USDC address (6 decimals)
    address constant ARC_USDC = 0x3600000000000000000000000000000000000000;
    address constant ARC_ENS_REGISTERY = 0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e;

    IERC20 public usdc;
    RiskNFT public riskNFT;
    StrategyFactory public factory;
    YieldReserve public yieldReserve;
    BaseVault public lowVault;
    BaseVault public medVault;
    BaseVault public highVault;
    VaultRouter public router;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deploying with address:", deployer);

        vm.startBroadcast(deployerPrivateKey);

        // Load existing USDC and YieldReserve (or deploy if not set)
        _loadOrDeployCoreInfrastructure();

        // Deploy new RiskNFT and StrategyFactory
        _deployNewInfrastructure();

        // Deploy vaults (deployer remains owner)
        _deployVaults(deployer);

        // Deploy strategies
        _deployLowRiskStrategies();
        _deployMediumRiskStrategies();
        _deployHighRiskStrategies();

        // Deploy router
        _deployRouter();

        // Configure YieldReserve with new strategies
        _configureYieldReserve();

        // Authorize Nitrolite operator (Keeper) from backend
        address operator = deployer;
        lowVault.setNitroliteOperator(operator, true);
        medVault.setNitroliteOperator(operator, true);
        highVault.setNitroliteOperator(operator, true);

        // 🔑 KEY CHANGE: Authorize VaultRouter to harvest
        // This allows users to trigger harvest during rebalancing
        // while deployer retains full ownership for admin operations
        lowVault.setNitroliteOperator(address(router), true);
        medVault.setNitroliteOperator(address(router), true);
        highVault.setNitroliteOperator(address(router), true);

        vm.stopBroadcast();

        _printDeploymentSummary();
    }

    function _loadOrDeployCoreInfrastructure() internal {
        // Load USDC from environment (should be Arc native USDC)
        address usdcAddress = vm.envOr("USDC_ADDRESS", ARC_USDC);

        console.log("[OK] Using Arc native USDC at:", usdcAddress);
        usdc = IERC20(usdcAddress);

        // Verify it's the correct USDC
        if (usdcAddress != ARC_USDC) {
            console.log("[!] WARNING: Using non-standard USDC address!");
            console.log("[!] Expected Arc USDC:", ARC_USDC);
        }

        // Load YieldReserve from environment (REQUIRED)
        address yieldReserveAddress = vm.envOr(
            "YIELD_RESERVE_ADDRESS",
            address(0)
        );

        if (yieldReserveAddress != address(0)) {
            console.log(
                "[OK] Using existing YieldReserve at:",
                yieldReserveAddress
            );
            yieldReserve = YieldReserve(yieldReserveAddress);

            // Verify it's funded
            (uint256 available, , ) = yieldReserve.getStats();
            console.log("   Reserve balance:", available / 1e6, "USDC");
        } else {
            console.log("[!] WARNING: No YIELD_RESERVE_ADDRESS found!");
            console.log("[!] Please deploy YieldReserve first using:");
            console.log(
                "[!] forge script script/DeployYieldReserve.s.sol:DeployYieldReserve --broadcast"
            );
            revert("YIELD_RESERVE_ADDRESS not set in .env");
        }
    }

    function _deployNewInfrastructure() internal {
        riskNFT = new RiskNFT(ARC_ENS_REGISTERY);
        console.log("RiskNFT deployed at:", address(riskNFT));

        factory = new StrategyFactory();
        console.log("StrategyFactory deployed at:", address(factory));
    }

    function _deployVaults(address feeRecipient) internal {
        lowVault = new BaseVault(
            IERC20(address(usdc)),
            "Aura Low Risk Vault",
            "AURA-LOW",
            feeRecipient
        );
        console.log("Low Risk Vault deployed at:", address(lowVault));

        medVault = new BaseVault(
            IERC20(address(usdc)),
            "Aura Medium Risk Vault",
            "AURA-MED",
            feeRecipient
        );
        console.log("Medium Risk Vault deployed at:", address(medVault));

        highVault = new BaseVault(
            IERC20(address(usdc)),
            "Aura High Risk Vault",
            "AURA-HIGH",
            feeRecipient
        );
        console.log("High Risk Vault deployed at:", address(highVault));
    }

    function _deployLowRiskStrategies() internal {
        console.log("\n--- Deploying Low Risk Strategies ---");

        address strat = factory.createStrategy(
            IERC20(address(usdc)),
            "Stables",
            500,
            98,
            5
        );
        _setupStrategy(strat, address(lowVault));
        lowVault.addStrategy(strat, 3300);
        console.log("  Stables Strategy:", strat);

        strat = factory.createStrategy(
            IERC20(address(usdc)),
            "Aave-Bluechip",
            600,
            95,
            10
        );
        _setupStrategy(strat, address(lowVault));
        lowVault.addStrategy(strat, 3300);
        console.log("  Aave Bluechip Strategy:", strat);

        strat = factory.createStrategy(
            IERC20(address(usdc)),
            "Bluechip-Yield",
            700,
            95,
            10
        );
        _setupStrategy(strat, address(lowVault));
        lowVault.addStrategy(strat, 3400);
        console.log("  Bluechip Yield Strategy:", strat);
    }

    function _deployMediumRiskStrategies() internal {
        console.log("\n--- Deploying Medium Risk Strategies ---");

        address strat = factory.createStrategy(
            IERC20(address(usdc)),
            "Lido",
            1000,
            90,
            20
        );
        _setupStrategy(strat, address(medVault));
        medVault.addStrategy(strat, 3300);
        console.log("  Lido Strategy:", strat);

        strat = factory.createStrategy(
            IERC20(address(usdc)),
            "rETH",
            1200,
            90,
            20
        );
        _setupStrategy(strat, address(medVault));
        medVault.addStrategy(strat, 3300);
        console.log("  rETH Strategy:", strat);

        strat = factory.createStrategy(
            IERC20(address(usdc)),
            "Curve",
            1500,
            85,
            30
        );
        _setupStrategy(strat, address(medVault));
        medVault.addStrategy(strat, 3400);
        console.log("  Curve Strategy:", strat);
    }

    function _deployHighRiskStrategies() internal {
        console.log("\n--- Deploying High Risk Strategies ---");

        address strat = factory.createStrategy(
            IERC20(address(usdc)),
            "Meme-Pools",
            3000,
            50,
            100
        );
        _setupStrategy(strat, address(highVault));
        highVault.addStrategy(strat, 3300);
        console.log("  Meme Pools Strategy:", strat);

        strat = factory.createStrategy(
            IERC20(address(usdc)),
            "Emerging-Opps",
            5000,
            60,
            100
        );
        _setupStrategy(strat, address(highVault));
        highVault.addStrategy(strat, 3300);
        console.log("  Emerging Opps Strategy:", strat);

        strat = factory.createStrategy(
            IERC20(address(usdc)),
            "Lev-Yield",
            10000,
            50,
            100
        );
        _setupStrategy(strat, address(highVault));
        highVault.addStrategy(strat, 3400);
        console.log("  Leveraged Yield Strategy:", strat);
    }

    function _deployRouter() internal {
        router = new VaultRouter(
            address(usdc),
            address(riskNFT),
            address(lowVault),
            address(medVault),
            address(highVault)
        );
        console.log("\nVaultRouter deployed at:", address(router));
    }

    function _configureYieldReserve() internal {
        console.log("\n--- Configuring Yield Reserve ---");
        console.log("Using YieldReserve at:", address(yieldReserve));

        // Get all strategies and authorize them
        address[] memory allStrategies = new address[](9);
        uint256 idx = 0;

        // Collect all strategy addresses
        for (uint256 i = 0; i < factory.getStrategiesCount(); i++) {
            allStrategies[idx++] = factory.allStrategies(i);
        }

        // Batch authorize all strategies
        yieldReserve.batchAuthorizeStrategies(allStrategies, true);
        console.log("  [OK] Authorized", allStrategies.length, "strategies");

        // Set yield reserve in all strategies
        for (uint256 i = 0; i < allStrategies.length; i++) {
            BaseStrategy(allStrategies[i]).setYieldReserve(
                address(yieldReserve)
            );
        }
        console.log("  [OK] Configured all strategies with YieldReserve");

        // Print reserve stats
        (uint256 available, uint256 distributed, ) = yieldReserve.getStats();
        console.log("  [Stats] Reserve balance:", available / 1e6, "USDC");
        console.log("  [Stats] Total distributed:", distributed / 1e6, "USDC");
    }

    function _setupStrategy(address strategy, address vault) internal {
        BaseStrategy(strategy).setVault(vault);
        // [X] REMOVED: usdc.addMinter(strategy);
        // Strategies no longer mint - they use YieldReserve
    }

    function _printDeploymentSummary() internal view {
        console.log("\n========== DEPLOYMENT SUMMARY ==========");
        console.log("Arc USDC:          ", address(usdc));
        console.log("RiskNFT:           ", address(riskNFT));
        console.log("StrategyFactory:   ", address(factory));
        console.log("YieldReserve:      ", address(yieldReserve));
        console.log("VaultRouter:       ", address(router));
        console.log("\nVaults:");
        console.log("  Low Risk:        ", address(lowVault));
        console.log("  Medium Risk:     ", address(medVault));
        console.log("  High Risk:       ", address(highVault));

        // Print reserve stats
        (
            uint256 available,
            uint256 distributed,
            uint256 efficiency
        ) = yieldReserve.getStats();
        console.log("\nYield Reserve Stats:");
        console.log("  Available:       ", available / 1e6, "USDC");
        console.log("  Distributed:     ", distributed / 1e6, "USDC");
        console.log("  Efficiency:      ", efficiency, "%");

        console.log("\nIMPORTANT NOTES:");
        console.log("  - Using native Arc USDC (6 decimals)");
        console.log("  - Users can bridge USDC from any chain via Circle CCTP");
        console.log("  - Deployer retains vault ownership for admin control");
        console.log("  - VaultRouter is authorized as Nitrolite operator");
        console.log("  - This allows harvest during user rebalancing");
        console.log("  - YieldReserve funded for realistic yield simulation");
        console.log("  - Strategies draw from reserve instead of minting");
        console.log("========================================\n");
    }
}
