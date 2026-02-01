// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

interface IERC5192 {
    event Locked(uint256 tokenId);
    event Unlocked(uint256 tokenId);
    function locked(uint256 tokenId) external view returns (bool);
}

/**
 * @title RiskNFT
 * @notice A Soulbound NFT (IERC5192) that stores a user's risk profile settings.
 * @dev This NFT is non-transferable and represents the risk allocation (Low, Medium, High) for a user's investment strategy.
 */
contract RiskNFT is ERC721, IERC5192 {
    error AlreadyHasNFT();
    error InvalidPercentageSum();
    error NoNFTFound();
    error InvalidTokenId();
    error TokenIsSoulbound();

    /**
     * @notice Structure representing the risk profile of a user.
     * @param lowPct Percentage allocation for low risk strategies.
     * @param medPct Percentage allocation for medium risk strategies.
     * @param highPct Percentage allocation for high risk strategies.
     * @dev The sum of lowPct, medPct, and highPct must always be 100.
     */
    struct RiskProfile {
        uint8 lowPct;
        uint8 medPct;
        uint8 highPct;
    }

    uint256 private _tokenIdCounter;
    mapping(uint256 => RiskProfile) private _riskProfiles;
    mapping(address => uint256) private _ownerToTokenId;

    /// @notice Emitted when a new Risk Profile NFT is minted.
    event RiskProfileMinted(
        address indexed owner,
        uint256 tokenId,
        uint8 lowPct,
        uint8 medPct,
        uint8 highPct
    );
    /// @notice Emitted when a user updates their risk profile percentages.
    event RiskProfileUpdated(
        address indexed owner,
        uint256 tokenId,
        uint8 lowPct,
        uint8 medPct,
        uint8 highPct
    );

    /**
     * @notice Initializes the RiskNFT contract with name and symbol.
     */
    constructor() ERC721("Aura Risk Profile", "AURA-RISK") {}

    /**
     * @notice Mints a new soulbound Risk Profile NFT for the caller.
     * @param lowPct The percentage of assets to allocate to low risk.
     * @param medPct The percentage of assets to allocate to medium risk.
     * @param highPct The percentage of assets to allocate to high risk.
     * @return tokenId The ID of the newly minted NFT.
     * @dev Reverts if the user already owns a Risk Profile NFT or if percentages do not sum to 100.
     */
    function mint(
        uint8 lowPct,
        uint8 medPct,
        uint8 highPct
    ) external returns (uint256) {
        if (_ownerToTokenId[msg.sender] != 0) {
            revert AlreadyHasNFT();
        }
        if (lowPct + medPct + highPct != 100) {
            revert InvalidPercentageSum();
        }

        _tokenIdCounter++;
        uint256 tokenId = _tokenIdCounter;

        _riskProfiles[tokenId] = RiskProfile({
            lowPct: lowPct,
            medPct: medPct,
            highPct: highPct
        });

        _ownerToTokenId[msg.sender] = tokenId;
        _safeMint(msg.sender, tokenId);

        emit Locked(tokenId);
        emit RiskProfileMinted(msg.sender, tokenId, lowPct, medPct, highPct);

        return tokenId;
    }

    /**
     * @notice Updates the risk profile percentages for the caller's NFT.
     * @param lowPct New percentage for low risk.
     * @param medPct New percentage for medium risk.
     * @param highPct New percentage for high risk.
     * @dev Reverts if the user does not own an NFT or if percentages do not sum to 100.
     */
    function updateRiskProfile(
        uint8 lowPct,
        uint8 medPct,
        uint8 highPct
    ) external {
        uint256 tokenId = _ownerToTokenId[msg.sender];
        if (tokenId == 0) {
            revert NoNFTFound();
        }
        if (lowPct + medPct + highPct != 100) {
            revert InvalidPercentageSum();
        }

        _riskProfiles[tokenId] = RiskProfile({
            lowPct: lowPct,
            medPct: medPct,
            highPct: highPct
        });

        emit RiskProfileUpdated(msg.sender, tokenId, lowPct, medPct, highPct);
    }

    /**
     * @notice Retrieves the risk profile for a specific user.
     * @param user The address of the user.
     * @return RiskProfile The risk profile struct containing percentages.
     */
    function getRiskProfile(
        address user
    ) external view returns (RiskProfile memory) {
        uint256 tokenId = _ownerToTokenId[user];
        if (tokenId == 0) {
            revert NoNFTFound();
        }
        return _riskProfiles[tokenId];
    }

    /**
     * @notice Retrieves the risk profile for the caller.
     * @return RiskProfile The risk profile struct containing percentages.
     */
    function getMyRiskProfile() external view returns (RiskProfile memory) {
        uint256 tokenId = _ownerToTokenId[msg.sender];
        if (tokenId == 0) {
            revert NoNFTFound();
        }
        return _riskProfiles[tokenId];
    }

    /**
     * @notice Checks if a user has already minted a risk profile NFT.
     * @param user The address to check.
     * @return bool True if the user has a profile, false otherwise.
     */
    function hasProfile(address user) external view returns (bool) {
        return _ownerToTokenId[user] != 0;
    }

    /**
     * @notice Gets the token ID associated with a user.
     * @param user The address of the owner.
     * @return uint256 The token ID (0 if no token exists).
     */
    function getTokenId(address user) external view returns (uint256) {
        return _ownerToTokenId[user];
    }

    /**
     * @notice Implementation of IERC5192: Returns the locking status of the token.
     * @param tokenId The ID of the token.
     * @return bool Always returns true as these NFTs are soulbound.
     */
    function locked(uint256 tokenId) external view override returns (bool) {
        if (_ownerOf(tokenId) == address(0)) {
            revert InvalidTokenId();
        }
        return true;
    }

    /**
     * @dev Internal function to handle token transfers and minting.
     * @dev Restricts transfers to ensure soulbound property (only mint and burn allowed).
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) {
            revert TokenIsSoulbound();
        }

        if (to == address(0) && from != address(0)) {
            delete _ownerToTokenId[from];
        }

        return super._update(to, tokenId, auth);
    }

    /**
     * @notice Overridden to prevent approvals, maintaining soulbound property.
     */
    function approve(address, uint256) public pure override {
        revert TokenIsSoulbound();
    }

    /**
     * @notice Overridden to prevent operator approvals, maintaining soulbound property.
     */
    function setApprovalForAll(address, bool) public pure override {
        revert TokenIsSoulbound();
    }

    /**
     * @notice Checks if the contract supports a specific interface.
     * @param interfaceId The interface identifier.
     * @return bool True if supported.
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override returns (bool) {
        return
            interfaceId == type(IERC5192).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}
