pragma solidity 0.8.7;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./interfaces/IWidoConfig.sol";

contract WidoConfig is IWidoConfig, OwnableUpgradeable {
    mapping(address => address) private _tokenToBridgeAddress;
    mapping(address => uint256) private _tokenToBridgedTokenAddress;

    function initialize() initializer public {
          __Ownable_init();
    }

    function getBridgeAddress(address tokenAddress) external override returns (address bridgeAddress) {
        bridgeAddress = _tokenToBridgeAddress[tokenAddress];
    }

    function getBridgedTokenAddress(address tokenAddress) external override returns (uint256 bridgedTokenAddress) {
        bridgedTokenAddress = _tokenToBridgedTokenAddress[tokenAddress];
    }

    function setBridgeAddress(address tokenAddress, address bridgeAddress, uint256 bridgedTokenAddress) external override onlyOwner {
        _tokenToBridgeAddress[tokenAddress] = bridgeAddress;
        _tokenToBridgedTokenAddress[tokenAddress] = bridgedTokenAddress;

        // TODO: Emit Event
    }

    function setBridgeAddresses(address[] calldata tokenAddresses, address[] calldata bridgeAddresses, uint256[] calldata bridgedTokenAddresses)  external override onlyOwner {
        require(tokenAddresses.length == bridgeAddresses.length);
        require(tokenAddresses.length == bridgedTokenAddresses.length);

        for (uint256 i = 0; i < tokenAddresses.length;) {
            _tokenToBridgeAddress[tokenAddresses[i]] = bridgeAddresses[i];
            _tokenToBridgedTokenAddress[tokenAddresses[i]] = bridgedTokenAddresses[i];

            // TODO: Emit Events

            unchecked {
                i++;
            }
        }
    }
}