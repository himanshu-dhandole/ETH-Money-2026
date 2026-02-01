// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title VirtualUSDC
 * @notice A mock USDC token for testing and demonstration purposes.
 * @dev Inherits from OpenZeppelin ERC20 and Ownable. Includes an airdrop feature and multi-minter support.
 */
contract VirtualUSDC is ERC20, Ownable {
    error NotOwnerOrMinter();
    error InvalidMinter();
    error AlreadyClaimed();

    /// @notice The amount of tokens given per airdrop claim.
    uint256 public constant AIRDROP_AMOUNT = 10_000e18;

    /// @notice Tracks whether an address has already claimed the airdrop.
    mapping(address => bool) public hasClaimed;

    /// @notice Tracks addresses authorized to mint new tokens.
    mapping(address => bool) public minters;

    /**
     * @notice Initializes the contract with the name "Virtual USDC" and symbol "USDC".
     */
    constructor() ERC20("Virtual USDC", "USDC") Ownable(msg.sender) {}

    /**
     * @notice Mints a specific amount of tokens to an address.
     * @param _to The address that will receive the minted tokens.
     * @param _amount The amount of tokens to mint.
     * @dev Only the owner or an authorized minter can call this function.
     */
    function mint(address _to, uint256 _amount) public {
        if (msg.sender != owner() && !minters[msg.sender]) {
            revert NotOwnerOrMinter();
        }
        _mint(_to, _amount);
    }

    /**
     * @notice Grants minter permissions to an address.
     * @param _minter The address to be added as a minter.
     * @dev Only the owner can call this.
     */
    function addMinter(address _minter) external onlyOwner {
        if (_minter == address(0)) {
            revert InvalidMinter();
        }
        minters[_minter] = true;
    }

    /**
     * @notice Revokes minter permissions from an address.
     * @param _minter The address to be removed from minters.
     * @dev Only the owner can call this.
     */
    function removeMinter(address _minter) external onlyOwner {
        minters[_minter] = false;
    }

    /**
     * @notice Claims the one-time airdrop for the caller.
     * @dev Reverts if the caller has already claimed the airdrop.
     */
    function airdrop() public {
        if (hasClaimed[msg.sender]) {
            revert AlreadyClaimed();
        }
        hasClaimed[msg.sender] = true;
        _mint(msg.sender, AIRDROP_AMOUNT);
    }

    /**
     * @notice Destroys a specific amount of tokens from an address.
     * @param _from The address from which tokens will be burned.
     * @param _amount The amount of tokens to burn.
     * @dev Only the owner can call this.
     */
    function burn(address _from, uint256 _amount) public onlyOwner {
        _burn(_from, _amount);
    }
}
