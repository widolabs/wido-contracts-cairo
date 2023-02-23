pragma solidity 0.8.7;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./interfaces/IWidoConfig.sol";

contract WidoConfig is IWidoConfig, OwnableUpgradeable {
    mapping(address => address) private _tokenToBridgeAddress;

    function initialize() initializer public {
          __Ownable_init();
    }

    function getBridgeAddress(address tokenAddress) external override returns (address bridgeAddress) {
        bridgeAddress = _tokenToBridgeAddress[tokenAddress];
    }

    function setBridgeAddress(address tokenAddress, address bridgeAddress) external override onlyOwner {
        _tokenToBridgeAddress[tokenAddress] = bridgeAddress;

        // TODO: Emit Event
    }

    function setBridgeAddresses(address[] calldata tokenAddresses, address[] calldata bridgeAddresses)  external override onlyOwner {
        require(tokenAddresses.length == bridgeAddresses.length);

        for (uint256 i = 0; i < tokenAddresses.length;) {
            _tokenToBridgeAddress[tokenAddresses[i]] = bridgeAddresses[i];

            // TODO: Emit Events

            unchecked {
                i++;
            }
        }
    }
}