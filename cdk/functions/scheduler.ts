import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { EventBridgeClient } from "@aws-sdk/client-eventbridge";
import { FetchAccountTxsEvent } from "../lib/events";

const ddb = new DynamoDBClient({});
export const ebClient = new EventBridgeClient({});

export const handler = async () => {
  const accountsToWatch = await getAccountsToWatch();
  await Promise.all(
    accountsToWatch.map((i) => FetchAccountTxsEvent.publish(i))
  );
};

async function getAccountsToWatch(): Promise<Array<Item>> {
  const params = {
    TableName: "CdkStack-AccountsToWatch0A702DCE-Z6XSJDP9YT94",
  };
  const res = await ddb.send(new ScanCommand(params));
  if (res.Items == null) {
    return [];
  }
  return res.Items.map((item) => unmarshall(item) as Item);
}

interface Item {
  accountAddress: string;
  chatId: number;
  username: string;
}
