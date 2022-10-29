import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
} from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import axios from "axios";
import { getFromEnv } from "../lib/cdk-stack";

const ddb = new DynamoDBClient({});

export const handler = async (event: any) => {
  const body = JSON.parse(event.body) as Body;
  const chatId = body.message.chat.id;
  const text = body.message.text;
  const user = body.message.chat.username;

  if (text.startsWith("/watch")) {
    const addressRegex = new RegExp(/^.*(0x[a-zA-Z0-9]{64}$)/g);
    const match = addressRegex.exec(text);

    if (match === null) {
      await sendErrorMessagetoUser(chatId);
    } else {
      await sendConfirmationMessagetoUser(chatId, match[1]);
      await addAddresstoDb(chatId, match[1], user);

      const addressToWatch = match[1];
      console.log(addressToWatch);
    }
  }

  return {
    isBase64Encoded: false,
    statusCode: 200,
    headers: {},
    body: "OK",
  };
};

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
  message: {
    chat: {
      id: number;
      username: string;
    };
    text: string;
  };
}
