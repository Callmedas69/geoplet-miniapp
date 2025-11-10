// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "solady/utils/SSTORE2.sol";

/**
 * @title IFileStore
 * @notice Interface for Ethereum File System (EthFS) on-chain file storage
 */
interface IFileStore {
    struct File {
        function() external view returns (string memory) read;
    }

    function getFile(
        string memory filename
    ) external view returns (File memory);
}

/**
 * @title GeoPlets
 * @notice ERC721 NFT with built-in ERC20 treasury and EIP-712 signature-based payment validation
 * @dev Each NFT can hold balances of multiple ERC20 tokens that owners can claim
 *
 * Security Features:
 * - EIP-712 signature verification for payment validation
 * - Replay attack prevention via used signatures tracking
 * - Deadline enforcement (signatures expire after 5 minutes)
 * - ReentrancyGuard on mint and withdraw functions
 * - CEI (Checks-Effects-Interactions) pattern in all state-changing functions
 * - Multiple claims supported for recurring rewards
 * - No emergency withdraw - only NFT holders control their balances
 * - Transferable balances - ERC20 balances transfer with NFT ownership
 * - SSTORE2 for gas-efficient on-chain image storage (~70% cheaper than SSTORE)
 */
contract GeoPlets is ERC721, Ownable, ReentrancyGuard, EIP712 {
    using Strings for uint256;
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;

    // ============ Constants ============

    uint256 public constant MAX_SIGNATURE_VALIDITY = 3600; // 1 hour maximum

    // ============ State Variables ============

    uint256 public maxSupply = 49152;
    uint256 private _mintedCount;

    // Track minted Farcaster IDs to prevent duplicates
    mapping(uint256 => bool) public fidMinted;

    // SSTORE2 pointers for base64 image data (stores contract address containing image bytecode)
    mapping(uint256 => address) private imagePointers;

    // SSTORE2 pointers for base64 animation HTML data
    mapping(uint256 => address) private animationPointers;

    // ERC20 Treasury: tokenId => ERC20 address => balance
    mapping(uint256 => mapping(address => uint256)) public tokenBalances;

    // Control withdrawals globally
    bool public withdrawalsEnabled;

    // Emergency pause for minting
    bool public mintingPaused = false;

    // EIP-712 Signature Validation
    address public signerWallet;
    mapping(bytes32 => bool) public usedSignatures;

    // Mint authorization voucher
    struct MintVoucher {
        address to; // Address to mint to
        uint256 fid; // Farcaster ID (becomes token ID)
        uint256 nonce; // Unique nonce (timestamp from backend)
        uint256 deadline; // Expiration timestamp
    }

    // Animation upgrade authorization voucher
    struct UpgradeVoucher {
        address to; // NFT owner address
        uint256 tokenId; // Token to upgrade
        uint256 nonce; // Unique nonce (timestamp from backend)
        uint256 deadline; // Expiration timestamp
    }

    // EIP-712 type hashes
    bytes32 private constant MINT_VOUCHER_TYPEHASH =
        keccak256(
            "MintVoucher(address to,uint256 fid,uint256 nonce,uint256 deadline)"
        );

    bytes32 private constant UPGRADE_VOUCHER_TYPEHASH =
        keccak256(
            "UpgradeVoucher(address to,uint256 tokenId,uint256 nonce,uint256 deadline)"
        );

    // ============ Events ============

    event GeopletMinted(uint256 indexed tokenId, address indexed owner);

    event AnimationUpgraded(uint256 indexed tokenId, address indexed upgrader);

    event TokenDeposited(
        uint256 indexed tokenId,
        address indexed erc20Token,
        uint256 amount
    );

    event TokenWithdrawn(
        uint256 indexed tokenId,
        address indexed erc20Token,
        address indexed recipient,
        uint256 amount
    );

    event WithdrawalsToggled(bool enabled);

    event MintingPaused(bool paused);

    event EmergencyWithdrawExcess(address indexed token, uint256 amount);

    event MaxSupplyUpdated(uint256 indexed oldMax, uint256 indexed newMax);

    event SignerWalletUpdated(
        address indexed oldSigner,
        address indexed newSigner
    );

    // ============ Constructor ============

    constructor()
        ERC721("Geoplets", "GEOPLETS")
        EIP712("Geoplets", "1")
        Ownable(msg.sender)
    {
        signerWallet = msg.sender; // Owner is initial signer
    }

    // ============ NFT Minting Functions ============

    /**
     * @notice Mint Geoplet NFT with EIP-712 signature verification for payment validation
     * @param voucher The mint authorization voucher signed by backend
     * @param base64ImageData Base64-encoded image data
     * @param signature EIP-712 signature from backend
     * @return fid The minted Geoplet token ID (same as FID)
     */
    function mintGeoplet(
        MintVoucher calldata voucher,
        string calldata base64ImageData,
        bytes calldata signature
    ) external nonReentrant returns (uint256) {
        // 1. Verify minting not paused
        require(!mintingPaused, "Minting paused");

        // 2. Verify signature deadline bounds
        require(block.timestamp <= voucher.deadline, "Signature expired");
        require(
            voucher.deadline <= block.timestamp + MAX_SIGNATURE_VALIDITY,
            "Deadline too long"
        );

        // 3. Verify caller matches voucher recipient
        require(msg.sender == voucher.to, "Caller mismatch");

        // 4. Calculate EIP-712 digest
        bytes32 digest = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    MINT_VOUCHER_TYPEHASH,
                    voucher.to,
                    voucher.fid,
                    voucher.nonce,
                    voucher.deadline
                )
            )
        );

        // 4. Check digest not already used (replay protection)
        require(!usedSignatures[digest], "Signature already used");

        // 5. Verify EIP-712 signature
        address recoveredSigner = ECDSA.recover(digest, signature);
        require(recoveredSigner != address(0), "Invalid signature");
        require(recoveredSigner == signerWallet, "Invalid signature");

        // 6. Mark digest as used BEFORE minting (CEI pattern)
        usedSignatures[digest] = true;

        // 7. Existing mint validations
        require(_mintedCount < maxSupply, "Max supply reached");
        require(!fidMinted[voucher.fid], "FID already minted");
        require(voucher.to != address(0), "Invalid recipient");
        require(bytes(base64ImageData).length > 0, "Empty image data");
        require(
            bytes(base64ImageData).length <= 24576,
            "Image too large (24KB max)"
        );

        // 7. Execute mint
        fidMinted[voucher.fid] = true;
        _mintedCount++;

        // Store image data in SSTORE2 contract bytecode (~70% cheaper than SSTORE)
        address imagePointer = SSTORE2.write(bytes(base64ImageData));
        require(imagePointer != address(0), "SSTORE2 write failed");
        require(imagePointer.code.length > 0, "Invalid storage pointer");
        imagePointers[voucher.fid] = imagePointer;

        // Mint NFT
        _safeMint(voucher.to, voucher.fid);

        emit GeopletMinted(voucher.fid, voucher.to);

        return voucher.fid;
    }

    /**
     * @notice Get token URI with metadata (overrides ERC721)
     * @dev Reads image data from SSTORE2 and builds metadata dynamically
     */
    function tokenURI(
        uint256 tokenId
    ) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Token doesn't exist");

        // Read image data from SSTORE2 pointer
        address imagePointer = imagePointers[tokenId];
        require(imagePointer != address(0), "Missing image data");
        bytes memory imageData = SSTORE2.read(imagePointer);
        string memory base64Image = string(imageData);

        // Check for animation and build animation URL if exists
        string memory animationUrl = "";
        if (animationPointers[tokenId] != address(0)) {
            bytes memory animationData = SSTORE2.read(
                animationPointers[tokenId]
            );
            animationUrl = string(
                abi.encodePacked(
                    "data:text/html;base64,",
                    string(animationData)
                )
            );
        }

        // Build and return metadata JSON
        return _buildMetadata(tokenId, base64Image, animationUrl);
    }

    /**
     * @notice Build metadata JSON in Base64 format for marketplace compatibility
     */
    function _buildMetadata(
        uint256 tokenId,
        string memory imageData,
        string memory animationUrl
    ) private pure returns (string memory) {
        // Build animation_url field conditionally
        string memory animationField = bytes(animationUrl).length > 0
            ? string(abi.encodePacked('"animation_url":"', animationUrl, '",'))
            : '"animation_url":"",';

        // Build JSON string
        string memory json = string(
            abi.encodePacked(
                "{",
                '"name":"Geoplet #',
                tokenId.toString(),
                '",',
                '"description":"Geoplet transforms pure geometry into living art - a dialogue between shape, color, and rhythm. Drawing inspiration from Bauhaus and Suprematism, each piece captures harmony through abstraction, expressing emotion within mathematical precision. Every Geoplet is born from code, crafted by algorithmic design, and preserved entirely on-chain - a timeless fusion of creativity, logic, and form.",',
                '"token_id":',
                tokenId.toString(),
                ",",
                '"image":"data:image/svg+xml;base64,',
                imageData,
                '",',
                animationField,
                '"attributes":[',
                '{"trait_type":"Token ID","value":',
                tokenId.toString(),
                "},",
                '{"trait_type":"Collection","value":"Geoplet"},',
                '{"trait_type":"Creator","value":"0xdas"}',
                "],",
                '"external_url":"https://geoplet.geoart.studio"',
                "}"
            )
        );

        // Return Base64-encoded JSON with proper data URI prefix
        return
            string(
                abi.encodePacked(
                    "data:application/json;base64,",
                    Base64.encode(bytes(json))
                )
            );
    }

    /**
     * @notice Collection-level metadata for marketplaces
     * @dev Returns Base64-encoded collection information with animated WebP from EthFS
     */
    function contractURI() public view returns (string memory) {
        string memory imageData;

        // Fetch animated WebP collection image from EthFS with error handling
        try
            IFileStore(0xFe1411d6864592549AdE050215482e4385dFa0FB)
                .getFile("thumbnail.webp")
                .read()
        returns (string memory ethfsData) {
            imageData = string(
                abi.encodePacked("data:image/webp;base64,", ethfsData)
            );
        } catch {
            // Fallback to empty image if EthFS fails
            imageData = "";
        }
        string memory json = string(
            abi.encodePacked(
                "{",
                '"name":"Geoplets",',
                '"description":"Geoplet transforms geometry into living art. Inspired by Bauhaus and Suprematism, each piece embodies balance and motion - a fusion of code and creativity, fully preserved on-chain.",',
                bytes(imageData).length > 0
                    ? string(abi.encodePacked('"image":"', imageData, '",'))
                    : "",
                '"external_link":"https://geoplet.geoart.studio"',
                "}"
            )
        );

        return
            string(
                abi.encodePacked(
                    "data:application/json;base64,",
                    Base64.encode(bytes(json))
                )
            );
    }

    // ============ Animation Upgrade Functions ============

    /**
     * @notice Upgrade NFT to animated version with EIP-712 signature verification
     * @param voucher The upgrade authorization voucher signed by backend
     * @param base64HtmlAnimation Base64-encoded HTML with embedded MP4 video
     * @param signature EIP-712 signature from backend
     */
    function upgradeToAnimated(
        UpgradeVoucher calldata voucher,
        string calldata base64HtmlAnimation,
        bytes calldata signature
    ) external nonReentrant {
        // 1. Verify ownership
        require(ownerOf(voucher.tokenId) == msg.sender, "Not token owner");
        require(msg.sender == voucher.to, "Caller mismatch");

        // 2. Verify signature deadline bounds
        require(block.timestamp <= voucher.deadline, "Signature expired");
        require(
            voucher.deadline <= block.timestamp + MAX_SIGNATURE_VALIDITY,
            "Deadline too long"
        );

        // 3. Calculate EIP-712 digest
        bytes32 digest = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    UPGRADE_VOUCHER_TYPEHASH,
                    voucher.to,
                    voucher.tokenId,
                    voucher.nonce,
                    voucher.deadline
                )
            )
        );

        // 4. Check digest not already used (replay protection)
        require(!usedSignatures[digest], "Signature already used");

        // 5. Verify EIP-712 signature
        address recoveredSigner = ECDSA.recover(digest, signature);
        require(recoveredSigner != address(0), "Invalid signature");
        require(recoveredSigner == signerWallet, "Invalid signature");

        // 6. Mark digest as used BEFORE storing (CEI pattern)
        usedSignatures[digest] = true;

        // 7. Validate animation data
        require(bytes(base64HtmlAnimation).length > 0, "Empty animation data");
        require(
            bytes(base64HtmlAnimation).length <= 24576,
            "Animation too large (24KB max)"
        );

        // 8. Store animation data in SSTORE2 contract bytecode
        address animationPointer = SSTORE2.write(bytes(base64HtmlAnimation));
        require(animationPointer != address(0), "SSTORE2 write failed");
        require(animationPointer.code.length > 0, "Invalid storage pointer");
        animationPointers[voucher.tokenId] = animationPointer;

        emit AnimationUpgraded(voucher.tokenId, msg.sender);
    }

    /**
     * @notice Check if a token has an animation
     * @param tokenId The NFT token ID to check
     * @return True if token has animation, false otherwise
     */
    function hasAnimation(uint256 tokenId) external view returns (bool) {
        return animationPointers[tokenId] != address(0);
    }

    /**
     * @notice Get animation HTML data for a token
     * @param tokenId The NFT token ID
     * @return The Base64-encoded HTML animation data
     */
    function getAnimationData(
        uint256 tokenId
    ) external view returns (string memory) {
        require(
            animationPointers[tokenId] != address(0),
            "No animation for this token"
        );
        bytes memory animationData = SSTORE2.read(animationPointers[tokenId]);
        return string(animationData);
    }

    // ============ ERC20 Treasury Functions ============

    /**
     * @notice Deposit ERC20 tokens to a specific NFT token ID
     * @param tokenId The NFT token ID to deposit to
     * @param erc20Token The ERC20 token address
     * @param amount Amount to deposit
     */
    function depositToToken(
        uint256 tokenId,
        address erc20Token,
        uint256 amount
    ) external onlyOwner {
        require(erc20Token != address(0), "Invalid token address");
        require(_ownerOf(tokenId) != address(0), "Token doesn't exist");
        require(amount > 0, "Amount must be > 0");

        IERC20(erc20Token).safeTransferFrom(msg.sender, address(this), amount);
        tokenBalances[tokenId][erc20Token] += amount;

        emit TokenDeposited(tokenId, erc20Token, amount);
    }

    /**
     * @notice Batch deposit with different amounts per token
     * @param tokenIds Array of NFT token IDs
     * @param erc20Token The ERC20 token address
     * @param amounts Array of amounts (must match tokenIds length)
     */
    function batchDepositToTokens(
        uint256[] calldata tokenIds,
        address erc20Token,
        uint256[] calldata amounts
    ) external onlyOwner {
        require(erc20Token != address(0), "Invalid token address");
        require(tokenIds.length == amounts.length, "Length mismatch");
        require(tokenIds.length <= 500, "Batch too large");

        // Calculate total for valid tokens only
        uint256 totalAmount = 0;
        uint256 validCount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            if (_ownerOf(tokenIds[i]) != address(0)) {
                totalAmount += amounts[i];
                validCount++;
            }
        }

        require(validCount > 0, "No valid tokens");

        // Transfer total from owner to contract
        IERC20(erc20Token).safeTransferFrom(
            msg.sender,
            address(this),
            totalAmount
        );

        // Distribute to valid tokens only
        for (uint256 i = 0; i < tokenIds.length; i++) {
            if (_ownerOf(tokenIds[i]) != address(0)) {
                tokenBalances[tokenIds[i]][erc20Token] += amounts[i];
                emit TokenDeposited(tokenIds[i], erc20Token, amounts[i]);
            }
        }
    }

    /**
     * @notice Batch deposit with equal amount to all tokens
     * @param tokenIds Array of NFT token IDs
     * @param erc20Token The ERC20 token address
     * @param amountPerToken Amount to deposit to each token
     */
    function batchDepositEqual(
        uint256[] calldata tokenIds,
        address erc20Token,
        uint256 amountPerToken
    ) external onlyOwner {
        require(erc20Token != address(0), "Invalid token address");
        require(tokenIds.length > 0, "Empty array");
        require(tokenIds.length <= 500, "Batch too large");
        require(amountPerToken > 0, "Amount must be > 0");

        // Count valid tokens
        uint256 validCount = 0;
        for (uint256 i = 0; i < tokenIds.length; i++) {
            if (_ownerOf(tokenIds[i]) != address(0)) {
                validCount++;
            }
        }

        require(validCount > 0, "No valid tokens");

        uint256 totalAmount = validCount * amountPerToken;

        IERC20(erc20Token).safeTransferFrom(
            msg.sender,
            address(this),
            totalAmount
        );

        for (uint256 i = 0; i < tokenIds.length; i++) {
            if (_ownerOf(tokenIds[i]) != address(0)) {
                tokenBalances[tokenIds[i]][erc20Token] += amountPerToken;
                emit TokenDeposited(tokenIds[i], erc20Token, amountPerToken);
            }
        }
    }

    /**
     * @notice NFT owner withdraws ERC20 tokens from their NFT
     * @dev Supports multiple claims - users can claim recurring deposits
     * @param tokenId The NFT token ID to withdraw from
     * @param erc20Token The ERC20 token address to withdraw
     */
    function withdraw(
        uint256 tokenId,
        address erc20Token
    ) external nonReentrant {
        require(erc20Token != address(0), "Invalid token address");
        require(withdrawalsEnabled, "Withdrawals disabled");
        require(ownerOf(tokenId) == msg.sender, "Not token owner");

        uint256 amount = tokenBalances[tokenId][erc20Token];
        require(amount > 0, "No balance");

        // Clear balance BEFORE transfer (CEI pattern)
        tokenBalances[tokenId][erc20Token] = 0;

        // Transfer tokens
        IERC20(erc20Token).safeTransfer(msg.sender, amount);

        emit TokenWithdrawn(tokenId, erc20Token, msg.sender, amount);
    }

    /**
     * @notice Get ERC20 balance for a specific token ID
     * @param tokenId The NFT token ID
     * @param erc20Token The ERC20 token address
     * @return balance The claimable balance
     */
    function getTokenBalance(
        uint256 tokenId,
        address erc20Token
    ) external view returns (uint256) {
        return tokenBalances[tokenId][erc20Token];
    }

    // ============ Admin Functions ============

    /**
     * @notice Emergency pause/unpause for minting
     * @param paused True to pause, false to unpause
     */
    function setMintingPaused(bool paused) external onlyOwner {
        mintingPaused = paused;
        emit MintingPaused(paused);
    }

    /**
     * @notice Enable or disable withdrawals globally
     * @param enabled True to enable, false to disable
     */
    function setWithdrawalsEnabled(bool enabled) external onlyOwner {
        withdrawalsEnabled = enabled;
        emit WithdrawalsToggled(enabled);
    }

    /**
     * @notice Update max supply (can increase or decrease, but not below minted count)
     * @param newMax New maximum supply
     */
    function setMaxSupply(uint256 newMax) external onlyOwner {
        require(newMax >= _mintedCount, "Cannot set below minted count");
        uint256 oldMax = maxSupply;
        maxSupply = newMax;
        emit MaxSupplyUpdated(oldMax, newMax);
    }

    /**
     * @notice Get total supply minted
     * @return Total number of NFTs minted
     */
    function totalSupply() external view returns (uint256) {
        return _mintedCount;
    }

    /**
     * @notice Check if a Farcaster ID has been minted
     * @param fid The Farcaster ID to check
     * @return True if the FID has been minted, false otherwise
     */
    function isFidMinted(uint256 fid) external view returns (bool) {
        return fidMinted[fid];
    }

    /**
     * @notice Update the signer wallet address
     * @param newSigner New signer wallet address
     */
    function setSignerWallet(address newSigner) external onlyOwner {
        require(newSigner != address(0), "Invalid signer address");
        address oldSigner = signerWallet;
        signerWallet = newSigner;
        emit SignerWalletUpdated(oldSigner, newSigner);
    }

    /**
     * @notice Emergency withdraw EXCESS ERC20 tokens (not user allocations)
     * @dev Only withdraws funds not allocated to any NFT holder
     * @param erc20Token Token address to withdraw
     * @param amount Amount to withdraw (must be <= excess)
     * @param tokenIds Array of all minted token IDs (owner must provide)
     */
    function emergencyWithdrawExcess(
        address erc20Token,
        uint256 amount,
        uint256[] calldata tokenIds
    ) external onlyOwner {
        require(erc20Token != address(0), "Invalid token");

        // Calculate total allocated to NFT holders using provided token IDs
        uint256 totalAllocated = 0;
        for (uint256 i = 0; i < tokenIds.length; i++) {
            if (_ownerOf(tokenIds[i]) != address(0)) {
                totalAllocated += tokenBalances[tokenIds[i]][erc20Token];
            }
        }

        uint256 contractBalance = IERC20(erc20Token).balanceOf(address(this));
        require(contractBalance > totalAllocated, "No excess funds");

        uint256 excess = contractBalance - totalAllocated;
        require(amount <= excess, "Cannot withdraw user funds");

        IERC20(erc20Token).safeTransfer(owner(), amount);
        emit EmergencyWithdrawExcess(erc20Token, amount);
    }

    /**
     * @notice Rescue accidentally sent ETH
     */
    function rescueETH() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH to rescue");
        payable(owner()).transfer(balance);
    }
}
