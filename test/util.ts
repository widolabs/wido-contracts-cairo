import { expect } from "chai";
import { starknet } from "hardhat";

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
