pragma solidity 0.8.7;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./interfaces/IWidoConfig.sol";

contract WidoConfig is IWidoConfig, OwnableUpgradeable {
    mapping(address => address) private _tokenToBridgeAddress;
    mapping(address => uint256) private _tokenToBridgedTokenAddress;

    // Address of fee bank
    address public _bank;

    event SetBridge(
        address tokenAddress,
        address bridgeAddress,
        uint256 bridgedTokenAddress
    );

    /// @notice Event emitted when the bank address is updated
    /// @param bank The updated address of the bank
    event SetBank(
        address bank
    );

    function initialize() initializer public {
          __Ownable_init();
    }

    function getBridgeAddress(address tokenAddress) external override view returns (address bridgeAddress) {
        bridgeAddress = _tokenToBridgeAddress[tokenAddress];
        require(bridgeAddress != address(0), "Bridge address does not exist for token");
    }

    function getBridgedTokenAddress(address tokenAddress) external override view returns (uint256 bridgedTokenAddress) {
        bridgedTokenAddress = _tokenToBridgedTokenAddress[tokenAddress];
        require(bridgedTokenAddress != 0, "Bridged token address does not exist for token");
    }

    function getBank() external override view returns (address bank) {
        bank = _bank;
    }

    function setBridgeAddress(address tokenAddress, address bridgeAddress, uint256 bridgedTokenAddress) external override onlyOwner {
        require(bridgeAddress != address(0) && bridgedTokenAddress != 0, "Bridge Address and Bridged Token address cannot be 0 address");
        _tokenToBridgeAddress[tokenAddress] = bridgeAddress;
        _tokenToBridgedTokenAddress[tokenAddress] = bridgedTokenAddress;

        emit SetBridge(tokenAddress, bridgeAddress, bridgedTokenAddress);
    }

    function setBridgeAddresses(address[] calldata tokenAddresses, address[] calldata bridgeAddresses, uint256[] calldata bridgedTokenAddresses)  external override onlyOwner {
        require(tokenAddresses.length == bridgeAddresses.length);
        require(tokenAddresses.length == bridgedTokenAddresses.length);

        for (uint256 i = 0; i < tokenAddresses.length;) {
            require(bridgeAddresses[i] != address(0) && bridgedTokenAddresses[i] != 0, "Bridge Address and Bridged Token address cannot be 0 address");
            _tokenToBridgeAddress[tokenAddresses[i]] = bridgeAddresses[i];
            _tokenToBridgedTokenAddress[tokenAddresses[i]] = bridgedTokenAddresses[i];

            emit SetBridge(tokenAddresses[i], bridgeAddresses[i], bridgedTokenAddresses[i]);

            unchecked {
                i++;
            }
        }
    }

    function setBank(address bank)  external override onlyOwner {
        require(bank != address(0), "Bank address cannot be 0 address");
        _bank = bank;

        emit SetBank(bank);
    }
}