import { ethers } from "hardhat";

async function main() {
  const contractAddress = requiredEnv("CONTRACT_ADDRESS");
  const tokenId = BigInt(requiredEnv("TOKEN_ID"));
  const tokenURI = requiredEnv("TOKEN_URI");
  const contract = (await ethers.getContractAt("Identity0", contractAddress)) as unknown as {
    revealToken(tokenId: bigint, tokenURI: string): Promise<{ hash: string; wait(): Promise<unknown> }>;
  };
  const tx = await contract.revealToken(tokenId, tokenURI);

  console.log(`Reveal tx submitted: ${tx.hash}`);
  await tx.wait();
  console.log(`Token ${tokenId.toString()} revealed`);
}

function requiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} is required`);
  }
  return value;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
