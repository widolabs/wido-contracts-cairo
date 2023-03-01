// SPDX-License-Identifier: Apache-2.0.
pragma solidity 0.8.7;

import "../interfaces/IStarknetMessaging.sol";

contract MockStarknetERC20Bridge {
    uint256 constant DEPOSIT_SELECTOR =
            1285101517810983806491589552491143496277809242732141897358598292095611420389;
    uint256 constant UINT256_PART_SIZE_BITS = 128;
    uint256 constant UINT256_PART_SIZE = 2**UINT256_PART_SIZE_BITS;

    IStarknetMessaging public messagingContract;

    constructor(IStarknetMessaging _messagingContract) {
        messagingContract = _messagingContract;
    }

    function sendMessage(uint256 amount, uint256 l2Recipient)
        internal
    {
        uint256[] memory payload = new uint256[](3);
        payload[0] = l2Recipient;
        payload[1] = amount & (UINT256_PART_SIZE - 1);
        payload[2] = amount >> UINT256_PART_SIZE_BITS;
        messagingContract.sendMessageToL2(0, DEPOSIT_SELECTOR, payload);
    }

    function deposit(uint256 amount, uint256 l2Recipient) external payable {
        // The msg.value in this transaction was already credited to the contract.
        sendMessage(amount, l2Recipient);
    }

    // function withdraw(uint256 amount, address recipient) public override {
    //     consumeMessage(amount, recipient);
    //     // Make sure we don't accidentally burn funds.
    //     require(recipient != address(0x0), "INVALID_RECIPIENT");
    //     require(address(this).balance - amount <= address(this).balance, "UNDERFLOW");
    //     recipient.performEthTransfer(amount);
    // }
}