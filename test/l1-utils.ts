import { ethers } from "hardhat";
import { STARKGATE_ETH } from "./address";
import {
    deployMockERC20,
    deployMockStarknetERC20Bridge,
    deployMockStarknetEthBridge,
    deployMockStarknetMessaging,
    deployWidoConfig,
    deployWidoStarknetRouter
} from "./fixtures";

export async function deployFixtures() {
    const MockStarknetCore = await deployMockStarknetMessaging();
    const MockStarknetEthBridge = await deployMockStarknetEthBridge(MockStarknetCore);
    const MockStarknetERC20Bridge = await deployMockStarknetERC20Bridge(MockStarknetCore);

    const MockToken1 = await deployMockERC20("M1", "M1");
    const MockToken2 = await deployMockERC20("M2", "M2");

    const WidoConfig = await deployWidoConfig({
        [ethers.constants.AddressZero]: {
            bridge: MockStarknetEthBridge.address,
            bridgedToken: STARKGATE_ETH
        },
        [MockToken1.address]: { bridge: MockStarknetERC20Bridge.address, bridgedToken: "1" }
    });

    const WidoStarknetRouter = await deployWidoStarknetRouter(WidoConfig, MockStarknetCore);
    return {
        MockToken1,
        MockToken2,
        MockStarknetCore,
        WidoStarknetRouter
    };
}
