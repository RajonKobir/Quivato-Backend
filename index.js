const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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

const upload = multer({
  storage: multer.diskStorage({
    destination: "uploads/", // Configure file storage location
  }),
  fileFilter: (req, file, cb) => {
    // Optional: Filter file types
    if (file.mimetype.startsWith("image/")) {
      cb(null, true); // Allow image files
    } else {
      cb(new Error("Only image files are allowed!"), false);
    }
  },
});

async function run() {
  try {
    await client.connect();
    const reviewCollection = client.db("quivato").collection("reviews");

    app.get("/", (req, res) => {
      res.send("Server is running");
    });

    // ------------------------------------------------------------------
    // create a review
    // ------------------------------------------------------------------
    app.post("/reviews", upload.single("file"), async (req, res) => {
      if (req.body.password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).send({ message: "Unauthorized" });
      }

      const payload = JSON.parse(req.body.data);
      const uploadedFile = req.file;

      if (!uploadedFile) {
        return res.status(400).send({ message: "No reviewer image uploaded!" });
      }

      const fs = require("fs");

      try {
        const imageBuffer = fs.readFileSync(uploadedFile.path); // Read image file as buffer
        const base64Image = Buffer.from(imageBuffer).toString("base64"); // Convert buffer to Base64

        const newReview = {
          review: payload.review,
          reviewer_name: payload.reviewer_name,
          reviewer_designation: payload.reviewer_designation,
          reviewer_image: base64Image, // Store Base64 encoded image
        };

        // Delete the uploaded image after successful processing
        fs.unlinkSync(uploadedFile.path);

        const result = await reviewCollection.insertOne(newReview);
        res.send(result);
      } catch (error) {
        console.error(error); // Handle potential errors during file reading
        res.status(500).send({ message: "Error processing image!" });
      }
    });

    // ------------------------------------------------------------------
    // get all reviews
    // ------------------------------------------------------------------
    app.get("/reviews", async (req, res) => {
      const query = {};
      const cursor = reviewCollection.find(query);
      const reviews = await cursor.toArray();

      res.send(reviews);
    });

    // ------------------------------------------------------------------
    // get single review
    // ------------------------------------------------------------------
    app.get("/reviews/:reviewId", async (req, res) => {
      const { reviewId } = req.params;

      const filter = { _id: new ObjectId(reviewId) };

      const result = await reviewCollection.findOne(filter);
      res.send(result);
    });

    // ------------------------------------------------------------------
    // update single review
    // ------------------------------------------------------------------
    app.patch("/reviews/:reviewId", upload.single("file"), async (req, res) => {
      if (req.body.password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).send({ message: "Unauthorized" });
      }

      const { reviewId } = req.params;

      let payload;
      try {
        payload = JSON.parse(req.body.data);
      } catch (error) {
        return res.status(400).send({ message: "Invalid JSON data" });
      }

      const updateData = {};
      if (payload.review) updateData.review = payload.review;
      if (payload.reviewer_name)
        updateData.reviewer_name = payload.reviewer_name;
      if (payload.reviewer_designation)
        updateData.reviewer_designation = payload.reviewer_designation;

      const uploadedFile = req.file;

      const fs = require("fs");

      if (uploadedFile) {
        try {
          const imageBuffer = fs.readFileSync(uploadedFile.path); // Read image file as buffer
          const base64Image = Buffer.from(imageBuffer).toString("base64"); // Convert buffer to Base64
          updateData.reviewer_image = base64Image;

          // Delete the uploaded image after successful processing
          fs.unlinkSync(uploadedFile.path);
        } catch (error) {
          console.error(error); // Handle potential errors during file reading
          res.status(500).send({ message: "Error processing image!" });
        }
      }

      try {
        const result = await reviewCollection.updateOne(
          { _id: new ObjectId(reviewId) },
          { $set: updateData }
        );

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: "Review not found" });
        }

        res.send({ message: "Review updated successfully", result });
      } catch (error) {
        console.error(error);
        res
          .status(500)
          .send({ message: "Error updating review", error: error.message });
      }
    });

    // ------------------------------------------------------------------
    // delete single review
    // ------------------------------------------------------------------
    app.delete("/reviews/:reviewId", async (req, res) => {
      // password validation(is admin)
      if (req.body.password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).send({ message: "Unauthorized" });
      }

      const { reviewId } = req.params;
      const filter = { _id: new ObjectId(reviewId) };

      const result = await reviewCollection.deleteOne(filter);
      res.send(result);
    });
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log("app is listening on port ", port);
});
