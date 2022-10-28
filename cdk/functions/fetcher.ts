import axios from "axios";

const getBaseUrl = ({ to, env }: { to: string; env: string }) => {
  return `https://${env}.voyager.online/api/txns?to=${to}`;
};

export const handler = async (event: any) => {
  const res = await axios.get(
    getBaseUrl({
      env: "goerli",
      to: "0x367c0c4603a29bc5aca8e07c6a2776d7c0d325945abb4f772f448b345ca4cf7",
    })
  );
  const items = res.data["items"] as Array<{ hash: string; status: string }>;
};
