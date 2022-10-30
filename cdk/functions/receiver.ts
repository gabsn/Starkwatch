import {
  DeleteItemCommand,
  DynamoDBClient,
  PutItemCommand,
  QueryCommand,
} from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { StartDataIngestionJobRequest } from "aws-sdk/clients/lookoutequipment";
import axios from "axios";
import { readdirSync } from "fs";
import { getFromEnv } from "../lib/cdk-stack";

const addressRegex = new RegExp(/^.*(0x[a-zA-Z0-9]{64}$)/g);
const ddb = new DynamoDBClient({});

export const handler = async (event: any) => {
  const body = JSON.parse(event.body) as Body;
  console.log(body);

  if (body.message != undefined) {
    if (body.message.text.startsWith("/watch")) {
      await handleWatch(body.message);
    }
    if (body.message.text.startsWith("/stop")) {
      await handleStop(body.message.chat.username);
    }
  }

  return {
    isBase64Encoded: false,
    statusCode: 200,
    headers: {},
    body: "OK",
  };
};

async function handleStop(username: string) {
  const items = await getAccountsForUsername(username);
  await Promise.all(
    items.map(async (i) => {
      const params = {
        TableName: "CdkStack-AccountsToWatch0A702DCE-Z6XSJDP9YT94",
        Key: {
          accountAddress: {
            S: i.accountAddress,
          },
        },
      };
      const res = await ddb.send(new DeleteItemCommand(params));
    })
  );
}

async function getAccountsForUsername(username: string) {
  const params = {
    TableName: "CdkStack-AccountsToWatch0A702DCE-Z6XSJDP9YT94",
    IndexName: "byUsername",
    KeyConditionExpression: "username = :username",
    ExpressionAttributeValues: {
      ":username": {
        S: username,
      },
    },
  };

  const res = await ddb.send(new QueryCommand(params));
  return (res.Items ?? []).map(
    (i) =>
      unmarshall(i) as {
        accountAddress: string;
        username: string;
        chatId: number;
      }
  );
}

async function handleWatch(message: Message) {
  const {
    chat: { id: chatId, username },
    text,
  } = message;

  const match = addressRegex.exec(text);

  if (match === null) {
    await sendErrorMessagetoUser(chatId);
  } else {
    await sendConfirmationMessagetoUser(chatId, match[1]);
    await addAddresstoDb(chatId, match[1], username);

    const addressToWatch = match[1];
    console.log(addressToWatch);
  }
}

async function sendErrorMessagetoUser(chatId: number) {
  const errorMessage =
    "Address not found. Please include your Starknet address following the command /watch";
  const BOT_API_KEY = getFromEnv("BOT_API_KEY");
  const baseUrl = `https://api.telegram.org/bot${BOT_API_KEY}/sendMessage?chat_id=${chatId}&text=${errorMessage}`;
  const res = await axios.post(baseUrl);
  console.log(res);
}

async function sendConfirmationMessagetoUser(chatId: number, match: string) {
  const addressWatched = match;
  const confirmationMessage = `Watching address ${addressWatched} ...`;
  const BOT_API_KEY = getFromEnv("BOT_API_KEY");
  const baseUrl = `https://api.telegram.org/bot${BOT_API_KEY}/sendMessage?chat_id=${chatId}&text=${confirmationMessage}`;
  const res = await axios.post(baseUrl);
  console.log(res);
}

async function addAddresstoDb(
  chatId: number,
  addressWatched: string,
  username: string
) {
  const params = {
    TableName: "CdkStack-AccountsToWatch0A702DCE-Z6XSJDP9YT94",
    Item: {
      accountAddress: { S: addressWatched },
      chatId: { N: chatId.toString() },
      username: { S: username },
    },
  };

  const res = await ddb.send(new PutItemCommand(params));

  return null;
}

interface Body {
  message?: Message;
}

interface Message {
  chat: {
    id: number;
    username: string;
  };
  text: string;
}
