pragma solidity 0.8.7;

import "solmate/src/tokens/ERC20.sol";

contract MockERC20 is ERC20 {
    constructor(
        string memory _name,
        string memory _symbol
    ) ERC20(_name, _symbol, 18) {}

    function mint(uint256 amount) external {
        _mint(msg.sender, amount);
    }

    function mintWithEther(uint256 amount) external payable {
        _mint(msg.sender, amount);
    }
}