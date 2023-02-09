import { ethers } from "hardhat";

async function main() {
    // Starknet Addresses from https://github.com/starknet-io/starknet-addresses

    const WidoStarknetRouterFactory = await ethers.getContractFactory("WidoStarknetRouter");
    const l2WidoRecipient =
        "3111971266503832131398054440139442199364504658817781090704962428540022192691";
    const widoRouter = "0xBc34989E5aD7CDfF05b8e11d4d7EB56124a529C8";
    const WidoStarknetRouter = await WidoStarknetRouterFactory.deploy(
        "0xde29d060D45901Fb19ED6C6e959EB22d8626708e",
        widoRouter,
        "0xc3511006c04ef1d78af4c8e0e74ec18a6e64ff9e",
        l2WidoRecipient
    );

    // WidoStarknetRouter deployed on: 0x2bA2793f10c7eb3F8132187675098d0b525EdbA8 <--- OLD DO NOT USE
    // WidoStarknetRouter deployed on: 0x74C168289AdA049eAF71c9331849Ae5532606cBC
    console.log(`WidoStarknetRouter deployed on: ${WidoStarknetRouter.address}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
