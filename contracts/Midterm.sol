//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IPausable {
    // Returns if the contract is currently paused
    function paused() external view returns (bool);
}

interface IMidterm {
    // solhint-disable ordering
    function addArrays(uint256[] calldata array0, uint256[] calldata array1)
        external
        pure
        returns (uint256[] memory);

    // Please make sure things are returned in order, else you will fail testing
    function getRangeSolutionDeposit()
        external
        view
        returns (
            uint256, // floor
            uint256, // ceiling
            bytes32, // solution hash
            uint256 // current deposit required
        );

    // Only the owner can set this when game is paused
    function setRangeSolutionDeposit(
        uint256 floor,
        uint256 ceiling,
        bytes32 solution,
        uint256 deposit
    ) external;

    // Can only run when game is not paused
    function guess(uint256 number) external payable;

    // Emitted when a player guesses (regardless of correctness)
    event DidGuess(address player, uint256 number);
    // Emitted when a player wins and the game pauses
    event DidResetGame(address winner);
}

contract Midterm is IPausable, IMidterm {
    // solhint-disable ordering
    function addArrays(uint256[] calldata array0, uint256[] calldata array1)
        external
        pure
        override
        returns (uint256[] memory)
    {
        require(array0.length == array1.length, "Array lengths not equal");
        uint256[] memory array2 = new uint256[](array0.length);
        for (uint256 i = 0; i < array0.length; i++) {
            array2[i] = array0[i] + array1[i];
        }
        return array2;
    }

    bool private _onlyNotPaused;
    address private _owner;
    uint256 private _floor;
    uint256 private _ceiling;
    bytes32 private _solution;
    uint256 private _deposit;
    uint256 private _winnings;
    address payable public player;

    modifier onlyOwner() {
        require(msg.sender == _owner, "Not Owner");
        _;
    }
    modifier pauseOff() {
        require(_onlyNotPaused == false, "Pause On");
        _;
    }
    modifier pauseOn() {
        require(_onlyNotPaused == true, "Pause Off");
        _;
    }

    constructor() {
        _owner = msg.sender;
        _onlyNotPaused = true;
    }

    function paused() external view override returns (bool) {
        return _onlyNotPaused;
    }

    function getRangeSolutionDeposit()
        external
        view
        override
        pauseOff
        returns (
            uint256,
            uint256,
            bytes32,
            uint256
        )
    {
        return (_floor, _ceiling, _solution, _deposit);
    }

    function setRangeSolutionDeposit(
        uint256 floor,
        uint256 ceiling,
        bytes32 solution,
        uint256 deposit
    ) external override onlyOwner pauseOn {
        require(floor <= ceiling, "Floor too large");
        _floor = floor;
        _ceiling = ceiling;
        _solution = solution;
        _deposit = deposit;
        _onlyNotPaused = !_onlyNotPaused;
    }

    function guess(uint256 number) external payable override pauseOff {
        require(msg.value == _deposit, "Wrong Deposit");
        _winnings += msg.value;
        player = payable(msg.sender);
        emit DidGuess(player, number);
        if (keccak256(abi.encodePacked(number)) == _solution) {
            _onlyNotPaused = !_onlyNotPaused;
            player.transfer(_winnings);
            emit DidResetGame(player);
        } else {
            _deposit *= 2;
        }
    }

    function hashNumber(uint256 number) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(number));
    }
}
