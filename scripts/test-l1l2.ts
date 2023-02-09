import { ethers, starknet } from "hardhat";
import { StarknetContractFactory } from "hardhat/types";

import { hash } from "starknet";
import {
    STARKNET_TESTNET_ETH,
    STARKNET_TESTNET_JEDISWAP_ROUTER,
    STARKNET_TESTNET_USDC
} from "../test/address";
import { getArgentXAccount } from "../test/util";

async function main() {
    const WidoStarknetRouterFactory = await ethers.getContractFactory("WidoStarknetRouter");
    const WidoStarknetRouter = WidoStarknetRouterFactory.attach(
        "0x2bA2793f10c7eb3F8132187675098d0b525EdbA8"
    );

    const contractFactory: StarknetContractFactory = await starknet.getContractFactory(
        "WidoRouter"
    );
    const widoRouter = contractFactory.getContractAt(
        "0x018f877d8ab63df34c70366555aaea71ef20315a544bb018ef9b059475cc93ad"
    );

    const amount = ethers.utils.parseEther("0.00001");

    // const starknetUser = await getArgentXAccount();

    const destinationArgs = {
        inputs: [
            {
                token_address: STARKNET_TESTNET_ETH,
                amount: { high: 0, low: "9970000000000" }
            }
        ],
        outputs: [
            {
                token_address: STARKNET_TESTNET_USDC,
                min_output_amount: { high: 0, low: "100000000" }
            }
        ],
        user: "0x06e150359ff1ef65eed29b4863441ea288877e59bd80e48bf134e4a21df87a33", // WidoL1Router.cairo address
        steps_call_array: [
            {
                input_token: STARKNET_TESTNET_ETH,
                to: STARKNET_TESTNET_JEDISWAP_ROUTER,
                selector: hash.getSelectorFromName("swap_exact_tokens_for_tokens"),
                calldata_len: "9",
                amount_index: "0"
            }
        ],
        calldata: [
            "9970000000000", // amount in
            "0",
            "100000000", // min amount out
            "0",
            "2", // path len
            STARKNET_TESTNET_ETH,
            STARKNET_TESTNET_USDC,
            "0x018f877d8ab63df34c70366555aaea71ef20315a544bb018ef9b059475cc93ad", // recipient
            "2675683658" // deadline
        ],
        recipient: "0x02a2b6783391CE14773F7Ed61B9c84a2F56815c1F1475E5366116C308721BB36",
        fee_bps: "0",
        partner: "0"
    };
    const destinationPayload = widoRouter.adaptInput("execute_order", destinationArgs);

    // const feeEstimate = await starknetUser.estimateInvokeFee([
    //     {
    //         contractAddress: widoRouter.address,
    //         entrypoint: "execute_order",
    //         calldata: destinationPayload
    //     }
    // ]);
    const feeEstimate = ethers.BigNumber.from("16739952544");

    const tx = await WidoStarknetRouter.executeOrder(
        {
            inputs: [
                {
                    tokenAddress: ethers.constants.AddressZero,
                    amount
                }
            ],
            outputs: [
                {
                    tokenAddress: ethers.constants.AddressZero,
                    minOutputAmount: amount.mul(997).div(1000)
                }
            ],
            user: WidoStarknetRouter.address,
            nonce: 0,
            expiration: 0
        }, // order
        [
            // {
            //     fromToken: ethers.constants.AddressZero,
            //     targetAddress: WidoStarknetRouter.address,
            //     data: WidoStarknetRouter.interface.encodeFunctionData("widoRouter"),
            //     amountIndex: -1
            // }
        ], // steps
        30, // feeBps
        ethers.constants.AddressZero, // partner
        ethers.constants.AddressZero, // bridgeTokenAddress
        destinationPayload,
        { value: amount.add(feeEstimate) }
    );

    console.log(tx);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
