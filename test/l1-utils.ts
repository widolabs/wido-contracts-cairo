import { ethers } from "hardhat";

export async function deployFixtures() {
    const MockStarknetCoreFactory = await ethers.getContractFactory("MockStarknetMessaging");
    const MockStarknetCore = await MockStarknetCoreFactory.deploy();

    const MockStarknetEthBridgeFactory = await ethers.getContractFactory("MockStarknetEthBridge");
    const MockStarknetEthBridge = await MockStarknetEthBridgeFactory.deploy(
        MockStarknetCore.address
    );

    const widoRouter = ethers.constants.AddressZero;
    const WidoStarknetRouterFactory = await ethers.getContractFactory("WidoStarknetRouter");
    const l2WidoRecipient = 0;
    const WidoStarknetRouter = await WidoStarknetRouterFactory.deploy(
        MockStarknetCore.address,
        widoRouter,
        MockStarknetEthBridge.address,
        l2WidoRecipient
    );
    return {
        MockStarknetCore,
        WidoStarknetRouter
    };
}
