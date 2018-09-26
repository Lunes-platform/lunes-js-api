import { createFetchWrapper, PRODUCTS, VERSIONS, processJSON } from '../../utils/request';


const fetch = createFetchWrapper(PRODUCTS.NODE, VERSIONS.V1, processJSON);


export default {

    byAlias(alias: string) {
        return fetch(`/address/alias/by-alias/${alias}`);
    },

    byAddress(address: string) {
        return fetch(`/address/alias/by-address/${address}`);
    }

};
