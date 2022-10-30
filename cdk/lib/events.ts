import { EventBridgeClient } from "@aws-sdk/client-eventbridge";
import { Bus, Event } from "typebridge";

export const FetchAccountTxsBus = new Bus({
  name: "FetchAccountTxsBus",
  EventBridge: new EventBridgeClient({}),
});

export const FetchAccountTxSchema = {
  type: "object",
  properties: {
    accountAddress: { type: "string" },
    chatId: { type: "number" },
  },
  required: ["accountAddress", "chatId"],
} as const;

export const FetchAccountTxsEvent = new Event({
  name: "FetchAccountTxsEvent",
  bus: FetchAccountTxsBus,
  schema: FetchAccountTxSchema,
  source: "focustree.scheduler",
});
