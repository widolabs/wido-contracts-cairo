%lang starknet

from starkware.cairo.common.uint256 import Uint256
from IWidoRouter import OrderInput

@contract_interface
namespace IWidoTokenManager {
    func pull_tokens(user: felt, inputs_len: felt, inputs: OrderInput*) {
    }
}
