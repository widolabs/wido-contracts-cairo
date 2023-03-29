import { Contract } from "ethers";
import { ethers, upgrades } from "hardhat";
import { STARKGATE_ETH, STARKNET_TESTNET_USDC, STARKNET_USDC } from "../test/address";

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
    network: string,
    widoConfig: Contract,
    StarknetCoreAddress: string,
    WidoRouterAddress: string,
    WidoL2PayloadAddress: string,
    WidoL2Recipient: string
) {
    const WidoStarknetRouterFactory = await ethers.getContractFactory(
        CONTRACTS[network]["WidoStarknetRouterFactory"],
        {
            libraries: {
                WidoL2Payload: WidoL2PayloadAddress
            }
        }
    );

    const WidoStarknetRouter = await WidoStarknetRouterFactory.deploy(
        widoConfig.address,
        StarknetCoreAddress,
        WidoRouterAddress,
        WidoL2Recipient
    );

    console.log(`WidoStarknetRouter address: ${WidoStarknetRouter.address}`);

    return WidoStarknetRouter;
}

const CONTRACTS: { [key: string]: { [key: string]: string } } = {
    mainnet: {
        "wido-config": "0x2fBaB6FDC1b9236e74375Ac4331F867967E6b309",
        "wido-l2-payload": "0x32C2757Fe876013D2D6cb3460071676F8D70A49E",
        "wido-starknet-router": "0x0a8a3866c2e6fc7845AAe1096D54Ff9fF3AFcf8D",
        "starknet-core": "0xc662c410C0ECf747543f5bA90660f6ABeBD9C8c4",
        "wido-router": "0x7Fb69e8fb1525ceEc03783FFd8a317bafbDfD394",
        "l1-router": "",
        WidoStarknetRouterFactory: "contracts/WidoStarknetRouter.sol:WidoStarknetRouter"
    },
    goerli: {
        "wido-config": "0x01E3af00D8149FdE08BF2C9baf8f5F6058C93bde",
        "wido-l2-payload": "0x4D21A7504384ee1702C37976A82602b68b0f8704",
        "wido-starknet-router": "0x12B3b353099861d5bef14aB0157d7a404Bd0cD6a",
        "starknet-core": "0xde29d060D45901Fb19ED6C6e959EB22d8626708e",
        "wido-router": "0xBc34989E5aD7CDfF05b8e11d4d7EB56124a529C8",
        "l1-router": "0x77b746eeb2a126c616da01c64290df5dfc79be6b73f8e7ff98a6dd888754368",
        WidoStarknetRouterFactory: "contracts/WidoStarknetTestnetRouter.sol:WidoStarknetRouter"
    }
};

async function main() {
    const network = "goerli";
    // Starknet Addresses from https://github.com/starknet-io/starknet-addresses

    let WidoConfigAddress = CONTRACTS[network]["wido-config"];
    let WidoConfig: Contract;

    let WidoL2PayloadAddress = CONTRACTS[network]["wido-l2-payload"];

    let WidoStarknetRouterAddress = CONTRACTS[network]["wido-starknet-router"];
    let WidoStarknetRouter: Contract;

    const WidoRouterAddress = CONTRACTS[network]["wido-router"];

    const StarknetCoreAddress = CONTRACTS[network]["starknet-core"];

    // WidoL1Router address
    const WidoL2RecipientAddress = ethers.BigNumber.from(
        CONTRACTS[network]["l1-router"]
    ).toString();

    if (WidoConfigAddress == "") {
        WidoConfig = await deployWidoConfig({
            // [ethers.constants.AddressZero]: {
            //     bridge: "0xc3511006C04EF1d78af4C8E0e74Ec18A6E64Ff9e",
            //     bridgedToken: STARKGATE_ETH
            // },
            // "0x07865c6e87b9f70255377e024ace6630c1eaa37f": {
            //     bridge: "0xBA9cE9F22A3Cfa7Fcb5c31f6B2748b1e72C06204",
            //     bridgedToken: STARKNET_TESTNET_USDC
            // }
            [ethers.constants.AddressZero]: {
                bridge: "0xae0Ee0A63A2cE6BaeEFFE56e7714FB4EFE48D419",
                bridgedToken: STARKGATE_ETH
            },
            "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48": {
                bridge: "0xF6080D9fbEEbcd44D89aFfBFd42F098cbFf92816",
                bridgedToken: STARKNET_USDC
            }
        });
        WidoConfigAddress = WidoConfig.address;
    } else {
        const WidoConfigFactory = await ethers.getContractFactory("WidoConfig");
        WidoConfig = WidoConfigFactory.attach(WidoConfigAddress);
    }

    if (WidoL2PayloadAddress == "") {
        const WidoL2Payload = await deployWidoL2Payload();
        WidoL2PayloadAddress = WidoL2Payload.address;
    }

    if (WidoStarknetRouterAddress == "") {
        WidoStarknetRouter = await deployWidoStarknetRouter(
            network,
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
