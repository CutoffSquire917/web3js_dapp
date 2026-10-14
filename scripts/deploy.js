const {ethers} = require("hardhat");

const deploy = async()=>{
    const factory = await ethers.getContractFactory("Forum");
    const contract = await factory.deploy();

    await contract.waitForDeployment();

    console.log("Contract address: ", await contract.getAddress());
}

deploy();