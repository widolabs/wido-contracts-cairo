%lang starknet

from starkware.cairo.common.cairo_builtins import HashBuiltin
from openzeppelin.security.initializable.library import Initializable
from starkware.starknet.common.syscalls import get_contract_address, get_caller_address
from interfaces.IWidoRouter import OrderInput, OrderOutput, Order, Step, StepCallArray, IWidoRouter

@storage_var
func Wido_Router() -> (wido_router: felt) {
}

@external
func initialize{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}(
    wido_router: felt
) {
    Initializable.initialize();

    // TODO: Approve Wido Token Manager

    Wido_Router.write(wido_router);

    return ();
}

// TODO: Add a withdraw function as well.

@l1_handler
func execute{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}(
    from_address: felt,
    inputs_len: felt,
    inputs: OrderInput*,
    outputs_len: felt,
    outputs: OrderOutput*,
    steps_call_array_len: felt,
    steps_call_array: StepCallArray*,
    calldata_len: felt,
    calldata: felt*,
    recipient: felt,
) {
    alloc_locals;
    // TODO: Check if the caller address is actually the core contract.

    let (wido_router) = Wido_Router.read();
    let (self_address) = get_contract_address();

    // TODO: Add try catch, if fails send bridged token to the recipient.
    IWidoRouter.execute_order(
        contract_address=wido_router,
        inputs_len=inputs_len,
        inputs=inputs,
        outputs_len=outputs_len,
        outputs=outputs,
        user=self_address,
        steps_call_array_len=steps_call_array_len,
        steps_call_array=steps_call_array,
        calldata_len=calldata_len,
        calldata=calldata,
        recipient=recipient,
        fee_bps=0,
        partner=0,
    );
    return ();
}
