// Start - Support direct Mocha run & debug
import 'hardhat'
import '@nomiclabs/hardhat-ethers'
// End - Support direct Mocha run & debug

import chai, {expect} from 'chai'
import {before} from 'mocha'
import {solidity} from 'ethereum-waffle'
import {deployContract, signer} from './framework/contracts'
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers'
import {successfulTransaction} from './framework/transaction'
import {Midterm} from '../typechain-types'
import {BigNumber, ethers} from 'ethers'

chai.use(solidity)

describe('Midterm: 30%', () => {
    let contract: Midterm
    let s1: SignerWithAddress
    const floor = Math.floor(Math.random() * 10000)
    const ceiling = Math.floor(Math.random() * 10000) + floor
    const solutionNum = Math.floor((floor + ceiling) / 2)
    let solutionHash: string
    const baseDeposit = ethers.utils.parseEther(
        Math.ceil(Math.random() * 10).toString()
    )

    before(async () => {
        s1 = await signer(1)
    })

    beforeEach(async () => {
        contract = await deployContract<Midterm>('Midterm')
    })

    describe('2) Standalone function: 5%', () => {
        it('1. addArrays: 5%', async () => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const input0 = [...Array(10)].map(() =>
                Math.floor(Math.random() * 10000)
            )
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const input1 = [...Array(10)].map(() =>
                Math.floor(Math.random() * 10000)
            )
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const refResult = [...Array(10)].map(
                (e, i) => input0[i] + input1[i]
            )
            const result = await contract.addArrays(input0, input1)
            const resultNum = result.map((v) => v.toNumber())
            expect(resultNum).deep.equals(refResult)
        })
    })

    describe('3A) Slavic Roulette, setting up: 6%', () => {
        before(async () => {
            solutionHash = await contract.hashNumber(solutionNum)
        })

        it('1. Should be paused immediately after deployment: 1%', async () => {
            const paused = await contract.paused()
            expect(paused).to.be.true
        })
        it('2. Should read & save base game parameters correctly: 1.5%', async () => {
            await contract.setRangeSolutionDeposit(
                floor,
                ceiling,
                solutionHash,
                baseDeposit
            )
            const params = await contract.getRangeSolutionDeposit()
            expect(params).to.deep.equals([
                BigNumber.from(floor),
                BigNumber.from(ceiling),
                solutionHash,
                baseDeposit
            ])
        })
        it('3. Should be unpaused after setting params: 1.5%', async () => {
            await contract.setRangeSolutionDeposit(
                floor,
                ceiling,
                solutionHash,
                baseDeposit
            )
            const paused = await contract.paused()
            expect(paused).to.be.false
        })
        it('4. Should only allow owner to set params: 1%', async () => {
            await expect(
                contract
                    .connect(s1)
                    .setRangeSolutionDeposit(
                        floor,
                        ceiling,
                        solutionHash,
                        baseDeposit
                    )
            ).to.be.reverted
        })
        it('5. Should revert playing if params not set: 1%', async () => {
            await expect(
                contract
                    .connect(s1)
                    .guess(solutionNum + 1, {value: baseDeposit})
            ).to.be.reverted
        })
    })
    describe('3B) Slavic Roulette, playing: 19%', () => {
        beforeEach(async () => {
            await contract.setRangeSolutionDeposit(
                floor,
                ceiling,
                solutionHash,
                baseDeposit
            )
        })

        it('1. Should let a player guess wrong and emit proper events: 5%', async () => {
            const guessTx = await contract
                .connect(s1)
                .guess(solutionNum + 1, {value: baseDeposit})
            await expect(guessTx)
                .to.emit(contract, 'DidGuess')
                .withArgs(s1.address, solutionNum + 1)
        })

        it('2. Should let a player guess correctly and emit proper events: 5%', async () => {
            const guessTx = await contract
                .connect(s1)
                .guess(solutionNum, {value: baseDeposit})
            await expect(guessTx)
                .to.emit(contract, 'DidGuess')
                .withArgs(s1.address, solutionNum)
            await expect(guessTx)
                .to.emit(contract, 'DidResetGame')
                .withArgs(s1.address)
        })

        it('3. Should revert when player sends wrong deposit: 2.5%', async () => {
            await expect(contract.connect(s1).guess(solutionNum)).to.be.reverted
        })

        it('4. Should double deposit when a player guesses wrong: 2.5%', async () => {
            await contract
                .connect(s1)
                .guess(solutionNum + 1, {value: baseDeposit})
            const currentDeposit = await contract.getRangeSolutionDeposit()
            expect(currentDeposit[3]).equals(baseDeposit.mul(2))
        })

        it('5. Should transfer the correct amount of funds to winner: 2.5%', async () => {
            await contract.guess(solutionNum + 1, {value: baseDeposit})
            const s1StartBalance = await s1.getBalance()
            const receipt = await successfulTransaction(
                contract.connect(s1).guess(solutionNum, {
                    value: baseDeposit.mul(2)
                })
            )
            const s1EndBalance = await s1.getBalance()
            expect(s1StartBalance).equals(
                s1EndBalance
                    .sub(baseDeposit)
                    .add(receipt.gasUsed.mul(receipt.effectiveGasPrice))
            )
        })

        it('6. Should pause game when a player wins: 1.5%', async () => {
            await contract.connect(s1).guess(solutionNum, {value: baseDeposit})
            const paused = await contract.paused()
            expect(paused).to.be.true
        })
    })
})
