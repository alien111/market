pragma solidity ^0.8.17;

import "./MNT.sol";

contract Market {

	struct Item {
		string name;		// item name
		string description;	// item description
		uint price;			// item price
		uint timeCreated;	// item creation time
		uint timeSold;		// item selling time
		address seller;		// item seller
		address buyer;		// item buyer
	}

	address payable public owner;

	mapping(address => uint) amountOfSwappedEther;
	mapping(bytes32 => Item) hash2Item;

	mapping(bytes32 => bool) confirmedBySeller;
	mapping(bytes32 => bool) confirmedByBuyer;
	//bytes32 hashes[] = new bytes32[](0);

	IERC20 public MNT;
	uint public MNTPrice = 1; // TODO: Check this variable to be safe !!!

	uint public contractFee = 0;
	uint public contractFeeSum = 0;

	constructor() payable {

		owner = payable(msg.sender);
		MNT = new Token("MNT", "MarketNativeToken", address(this));

	}

	modifier onlyOwner() {
		require(msg.sender == owner, "Not owner");
		_;
	}

	function buyMNT() public payable {

		uint transferAmount = ETH2MNT(msg.value);
		require(transferAmount <= MNT.balanceOf(address(this)), "Insufficient amount of MNT on the contract!");
		require(MNT.transfer(msg.sender, transferAmount), "MNT transfer error");

		amountOfSwappedEther[msg.sender] += msg.value;

	}

	function sellMNT(uint amount) public payable {

		uint transferAmount = MNT2ETH(amount);

		uint currentFee = transferAmount * contractFee;
		transferAmount -= currentFee;
		contractFeeSum += currentFee;

		require(MNT.allowance(msg.sender, address(this)) >= amount, "Insufficient contract allowance");
		require(address(this).balance >= transferAmount, "Insufficient amount of ETH on the contract!");

		require(MNT.transferFrom(msg.sender, address(this), amount), "MNT transfer error!");

		//bool sent = payable(msg.sender).send(transferAmount); // deprecated
		(bool sent, ) = payable(msg.sender).call{value: transferAmount}("");

		require(sent, "ETH transfer error!");

		amountOfSwappedEther[msg.sender] -= transferAmount;

	}

	function getItemHashByFields(string memory name_, string memory description_, uint price_, uint timeCreated_, uint timeSold_, address seller_, address buyer_) internal pure returns (bytes32) {

		return keccak256(abi.encode(name_, description_, price_, timeCreated_, timeSold_, seller_, buyer_));

	}

	function addItem(string memory name_, string memory description_, uint price_) public {

		//bytes32 hash_ = keccak256(abi.encode(name_, description_, price_, block.timestamp, 0, msg.sender, address(0)));
		bytes32 hash = getItemHashByFields(name_, description_, price_, block.timestamp, 0, msg.sender, address(0));

		hash2Item[hash] = Item(name_, description_, price_, block.timestamp, 0, msg.sender, address(0));
		// TODO: emit events to be able to search for hashes!

	}

	function getItemByHash(bytes32 hash) public view returns(Item memory) {

		return hash2Item[hash];

	} // TODO: check if this function is really needed

	function updateItemOnceSold(bytes32 hash, address buyer_, uint timeSold_) internal returns (bytes32) {

		Item memory item = hash2Item[hash];
		bytes32 newHash = getItemHashByFields(item.name, item.description, item.price, item.timeCreated, timeSold_, item.seller, buyer_);
		
		hash2Item[newHash] = Item(item.name, item.description, item.price, item.timeCreated, timeSold_, item.seller, buyer_);
		delete hash2Item[hash];
		// TODO: emit events to ensure hash change

		return newHash;

	}

	function updateItemOnceCanceled(bytes32 hash) internal {

		Item memory item = hash2Item[hash];
		bytes32 newHash = getItemHashByFields(item.name, item.description, item.price, item.timeCreated, 0, item.seller, address(0));
		
		hash2Item[newHash] = Item(item.name, item.description, item.price, item.timeCreated, 0, item.seller, address(0));
		delete hash2Item[hash];
		// TODO: emit events to ensure hash change

	}

	function buyItem(bytes32 hash) public returns (bytes32) {

		require(hash2Item[hash].timeCreated == 0, "Item doesn't exist");

		require(MNT.allowance(msg.sender, address(this)) >= hash2Item[hash].price, "Insufficient contract allowance");
		require(MNT.transferFrom(msg.sender, address(this), hash2Item[hash].price), "Token transfer to contract error");

		bytes32 newHash = updateItemOnceSold(hash, msg.sender, block.timestamp);

		return newHash;

	}

	function confirmSelling(bytes32 hash) public {

		require(hash2Item[hash].timeCreated == 0, "Item doesn't exist");
		require(hash2Item[hash].seller == msg.sender, "You are not seller");
		require(confirmedBySeller[hash] == false, "Item isn't waiting confirmation from seller");

		confirmedBySeller[hash] = true;
	
	}

	function confirmBuying(bytes32 hash) public {

		require(hash2Item[hash].timeCreated == 0, "Item doesn't exist");
		require(hash2Item[hash].buyer == msg.sender, "You are not buyer");
		require(confirmedByBuyer[hash] == false, "Item isn't waiting confirmation from buyer");

		confirmedByBuyer[hash] = true;

	}

	function cancelBuying(bytes32 hash) public {

		require(hash2Item[hash].timeCreated == 0, "Item doesn't exist");
		require(hash2Item[hash].buyer == msg.sender, "You are not buyer");
		require(confirmedBySeller[hash] == false, "Item isn't waiting confirmation from buyer");

		updateItemOnceCanceled(hash);

	}

	function claimFrozenCNT(bytes32 hash) public {

		require(hash2Item[hash].timeCreated == 0, "Item doesn't exist");
		require(hash2Item[hash].seller == msg.sender, "You are not seller");
		require(confirmedByBuyer[hash], "Selling is not confirmed by buyer");
		require(confirmedBySeller[hash], "Confirm selling first");

		require(MNT.transfer(msg.sender, hash2Item[hash].price), "MNT transfer error");

	}

	function getMNTPrice() public view returns (uint) {
		return MNTPrice;
	}

	function setMNTPrice(uint price) public onlyOwner {
		MNTPrice = price;
	}

	function getContractFee() public view returns (uint) {
		return contractFee;
	}

	function setContractFee(uint comission) public onlyOwner {
		contractFee = comission;
	}

	function MNT2ETH(uint amount) public view returns (uint) {
		return amount / getMNTPrice();
	}

	function ETH2MNT(uint amount) public view returns (uint) {
		return amount * getMNTPrice();
	}

	function claimContractFee(uint amount) public payable onlyOwner {

		require(amount <= contractFeeSum, "Not enough ether to transfer");
		(bool sent, ) = payable(owner).call{value: amount}("");
		require(sent, "ETH transfer error!");

	}

}