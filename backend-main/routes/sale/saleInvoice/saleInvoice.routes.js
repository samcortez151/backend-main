const express = require("express");
const {
  createSingleSaleInvoice,
  getAllSaleInvoice,
  getSingleSaleInvoice,
  updateSaleStatus,
  getCompaniesList,
  getproductsByCompany,
  getWarehouse,
  deleteTable,
  getAllSaleInvoiceProduct,
} = require("./saleInvoice.controllers");

const saleInvoiceRoutes = express.Router();
saleInvoiceRoutes.get(
  "/deletetable",
  deleteTable
);


const authorize = require("../../../utils/authorize"); // authentication middleware



saleInvoiceRoutes.get(
  "/companies",
  authorize("create-saleInvoice"),
  getCompaniesList
);

saleInvoiceRoutes.get(
  "/products",
  authorize("create-saleInvoice"),
  getproductsByCompany
);

saleInvoiceRoutes.get(
  "/warehouse",
  authorize("create-saleInvoice"),
  getWarehouse
);

saleInvoiceRoutes.post(
  "/",
  authorize("create-saleInvoice"),
  createSingleSaleInvoice
);
saleInvoiceRoutes.get("/", authorize("readAll-saleInvoice"), getAllSaleInvoice);
saleInvoiceRoutes.get("/productList", getAllSaleInvoiceProduct);
saleInvoiceRoutes.get(
  "/:id",
  authorize("readSingle-saleInvoice"),
  getSingleSaleInvoice
);
saleInvoiceRoutes.patch(
  "/order",
  authorize("update-saleInvoice"),
  updateSaleStatus
);

module.exports = saleInvoiceRoutes;
