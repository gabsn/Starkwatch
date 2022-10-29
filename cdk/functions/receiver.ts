import axios from "axios";
import { getFromEnv } from "../lib/cdk-stack";

export const handler = async (event: any) => {
  const body = JSON.parse(event.body) as Body;
  const chatId = body.message.chat.id;
  const text = body.message.text;
  console.log(text);

  const addressRegex = new RegExp(/^.*(0x[a-zA-Z0-9]{64}$)/g);
  const match = addressRegex.exec(text);

  if (match === null) {
    await sendErrorMessagetoUser(chatId);
  } else {
    await sendConfirmationMessagetoUser(chatId, match[1]);
    await addAddresstoDb(match[1]);

    const addressToWatch = match[1];
    console.log(addressToWatch);
  }

  return {
    isBase64Encoded: false,
    statusCode: 200,
    headers: {},
    body: "OK",
  };
};

interface Body {
  message: {
    chat: {
      id: string;
    };
    text: string;
  };
}

async function sendErrorMessagetoUser(chatId: string) {
  const errorMessage =
    "Address not found. Please include your Starknet address following the command /watch";
  const BOT_API_KEY = getFromEnv("BOT_API_KEY");
  const baseUrl = `https://api.telegram.org/bot${BOT_API_KEY}/sendMessage?chat_id=${chatId}&text=${errorMessage}`;
  const res = await axios.post(baseUrl);
  console.log(res);
}

async function sendConfirmationMessagetoUser(chatId: string, match: string) {
  const addressWatched = match;
  const confirmationMessage = `Watching address ${addressWatched} ...`;
  const BOT_API_KEY = getFromEnv("BOT_API_KEY");
  const baseUrl = `https://api.telegram.org/bot${BOT_API_KEY}/sendMessage?chat_id=${chatId}&text=${confirmationMessage}`;
  const res = await axios.post(baseUrl);
  console.log(res);
}

async function addAddresstoDb(match: string) {
  const addressWatched = match;
  return;
}
