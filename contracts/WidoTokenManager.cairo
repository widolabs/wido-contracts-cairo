%lang starknet

from starkware.cairo.common.cairo_builtins import HashBuiltin
from openzeppelin.access.ownable.library import Ownable
from openzeppelin.token.erc20.IERC20 import IERC20
from starkware.cairo.common.uint256 import Uint256
from interfaces.IWidoRouter import OrderInput

@constructor
func constructor{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}(owner: felt) {
    Ownable.initializer(owner);
    return ();
}

//
// Getters
//

@view
func owner{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}() -> (owner: felt) {
    return Ownable.owner();
}

//
// Externals
//

@external
func transferOwnership{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}(
    newOwner: felt
) {
    Ownable.transfer_ownership(newOwner);
    return ();
}

@external
func renounceOwnership{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}() {
    Ownable.renounce_ownership();
    return ();
}

@external
func pull_tokens{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}(
    user: felt, inputs_len: felt, inputs: OrderInput*
) {
    // There is not loop in Cairo.
    // Base condition for recursion.
    if (inputs_len == 0) {
        return ();
    }

    let (local_owner) = owner();
    IERC20.transferFrom(
        contract_address=inputs[0].token_address,
        sender=user,
        recipient=local_owner,
        amount=inputs[0].amount,
    );
    pull_tokens(user, inputs_len - 1, inputs + OrderInput.SIZE);
    return ();
}
