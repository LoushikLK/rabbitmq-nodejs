import amqplib from "amqplib";
import express from "express";

const app = express();

app.use(express.json());

const amqpServer = "amqp://localhost:5672";

const connection = await amqplib.connect(amqpServer);

const channel = await connection.createChannel();

await channel.assertQueue("auth-service", {
  durable: false,
});
await channel.assertQueue("database", {
  durable: false,
});

app.post("/hello", async (req, res) => {
  const data = req.body;

  // send a message to all the services connected to 'order' queue, add the date to differentiate between them
  channel.sendToQueue(
    "check-validation",
    Buffer.from(
      JSON.stringify({
        ...data,
        date: new Date(),
      })
    )
  );

  await channel.consume("auth-service", (data) => {
    let dataBuffer = Buffer.from(data.content);

    const receiveData = JSON.parse(dataBuffer);

    channel.ack(data);

    console.log("validation pass");

    if (receiveData?.authorized) {
      channel.sendToQueue(
        "save-db",
        Buffer.from(
          JSON.stringify({
            ...data,
            date: new Date(),
          })
        )
      );
    } else {
      res.send("Unauthorized");
    }
  });

  console.log("runninghhh");

  let sendData;

  await channel.consume("database", (data) => {
    let dataBuffer = Buffer.from(data.content);

    channel.ack(data);

    sendData = dataBuffer.toString();

    channel.cancel("database");
    channel.cancel("auth-service");
  });
  if (sendData) return res.send(sendData);
});

app.listen(5000, () => {
  console.log("running on port 5000");
});
