require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

app.use(cors());

app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xo1yp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
    await client.db("admin").command({ ping: 1 });
    const userCollection = client.db("Sinc-mart").collection("Users");
    const productCollection = client.db("Sinc-mart").collection("Products");
    const reviewCollection = client.db("Sinc-mart").collection("reviews");
    const reportCollection = client.db("Sinc-mart").collection("reports");
    const orderCollection = client.db("Sinc-mart").collection("Orders");
    const QandACollection = client.db("Sinc-mart").collection("QandA");

    // --------------------
    // Users
    // --------------------
    app.get("/users", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const newUser = req.body;
      const result = await userCollection.insertOne(newUser);
      res.send(result);
    });

    app.patch("/users/:id/role", async (req, res) => {
      const { id } = req.params;
      const { role } = req.body;

      try {
        const updatedUser = await userCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { role } }
        );

        if (updatedUser.modifiedCount === 0) {
          return res
            .status(404)
            .json({ message: "User not found or role not updated" });
        }

        res.json({ message: "User role updated successfully" });
      } catch (err) {
        res.status(500).json({ message: "Error updating user role" });
      }
    });

    app.get("/products/page", async (req, res) => {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 5;
      const skip = (page - 1) * limit;

      const products = await productCollection
        .find()
        .skip(skip)
        .limit(limit)
        .toArray();
      const total = await productCollection.countDocuments();

      res.json({ products, total });
    });

    app.get("/products", async (req, res) => {
      const result = await productCollection.find().toArray();
      res.send(result);
    });
    app.post("/Products", async (req, res) => {
      try {
        const product = req.body;
        const result = await productCollection.insertOne(product);
        res.status(201).send(result);
      } catch (error) {
        res.status(500).send({ error: "Failed to add product" });
      }
    });
    app.delete("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productCollection.deleteOne(query);
      res.send(result);
    });
    // Get Q&A for a specific product
    // GET: Fetch Q&A for a product
    app.get("/QandA/:productId", async (req, res) => {
      try {
        const qna = await QandACollection.find({
          productId: req.params.productId,
        }).toArray();
        res.json(qna);
      } catch (error) {
        res.status(500).json({ message: "Error fetching Q&A" });
      }
    });

    // POST: Submit a new question
    app.post("/QandA/:productId", async (req, res) => {
      try {
        const newQuestion = {
          productId: req.params.productId,
          question: req.body.question,
          answer: "", // Optional
          createdAt: new Date(),
        };
        const result = await QandACollection.insertOne(newQuestion);
        res.status(201).json({ ...newQuestion, _id: result.insertedId });
      } catch (error) {
        res.status(500).json({ message: "Error submitting question" });
      }
    });

    // PATCH: Answer a question
    app.patch("/QandA/:id", async (req, res) => {
      try {
        const { answer } = req.body;
        const result = await QandACollection.findOneAndUpdate(
          { _id: new ObjectId(req.params.id) },
          { $set: { answer } },
          { returnDocument: "after" }
        );
        res.json(result.value);
      } catch (error) {
        res.status(500).json({ message: "Error submitting answer" });
      }
    });

    app.get("/product/:id", async (req, res) => {
      const { id } = req.params;
      try {
        const product = await productCollection.findOne({
          _id: new ObjectId(id),
        });
        if (!product) {
          return res.status(404).send({ error: "Product not found" });
        }
        res.send(product);
      } catch (error) {
        console.error("Error fetching product:", error);
        res.status(500).send({ error: "Internal server error" });
      }
    });
    app.get("/reviews/:productId", async (req, res) => {
      const { productId } = req.params;
      const reviews = await reviewCollection.find({ productId }).toArray();
      res.send(reviews);
    });
    app.get("/reports/:productId", async (req, res) => {
      const { productId } = req.params;
      const report = await reportCollection.find({ productId }).toArray();
      res.send(report);
    });

    // Post a review
    app.post("/reviews", async (req, res) => {
      const review = req.body;
      const result = await reviewCollection.insertOne(review);
      res.send(result);
    });

    // Post a report
    app.post("/reports", async (req, res) => {
      const report = req.body;
      try {
        const result = await reportCollection.insertOne(report);
        res.status(201).send(result);
      } catch (error) {
        console.error("Error posting report:", error);
        res.status(500).send({ error: "Failed to post report" });
      }
    });

    app.post("/product/checkout", async (req, res) => {
      const { items, purchaser } = req.body;

      if (!items || !Array.isArray(items)) {
        return res.status(400).json({ message: "Invalid cart data" });
      }

      const { displayName, email, photoURL, timestamp } = purchaser;

      // Log the checkout data for testing
      console.log("✅ Checkout received:", {
        displayName,
        email,
        photoURL,
        timestamp,
        items,
      });

      // Optionally, you could save this data to a database, send an email, etc.
      // Example: Save to MongoDB

      const order = {
        purchaser,
        items,
        timestamp,
        status: "pending",
      };
      await orderCollection.insertOne(order);

      res.status(200).json({ message: "Checkout successful" });
    });
    app.get("/order", async (req, res) => {
      const result = await orderCollection.find().toArray();
      res.send(result);
    });
  } finally {
    // Optional: don't close the connection if running persistently
  }
}

run().catch(console.error);

app.get("/", (req, res) => {
  res.send("Welcome to the best choice server!");
});
app.listen(port, () => {
  console.log(
    `Explore Your Best Choice Server Running on: http://localhost:${port}`
  );
});
