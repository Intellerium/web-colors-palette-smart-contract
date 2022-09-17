// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract OwnableDelegateProxy {}

/**
 * Used to delegate ownership of a contract to another address,
 * to save on unneeded transactions to approve contract use for users
 */
contract ProxyRegistry {
    mapping(address => OwnableDelegateProxy) public proxies;
}

contract WebColorsPalette is ERC721, Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;

    /**
     * @dev Position item on the palette
     */
    struct Position {
        uint32 x;
        uint32 y;
    }

    // Mapping from colors to position on the palette
    mapping(uint256 => Position) private _positions;

    // version of palette
    Counters.Counter private _version;

    // Mapping from token ID to approved address to swop
    mapping(uint256 => address) private _approvalsForChangePositions;

    // Proxy address for trading
    address proxyRegistryAddress;

    constructor(address _proxyRegistryAddress)
        ERC721("Web Colors Palette", "WCP")
    {
        proxyRegistryAddress = _proxyRegistryAddress;

        address creator = _msgSender();

        _create(creator, 0xFFFFFF, 0, 0);
        _create(creator, 0x000000, 0, 1);
        _create(creator, 0xFF0000, 1, 0);
        _create(creator, 0x00FF00, 1, 1);
        _create(creator, 0x0000FF, 0, 2);
        _create(creator, 0xFFFF00, 1, 2);
        _create(creator, 0x00FFFF, 2, 0);

        _version.increment();
    }

    /**
     * @dev Returns position of item on the palette.
     */
    function positionOf(uint256 tokenId)
        public
        view
        returns (uint32 x, uint32 y)
    {
        _requireMinted(tokenId);

        Position memory position = _positions[tokenId];
        return (position.x, position.y);
    }

    /**
     * @dev Swap the positions of two items on the palette.
     */
    function changePositions(uint256 firstTokenId, uint256 secondTokenId)
        public
    {
        _requireMinted(firstTokenId);
        _requireMinted(secondTokenId);

        address ownerOfFirst = ERC721.ownerOf(firstTokenId);
        address ownerOfSecond = ERC721.ownerOf(secondTokenId);

        require(
            ownerOfFirst == _msgSender(),
            "Change position from incorrect owner"
        );
        require(
            ownerOfFirst == ownerOfSecond ||
                getApprovedOfChangePositions(secondTokenId) == ownerOfFirst,
            "Caller is not 'second' owner nor approved"
        );

        // Clear change position approvals from the previous mover
        _approveOfChangePositions(address(0), secondTokenId);

        Position memory temporary = _positions[secondTokenId];
        _positions[secondTokenId] = _positions[firstTokenId];
        _positions[firstTokenId] = temporary;

        _version.increment();
    }

    /**
     * @dev Returns the account aproved to change position of item on the palette.
     */
    function getApprovedOfChangePositions(uint256 tokenId)
        public
        view
        returns (address)
    {
        _requireMinted(tokenId);

        return _approvalsForChangePositions[tokenId];
    }

    /**
     * @dev Approve change positions on palette.
     */
    function approveOfChangePositions(address mover, uint256 tokenId) public {
        address owner = ERC721.ownerOf(tokenId);

        require(mover != owner, "ERC721: approval to current owner");
        require(_msgSender() == owner, "Approve caller is not token owner");

        _approveOfChangePositions(mover, tokenId);
    }

    /**
     * @dev Returns version of palette.
     */
    function version() public view returns (uint256) {
        return _version.current();
    }

    /**
     * @dev See {IERC721-isApprovedForAll}.
     */
    function isApprovedForAll(address owner, address operator)
        public
        view
        virtual
        override
        returns (bool)
    {
        ProxyRegistry proxyRegistry = ProxyRegistry(proxyRegistryAddress);
        if (address(proxyRegistry.proxies(owner)) == operator) {
            return true;
        }

        return ERC721.isApprovedForAll(owner, operator);
    }

    /**
     * @dev URI to metadata of contract.
     */
    function contractURI() public view returns (string memory) {
        string memory baseURI = _baseURI();
        return string(abi.encodePacked(baseURI, "webcolorspalette"));
    }

    /**
     * @dev Base URI for computing metadata.
     */
    function _baseURI() internal view virtual override returns (string memory) {
        return "http:\\\\localhost:3000\\";
    }

    /**
     * @dev Approve `mover` to change position of item on palette.
     */
    function _approveOfChangePositions(address mover, uint256 tokenId) private {
        _approvalsForChangePositions[tokenId] = mover;
    }

    /**
     * @dev Create palette item. Constructor only.
     */
    function _create(
        address to,
        uint256 tokenId,
        uint32 x,
        uint32 y
    ) private {
        ERC721._mint(to, tokenId);
        _positions[tokenId] = Position(x, y);
    }
}
