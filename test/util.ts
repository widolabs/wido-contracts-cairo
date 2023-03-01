import { StarknetContractFactory } from "@shardlabs/starknet-hardhat-plugin/dist/src/types";
import { expect } from "chai";
import { starknet } from "hardhat";

import { ec, Provider, Account, uint256 } from "starknet";

import hre from "hardhat";

export function ensureEnvVar(varName: string): string {
    if (!process.env[varName]) {
        throw new Error(`Env var ${varName} not set or empty`);
    }
    return process.env[varName] as string;
}

/**
 * Receives a hex address, converts it to bigint, converts it back to hex.
 * This is done to strip leading zeros.
 * @param address a hex string representation of an address
 * @returns an adapted hex string representation of the address
 */
export function adaptAddress(address: string) {
    return "0x" + BigInt(address).toString(16);
}

/**
 * Expects address equality after adapting them.
 * @param actual
 * @param expected
 */
export function expectAddressEquality(actual: string, expected: string) {
    expect(adaptAddress(actual)).to.equal(adaptAddress(expected));
}

/**
 * Returns an instance of OZAccount. Expected to be deployed)
 */
export async function getOZAccount(type: string) {
    let address, privateKey;
    if (type == "deployer") {
        address = ensureEnvVar("DEPLOYER_ACCOUNT_ADDRESS");
        privateKey = ensureEnvVar("DEPLOYER_ACCOUNT_PRIVATE_KEY");
    } else if (type == "bank") {
        address = ensureEnvVar("BANK_ACCOUNT_ADDRESS");
        privateKey = ensureEnvVar("BANK_ACCOUNT_PRIVATE_KEY");
    } else if (type == "user") {
        address = ensureEnvVar("USER_ACCOUNT_ADDRESS");
        privateKey = ensureEnvVar("USER_ACCOUNT_PRIVATE_KEY");
    } else {
        throw Error("Account not found");
    }
    return await starknet.OpenZeppelinAccount.getAccountFromAddress(address, privateKey);
}

declare type NetworkName = "mainnet-alpha" | "goerli-alpha" | "goerli-alpha-2";

export async function getOZAccountStarknetJS(type: string, network?: NetworkName) {
    let address, privateKey;
    if (type == "deployer") {
        address = ensureEnvVar("DEPLOYER_ACCOUNT_ADDRESS");
        privateKey = ensureEnvVar("DEPLOYER_ACCOUNT_PRIVATE_KEY");
    } else if (type == "bank") {
        address = ensureEnvVar("BANK_ACCOUNT_ADDRESS");
        privateKey = ensureEnvVar("BANK_ACCOUNT_PRIVATE_KEY");
    } else if (type == "user") {
        address = ensureEnvVar("USER_ACCOUNT_ADDRESS");
        privateKey = ensureEnvVar("USER_ACCOUNT_PRIVATE_KEY");
    } else {
        throw Error("Account not found");
    }

    let provider: Provider;
    if (network == null) {
        provider = new Provider({ sequencer: { baseUrl: "http://127.0.0.1:5050" } });
    } else {
        provider = new Provider({ sequencer: { network: network } });
    }
    const starkKeyPair = ec.getKeyPair(privateKey);
    return new Account(provider, address, starkKeyPair);
}

export async function getBalanceOf(tokenAddress: string, userAddress: string) {
    const erc20Factory = new StarknetContractFactory({
        abiPath: "./starknet-artifacts/contracts/test/MockERC20.cairo/MockERC20_abi.json",
        hre,
        metadataPath: ""
    });
    const token = erc20Factory.getContractAt(tokenAddress);

    const { balance } = await token.call("balanceOf", {
        account: userAddress
    });

    return uint256.uint256ToBN(balance);
}

export async function approve(user: Account, tokenAddress: string, spender: string) {
    await user.execute({
        contractAddress: tokenAddress,
        entrypoint: "approve",
        calldata: [spender, uint256.UINT_128_MAX, uint256.UINT_128_MAX]
    });
}
