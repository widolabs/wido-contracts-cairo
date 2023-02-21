import { expect } from "chai";
import { starknet } from "hardhat";
import { Account, StarknetContract } from "hardhat/types";
import { TIMEOUT } from "./constants";
import { getOZAccount } from "./util";

import { deployWidoL1Router, deployWidoRouter } from "./fixtures";
import { STARKGATE_ETH } from "./address";

describe.only("WidoL1Router", function () {
    this.timeout(TIMEOUT);

    let widoRouter: StarknetContract;
    let widoL1Router: StarknetContract;
    let deployer: Account;
    let user: Account;

    before(async function () {
        deployer = await getOZAccount("deployer");
        user = await getOZAccount("user");

        widoRouter = await deployWidoRouter();

        widoL1Router = await deployWidoL1Router(widoRouter.address, STARKGATE_ETH);
    });

    it("[owner] should set L1 Address", async function () {
        const txHash = await deployer.invoke(widoL1Router, "set_l1_contract_address", {
            l1_contract_address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
        });
        const receipt = await starknet.getTransactionReceipt(txHash);
        const events = widoL1Router.decodeEvents(receipt.events);

        expect(events).to.deep.equal([
            {
                name: "SetL1ContractAddress",
                data: { l1_contract_address: 917551056842671309452305380979543736893630245704n }
            }
        ]);
    });

    it("[user] should fail setting L1 Address", async function () {
        try {
            await user.invoke(widoL1Router, "set_l1_contract_address", {
                l1_contract_address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
            });
            expect.fail("Should have failed on invoke by user");
        } catch (err: any) {
            expect(err.message).to.deep.contain("Ownable: caller is not the owner");
        }
    });
});
