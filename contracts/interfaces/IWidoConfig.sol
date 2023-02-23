pragma solidity 0.8.7;

interface IWidoConfig {
    function getBridgeAddress(address tokenAddress) external returns (address bridgeAddress);

    function setBridgeAddress(address tokenAddress, address bridgeAddress) external;

    function setBridgeAddresses(address[] calldata tokenAddresses, address[] calldata bridgeAddresses)  external;
}