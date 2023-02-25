import amqplib from "amqplib";
import express from "express";
import fs from "fs";

const app = express();

app.use(express.json());

const amqpServer = "amqp://localhost:5672";

const connection = await amqplib.connect(amqpServer);

const channel = await connection.createChannel();

await channel.assertQueue("save-db", { durable: false });
await channel.assertQueue("database", { durable: false });

connect();

async function connect() {
  try {
    await channel.consume("save-db", (data) => {
      let dataBuffer = Buffer.from(data.content);

      const stream = fs.createWriteStream("database.txt", { flags: "a" });
      stream.once("open", function (fd) {
        stream.write(JSON.stringify(dataBuffer) + "\r\n");
      });

      channel.ack(data);

      channel.sendToQueue(
        "database",
        Buffer.from("Data receive in database service")
      );
      channel.cancel("save-db");
    });
  } catch (error) {
    console.log(error);
  }
}

// send a message to all the services connected to 'order' queue, add the date to differentiate between them

app.listen(6000, () => {
  console.log("running on port 6000");
});
