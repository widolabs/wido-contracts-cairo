%lang starknet

from starkware.cairo.common.cairo_builtins import HashBuiltin
from openzeppelin.security.initializable.library import Initializable
from starkware.starknet.common.syscalls import get_contract_address, get_caller_address
from interfaces.IWidoRouter import OrderInput, OrderOutput, Order, Step, StepCallArray, IWidoRouter
from starkware.cairo.common.uint256 import Uint256, uint256_not
from openzeppelin.token.erc20.IERC20 import IERC20
from openzeppelin.access.ownable.library import Ownable
from starkware.cairo.common.math import assert_not_zero

@event
func SetL1ContractAddress(l1_contract_address: felt) {
}

@storage_var
func Wido_Router() -> (wido_router: felt) {
}

@storage_var
func L1_Contract_Address() -> (l1_contract_address: felt) {
}

func approve_wido_token_manager{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}(
    wido_token_manager: felt, token_address_len: felt, token_address: felt*
) {
    if (token_address_len == 0) {
        return ();
    }

    let (infinite: Uint256) = uint256_not(Uint256(0, 0));
    IERC20.approve(contract_address=[token_address], spender=wido_token_manager, amount=infinite);

    approve_wido_token_manager(wido_token_manager, token_address_len - 1, token_address + 1);

    return ();
}

@external
func initialize{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}(
    owner: felt, wido_router: felt, token_address_len: felt, token_address: felt*
) {
    Initializable.initialize();
    Ownable.initializer(owner);

    let (wido_token_manager) = IWidoRouter.wido_token_manager(contract_address=wido_router);
    approve_wido_token_manager(wido_token_manager, token_address_len, token_address);

    Wido_Router.write(wido_router);

    return ();
}

@external
func set_l1_contract_address{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}(
    l1_contract_address: felt
) {
    with_attr error_message("L1 contract address cannot be zero address") {
        assert_not_zero(l1_contract_address);
    }
    Ownable.assert_only_owner();
    L1_Contract_Address.write(l1_contract_address);
    SetL1ContractAddress.emit(l1_contract_address);
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

    let (l1_contract_address) = L1_Contract_Address.read();
    assert from_address = l1_contract_address;

    let (wido_router) = Wido_Router.read();
    let (self_address) = get_contract_address();

    // TODO: Add try catch, if fails send bridged token to the recipient.
    // Try/Catch is not available in Cairo 0 but will be available in Cairo 1
    // https://discord.com/channels/793094838509764618/793094838987128844/1073235205923549236
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
