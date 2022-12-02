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
	bytes32[] hashes;
	mapping(address => bytes32[]) address2hashes;

	IERC20 public MNT;
	uint public MNTPrice = 1;

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

		require(MNT.allowance(msg.sender, address(this)) >= amount, "Insufficient contract allowance");
		require(address(this).balance >= transferAmount, "Insufficient amount of ETH on the contract!");

		require(MNT.transferFrom(msg.sender, address(this), amount), "MNT transfer error!");

		//bool sent = payable(msg.sender).send(transferAmount); // deprecated
		(bool sent, bytes memory data) = payable(msg.sender).call{value: transferAmount}("");

		require(sent, "ETH transfer error!");

		amountOfSwappedEther[msg.sender] -= transferAmount;

	}

	function addItem(string memory name_, string memory description_, uint price_) public {

		bytes32 hash_ = keccak256(abi.encode(message.message, message.sender, message.balance));

		hash2Item[hash] = Item(name_, description_, price_, now, 0, msg.sender, address(0));
		address2hashes[msg.sender].push(hash);
		hashes.push(hash);

	}

	function getItemByHash(bytes32 hash) public view returns(Item memory) {

		return hash2Item[hash];

	}

	function buyItem(bytes32 hash) public returns(bool) {

		if (hash2Item[hash]) {
			require(MNT.allowance(msg.sender, address(this)) >= amount, "Insufficient contract allowance");
			require(MNT.transferFrom(msg.sender, address(this), amount), "Token transfer to contract error");
		}

		// TODO: freeze funds until conformation of both sides, add deal deadline, withdraw function, claim back function
		// 		 and MNT sell function with owner's comission.

	}



	function getMNTPrice() public view returns (uint) {
		return MNTPrice;
	}

	function setMNTPrice(uint price) public onlyOwner {
		MNTPrice = price;
	}

	function MNT2ETH(uint amount) public view returns (uint) {
		return amount / getCTokenPrice();
	}

	function ETH2MNT(uint amount) public view returns (uint) {
		return amount * getCTokenPrice();
	}

}