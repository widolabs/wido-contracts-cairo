import { expect } from "chai";
import { starknet } from "hardhat";
import { Account, StarknetContract } from "hardhat/types";
import { TIMEOUT } from "./constants";
import { getOZAccount } from "./util";
import hre from "hardhat";
import { deployMockERC20, deployWidoL1Router, deployWidoRouter } from "./starknet-fixtures";
import { STARKGATE_ETH } from "./address";
import { StarknetContractFactory } from "@shardlabs/starknet-hardhat-plugin/dist/src/types";
import { number, uint256 } from "starknet";

describe("WidoL1Router", function () {
    this.timeout(TIMEOUT);

    let widoRouter: StarknetContract;
    let widoTokenManager: StarknetContract;
    let widoL1Router: StarknetContract;

    let deployer: Account;
    let user: Account;

    let supportedTokens: string[];

    before(async function () {
        deployer = await getOZAccount("deployer");
        user = await getOZAccount("user");

        widoRouter = await deployWidoRouter();

        const tokenManagerContractFactory = await starknet.getContractFactory("WidoTokenManager");
        const { wido_token_manager: tokenManagerAddress } = await widoRouter.call(
            "wido_token_manager"
        );
        widoTokenManager = tokenManagerContractFactory.getContractAt(
            number.toHexString(tokenManagerAddress)
        );

        const mockToken = await deployMockERC20("MockToken", "MTK");

        supportedTokens = [STARKGATE_ETH, mockToken.address];
        widoL1Router = await deployWidoL1Router(widoRouter.address, supportedTokens);
    });

    it("is initialized", async function () {
        for (const tokenAddress of supportedTokens) {
            const erc20Factory = new StarknetContractFactory({
                abiPath: "./starknet-artifacts/contracts/test/MockERC20.cairo/MockERC20_abi.json",
                hre,
                metadataPath: ""
            });
            const token = erc20Factory.getContractAt(tokenAddress);

            const allowance = await token.call("allowance", {
                owner: widoL1Router.address,
                spender: widoTokenManager.address
            });

            expect(uint256.uint256ToBN(allowance.remaining).toString()).to.eq(
                "115792089237316195423570985008687907853269984665640564039457584007913129639935"
            );
        }
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
