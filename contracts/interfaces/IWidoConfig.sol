pragma solidity 0.8.7;

interface IWidoConfig {
    function getBridgeAddress(address tokenAddress) external returns (address bridgeAddress);

    function getBridgedTokenAddress(address tokenAddress) external returns (uint256 bridgedTokenAddress);

    function setBridgeAddress(address tokenAddress, address bridgeAddress, uint256 bridgedTokenAddress) external;

    function setBridgeAddresses(address[] calldata tokenAddresses, address[] calldata bridgeAddresses, uint256[] calldata bridgedTokenAddresses)  external;
}