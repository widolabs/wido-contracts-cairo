// SPDX-License-Identifier: MIT.
pragma solidity 0.8.7;

import "./interfaces/IStarknetMessaging.sol";
import "./interfaces/IStarknetEthBridge.sol";
import "./interfaces/IWidoRouter.sol";
import "solmate/src/utils/SafeTransferLib.sol";

contract WidoStarknetRouter {
    using SafeTransferLib for ERC20;
    
    IStarknetMessaging public starknetCore;

    // The selector of the "execute" l1_handler in WidoL1Router.cairo
    uint256 constant EXECUTE_SELECTOR = 0;

    IWidoRouter public widoRouter;
    uint256 public l2WidoRecipient;

    constructor(IStarknetMessaging _starknetCore, IWidoRouter _widoRouter, uint256 _l2WidoRecipient) {
        starknetCore = _starknetCore;
        widoRouter = _widoRouter;
        l2WidoRecipient = _l2WidoRecipient;
    }

    function getBridgeAddress(address tokenAddress) internal pure returns (address bridgeAddress) {
        // Depending on the bridge token address, this should return the bridge address.
        // Hopefully this lives outside of this contract so we can always upgrade
        // to get the new addresses.

        // TODO: Put address
        bridgeAddress = address(0);
    }

    function _bridgeTokens(address tokenAddress, uint256 amount) internal {
        address bridgeAddress = getBridgeAddress(tokenAddress);
        // TODO: Check if starkgate bridge address is approved.
        IStarknetEthBridge(bridgeAddress).deposit{value: amount}(l2WidoRecipient);
    }

    function _sendMessage(uint256[] calldata payload) internal {
        starknetCore.sendMessageToL2(
            l2WidoRecipient,
            EXECUTE_SELECTOR,
            payload
        );
    }

    function _pullTokens(IWidoRouter.OrderInput[] calldata inputs) internal {
        for (uint256 i = 0; i < inputs.length;) {
            IWidoRouter.OrderInput calldata input = inputs[i];

            if (input.tokenAddress == address(0)) {
                continue;
            }

            ERC20(input.tokenAddress).safeTransferFrom(msg.sender, address(this), input.amount);

            unchecked {
                i++;
            }
        }
    }

    // TODO: Do we need to explicity specify bridgeTokenAddress?
    function executeOrder(
        IWidoRouter.Order calldata order,
        IWidoRouter.Step[] calldata steps,
        uint256 feeBps,
        address partner,
        address bridgeTokenAddress,
        uint256[] calldata destinationPayload
    ) external payable {
        // Do validations
        require(order.user == address(this));

        // Fetch tokens from msg.sender.
        _pullTokens(order.inputs);
        
        // Run Execute Order in L1
        if (steps.length > 0) {
            widoRouter.executeOrder(order, steps, feeBps, partner);
        }

        // TODO: Add support for other ERC20 Tokens for bridging.
        uint256 amount = address(this).balance;

        // TODO: Add some expectation around the minimum value for
        // to-be-bridged tokens.

        _bridgeTokens(bridgeTokenAddress, amount);

        // Call Wido messaging to Wido Starknet contract
        _sendMessage(destinationPayload);
    }
}