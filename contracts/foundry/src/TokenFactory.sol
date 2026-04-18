// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// ─── Uniswap V2 Interfaces ────────────────────────────────────────────────────

interface IUniswapV2Router02 {
    function addLiquidityETH(
        address token,
        uint256 amountTokenDesired,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    ) external payable returns (uint256 amountToken, uint256 amountETH, uint256 liquidity);

    function factory() external pure returns (address);
    function WETH() external pure returns (address);
}

interface IUniswapV2Factory {
    function getPair(address tokenA, address tokenB) external view returns (address pair);
}

// ─────────────────────────────────────────────────────────────────────────────

/// @title BondingCurveToken
/// @notice An ERC-20 whose price follows a linear bonding curve.
///
///   Notation:
///     s = totalSupply / WAD   (supply in full tokens, e.g. "1000 tokens")
///     price(s) = BASE_PRICE + SLOPE * s   [wei per 1 full token]
///
///   Reserve invariant (pre-graduation):
///     ETH balance == ∫₀ˢ price(t) dt
///                 == BASE_PRICE * s + SLOPE * s² / 2
///
///   Fees are taken FROM the trader on top of the reserve contribution,
///   never from the reserve itself.
///
///   Buy quadratic (x = tokens to mint):
///     SLOPE/2 · x²  +  B · x  −  ethForReserve = 0
///     x = (√(B² + 2·SLOPE·ethForReserve) − B) / SLOPE
///   where B = BASE_PRICE + SLOPE · s
///
///   Graduation:
///     When ETH reserve hits GRADUATION_THRESHOLD (10 ETH), anyone may call
///     graduate(). This deploys reserve + freshly-minted tokens as permanent
///     Uniswap V2 liquidity (LP tokens burned to the dead address).
contract BondingCurveToken is ERC20, ReentrancyGuard {
    // ─── Constants ────────────────────────────────────────────────────────────

    /// @notice Starting price: 0.000001 ETH per token at supply = 0.
    uint256 public constant BASE_PRICE = 1_000_000_000_000; // 1e12 wei

    /// @notice Price slope: price rises by 1e6 wei per additional full token.
    uint256 public constant SLOPE = 1_000_000; // 1e6 wei

    /// @notice Creator fee: 1% of every trade.
    uint256 public constant FEE_BPS = 100;

    /// @notice Graduation threshold: 10 ETH in reserve triggers liquidity deployment.
    uint256 public constant GRADUATION_THRESHOLD = 10 ether;

    /// @notice Uniswap V2 Router on Base mainnet.
    address public constant UNISWAP_V2_ROUTER = 0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24;

    /// @notice LP tokens sent here are permanently locked.
    address public constant DEAD = 0x000000000000000000000000000000000000dEaD;

    uint256 private constant BPS_DENOM = 10_000;
    uint256 private constant WAD = 1e18;

    // ─── State ────────────────────────────────────────────────────────────────

    /// @notice Receives 1% of every trade.
    address public immutable creator;

    /// @notice Cumulative ETH fees sent to creator.
    uint256 public creatorFeesEarned;

    /// @notice True after graduation; buy() and sell() become disabled.
    bool public graduated;

    /// @notice Uniswap V2 pool address set at graduation (zero before).
    address public uniswapPool;

    // ─── Events ───────────────────────────────────────────────────────────────

    event Trade(
        address indexed trader,
        bool isBuy,
        uint256 tokenAmount,
        uint256 ethAmount,
        uint256 newSupply
    );

    event Graduated(
        address indexed pool,
        uint256 ethLiquidity,
        uint256 tokenLiquidity,
        uint256 supplyAtGraduation
    );

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(address _creator, string memory _name, string memory _symbol)
        ERC20(_name, _symbol)
    {
        require(_creator != address(0), "Zero creator");
        creator = _creator;
    }

    // ─── External: Buy ────────────────────────────────────────────────────────

    /// @notice Buy tokens on the bonding curve.
    ///         msg.value = reserveContribution + 1% creator fee.
    function buy() external payable nonReentrant {
        require(!graduated, "Graduated: trade on Uniswap");
        require(msg.value > 0, "Send ETH to buy");

        uint256 fee = (msg.value * FEE_BPS) / BPS_DENOM;
        uint256 ethForReserve = msg.value - fee;

        uint256 tokenAmount = _tokensForEth(ethForReserve, totalSupply());
        require(tokenAmount > 0, "Dust trade");

        creatorFeesEarned += fee;
        _mint(msg.sender, tokenAmount);

        (bool ok, ) = payable(creator).call{value: fee}("");
        require(ok, "Fee transfer failed");

        emit Trade(msg.sender, true, tokenAmount, ethForReserve, totalSupply());
    }

    // ─── External: Sell ───────────────────────────────────────────────────────

    /// @notice Sell `tokenAmount` WAD tokens and receive ETH minus 1% fee.
    function sell(uint256 tokenAmount) external nonReentrant {
        require(!graduated, "Graduated: trade on Uniswap");
        require(tokenAmount > 0, "Amount is zero");
        require(balanceOf(msg.sender) >= tokenAmount, "Insufficient balance");
        require(tokenAmount <= totalSupply(), "Exceeds supply");

        uint256 grossEth = _ethForTokens(tokenAmount, totalSupply());
        require(grossEth > 0, "Nothing to receive");

        uint256 fee = (grossEth * FEE_BPS) / BPS_DENOM;
        uint256 netEth = grossEth - fee;

        creatorFeesEarned += fee;
        _burn(msg.sender, tokenAmount);

        (bool ok1, ) = payable(creator).call{value: fee}("");
        require(ok1, "Fee transfer failed");

        (bool ok2, ) = payable(msg.sender).call{value: netEth}("");
        require(ok2, "ETH transfer failed");

        emit Trade(msg.sender, false, tokenAmount, netEth, totalSupply());
    }

    // ─── External: Graduate ───────────────────────────────────────────────────

    /// @notice Deploy bonding curve liquidity to Uniswap V2 when reserve >= 10 ETH.
    ///         Callable by anyone once threshold is met.
    ///         Mints tokens to match the graduation price, creates the Uniswap pool,
    ///         and permanently locks LP tokens by sending them to the dead address.
    function graduate() external nonReentrant {
        require(!graduated, "Already graduated");
        uint256 reserveEth = address(this).balance;
        require(reserveEth >= GRADUATION_THRESHOLD, "Below graduation threshold");

        // ── Effects first (checks-effects-interactions) ─────────────────────
        graduated = true;
        uint256 supplyAtGrad = totalSupply();

        // Price (wei per WAD) at current supply
        uint256 price = BASE_PRICE + (SLOPE * supplyAtGrad) / WAD;

        // Tokens to mint for LP such that Uniswap price == bonding curve price:
        //   reserveEth / (tokensForLP / WAD) = price / WAD
        //   tokensForLP = reserveEth * WAD / price
        uint256 tokensForLP = (reserveEth * WAD) / price;
        require(tokensForLP > 0, "Zero LP tokens");

        // ── Interactions ─────────────────────────────────────────────────────
        _mint(address(this), tokensForLP);
        _approve(address(this), UNISWAP_V2_ROUTER, tokensForLP);

        IUniswapV2Router02(UNISWAP_V2_ROUTER).addLiquidityETH{value: reserveEth}(
            address(this),
            tokensForLP,
            (tokensForLP * 90) / 100, // 10% token slippage tolerance
            (reserveEth * 90) / 100,  // 10% ETH slippage tolerance
            DEAD,                      // LP tokens permanently burned
            block.timestamp + 300
        );

        // Retrieve pool address
        address factory_ = IUniswapV2Router02(UNISWAP_V2_ROUTER).factory();
        address weth = IUniswapV2Router02(UNISWAP_V2_ROUTER).WETH();
        uniswapPool = IUniswapV2Factory(factory_).getPair(address(this), weth);

        emit Graduated(uniswapPool, reserveEth, tokensForLP, supplyAtGrad);
    }

    // ─── View ─────────────────────────────────────────────────────────────────

    /// @notice Spot price in wei per full token at current supply.
    function getCurrentPrice() external view returns (uint256) {
        return _spotPrice(totalSupply());
    }

    /// @notice Estimated tokens received for `ethAmount` wei (reserve contribution).
    function getBuyPrice(uint256 ethAmount) external view returns (uint256) {
        return _tokensForEth(ethAmount, totalSupply());
    }

    /// @notice Estimated ETH (after fee) for selling `tokenAmount` WAD tokens.
    function getSellReturn(uint256 tokenAmount) external view returns (uint256) {
        uint256 s = totalSupply();
        if (tokenAmount > s) return 0;
        uint256 gross = _ethForTokens(tokenAmount, s);
        return gross - (gross * FEE_BPS) / BPS_DENOM;
    }

    /// @notice Market cap = currentPrice × supply.
    function getMarketCap() external view returns (uint256) {
        return (_spotPrice(totalSupply()) * totalSupply()) / WAD;
    }

    /// @notice Current ETH reserve (contract balance pre-graduation).
    function getReserveEth() external view returns (uint256) {
        return address(this).balance;
    }

    /// @notice All graduation-related state in one call — saves frontend round-trips.
    function getGraduationInfo() external view returns (
        bool _graduated,
        address _pool,
        uint256 _reserveEth,
        uint256 _threshold,
        uint256 _progressBps
    ) {
        _graduated = graduated;
        _pool = uniswapPool;
        _reserveEth = address(this).balance;
        _threshold = GRADUATION_THRESHOLD;
        uint256 r = _reserveEth;
        _progressBps = r >= GRADUATION_THRESHOLD
            ? 10_000
            : (r * 10_000) / GRADUATION_THRESHOLD;
    }

    // ─── Internal: Math ───────────────────────────────────────────────────────

    /// @dev price(supplyWad) = BASE_PRICE + SLOPE * (supplyWad / WAD)
    function _spotPrice(uint256 supplyWad) internal pure returns (uint256) {
        return BASE_PRICE + (SLOPE * supplyWad) / WAD;
    }

    /// @dev Reserve at supply S (WAD):
    ///      r(S) = BASE_PRICE * (S/WAD) + SLOPE * (S/WAD)² / 2
    function _reserveAt(uint256 supplyWad) internal pure returns (uint256) {
        uint256 s = supplyWad / WAD;
        return BASE_PRICE * s + (SLOPE * s * s) / 2;
    }

    /// @dev Tokens (WAD) to mint for `ethForReserve` wei at `currentSupplyWad`.
    ///      x (full tokens) = (√(B² + 2·SLOPE·ethForReserve) − B) / SLOPE
    ///      Full 256-bit precision — no premature division.
    function _tokensForEth(uint256 ethForReserve, uint256 currentSupplyWad)
        internal pure returns (uint256)
    {
        uint256 B = BASE_PRICE + (SLOPE * currentSupplyWad) / WAD;
        uint256 discriminant = B * B + 2 * SLOPE * ethForReserve;
        uint256 sqrtD = _sqrt(discriminant);
        if (sqrtD <= B) return 0;
        uint256 xTokens = (sqrtD - B) / SLOPE;
        return xTokens * WAD;
    }

    /// @dev ETH (wei) redeemable for burning `amountWad` tokens at `currentSupplyWad`.
    function _ethForTokens(uint256 amountWad, uint256 currentSupplyWad)
        internal pure returns (uint256)
    {
        if (amountWad > currentSupplyWad) return 0;
        uint256 reserveBefore = _reserveAt(currentSupplyWad);
        uint256 reserveAfter = _reserveAt(currentSupplyWad - amountWad);
        return reserveBefore > reserveAfter ? reserveBefore - reserveAfter : 0;
    }

    /// @dev Babylonian integer square root.
    function _sqrt(uint256 x) internal pure returns (uint256 z) {
        if (x == 0) return 0;
        z = x;
        uint256 y = (x + 1) / 2;
        while (y < z) {
            z = y;
            y = (x / y + y) / 2;
        }
    }

    // ─── Fallback ─────────────────────────────────────────────────────────────

    /// @dev Pre-graduation: reject raw ETH (must use buy()).
    ///      Post-graduation: accept ETH (router refunds, etc.).
    receive() external payable {
        if (!graduated) revert("Use buy()");
    }
}

// ─────────────────────────────────────────────────────────────────────────────

/// @title TokenFactory
/// @notice Deploys BondingCurveToken contracts and maintains an on-chain registry.
contract TokenFactory {
    address[] public tokens;
    mapping(address => address) public tokenCreator;

    event TokenCreated(
        address indexed token,
        address indexed creator,
        string name,
        string symbol
    );

    /// @notice Deploy a new bonding curve token.
    ///         If msg.value > 0, it is used as a seed buy immediately after deploy.
    function createToken(string calldata _name, string calldata _symbol)
        external
        payable
        returns (address token)
    {
        require(bytes(_name).length > 0, "Name required");
        require(bytes(_symbol).length > 0, "Symbol required");

        BondingCurveToken newToken = new BondingCurveToken(msg.sender, _name, _symbol);
        token = address(newToken);
        tokens.push(token);
        tokenCreator[token] = msg.sender;

        if (msg.value > 0) {
            newToken.buy{value: msg.value}();
        }

        emit TokenCreated(token, msg.sender, _name, _symbol);
    }

    function getTokens() external view returns (address[] memory) {
        return tokens;
    }

    function getTokenCount() external view returns (uint256) {
        return tokens.length;
    }
}
