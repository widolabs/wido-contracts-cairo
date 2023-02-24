pragma solidity 0.8.7;

import "hardhat/console.sol";

library WidoL2Payload {
    function isCoherent(uint256[] calldata payload) public returns (bool) {
        uint256 len = payload.length;
        uint256 cur;

        require(cur < len);

        // Inputs
        require(payload[cur] > 0);
        cur += 1 + payload[cur] * 3;
        console.log(cur);
        require(cur < len);

        // Outputs
        require(payload[cur] > 0);
        cur += 1 + payload[cur] * 3;
        console.log(cur);
        require(cur < len);

        // Steps Call Array
        uint256 expectedCalldataLen;
        uint256 stepCallArrayLen = payload[cur];
        cur += 1;
        for (uint256 i = 0; i < stepCallArrayLen; ) {
            expectedCalldataLen += payload[cur + 3];
            unchecked {
                cur += 5;
                i++;
            }
        }
        console.log(cur);
        require(cur < len);

        // Calldata
        uint256 actualCalldataLen = payload[cur];
        require(expectedCalldataLen == actualCalldataLen, "Expected calldata len in steps to match calldata len in order");

        cur += 1 + payload[cur];
        console.log(cur);
        require(cur < len);

        // Recipient
        require(cur + 1 == len);

        return true;
    }

    // function getOrderInputLength() public {
    //     require(payload[cur] == 1);  // Only one input token
    // }

    function getRecipient(uint256[] calldata payload) public pure returns (uint256) {
        // Assumes that the payload is coherent.
        uint256 cur;
        cur = 1 + payload[cur] * 3;
        cur += 1 + payload[cur] * 3;
        cur += 1 + payload[cur] * 5;
        cur += 1 + payload[cur];

        return payload[cur];
    }
}