%lang starknet

from starkware.cairo.common.cairo_builtins import HashBuiltin
from openzeppelin.access.ownable.library import Ownable

@constructor
func constructor{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}(owner: felt) {
    Ownable.initializer(owner);
    return ();
}

@external
func pull_tokens{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}(user: felt) {
    return ();
}

// contract WidoTokenManager is IWidoTokenManager, Ownable {
//     using SafeTransferLib for ERC20;

// /// @notice Transfers tokens or native tokens from the user
//     /// @param user The address of the order user
//     /// @param inputs Array of input objects, see OrderInput and Order
//     function pullTokens(address user, IWidoRouter.OrderInput[] calldata inputs) external override onlyOwner {
//         for (uint256 i = 0; i < inputs.length; i++) {
//             IWidoRouter.OrderInput calldata input = inputs[i];

// if (input.tokenAddress == address(0)) {
//                 continue;
//             }

// ERC20(input.tokenAddress).safeTransferFrom(user, owner(), input.amount);
//         }
//     }
// }
