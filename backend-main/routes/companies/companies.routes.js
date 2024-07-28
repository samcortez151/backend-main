const express = require("express");
const { createSingleCompany, getAllCompanies, getSingleCompanies, updateSingleCompanies, deleteSingleCompanies } = require("./companies.controllers");
const authorize = require("../../utils/authorize");

const companiesRoutes = express.Router();

companiesRoutes.post(
  "/",
  authorize("create-companies"),
  createSingleCompany
);
companiesRoutes.get(
  "/",
  authorize("readAll-companies"),
  getAllCompanies
);
companiesRoutes.get(
  "/:id",
  authorize("readSingle-companies"),
  getSingleCompanies
);
companiesRoutes.put(
  "/:id",
  authorize("update-companies"),
  updateSingleCompanies
);
companiesRoutes.delete(
  "/:id",
  authorize("delete-companies"),
  deleteSingleCompanies
);

module.exports = companiesRoutes;
