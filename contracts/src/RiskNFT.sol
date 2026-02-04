// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

interface IERC5192 {
    event Locked(uint256 tokenId);
    event Unlocked(uint256 tokenId);
    function locked(uint256 tokenId) external view returns (bool);
}

interface IENSRegistry {
    function owner(bytes32 node) external view returns (address);
}

contract RiskNFT is ERC721, IERC5192 {
    struct RiskProfile {
        uint8 lowPct;
        uint8 medPct;
        uint8 highPct;
    }

    enum IdentityType {
        ADDRESS,
        ENS
    }

    struct Identity {
        IdentityType kind;
        address addr; // if ADDRESS
        bytes32 ensNode; // if ENS
    }

    uint256 private _tokenIdCounter;

    mapping(uint256 => RiskProfile) private _riskProfiles;
    mapping(uint256 => Identity) private _identity;

    mapping(address => uint256) private _addressToTokenId;
    mapping(bytes32 => uint256) private _ensToTokenId;

    IENSRegistry public immutable ens;

    event RiskProfileMinted(
        uint256 indexed tokenId,
        uint8 lowPct,
        uint8 medPct,
        uint8 highPct
    );

    event RiskProfileUpdated(
        uint256 indexed tokenId,
        uint8 lowPct,
        uint8 medPct,
        uint8 highPct
    );

    constructor(address ensRegistry) ERC721("Aura Risk Profile", "AURA-RISK") {
        ens = IENSRegistry(ensRegistry);
    }

    function mintWithAddress(
        uint8 lowPct,
        uint8 medPct,
        uint8 highPct
    ) external returns (uint256) {
        require(_addressToTokenId[msg.sender] == 0, "Already has profile");
        require(lowPct + medPct + highPct == 100, "Invalid split");

        _tokenIdCounter++;
        uint256 tokenId = _tokenIdCounter;

        _riskProfiles[tokenId] = RiskProfile(lowPct, medPct, highPct);

        _identity[tokenId] = Identity({
            kind: IdentityType.ADDRESS,
            addr: msg.sender,
            ensNode: bytes32(0)
        });

        _addressToTokenId[msg.sender] = tokenId;

        _safeMint(address(this), tokenId);

        emit Locked(tokenId);
        emit RiskProfileMinted(tokenId, lowPct, medPct, highPct);

        return tokenId;
    }

    function mintWithENS(
        bytes32 ensNode,
        uint8 lowPct,
        uint8 medPct,
        uint8 highPct
    ) external returns (uint256) {
        require(ensNode != bytes32(0), "Invalid ENS node");
        require(ens.owner(ensNode) == msg.sender, "Not ENS owner");
        require(_ensToTokenId[ensNode] == 0, "ENS already used");
        require(lowPct + medPct + highPct == 100, "Invalid split");

        _tokenIdCounter++;
        uint256 tokenId = _tokenIdCounter;

        _riskProfiles[tokenId] = RiskProfile(lowPct, medPct, highPct);

        _identity[tokenId] = Identity({
            kind: IdentityType.ENS,
            addr: address(0),
            ensNode: ensNode
        });

        _ensToTokenId[ensNode] = tokenId;

        _safeMint(address(this), tokenId);

        emit Locked(tokenId);
        emit RiskProfileMinted(tokenId, lowPct, medPct, highPct);

        return tokenId;
    }

    function updateRiskProfile(
        uint256 tokenId,
        uint8 lowPct,
        uint8 medPct,
        uint8 highPct
    ) external {
        require(_ownerOf(tokenId) != address(0), "Invalid token");
        require(_isAuthorized(tokenId), "Not authorized");
        require(lowPct + medPct + highPct == 100, "Invalid split");

        _riskProfiles[tokenId] = RiskProfile(lowPct, medPct, highPct);

        emit RiskProfileUpdated(tokenId, lowPct, medPct, highPct);
    }

    function getRiskProfile(
        uint256 tokenId
    ) external view returns (RiskProfile memory) {
        require(_ownerOf(tokenId) != address(0), "Invalid token");
        return _riskProfiles[tokenId];
    }

    function getTokenIdByAddress(address user) external view returns (uint256) {
        return _addressToTokenId[user];
    }

    function getTokenIdByENS(bytes32 ensNode) external view returns (uint256) {
        return _ensToTokenId[ensNode];
    }

    function locked(uint256 tokenId) external view override returns (bool) {
        require(_ownerOf(tokenId) != address(0), "Invalid token");
        return true;
    }

    function _isAuthorized(uint256 tokenId) internal view returns (bool) {
        Identity memory id = _identity[tokenId];

        if (id.kind == IdentityType.ADDRESS) {
            return msg.sender == id.addr;
        }

        return ens.owner(id.ensNode) == msg.sender;
    }

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        address from = _ownerOf(tokenId);

        require(from == address(0) || to == address(0), "Soulbound");

        return super._update(to, tokenId, auth);
    }

    function approve(address, uint256) public pure override {
        revert("Soulbound");
    }

    function setApprovalForAll(address, bool) public pure override {
        revert("Soulbound");
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override returns (bool) {
        return
            interfaceId == type(IERC5192).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}
