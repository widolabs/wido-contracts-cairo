import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contract } from "ethers";
import { ethers } from "hardhat";
import { expect } from "chai";
import { deployFixtures } from "./l1-utils";

const STARKNET_ORDER_ORDER_INDEX = 0;
const STARKNET_ORDER_STEPS_INDEX = 1;
const STARKNET_ORDER_VALUE_INDEX = 8;
const STARKNET_ORDER_DESTINATION_PAYLOAD_INDEX = 5;
const DESTINATION_PAYLOAD_OUTPUT_LEN = 4;
const DESTINATION_PAYLOAD_RECIPIENT = 25;

// TODO: Add tests with steps and using ERC20 tokens, approve is missing
//
describe("WidoStarknetRouter", async function () {
    let MockStarknetCore: any;
    let WidoStarknetRouter: Contract;
    let MockToken1: Contract;
    let MockToken2: Contract;
    let signer: SignerWithAddress;

    let defaultStarknetOrder: any;
    let defaultDestionationPayload: any;

    before(async function () {
        // Deploy contracts
        [signer] = await ethers.getSigners();
        ({ MockToken1, MockToken2, MockStarknetCore, WidoStarknetRouter } = await deployFixtures());

        defaultStarknetOrder = [
            {
                inputs: [
                    {
                        tokenAddress: ethers.constants.AddressZero,
                        amount: ethers.utils.parseEther("1")
                    }
                ],
                outputs: [
                    {
                        tokenAddress: ethers.constants.AddressZero,
                        minOutputAmount: ethers.utils.parseEther("1").mul(997).div(1000)
                    }
                ],
                user: WidoStarknetRouter.address,
                nonce: 0,
                expiration: 0
            }, // order
            [], // steps
            30, // feeBps
            ethers.constants.AddressZero, // partner
            1,
            [], // destinationPayload
            1,
            0,
            {
                value: ethers.utils.parseEther("1").add(1)
            }
        ];

        defaultDestionationPayload = [
            "1",
            "2087021424722619777119509474943472645767659996348769578120564519014510906823",
            "99700000000000000",
            "0",
            "1",
            "301189193390252739607480744916151674445630112229853814091039773940129353020",
            "837400614545145344",
            "0",
            "1",
            "2087021424722619777119509474943472645767659996348769578120564519014510906823",
            "3276154100036711816479787650255760337671184333283148691045776799927075614991",
            "133320478084672596723515863423952190972856683318200408264636951270550714417",
            "10",
            "0",
            "10",
            "2087021424722619777119509474943472645767659996348769578120564519014510906823",
            "301189193390252739607480744916151674445630112229853814091039773940129353020",
            "99700000000000000",
            "0",
            "1",
            "0",
            "2",
            "2087021424722619777119509474943472645767659996348769578120564519014510906823",
            "1767481910113252210994791615708990276342505294349567333924577048691453030089",
            "0",
            "1"
        ];
    });

    it("should send ETH to Starknet", async function () {
        await WidoStarknetRouter.executeOrder(...defaultStarknetOrder);

        await expect((await MockStarknetCore.l1ToL2MessageNonce()).toNumber()).to.equal(1);
    });

    it("should send ERC20 to Starknet", async function () {
        const amount = ethers.utils.parseEther("1");
        await MockToken1.mint(amount);
        await MockToken1.approve(WidoStarknetRouter.address, amount);

        const starknetOrder = JSON.parse(JSON.stringify(defaultStarknetOrder));
        starknetOrder[0].inputs[0].tokenAddress = MockToken1.address;
        starknetOrder[0].outputs[0].tokenAddress = MockToken1.address;
        starknetOrder[STARKNET_ORDER_VALUE_INDEX] = { value: 1 };
        await WidoStarknetRouter.executeOrder(...starknetOrder);

        await expect((await MockStarknetCore.l1ToL2MessageNonce()).toNumber()).to.equal(2);
    });

    it("should verify destination payload success", async function () {
        const starknetOrder = JSON.parse(JSON.stringify(defaultStarknetOrder));
        starknetOrder[STARKNET_ORDER_DESTINATION_PAYLOAD_INDEX] = defaultDestionationPayload;
        starknetOrder[STARKNET_ORDER_VALUE_INDEX] = { value: ethers.utils.parseEther("1").add(2) };
        await WidoStarknetRouter.executeOrder(...starknetOrder);

        await expect((await MockStarknetCore.l1ToL2MessageNonce()).toNumber()).to.equal(4);
    });

    it("should verify destination payload: incoherent input", async function () {
        const starknetOrder = JSON.parse(JSON.stringify(defaultStarknetOrder));
        const destinationPayload = [...defaultDestionationPayload];
        destinationPayload[0] = "2";
        starknetOrder[STARKNET_ORDER_DESTINATION_PAYLOAD_INDEX] = destinationPayload;
        starknetOrder[STARKNET_ORDER_VALUE_INDEX] = { value: ethers.utils.parseEther("1").add(2) };

        await expect(WidoStarknetRouter.executeOrder(...starknetOrder)).to.be.reverted;
    });

    it("should verify destination payload: no output token", async function () {
        const starknetOrder = JSON.parse(JSON.stringify(defaultStarknetOrder));
        const destinationPayload = [...defaultDestionationPayload];
        destinationPayload[DESTINATION_PAYLOAD_OUTPUT_LEN] = "0";
        starknetOrder[STARKNET_ORDER_DESTINATION_PAYLOAD_INDEX] = destinationPayload;
        starknetOrder[STARKNET_ORDER_VALUE_INDEX] = { value: ethers.utils.parseEther("1").add(2) };

        await expect(WidoStarknetRouter.executeOrder(...starknetOrder)).to.be.reverted;
    });

    it("should verify destination payload: two input token", async function () {
        const starknetOrder = JSON.parse(JSON.stringify(defaultStarknetOrder));
        const destinationPayload = [
            "2",
            ...defaultDestionationPayload.slice(1, 4),
            ...defaultDestionationPayload.slice(1, 4),
            ...defaultDestionationPayload.slice(4)
        ];
        starknetOrder[STARKNET_ORDER_DESTINATION_PAYLOAD_INDEX] = destinationPayload;
        starknetOrder[STARKNET_ORDER_VALUE_INDEX] = { value: ethers.utils.parseEther("1").add(2) };

        await expect(WidoStarknetRouter.executeOrder(...starknetOrder)).to.be.revertedWith(
            "Only single token input allowed in destination"
        );
    });

    it("should verify destination payload: mismatch recipient", async function () {
        const starknetOrder = JSON.parse(JSON.stringify(defaultStarknetOrder));
        const destinationPayload = [...defaultDestionationPayload];
        destinationPayload[DESTINATION_PAYLOAD_RECIPIENT] = "2";
        starknetOrder[STARKNET_ORDER_DESTINATION_PAYLOAD_INDEX] = destinationPayload;
        starknetOrder[STARKNET_ORDER_VALUE_INDEX] = { value: ethers.utils.parseEther("1").add(2) };

        await expect(WidoStarknetRouter.executeOrder(...starknetOrder)).to.be.revertedWith(
            "L2 Recipient Mismatch"
        );
    });

    it("should verify destination payload: mismatch bridge token", async function () {
        const starknetOrder = JSON.parse(JSON.stringify(defaultStarknetOrder));
        starknetOrder[STARKNET_ORDER_ORDER_INDEX].outputs[0].tokenAddress = MockToken1.address;
        starknetOrder[STARKNET_ORDER_DESTINATION_PAYLOAD_INDEX] = defaultDestionationPayload;
        starknetOrder[STARKNET_ORDER_VALUE_INDEX] = { value: ethers.utils.parseEther("1").add(2) };

        await expect(WidoStarknetRouter.executeOrder(...starknetOrder)).to.be.revertedWith(
            "Bridge Token Mismatch"
        );
    });

    it("should verify starknet order: multiple expected output tokens", async function () {
        const starknetOrder = JSON.parse(JSON.stringify(defaultStarknetOrder));
        starknetOrder[STARKNET_ORDER_ORDER_INDEX].outputs.push({
            tokenAddress: ethers.constants.AddressZero,
            minOutputAmount: 1
        });

        await expect(WidoStarknetRouter.executeOrder(...starknetOrder)).to.be.revertedWith(
            "Only single token output expected"
        );
    });

    it("should verify destination payload: mismatch calldata len", async function () {
        const starknetOrder = JSON.parse(JSON.stringify(defaultStarknetOrder));
        starknetOrder[STARKNET_ORDER_DESTINATION_PAYLOAD_INDEX] = [
            "1",
            "2087021424722619777119509474943472645767659996348769578120564519014510906823",
            "99700000000000000",
            "0",
            "1",
            "301189193390252739607480744916151674445630112229853814091039773940129353020",
            "837400614545145344",
            "0",
            "1",
            "2087021424722619777119509474943472645767659996348769578120564519014510906823",
            "3276154100036711816479787650255760337671184333283148691045776799927075614991",
            "133320478084672596723515863423952190972856683318200408264636951270550714417",
            "10",
            "0",
            "9", // Changed from 10 -> 9
            "2087021424722619777119509474943472645767659996348769578120564519014510906823",
            "301189193390252739607480744916151674445630112229853814091039773940129353020",
            "99700000000000000",
            "0",
            "1",
            "0",
            "2",
            "2087021424722619777119509474943472645767659996348769578120564519014510906823",
            // Removed 1 calldata
            "0",
            "1"
        ];
        starknetOrder[STARKNET_ORDER_VALUE_INDEX] = { value: ethers.utils.parseEther("1").add(2) };

        await expect(WidoStarknetRouter.executeOrder(...starknetOrder)).to.be.revertedWith(
            "Expected calldata len in steps to match calldata len in order"
        );
    });

    it("should fail when bridge address is not known", async function () {
        const amount = ethers.utils.parseEther("1");
        await MockToken2.mint(amount);
        await MockToken2.approve(WidoStarknetRouter.address, amount);

        const starknetOrder = JSON.parse(JSON.stringify(defaultStarknetOrder));
        starknetOrder[0].inputs[0].tokenAddress = MockToken2.address;
        starknetOrder[0].outputs[0].tokenAddress = MockToken2.address;

        await expect(WidoStarknetRouter.executeOrder(...starknetOrder)).to.be.revertedWith(
            "Bridge address does not exist for token"
        );
    });

    it("should use WidoRouter and send ERC20 to Starknet", async function () {
        const amount = ethers.utils.parseEther("1");

        const starknetOrder = JSON.parse(JSON.stringify(defaultStarknetOrder));
        starknetOrder[STARKNET_ORDER_ORDER_INDEX]["outputs"][0].tokenAddress = MockToken1.address;
        starknetOrder[STARKNET_ORDER_STEPS_INDEX] = [
            {
                fromToken: ethers.constants.AddressZero,
                targetAddress: MockToken1.address,
                data: MockToken1.interface.encodeFunctionData("mintWithEther", [amount]),
                amountIndex: 4
            }
        ];
        await WidoStarknetRouter.executeOrder(...starknetOrder);

        await expect((await MockStarknetCore.l1ToL2MessageNonce()).toNumber()).to.equal(5);
    });

    it("should use WidoRouter and send ERC20 to Starknet", async function () {
        const amount = ethers.utils.parseEther("1");
        await MockToken1.mint(amount);
        await MockToken1.approve(WidoStarknetRouter.address, amount);

        const starknetOrder = JSON.parse(JSON.stringify(defaultStarknetOrder));
        starknetOrder[STARKNET_ORDER_ORDER_INDEX]["inputs"][0].tokenAddress = MockToken1.address;
        starknetOrder[STARKNET_ORDER_ORDER_INDEX]["outputs"][0].tokenAddress = MockToken1.address;
        starknetOrder[STARKNET_ORDER_VALUE_INDEX] = { value: 1 };
        starknetOrder[STARKNET_ORDER_STEPS_INDEX] = [
            {
                fromToken: ethers.constants.AddressZero,
                targetAddress: MockToken1.address,
                data: MockToken1.interface.encodeFunctionData("totalSupply"),
                amountIndex: -1
            }
        ];
        await WidoStarknetRouter.executeOrder(...starknetOrder);

        await expect((await MockStarknetCore.l1ToL2MessageNonce()).toNumber()).to.equal(6);
    });
});
