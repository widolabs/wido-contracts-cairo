%lang starknet

from starkware.cairo.common.cairo_builtins import HashBuiltin
from starkware.cairo.common.math import assert_not_zero, assert_not_equal, assert_le
from starkware.cairo.common.math_cmp import is_not_zero
from openzeppelin.access.ownable.library import Ownable
from openzeppelin.security.initializable.library import Initializable
from starkware.starknet.common.syscalls import deploy
from starkware.cairo.common.bool import FALSE, TRUE
from starkware.starknet.common.syscalls import (
    get_contract_address,
    call_contract,
    get_caller_address,
)
from starkware.cairo.common.alloc import alloc
from openzeppelin.token.erc20.IERC20 import IERC20
from openzeppelin.security.safemath.library import SafeUint256
from openzeppelin.security.reentrancyguard.library import ReentrancyGuard
from starkware.cairo.common.uint256 import Uint256, uint256_lt, assert_uint256_lt, assert_uint256_le
from IWidoTokenManager import IWidoTokenManager
from IWidoRouter import OrderInput, OrderOutput, Order, Step, StepCallArray

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

@view
func owner{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}() -> (owner: felt) {
    return Ownable.owner();
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
        assert_uint256_lt(Uint256(0, 0), balance);
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
    outputs_len: felt, outputs: OrderOutput*, recipient: felt
) {
    if (outputs_len == 0) {
        return ();
    }

    let this_output: OrderOutput = [outputs];

    let (self_address) = get_contract_address();

    let (balance: Uint256) = IERC20.balanceOf(
        contract_address=this_output.token_address, account=self_address
    );

    // TODO: Add which output failed slippage check
    with_attr error_message("Wido: Slippage Too High") {
        assert_uint256_lt(this_output.min_output_amount, balance);
    }

    IERC20.transfer(
        contract_address=this_output.token_address, recipient=recipient, amount=balance
    );

    check_and_return_tokens(outputs_len - 1, outputs + OrderOutput.SIZE, recipient);

    return ();
}

func execute_order_internal{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}(
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

    check_and_return_tokens(order.outputs_len, order.outputs, recipient);
    return ();
}

func _from_steps_call_array_to_steps{syscall_ptr: felt*}(
    call_array_len: felt, call_array: StepCallArray*, calldata: felt*, steps: Step*
) {
    if (call_array_len == 0) {
        return ();
    }

    assert [steps] = Step(
        input_token=[call_array].input_token,
        to=[call_array].to,
        selector=[call_array].selector,
        calldata_len=[call_array].calldata_len,
        calldata=calldata,
        amount_index=[call_array].amount_index,
    );

    _from_steps_call_array_to_steps(
        call_array_len - 1,
        call_array + StepCallArray.SIZE,
        calldata + [call_array].calldata_len,
        steps + Step.SIZE,
    );

    return ();
}

@external
func initialize{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}(
    owner: felt, _bank: felt, wido_token_manager_class_hash: felt
) -> (wido_token_manager: felt) {
    Initializable.initialize();
    Ownable.initializer(owner);

    let (self_address) = get_contract_address();

    with_attr error_message("Bank address cannot be zero address") {
        assert_not_zero(_bank);
    }

    let (_wido_token_manager: felt) = deploy(
        class_hash=wido_token_manager_class_hash,
        contract_address_salt=0,
        constructor_calldata_size=1,
        constructor_calldata=cast(new (self_address,), felt*),
        deploy_from_zero=FALSE,
    );

    Wido_Token_Manager.write(_wido_token_manager);
    Bank.write(_bank);

    return (wido_token_manager=_wido_token_manager);
}

@external
func execute_order{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}(
    inputs_len: felt,
    inputs: OrderInput*,
    outputs_len: felt,
    outputs: OrderOutput*,
    user: felt,
    steps_call_array_len: felt,
    steps_call_array: StepCallArray*,
    calldata_len: felt,
    calldata: felt*,
    recipient: felt,
    fee_bps: felt,
    partner: felt,
) {
    alloc_locals;
    ReentrancyGuard.start();

    let (sender_address) = get_caller_address();

    with_attr error_message("Wido: Fee out of range") {
        assert_le(fee_bps, 100);
    }
    with_attr error_message("Wido: Invalid order user") {
        assert sender_address = user;
    }

    let order = Order(
        inputs_len=inputs_len, inputs=inputs, outputs_len=outputs_len, outputs=outputs, user=user
    );

    // TMP: Convert `StepCallArray` and calldata to `Step`.
    let (steps: Step*) = alloc();
    _from_steps_call_array_to_steps(steps_call_array_len, steps_call_array, calldata, steps);
    let steps_len = steps_call_array_len;

    execute_order_internal(order, steps_len, steps, recipient, fee_bps);

    FulfilledOrder.emit(user, sender_address, recipient, fee_bps, partner);

    ReentrancyGuard.end();
    return ();
}
