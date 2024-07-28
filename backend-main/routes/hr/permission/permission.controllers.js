const { getPagination } = require("../../../utils/query");
const prisma = require("../../../utils/prisma");


const createPermission = async (req, res) => {
    try {
      const {endpoint} = req.body

      const permissionTypes = ["create", "readAll","readSingle", "update", "delete"];

      const permissions = permissionTypes.map((type) => {
        return `${type}-${endpoint}`;
      });
      const addPermission = await prisma.permission.createMany({
        data: permissions.map((permission) => {
          return {
            name: permission,
          };
        }),
      });
      res.status(201).json(addPermission);
    } catch (error) {
      res.status(400).json(error.message);
      console.log(error.message);
    }
  };

const getAllPermission = async (req, res) => {
  if (req.query.query === "all") {
    const allRole = await prisma.permission.findMany({
      orderBy: [
        {
          id: "asc",
        },
      ],
    });
    res.json(allRole);
  } else {
    const { skip, limit } = getPagination(req.query);
    try {
      const allRole = await prisma.permission.findMany({
        orderBy: [
          {
            id: "asc",
          },
        ],
        skip: Number(skip),
        take: Number(limit),
      });
      res.json(allRole);
    } catch (error) {
      res.status(400).json(error.message);
      console.log(error.message);
    }
  }
};



module.exports = {
  getAllPermission,
  createPermission
};
