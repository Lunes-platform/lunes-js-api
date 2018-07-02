import {
  Schema,
  ArrayPart,
  BooleanPart,
  DatePart,
  NumberPart,
  ObjectPart,
  StringPart
} from "ts-api-validator";
import { Base58Part } from "./schema.Base58Part";
import { MoneyPart } from "./schema.MoneyPart";
import { OrderPricePart } from "./schema.OrderPricePart";
import * as constants from "../constants";
import { removeAliasPrefix } from "../utils/remap";

import { stub, stringConversion } from "./schemaTemporaryTools";

const getTxCommonFields = (typeName, wavesFeeOnly) => ({
  transactionType: {
    type: StringPart,
    defaultValue: typeName
  },
  id: {
    type: StringPart,
    required: true
  },
  version: {
    type: NumberPart
    // TODO : required (later, when it's stable)
  },
  senderPublicKey: {
    type: StringPart,
    required: true
  },
  sender: {
    type: StringPart,
    required: true
  },
  fee: wavesFeeOnly
    ? {
        type: MoneyPart,
        required: true,
        assetId: "",
        parseValue: stringConversion
      }
    : {
        type: MoneyPart,
        required: true,
        assetIdPath: "feeAsset",
        parseValue: stringConversion
      },
  height: {
    type: NumberPart
    // TODO : required (later, when it's stable)
  },
  timestamp: {
    type: DatePart,
    required: true
  },
  signature: {
    type: StringPart
  },
  proofs: {
    type: ArrayPart,
    content: {
      type: StringPart,
      required: true
    }
  }
});

const getTxRecipient = () => ({
  type: StringPart,
  required: true,
  parseValue: removeAliasPrefix
});

const getTxRecipientAddress = () => ({
  type: StringPart,
  required: true,
  parseValue: stub("string")
});

const getTxAssetId = (path?) => ({
  type: StringPart,
  required: true,
  path: path,
  parseValue: d => (d ? d : constants.WAVES)
});

const getTxAssetName = () => ({
  type: StringPart,
  required: true
});

const getTxChainId = () => ({
  type: NumberPart
  // TODO : required (later, when it's stable)
});

const getTxAssetDescription = () => ({
  type: StringPart,
  required: true
});

const getTxAssetPrecision = () => ({
  type: NumberPart,
  required: true,
  path: "decimals"
});

const getTxAssetTotalAmount = (path, assetIdPath) => ({
  type: MoneyPart,
  required: true,
  path: path,
  assetIdPath: assetIdPath,
  parseValue: stringConversion
});

const getTxAssetReissuable = () => ({
  type: BooleanPart,
  required: true
});

const getTxAmount = (assetIdPath, nthParent?) => ({
  type: MoneyPart,
  required: true,
  assetIdPath: assetIdPath,
  nthParent: nthParent || null,
  parseValue: stringConversion
});

const getTxWavesAmount = () => ({
  type: MoneyPart,
  required: true,
  assetId: "",
  parseValue: stringConversion
});

const getTxPrice = (amountAssetIdPath, priceAssetIdPath) => ({
  type: OrderPricePart,
  required: true,
  amountAssetIdPath: amountAssetIdPath,
  priceAssetIdPath: priceAssetIdPath,
  parseValue: stringConversion
});

const getTxWavesFee = (path?) => ({
  type: MoneyPart,
  required: true,
  path: path,
  assetId: "",
  parseValue: stringConversion
});

const getTxLeaseTransactionId = path => ({
  type: StringPart,
  required: true,
  path: path
});

const getTxIsActiveLeasing = () => ({
  type: BooleanPart,
  required: true,
  path: "status",
  parseValue: s => s === "active"
});

const getTxAlias = () => ({
  type: StringPart,
  required: true,
  parseValue: removeAliasPrefix
});

const getTxTransfers = () => ({
  type: ArrayPart,
  required: true,
  content: {
    type: ObjectPart,
    required: true,
    content: {
      recipient: getTxRecipient(),
      amount: getTxAmount("assetId", 1)
    }
  }
});

const getTxOrder = path => ({
  type: ObjectPart,
  required: true,
  path: path,
  content: {
    id: {
      type: StringPart,
      required: true
    },
    type: {
      type: StringPart,
      required: true,
      path: `${path}.orderType`
    },
    senderPublicKey: {
      type: StringPart,
      required: true
    },
    sender: {
      type: StringPart,
      required: true,
      parseValue: stub("string")
    },
    matcherPublicKey: {
      type: StringPart,
      required: true
    },
    amountAsset: getTxAssetId(`${path}.assetPair.amountAsset`),
    amount: getTxAmount(`${path}.assetPair.amountAsset`),
    priceAsset: getTxAssetId(`${path}.assetPair.priceAsset`),
    price: getTxPrice(
      `${path}.assetPair.amountAsset`,
      `${path}.assetPair.priceAsset`
    ),
    matcherFee: getTxWavesFee()
  }
});

export const issueTransactionSchema = new Schema({
  type: ObjectPart,
  required: true,
  content: {
    ...getTxCommonFields(constants.ISSUE_TX_NAME, true),
    assetId: getTxAssetId("id"),
    name: getTxAssetName(),
    description: getTxAssetDescription(),
    precision: getTxAssetPrecision(),
    quantity: getTxAssetTotalAmount("quantity", "assetId"),
    reissuable: getTxAssetReissuable()
  }
});

export const transferTransactionSchema = new Schema({
  type: ObjectPart,
  required: true,
  content: {
    ...getTxCommonFields(constants.TRANSFER_TX_NAME, false),
    recipient: getTxRecipient(),
    recipientAddress: getTxRecipientAddress(),
    assetId: getTxAssetId(),
    amount: getTxAmount("assetId"),
    feeAssetId: getTxAssetId("feeAsset")
  }
});

export const reissueTransactionSchema = new Schema({
  type: ObjectPart,
  required: true,
  content: {
    ...getTxCommonFields(constants.REISSUE_TX_NAME, true),
    assetId: getTxAssetId(),
    chainId: getTxChainId(),
    quantity: getTxAssetTotalAmount("quantity", "assetId"),
    reissuable: getTxAssetReissuable()
  }
});

export const burnTransactionSchema = new Schema({
  type: ObjectPart,
  required: true,
  content: {
    ...getTxCommonFields(constants.BURN_TX_NAME, true),
    assetId: getTxAssetId(),
    chainId: getTxChainId(),
    quantity: getTxAssetTotalAmount("amount", "assetId")
  }
});

export const exchangeTransactionSchema = new Schema({
  type: ObjectPart,
  required: true,
  content: {
    ...getTxCommonFields(constants.EXCHANGE_TX_NAME, true),
    amountAsset: getTxAssetId("order1.assetPair.amountAsset"),
    amount: getTxAmount("order1.assetPair.amountAsset"),
    priceAsset: getTxAssetId("order1.assetPair.priceAsset"),
    price: getTxPrice(
      "order1.assetPair.amountAsset",
      "order1.assetPair.priceAsset"
    ),
    buyOrder: getTxOrder("order1"),
    buyMatcherFee: getTxWavesFee(),
    sellOrder: getTxOrder("order2"),
    sellMatcherFee: getTxWavesFee()
  }
});

export const leaseTransactionSchema = new Schema({
  type: ObjectPart,
  required: true,
  content: {
    ...getTxCommonFields(constants.LEASE_TX_NAME, true),
    recipient: getTxRecipient(),
    recipientAddress: getTxRecipientAddress(),
    amount: getTxWavesAmount(),
    isActive: getTxIsActiveLeasing()
  }
});

export const cancelLeasingTransactionSchema = new Schema({
  type: ObjectPart,
  required: true,
  content: {
    ...getTxCommonFields(constants.CANCEL_LEASING_TX_NAME, true),
    leaseTransactionId: getTxLeaseTransactionId("leaseId")
    // TODO : leaseTransactionAmount and leaseTransactionAddress
  }
});

export const createAliasTransactionSchema = new Schema({
  type: ObjectPart,
  required: true,
  content: {
    ...getTxCommonFields(constants.CREATE_ALIAS_TX_NAME, true),
    alias: getTxAlias()
  }
});

export const massTransferTransactionSchema = new Schema({
  type: ObjectPart,
  required: true,
  content: {
    ...getTxCommonFields(constants.MASS_TRANSFER_TX_NAME, true),
    assetId: getTxAssetId(),
    totalAmount: getTxAmount("assetId"),
    transfers: getTxTransfers()
  }
});
