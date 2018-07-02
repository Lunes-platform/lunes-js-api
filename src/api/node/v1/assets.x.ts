import { Schema, NumberPart, ObjectPart, StringPart } from "ts-api-validator";
import { precisionCheck } from "../../../utils/remap";
import * as constants from "../../../constants";
import schemaFields from "../../schemaFields";

export const issueSchema = new Schema({
  type: ObjectPart,
  required: true,
  content: {
    senderPublicKey: schemaFields.publicKey,
    name: {
      type: StringPart,
      required: true
    },
    description: {
      type: StringPart,
      required: false,
      defaultValue: ""
    },
    quantity: {
      type: NumberPart,
      required: true
    },
    precision: {
      type: NumberPart,
      required: true,
      isValid: precisionCheck
    },
    reissuable: schemaFields.reissuable,
    fee: schemaFields.issueFee,
    timestamp: schemaFields.timestamp
  }
});

export const transferSchema = new Schema({
  type: ObjectPart,
  required: true,
  content: {
    senderPublicKey: schemaFields.publicKey,
    recipient: schemaFields.recipient,
    assetId: schemaFields.assetId,
    amount: {
      type: NumberPart,
      required: true
    },
    feeAssetId: {
      type: StringPart,
      required: false,
      defaultValue: constants.WAVES
    },
    fee: schemaFields.fee,
    timestamp: schemaFields.timestamp
  }
});

export const reissueSchema = new Schema({
  type: ObjectPart,
  required: true,
  content: {
    senderPublicKey: schemaFields.publicKey,
    assetId: schemaFields.assetId,
    quantity: {
      type: NumberPart,
      required: true
    },
    reissuable: schemaFields.reissuable,
    fee: schemaFields.issueFee,
    timestamp: schemaFields.timestamp
  }
});

export const burnSchema = new Schema({
  type: ObjectPart,
  required: true,
  content: {
    senderPublicKey: schemaFields.publicKey,
    assetId: schemaFields.assetId,
    quantity: {
      type: NumberPart,
      required: true
    },
    fee: schemaFields.fee,
    timestamp: schemaFields.timestamp
  }
});
