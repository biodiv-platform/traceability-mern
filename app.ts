const express = require("express");
const createError = require("http-errors");
const morgan = require("morgan");
const cors = require("cors");
const mongoose = require("mongoose");

require("dotenv").config();

const Product = require("./models/Product.model");
const LotInfo = require("./models/LotInfo.model");

import { authorization } from "./services/authorizationService";

const app = express();

// connect to mongodb
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB Connected..."))
  .catch((err) => console.log(err));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(morgan("dev"));
app.use(cors());

// Routes

app.get("/", authorization("UNION"), async (req, res, next) => {
  res.send({ message: "Awesome it works 🐻" });
});

app.get("/test", async (req, res, next) => {
  console.log(req.locals);
  res.send({ message: "Awesome test works 🐻" });
});

// lotApi routes
app.use("/v1/:productId/lot", require("./routes/lotApi.route"));

// batchApi routes
app.use("/v1/:productId/batch", require("./routes/batchApi.route"));

// farmerApi routes
app.use("/v1/:productId/farmer", require("./routes/farmerApi.route"));

// modalFields routes
app.use("/v1/:productId/modalFields", require("./routes/modalFieldApi.route"));

app.get("/products", async (req, res, next) => {
  try {
    const products = await Product.find();
    res.status(200).json(products);
  } catch (err) {
    next(err);
  }
});

app.get("/products/:productId", async (req, res, next) => {
  try {
    const { productId } = req.params;
    const products = await Product.findById(productId);
    res.status(200).json(products);
  } catch (err) {
    next(err);
  }
});

app.post("/products", async (req, res, next) => {
  try {
    const { productName, description, columns } = req.body;

    const product = new Product({
      productName,
      description,
      columns,
    });

    const createdProduct = await product.save();
    res.status(201).json(createdProduct);
  } catch (err) {
    next(err);
  }
});

// update lot info
app.put("/:lotId/lotinfo", async (req, res, next) => {
  try {
    const { lotId } = req.params;
    const { lotColumnValues } = req.body;

    console.log(`lotId: ${lotId}`);
    console.log(`lotColumnValues: `);
    console.log(lotColumnValues);

    const updatedLotInfo = await LotInfo.findByIdAndUpdate(
      lotId,
      { lotColumnValues },
      { new: true }
    );
    res.status(200).json(updatedLotInfo);
  } catch (err) {
    next(err);
  }
});

app.use((req, res, next) => {
  next(createError.NotFound());
});

app.use((err, req, res, next) => {
  res.status(err.status || 500);
  res.send({
    status: err.status || 500,
    message: err.message,
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 @ http://localhost:${PORT}`));
