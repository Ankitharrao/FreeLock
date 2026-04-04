const hre = require("hardhat");

async function main() {
  console.log("Deploying FreelanceEscrow...");

  const FreelanceEscrow = await hre.ethers.getContractFactory("FreelanceEscrow");
  const contract = await FreelanceEscrow.deploy();

  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("✅ FreelanceEscrow deployed to:", address);
  console.log("🔗 View on Etherscan: https://sepolia.etherscan.io/address/" + address);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});