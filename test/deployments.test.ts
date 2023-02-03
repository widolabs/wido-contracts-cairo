import { expect } from "chai";
import { starknet } from "hardhat";
import { StarknetContract, StarknetContractFactory } from "hardhat/types";
import { TIMEOUT } from "./constants";
import { expectAddressEquality, getOZAccount } from "./util";

describe("Deployments", function () {
    this.timeout(TIMEOUT);

    it("should deploy WidoTokenManager", async function () {
        const account = await getOZAccount();

        const contractFactory: StarknetContractFactory = await starknet.getContractFactory(
            "WidoTokenManager"
        );
        const classHash = await account.declare(contractFactory);
        console.log("Declared. Class Hash:", classHash);

        const contract: StarknetContract = await account.deploy(contractFactory, {
            owner: account.address
        });
        console.log(`Deployed contract to ${contract.address} in tx ${contract.deployTxHash}`);

        const { owner } = await contract.call("owner");
        expectAddressEquality(owner, account.address);
    });
});
