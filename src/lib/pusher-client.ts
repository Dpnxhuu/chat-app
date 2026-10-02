import PusherClient from "pusher-js";

export const pusherClient = new PusherClient(
  process.env.PUSHER_KEY!,
  { cluster: process.env.PUSHER_CLUSTER! }
);