import { expect } from "chai";
import { starknet } from "hardhat";

export const OZ_ACCOUNT_ADDRESS = ensureEnvVar("OZ_ACCOUNT_ADDRESS");
export const OZ_ACCOUNT_PRIVATE_KEY = ensureEnvVar("OZ_ACCOUNT_PRIVATE_KEY");

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
function adaptAddress(address: string) {
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
export async function getOZAccount() {
    return await starknet.OpenZeppelinAccount.getAccountFromAddress(
        OZ_ACCOUNT_ADDRESS,
        OZ_ACCOUNT_PRIVATE_KEY
    );
}
