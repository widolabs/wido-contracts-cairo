import { StarknetContractFactory } from "hardhat/types";
import { getOZAccount } from "./util";
import { starknet } from "hardhat";

export async function deployWidoRouter() {
    const deployer = await getOZAccount("deployer");
    const bank = await getOZAccount("bank");

    const tokenManagerContractFactory: StarknetContractFactory = await starknet.getContractFactory(
        "WidoTokenManager"
    );
    const tokenManagerClassHash = await deployer.declare(tokenManagerContractFactory);

    const contractFactory: StarknetContractFactory = await starknet.getContractFactory(
        "WidoRouter"
    );
    await deployer.declare(contractFactory);
    const widoRouter = await deployer.deploy(contractFactory);

    await deployer.invoke(widoRouter, "initialize", {
        owner: deployer.address,
        _bank: bank.address,
        wido_token_manager_class_hash: tokenManagerClassHash
    });

    return widoRouter;
}

export async function deployWidoL1Router(widoRouterAddress: string, bridgeTokenAddress: string) {
    const deployer = await getOZAccount("deployer");

    const contractFactory: StarknetContractFactory = await starknet.getContractFactory(
        "WidoL1Router"
    );
    await deployer.declare(contractFactory);
    const widoL1Router = await deployer.deploy(contractFactory);

    await deployer.invoke(widoL1Router, "initialize", {
        owner: deployer.address,
        wido_router: widoRouterAddress,
        token_address: bridgeTokenAddress
    });

    return widoL1Router;
}
