pragma solidity 0.8.7;

library WidoL2Payload {
    uint256 constant UINT256_PART_SIZE_BITS = 128;
    uint256 constant UINT256_PART_SIZE = 2**UINT256_PART_SIZE_BITS;

    function isCoherent(uint256[] calldata payload) public pure returns (bool) {
        uint256 len = payload.length;
        uint256 cur;

        require(cur < len);

        // Inputs
        require(payload[cur] > 0);
        cur += 1 + payload[cur] * 3;
        require(cur < len);

        // Outputs
        require(payload[cur] > 0);
        cur += 1 + payload[cur] * 3;
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
        require(cur < len);

        // Calldata
        uint256 actualCalldataLen = payload[cur];
        require(expectedCalldataLen == actualCalldataLen, "Expected calldata len in steps to match calldata len in order");

        cur += 1 + payload[cur];
        require(cur < len);

        // Recipient
        require(cur + 1 == len);

        return true;
    }

    function getRecipient(uint256[] calldata payload) public pure returns (uint256) {
        // Assumes that the payload is coherent.
        uint256 cur;
        cur = 1 + payload[cur] * 3;
        cur += 1 + payload[cur] * 3;
        cur += 1 + payload[cur] * 5;
        cur += 1 + payload[cur];

        return payload[cur];
    }

    function getInputAmounts(uint256[] calldata payload) public pure returns (uint256[] memory) {
        uint256 cur;
        uint256 inputsLen = payload[cur];

        cur += 1;

        uint256[] memory amounts = new uint256[](inputsLen);
        for (uint256 i = 0; i < inputsLen; ) {
            uint256 result = payload[cur + 2] << UINT256_PART_SIZE_BITS | payload[cur + 1];
            amounts[i] = result;

            unchecked {
                i++;
                cur += 3;
            }
        }
        return amounts;
    }
}