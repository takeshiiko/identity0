import { ethers } from "hardhat";

const CONTRACT = "0x1e9fe9a5bba33d0403368fc2dce7af660daf5b1e";
const TREASURY = process.env.TREASURY_ADDRESS!;
const ROYALTY_BPS = 350;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Signer: ${deployer.address}`);

  const abi = [
    "function setRoyalty(address receiver, uint96 feeNumerator) external",
    "function setUnrevealedURI(string calldata uri) external",
    "function pause() external",
    "function paused() view returns (bool)",
    "function mintPrice() view returns (uint256)",
  ];

  const contract = new ethers.Contract(CONTRACT, abi, deployer);

  // 1. Royalty
  console.log(`\nSetting royalty → ${TREASURY} @ ${ROYALTY_BPS / 100}%`);
  await (await contract.setRoyalty(TREASURY, ROYALTY_BPS)).wait();
  console.log("✓ Royalty set");

  // 2. Unrevealed URI (already set in constructor, but confirm)
  const uri = "ipfs://QmPBRxhtrUruc5S4nDP6L4YNZFtZrGqkR9E8boedanrSuj";
  console.log(`\nSetting unrevealed URI...`);
  await (await contract.setUnrevealedURI(uri)).wait();
  console.log("✓ Unrevealed URI set");

  // 3. Pause
  const isPaused = await contract.paused();
  if (!isPaused) {
    console.log("\nPausing contract...");
    await (await contract.pause()).wait();
    console.log("✓ Contract paused");
  } else {
    console.log("\n✓ Contract already paused");
  }

  const price = await contract.mintPrice();
  console.log(`\nMint price on-chain: ${ethers.formatEther(price)} ETH`);
  console.log("\n=== SETUP COMPLETE ===");
  console.log("Run unpause() when ready to open minting.");
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
