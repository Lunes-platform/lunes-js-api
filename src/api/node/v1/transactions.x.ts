import {
  Schema,
  NumberPart,
  ObjectPart,
  StringPart,
  ArrayPart
} from "ts-api-validator";
import schemaFields from "../../schemaFields";

export const massTransferSchema = new Schema({
  type: ObjectPart,
  required: true,
  content: {
    senderPublicKey: schemaFields.publicKey,
    assetId: schemaFields.assetId,
    transfers: {
      type: ArrayPart,
      content: {
        type: ObjectPart,
        required: true,
        content: {
          recipient: schemaFields.recipient,
          amount: {
            type: NumberPart,
            required: true
          }
        }
      },
      defaultValue: []
    },
    timestamp: schemaFields.timestamp,
    fee: schemaFields.fee
  }
});
