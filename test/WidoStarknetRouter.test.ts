import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract } from "ethers";
import { ethers } from "hardhat";
import { deployFixtures } from "./l1-utils";

describe.only("WidoStarknetRouter", async function () {
    let MockStarknetCore: any;
    let WidoStarknetRouter: Contract;
    let MockToken: Contract;
    let signer: SignerWithAddress;

    before(async function () {
        // Deploy contracts
        [signer] = await ethers.getSigners();
        ({ MockToken, MockStarknetCore, WidoStarknetRouter } = await deployFixtures());
    });

    it("should send ETH to Starknet", async function () {
        // await WidoStarknetRouter.executeOrder({
        //     order: {},
        //     steps: [],
        //     feeBps: 30,
        //     partner: ethers.constants.AddressZero,
        //     bridgeTokenAddress: ethers.constants.AddressZero,
        //     destinationPayload: []
        // });

        const amount = ethers.utils.parseEther("1");

        await WidoStarknetRouter.executeOrder(
            {
                inputs: [
                    {
                        tokenAddress: ethers.constants.AddressZero,
                        amount
                    }
                ],
                outputs: [
                    {
                        tokenAddress: ethers.constants.AddressZero,
                        minOutputAmount: amount.mul(997).div(1000)
                    }
                ],
                user: WidoStarknetRouter.address,
                nonce: 0,
                expiration: 0
            }, // order
            [
                // {
                //     fromToken: ethers.constants.AddressZero,
                //     targetAddress: WidoStarknetRouter.address,
                //     data: WidoStarknetRouter.interface.encodeFunctionData("widoRouter"),
                //     amountIndex: -1
                // }
            ], // steps
            30, // feeBps
            ethers.constants.AddressZero, // partner
            ethers.constants.AddressZero, // bridgeTokenAddress
            0,
            [] // destinationPayload
        );

        await expect((await MockStarknetCore.l1ToL2MessageNonce()).toNumber()).to.equal(1);
    });

    it("should send ERC20 to Starknet", async function () {
        const amount = ethers.utils.parseEther("1");

        await MockToken.mint(amount);

        await MockToken.approve(WidoStarknetRouter.address, amount);

        await WidoStarknetRouter.executeOrder(
            {
                inputs: [
                    {
                        tokenAddress: MockToken.address,
                        amount
                    }
                ],
                outputs: [
                    {
                        tokenAddress: MockToken.address,
                        minOutputAmount: amount.mul(997).div(1000)
                    }
                ],
                user: WidoStarknetRouter.address,
                nonce: 0,
                expiration: 0
            }, // order
            [], // steps
            30, // feeBps
            ethers.constants.AddressZero, // partner
            ethers.constants.AddressZero, // bridgeTokenAddress
            0,
            [] // destinationPayload
        );

        await expect((await MockStarknetCore.l1ToL2MessageNonce()).toNumber()).to.equal(2);
    });
});
