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
