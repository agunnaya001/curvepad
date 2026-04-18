// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/TokenFactory.sol";

contract DeployV2 is Script {
    function run() external {
        // Handle both "0x..." and raw hex private key formats
        string memory rawKey = vm.envString("WALLET_PRIVATE_KEY");
        bytes memory keyBytes;
        if (bytes(rawKey).length >= 2 &&
            bytes(rawKey)[0] == "0" &&
            bytes(rawKey)[1] == "x") {
            keyBytes = vm.parseBytes(rawKey);
        } else {
            keyBytes = vm.parseBytes(string(abi.encodePacked("0x", rawKey)));
        }
        uint256 deployerKey = uint256(bytes32(keyBytes));

        vm.startBroadcast(deployerKey);

        TokenFactory factoryContract = new TokenFactory();
        console.log("TokenFactory V2 deployed at:", address(factoryContract));
        console.log("Deployer:", vm.addr(deployerKey));
        console.log("Chain ID:", block.chainid);

        vm.stopBroadcast();
    }
}
