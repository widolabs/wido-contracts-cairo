import { starknet } from "hardhat";
import { StarknetContractFactory } from "hardhat/types";
import { getOZAccountStarknetJS } from "../test/util";
import hre from "hardhat";
import { Account, json, stark } from "starknet";
import * as fs from "fs";
import { CONTRACTS as ROUTER_CONTRACTS } from "./deploy-starknet";

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

const CONTRACTS = {
    "mainnet-alpha": {
        "l1-router": "0x7244f625106ad12fe95e1dd5a4d52576a4bfa2c129d2785afabc57d71ad6b27",
        "starknet-router": "0x0a8a3866c2e6fc7845AAe1096D54Ff9fF3AFcf8D"
    },
    "goerli-alpha": {
        "l1-router": "0x77b746eeb2a126c616da01c64290df5dfc79be6b73f8e7ff98a6dd888754368",
        "starknet-router": "0x12B3b353099861d5bef14aB0157d7a404Bd0cD6a"
    }
};

async function main() {
    // const network = "mainnet-alpha";
    const network = "goerli-alpha";
    const deployer = await getOZAccountStarknetJS("deployer", network);

    const widoRouter = ROUTER_CONTRACTS[network].wido_router;
    const WidoStarknetContractAddress = CONTRACTS[network]["starknet-router"];

    let deployedL1RouterAddress = CONTRACTS[network]["l1-router"];

    if (deployedL1RouterAddress == null || deployedL1RouterAddress == "") {
        deployedL1RouterAddress = await deployWidoL1Router(deployer);
    }

    // TODO: Enable to initialize L1 Router Contract
    // const initializeResponse = await deployer.execute([
    //     {
    //         contractAddress: deployedL1RouterAddress,
    //         entrypoint: "initialize",
    //         calldata: stark.compileCalldata({
    //             owner: deployer.address,
    //             wido_router: widoRouter
    //         })
    //     }
    // ]);
    // console.log(initializeResponse);

    // TODO: Enable to set L1 Router Address
    // const setResponse = await deployer.execute([
    //     {
    //         contractAddress: deployedL1RouterAddress,
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
