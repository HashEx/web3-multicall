import { VERSION } from '../constants';
import multicallAbi from './Multicall.json';
import multicallV2Abi from './MulticallV2.json';
import { AbiItem } from 'web3-utils';

export const abiSelector = (version: VERSION): AbiItem[] => {
    switch (version) {
    case VERSION.V1:
        return multicallAbi as AbiItem[];
    case VERSION.V2:
        return multicallV2Abi as AbiItem[];
    }
};