import { starknet } from "hardhat";
import { StarknetContractFactory } from "hardhat/types";
import { adaptAddress, getOZAccountStarknetJS } from "../test/util";
import hre from "hardhat";
import { Account, Contract, json, Provider, stark } from "starknet";
import * as fs from "fs";
import { STARKGATE_ETH, STARKNET_TESTNET_USDC, STARKNET_USDC } from "../test/address";

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
    const network = "mainnet-alpha";
    const deployer = await getOZAccountStarknetJS("deployer", network);

    // const widoRouterCairo = "0x05a0a35f386dc7e41621afcf3de7e6a74bc88ffe1c2c7e3fef0c3fa3f5154c06";  // testnet
    const widoRouterCairo = "0x53509b3ead4d93635af5f7bf477d115e635b910fd840821dda8d9c0c6e0e79c"; // mainnet
    const WidoStarknetContractAddress = "0x0a8a3866c2e6fc7845AAe1096D54Ff9fF3AFcf8D";

    let deployedContractAddress =
        "0x7244f625106ad12fe95e1dd5a4d52576a4bfa2c129d2785afabc57d71ad6b27";

    if (deployedContractAddress == null || deployedContractAddress == "") {
        deployedContractAddress = await deployWidoL1Router(deployer);
    }

    // TODO: Enable to initialize L1 Router Contract
    // const initializeResponse = await deployer.execute([
    //     {
    //         contractAddress: deployedContractAddress,
    //         entrypoint: "initialize",
    //         calldata: stark.compileCalldata({
    //             owner: deployer.address,
    //             wido_router: widoRouterCairo,
    //             // token_address: [STARKGATE_ETH, STARKNET_TESTNET_USDC]
    //             token_address: [STARKGATE_ETH, STARKNET_USDC]
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
