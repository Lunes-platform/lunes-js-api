import { IHash } from "../../interfaces";

import {
  ByteProcessor,
  Alias,
  Base58,
  Bool,
  Byte,
  Long,
  StringWithLength,
  AssetId,
  MandatoryAssetId,
  OrderType,
  Recipient,
  Transfers
} from "./ByteProcessor";

import { concatUint8Arrays } from "../utils/concat";
import { addRecipientPrefix } from "../utils/remap";
import crypto from "../utils/crypto";
import base58 from "../libs/base58";

import * as constants from "../constants";

type TTransactionFields = Array<ByteProcessor | number>;

interface IAPISchema {
  readonly from: "bytes" | "raw" | "none";
  readonly to: "base58" | "prefixed" | Function;
  readonly path?: string;
}

export interface ITransactionClass {
  prepareForAPI(privateKey: string): Promise<any>;
  getSignature(privateKey: string): Promise<string>;
  getBytes(): Promise<Uint8Array>;
  getExactBytes(fieldName: string): Promise<Uint8Array>;
}

export interface ITransactionClassConstructor {
  new (hashMap: any): ITransactionClass;
}

function createTransactionClass(
  txType: string | null,
  fields: TTransactionFields,
  apiSchema?: IHash<IAPISchema>
) {
  if (!fields || !fields.length) {
    throw new Error(
      "It is not possible to create TransactionClass without fields"
    );
  }

  // Fields of the original data object
  const storedFields: object = Object.create(null);

  // Data bytes or functions returning data bytes via promises
  const byteProviders: Array<Function | Uint8Array> = [];

  fields.forEach(field => {
    if (field instanceof ByteProcessor) {
      // Remember user data fields
      storedFields[field.name] = field;
      // All user data must be represented as bytes
      byteProviders.push(data => field.process(data[field.name]));
    } else if (typeof field === "number") {
      // All static integers from 0 to 255 are converted to bytes as well
      byteProviders.push(Uint8Array.from([field]));
    } else {
      throw new Error(
        "Invalid field is passed to the createTransactionClass function"
      );
    }
  });

  class TransactionClass implements ITransactionClass {
    // Request data provided by user
    private readonly _rawData: object;

    // Array of Uint8Array and promises which return Uint8Array
    private readonly _dataHolders: Array<Uint8Array | Promise<Uint8Array>>;

    constructor(hashMap: any = {}) {
      // Save all needed values from user data
      this._rawData = Object.keys(storedFields).reduce((store, key) => {
        store[key] = hashMap[key];
        return store;
      }, {});

      this._dataHolders = byteProviders.map(provider => {
        if (typeof provider === "function") {
          // Execute function so that they return promises containing Uint8Array data
          return provider(this._rawData);
        } else {
          // Or just pass Uint8Array data
          return provider;
        }
      });
    }

    // Process the data so it's ready for usage in API
    public prepareForAPI(privateKey: string): Promise<any> {
      // Sign data and extend its object with signature and transaction type
      return this.getSignature(privateKey).then(signature => {
        // Transform data so it could match the API requirements
        return this._castToAPISchema(this._rawData).then(schemedData => ({
          ...(txType ? { transactionType: txType } : {}), // For matcher orders and other quasi-transactions
          ...schemedData,
          ...(txType !== constants.MASS_TRANSFER_TX_NAME
            ? { signature }
            : { proofs: [signature] }) // TODO
        }));
      });
    }

    // Sign transaction and return only signature
    public getSignature(privateKey: string): Promise<string> {
      return this.getBytes().then(dataBytes => {
        return crypto.buildTransactionSignature(dataBytes, privateKey);
      });
    }

    // Get byte representation of the transaction
    public getBytes(): Promise<Uint8Array> {
      return Promise.all(this._dataHolders).then(
        (multipleDataBytes: Uint8Array[]) => {
          if (multipleDataBytes.length === 1) {
            return multipleDataBytes[0];
          } else {
            return concatUint8Arrays(...multipleDataBytes);
          }
        }
      );
    }

    // Get bytes of an exact field from user data
    public getExactBytes(fieldName: string): Promise<Uint8Array> {
      if (!(fieldName in storedFields)) {
        throw new Error(
          `There is no field '${fieldName}' in '${txType} RequestDataType class`
        );
      }

      const byteProcessor = storedFields[fieldName];
      const userData = this._rawData[fieldName];
      return byteProcessor.process(userData);
    }

    private _castToAPISchema(data): Promise<object> {
      if (!apiSchema) return Promise.resolve({ ...data });

      // Generate an array of promises wielding the schemed data
      const transforms: Array<Promise<object>> = Object.keys(apiSchema).map(
        key => {
          const rule = apiSchema[key];

          if (rule.from === "bytes" && rule.to === "base58") {
            return this._castFromBytesToBase58(key);
          }

          if (rule.from === "raw" && rule.to === "prefixed") {
            if (!rule.path) {
              return this._castFromRawToPrefixed(key);
            } else {
              return Promise.resolve({
                [key]: this._rawData[key].reduce((result, obj) => {
                  result.push(
                    Object.assign(obj, {
                      [rule.path]: addRecipientPrefix(obj[rule.path])
                    })
                  );
                  return result;
                }, [])
              });
            }
          }

          if (rule.from === "none" && typeof rule.to === "function") {
            return Promise.resolve({
              [key]: rule.to()
            });
          }
        }
      );

      return Promise.all(transforms).then(schemedParts => {
        return schemedParts.reduce(
          (result, part) => {
            return { ...result, ...part };
          },
          { ...data }
        );
      });
    }

    private _castFromBytesToBase58(key): Promise<object> {
      return this.getExactBytes(key).then(bytes => {
        return { [key]: base58.encode(bytes) };
      });
    }

    private _castFromRawToPrefixed(key): Promise<object> {
      return Promise.resolve({ [key]: addRecipientPrefix(this._rawData[key]) });
    }
  }

  return TransactionClass as ITransactionClassConstructor;
}

export default {
  IssueTransaction: createTransactionClass(constants.ISSUE_TX_NAME, [
    constants.ISSUE_TX,
    new Base58("senderPublicKey"),
    new StringWithLength("name"),
    new StringWithLength("description"),
    new Long("quantity"),
    new Byte("precision"),
    new Bool("reissuable"),
    new Long("fee"),
    new Long("timestamp")
  ]),

  TransferTransaction: createTransactionClass(
    constants.TRANSFER_TX_NAME,
    [
      constants.TRANSFER_TX,
      new Base58("senderPublicKey"),
      new AssetId("assetId"),
      new AssetId("feeAssetId"),
      new Long("timestamp"),
      new Long("amount"),
      new Long("fee"),
      new Recipient("recipient")
    ],
    {
      recipient: {
        from: "raw",
        to: "prefixed"
      }
    }
  ),

  ReissueTransaction: createTransactionClass(constants.REISSUE_TX_NAME, [
    constants.REISSUE_TX,
    new Base58("senderPublicKey"),
    new MandatoryAssetId("assetId"),
    new Long("quantity"),
    new Bool("reissuable"),
    new Long("fee"),
    new Long("timestamp")
  ]),

  BurnTransaction: createTransactionClass(constants.BURN_TX_NAME, [
    constants.BURN_TX,
    new Base58("senderPublicKey"),
    new MandatoryAssetId("assetId"),
    new Long("quantity"),
    new Long("fee"),
    new Long("timestamp")
  ]),

  LeaseTransaction: createTransactionClass(
    constants.LEASE_TX_NAME,
    [
      constants.LEASE_TX,
      new Base58("senderPublicKey"),
      new Recipient("recipient"),
      new Long("amount"),
      new Long("fee"),
      new Long("timestamp")
    ],
    {
      recipient: {
        from: "raw",
        to: "prefixed"
      }
    }
  ),

  CancelLeasingTransaction: createTransactionClass(
    constants.CANCEL_LEASING_TX_NAME,
    [
      constants.CANCEL_LEASING_TX,
      new Base58("senderPublicKey"),
      new Long("fee"),
      new Long("timestamp"),
      new Base58("transactionId")
    ]
  ),

  CreateAliasTransaction: createTransactionClass(
    constants.CREATE_ALIAS_TX_NAME,
    [
      constants.CREATE_ALIAS_TX,
      new Base58("senderPublicKey"),
      new Alias("alias"),
      new Long("fee"),
      new Long("timestamp")
    ]
  ),

  MassTransferTransaction: createTransactionClass(
    constants.MASS_TRANSFER_TX_NAME,
    [
      constants.MASS_TRANSFER_TX,
      constants.MASS_TRANSFER_TX_VERSION,
      new Base58("senderPublicKey"),
      new AssetId("assetId"),
      new Transfers("transfers"),
      new Long("timestamp"),
      new Long("fee")
    ],
    {
      transfers: {
        from: "raw",
        to: "prefixed",
        path: "recipient"
      },
      type: {
        from: "none",
        to: () => constants.MASS_TRANSFER_TX
      },
      version: {
        from: "none",
        to: () => constants.MASS_TRANSFER_TX_VERSION
      }
    }
  ),

  // That's not exactly a transaction so it has no type
  Order: createTransactionClass(null, [
    new Base58("senderPublicKey"),
    new Base58("matcherPublicKey"),
    new AssetId("amountAsset"),
    new AssetId("priceAsset"),
    new OrderType("orderType"),
    new Long("price"),
    new Long("amount"),
    new Long("timestamp"),
    new Long("expiration"),
    new Long("matcherFee")
  ]),

  createSignableData(fields: TTransactionFields) {
    return createTransactionClass(null, fields);
  }
};
