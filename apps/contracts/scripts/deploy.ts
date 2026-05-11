import { ethers } from "hardhat";

async function main() {
  const unrevealedURI = process.env.UNREVEALED_TOKEN_URI ?? "ipfs://REPLACE_WITH_UNREVEALED_METADATA_CID";
  const operator = process.env.REVEAL_OPERATOR_ADDRESS ?? ethers.ZeroAddress;
  const Identity0 = await ethers.getContractFactory("Identity0");
  const contract = await Identity0.deploy(unrevealedURI, operator);

  await contract.waitForDeployment();

  console.log(`Kandinsky deployed to ${await contract.getAddress()}`);
  console.log(`Unrevealed URI: ${unrevealedURI}`);
  console.log(`Operator: ${operator === ethers.ZeroAddress ? "deployer" : operator}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
