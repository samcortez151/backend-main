const express = require("express");
const authorize = require("../../utils/authorize");
const { deleteSingleWarehouse, updateSingleWarehouse, getSingleWarehouse, getAllWarehouse, createWarehouse, getWarehouseProducts } = require("./warehouse.controller");

const warehouseRoutes = express.Router();

warehouseRoutes.post(
  "/",
  authorize("create-warehouse"),
  createWarehouse
);
warehouseRoutes.get(
  "/",
  authorize("readAll-warehouse"),
  getAllWarehouse
);
warehouseRoutes.get(
  "/:id",
  authorize("readSingle-warehouse"),
  getSingleWarehouse
);
warehouseRoutes.get(
  "/products/:id",
  getWarehouseProducts
);
warehouseRoutes.put(
  "/:id",
  authorize("update-warehouse"),
  updateSingleWarehouse
);
warehouseRoutes.delete(
  "/:id",
  authorize("delete-warehouse"),
  deleteSingleWarehouse
);

module.exports = warehouseRoutes;
