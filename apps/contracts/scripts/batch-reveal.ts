import { ethers } from "hardhat";

async function main() {
  const contractAddress = requiredEnv("CONTRACT_ADDRESS");
  const tokenIds = requiredEnv("TOKEN_IDS").split(",").map((value) => BigInt(value.trim()));
  const tokenURIs = requiredEnv("TOKEN_URIS").split(",").map((value) => value.trim());
  const contract = (await ethers.getContractAt("Identity0", contractAddress)) as unknown as {
    batchReveal(tokenIds: bigint[], tokenURIs: string[]): Promise<{ hash: string; wait(): Promise<unknown> }>;
  };
  const tx = await contract.batchReveal(tokenIds, tokenURIs);

  console.log(`Batch reveal tx submitted: ${tx.hash}`);
  await tx.wait();
  console.log(`Revealed ${tokenIds.length} tokens`);
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
