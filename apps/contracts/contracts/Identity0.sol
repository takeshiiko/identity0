// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {ERC2981} from "@openzeppelin/contracts/token/common/ERC2981.sol";

contract Identity0 is ERC721, ERC721URIStorage, ERC2981, Ownable, AccessControl, Pausable, ReentrancyGuard {
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    uint256 public constant MAX_SUPPLY = 3333;
    uint256 public constant MAX_MINTS_PER_WALLET = 3;
    uint96 public constant ROYALTY_FEE_NUMERATOR = 300;
    uint256 public mintPrice = 0.00065 ether;

    string private unrevealedURI;
    uint256 private nextTokenId = 1;

    mapping(address wallet => uint256 minted) public mintedByWallet;

    event TokenMinted(address indexed minter, uint256 indexed tokenId);
    event MintPriceUpdated(uint256 price);
    event UnrevealedURIUpdated(string uri);
    event TokenRevealed(uint256 indexed tokenId, string tokenURI);

    constructor(string memory initialUnrevealedURI, address operator) ERC721("Kandinsky", "KND") Ownable(msg.sender) {
        unrevealedURI = initialUnrevealedURI;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, operator == address(0) ? msg.sender : operator);
        _setDefaultRoyalty(msg.sender, ROYALTY_FEE_NUMERATOR);
    }

    function mint() external payable whenNotPaused nonReentrant returns (uint256 tokenId) {
        require(nextTokenId <= MAX_SUPPLY, "Kandinsky: sold out");
        require(mintedByWallet[msg.sender] < MAX_MINTS_PER_WALLET, "Kandinsky: wallet mint limit");
        require(msg.value >= mintPrice, "Kandinsky: insufficient payment");

        tokenId = nextTokenId;
        nextTokenId += 1;
        mintedByWallet[msg.sender] += 1;

        _safeMint(msg.sender, tokenId);
        emit TokenMinted(msg.sender, tokenId);

        if (msg.value > mintPrice) {
            (bool refunded,) = payable(msg.sender).call{value: msg.value - mintPrice}("");
            require(refunded, "Kandinsky: refund failed");
        }
    }

    function revealToken(uint256 tokenId, string calldata ipfsCidOrURI) external onlyRole(OPERATOR_ROLE) {
        require(_ownerOf(tokenId) != address(0), "Kandinsky: nonexistent token");
        string memory finalURI = normalizeTokenURI(ipfsCidOrURI);
        _setTokenURI(tokenId, finalURI);
        emit TokenRevealed(tokenId, finalURI);
        emit MetadataUpdate(tokenId);
    }

    function batchReveal(uint256[] calldata tokenIds, string[] calldata ipfsCidsOrURIs) external onlyRole(OPERATOR_ROLE) {
        require(tokenIds.length == ipfsCidsOrURIs.length, "Kandinsky: length mismatch");
        for (uint256 index = 0; index < tokenIds.length; index += 1) {
            require(_ownerOf(tokenIds[index]) != address(0), "Kandinsky: nonexistent token");
            string memory finalURI = normalizeTokenURI(ipfsCidsOrURIs[index]);
            _setTokenURI(tokenIds[index], finalURI);
            emit TokenRevealed(tokenIds[index], finalURI);
            emit MetadataUpdate(tokenIds[index]);
        }
    }

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Kandinsky: nonexistent token");
        string memory revealedURI = super.tokenURI(tokenId);
        if (bytes(revealedURI).length == 0) {
            return unrevealedURI;
        }
        return revealedURI;
    }

    function totalSupply() external view returns (uint256) {
        return nextTokenId - 1;
    }

    function setMintPrice(uint256 price) external onlyOwner {
        mintPrice = price;
        emit MintPriceUpdated(price);
    }

    function setRoyaltyReceiver(address receiver) external onlyOwner {
        _setDefaultRoyalty(receiver, ROYALTY_FEE_NUMERATOR);
    }

    function setUnrevealedURI(string calldata uri) external onlyOwner {
        unrevealedURI = uri;
        emit UnrevealedURIUpdated(uri);
        if (nextTokenId > 1) {
            emit BatchMetadataUpdate(1, nextTokenId - 1);
        }
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function withdrawFunds(address payable recipient) external onlyOwner nonReentrant {
        address payable target = recipient == address(0) ? payable(owner()) : recipient;
        (bool sent,) = target.call{value: address(this).balance}("");
        require(sent, "Kandinsky: withdraw failed");
    }

    function normalizeTokenURI(string memory ipfsCidOrURI) internal pure returns (string memory) {
        bytes memory value = bytes(ipfsCidOrURI);
        if (value.length >= 7 && value[0] == "i" && value[1] == "p" && value[2] == "f" && value[3] == "s" && value[4] == ":" && value[5] == "/" && value[6] == "/") {
            return ipfsCidOrURI;
        }
        return string.concat("ipfs://", ipfsCidOrURI);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage, ERC2981, AccessControl) returns (bool) {
        return interfaceId == 0x49064906 || super.supportsInterface(interfaceId);
    }
}
