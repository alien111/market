const { expect } = require("chai");

provider = ethers.provider;

describe("Market", function () {
	
	let signers, mnt, market, mntAddress, marketAddress, mntCF, marketCF;

	it("Should deploy MNT and Market", async function () {

		signers = await ethers.getSigners();

		TokenCF = await ethers.getContractFactory("Token");
		marketCF = await ethers.getContractFactory("Market");

		market = await marketCF.deploy();
		marketAddress = market.address;

		mnt = new ethers.Contract(await market.MNT(), TokenCF.interface, signers[0]);
		mntAddress = mnt.address;

		expect(ethers.utils.isAddress(marketAddress)).to.be.true;
		expect(ethers.utils.isAddress(mntAddress)).to.be.true;

	});

	it("Should sell MNT for ETH", async function () {

		expect(Number(await provider.getBalance(marketAddress))).to.equal(0);
		expect((await mnt.balanceOf(signers[0].address)).toString()).to.equal('0');

		const ans = await market.buyMNT({value: '1000000'});
		await ans.wait();

		expect(Number(await provider.getBalance(marketAddress))).to.equal(1000000);
		expect((await mnt.balanceOf(signers[0].address)).toString()).to.equal('1000000');		

	});


});