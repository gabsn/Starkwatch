import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
} from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { EventBridgeClient } from "@aws-sdk/client-eventbridge";
import axios from "axios";
import { PublishedEvent } from "typebridge";
import { FetchAccountTxsEvent } from "../lib/events";
import { getFromEnv } from "../lib/cdk-stack";
import { print } from "util";

const envs = ["mainnet", "goerli", "goerli-2"];
const ddb = new DynamoDBClient({});
export const ebClient = new EventBridgeClient({});

type Event = PublishedEvent<typeof FetchAccountTxsEvent>;

export async function handler(event: Event) {
  console.log(
    `Check if tx status changed for account: ${event.detail.accountAddress}`
  );
  await Promise.all(envs.map((env) => checkIfTxStatusChanged(env, event)));
}

async function checkIfTxStatusChanged(env: string, event: Event) {
  const res = await axios.get(
    getBaseUrl({
      env,
      to: event.detail.accountAddress,
    })
  );
  const items = res.data["items"] as Array<Item>;
  for (const item of items) {
    if (item.status === "Accepted on L1") {
      continue;
    }
    const previousItem = await getPreviousItem(item.hash);
    console.log(`Previous item: ${JSON.stringify(previousItem, null, 2)}`);
    console.log(`Previous item status -${previousItem?.status}-`);
    console.log(`Item status -${item?.status}-`);
    if (previousItem === null || previousItem.status !== item.status) {
      console.log(`Transaction status changed to ${item.status}`);
      await setTransactionStatus(item);
      await sendNotification(env, item, event.detail.chatId);
    }
  }
}

async function getPreviousItem(hash: string): Promise<Item | null> {
  const params = {
    TableName: process.env.TX_STATUSES_TABLE,
    Key: { hash: { S: hash } },
  };
  console.log(
    `Calling previous items with command: ${JSON.stringify(params, null, 2)}`
  );

  const res = await ddb.send(new GetItemCommand(params));
  if (res.Item == null) {
    return null;
  }

  return unmarshall(res.Item) as Item;
}

async function setTransactionStatus(item: Item) {
  const ddb = new DynamoDBClient({});
  const params = {
    TableName: process.env.TX_STATUSES_TABLE,
    Item: {
      hash: { S: item.hash },
      status: { S: item.status },
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
  if (env == "mainnet") {
    return `https://voyager.online/api/txns?to=${to}`;
  }
  return `https://${env}.voyager.online/api/txns?to=${to}`;
};

async function sendNotification(env: string, item: Item, chatId: string) {
  const confirmationMessage = `✨ Congrats! Your transaction ${formatTx(
    env,
    item.hash
  )} went through with status *${item.status}* 🚀`;
  const BOT_API_KEY = getFromEnv("BOT_API_KEY");
  const baseUrl = `https://api.telegram.org/bot${BOT_API_KEY}/sendMessage?chat_id=${chatId}&text=${confirmationMessage}&parse_mode=markdown`;
  await axios.post(baseUrl);
}

const formatTx = (env: string, txHash: string) => {
  if (env == "mainnet") {
    return `[${txHash}](https://starkscan.co/tx/${txHash})`;
  } else if (env == "goerli") {
    return `[${txHash}](https://testnet.starkscan.co/tx/${txHash})`;
  } else if (env == "goerli-2") {
    return `[${txHash}](https://testnet-2.starkscan.co/tx/${txHash})`;
  } else {
    throw Error(`${env} is wrong env`);
  }
};
