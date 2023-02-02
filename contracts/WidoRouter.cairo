%lang starknet

from starkware.cairo.common.uint256 import Uint256
from starkware.cairo.common.cairo_builtins import HashBuiltin
from starkware.cairo.common.math import assert_not_zero, assert_not_equal
from openzeppelin.access.ownable.library import Ownable
from starkware.starknet.common.syscalls import deploy
from starkware.cairo.common.bool import FALSE
from starkware.starknet.common.syscalls import get_contract_address
from openzeppelin.token.erc20.IERC20 import IERC20
from starkware.cairo.common.uint256 import uint256_lt

struct OrderInput {
    token_address: felt,
    amount: Uint256,
}

struct OrderOutput {
    token_address: felt,
    min_output_amount: Uint256,
}

struct Order {
    inputs_len: felt,
    inputs: OrderInput*,
    outputs_len: felt,
    outputs: OrderOutput*,
    user: felt,
}

struct Step {
    input_token: felt,
    target_address: felt,
    data: felt,  // TODO: Check what datatype is needed.
    amount_index: felt,
}

// TODO: This is missing input and output tokens because event only support felts.
@event
func FulfilledOrder(user: felt, sender: felt, recipient: felt, fee_bps: felt, partner: felt) {
}

@event
func SetBank(bank: felt) {
}

@storage_var
func Bank() -> (bank: felt) {
}

@storage_var
func Wido_Token_Manager() -> (wido_token_manager: felt) {
}

@view
func bank{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}() -> (bank: felt) {
    return Bank.read();
}

@view
func wido_token_manager{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}() -> (
    wido_token_manager: felt
) {
    return Wido_Token_Manager.read();
}

@constructor
func constructor{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}(
    owner: felt, _bank: felt, wido_token_manager_class_hash: felt
) {
    Ownable.initializer(owner);
    Bank.write(_bank);

    with_attr error_message("Bank address cannot be zero address") {
        assert_not_zero(_bank);
    }

    let (_wido_token_manager: felt) = deploy(
        class_hash=wido_token_manager_class_hash,
        contract_address_salt=0,
        constructor_calldata_size=0,
        constructor_calldata=cast(new (0,), felt*),
        deploy_from_zero=FALSE,
    );
    Wido_Token_Manager.write(_wido_token_manager);

    return ();
}

@external
func set_bank{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}(bank: felt) {
    with_attr error_message("Bank address cannot be zero address or Wido Router address") {
        let (self_address) = get_contract_address();
        assert_not_zero(bank);
        assert_not_equal(bank, self_address);
    }
    Ownable.assert_only_owner();
    Bank.write(bank);
    SetBank.emit(bank);
    return ();
}

func approve_token{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}(
    token: felt, spender: felt, amount: Uint256
) {
    let (self_address) = get_contract_address();
    let (allowance) = IERC20.allowance(contract_address=token, owner=self_address, spender=spender);

    let (is_allowance_less_than_amount) = uint256_lt(allowance, amount);
    if (is_allowance_less_than_amount == 1) {
        IERC20.approve(contract_address=token, spender=spender, amount=amount);
        tempvar syscall_ptr = syscall_ptr;
        tempvar pedersen_ptr = pedersen_ptr;
        tempvar range_check_ptr = range_check_ptr;
    } else {
        tempvar syscall_ptr = syscall_ptr;
        tempvar pedersen_ptr = pedersen_ptr;
        tempvar range_check_ptr = range_check_ptr;
    }
    return ();
}

// contract WidoRouter is IWidoRouter, Ownable, ReentrancyGuard {
//     // Address of the wrapped native token
//     address public immutable wrappedNativeToken;

// /// @notice Executes steps in the route to transfer to token
//     /// @param route Step data for token transformation
//     /// @dev Updates the amount in the byte data with the current balance as to not leave any dust
//     /// @dev Expects step data to be properly chained for the token transformation tokenA -> tokenB -> tokenC
//     function _executeSteps(Step[] calldata route) private {
//         for (uint256 i = 0; i < route.length; ) {
//             Step calldata step = route[i];

// require(step.targetAddress != address(widoTokenManager), "Wido: forbidden call to WidoTokenManager");

// uint256 balance;
//             uint256 value;
//             if (step.fromToken == address(0)) {
//                 value = address(this).balance;
//             } else {
//                 value = 0;
//                 balance = ERC20(step.fromToken).balanceOf(address(this));
//                 require(balance > 0, "Not enough balance for the step");
//                 _approveToken(step.fromToken, step.targetAddress, balance);
//             }

// bytes memory editedSwapData;
//             if (step.amountIndex >= 0) {
//                 uint256 idx = uint256(int256(step.amountIndex));
//                 editedSwapData = bytes.concat(step.data[:idx], abi.encode(balance), step.data[idx + 32:]);
//             } else {
//                 editedSwapData = step.data;
//             }

// (bool success, bytes memory result) = step.targetAddress.call{value: value}(editedSwapData);
//             if (!success) {
//                 // Next 5 lines from https://ethereum.stackexchange.com/a/83577
//                 if (result.length < 68) revert();
//                 assembly {
//                     result := add(result, 0x04)
//                 }
//                 revert(abi.decode(result, (string)));
//             }

// unchecked {
//                 i++;
//             }
//         }
//     }

// /// @notice Executes the validated order
//     /// @param order Order to be executed
//     /// @param route Route to execute for the token swap
//     /// @param recipient The address of the final token receiver
//     /// @param feeBps Fee in basis points (bps)
//     /// @dev Expects the steps in the route to transform order.fromToken to order.toToken
//     /// @dev Expects at least order.minToTokenAmount to be transferred to the recipient
//     function _executeOrder(Order calldata order, Step[] calldata route, address recipient, uint256 feeBps) private {
//         widoTokenManager.pullTokens(order.user, order.inputs);

// for (uint256 i = 0; i < order.inputs.length; ) {
//             IWidoRouter.OrderInput calldata input = order.inputs[i];

// uint256 balance;
//             if (input.tokenAddress == address(0)) {
//                 balance = address(this).balance;
//             } else {
//                 balance = ERC20(input.tokenAddress).balanceOf(address(this));
//             }
//             require(balance >= input.amount, "Balance lower than order amount");
//             _collectFees(input.tokenAddress, balance, feeBps);

// unchecked {
//                 i++;
//             }
//         }

// _executeSteps(route);

// for (uint256 i = 0; i < order.outputs.length; ) {
//             IWidoRouter.OrderOutput calldata output = order.outputs[i];

// if (output.tokenAddress == address(0)) {
//                 uint256 balance = address(this).balance;
//                 if (balance < output.minOutputAmount) {
//                     revert SlippageTooHigh(output.minOutputAmount, balance);
//                 }
//                 recipient.safeTransferETH(balance);
//             } else {
//                 uint256 balance = ERC20(output.tokenAddress).balanceOf(address(this));
//                 if (balance < output.minOutputAmount) {
//                     revert SlippageTooHigh(output.minOutputAmount, balance);
//                 }
//                 ERC20(output.tokenAddress).safeTransfer(recipient, balance);
//             }

// unchecked {
//                 i++;
//             }
//         }
//     }

// /// @notice Returns the amount of tokens or native tokens after accounting for fee
//     /// @param fromToken Address of the token for the fee
//     /// @param amount Amount of tokens to subtract the fee
//     /// @param feeBps Fee in basis points (bps)
//     /// @dev Sends the fee to the bank to not maintain any balance in the contract
//     function _collectFees(address fromToken, uint256 amount, uint256 feeBps) private {
//         require(feeBps <= 100, "Fee out of range");
//         uint256 fee = (amount * feeBps) / 10000;
//         if (fee > 0) {
//             if (fromToken == address(0)) {
//                 bank.safeTransferETH(fee);
//             } else {
//                 ERC20(fromToken).safeTransfer(bank, fee);
//             }
//         }
//     }

// /// @notice Executes order to transform ERC20 token from order.fromToken to order.toToken
//     /// @param order Order describing the expectation of the token transformation
//     /// @param route Route describes the details of the token transformation
//     /// @param recipient Destination address where the final tokens are sent
//     /// @param feeBps Fee in basis points (bps)
//     /// @param partner Partner address
//     function executeOrder(
//         Order calldata order,
//         Step[] calldata route,
//         address recipient,
//         uint256 feeBps,
//         address partner
//     ) external payable override nonReentrant {
//         require(msg.sender == order.user, "Invalid order user");
//         _executeOrder(order, route, recipient, feeBps);
//         emit FulfilledOrder(order, msg.sender, recipient, feeBps, partner);
//     }

// /// @notice Allow receiving of native tokens
//     receive() external payable {}
// }
