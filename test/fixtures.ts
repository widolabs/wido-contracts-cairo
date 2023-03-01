import { ethers, upgrades } from "hardhat";
import { Contract } from "ethers";

export async function deployMockStarknetMessaging() {
    const MockStarknetCoreFactory = await ethers.getContractFactory("MockStarknetMessaging");
    return await MockStarknetCoreFactory.deploy();
}

export async function deployMockStarknetEthBridge(starknetCore: Contract) {
    const MockStarknetEthBridgeFactory = await ethers.getContractFactory("MockStarknetEthBridge");
    return await MockStarknetEthBridgeFactory.deploy(starknetCore.address);
}

export async function deployMockStarknetERC20Bridge(starknetCore: Contract) {
    const MockStarknetERC20BridgeFactory = await ethers.getContractFactory(
        "MockStarknetERC20Bridge"
    );
    return await MockStarknetERC20BridgeFactory.deploy(starknetCore.address);
}

export async function deployMockERC20(name: string, symbol: string) {
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    return await MockERC20Factory.deploy(name, symbol);
}

export async function deployWidoConfig(mapTokenBridgeAddress: {
    [token: string]: { bridge: string; bridgedToken: string };
}) {
    const WidoConfigFactory = await ethers.getContractFactory("WidoConfig");

    const proxy = await upgrades.deployProxy(WidoConfigFactory);
    const WidoConfig = await proxy.deployed();

    const tokens = [];
    const bridges = [];
    const bridgedTokens = [];
    for (const pair in mapTokenBridgeAddress) {
        tokens.push(pair);
        bridges.push(mapTokenBridgeAddress[pair].bridge);
        bridgedTokens.push(mapTokenBridgeAddress[pair].bridgedToken);
    }
    await WidoConfig.setBridgeAddresses(tokens, bridges, bridgedTokens);

    return WidoConfig;
}

export async function deployWidoStarknetRouter(widoConfig: Contract, starknetCore: Contract) {
    const WidoL2PayloadFactory = await ethers.getContractFactory("WidoL2Payload");
    const WidoL2Payload = await WidoL2PayloadFactory.deploy();

    const widoRouter = ethers.constants.AddressZero;
    const WidoStarknetRouterFactory = await ethers.getContractFactory("WidoStarknetRouter", {
        libraries: {
            WidoL2Payload: WidoL2Payload.address
        }
    });
    const l2WidoRecipient = 100;

    const WidoStarknetRouter = await WidoStarknetRouterFactory.deploy(
        widoConfig.address,
        starknetCore.address,
        widoRouter,
        l2WidoRecipient
    );
    return WidoStarknetRouter;
}
