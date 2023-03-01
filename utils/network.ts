export function accounts(networkName?: string): string[] | { mnemonic: string } {
    if (networkName) {
        const privateKey = process.env["PRIVATE_KEY_" + networkName.toUpperCase()];
        if (privateKey && privateKey !== "") {
            return [privateKey];
        }
    }
    throw Error("Private Key not provided");
}
