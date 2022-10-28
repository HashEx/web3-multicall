import { suite, test } from '@testdeck/mocha';
import * as _chai from 'chai';
import { expect } from 'chai';
import Web3 from 'web3';
import { AbiItem } from 'web3-utils';

import Multicall from '../src/Multicall';
import tokenAbi from './abi/extended-erc-20.json';

_chai.should();
_chai.expect;

@suite class MulticallTest {
    private chainIds: number[];
    private hosts: string[];
    private web3s: Web3[];

    before() {
        this.chainIds = [10, 56];
        this.hosts = ['https://mainnet.optimism.io', 'https://rpc-bsc.bnb48.club'];
        this.web3s = [new Web3(this.hosts[0]), new Web3(this.hosts[1])];
    }

    @test async 'USDT contract\'s properties check' () {
        const addresses = ['0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', '0x55d398326f99059fF775485246999027B3197955'];
        for (let i = 0; i < addresses.length; i++) {
            const provider = new Web3.providers.HttpProvider(this.hosts[i]);
            const multicall = new Multicall({
                chainId: this.chainIds[i],
                provider
            });

            const contract = new this.web3s[i].eth.Contract(tokenAbi as AbiItem[], addresses[i]);
            const contracts = [contract.methods['symbol'](), contract.methods['nonExistedProperty']()];
            const result = await multicall.aggregate(contracts);
            expect(result.length).to.be.equal(contracts.length);

            expect(result[0][0]).to.be.equal(true);
            expect(result[1][0]).to.be.equal(false);
            expect(result[0][1]).to.be.equal('USDT');
        }
    }

    @test async 'Not supported chain param fail' () {
        for (let i = 0; i < this.hosts.length; i++) {
            const provider = new Web3.providers.HttpProvider(this.hosts[i]);
            const unsupportedChainId = 1111;
            expect(() => new Multicall({
                chainId: unsupportedChainId,
                provider
            })).to.throw('No address found via chainId. Please specify multicallAddress.');
        }
    }

    @test async 'Get block hash' () {
        for (let i = 0; i < this.hosts.length; i++) {
            const provider = new Web3.providers.HttpProvider(this.hosts[i]);

            const multicall = new Multicall({
                chainId: this.chainIds[i],
                provider,
            });

            const web3 = new Web3(provider);

            const blockNumber = (await web3.eth.getBlockNumber()) - 10;
            const web3Block = await web3.eth.getBlock(blockNumber);

            const blockHash = await multicall.getBlockHash(blockNumber).call();

            expect(blockHash).to.equal(web3Block.hash);
        }
    }

    @test async 'Get latest block hash' () {
        for (let i = 0; i < this.hosts.length; i++) {
            const provider = new Web3.providers.HttpProvider(this.hosts[i]);

            const multicall = new Multicall({
                chainId: this.chainIds[i],
                provider,
            });

            const web3 = new Web3(provider);

            const blockNumber = (await web3.eth.getBlockNumber()) - 1;
            const web3Block = await web3.eth.getBlock(blockNumber);

            const blockHash = await multicall.getLastBlockHash().call();

            expect(blockHash).to.equal(web3Block.hash);
        }
    }
}
