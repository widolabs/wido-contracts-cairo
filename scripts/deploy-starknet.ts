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

    console.log("Declaring WidoTokenManager contract...");
    const tokenManagerDeclareResponse = await deployer.declare({
        contract: json.parse(
            fs.readFileSync(tokenManagerContractFactory.metadataPath).toString("ascii")
        ),
        classHash: tokenManagerClassHash
    });
    console.log(tokenManagerDeclareResponse);

    const { transaction_hash } = tokenManagerDeclareResponse;
    await deployer.waitForTransaction(transaction_hash, undefined, ["ACCEPTED_ON_L2"]);

    const RouterContractFactory: StarknetContractFactory = await starknet.getContractFactory(
        "WidoRouter"
    );
    const classHash = await hre.starknetWrapper.getClassHash(RouterContractFactory.metadataPath);

    const compiledWidoRouter = json.parse(
        fs.readFileSync(RouterContractFactory.metadataPath).toString("ascii")
    );

    console.log("Declaring and deploying WidoRouter contract...");
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

export const CONTRACTS = {
    "mainnet-alpha": {
        bank: "0x02a2b6783391CE14773F7Ed61B9c84a2F56815c1F1475E5366116C308721BB36",
        wido_router: "0x7ee4864babdb42fb752870241a8613b28b575b159cab931ce71c10de31be070"
    },
    "goerli-alpha": {
        bank: "0x02a2b6783391CE14773F7Ed61B9c84a2F56815c1F1475E5366116C308721BB36",
        wido_router: "0x1c954b202470bedc8fb47cb244561a2a76180affc32be3d8a8e384d25f3c218"
    }
};

async function main() {
    // const network = "goerli-alpha";
    const network = "mainnet-alpha";
    const deployer = await getOZAccountStarknetJS("deployer", network);

    let widoRouterAddress = CONTRACTS[network]["wido_router"];
    const bank = CONTRACTS[network]["bank"];

    console.log(widoRouterAddress);
    if (widoRouterAddress == "") {
        widoRouterAddress = await deployWidoRouter(deployer, bank);
        console.log(`WidoRouter deployed to: ${adaptAddress(widoRouterAddress)}`);
    }

    const widoTokenManagerResponse = await deployer.callContract({
        contractAddress: widoRouterAddress,
        entrypoint: "wido_token_manager"
    });
    const [wido_token_manager] = widoTokenManagerResponse.result;
    console.log(`WidoTokenManager deployed to: ${adaptAddress(wido_token_manager)}`);
}

// main()
//     .then(() => process.exit(0))
//     .catch((error) => {
//         console.error(error);
//         process.exit(1);
//     });
