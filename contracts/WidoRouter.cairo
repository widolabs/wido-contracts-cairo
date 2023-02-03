%lang starknet

from starkware.cairo.common.uint256 import Uint256
from starkware.cairo.common.cairo_builtins import HashBuiltin
from starkware.cairo.common.math import assert_not_zero, assert_not_equal
from starkware.cairo.common.math_cmp import is_not_zero
from openzeppelin.access.ownable.library import Ownable
from starkware.starknet.common.syscalls import deploy
from starkware.cairo.common.bool import FALSE
from starkware.starknet.common.syscalls import get_contract_address, call_contract
from openzeppelin.token.erc20.IERC20 import IERC20
from openzeppelin.security.safemath.library import SafeUint256
from starkware.cairo.common.uint256 import uint256_lt, assert_uint256_lt, assert_uint256_le
from IWidoTokenManager import IWidoTokenManager
from IWidoRouter import OrderInput, OrderOutput, Order, Step

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

func execute_steps{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}(
    steps_len: felt, steps: Step*
) {
    if (steps_len == 0) {
        return ();
    }

    let this_step: Step = [steps];

    let (_wido_token_manager) = wido_token_manager();

    with_attr error_message("Wido: forbidden call to WidoTokenManager") {
        assert_not_equal(this_step.to, _wido_token_manager);
    }

    let (self_address) = get_contract_address();
    let (balance: Uint256) = IERC20.balanceOf(
        contract_address=this_step.input_token, account=self_address
    );
    with_attr error_message("Wido: Not enough balance for the step") {
        // TODO: Find a way to check balance > 0
    }
    approve_token(this_step.input_token, this_step.to, balance);

    // TODO: See if editing the calldata is possible with the new balance.

    // TODO: Check if response needs to be rolled up like in
    // https://github.com/OpenZeppelin/cairo-contracts/blob/331844dcf278ccdf96ce3b63fb3e5f2c78970561/src/openzeppelin/account/library.cairo#L224
    call_contract(
        contract_address=this_step.to,
        function_selector=this_step.selector,
        calldata_size=this_step.calldata_len,
        calldata=this_step.calldata,
    );

    execute_steps(steps_len - 1, steps + Step.SIZE);
    return ();
}

func collect_fees{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}(
    inputs_len: felt, inputs: OrderInput*, fee_bps: felt
) {
    alloc_locals;
    if (inputs_len == 0) {
        return ();
    }

    let this_input: OrderInput = [inputs];

    let (self_address) = get_contract_address();

    let (balance: Uint256) = IERC20.balanceOf(
        contract_address=this_input.token_address, account=self_address
    );

    with_attr error_message("Wido: Balance lower than order amount") {
        assert_uint256_le(this_input.amount, balance);
    }

    // TODO: Verify if fee calculation is correct.
    let (numerator: Uint256) = SafeUint256.mul(this_input.amount, Uint256(fee_bps, 0));
    let (fee: Uint256, _) = SafeUint256.div_rem(numerator, Uint256(10000, 0));

    let (_bank: felt) = bank();

    IERC20.transfer(contract_address=this_input.token_address, recipient=_bank, amount=fee);

    collect_fees(inputs_len - 1, inputs + OrderInput.SIZE, fee_bps);
    return ();
}

func check_and_return_tokens{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}(
    outputs_len: felt, outputs: OrderOutput*
) {
    return ();
}

func execute_order{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}(
    order: Order, steps_len: felt, steps: Step*, recipient: felt, fee_bps: felt
) {
    alloc_locals;
    let (_wido_token_manager) = wido_token_manager();
    IWidoTokenManager.pull_tokens(
        contract_address=_wido_token_manager,
        user=order.user,
        inputs_len=order.inputs_len,
        inputs=order.inputs,
    );

    let is_fee_not_zero = is_not_zero(fee_bps);
    if (is_fee_not_zero == 1) {
        collect_fees(order.inputs_len, order.inputs, fee_bps);
        tempvar syscall_ptr = syscall_ptr;
        tempvar pedersen_ptr = pedersen_ptr;
        tempvar range_check_ptr = range_check_ptr;
    } else {
        tempvar syscall_ptr = syscall_ptr;
        tempvar pedersen_ptr = pedersen_ptr;
        tempvar range_check_ptr = range_check_ptr;
    }

    execute_steps(steps_len, steps);

    check_and_return_tokens(order.outputs_len, order.outputs);
    return ();
}

// contract WidoRouter is IWidoRouter, Ownable, ReentrancyGuard {
//     // Address of the wrapped native token
//     address public immutable wrappedNativeToken;

// function _executeOrder(Order calldata order, Step[] calldata route, address recipient, uint256 feeBps) private {

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
// require(feeBps <= 100, "Fee out of range");
//         require(msg.sender == order.user, "Invalid order user");
//         _executeOrder(order, route, recipient, feeBps);
//         emit FulfilledOrder(order, msg.sender, recipient, feeBps, partner);
//     }

// /// @notice Allow receiving of native tokens
//     receive() external payable {}
// }
