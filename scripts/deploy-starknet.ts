import { starknet } from "hardhat";
import { StarknetContractFactory } from "hardhat/types";
import { adaptAddress, getOZAccount } from "../test/util";

async function main() {
    console.log("getting account");

    // TODO: Get OZ account doesn't work for alphaGoerli
    // Not sure if it is due to the wallet deployed
    // The wallet was deployed using starknet deploy_account
    // FOR DEPLOYING CONTRACTS USE STARKNET CLI

    // starknet declare --contract starknet-artifacts/contracts/WidoTokenManager.cairo/WidoTokenManager.json
    // CLASS HASH TOKEN MANAGER: 0x7536b25ddad2a645dbf9649762c2a345b0c1bbc6e80444d66ee5ec7219f2799

    // starknet declare --contract starknet-artifacts/contracts/WidoRouter.cairo/WidoRouter.json
    // CLASS HASH WIDO ROUTER: 0x11dcae2b29c2c6b2855c254d25a4241c0946688289b43dbf1d46fa7d65810d7

    // starknet deploy --class_hash 0x11dcae2b29c2c6b2855c254d25a4241c0946688289b43dbf1d46fa7d65810d7
    // WIDO ROUTER CONTRACT ADDRESS: 0x018f877d8ab63df34c70366555aaea71ef20315a544bb018ef9b059475cc93ad

    // starknet invoke --address 0x018f877d8ab63df34c70366555aaea71ef20315a544bb018ef9b059475cc93ad --abi starknet-artifacts/contracts/WidoRouter.cairo/WidoRouter_abi.json --function initialize --inputs 0x39226f1180b108a9ee19a051a5c79dcd50d5528c6c0ce5b127a112310460376 0x02a2b6783391CE14773F7Ed61B9c84a2F56815c1F1475E5366116C308721BB36 0x7536b25ddad2a645dbf9649762c2a345b0c1bbc6e80444d66ee5ec7219f2799

    // starknet declare --contract starknet-artifacts/contracts/WidoL1Router.cairo/WidoL1Router.json
    // CLASS HASH WIDO L1 ROUTER: 0x2a38e9c4f077f119bd459bd41c8db5198414fb3a3c257e48aeeec922e6466cb

    // starknet deploy --class_hash 0x2a38e9c4f077f119bd459bd41c8db5198414fb3a3c257e48aeeec922e6466cb
    // WIDO L1 ROUTER CONTRACT ADDRESS: 0x06e150359ff1ef65eed29b4863441ea288877e59bd80e48bf134e4a21df87a33

    // starknet invoke --address 0x06e150359ff1ef65eed29b4863441ea288877e59bd80e48bf134e4a21df87a33 --abi starknet-artifacts/contracts/WidoL1Router.cairo/WidoL1Router_abi.json --function initialize --inputs 0x018f877d8ab63df34c70366555aaea71ef20315a544bb018ef9b059475cc93ad 0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7

    const deployer = await getOZAccount("deployer");
    const bank = "0x02a2b6783391CE14773F7Ed61B9c84a2F56815c1F1475E5366116C308721BB36";

    const tokenManagerContractFactory: StarknetContractFactory = await starknet.getContractFactory(
        "WidoTokenManager"
    );
    console.log("before declaring token manager contract");
    const tokenManagerClassHash = await deployer.declare(tokenManagerContractFactory);
    console.log("declared token manager contract");

    const contractFactory: StarknetContractFactory = await starknet.getContractFactory(
        "WidoRouter"
    );
    const classHash = await deployer.declare(contractFactory);
    console.log(`WidoTokenManager class hash: ${tokenManagerClassHash}`);
    console.log(`WidoRouter class hash: ${classHash}`);
    const widoRouter = await deployer.deploy(contractFactory);

    await deployer.invoke(widoRouter, "initialize", {
        owner: deployer.address,
        _bank: bank,
        wido_token_manager_class_hash: tokenManagerClassHash
    });

    const { wido_token_manager } = await widoRouter.call("wido_token_manager");

    console.log(`WidoRouter deployed to: ${adaptAddress(widoRouter.address)}`);
    console.log(`WidoTokenManager deployed to: ${adaptAddress(wido_token_manager)}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
