const { getPagination } = require("../../../utils/query");
const prisma = require("../../../utils/prisma");
const { off } = require("../../../app");

const createSinglePurchaseInvoice = async (req, res) => {
  // calculate total purchase price
  let totalPurchasePrice = 0;
  req.body.purchaseInvoiceProduct.forEach((item) => {
    const productVat = parseInt(item.productVat) || 0;
    const productPriceWithQty = parseFloat(item.productPurchasePrice) * parseFloat(item.productQuantity);
    totalPurchasePrice += productPriceWithQty + ((productPriceWithQty * productVat) / 100);
  });

  try {
    // convert all incoming data to a specific format.
    const date = new Date(req.body.date).toISOString().split("T")[0];
    const productVat = await prisma.productVat.findMany({
      where: {
        id: { in: req.body.vatId },
      },
    });

    const totalVat = productVat.reduce((acc, crr) => acc + crr.percentage, 0);
    const due = (totalPurchasePrice + (totalPurchasePrice * totalVat) / 100 - parseFloat(req.body.discount) + parseFloat(req.body.transportCharge)) - parseFloat(req.body.paidAmount)
    // create purchase invoice
    const createdInvoice = await prisma.purchaseInvoice.create({
      data: {
        date: new Date(date),
        totalAmount: totalPurchasePrice + (totalPurchasePrice * totalVat) / 100 + parseFloat(req.body.transportCharge),
        discount: parseFloat(req.body.discount),
        ewayBill: req.body.ewayBill,
        invoiceNumber: req.body.invoiceNumber,
        transportCharge: parseInt(req.body.transportCharge),
        paidAmount: parseFloat(req.body.paidAmount),
        dueAmount: due,
        purchaseInvoiceVat: {
          create: req.body.vatId.map((item) => ({
            productVat: {
              connect: {
                id: Number(item)
              }
            },
          })),
        },
        supplier: {
          connect: {
            id: Number(req.body.supplierId),
          },
        },
        company: {
          connect: {
            id: Number(req.body.companyId),
          },
        },
        warehouse: {
          connect: {
            id: Number(req.body.warehouseId),
          },
        },
        note: req.body.note,
        // map and save all products from request body array of products to database
        purchaseInvoiceProduct: {
          create: req.body.purchaseInvoiceProduct.map((product) => ({
            product: {
              connect: {
                id: Number(product.productId),
              },
            },
            productQuantity: Number(product.productQuantity),
            productPurchasePrice: parseFloat(product.productPurchasePrice),
          })),
        },
      },
    });
    // pay on purchase transaction create
    if (req.body.paidAmount > 0) {
      await prisma.transaction.create({
        data: {
          date: new Date(date),
          debitId: 3,
          creditId: 5,
          remark: req.body.remark,
          mode: req.body.mode,
          amount: parseFloat(req.body.paidAmount),
          particulars: `Cash paid on Purchase Invoice #${createdInvoice.id}`,
          type: "purchase",
          relatedId: createdInvoice.id,
        },
      });
    }
    // if purchase on due then create another transaction
    const dueAmount = due;
    if (dueAmount > 0) {
      await prisma.transaction.create({
        data: {
          date: new Date(date),
          debitId: 3,
          creditId: 5,
          remark: req.body.remark,
          mode: req.body.mode,
          amount: dueAmount,
          particulars: `Due on Purchase Invoice #${createdInvoice.id}`,
          type: "purchase",
          relatedId: createdInvoice.id,
        },
      });
    }
    // iterate through all products of this purchase invoice and add product quantity, update product purchase price to database
    for (const item of req.body.purchaseInvoiceProduct) {
      await prisma.product.update({
        where: {
          id: Number(item.productId),
        },
        data: {
          productQuantity: {
            increment: Number(item.productQuantity),
          },
          productPurchasePrice: {
            set: parseFloat(item.productPurchasePrice),
          },
        },
      });

      const check = await prisma.inventory.findMany({ where: { companyId: Number(req.body.companyId), warehouseId: Number(req.body.warehouseId), productId: Number(item.productId) } })
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
                id: Number(item.productId)
              }
            },
            company: {
              connect: {
                id: Number(req.body.companyId),
              },
            },
            warehouse: {
              connect: {
                id: Number(req.body.warehouseId),
              },
            },
          }
        })
      }
      // await prisma.inventory.upsert({
      //   where: { companyId: Number(req.body.companyId), warehouseId: Number(req.body.warehouseId), productId: Number(item.productId), },
      //   update: {
      //     data: {
      //       productQuantity: {
      //         increment: Number(item.productQuantity),
      //       },
      //     }
      //   },
      //   create: {
      //     data: {
      //       productQuantity: Number(item.productQuantity),
      //       // productId: Number(item.productId),
      //       // warehouseId: Number(req.body.warehouseId),
      //       // companyId: Number(req.body.companyId)
      //       product: {
      //         connect: {
      //           id: Number(item.productId)
      //         }
      //       },
      //       company: {
      //         connect: {
      //           id: Number(req.body.companyId),
      //         },
      //       },
      //       warehouse: {
      //         connect: {
      //           id: Number(req.body.warehouseId),
      //         },
      //       },
      //     }
      //   },
      // });

    }

    const singlePurchaseInvoice = await prisma.purchaseInvoice.findUnique({
      where: {
        id: Number(createdInvoice.id),
      },
      include: {
        purchaseInvoiceProduct: {
          include: {
            product: true,
          },
        },
        supplier: true,
        company: true,
        warehouse: true,
        purchaseInvoiceVat: {
          include: {
            productVat: true
          }
        },
      },
    });
    return res.status(201).json({
      createdInvoice: singlePurchaseInvoice,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getAllPurchaseInvoice = async (req, res) => {
  if (req.query.query === "info") {
    // get purchase invoice info
    const aggregations = await prisma.purchaseInvoice.aggregate({
      _count: {
        id: true,
      },
      _sum: {
        totalAmount: true,
        dueAmount: true,
        paidAmount: true,
      },
    });
    return res.status(200).json(aggregations);
  } else if (req.query.query === "search") {
    try {
      const allPurchase = await prisma.purchaseInvoice.findMany({
        include: {
          supplier: {
            select: {
              name: true,
            },
          },
          company: {
            select: {
              name: true,
            },
          },
          warehouse: {
            select: {
              name: true,
            },
          },
          purchaseInvoiceVat: {
            include: {
              productVat: true
            }
          },
          purchaseInvoiceProduct: {
            include: {
              product: true
            }
          },
        },
        where: {
          OR: [
            {
              supplier: {
                name: {
                  contains: req.query.purchase,
                  mode: "insensitive",
                },
              }
            },
            {
              company: {
                name: {
                  contains: req.query.purchase,
                  mode: "insensitive",
                },
              }
            },
            {
              warehouse: {
                name: {
                  contains: req.query.purchase,
                  mode: "insensitive",
                },
              }
            },
          ],
        },
        orderBy: {
          id: "desc",
        },
        // include: {
        //   purchaseInvoiceProduct: true,
        // },
      });

      return res.status(200).json(allPurchase);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  } else if (req.query.query === "all") {
    try {
      // get purchase invoice with pagination and info
      const [aggregations, purchaseInvoices] = await prisma.$transaction([
        // get info of selected parameter data
        prisma.purchaseInvoice.aggregate({
          _count: {
            id: true,
          },
          _sum: {
            totalAmount: true,
            discount: true,
            dueAmount: true,
            paidAmount: true,
          },
          where: {
            date: {
              gte: new Date(req.query.startdate),
              lte: new Date(req.query.enddate),
            },
          },
        }),
        // get purchaseInvoice paginated and by start and end date
        prisma.purchaseInvoice.findMany({
          orderBy: [
            {
              id: "desc",
            },
          ],
          include: {
            supplier: {
              select: {
                name: true,
              },
            },
            company: {
              select: {
                name: true,
              },
            },
            warehouse: {
              select: {
                name: true,
              },
            },
            purchaseInvoiceVat: {
              include: {
                productVat: true
              }
            },
            purchaseInvoiceProduct: {
              include: {
                product: true
              }
            },
          },
          where: {
            date: {
              gte: new Date(req.query.startdate),
              lte: new Date(req.query.enddate),
            },
          },
        }),
      ]);
      // modify data to actual data of purchase invoice's current value by adjusting with transactions and returns
      // get all transactions related to purchase invoice
      const transactions = await prisma.transaction.findMany({
        where: {
          type: "purchase",
          relatedId: {
            in: purchaseInvoices.map((item) => item.id),
          },
          OR: [
            {
              creditId: 1,
            },
            {
              creditId: 2,
            },
          ],
        },
      });
      // get all transactions related to purchase returns invoice
      const transactions2 = await prisma.transaction.findMany({
        where: {
          type: "purchase_return",
          relatedId: {
            in: purchaseInvoices.map((item) => item.id),
          },
          OR: [
            {
              debitId: 1,
            },
            {
              debitId: 2,
            },
          ],
        },
      });
      // calculate the discount earned amount at the time of make the payment
      const transactions3 = await prisma.transaction.findMany({
        where: {
          type: "purchase",
          relatedId: {
            in: purchaseInvoices.map((item) => item.id),
          },
          creditId: 13,
        },
        include: {
          debit: {
            select: {
              name: true,
            },
          },
          credit: {
            select: {
              name: true,
            },
          },
        },
      });
      const returnPurchaseInvoice = await prisma.returnPurchaseInvoice.findMany(
        {
          where: {
            purchaseInvoiceId: {
              in: purchaseInvoices.map((item) => item.id),
            },
          },
        }
      );
      // calculate paid amount and due amount of individual purchase invoice from transactions and returnPurchaseInvoice and attach it to purchaseInvoices
      const allPurchaseInvoice = purchaseInvoices.map((item) => {
        const paidAmount = transactions
          .filter((transaction) => transaction.relatedId === item.id)
          .reduce((acc, curr) => acc + curr.amount, 0);
        const paidAmountReturn = transactions2
          .filter((transaction) => transaction.relatedId === item.id)
          .reduce((acc, curr) => acc + curr.amount, 0);
        const discountEarned = transactions3
          .filter((transaction) => transaction.relatedId === item.id)
          .reduce((acc, curr) => acc + curr.amount, 0);
        const returnAmount = returnPurchaseInvoice
          .filter(
            (returnPurchaseInvoice) =>
              returnPurchaseInvoice.purchaseInvoiceId === item.id
          )
          .reduce((acc, curr) => acc + curr.totalAmount, 0);
        return {
          ...item,
          paidAmount: paidAmount,
          discount: item.discount + discountEarned,
          dueAmount:
            item.totalAmount -
            item.discount -
            paidAmount -
            returnAmount +
            paidAmountReturn -
            discountEarned,
        };
      });
      // calculate total paid_amount and due_amount from allPurchaseInvoice and attach it to aggregations
      const totalPaidAmount = allPurchaseInvoice.reduce(
        (acc, curr) => acc + curr.paidAmount,
        0
      );
      const totalDueAmount = allPurchaseInvoice.reduce(
        (acc, curr) => acc + curr.dueAmount,
        0
      );
      const totalDiscountGiven = allPurchaseInvoice.reduce(
        (acc, curr) => acc + curr.discount,
        0
      );
      aggregations._sum.paidAmount = totalPaidAmount;
      aggregations._sum.dueAmount = totalDueAmount;
      aggregations._sum.discount = totalDiscountGiven;
      return res.status(200).json({
        aggregations,
        allPurchaseInvoice,
      });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }
  else {
    const { skip, limit } = getPagination(req.query);
    try {
      // get purchase invoice with pagination and info
      const [aggregations, purchaseInvoices] = await prisma.$transaction([
        // get info of selected parameter data
        prisma.purchaseInvoice.aggregate({
          _count: {
            id: true,
          },
          _sum: {
            totalAmount: true,
            discount: true,
            dueAmount: true,
            paidAmount: true,
          },
          where: {
            date: {
              gte: new Date(req.query.startdate),
              lte: new Date(req.query.enddate),
            },
          },
        }),
        // get purchaseInvoice paginated and by start and end date
        prisma.purchaseInvoice.findMany({
          orderBy: [
            {
              id: "desc",
            },
          ],
          skip: Number(skip),
          take: Number(limit),
          include: {
            supplier: {
              select: {
                name: true,
              },
            },
            company: {
              select: {
                name: true,
              },
            },
            warehouse: {
              select: {
                name: true,
              },
            },
            purchaseInvoiceVat: {
              include: {
                productVat: true
              }
            },
            purchaseInvoiceProduct: {
              include: {
                product: true
              }
            },
          },
          where: {
            date: {
              gte: new Date(req.query.startdate),
              lte: new Date(req.query.enddate),
            },
          },
        }),
      ]);
      // modify data to actual data of purchase invoice's current value by adjusting with transactions and returns
      // get all transactions related to purchase invoice
      const transactions = await prisma.transaction.findMany({
        where: {
          type: "purchase",
          relatedId: {
            in: purchaseInvoices.map((item) => item.id),
          },
          OR: [
            {
              creditId: 1,
            },
            {
              creditId: 2,
            },
          ],
        },
      });
      // get all transactions related to purchase returns invoice
      const transactions2 = await prisma.transaction.findMany({
        where: {
          type: "purchase_return",
          relatedId: {
            in: purchaseInvoices.map((item) => item.id),
          },
          OR: [
            {
              debitId: 1,
            },
            {
              debitId: 2,
            },
          ],
        },
      });
      // calculate the discount earned amount at the time of make the payment
      const transactions3 = await prisma.transaction.findMany({
        where: {
          type: "purchase",
          relatedId: {
            in: purchaseInvoices.map((item) => item.id),
          },
          creditId: 13,
        },
        include: {
          debit: {
            select: {
              name: true,
            },
          },
          credit: {
            select: {
              name: true,
            },
          },
        },
      });
      const returnPurchaseInvoice = await prisma.returnPurchaseInvoice.findMany(
        {
          where: {
            purchaseInvoiceId: {
              in: purchaseInvoices.map((item) => item.id),
            },
          },
        }
      );
      // calculate paid amount and due amount of individual purchase invoice from transactions and returnPurchaseInvoice and attach it to purchaseInvoices
      const allPurchaseInvoice = purchaseInvoices.map((item) => {
        const paidAmount = transactions
          .filter((transaction) => transaction.relatedId === item.id)
          .reduce((acc, curr) => acc + curr.amount, 0);
        const paidAmountReturn = transactions2
          .filter((transaction) => transaction.relatedId === item.id)
          .reduce((acc, curr) => acc + curr.amount, 0);
        const discountEarned = transactions3
          .filter((transaction) => transaction.relatedId === item.id)
          .reduce((acc, curr) => acc + curr.amount, 0);
        const returnAmount = returnPurchaseInvoice
          .filter(
            (returnPurchaseInvoice) =>
              returnPurchaseInvoice.purchaseInvoiceId === item.id
          )
          .reduce((acc, curr) => acc + curr.totalAmount, 0);
        return {
          ...item,
          paidAmount: paidAmount,
          discount: item.discount + discountEarned,
          dueAmount:
            item.totalAmount -
            item.discount -
            paidAmount -
            returnAmount +
            paidAmountReturn -
            discountEarned,
        };
      });
      // calculate total paid_amount and due_amount from allPurchaseInvoice and attach it to aggregations
      const totalPaidAmount = allPurchaseInvoice.reduce(
        (acc, curr) => acc + curr.paidAmount,
        0
      );
      const totalDueAmount = allPurchaseInvoice.reduce(
        (acc, curr) => acc + curr.dueAmount,
        0
      );
      const totalDiscountGiven = allPurchaseInvoice.reduce(
        (acc, curr) => acc + curr.discount,
        0
      );
      aggregations._sum.paidAmount = totalPaidAmount;
      aggregations._sum.dueAmount = totalDueAmount;
      aggregations._sum.discount = totalDiscountGiven;
      return res.status(200).json({
        aggregations,
        allPurchaseInvoice,
      });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }
};


const getAllPurchaseInvoiceProduct = async (req, res) => {
  if (req.query.query === "search") {
    try {
      const allPurchaseProduct = await prisma.purchaseInvoiceProduct.findMany({
        orderBy: [
          {
            id: "desc",
          },
        ],
        include: {
          invoice: {
            include: {
              supplier: {
                select: {
                  name: true,
                },
              },
              company: {
                select: {
                  name: true,
                },
              },
              warehouse: {
                select: {
                  name: true,
                },
              },
              purchaseInvoiceVat: {
                include: {
                  productVat: true
                }
              },
            }
          },
          product: true
        },
        where: {
          OR: [
            {
              invoice: {
                supplier: {
                  name: {
                    contains: req.query.purchase,
                    mode: "insensitive",
                  },
                }
              }
            },
            {
              invoice: {
                company: {
                  name: {
                    contains: req.query.purchase,
                    mode: "insensitive",
                  },
                }
              }
            },
            {
              invoice: {
                warehouse: {
                  name: {
                    contains: req.query.purchase,
                    mode: "insensitive",
                  },
                }
              }
            },
            {
              product: {
                name: {
                  contains: req.query.purchase,
                  mode: "insensitive",
                },
              }
            },
          ],
        }
      })
      return res.status(200).json(allPurchaseProduct);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  } 
  else if (req.query.query === "all")
  {
    try {
      // get purchase invoice with pagination and info
      const [aggregations, purchaseInvoicesProducts] = await prisma.$transaction([
        // get info of selected parameter data
        prisma.purchaseInvoiceProduct.aggregate({
          _count: {
            id: true,
          },
          where: {
            createdAt: {
              gte: new Date(req.query.startdate),
              lte: new Date(req.query.enddate),
            },
          },
        }),
        // get purchaseInvoice paginated and by start and end date
        prisma.purchaseInvoiceProduct.findMany({
          orderBy: [
            {
              id: "desc",
            },
          ],
          include: {
            invoice: {
              include: {
                supplier: {
                  select: {
                    name: true,
                  },
                },
                company: {
                  select: {
                    name: true,
                  },
                },
                warehouse: {
                  select: {
                    name: true,
                  },
                },
                purchaseInvoiceVat: {
                  include: {
                    productVat: true
                  }
                },
              }
            },
            product: true
          },
          where: {
            createdAt: {
              gte: new Date(req.query.startdate),
              lte: new Date(req.query.enddate),
            },
          },
        }),
      ]);
      return res.status(200).json({
        aggregations,
        purchaseInvoicesProducts
        // allPurchaseInvoice,
      });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }
  else {
    const { skip, limit } = getPagination(req.query);
    try {
      // get purchase invoice with pagination and info
      const [aggregations, purchaseInvoicesProducts] = await prisma.$transaction([
        // get info of selected parameter data
        prisma.purchaseInvoiceProduct.aggregate({
          _count: {
            id: true,
          },
          where: {
            createdAt: {
              gte: new Date(req.query.startdate),
              lte: new Date(req.query.enddate),
            },
          },
        }),
        // get purchaseInvoice paginated and by start and end date
        prisma.purchaseInvoiceProduct.findMany({
          orderBy: [
            {
              id: "desc",
            },
          ],
          skip: Number(skip),
          take: Number(limit),
          include: {
            invoice: {
              include: {
                supplier: {
                  select: {
                    name: true,
                  },
                },
                company: {
                  select: {
                    name: true,
                  },
                },
                warehouse: {
                  select: {
                    name: true,
                  },
                },
                purchaseInvoiceVat: {
                  include: {
                    productVat: true
                  }
                },
              }
            },
            product: true
          },
          where: {
            createdAt: {
              gte: new Date(req.query.startdate),
              lte: new Date(req.query.enddate),
            },
          },
        }),
      ]);
      return res.status(200).json({
        aggregations,
        purchaseInvoicesProducts
        // allPurchaseInvoice,
      });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }
};

const getSinglePurchaseInvoice = async (req, res) => {
  try {
    // get single purchase invoice information with products
    const singlePurchaseInvoice = await prisma.purchaseInvoice.findUnique({
      where: {
        id: Number(req.params.id),
      },
      include: {
        purchaseInvoiceProduct: {
          include: {
            product: true,
          },
        },
        supplier: true,
        company: true,
        warehouse: true,
        purchaseInvoiceVat: {
          include: {
            productVat: true
          }
        },
      },
    });
    // get all transactions related to this purchase invoice
    const transactions = await prisma.transaction.findMany({
      where: {
        relatedId: Number(req.params.id),
        OR: [
          {
            type: "purchase",
          },
          {
            type: "purchase_return",
          },
        ],
      },
      include: {
        debit: {
          select: {
            name: true,
          },
        },
        credit: {
          select: {
            name: true,
          },
        },
      },
    });
    // transactions of the paid amount
    const transactions2 = await prisma.transaction.findMany({
      where: {
        type: "purchase",
        relatedId: Number(req.params.id),
        OR: [
          {
            creditId: 1,
          },
          {
            creditId: 2,
          },
        ],
      },
    });
    // transactions of the discount earned amount
    const transactions3 = await prisma.transaction.findMany({
      where: {
        type: "purchase",
        relatedId: Number(req.params.id),
        creditId: 13,
      },
    });
    // transactions of the return purchase invoice's amount
    const transactions4 = await prisma.transaction.findMany({
      where: {
        type: "purchase_return",
        relatedId: Number(req.params.id),
        OR: [
          {
            debitId: 1,
          },
          {
            debitId: 2,
          },
        ],
      },
    });
    // get return purchase invoice information with products of this purchase invoice
    const returnPurchaseInvoice = await prisma.returnPurchaseInvoice.findMany({
      where: {
        purchaseInvoiceId: Number(req.params.id),
      },
      include: {
        returnPurchaseInvoiceProduct: {
          include: {
            product: true,
          },
        },
      },
    });
    // sum of total paid amount
    const totalPaidAmount = transactions2.reduce(
      (acc, item) => acc + item.amount,
      0
    );
    // sum of total discount earned amount
    const totalDiscountAmount = transactions3.reduce(
      (acc, item) => acc + item.amount,
      0
    );
    // sum of total return purchase invoice amount
    const paidAmountReturn = transactions4.reduce(
      (acc, curr) => acc + curr.amount,
      0
    );
    // sum total amount of all return purchase invoice related to this purchase invoice
    const totalReturnAmount = returnPurchaseInvoice.reduce(
      (acc, item) => acc + item.totalAmount,
      0
    );

    const dueAmount =
      singlePurchaseInvoice.totalAmount -
      singlePurchaseInvoice.discount -
      totalPaidAmount -
      totalDiscountAmount -
      totalReturnAmount +
      paidAmountReturn;
    let status = "UNPAID";
    if (dueAmount === 0) {
      status = "PAID";
    }
    return res.status(200).json({
      status,
      totalPaidAmount,
      totalReturnAmount,
      dueAmount,
      singlePurchaseInvoice,
      returnPurchaseInvoice,
      transactions,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createSinglePurchaseInvoice,
  getAllPurchaseInvoice,
  getAllPurchaseInvoiceProduct,
  getSinglePurchaseInvoice,
};
