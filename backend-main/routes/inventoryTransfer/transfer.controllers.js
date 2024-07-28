const { getPagination } = require("../../utils/query");
const prisma = require("../../utils/prisma");
const { Braket } = require("aws-sdk");

const createInventoryTransfer = async (req, res) => {
  // calculate total purchase price

  try {

    const getInventory = await prisma.inventory.findMany({ where: { companyId: Number(req.body.fromCompanyId), productId: Number(req.body.productId) } });


    const totalCurrentQty = getInventory.reduce((acum, cur) => {
      return acum + cur.productQuantity
    }, 0);
    if (totalCurrentQty < Number(req.body.productQuantity)) {
      return res.status(400).json({ message: "Please enter less or equal quantity in the Inventory" })
    }

    let transferQty = Number(req.body.productQuantity);

    const warehouseData = [];

    for (let item of getInventory) {
      if (transferQty == 0) {
        break;
      }
      if (transferQty <= item.productQuantity) {
        await prisma.inventory.update({
          where: { id: item.id },
          data: {
            productQuantity: { decrement: transferQty }
          }
        });

        warehouseData.push({ warehouseId: item.warehouseId, productQuantity: transferQty })
      }
      else {
        await prisma.inventory.update({
          where: { id: item.id },
          data: {
            productQuantity: 0
          }
        })

        warehouseData.push({ warehouseId: item.warehouseId, productQuantity: item.productQuantity })

        transferQty = transferQty - item.productQuantity;
      }
    }

    for (let item of warehouseData) {
      const check = await prisma.inventory.findMany({ where: { companyId: Number(req.body.toCompanyId), productId: Number(req.body.productId), warehouseId: item.warehouseId } })

      if (check.length > 0) {
        await prisma.inventory.update({
          where: { id: check[0].id },
          data: {
            productQuantity: {
              increment: Number(item.productQuantity),
            },
          }
        })
      }
      else {
        await prisma.inventory.create({
          data: {
            productQuantity: Number(item.productQuantity),
            product: {
              connect: {
                id: Number(req.body.productId)
              }
            },
            company: {
              connect: {
                id: Number(req.body.toCompanyId),
              },
            },
            warehouse: {
              connect: {
                id: Number(item.warehouseId),
              },
            },
          }
        })
      }
    }

    const createTransferInventory = await prisma.transferInventory.create({
      data: {
        fromCompanyId: req.body.fromCompanyId,
        toCompanyId: req.body.toCompanyId,
        productQuantity: req.body.productQuantity,
        doneBy: req.body.doneBy,
        productId: req.body.productId
      }
    })

    return res.status(200).json({ message: "Inventory transfered successfully", createInventoryTransfer });
  }
  catch (err) {
    return res.status(500).json(err.message)
  }

}

const getAllInvertoryTransfer = async (req, res) => {
  if (req.query.query === "all") {
    try {
      const allTranserInvetory = await prisma.transferInventory.findMany({
        orderBy: {
          id: "desc",
        },
        include: {
          user: {
            select: {
              username: true,
            },
          },
          fromCompany: {
            select: {
              name: true,
            },
          },
          toCompany: {
            select: {
              name: true,
            },
          },
          product: {
            select: {
              name: true,
            },
          },
        },
      });
      // attach signed url to each product

      return res.status(200).json(allTranserInvetory);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  } else if (req.query.query === "info") {
    try {
      const aggregations = await prisma.transferInventory.aggregate({
        _count: {
          id: true,
        }
      });
      return res.status(200).json(aggregations);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  } else if (req.query.query === "search") {
    try {
      const getTransferInventory = await prisma.transferInventory.findMany({
        orderBy: {
          id: "desc",
        },
        include: {
          user: {
            select: {
              username: true,
            },
          },
          fromCompany: {
            select: {
              name: true,
            },
          },
          toCompany: {
            select: {
              name: true,
            },
          },
          product: {
            select: {
              name: true,
            },
          },
        },
        where: {
          OR: [
            {
              user: {
                username: {
                  contains: req.query.key,
                  mode: "insensitive",
                },
              }
            },
            {
              toCompany: {
                name: {
                  contains: req.query.key,
                  mode: "insensitive",
                },
              }
            },
            {
              fromCompany: {
                name: {
                  contains: req.query.key,
                  mode: "insensitive",
                },
              }
            },
            {
              product: {
                name: {
                  contains: req.query.key,
                  mode: "insensitive",
                },
              }
            }
          ],
        },

      });

      return res.status(200).json(getTransferInventory);
    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: error.message });
    }
  } else {
    const { skip, limit } = getPagination(req.query);
    try {
      if (req.query.user) {
       var filter = { doneBy : Number(req.query.user)}
      }
      else if(req.query.toCompany)
      {
        var filter = { toCompanyId : Number(req.query.toCompany)}
      }
      else if(req.query.fromCompany)
      {
        var filter = { fromCompanyId : Number(req.query.fromCompany)}
      }
      else
      {
        var filter = {} 
      }
      const paginatedTranserInvetory = await prisma.transferInventory.findMany({
        orderBy: {
          id: "desc",
        },
        where: filter,
        include: {
          user: {
            select: {
              username: true,
            },
          },
          fromCompany: {
            select: {
              name: true,
            },
          },
          toCompany: {
            select: {
              name: true,
            },
          },
          product: {
            select: {
              name: true,
            },
          },
        },
        skip: Number(skip),
        take: Number(limit),
      });

      const aggregations = await prisma.transferInventory.aggregate({
        _count: {
          id: true,
        },
      });
      return res.status(200).json({
        paginatedTranserInvetory,
        total: aggregations._count.id,
      });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }
}

module.exports = {
  createInventoryTransfer,
  getAllInvertoryTransfer
};