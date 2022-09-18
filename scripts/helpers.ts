import { ethers } from "hardhat";
import { getContractAt } from "@nomiclabs/hardhat-ethers/internal/helpers";
import { HardhatRuntimeEnvironment } from "hardhat/types";

export function getEnvVariable(key: string) {
  if (process.env[key]) {
    return process.env[key];
  }
  throw `${key} is not defined`;
}

export function getProvider() {
  const providerNetwork = getEnvVariable("NETWORK");
  const alchemyKey = getEnvVariable("ALCHEMY_KEY");
  return ethers.getDefaultProvider(providerNetwork, { alchemy: alchemyKey });
}

export function getDeployerAccount() {
  return new ethers.Wallet(
    getEnvVariable("DEPLOYER_PRIVATE_KEY")!,
    getProvider()
  );
}

export function getWCPContract(hre: HardhatRuntimeEnvironment) {
  const deployer = getDeployerAccount();
  const contractAddress = getEnvVariable("WCP_CONTRACT_ADDRESS");
  return getContractAt(
    hre,
    "WebColorsPalette",
    contractAddress!,
    deployer
  );
}
