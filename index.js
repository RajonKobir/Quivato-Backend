const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
const app = express();
require("dotenv").config();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const client = new MongoClient(process.env.MONGODB_URL, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    const reviewCollection = client.db("quivato").collection("reviews");

    app.get("/", (req, res) => {
      res.send("Server is running");
    });

    app.get("/reviews", async (req, res) => {
      const query = {};
      const cursor = reviewCollection.find(query);
      const reviews = await cursor.toArray();

      res.send(reviews);
    });

    app.post("/reviews", async (req, res) => {
      const payload = req.body.data;
      if ((req.body.password = process.env.ADMIN_PASSWORD)) {
        const result = reviewCollection.insertOne(payload);

        res.send(result);
      } else {
        res.status(401).send({ message: "Unauthorized" });
      }
    });

    app.put("/reviews/:reviewId", async (req, res) => {
      const { reviewId } = req.params;
      const payload = req.body;

      if ((req.body.password = process.env.ADMIN_PASSWORD)) {
        const filter = { _id: reviewId };
        const result = await reviewCollection.updateOne(filter, payload);

        res.send(result);
      } else {
        res.status(401).send({ message: "Unauthorized" });
      }
    });

    app.delete("/reviews/:reviewId", async (req, res) => {
      const { reviewId } = req.params;
      const filter = { _id: reviewId };

      if ((req.body.password = process.env.ADMIN_PASSWORD)) {
        const result = await reviewCollection.deleteOne(filter);
        res.send(result);
      } else {
        res.status(401).send({ message: "Unauthorized" });
      }
    });
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log("app is listening on port ", port);
});
