import { ethers } from "hardhat";

const CONTRACT = "0x1e9fe9a5bba33d0403368fc2dce7af660daf5b1e";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Signer: ${deployer.address}`);

  const abi = [
    "function unpause() external",
    "function paused() view returns (bool)",
    "function totalSupply() view returns (uint256)",
    "function mintPrice() view returns (uint256)",
  ];

  const contract = new ethers.Contract(CONTRACT, abi, deployer);

  const isPaused = await contract.paused();
  console.log(`\nContract paused: ${isPaused}`);

  if (!isPaused) {
    console.log("✓ Contract is already unpaused — minting is open.");
    return;
  }

  console.log("\nUnpausing contract...");
  const tx = await contract.unpause();
  console.log(`  tx: ${tx.hash}`);
  await tx.wait();
  console.log("✓ Contract unpaused — minting is now open!");

  const price = await contract.mintPrice();
  const supply = await contract.totalSupply();
  console.log(`\nMint price : ${ethers.formatEther(price)} ETH`);
  console.log(`Total minted: ${supply}`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
