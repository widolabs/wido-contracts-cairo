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

    it("should deploy WidoRouter", async function () {
        const account = await getOZAccount();

        const tokenManagerContractFactory: StarknetContractFactory =
            await starknet.getContractFactory("WidoTokenManager");
        const tokenManagerClassHash = await account.declare(tokenManagerContractFactory);

        const contractFactory: StarknetContractFactory = await starknet.getContractFactory(
            "WidoRouter"
        );
        const classHash = await account.declare(contractFactory);
        console.log("Declared. Class Hash:", classHash);

        const contract: StarknetContract = await account.deploy(contractFactory);
        console.log(`Deployed contract to ${contract.address} in tx ${contract.deployTxHash}`);

        await account.invoke(contract, "initialize", {
            owner: account.address,
            _bank: account.address,
            wido_token_manager_class_hash: tokenManagerClassHash
        });

        const { owner } = await contract.call("owner");
        const { wido_token_manager } = await contract.call("wido_token_manager");

        expectAddressEquality(owner, account.address);
        expect(BigInt(wido_token_manager).toString(16)).to.not.equal("0");
    });
});
