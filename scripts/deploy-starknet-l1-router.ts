import { starknet } from "hardhat";
import { StarknetContractFactory } from "hardhat/types";
import { adaptAddress, getOZAccountStarknetJS } from "../test/util";
import hre from "hardhat";
import { Account, Contract, json, Provider, stark } from "starknet";
import * as fs from "fs";
import { STARKGATE_ETH, STARKNET_TESTNET_USDC } from "../test/address";

async function deployWidoL1Router(deployer: Account) {
    const l1RouterContractFactory: StarknetContractFactory = await starknet.getContractFactory(
        "WidoL1Router"
    );
    const classHash = await hre.starknetWrapper.getClassHash(l1RouterContractFactory.metadataPath);

    const compiledL1Router = json.parse(
        fs.readFileSync(l1RouterContractFactory.metadataPath).toString("ascii")
    );

    const deployResponse = await deployer.declareDeploy({
        contract: compiledL1Router,
        classHash
    });
    console.log(deployResponse);
    return deployResponse.deploy.contract_address;
}

async function main() {
    const network = "goerli-alpha";
    const deployer = await getOZAccountStarknetJS("deployer", network);

    const widoRouterCairo = "0x05a0a35f386dc7e41621afcf3de7e6a74bc88ffe1c2c7e3fef0c3fa3f5154c06";
    const WidoStarknetContractAddress = "0x000E731Bf4532c0708e1A7f66b92a5382fbE2AE9";

    let deployedContractAddress =
        "0x05690fd8c9c45c3e4d88693e5158d9030ad7939e501cbab01a2869c4c6424ba1";

    if (deployedContractAddress == null) {
        deployedContractAddress = await deployWidoL1Router(deployer);
    }

    // TODO: Enable to initialize L1 Router Contract
    // const initializeResponse = await deployer.execute([
    //     {
    //         contractAddress: deployedContractAddress,
    //         entrypoint: "initialize",
    //         calldata: stark.compileCalldata({
    //             owner: deployer.address,
    //             wido_router: widoRouter,
    //             token_address: [STARKGATE_ETH, STARKNET_TESTNET_USDC]
    //         })
    //     }
    // ]);
    // console.log(initializeResponse);

    // TODO: Enable to set L1 Router Address
    // const setResponse = await deployer.execute([
    //     {
    //         contractAddress: deployedContractAddress,
    //         entrypoint: "set_l1_contract_address",
    //         calldata: stark.compileCalldata({
    //             l1_contract_address: WidoStarknetContractAddress
    //         })
    //     }
    // ]);
    // console.log(setResponse);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
