import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.info(
    `Deployer account balance before deploy: ${await (
      await deployer.getBalance()
    ).toString()}`
  );

  let proxyRegistryAddress: string;
  if (process.env.NETWORK == "localhost") {
    const ProxyRegistry = await ethers.getContractFactory("ProxyRegistry");
    const proxy = await ProxyRegistry.deploy();
    proxyRegistryAddress = proxy.address;
  } else {
    const PRA = process.env.PROXY_REGISTRY_ADDRESS;
    if (PRA) {
      proxyRegistryAddress = PRA;
    } else {
      throw "PROXY_REGISTRY_ADDRESS env variable should be defined";
    }
  }

  const WebColorsPalette = await ethers.getContractFactory("WebColorsPalette");
  const wcp = await WebColorsPalette.deploy(proxyRegistryAddress);


  console.info(`Deploying contract with the account ${deployer.address}`);
  console.warn(`WebColorsPalette contract deployed to address ${wcp.address}`);
  console.info(
    `Deployer account balance before deploy: ${await (
      await deployer.getBalance()
    ).toString()}`
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
