// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/TokenFactory.sol";

// ─── Minimal Uniswap V2 mocks ────────────────────────────────────────────────

/// @dev Deployed at a deterministic address and used via vm.etch in graduation tests.
contract MockUniswapV2Router {
    address public immutable factoryAddr;
    address public immutable wethAddr;

    constructor(address _factory, address _weth) {
        factoryAddr = _factory;
        wethAddr = _weth;
    }

    function factory() external view returns (address) { return factoryAddr; }
    function WETH() external view returns (address) { return wethAddr; }

    function addLiquidityETH(
        address, uint256, uint256, uint256, address, uint256
    ) external payable returns (uint256, uint256, uint256) {
        // Accept tokens and ETH; return dummy liquidity
        return (1e18, msg.value, 1e15);
    }

    receive() external payable {}
}

contract MockUniswapV2Factory {
    address public immutable pair;
    constructor(address _pair) { pair = _pair; }
    function getPair(address, address) external view returns (address) { return pair; }
}

// ─────────────────────────────────────────────────────────────────────────────

contract TokenFactoryTest is Test {
    TokenFactory public factory;
    address public creator = address(0xBEEF);
    address public buyer1 = address(0xCAFE);
    address public buyer2 = address(0xDEAD);

    // Uniswap V2 constants from the contract
    address constant ROUTER = 0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24;
    address constant UNISWAP_FACTORY = 0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6;

    address constant MOCK_POOL = address(0xBEEFBABE);
    address constant MOCK_WETH = address(0xF002);

    MockUniswapV2Router mockRouter;
    MockUniswapV2Factory mockFactory;

    function setUp() public {
        factory = new TokenFactory();
        vm.deal(creator, 200 ether);
        vm.deal(buyer1, 200 ether);
        vm.deal(buyer2, 200 ether);

        // Deploy mock contracts and etch them at the canonical addresses
        mockFactory = new MockUniswapV2Factory(MOCK_POOL);
        mockRouter = new MockUniswapV2Router(address(mockFactory), MOCK_WETH);

        vm.etch(ROUTER, address(mockRouter).code);
        vm.etch(UNISWAP_FACTORY, address(mockFactory).code);

        // Immutable values are baked into runtime bytecode by the constructor,
        // so vm.etch copies them correctly — no vm.store needed.
    }

    function _token(address addr) internal pure returns (BondingCurveToken) {
        return BondingCurveToken(payable(addr));
    }

    // Helper: deploy a token and buy enough to hit the graduation threshold
    function _deployAndFillToThreshold() internal returns (BondingCurveToken token) {
        vm.prank(creator);
        address tokenAddr = factory.createToken("Grad Token", "GRD");
        token = _token(tokenAddr);

        // ~10.15 ETH ensures reserve hits 10 ETH after 1% fee deduction
        vm.prank(buyer1);
        token.buy{value: 10.15 ether}();

        require(address(token).balance >= 10 ether, "Setup: threshold not reached");
    }

    // ── 1. Factory deploys correctly ─────────────────────────────────────────

    function test_createToken() public {
        vm.prank(creator);
        address tokenAddr = factory.createToken("CurvePad Test", "CPT");

        assertNotEq(tokenAddr, address(0), "Token address must be non-zero");
        assertEq(factory.getTokenCount(), 1, "Factory should have 1 token");
        assertEq(factory.getTokens()[0], tokenAddr, "Registry mismatch");
        assertEq(factory.tokenCreator(tokenAddr), creator, "Creator mismatch");

        BondingCurveToken token = _token(tokenAddr);
        assertEq(token.name(), "CurvePad Test");
        assertEq(token.symbol(), "CPT");
        assertEq(token.creator(), creator);
        assertEq(token.totalSupply(), 0);
    }

    // ── 2. Buying returns a non-trivial token amount ──────────────────────────

    function test_buyReturnsNonTrivialTokens() public {
        vm.prank(creator);
        address tokenAddr = factory.createToken("Test", "TST");
        BondingCurveToken token = _token(tokenAddr);

        uint256 ethIn = 1 ether;
        uint256 balBefore = buyer1.balance;

        vm.prank(buyer1);
        token.buy{value: ethIn}();

        uint256 tokensBought = token.balanceOf(buyer1);
        assertGt(tokensBought, 1e15, "Should receive > 0.001 tokens");
        assertLt(tokensBought, 1_000_000e18, "Should receive < 1M tokens for 1 ETH");
        assertLt(buyer1.balance, balBefore, "ETH should have been spent");
    }

    // ── 3. Reserve integrity ──────────────────────────────────────────────────

    function test_reserveIntegrity() public {
        vm.prank(creator);
        address tokenAddr = factory.createToken("Test", "TST");
        BondingCurveToken token = _token(tokenAddr);

        vm.prank(buyer1);
        token.buy{value: 2 ether}();

        uint256 S = token.totalSupply();
        uint256 BASE_PRICE = token.BASE_PRICE();
        uint256 SLOPE = token.SLOPE();
        uint256 WAD = 1e18;

        uint256 s = S / WAD;
        uint256 expectedReserve = BASE_PRICE * s + (SLOPE * s * s) / 2;
        uint256 actualReserve = address(token).balance;

        uint256 tolerance = BASE_PRICE * 2;
        assertApproxEqAbs(
            actualReserve,
            expectedReserve,
            tolerance,
            "Reserve must equal curve integral (within integer precision)"
        );
    }

    // ── 4. Sell round-trip ────────────────────────────────────────────────────

    function test_sellRoundTrip() public {
        vm.prank(creator);
        address tokenAddr = factory.createToken("Test", "TST");
        BondingCurveToken token = _token(tokenAddr);

        uint256 ethIn = 1 ether;
        uint256 ethBefore = buyer1.balance;

        vm.prank(buyer1);
        token.buy{value: ethIn}();

        uint256 tokensBought = token.balanceOf(buyer1);
        assertGt(tokensBought, 0, "Must have bought tokens");

        uint256 ethAfterBuy = buyer1.balance;

        vm.prank(buyer1);
        token.sell(tokensBought);

        uint256 ethAfterSell = buyer1.balance;

        assertGt(ethAfterSell, ethAfterBuy, "Should receive ETH back");
        uint256 netLoss = ethBefore - ethAfterSell;
        uint256 maxAllowedLoss = (ethIn * 5) / 100;
        assertLt(netLoss, maxAllowedLoss, "Net loss should be < 5% (2x 1% fees + rounding)");
    }

    // ── 5. Price strictly increases with buys ─────────────────────────────────

    function test_priceIncreasesWithBuys() public {
        vm.prank(creator);
        address tokenAddr = factory.createToken("Test", "TST");
        BondingCurveToken token = _token(tokenAddr);

        uint256 priceBefore = token.getCurrentPrice();

        vm.prank(buyer1);
        token.buy{value: 1 ether}();

        uint256 priceAfter = token.getCurrentPrice();
        assertGt(priceAfter, priceBefore, "Price must increase after buy");
    }

    // ── 6. Multiple buyers, prices ascending ──────────────────────────────────

    function test_multiplebuyers_pricesAscending() public {
        vm.prank(creator);
        address tokenAddr = factory.createToken("Test", "TST");
        BondingCurveToken token = _token(tokenAddr);

        vm.prank(buyer1);
        token.buy{value: 0.5 ether}();
        uint256 priceAfterBuyer1 = token.getCurrentPrice();

        vm.prank(buyer2);
        token.buy{value: 0.5 ether}();
        uint256 priceAfterBuyer2 = token.getCurrentPrice();

        assertGt(priceAfterBuyer2, priceAfterBuyer1, "Price must keep rising");
    }

    // ── 7. Creator receives fees ───────────────────────────────────────────────

    function test_creatorReceivesFees() public {
        vm.prank(creator);
        address tokenAddr = factory.createToken("Test", "TST");
        BondingCurveToken token = _token(tokenAddr);

        uint256 creatorBalBefore = creator.balance;

        vm.prank(buyer1);
        token.buy{value: 1 ether}();

        uint256 creatorBalAfter = creator.balance;
        assertGt(creatorBalAfter, creatorBalBefore, "Creator must receive ETH fee");
        assertApproxEqRel(
            creatorBalAfter - creatorBalBefore,
            0.01 ether,
            0.01e18,
            "Creator fee should be ~1%"
        );
    }

    // ── 8. Cannot buy with zero ETH ───────────────────────────────────────────

    function test_revertsBuyWithZeroEth() public {
        vm.prank(creator);
        address tokenAddr = factory.createToken("Test", "TST");
        BondingCurveToken token = _token(tokenAddr);

        vm.prank(buyer1);
        vm.expectRevert("Send ETH to buy");
        token.buy{value: 0}();
    }

    // ── 9. Cannot sell more tokens than owned ─────────────────────────────────

    function test_revertsSellMoreThanBalance() public {
        vm.prank(creator);
        address tokenAddr = factory.createToken("Test", "TST");
        BondingCurveToken token = _token(tokenAddr);

        vm.prank(buyer1);
        token.buy{value: 0.1 ether}();

        uint256 balance = token.balanceOf(buyer1);

        vm.prank(buyer1);
        vm.expectRevert("Insufficient balance");
        token.sell(balance + 1);
    }

    // ── 10. Factory can deploy multiple tokens ─────────────────────────────────

    function test_factoryMultipleTokens() public {
        vm.startPrank(creator);
        factory.createToken("Alpha", "ALPHA");
        factory.createToken("Beta", "BETA");
        factory.createToken("Gamma", "GAMMA");
        vm.stopPrank();

        assertEq(factory.getTokenCount(), 3);
        assertEq(factory.getTokens().length, 3);
    }

    // ── 11. Graduate reverts before threshold ─────────────────────────────────

    function test_graduateRevertsBeforeThreshold() public {
        vm.prank(creator);
        address tokenAddr = factory.createToken("Test", "TST");
        BondingCurveToken token = _token(tokenAddr);

        vm.prank(buyer1);
        token.buy{value: 1 ether}();

        assertLt(address(token).balance, 10 ether, "Should be below threshold");

        vm.expectRevert("Below graduation threshold");
        token.graduate();
    }

    // ── 12. Graduate succeeds at threshold, sets state, emits event ───────────

    function test_graduateSucceedsAtThreshold() public {
        BondingCurveToken token = _deployAndFillToThreshold();

        assertFalse(token.graduated(), "Should not be graduated yet");
        token.graduate();

        assertTrue(token.graduated(), "Should be graduated after call");
        assertEq(token.uniswapPool(), MOCK_POOL, "Pool address should be set to mock");
    }

    // ── 13. Buy blocked after graduation ──────────────────────────────────────

    function test_buyBlockedAfterGraduation() public {
        BondingCurveToken token = _deployAndFillToThreshold();
        token.graduate();

        vm.prank(buyer2);
        vm.expectRevert("Graduated: trade on Uniswap");
        token.buy{value: 0.1 ether}();
    }

    // ── 14. Sell blocked after graduation ─────────────────────────────────────

    function test_sellBlockedAfterGraduation() public {
        BondingCurveToken token = _deployAndFillToThreshold();

        // Give buyer2 some tokens before graduation
        vm.prank(buyer2);
        token.buy{value: 0.1 ether}();
        uint256 bal = token.balanceOf(buyer2);
        assertGt(bal, 0, "buyer2 should hold tokens");

        token.graduate();

        vm.prank(buyer2);
        vm.expectRevert("Graduated: trade on Uniswap");
        token.sell(bal);
    }

    // ── 15. Graduate can only be called once ──────────────────────────────────

    function test_graduateOnlyOnce() public {
        BondingCurveToken token = _deployAndFillToThreshold();
        token.graduate();

        vm.expectRevert("Already graduated");
        token.graduate();
    }

    // ── 16. getGraduationInfo returns correct progress ────────────────────────

    function test_getGraduationInfoProgress() public {
        vm.prank(creator);
        address tokenAddr = factory.createToken("Test", "TST");
        BondingCurveToken token = _token(tokenAddr);

        // Buy ~5 ETH worth (should be ~50% progress)
        vm.prank(buyer1);
        token.buy{value: 5.1 ether}();

        (bool grad, , uint256 reserve, uint256 threshold, uint256 progressBps) =
            token.getGraduationInfo();

        assertFalse(grad, "Not graduated");
        assertEq(threshold, 10 ether, "Threshold should be 10 ETH");
        assertGt(progressBps, 0, "Progress should be > 0");
        assertLt(progressBps, 10_000, "Progress should be < 100%");
        assertApproxEqRel(progressBps, 5_000, 0.05e18, "Should be ~50% progress");
    }
}
