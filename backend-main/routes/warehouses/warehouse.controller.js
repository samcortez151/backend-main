
const { getObjectSignedUrl } = require("../../utils/s3");
const prisma = require("../../utils/prisma");
const { getPagination } = require("../../utils/query");

BigInt.prototype.toJSON = function () {
  const int = Number.parseInt(this.toString());
  return int ?? this.toString();
};

const createWarehouse = async (req, res) => {
  try {
    // create single warehouse from an object
    const createCompany = await prisma.warehouse.create({
      data: {
        name: req.body.name,
        location: req.body.location
      },
    });
    return res.status(201).json(createCompany);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getAllWarehouse = async (req, res) => {
  if (req.query.query === "all") {
    try {
      // get all product_brand
      const getAllWarehouses = await prisma.warehouse.findMany({
        orderBy: {
          id: "asc",
        }
      });
      return res.status(200).json(getAllWarehouses);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  } else if (req.query.query === "search") {
    try {
      const allwarehouse = await prisma.warehouse.findMany({
        where: {
          OR: [
            {
              name: {
                contains: req.query.key,
                mode: "insensitive",
              },
            },
          ],
        },
        orderBy: {
          id: "desc",
        }
      });
      return res.status(200).json(allwarehouse);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }
  else {
    const { skip, limit } = getPagination(req.query);
    try {
      // get all product_brand paginated
      const getAllWarehouses = await prisma.warehouse.findMany({
        orderBy: {
          id: "asc",
        },
        skip: parseInt(skip),
        take: parseInt(limit),
      });

      const aggregations = await prisma.warehouse.aggregate({
        _count: {
          id: true,
        },
        // where: {
        //   status: false,
        // },
      });
      return res.status(200).json({ getAllWarehouses, totalCompanies: aggregations._count.id });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }
};

const getSingleWarehouse = async (req, res) => {
  try {
    const singleWarehouse = await prisma.warehouse.findUnique({
      where: {
        id: parseInt(req.params.id),
      }
    });
    //adding image url to product_brand
    // if (singleCompanies.logo) {
    //   singleCompanies.logo = await getObjectSignedUrl(singleCompanies.logo);
    // }
    // }

    const { skip, limit } = getPagination(req.query);
    // const allProduct = await prisma.inventory.findMany({
    //   orderBy: {
    //     id: "desc",
    //   },
    //   where: {
    //     status: true,
    //   },
    //   skip: Number(skip),
    //   take: Number(limit),
    // });
    // attach signed url to each product
    // await Promise.all(
    //   allProduct.map(async (product) => {
    //     if (product.thumbnailImage) {
    //       product.thumbnailImageUrl = `${HOST}:${PORT}/product-image/${product.thumbnailImage}`;
    //     }
    //   })
    // );

    const aggregations = await prisma.inventory.groupBy({
      by: ['productId'],
      where: { warehouseId: parseInt(req.params.id) },
      _sum: { productQuantity: true },
    });

    const inventoryProduct = [];
    for (let item of aggregations) {
      const product = await prisma.product.findUnique({ where: { id: item.productId }, select: { name: true } });
      inventoryProduct.push({ name: product.name, productId: item.productId, productQuantity: item._sum.productQuantity });
    }
    return res.status(200).json({ singleWarehouse, inventoryProduct });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getWarehouseProducts = async (req, res) => {
  try {
    const aggregations = await prisma.inventory.groupBy({
      by: ['productId'],
      where: { warehouseId: parseInt(req.params.id) },

      _sum: { productQuantity: true },
    });

    const inventoryProduct = [];
    for (let item of aggregations) {
      const product = await prisma.product.findUnique({ where: { id: item.productId }, select: { name: true } });
      if (req.query.search) {
        const regex = new RegExp(req.query.search, "i");
        if (regex.test([product.name]))
        {
          inventoryProduct.push({ name: product.name, productId: item.productId, productQuantity: item._sum.productQuantity });
        }
      }
      else
      {
      inventoryProduct.push({ name: product.name, productId: item.productId, productQuantity: item._sum.productQuantity });
      }
    }

    return res.status(200).json({ inventoryProduct })
  }
  catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

const updateSingleWarehouse = async (req, res) => {
  try {
    const updatedWarehouse = await prisma.warehouse.update({
      where: {
        id: parseInt(req.params.id),
      },
      data: req.body
    });
    return res.status(200).json(updatedWarehouse);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const deleteSingleWarehouse = async (req, res) => {
  try {
    const deletedWarehouse = await prisma.warehouse.delete({
      where: {
        id: parseInt(req.params.id),
      }
    });
    return res.status(200).json(deletedWarehouse);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createWarehouse,
  getAllWarehouse,
  getSingleWarehouse,
  updateSingleWarehouse,
  deleteSingleWarehouse,
  getWarehouseProducts
};
