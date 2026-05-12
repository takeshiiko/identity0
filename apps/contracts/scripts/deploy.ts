import { ethers, run } from "hardhat";

const UNREVEALED_CID = "ipfs://QmPBRxhtrUruc5S4nDP6L4YNZFtZrGqkR9E8boedanrSuj";
const MINT_PRICE_ETH = process.env.MINT_PRICE_ETH ?? "0.02";
const ROYALTY_BPS = 350; // 3.5%

async function main() {
  const [deployer] = await ethers.getSigners();
  const operator = process.env.REVEAL_OPERATOR_ADDRESS ?? deployer.address;
  const treasury = process.env.TREASURY_ADDRESS ?? deployer.address;
  const network = await ethers.provider.getNetwork();

  console.log(`\nDeploying to chain ${network.chainId}`);
  console.log(`Deployer  : ${deployer.address}`);
  console.log(`Operator  : ${operator}`);
  console.log(`Treasury  : ${treasury}`);
  console.log(`Mint price: ${MINT_PRICE_ETH} ETH`);
  console.log(`Royalty   : ${ROYALTY_BPS / 100}%`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance   : ${ethers.formatEther(balance)} ETH\n`);

  if (balance < ethers.parseEther("0.05")) {
    throw new Error("Insufficient ETH for deployment — need at least 0.05 ETH");
  }

  // 1. Deploy
  const Identity0 = await ethers.getContractFactory("Identity0");
  const contract = await Identity0.deploy(UNREVEALED_CID, operator);
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log(`✓ Deployed: ${address}`);

  // 2. Set mint price
  const mintPriceWei = ethers.parseEther(MINT_PRICE_ETH);
  await (await contract.setMintPrice(mintPriceWei)).wait();
  console.log(`✓ Mint price set: ${MINT_PRICE_ETH} ETH`);

  // 3. Set royalty
  await (await contract.setRoyalty(treasury, ROYALTY_BPS)).wait();
  console.log(`✓ Royalty set: ${ROYALTY_BPS / 100}% → ${treasury}`);

  // 4. Pause until ready to go live
  await (await contract.pause()).wait();
  console.log(`✓ Contract paused (run unpause when ready to open minting)`);

  // 5. Etherscan verification (non-fatal if it fails)
  if (process.env.ETHERSCAN_API_KEY) {
    console.log("\nVerifying on Etherscan...");
    try {
      await run("verify:verify", {
        address,
        constructorArguments: [UNREVEALED_CID, operator],
      });
      console.log("✓ Verified on Etherscan");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("Already Verified")) {
        console.log("✓ Already verified");
      } else {
        console.warn("⚠ Etherscan verification failed (non-fatal):", msg);
      }
    }
  }

  console.log("\n=== DEPLOYMENT COMPLETE ===");
  console.log(`Contract : ${address}`);
  console.log(`Network  : ${network.chainId === 1n ? "Ethereum Mainnet" : `Chain ${network.chainId}`}`);
  console.log("\nNext steps:");
  console.log("  1. Update CONTRACT_ADDRESS in Railway env vars");
  console.log("  2. Update packages/shared/src/index.ts with this address");
  console.log("  3. Update NEXT_PUBLIC_CONTRACT_ADDRESS in Vercel");
  console.log("  4. Call unpause() when ready to open minting");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
