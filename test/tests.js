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

		expect(await market.owner()).to.equal(signers[0].address);

	});

	it("Should sell MNT for ETH", async function () {

		expect(Number(await provider.getBalance(marketAddress))).to.equal(0);
		expect((await mnt.balanceOf(signers[0].address)).toString()).to.equal('0');
		expect((await mnt.balanceOf(marketAddress)).toString()).to.equal('1000000000000000000000');

		const ans = await market.buyMNT({value: '10000000'});
		await ans.wait();

		expect(Number(await provider.getBalance(marketAddress))).to.equal(10000000);
		expect((await mnt.balanceOf(signers[0].address)).toString()).to.equal('10000000');
		expect((await mnt.balanceOf(marketAddress)).toString()).to.equal('999999999999990000000');

		expect((await market.amountOfSwappedEther(signers[0].address)).toString()).to.equal('10000000');

	});

	it("Should sell ETH for MNT", async function () {

		expect(Number(await provider.getBalance(marketAddress))).to.equal(10000000);
		expect((await mnt.balanceOf(signers[0].address)).toString()).to.equal('10000000');
		expect((await mnt.balanceOf(marketAddress)).toString()).to.equal('999999999999990000000');

		expect((await mnt.allowance(signers[0].address, marketAddress)).toString()).to.equal('0');
		const tx = await mnt.approve(marketAddress, '5000000');
		await tx.wait();
		expect((await mnt.allowance(signers[0].address, marketAddress)).toString()).to.equal('5000000');

		const tx1 = await market.sellMNT(5000000);
		await tx1.wait();

		expect(Number(await provider.getBalance(marketAddress))).to.equal(5000000);
		expect((await mnt.balanceOf(signers[0].address)).toString()).to.equal('5000000');
		expect((await mnt.balanceOf(marketAddress)).toString()).to.equal('999999999999995000000');

	});

/*
	function addItem(string memory name_, string memory description_, uint price_) public {}
*/
	let bananaHash;
	it("Should add item to the mapping", async function () {

		const tx = await market.addItem("Green banana", "Just a cool\nand green\nbanana!", 200);
		// Finish after implementing events emitting. 
		const result = await tx.wait();

		expect(result.events[0].args._by).to.equal(signers[0].address);
		bananaHash = result.events[0].args._hash;

	});

	it("Should return info about item by hash", async function () {

		const result = await market.getItemByHash(bananaHash);
		
		expect(result.name).to.equal("Green banana");
		expect(result.description).to.equal("Just a cool\nand green\nbanana!");
		expect(Number(result.price)).to.equal(200);
		expect(result.seller).to.equal(signers[0].address);

	});


});