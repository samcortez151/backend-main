const express = require('express');
const inventoryTransferRoutes = express.Router();
const authorize = require("../../utils/authorize");
const { createInventoryTransfer, getAllInvertoryTransfer } = require('./transfer.controllers');

inventoryTransferRoutes.post('/',authorize("create-transfer"), createInventoryTransfer);
// inventoryTransferRoutes.get('/statement',authorize("readSingle-vat"), productVatDetails);
inventoryTransferRoutes.get("/",authorize("readAll-transfer"), getAllInvertoryTransfer);

module.exports = inventoryTransferRoutes;