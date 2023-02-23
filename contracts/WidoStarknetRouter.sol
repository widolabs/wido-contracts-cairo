// SPDX-License-Identifier: MIT.
pragma solidity 0.8.7;

import "./interfaces/IStarknetMessaging.sol";
import "./interfaces/IStarknetEthBridge.sol";
import "./interfaces/IStarknetERC20Bridge.sol";
import "./interfaces/IWidoRouter.sol";
import "./interfaces/IWidoConfig.sol";
import "solmate/src/utils/SafeTransferLib.sol";

contract WidoStarknetRouter {
    using SafeTransferLib for ERC20;
    
    IWidoConfig public widoConfig;
    IStarknetMessaging public starknetCore;

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

    function _bridgeTokens(address tokenAddress, uint256 amount) internal {
        address bridge = widoConfig.getBridgeAddress(tokenAddress);
        
        if (tokenAddress == address(0)) {
            IStarknetEthBridge(bridge).deposit{value: amount}(l2WidoRecipient);
        } else {
            if (ERC20(tokenAddress).allowance(address(this), bridge) < amount) {
                ERC20(tokenAddress).safeApprove(bridge, type(uint256).max);
            }
            IStarknetERC20Bridge(bridge).deposit(amount, l2WidoRecipient);
        }
    }

    function _sendMessage(uint256[] calldata payload) internal {
        // TODO: Only send message when there is payload
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
        uint256[] calldata destinationPayload
    ) external payable {
        // Do validations
        require(order.user == address(this), "Order user should equal WidoStarknetRouer");
        // TODO: Validate if destination payload is correct.

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

        _bridgeTokens(bridgeTokenAddress, amount);

        // Call Wido messaging to Wido Starknet contract
        _sendMessage(destinationPayload);
    }
}