// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/tokens/VirtualUSDC.sol";
import "../src/RiskNFT.sol";
import "../src/vaults/BaseVault.sol";
import "../src/strategies/BaseStrategy.sol";
import "../src/VaultRouter.sol";

/**
 * @title DeployScript
 * @notice Deploys the complete Aura protocol with 3 vaults and 9 strategies
 * @dev Run with: forge script script/Deploy.s.sol:DeployScript --broadcast --rpc-url <RPC>
 */
contract Deploy is Script {
    VirtualUSDC public usdc;
    RiskNFT public riskNFT;
    StrategyFactory public factory;
    BaseVault public lowVault;
    BaseVault public medVault;
    BaseVault public highVault;
    VaultRouter public router;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deploying with address:", deployer);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy core infrastructure
        _deployCoreInfrastructure();

        // Deploy vaults
        _deployVaults(deployer);

        // Deploy strategies
        _deployLowRiskStrategies();
        _deployMediumRiskStrategies();
        _deployHighRiskStrategies();

        // Deploy router
        _deployRouter();

        vm.stopBroadcast();

        _printDeploymentSummary();
    }

    function _deployCoreInfrastructure() internal {
        usdc = new VirtualUSDC();
        console.log("USDC deployed at:", address(usdc));

        riskNFT = new RiskNFT();
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

    function _setupStrategy(address strategy, address vault) internal {
        BaseStrategy(strategy).setVault(vault);
        usdc.addMinter(strategy);
    }

    function _printDeploymentSummary() internal view {
        console.log("\n========== DEPLOYMENT SUMMARY ==========");
        console.log("USDC:              ", address(usdc));
        console.log("RiskNFT:           ", address(riskNFT));
        console.log("StrategyFactory:   ", address(factory));
        console.log("VaultRouter:       ", address(router));
        console.log("\nVaults:");
        console.log("  Low Risk:        ", address(lowVault));
        console.log("  Medium Risk:     ", address(medVault));
        console.log("  High Risk:       ", address(highVault));
        console.log("========================================\n");
    }
}
