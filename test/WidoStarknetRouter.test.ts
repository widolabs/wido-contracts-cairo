import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract } from "ethers";
import { ethers } from "hardhat";
import { deployFixtures } from "./l1-utils";

describe("WidoStarknetRouter", async function () {
    let MockStarknetCore: any;
    let WidoStarknetRouter: Contract;
    let signer: SignerWithAddress;

    before(async function () {
        // Deploy contracts
        [signer] = await ethers.getSigners();
        ({ MockStarknetCore, WidoStarknetRouter } = await deployFixtures());
    });

    it("should send Starknet message", async function () {
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
            [] // destinationPayload
        );

        await expect((await MockStarknetCore.l1ToL2MessageNonce()).toNumber()).to.equal(2);
    });
});
