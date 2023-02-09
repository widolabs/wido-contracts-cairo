%lang starknet

from starkware.cairo.common.uint256 import Uint256

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
    to: felt,
    selector: felt,
    calldata_len: felt,
    calldata: felt*,
    amount_index: felt,
}

struct StepCallArray {
    input_token: felt,
    to: felt,
    selector: felt,
    calldata_len: felt,
    amount_index: felt,
}

@contract_interface
namespace IWidoRouter {
    func wido_token_manager() -> (wido_token_manager: felt) {
    }

    func execute_order(
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
    }
}
