# Russian Roulette
A game of Russian Roulette where each player must deposit a certain amount of Ether into the contract and guess a number within a range (inclusive). The catch is, every time a player takes a wrong guess, the deposited money is lost and the next guess would cost double the amount of Ether. Whoever guesses correctly will win the game and receive all Ether deposited by previous players.

The game starts off in a paused state. It can only begin after the owner defines the range (floor & ceiling), the hash of the solution, and the base deposit. After a player wins the game, the game will return to a paused state until the owner defines a new range and a new solution.

The owner can only define the range, solution, and base deposit when the game is paused to prevent abuse.
