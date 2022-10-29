import {
  DynamoDBClient,
  command
  GetItemCommand,
  PutItemCommand,
  ScanCommand,
} from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import {
  EventBridgeClient,
  PutEventsCommand,
} from "@aws-sdk/client-eventbridge";
import axios from "axios";

const ddb = new DynamoDBClient({});
export const ebClient = new EventBridgeClient({});

export const handler = async () => {
  const accountsToWatch = await getAccountsToWatch();
  await Promise.all(accountsToWatch.map(emitWatchAccount));
};

async function getAccountsToWatch(): Promise<Array<string>> {
  const params = {
    TableName: "CdkStack-AccountsToWatch0A702DCE-Z6XSJDP9YT94",
  };

  const res = await ddb.send(new ScanCommand(params));
  if (res.Items == null) {
    return [];
  }
  return res.Items.map(item => unmarshall(item) as Item).map(i => i.accountAddress);
}

async function emitWatchAccount(account: string) {
  console.log(account);
}

// async function emitEventHasChanged() {
//   const params = {
//     Entries: [
//       {
//         Detail: JSON.stringify({
//           transactionHash: item.hash,
//           transactionStatus: item.status,
//         }),
//         DetailType: "appRequestSubmitted",
//         Resources: [
//           //   "RESOURCE_ARN", //RESOURCE_ARN
//         ],
//         Source: "starkwatch",
//       },
//     ],
//   };
//   const data = await ebClient.send(new PutEventsCommand(params));
// }

interface Item {
  accountAddress: string;
  chatId: number;
  username: string;
}