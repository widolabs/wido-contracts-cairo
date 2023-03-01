import { HardhatUserConfig } from "hardhat/types";
import "@shardlabs/starknet-hardhat-plugin";
import "@nomiclabs/hardhat-ethers";
import "@openzeppelin/hardhat-upgrades";
import "@nomicfoundation/hardhat-chai-matchers";
import * as dotenv from "dotenv";
import { accounts } from "./utils/network";

dotenv.config();

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
const config: HardhatUserConfig = {
    solidity: "0.8.7",
    starknet: {
        // dockerizedVersion: "0.10.3", // alternatively choose one of the two venv options below
        // uses (my-venv) defined by `python -m venv path/to/my-venv`
        venv: "~/cairo_venv",

        // uses the currently active Python environment (hopefully with available Starknet commands!)
        // venv: "active",
        recompile: false,
        network: "integrated-devnet",
        // network: "alphaGoerli",
        wallets: {
            OpenZeppelin: {
                accountName: "OpenZeppelin",
                modulePath: "starkware.starknet.wallets.open_zeppelin.OpenZeppelinAccount",
                accountPath: "~/.starknet_accounts"
            }
        }
    },
    networks: {
        devnet: {
            url: "http://127.0.0.1:5050"
        },
        integratedDevnet: {
            url: "http://127.0.0.1:5050",
            venv: "active",
            // dockerizedVersion: "<DEVNET_VERSION>",
            args: [
                // Uncomment the lines below to activate Devnet features in your integrated-devnet instance
                // Read about Devnet options here: https://shard-labs.github.io/starknet-devnet/docs/guide/run
                //
                // *Account predeployment*
                "--seed",
                "2745237918",
                "--accounts",
                "3",
                // "--initial-balance", <VALUE>
                //
                // *Forking*
                "--fork-network",
                "alpha-goerli",
                "--fork-block",
                "707100"

                //
                // *Chain ID*
                // "--chain-id", <VALUE>
                //
                // *Gas price*
                // "--gas-price", <VALUE>
            ]
        },
        goerli: { url: "https://rpc.ankr.com/eth_goerli", accounts: accounts("goerli") },
        hardhat: {}
    },
    paths: {
        cairoPaths: ["~/cairo_venv/lib/python3.9/site-packages/openzeppelin"]
    }
};

export default config;
