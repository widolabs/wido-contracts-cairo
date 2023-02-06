import { expect } from "chai";
import { starknet } from "hardhat";
import hre from "hardhat";
import { Account, StarknetContract, StarknetContractFactory as tt } from "hardhat/types";
import {
    STARKNET_TESTNET_ETH,
    STARKNET_TESTNET_JEDISWAP_ROUTER,
    STARKNET_TESTNET_USDC
} from "./address";
import { TIMEOUT } from "./constants";
import { adaptAddress, getOZAccount } from "./util";

import { hash, uint256 } from "starknet";

import { StarknetContractFactory } from "@shardlabs/starknet-hardhat-plugin/dist/src/types";

describe.only("WidoRouter", function () {
    this.timeout(TIMEOUT);

    let widoRouter: StarknetContract;
    let widoTokenManager: StarknetContract;
    let deployer: Account;
    let bank: Account;
    let user: Account;

    before(async function () {
        deployer = await getOZAccount("deployer");
        bank = await getOZAccount("bank");
        user = await getOZAccount("user");

        const tokenManagerContractFactory: StarknetContractFactory =
            await starknet.getContractFactory("WidoTokenManager");
        const tokenManagerClassHash = await deployer.declare(tokenManagerContractFactory);

        const contractFactory: StarknetContractFactory = await starknet.getContractFactory(
            "WidoRouter"
        );
        const classHash = await deployer.declare(contractFactory);
        widoRouter = await deployer.deploy(contractFactory);

        await deployer.invoke(widoRouter, "initialize", {
            owner: deployer.address,
            _bank: bank.address,
            wido_token_manager_class_hash: tokenManagerClassHash
        });

        const { wido_token_manager } = await widoRouter.call("wido_token_manager");
        widoTokenManager = tokenManagerContractFactory.getContractAt(
            adaptAddress(wido_token_manager)
        );
    });

    it("should swap ETH to USDC on Jediswap", async function () {
        const erc20Factory = new StarknetContractFactory({
            abiPath: "./starknet-artifacts/contracts/test/MockERC20.cairo/MockERC20_abi.json",
            hre,
            metadataPath: ""
        });
        const ethToken = erc20Factory.getContractAt(STARKNET_TESTNET_ETH);
        const usdcToken = erc20Factory.getContractAt(STARKNET_TESTNET_USDC);

        await user.invoke(ethToken, "approve", {
            spender: widoTokenManager.address,
            amount: { high: 0, low: "100000000000000000" }
        });

        const txHash = await user.invoke(widoRouter, "execute_order", {
            inputs: [
                {
                    token_address: STARKNET_TESTNET_ETH,
                    amount: { high: 0, low: "100000000000000000" }
                }
            ],
            outputs: [
                {
                    token_address: STARKNET_TESTNET_USDC,
                    min_output_amount: { high: 0, low: "1000000000" }
                }
            ],
            user: user.address,
            steps_call_array: [
                {
                    input_token: STARKNET_TESTNET_ETH,
                    to: STARKNET_TESTNET_JEDISWAP_ROUTER,
                    selector: hash.getSelectorFromName("swap_exact_tokens_for_tokens"),
                    calldata_len: 9,
                    amount_index: 0
                }
            ],
            calldata: [
                "100000000000000000", // amount in
                "0",
                "1000000000", // min amount out
                "0",
                "2", // path len
                STARKNET_TESTNET_ETH,
                STARKNET_TESTNET_USDC,
                widoRouter.address, // recipient
                "2675683658" // deadline
            ],
            recipient: user.address,
            fee_bps: 0,
            partner: 0
        });

        const { balance: usdcBalance } = await usdcToken.call("balanceOf", {
            account: user.address
        });
        expect(uint256.uint256ToBN(usdcBalance).gtn(0)).to.be.true;
    });
});
