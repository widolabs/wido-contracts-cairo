import axios from "axios";

import { ethers } from "hardhat";
import { deployWidoRouter } from "./starknet-fixtures";
import { STARKGATE_ETH } from "./address";
import { StarknetContract } from "hardhat/types";
import { approve, getBalanceOf, getOZAccountStarknetJS } from "./util";
import { expect } from "chai";
import { tokens as supportedTokens } from "./supportedTokens.json";

import { Account } from "starknet";
import { TIMEOUT } from "./constants";
import BN from "bn.js";

type FromTokenType = {
    name: string;
    address: string;
    amount: string;
    skipList?: string[];
};

type ChainId = number;

const fromTokens: Record<ChainId, FromTokenType[]> = {
    15367: [
        {
            name: "ETH",
            address: STARKGATE_ETH,
            amount: ethers.utils.parseEther("1").toString(),
            skipList: []
        }
    ]
};

const chainId = 15367;

const API_URL = process.env.LOCAL ? "http://127.0.0.1:8080" : "https://api.joinwido.com";

const NO_WITHDRAWAL: string[] = [];
const DUST_OK: string[] = [];

let addressesToTest: string[] = [];
if (process.env.TOKENS) {
    addressesToTest = process.env.TOKENS.split(",");
}

const usingTokenFilter = addressesToTest.length !== 0;

type Token = {
    protocol: string;
    address: string;
    name: string;
};

// let supportedTokens: Token[] = [];

// try {
//     const params = new URLSearchParams({
//         from_chain_id: String(chainId),
//         include_preview: "true"
//     });

//     // suppress warning for top level await
//     // eslint-disable-next-line @typescript-eslint/ban-ts-comment
//     // @ts-ignore
//     const resp = await axios.get(`${API_URL}/tokens?${params}`, {
//         headers: { referer: "wido-tests" }
//     });

//     console.log(resp);

//     supportedTokens = resp.data.tokens;
// } catch (err) {
//     console.log("📜 LOG > test-setup.ts", "Cannot fetch supported tokens.", err);
// }

const toTokens = supportedTokens.filter((token) => {
    // if (token.protocol === "dex") {
    //     return false;
    // }

    if (usingTokenFilter) {
        return addressesToTest.includes(token.address);
    } else {
        return true;
    }
});

console.log("Total tokens: ", toTokens.length);
console.log("Total tokens to test: ", usingTokenFilter ? addressesToTest.length : toTokens.length);

let widoRouter: StarknetContract;
let user: Account;

describe.only("Zap in routes", function () {
    this.timeout(TIMEOUT);

    before(async function () {
        user = await getOZAccountStarknetJS("user");
        widoRouter = await deployWidoRouter();
        const { wido_token_manager: widoTokenManagerAddress } = await widoRouter.call(
            "wido_token_manager"
        );
        await approve(user, STARKGATE_ETH, widoTokenManagerAddress);
    });

    toTokens.forEach((toTokenObj, i) => {
        const toToken = toTokenObj.address;

        fromTokens[chainId].forEach((fromToken, j) => {
            if (fromToken.address !== toToken) {
                const shouldSkip = fromToken.skipList && fromToken.skipList.includes(toToken);
                if (!shouldSkip) {
                    it(`Zap In ${fromToken.name} for ${toToken} (${
                        toTokenObj.name || "Unknown"
                    })`, async function () {
                        const userAddr = user.address;

                        const initFromTokenBal = await getBalanceOf(fromToken.address, userAddr);
                        const initToTokenBal = await getBalanceOf(toToken, userAddr);
                        const amount = fromToken.amount;
                        expect(amount.toString(), "No tokens found. Cannot Zap.").to.not.equal("0");

                        if (fromToken.address == toToken) {
                            return;
                        }
                        const params = new URLSearchParams({
                            from_chain_id: String(chainId),
                            from_token: fromToken.address,
                            to_chain_id: String(chainId),
                            to_token: toToken,
                            amount: amount,
                            slippage_percentage: "0.3",
                            _recipient_address: widoRouter.address,
                            user: userAddr
                        });
                        console.log(`${API_URL}/quote_v2?${params}`);
                        const resp = await axios.get(`${API_URL}/quote_v2?${params}`, {
                            headers: { referer: "wido-tests" }
                        });
                        if (resp.data.status === "not_ok") {
                            throw new Error(`Get tx data failed: ${resp.data.err}`);
                        }

                        await user.execute({
                            contractAddress: widoRouter.address,
                            entrypoint: resp.data.function_name,
                            calldata: resp.data.data
                        });

                        const finalFromTokenBal = await getBalanceOf(fromToken.address, userAddr);
                        const finalToTokenBal = await getBalanceOf(toToken, userAddr);
                        const widoFromTokenBal = await getBalanceOf(
                            fromToken.address,
                            widoRouter.address
                        );

                        expect(
                            initFromTokenBal.sub(finalFromTokenBal).gt(new BN(amount)),
                            "From balance remained unchanged or incorrectly spent"
                        ).to.be.true;
                        expect(initToTokenBal.lt(finalToTokenBal), "To balance remained unchanged")
                            .to.be.true;
                        if (DUST_OK.indexOf(toToken) == -1) {
                            expect(
                                widoFromTokenBal,
                                "Wido remained with dust (from_token)"
                            ).to.equal(0);
                        }
                    });
                }
            }
        });
        // });
    });
});

// describe("Zap out routes", () => {
//     toTokens.forEach((toTokenObj, i) => {
//         const toToken = toTokenObj.address;

//         fromTokens[chainId].forEach((fromToken, j) => {
//             if (fromToken.address !== toToken) {
//                 const shouldSkip =
//                     (fromToken.skipList && fromToken.skipList.includes(toToken)) ||
//                     NO_WITHDRAWAL.includes(toToken);
//                 it.skipIf(shouldSkip).concurrent(
//                     `Zap Out ${toToken} (${toTokenObj.name || "Unknown"}) for ${fromToken.name}`,
//                     async function () {
//                         const userAddrIndex =
//                             (i * fromTokens[chainId].length + j) % userAddresses.length;
//                         const userAddr = userAddresses[userAddrIndex];
//                         const signer = await ethers.getSigner(userAddr);

//                         const inputToken = toToken;
//                         const outputToken = fromToken.address;
//                         await utils.approveForToken(signer, inputToken, widoManagerAddr);
//                         const initInputTokenBal = await utils.balanceOf(inputToken, userAddr);
//                         const initOutputTokenBal = await utils.balanceOf(outputToken, userAddr);

//                         const amount = initInputTokenBal;
//                         assert(amount.toString() !== "0", "No tokens found. Cannot Zap.");

//                         if (inputToken === outputToken) {
//                             return;
//                         }
//                         const params = new URLSearchParams({
//                             from_chain_id: String(chainId),
//                             from_token: inputToken,
//                             to_chain_id: String(chainId),
//                             to_token: outputToken,
//                             amount: amount.toString(),
//                             slippage_percentage: "0.3",
//                             _recipient_address: widoRouter.address,
//                             user: userAddr
//                         });
//                         const resp = await axios.get(`${API_URL}/quote_v2?${params}`, {
//                             headers: { referer: "wido-tests" }
//                         });
//                         if (resp.data.status === "not_ok") {
//                             throw new Error(`Get tx data failed: ${resp.data.err}`);
//                         }
//                         if (resp.data.is_supported === false) {
//                             throw new Error(`Route not supported.`);
//                         }

//                         await signer.sendTransaction({
//                             to: widoRouter.address,
//                             data: resp.data.data,
//                             value: resp.data.value,
//                             gasLimit: 3000000
//                         });

//                         const finalInputTokenBal = await utils.balanceOf(inputToken, userAddr);
//                         const finalOutputTokenBal = await utils.balanceOf(outputToken, userAddr);
//                         const widoInputTokenBal = await utils.balanceOf(
//                             inputToken,
//                             widoRouter.address
//                         );

//                         if (toTokenObj.protocol === "aave.com") {
//                             // aave's a-tokens grow in balance with each block,
//                             // which is why our spent balance will be slightly lower than our zap amount
//                             expect(
//                                 initInputTokenBal.sub(finalInputTokenBal),
//                                 "From balance remained unchanged or incorrectly spent"
//                             )
//                                 .to.lt(amount)
//                                 .gt(amount.mul(998).div(1000));
//                         } else {
//                             expect(
//                                 initInputTokenBal.sub(finalInputTokenBal),
//                                 "From balance remained unchanged or incorrectly spent"
//                             ).to.equal(amount);
//                         }
//                         expect(
//                             initOutputTokenBal.lt(finalOutputTokenBal),
//                             "To balance remained unchanged"
//                         ).to.be.true;
//                         expect(widoInputTokenBal, "Wido remained with dust (from_token)").to.equal(
//                             0
//                         );
//                     }
//                 );
//             }
//         });
//     });
// });
