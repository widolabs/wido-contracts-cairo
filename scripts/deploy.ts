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

async function updateWidoConfig(widoConfigAddress: string) {
    const WidoConfigFactory = await ethers.getContractFactory("WidoConfig");

    const proxy = await upgrades.upgradeProxy(widoConfigAddress, WidoConfigFactory);

    return proxy;
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
    const WidoStarknetRouterFactory = await ethers.getContractFactory("WidoStarknetRouter", {
        libraries: {
            WidoL2Payload: WidoL2PayloadAddress
        }
    });

    const WidoStarknetRouter = await WidoStarknetRouterFactory.deploy(
        widoConfig.address,
        StarknetCoreAddress,
        WidoRouterAddress,
        WidoL2Recipient,
        {
            maxFeePerGas: "27721006484",
            maxPriorityFeePerGas: "100000000"
        }
    );

    console.log(`WidoStarknetRouter address: ${WidoStarknetRouter.address}`);

    return WidoStarknetRouter;
}

const CONTRACTS: { [key: string]: { [key: string]: string } } = {
    mainnet: {
        "wido-config": "0x2fBaB6FDC1b9236e74375Ac4331F867967E6b309",
        "wido-l2-payload": "0x32C2757Fe876013D2D6cb3460071676F8D70A49E",
        "wido-starknet-router": "0x2f6427D6437d69A2A2AE5Cc7cd6496Fd4C170365",
        "starknet-core": "0xc662c410C0ECf747543f5bA90660f6ABeBD9C8c4",
        "wido-router": "0x7Fb69e8fb1525ceEc03783FFd8a317bafbDfD394",
        "l1-router": "0x1b64371585074b2c333e8b9fea28198ed8b75efcec2f3e3f7650a63de2999c1"
    },
    goerli: {
        "wido-config": "0x01E3af00D8149FdE08BF2C9baf8f5F6058C93bde",
        "wido-l2-payload": "0x4D21A7504384ee1702C37976A82602b68b0f8704",
        "wido-starknet-router": "0x12B3b353099861d5bef14aB0157d7a404Bd0cD6a",
        "starknet-core": "0xde29d060D45901Fb19ED6C6e959EB22d8626708e",
        "wido-router": "0xBc34989E5aD7CDfF05b8e11d4d7EB56124a529C8",
        "l1-router": "0x77b746eeb2a126c616da01c64290df5dfc79be6b73f8e7ff98a6dd888754368"
    }
};

async function main() {
    const network = "mainnet";
    // Starknet Addresses from https://github.com/starknet-io/starknet-addresses

    let WidoConfigAddress = CONTRACTS[network]["wido-config"];
    const shouldUpgradeWidoConfig = true;
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
            },
            "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599": {
                bridge: "0x283751A21eafBFcD52297820D27C1f1963D9b5b4",
                bridgedToken: "0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac"
            },
            "0xdAC17F958D2ee523a2206206994597C13D831ec7": {
                bridge: "0xbb3400F107804DFB482565FF1Ec8D8aE66747605",
                bridgedToken: "0x068f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8"
            },
            "0x6B175474E89094C44Da98b954EedeAC495271d0F": {
                bridge: "0x9F96fE0633eE838D0298E8b8980E6716bE81388d",
                bridgedToken: "0x00da114221cb83fa859dbdb4c44beeaa0bb37c7537ad5ae66fe5e0efd20e6eb3"
            }
        });
        WidoConfigAddress = WidoConfig.address;
    } else {
        if (shouldUpgradeWidoConfig) {
            await updateWidoConfig(WidoConfigAddress);
        }
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
