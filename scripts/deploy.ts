import { Contract } from "ethers";
import { ethers, upgrades } from "hardhat";
import { STARKGATE_ETH, STARKNET_TESTNET_USDC } from "../test/address";

async function deployWidoConfig(mapTokenBridgeAddress: {
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

    console.log(`Wido Config Address: ${WidoConfig.address}`);

    return WidoConfig;
}

async function deployWidoL2Payload() {
    const WidoL2PayloadFactory = await ethers.getContractFactory("WidoL2Payload");
    const WidoL2Payload = await WidoL2PayloadFactory.deploy();

    console.log(`WidoL2Payload Address: ${WidoL2Payload.address}`);

    return WidoL2Payload;
}

export async function deployWidoStarknetRouter(
    widoConfig: Contract,
    StarknetCoreAddress: string,
    WidoRouterAddress: string,
    WidoL2PayloadAddress: string,
    WidoL2Recipient: string
) {
    const WidoStarknetRouterFactory = await ethers.getContractFactory("WidoStarknetRouter", {
        libraries: {
            WidoL2Payload: WidoL2PayloadAddress
        }
    });

    const WidoStarknetRouter = await WidoStarknetRouterFactory.deploy(
        widoConfig.address,
        StarknetCoreAddress,
        WidoRouterAddress,
        WidoL2Recipient
    );

    console.log(`WidoStarknetRouter address: ${WidoStarknetRouter.address}`);

    return WidoStarknetRouter;
}

async function main() {
    // Starknet Addresses from https://github.com/starknet-io/starknet-addresses
    let WidoConfigAddress = "0x01E3af00D8149FdE08BF2C9baf8f5F6058C93bde";
    let WidoConfig: Contract;

    let WidoL2PayloadAddress = "0x4D21A7504384ee1702C37976A82602b68b0f8704";

    let WidoStarknetRouterAddress = "0x000E731Bf4532c0708e1A7f66b92a5382fbE2AE9";
    let WidoStarknetRouter: Contract;

    const WidoRouterAddress = "0xBc34989E5aD7CDfF05b8e11d4d7EB56124a529C8";
    const StarknetCoreAddress = "0xde29d060D45901Fb19ED6C6e959EB22d8626708e";

    // WidoL1Router address
    const WidoL2RecipientAddress = ethers.BigNumber.from(
        "0x05690fd8c9c45c3e4d88693e5158d9030ad7939e501cbab01a2869c4c6424ba1"
    ).toString();

    if (WidoConfigAddress == null) {
        WidoConfig = await deployWidoConfig({
            [ethers.constants.AddressZero]: {
                bridge: "0xc3511006C04EF1d78af4C8E0e74Ec18A6E64Ff9e",
                bridgedToken: STARKGATE_ETH
            },
            "0x07865c6e87b9f70255377e024ace6630c1eaa37f": {
                bridge: "0xBA9cE9F22A3Cfa7Fcb5c31f6B2748b1e72C06204",
                bridgedToken: STARKNET_TESTNET_USDC
            }
        });
        WidoConfigAddress = WidoConfig.address;
    } else {
        const WidoConfigFactory = await ethers.getContractFactory("WidoConfig");
        WidoConfig = WidoConfigFactory.attach(WidoConfigAddress);
    }

    if (WidoL2PayloadAddress == null) {
        const WidoL2Payload = await deployWidoL2Payload();
        WidoL2PayloadAddress = WidoL2Payload.address;
    }

    if (WidoStarknetRouterAddress == null) {
        WidoStarknetRouter = await deployWidoStarknetRouter(
            WidoConfig,
            StarknetCoreAddress,
            WidoRouterAddress,
            WidoL2PayloadAddress,
            WidoL2RecipientAddress
        );
        WidoStarknetRouterAddress = WidoStarknetRouter.address;
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
