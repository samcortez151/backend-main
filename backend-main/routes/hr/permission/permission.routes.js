const express = require("express");
const { getAllPermission, createPermission } = require("./permission.controllers");
const authorize = require("../../../utils/authorize"); // authentication middleware

const permissionRoutes = express.Router();

permissionRoutes.get("/", authorize("readAll-permission"), getAllPermission); 
permissionRoutes.post("/create", authorize("readAll-permission"), createPermission); 

module.exports = permissionRoutes;
