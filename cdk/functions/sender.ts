import axios from "axios";
import { getFromEnv } from "../lib/cdk-stack";

export const handler = async () => {
  const res = await axios.get(getBaseUrl());
  console.log(res.data)
  }


const getBaseUrl = () => {
  const BOT_API_KEY = getFromEnv("BOT_API_KEY");
  console.log(BOT_API_KEY)
  return `https://api.telegram.org/bot${BOT_API_KEY}/getMe`;
};