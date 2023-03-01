import { starknet } from "hardhat";
import { StarknetContractFactory } from "hardhat/types";
import { adaptAddress, getOZAccountStarknetJS } from "../test/util";
import hre from "hardhat";
import { Contract, json, Provider, stark } from "starknet";
import * as fs from "fs";
import { STARKGATE_ETH, STARKNET_TESTNET_USDC } from "../test/address";

async function main() {
    // starknet invoke --address <l1router> --abi starknet-artifacts/contracts/WidoL1Router.cairo/WidoL1Router_abi.json --function set_l1_contract_address --inputs <>

    const network = "goerli-alpha";
    const deployer = await getOZAccountStarknetJS("deployer", network);

    const widoRouter = "0x05a0a35f386dc7e41621afcf3de7e6a74bc88ffe1c2c7e3fef0c3fa3f5154c06";
    let deployedContractAddress =
        "0x05690fd8c9c45c3e4d88693e5158d9030ad7939e501cbab01a2869c4c6424ba1";

    const l1RouterContractFactory: StarknetContractFactory = await starknet.getContractFactory(
        "WidoL1Router"
    );
    const classHash = await hre.starknetWrapper.getClassHash(l1RouterContractFactory.metadataPath);

    const compiledL1Router = json.parse(
        fs.readFileSync(l1RouterContractFactory.metadataPath).toString("ascii")
    );
    if (deployedContractAddress == null) {
        const deployResponse = await deployer.declareDeploy({
            contract: compiledL1Router,
            classHash
        });
        console.log(deployResponse);
        deployedContractAddress = deployResponse.deploy.contract_address;
    }

    const initializeResponse = await deployer.execute([
        {
            contractAddress: deployedContractAddress,
            entrypoint: "initialize",
            calldata: stark.compileCalldata({
                owner: deployer.address,
                wido_router: widoRouter,
                token_address: [STARKGATE_ETH, STARKNET_TESTNET_USDC]
            })
        }
    ]);
    console.log(initializeResponse);

    // TODO: Set L1 Router Address
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
