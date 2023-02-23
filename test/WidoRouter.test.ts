import { expect } from "chai";
import { starknet } from "hardhat";
import hre from "hardhat";
import { Account, StarknetContract, StarknetContractFactory as tt } from "hardhat/types";
import { STARKGATE_ETH, STARKNET_TESTNET_JEDISWAP_ROUTER, STARKNET_TESTNET_USDC } from "./address";
import { TIMEOUT } from "./constants";
import { adaptAddress, getOZAccount } from "./util";

import { hash, uint256 } from "starknet";

import { StarknetContractFactory } from "@shardlabs/starknet-hardhat-plugin/dist/src/types";

describe("WidoRouter", function () {
    this.timeout(TIMEOUT);

    let widoRouter: StarknetContract;
    let widoTokenManager: StarknetContract;
    let deployer: Account;
    let bank: Account;
    let user: Account;

    let defaultCalldataExecuteOrder: any;

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

        defaultCalldataExecuteOrder = {
            inputs: [
                {
                    token_address: STARKGATE_ETH,
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
                    input_token: STARKGATE_ETH,
                    to: STARKNET_TESTNET_JEDISWAP_ROUTER,
                    selector: hash.getSelectorFromName("swap_exact_tokens_for_tokens"),
                    calldata_len: 9,
                    amount_index: -1
                }
            ],
            calldata: [
                "100000000000000000", // amount in
                "0",
                "1000000000", // min amount out
                "0",
                "2", // path len
                STARKGATE_ETH,
                STARKNET_TESTNET_USDC,
                widoRouter.address, // recipient
                "2675683658" // deadline
            ],
            recipient: user.address,
            fee_bps: 0,
            partner: 0
        };
    });

    it("should swap ETH to USDC on Jediswap", async function () {
        const erc20Factory = new StarknetContractFactory({
            abiPath: "./starknet-artifacts/contracts/test/MockERC20.cairo/MockERC20_abi.json",
            hre,
            metadataPath: ""
        });
        const ethToken = erc20Factory.getContractAt(STARKGATE_ETH);
        const usdcToken = erc20Factory.getContractAt(STARKNET_TESTNET_USDC);

        await deployer.invoke(ethToken, "transfer", {
            recipient: widoRouter.address,
            amount: { high: 0, low: "1000000000000" }
        });

        const { balance: initialContractBalance } = await ethToken.call("balanceOf", {
            account: widoRouter.address
        });
        await user.multiInvoke([
            {
                toContract: ethToken,
                functionName: "approve",
                calldata: {
                    spender: widoTokenManager.address,
                    amount: { high: 0, low: "100000000000000000" }
                }
            },
            {
                toContract: widoRouter,
                functionName: "execute_order",
                calldata: defaultCalldataExecuteOrder
            }
        ]);

        const { balance: finalContractBalance } = await ethToken.call("balanceOf", {
            account: widoRouter.address
        });

        expect(uint256.uint256ToBN(initialContractBalance).toString()).to.eq(
            uint256.uint256ToBN(finalContractBalance).toString()
        );

        const { balance: usdcBalance } = await usdcToken.call("balanceOf", {
            account: user.address
        });
        expect(uint256.uint256ToBN(usdcBalance).gtn(0)).to.be.true;
    });

    it("should swap ETH to USDC on Jediswap - all balance", async function () {
        const erc20Factory = new StarknetContractFactory({
            abiPath: "./starknet-artifacts/contracts/test/MockERC20.cairo/MockERC20_abi.json",
            hre,
            metadataPath: ""
        });
        const ethToken = erc20Factory.getContractAt(STARKGATE_ETH);
        const usdcToken = erc20Factory.getContractAt(STARKNET_TESTNET_USDC);

        await deployer.invoke(ethToken, "transfer", {
            recipient: widoRouter.address,
            amount: { high: 0, low: "1000000000000" }
        });

        const { balance: initialContractBalance } = await ethToken.call("balanceOf", {
            account: widoRouter.address
        });

        let calldataExecuteOrder: any = {};
        Object.assign(calldataExecuteOrder, defaultCalldataExecuteOrder);
        calldataExecuteOrder.steps_call_array[0].amount_index = 0;

        await user.multiInvoke([
            {
                toContract: ethToken,
                functionName: "approve",
                calldata: {
                    spender: widoTokenManager.address,
                    amount: { high: 0, low: "100000000000000000" }
                }
            },
            {
                toContract: widoRouter,
                functionName: "execute_order",
                calldata: calldataExecuteOrder
            }
        ]);

        const { balance: finalContractBalance } = await ethToken.call("balanceOf", {
            account: widoRouter.address
        });

        expect(uint256.uint256ToBN(finalContractBalance).toString()).to.eq("0");

        expect(
            uint256
                .uint256ToBN(initialContractBalance)
                .gt(uint256.uint256ToBN(finalContractBalance))
        ).to.be.true;

        const { balance: usdcBalance } = await usdcToken.call("balanceOf", {
            account: user.address
        });
        expect(uint256.uint256ToBN(usdcBalance).gtn(0)).to.be.true;
    });

    it("should not swap ETH to USDC for other user", async function () {
        const erc20Factory = new StarknetContractFactory({
            abiPath: "./starknet-artifacts/contracts/test/MockERC20.cairo/MockERC20_abi.json",
            hre,
            metadataPath: ""
        });
        const ethToken = erc20Factory.getContractAt(STARKGATE_ETH);
        const usdcToken = erc20Factory.getContractAt(STARKNET_TESTNET_USDC);

        await deployer.invoke(ethToken, "approve", {
            spender: widoTokenManager.address,
            amount: { high: 0, low: "100000000000000000" }
        });

        let calldataExecuteOrder: any = {};
        Object.assign(calldataExecuteOrder, defaultCalldataExecuteOrder);
        calldataExecuteOrder.user = deployer.address;

        try {
            await user.multiInvoke([
                {
                    toContract: widoRouter,
                    functionName: "execute_order",
                    calldata: calldataExecuteOrder
                }
            ]);
            expect.fail("Should have failed on invoke by user");
        } catch (err: any) {
            expect(err.message).to.deep.contain("Wido: Invalid order user");
        }
    });

    it("should swap ETH to USDC to recipient", async function () {
        const erc20Factory = new StarknetContractFactory({
            abiPath: "./starknet-artifacts/contracts/test/MockERC20.cairo/MockERC20_abi.json",
            hre,
            metadataPath: ""
        });
        const ethToken = erc20Factory.getContractAt(STARKGATE_ETH);
        const usdcToken = erc20Factory.getContractAt(STARKNET_TESTNET_USDC);

        const { balance: initialBankBalance } = await usdcToken.call("balanceOf", {
            account: bank.address
        });
        const { balance: initialUserBalance } = await usdcToken.call("balanceOf", {
            account: user.address
        });

        let calldataExecuteOrder: any = {};
        Object.assign(calldataExecuteOrder, defaultCalldataExecuteOrder);
        calldataExecuteOrder.recipient = bank.address;

        await user.multiInvoke([
            {
                toContract: ethToken,
                functionName: "approve",
                calldata: {
                    spender: widoTokenManager.address,
                    amount: { high: 0, low: "100000000000000000" }
                }
            },
            {
                toContract: widoRouter,
                functionName: "execute_order",
                calldata: calldataExecuteOrder
            }
        ]);

        const { balance: finalBankBalance } = await usdcToken.call("balanceOf", {
            account: bank.address
        });
        const { balance: finalUserBalance } = await usdcToken.call("balanceOf", {
            account: user.address
        });

        expect(uint256.uint256ToBN(finalBankBalance).gt(uint256.uint256ToBN(initialBankBalance))).to
            .be.true;
        expect(uint256.uint256ToBN(finalUserBalance).eq(uint256.uint256ToBN(initialUserBalance))).to
            .be.true;
    });

    it("should not swap ETH to USDC with high slippage", async function () {
        const erc20Factory = new StarknetContractFactory({
            abiPath: "./starknet-artifacts/contracts/test/MockERC20.cairo/MockERC20_abi.json",
            hre,
            metadataPath: ""
        });
        const ethToken = erc20Factory.getContractAt(STARKGATE_ETH);
        const usdcToken = erc20Factory.getContractAt(STARKNET_TESTNET_USDC);

        let calldataExecuteOrder: any = {};
        Object.assign(calldataExecuteOrder, defaultCalldataExecuteOrder);
        calldataExecuteOrder.outputs[0].min_output_amount = { high: 0, low: "10000000000" };

        try {
            await user.multiInvoke([
                {
                    toContract: ethToken,
                    functionName: "approve",
                    calldata: {
                        spender: widoTokenManager.address,
                        amount: { high: 0, low: "100000000000000000" }
                    }
                },
                {
                    toContract: widoRouter,
                    functionName: "execute_order",
                    calldata: calldataExecuteOrder
                }
            ]);
            expect.fail("Should have failed on invoke by user");
        } catch (err: any) {
            expect(err.message).to.deep.contain("Wido: Slippage Too High");
        }
    });

    it("should send fees to bank", async function () {
        const erc20Factory = new StarknetContractFactory({
            abiPath: "./starknet-artifacts/contracts/test/MockERC20.cairo/MockERC20_abi.json",
            hre,
            metadataPath: ""
        });
        const ethToken = erc20Factory.getContractAt(STARKGATE_ETH);

        const { balance: initialBankBalance } = await ethToken.call("balanceOf", {
            account: bank.address
        });

        let calldataExecuteOrder: any = {};
        Object.assign(calldataExecuteOrder, defaultCalldataExecuteOrder);
        calldataExecuteOrder.fee_bps = 49;
        // Required since fee will reduce the amount to be swapped.
        calldataExecuteOrder.steps_call_array[0].amount_index = 0;

        await user.multiInvoke([
            {
                toContract: ethToken,
                functionName: "approve",
                calldata: {
                    spender: widoTokenManager.address,
                    amount: { high: 0, low: "100000000000000000" }
                }
            },
            {
                toContract: widoRouter,
                functionName: "execute_order",
                calldata: calldataExecuteOrder
            }
        ]);

        const { balance: finalBankBalance } = await ethToken.call("balanceOf", {
            account: bank.address
        });

        expect(
            uint256
                .uint256ToBN(finalBankBalance)
                .sub(uint256.uint256ToBN(initialBankBalance))
                .toString()
        ).to.eq("490000000000000");
    });

    it("should emit FulfilledOrder event", async function () {
        const erc20Factory = new StarknetContractFactory({
            abiPath: "./starknet-artifacts/contracts/test/MockERC20.cairo/MockERC20_abi.json",
            hre,
            metadataPath: ""
        });
        const ethToken = erc20Factory.getContractAt(STARKGATE_ETH);

        let calldataExecuteOrder: any = {};
        Object.assign(calldataExecuteOrder, defaultCalldataExecuteOrder);
        calldataExecuteOrder.recipient = bank.address;
        calldataExecuteOrder.partner = deployer.address;
        calldataExecuteOrder.fee_bps = 48;
        // Required since fee will reduce the amount to be swapped.
        calldataExecuteOrder.steps_call_array[0].amount_index = 0;

        const txHash = await user.multiInvoke([
            {
                toContract: ethToken,
                functionName: "approve",
                calldata: {
                    spender: widoTokenManager.address,
                    amount: { high: 0, low: "100000000000000000" }
                }
            },
            {
                toContract: widoRouter,
                functionName: "execute_order",
                calldata: calldataExecuteOrder
            }
        ]);

        const receipt = await starknet.getTransactionReceipt(txHash);
        const events = widoRouter.decodeEvents(receipt.events);

        expect(events).to.deep.equal([
            {
                name: "FulfilledOrder",
                data: {
                    user: BigInt(user.address),
                    sender: BigInt(user.address),
                    recipient: BigInt(bank.address),
                    fee_bps: 48n,
                    partner: BigInt(deployer.address)
                }
            }
        ]);
    });
});
