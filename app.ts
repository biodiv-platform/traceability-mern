const express = require("express");
const createError = require("http-errors");
const morgan = require("morgan");
const cors = require("cors");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

require("dotenv").config();

const Product = require("./models/Product.model");
const LotInfo = require("./models/LotInfo.model");
const BatchInfo = require("./models/BatchInfo.model");
const ModalField = require("./models/ModalField.model");

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

// verify roles
const ROLES = {
  GI_ADMIN: "GI_ADMIN",
  INSPECTOR: "INSPECTOR",
  ICS_MANAGER: "ICS_MANAGER",
  UNAUTHORIZED: "ROLE_UNAUTHORIZED",
  AUTHORIZED: "AUTHORIZED",
  FARMER: "FARMER",
  COLLECTION_CENTER: "COLLECTION_CENTER_PERSON",
  COOPERATIVE: "COOPERATIVE_PERSON",
  FACTORY: "FACTORY_PERSON",
  UNION: "UNION_PERSON",
  ADMIN: "ROLE_ADMIN",
};

const verifyRoles = (roles, ROLE) => {
  console.log(ROLE);
  if (roles.includes(`${ROLES}.${ROLE}`)) {
    return true;
  }
  return false;
};

const isRoleAdmin = (roles) => {
  if (roles.includes(ROLES.ADMIN)) {
    return true;
  }
  return false;
};

// JWT verifications
const authorization = (ROLE) => {
  return (req, res, next) => {
    const { authorization } = req.headers;
    if (!authorization) {
      return res.sendStatus(403);
    }
    const token = authorization.split(" ")[1];
    try {
      const data = jwt.verify(token, process.env.JWT_SECRET);
      const roles = data.roles;

      // if role is admin then allow access to all routes
      if (isRoleAdmin(roles)) {
        return next();
      }

      // if role is not admin then check for permitted role
      if (!verifyRoles(roles, ROLE)) {
        return res.sendStatus(403);
      }
      return next();
    } catch {
      return res.sendStatus(403);
    }
  };
};

// Routes

app.get("/", authorization("UNION"), async (req, res, next) => {
  res.send({ message: "Awesome it works 🐻" });
});

app.get("/test", async (req, res, next) => {
  res.send({ message: "Awesome test works 🐻" });
});

// lotApi routes
app.use("/:productId/lot", require("./routes/lotApi.route"));

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

app.get("/batchinfo", async (req, res, next) => {
  try {
    const batchInfo = await BatchInfo.find();
    res.status(200).json(batchInfo);
  } catch (err) {
    next(err);
  }
});

app.get("/:productId/batchinfo", async (req, res, next) => {
  try {
    const { productId } = req.params;
    const batchInfo = await BatchInfo.find({ product: productId });
    res.status(200).json(batchInfo);
  } catch (err) {
    next(err);
  }
});

app.post("/batchinfo", async (req, res, next) => {
  try {
    const {
      product,
      batchNumber,
      batchName,
      initialQuantity,
      batchColumnValues,
    } = req.body;

    const batchInfo = new BatchInfo({
      product,
      batchNumber,
      batchName,
      initialQuantity,
      batchColumnValues,
    });

    const createdBatchInfo = await batchInfo.save();
    res.status(201).json(createdBatchInfo);
  } catch (err) {
    next(err);
  }
});

app.get("/lotinfo", authorization, async (req, res, next) => {
  try {
    const lotInfo = await LotInfo.find();
    res.status(200).json(lotInfo);
  } catch (err) {
    next(err);
  }
});

app.get("/:productId/lotinfo", async (req, res, next) => {
  try {
    const { productId } = req.params;
    const lotInfo = await LotInfo.find({
      product: productId,
      lotStatus: { $exists: true },
    });
    res.status(200).json(lotInfo);
  } catch (err) {
    next(err);
  }
});

app.post("/lotinfo", async (req, res, next) => {
  try {
    console.log(req.body);

    const { lotName, type, coCode, quantity, createdOn, batchIds } = req.body;

    // TODO: remove static product ID below and add a code to get dynamic product ID.

    const lotInfo = new LotInfo({
      product: "645774053e1875e3bd793978",
      lotName,
      type,
      coCode,
      quantity,
      createdOn: Date.now(),
      batchIds,
    });

    const createdLotInfo = await lotInfo.save();
    res.status(201).json(createdLotInfo);
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

app.get("/modalFields", async (req, res, next) => {
  try {
    const modalFields = await ModalField.find();
    res.status(200).json(modalFields);
  } catch (err) {
    next(err);
  }
});

app.get("/:productId/modalFields/:columnName", async (req, res, next) => {
  try {
    const { productId, columnName } = req.params;
    console.log(productId, columnName);
    const modalFields = await ModalField.find({
      product: productId,
      columnName: columnName,
    });
    res.status(200).json(modalFields);
  } catch (err) {
    next(err);
  }
});

app.post("/modalFields", async (req, res, next) => {
  try {
    const { product, columnName, fields, isSaved } = req.body;

    const modalField = new ModalField({
      product,
      columnName,
      fields,
      isSaved,
    });

    const createdModalField = await modalField.save();
    res.status(201).json(createdModalField);
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
