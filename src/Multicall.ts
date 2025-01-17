import Web3 from 'web3';
import { Contract } from 'web3-eth-contract';
import { provider } from 'web3-core';

import { CHAIN_ID_TO_MULTICALL_ADDRESS, ChainId, VERSION } from './constants';
import { AbiItem } from 'web3-utils';
import { abiSelector } from './abi/abi-selector';

interface ConstructorArgs {
  chainId?: number;
  provider: provider;
  multicallAddress?: string;
}

const multicallSelector = (chainId: number | undefined, address: string): VERSION => {
    address = address.toLowerCase();
    if (chainId === ChainId.ARBITRUM && address === CHAIN_ID_TO_MULTICALL_ADDRESS[ChainId.ARBITRUM].toLowerCase()) {
        return VERSION.V2;
    }

    if (chainId === ChainId.OPTIMISM && address === CHAIN_ID_TO_MULTICALL_ADDRESS[ChainId.OPTIMISM].toLowerCase()) {
        return VERSION.V2;
    }

    return VERSION.V1;
};

class Multicall {
    web3: Web3;
    multicall: Contract;
    version: VERSION;
    abi: AbiItem[];

    constructor({ chainId, provider, multicallAddress }: ConstructorArgs) {
        this.web3 = new Web3(provider);

        const _multicallAddress = multicallAddress
            ? multicallAddress
            : chainId
                ? CHAIN_ID_TO_MULTICALL_ADDRESS[chainId]
                : undefined;

        if (!_multicallAddress) {
            throw new Error(
                'No address found via chainId. Please specify multicallAddress.'
            );
        }

        this.version = multicallSelector(chainId, _multicallAddress);
        this.abi = abiSelector(this.version);
        this.multicall = new this.web3.eth.Contract(
            this.abi,
            _multicallAddress
        );
    }

    async aggregate(calls: any[]) {
        const callRequests = calls.map((call) => {
            const callData = call.encodeABI();
            return {
                target: call._parent._address,
                callData,
            };
        });

        let methodName;
        switch (this.version) {
        case VERSION.V1:
            methodName = 'aggregate';
            break;
        case VERSION.V2:
            methodName = 'aggregateViewCalls';
            break;
        }

        const { results, returnData } = await this.multicall.methods[methodName](callRequests).call();

        return returnData.map((hex: string, index: number) => {
            const types = calls[index]._method.outputs.map(
                (o: any) => ((o.internalType !== o.type) && (o.internalType !== undefined)) ? o : o.type
            );
            if (results[index]) {
                let result;
                try {
                    result = this.web3.eth.abi.decodeParameters(types, hex);
                } catch (e: any) {
                    return [false, `Data handling error: ${e.message}`];
                }

                delete result.__length__;

                result = Object.values(result);

                return [true, result.length === 1 ? result[0] : result];
            } else {
                return [false, hex];
            }
        });
    }

    getEthBalance(address: string) {
        return this.multicall.methods.getEthBalance(address);
    }

    getBlockHash(blockNumber: string | number) {
        return this.multicall.methods.getBlockHash(blockNumber);
    }

    getLastBlockHash() {
        return this.multicall.methods.getLastBlockHash();
    }

    getCurrentBlockTimestamp() {
        return this.multicall.methods.getCurrentBlockTimestamp();
    }

    getCurrentBlockDifficulty() {
        return this.multicall.methods.getCurrentBlockDifficulty();
    }

    getCurrentBlockGasLimit() {
        return this.multicall.methods.getCurrentBlockGasLimit();
    }

    getCurrentBlockCoinbase() {
        return this.multicall.methods.getCurrentBlockCoinbase();
    }
}

export default Multicall;