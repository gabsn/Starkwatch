# Starkwatch

Starkwatch is your best friend on StarkNet 🐌
It sends you a message on telegram whenever your transactions get accepted on L2.
No more time lost, you can enjoy your life away from your computer ✨

## Usage

1. Search `StarkwatchBot` in your telegram contacts.
2. Add your account addresses to watch:

```
/watch 0x06683a563773e1eb3d4005f478a5f0c532e24952125250fac63bf5ab645d1242
```

3. Receive notifications upon your tx acceptance
4. Stop receiving notifications by sending `/stop` to the bot

## Dev Setup

1. `npm install`
2. Create `.env` and fill in your telegram bot token
3. Deploy the bot in one simple cmd:

```sh
npm run cdk deploy
```

4. Set the telegram bot webhook url by opening the following link in your browser

```
https://api.telegram.org/bot<Bot Token>/setWebhook?url=<Api Gateway>/prod/commands&drop_pending_updates=true

{"ok":true,"result":true,"description":"Webhook was set"}
```
