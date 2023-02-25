import amqplib from "amqplib";
import express from "express";

const app = express();

app.use(express.json());

const amqpServer = "amqp://localhost:5672";

const connection = await amqplib.connect(amqpServer);

const channel = await connection.createChannel();

await channel.assertQueue("check-validation", { durable: false });
await channel.assertQueue("database", { durable: false });
await channel.assertQueue("auth-service", { durable: false });

connect();

async function connect() {
  try {
    await channel.consume("check-validation", (data) => {
      let dataBuffer = Buffer.from(data.content);

      console.log("running check-validation");

      channel.ack(data);

      let receiveData = JSON.parse(dataBuffer);

      // send a message to all the services connected to 'order' queue, add the date to differentiate between them
      channel.sendToQueue(
        "auth-service",
        Buffer.from(
          JSON.stringify({
            authorized: true,
            user: receiveData?.name,
          })
        )
      );
      channel.cancel("check-validation");
    });
  } catch (error) {
    console.log(error);
  }
}

// send a message to all the services connected to 'order' queue, add the date to differentiate between them

app.listen(7000, () => {
  console.log("running on port 7000");
});
