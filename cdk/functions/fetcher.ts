import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
} from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import {
  EventBridgeClient,
  PutEventsCommand,
} from "@aws-sdk/client-eventbridge";
import axios from "axios";

const ddb = new DynamoDBClient({});
export const ebClient = new EventBridgeClient({});

export const handler = async (event: any) => {
  const res = await axios.get(
    getBaseUrl({
      env: "goerli",
      to: "0x367c0c4603a29bc5aca8e07c6a2776d7c0d325945abb4f772f448b345ca4cf7",
    })
  );
  const items = res.data["items"] as Array<Item>;
  for (const item of items) {
    if (item.status === "Accepted on L1") {
      continue;
    }
    const previousItem = await getPreviousItem(item.hash);
    if (previousItem === null || previousItem.status !== item.status) {
      await setTransactionStatus(item);
      await emitEventHasChanged(item);
    }
  }
};

async function getPreviousItem(hash: string): Promise<Item | null> {
  const params = {
    TableName: "CdkStack-TransactionStatus2B6158A7-17RI80QLXDL7O",
    Key: { transactionHash: { S: hash } },
  };

  const res = await ddb.send(new GetItemCommand(params));
  if (res.Item == null) {
    return null;
  }

  return unmarshall(res.Item) as Item;
}

async function emitEventHasChanged(item: Item) {
  const params = {
    Entries: [
      {
        Detail: JSON.stringify({
          transactionHash: item.hash,
          transactionStatus: item.status,
        }),
        DetailType: "appRequestSubmitted",
        Resources: [
          //   "RESOURCE_ARN", //RESOURCE_ARN
        ],
        Source: "starkwatch",
      },
    ],
  };
  const data = await ebClient.send(new PutEventsCommand(params));
}

async function setTransactionStatus(item: Item) {
  const ddb = new DynamoDBClient({});
  const params = {
    TableName: "CdkStack-TransactionStatus2B6158A7-17RI80QLXDL7O",
    Item: {
      transactionHash: { S: item.hash },
      transactionStatus: { S: item.status },
    },
  };

  const res = await ddb.send(new PutItemCommand(params));

  return null;
}

interface Item {
  hash: string;
  status: string;
}

const getBaseUrl = ({ to, env }: { to: string; env: string }) => {
  return `https://${env}.voyager.online/api/txns?to=${to}`;
};
