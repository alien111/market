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

		const MNTPrice = await market.getMNTPrice();

		const tx = await market.buyMNT({value: '10000000'});
		const result = await tx.wait();

		for (const event of result.events) {
			if (event.event == 'MNTBought') {
				expect(event.args._by).to.equal(signers[0].address);
				expect(Number(event.args._amountOfMNT)).to.equal(10000000 * MNTPrice);
				expect(Number(event.args._amountOfETH)).to.equal(10000000);
			}
		}

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

		const MNTPrice = await market.getMNTPrice();

		const tx1 = await market.sellMNT(5000000);
		const result = await tx1.wait();

		for (const event of result.events) {
			if (event.event == 'MNTBought') {
				expect(event.args._by).to.equal(signers[0].address);
				expect(Number(event.args._amountOfMNT)).to.equal(10000000 / MNTPrice);
				expect(Number(event.args._amountOfETH)).to.equal(10000000);
			}
		}

		expect(Number(await provider.getBalance(marketAddress))).to.equal(5000000);
		expect((await mnt.balanceOf(signers[0].address)).toString()).to.equal('5000000');
		expect((await mnt.balanceOf(marketAddress)).toString()).to.equal('999999999999995000000');

	});

	it("Should transfer MNT between addresses", async function () {

		expect((await mnt.balanceOf(signers[0].address)).toString()).to.equal('5000000');
		expect((await mnt.balanceOf(signers[1].address)).toString()).to.equal('0');

		await mnt.transfer(signers[1].address, 2500000);

		expect((await mnt.balanceOf(signers[0].address)).toString()).to.equal('2500000');
		expect((await mnt.balanceOf(signers[1].address)).toString()).to.equal('2500000');

	});

	let bananaHash;
	it("Should add item to the mapping", async function () {

		const tx = await market.addItem("Green banana", "Just a cool\nand green\nbanana!", 200);
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

	let bananaNewHash;
	it("Should book item for buyer and change it's hash", async function () {

		expect((await mnt.allowance(signers[1].address, marketAddress)).toString()).to.equal('0');
		const tx = await mnt.connect(signers[1]).approve(marketAddress, '200');
		await tx.wait();
		expect((await mnt.allowance(signers[1].address, marketAddress)).toString()).to.equal('200');

		const tx1 = await market.connect(signers[1]).buyItem(bananaHash);
		const result = await tx1.wait();

		for (const event of result.events) {
			if (event.event == 'ItemBooked') {
				expect(event.args._by).to.equal(signers[1].address);
				expect(event.args._oldHash).to.equal(bananaHash);
				bananaNewHash = event.args._newHash;
			}
		}

		const result1 = await market.getItemByHash(bananaNewHash);
		expect(result1.name).to.equal("Green banana");
		expect(result1.description).to.equal("Just a cool\nand green\nbanana!");
		expect(Number(result1.price)).to.equal(200);
		expect(result1.seller).to.equal(signers[0].address);
		expect(result1.buyer).to.equal(signers[1].address);

		expect((await mnt.balanceOf(signers[1].address)).toString()).to.equal('2499800');
		expect((await mnt.balanceOf(marketAddress)).toString()).to.equal('999999999999995000200');

	});

	it("Should confirm deal(seller)", async function () {

		const tx = await market.confirmSelling(bananaNewHash);
		const result = await tx.wait();

		for (const event of result.events) {
			if (event.event == 'DealConfirmedBySeller') {
				expect(event.args._by).to.equal(signers[0].address);
				expect(event.args._hash).to.equal(bananaNewHash);
			}
		}

	});

	it("Should confirm deal(buyer)", async function () {

		const tx = await market.connect(signers[1]).confirmBuying(bananaNewHash);
		const result = await tx.wait();

		for (const event of result.events) {
			if (event.event == 'DealConfirmedByBuyer') {
				expect(event.args._by).to.equal(signers[1].address);
				expect(event.args._hash).to.equal(bananaNewHash);
			}
		}
		
	});

	it("Should give seller access to frozen MNT", async function () {

		const tx = await market.claimFrozenMNT(bananaNewHash);
		const result = await tx.wait();
		
		for (const event of result.events) {
			if (event.event == 'claimFrozenMNT') {
				expect(event.args._to).to.equal(signers[0].address);
				expect(event.args._hash).to.equal(bananaNewHash);
			}
		}

		expect((await mnt.balanceOf(signers[0].address)).toString()).to.equal('2500200');
		expect((await mnt.balanceOf(signers[1].address)).toString()).to.equal('2499800');
		expect((await mnt.balanceOf(marketAddress)).toString()).to.equal('999999999999995000000');


	});

	it("Should cancel deal", async function () {

		const tx = await market.addItem("Green banana", "Just a cool\nand green\nbanana!", 200);
		const result = await tx.wait();

		expect(result.events[0].args._by).to.equal(signers[0].address);
		bananaHash = result.events[0].args._hash;

		expect((await mnt.allowance(signers[1].address, marketAddress)).toString()).to.equal('0');
		const tx1 = await mnt.connect(signers[1]).approve(marketAddress, '200');
		await tx1.wait();
		expect((await mnt.allowance(signers[1].address, marketAddress)).toString()).to.equal('200');

		const tx2 = await market.connect(signers[1]).buyItem(bananaHash);
		const result1 = await tx2.wait();

		for (const event of result1.events) {
			if (event.event == 'ItemBooked') {
				expect(event.args._by).to.equal(signers[1].address);
				expect(event.args._oldHash).to.equal(bananaHash);
				bananaNewHash = event.args._newHash;
			}
		}

		const result2 = await market.getItemByHash(bananaNewHash);
		expect(result2.name).to.equal("Green banana");
		expect(result2.description).to.equal("Just a cool\nand green\nbanana!");
		expect(Number(result2.price)).to.equal(200);
		expect(result2.seller).to.equal(signers[0].address);
		expect(result2.buyer).to.equal(signers[1].address);

		expect((await mnt.balanceOf(signers[1].address)).toString()).to.equal('2499600');
		expect((await mnt.balanceOf(marketAddress)).toString()).to.equal('999999999999995000200');

		const tx3 = await market.connect(signers[1]).cancelBuying(bananaNewHash);
		const result3 = await tx3.wait();

		for (const event of result3.events) {
			if (event.event == 'DealCanceledByBuyer') {
				expect(event.args._by).to.equal(signers[1].address);
				expect(event.args._oldHash).to.equal(bananaNewHash);
				expect(event.args._newHash).to.equal(bananaHash);
			}
		}

	});


});