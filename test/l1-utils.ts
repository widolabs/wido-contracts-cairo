import { ethers } from "hardhat";
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

    const MockToken = await deployMockERC20("M1", "M1");

    const WidoConfig = await deployWidoConfig({
        [ethers.constants.AddressZero]: MockStarknetEthBridge.address,
        [MockToken.address]: MockStarknetERC20Bridge.address
    });

    const WidoStarknetRouter = await deployWidoStarknetRouter(WidoConfig, MockStarknetCore);
    return {
        MockToken,
        MockStarknetCore,
        WidoStarknetRouter
    };
}
