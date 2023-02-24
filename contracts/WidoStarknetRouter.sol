// SPDX-License-Identifier: MIT.
pragma solidity 0.8.7;

import "./interfaces/IStarknetMessaging.sol";
import "./interfaces/IStarknetEthBridge.sol";
import "./interfaces/IStarknetERC20Bridge.sol";
import "./interfaces/IWidoRouter.sol";
import "./interfaces/IWidoConfig.sol";
import "solmate/src/utils/SafeTransferLib.sol";
import "./lib/WidoL2Payload.sol";
import "hardhat/console.sol";

contract WidoStarknetRouter {
    using SafeTransferLib for ERC20;
    
    IWidoConfig public widoConfig;
    IStarknetMessaging public starknetCore;

    uint256 constant DESTINATION_PAYLOAD_INPUTS_LEN_INDEX = 0;
    uint256 constant DESTINATION_PAYLOAD_INPUT0_TOKEN_ADDRESS_INDEX = 1;

    // The selector of the "execute" l1_handler in WidoL1Router.cairo
    uint256 constant EXECUTE_SELECTOR = 1017745666394979726211766185068760164586829337678283062942418931026954492996;

    IWidoRouter public widoRouter;
    uint256 public l2WidoRecipient;

    constructor(IWidoConfig _widoConfig, IStarknetMessaging _starknetCore, IWidoRouter _widoRouter, uint256 _l2WidoRecipient) {
        widoConfig = _widoConfig;
        
        // TODO: Check if any of these values got to WidoConfig.
        starknetCore = _starknetCore;
        widoRouter = _widoRouter;
        l2WidoRecipient = _l2WidoRecipient;
    }

    function _bridgeTokens(address tokenAddress, uint256 amount, uint256 starknetRecipient) internal {
        address bridge = widoConfig.getBridgeAddress(tokenAddress);
        
        if (tokenAddress == address(0)) {
            IStarknetEthBridge(bridge).deposit{value: amount}(starknetRecipient);
        } else {
            if (ERC20(tokenAddress).allowance(address(this), bridge) < amount) {
                ERC20(tokenAddress).safeApprove(bridge, type(uint256).max);
            }
            IStarknetERC20Bridge(bridge).deposit(amount, starknetRecipient);
        }
    }

    function _sendMessageToL2(uint256[] calldata payload) internal {
        starknetCore.sendMessageToL2(
            l2WidoRecipient,
            EXECUTE_SELECTOR,
            payload
        );
    }

    function _pullTokens(IWidoRouter.OrderInput[] calldata inputs) internal {
        for (uint256 i = 0; i < inputs.length;) {
            IWidoRouter.OrderInput calldata input = inputs[i];

            unchecked {
                i++;
            }
            if (input.tokenAddress == address(0)) {
                continue;
            }

            ERC20(input.tokenAddress).safeTransferFrom(msg.sender, address(this), input.amount);
        }
    }

    // TODO: Do we need to explicity specify bridgeTokenAddress?
    function executeOrder(
        IWidoRouter.Order calldata order,
        IWidoRouter.Step[] calldata steps,
        uint256 feeBps,
        address partner,
        address bridgeTokenAddress,
        uint256 l2RecipientUser,
        uint256[] calldata destinationPayload
    ) external payable {
        // How do we know what tokens in the final destination chain.
        // Final order token in this chain should be part of the bridge tokens.

        // Do validations
        require(order.user == address(this), "Order user should equal WidoStarknetRouer");
        require(order.outputs.length == 1, "Only single token output expected");

        // TODO: Validate if destination payload is correct.
        if (destinationPayload.length > 0) {
            require(WidoL2Payload.isCoherent(destinationPayload), "Incoherent destination payload");

            // Since the user can only bridge one token, allow only single token to be specified.
            require(destinationPayload[DESTINATION_PAYLOAD_INPUTS_LEN_INDEX] == 1, "Only single token input allowed in destination");

            // Bridge token on L1 should correspond to Bridged Token address on starknet
            uint256 bridgedTokenAddress = widoConfig.getBridgedTokenAddress(bridgeTokenAddress);
            require(destinationPayload[DESTINATION_PAYLOAD_INPUT0_TOKEN_ADDRESS_INDEX] == bridgedTokenAddress, "Bridge Token Mismatch");

            // TODO: inputs amount == bridge token amount. Update the value here.

            // Ensure that the recipient is same as mentioned in the order.
            require(WidoL2Payload.getRecipient(destinationPayload) == l2RecipientUser, "L2 Recipient Mismatch");
        }

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
        
        // TODO: Check if destination payload amount is equal to the
        // `amount` above. Hacker should not be able to withdraw all
        // funds from the destination account.

        if (destinationPayload.length > 0) {
            _bridgeTokens(bridgeTokenAddress, amount, l2WidoRecipient);

            // Messaging to Wido Starknet contract
            _sendMessageToL2(destinationPayload);
        } else {
            // Send tokens directly to the user
            _bridgeTokens(bridgeTokenAddress, amount, l2RecipientUser);
        }
    }
}