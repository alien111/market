pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Token is ERC20 {
	constructor(string memory symbol, string memory name, address account) ERC20(name, symbol) {

		uint amount = 1000 * 10 ** uint(decimals());
		_mint(account, amount);

	}
}