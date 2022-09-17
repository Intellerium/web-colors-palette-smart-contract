// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract WebColorsPalette is ERC721 {
    /**
     * @dev Position item on the palette
     */
    struct Position {
        uint32 x;
        uint32 y;
    }

    // Mapping from colors to position on the palette
    mapping(uint256 => Position) private _positions;

    constructor() ERC721("Web Colors Palette", "WCP") {
        address creator = _msgSender();

        _create(creator, 0xFFFFFF, 0, 0);
        _create(creator, 0x000000, 0, 1);
        _create(creator, 0xFF0000, 1, 0);
        _create(creator, 0x00FF00, 1, 1);
        _create(creator, 0x0000FF, 0, 2);
        _create(creator, 0xFFFF00, 1, 2);
        _create(creator, 0x00FFFF, 2, 0);
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
