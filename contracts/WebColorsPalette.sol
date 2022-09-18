// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/PullPayment.sol";

contract OwnableDelegateProxy {}

/**
 * Used to delegate ownership of a contract to another address,
 * to save on unneeded transactions to approve contract use for users
 */
contract ProxyRegistry {
    mapping(address => OwnableDelegateProxy) public proxies;
}

contract WebColorsPalette is ERC721, Ownable, PullPayment, ReentrancyGuard {
    using Counters for Counters.Counter;

    // Swap fee
    uint64 public constant SWAP_FEE = 3;

    /**
     * @dev Emitted when `owner` enables `swapper` to change positions on the palette.
     */
    event SwapApproval(
        address indexed owner,
        address indexed swapper,
        uint256 indexed tokenId
    );

    /**
     * @dev Emitted when token owner set a new tokens swap price.
     */
    event SwapPriceUpdated(uint256 indexed tokenId, uint256 price);

    /**
     * @dev Emitted when `swapper` change positions of two items on the palette.
     */
    event Swapped(
        address indexed swapper,
        uint256 indexed ownedTokenId,
        uint256 indexed destinationTokenId
    );

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

    // Mapping from token ID to approved address to change positions
    mapping(uint256 => address) private _swapApprovals;

    // Mapping from token ID to price for swap
    mapping(uint256 => uint256) private _swapPrices;

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
     * @dev Returns version of palette.
     */
    function version() public view returns (uint256) {
        return _version.current();
    }

    /**
     * @dev See {PullPayment-withdrawPayments}.
     */
    function withdrawPayments(address payable payee)
        public
        virtual
        override
        nonReentrant
    {
        PullPayment.withdrawPayments(payee);
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
     * @dev Change positions of two colors on the palette.
     */
    function swap(uint256 ownedTokenId, uint256 destinationTokenId)
        public
        payable
    {
        _requireMinted(ownedTokenId);
        _requireMinted(destinationTokenId);

        address swapper = ERC721.ownerOf(ownedTokenId);

        require(
            swapper == _msgSender(),
            "Change position from incorrect owner"
        );

        address payee = ERC721.ownerOf(destinationTokenId);

        if (swapper == payee) {
            require(
                msg.value == 0,
                "Owner of both tokens should not pay to swap"
            );
        } else {
            uint256 price = getSwapPrice(destinationTokenId);
            bool hasPrice = price > 0;

            address approved = getSwapApproved(destinationTokenId);
            if (address(0) != approved) {
                require(approved == swapper, "Caller is not approved");
            } else {
                require(
                    hasPrice,
                    "Caller should be approved to call swap cause the swap price is 0"
                );
            }

            if (hasPrice) {
                require(
                    msg.value == price,
                    "Transaction value did not equal the swap price"
                );

                uint256 fee = (price / 100) * SWAP_FEE;
                _asyncTransfer(payee, price - fee);
                _asyncTransfer(owner(), fee);
            }
        }

        // Clear change position approvals from the previous swapper
        _approveSwap(destinationTokenId, address(0));

        Position memory temporary = _positions[destinationTokenId];
        _positions[destinationTokenId] = _positions[ownedTokenId];
        _positions[ownedTokenId] = temporary;

        _version.increment();

        emit Swapped(swapper, ownedTokenId, destinationTokenId);
    }

    /**
     * @dev Returns the account aproved to change position of item on the palette.
     */
    function getSwapApproved(uint256 tokenId) public view returns (address) {
        _requireMinted(tokenId);

        return _swapApprovals[tokenId];
    }

    /**
     * @dev Approve change positions on palette.
     */
    function approveSwap(address swapper, uint256 tokenId) public {
        _requireMinted(tokenId);

        address owner = ERC721.ownerOf(tokenId);

        require(swapper != owner, "ERC721: approval to current owner");
        require(_msgSender() == owner, "Approve caller is not token owner");

        _approveSwap(tokenId, swapper);
    }

    /**
     * @dev Returns the price of position changes item on the palette
     */
    function getSwapPrice(uint256 tokenId) public view returns (uint256) {
        _requireMinted(tokenId);

        return _swapPrices[tokenId];
    }

    /**
     * @dev Set the price for item for each change position
     */
    function setSwapPrice(uint256 tokenId, uint256 price) public {
        _requireMinted(tokenId);

        address owner = ERC721.ownerOf(tokenId);
        require(_msgSender() == owner, "Caller is not token owner");

        _setSwapPrice(tokenId, price);
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
     * @dev Approve `swapper` to change position of item on palette.
     */
    function _approveSwap(uint256 tokenId, address swapper) private {
        _swapApprovals[tokenId] = swapper;

        emit SwapApproval(ERC721.ownerOf(tokenId), swapper, tokenId);
    }

    /**
     *  @dev Update price for change position of item on the palette.
     */
    function _setSwapPrice(uint256 tokenId, uint256 price) private {
        _swapPrices[tokenId] = price;

        emit SwapPriceUpdated(tokenId, price);
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
