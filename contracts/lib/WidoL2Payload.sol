pragma solidity 0.8.7;

import "hardhat/console.sol";

library WidoL2Payload {
    function isCoherent(uint256[] calldata payload) public returns (bool) {
        uint256 len = payload.length;
        uint256 cur;

        require(cur < len);

        // Inputs
        cur += 1 + payload[cur] * 3;
        console.log(cur);
        require(cur < len);

        // Outputs
        cur += 1 + payload[cur] * 3;
        console.log(cur);
        require(cur < len);

        // Steps Call Array
        cur += 1 + payload[cur] * 5;
        console.log(cur);
        require(cur < len);

        // Calldata
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

    function getRecipient(uint256[] calldata payload) public returns (uint256) {
        return 0;
    }
}