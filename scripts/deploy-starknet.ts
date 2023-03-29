import { starknet } from "hardhat";
import { StarknetContractFactory } from "hardhat/types";
import { Account, json, stark } from "starknet";
import hre from "hardhat";
import { adaptAddress, getOZAccountStarknetJS } from "../test/util";
import * as fs from "fs";

async function deployWidoRouter(deployer: Account, bank: string) {
    const tokenManagerContractFactory: StarknetContractFactory = await starknet.getContractFactory(
        "WidoTokenManager"
    );
    const tokenManagerClassHash = await hre.starknetWrapper.getClassHash(
        tokenManagerContractFactory.metadataPath
    );

    const tokenManagerDeclareResponse = await deployer.declare({
        contract: json.parse(
            fs.readFileSync(tokenManagerContractFactory.metadataPath).toString("ascii")
        ),
        classHash: tokenManagerClassHash
    });
    console.log(tokenManagerDeclareResponse);

    const RouterContractFactory: StarknetContractFactory = await starknet.getContractFactory(
        "WidoRouter"
    );
    const classHash = await hre.starknetWrapper.getClassHash(RouterContractFactory.metadataPath);

    const compiledWidoRouter = json.parse(
        fs.readFileSync(RouterContractFactory.metadataPath).toString("ascii")
    );

    const deployResponse = await deployer.declareDeploy({
        contract: compiledWidoRouter,
        classHash
    });
    console.log(deployResponse);

    const deployedContractAddress = deployResponse.deploy.contract_address;

    const initializeResponse = await deployer.execute([
        {
            contractAddress: deployedContractAddress,
            entrypoint: "initialize",
            calldata: stark.compileCalldata({
                owner: deployer.address,
                _bank: bank,
                wido_token_manager_class_hash: tokenManagerClassHash
            })
        }
    ]);
    console.log(initializeResponse);

    return deployedContractAddress;
}

async function main() {
    let deployedContractAddress =
        "0x53509b3ead4d93635af5f7bf477d115e635b910fd840821dda8d9c0c6e0e79c";

    // const network = "goerli-alpha";
    const network = "mainnet-alpha";
    const deployer = await getOZAccountStarknetJS("deployer", network);

    const bank = "0x02a2b6783391CE14773F7Ed61B9c84a2F56815c1F1475E5366116C308721BB36";

    if (deployedContractAddress == "") {
        deployedContractAddress = await deployWidoRouter(deployer, bank);
        console.log(`WidoRouter deployed to: ${adaptAddress(deployedContractAddress)}`);
    }

    const widoTokenManagerResponse = await deployer.callContract({
        contractAddress: deployedContractAddress,
        entrypoint: "wido_token_manager"
    });
    const [wido_token_manager] = widoTokenManagerResponse.result;
    console.log(`WidoTokenManager deployed to: ${adaptAddress(wido_token_manager)}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
