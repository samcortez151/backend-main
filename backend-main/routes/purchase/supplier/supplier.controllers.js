const { getPagination } = require("../../../utils/query");
const prisma = require("../../../utils/prisma");

const createSingleSupplier = async (req, res) => {
  if (req.query.query === "deletemany") {
    try {
      // delete all suppliers
      const deletedSupplier = await prisma.supplier.deleteMany({
        where: {
          id: {
            in: req.body.map((id) => parseInt(id)),
          },
        },
      });
      return res.status(200).json(deletedSupplier);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  } else if (req.query.query === "createmany") {
    try {
      // create many suppliers from an array of objects
      const createdSupplier = await prisma.supplier.createMany({
        data: req.body.map((supplier) => {
          return {
            name: supplier.name,
            phone: supplier.phone,
            hsn: supplier.hsn,
            pan: supplier.pan,
            cin: supplier.cin,
            gstin: supplier.gstin,
            address: supplier.address,
          };
        }),
        skipDuplicates: true,
      });
      return res.status(201).json(createdSupplier);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  } else {
    try {
      // create a single supplier from an object
      const createdSupplier = await prisma.supplier.create({
        data: {
          name: req.body.name,
          phone: req.body.phone,
          address: req.body.address,
          hsn: req.body.hsn,
          pan: req.body.pan,
          cin: req.body.cin,
          gstin: req.body.gstin,
        },
      });

      return res.status(201).json(createdSupplier);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }
};

const getAllSupplier = async (req, res) => {
  if (req.query.query === "all") {
    try {
      // get all suppliers
      const allSupplier = await prisma.supplier.findMany({
        orderBy: {
          id: "asc",
        },
        include: {
          purchaseInvoice: true,
        },
      });
      return res.status(200).json(allSupplier);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  } else if (req.query.status === "false") {
    try {
      const { skip, limit } = getPagination(req.query);
      // get all suppliers
      const getAllSupplier = await prisma.supplier.findMany({
        where: {
          status: false,
        },
        orderBy: {
          id: "asc",
        },
        skip: parseInt(skip),
        take: parseInt(limit),
        include: {
          purchaseInvoice: true,
        },
      });

      const aggregations = await prisma.supplier.aggregate({
        _count: {
          id: true,
        },
        where: {
          status: false,
        },
      });
      return res.status(200).json({ getAllSupplier, totalSupplier: aggregations._count.id });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  } else if (req.query.query === "info") {
    try {
      // get all suppliers info
      const aggregations = await prisma.supplier.aggregate({
        _count: {
          id: true,
        },
        where: {
          status: true,
        },
      });
      return res.status(200).json(aggregations);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  } else {
    const { skip, limit } = getPagination(req.query);
    try {
      // get all suppliers paginated
      const getAllSupplier = await prisma.supplier.findMany({
        orderBy: {
          id: "asc",
        },
        where: {
          status: true,
        },
        skip: parseInt(skip),
        take: parseInt(limit),
        include: {
          purchaseInvoice: true,
        },
      });

      const aggregations = await prisma.supplier.aggregate({
        _count: {
          id: true,
        },
        where: {
          status: true,
        },
      });
      return res.status(200).json({ getAllSupplier, totalSupplier: aggregations._count.id });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }
};

const getSingleSupplier = async (req, res) => {
  try {
    const singleSupplier = await prisma.supplier.findUnique({
      where: {
        id: parseInt(req.params.id),
      },
      include: {
        purchaseInvoice: true,
      },
    });

    // get individual supplier's due amount by calculating: purchase invoice's total_amount - return purchase invoices - transactions
    const allPurchaseInvoiceTotalAmount =
      await prisma.purchaseInvoice.aggregate({
        _sum: {
          totalAmount: true,
          discount: true,
        },
        where: {
          supplierId: parseInt(req.params.id),
        },
      });
    // all invoice of a supplier with return purchase invoice nested
    const suppliersAllInvoice = await prisma.supplier.findUnique({
      where: {
        id: parseInt(req.params.id),
      },
      include: {
        purchaseInvoice: {
          include: {
            returnPurchaseInvoice: {
              where: {
                status: true,
              },
            },
          },
        },
      },
    });

    // get all return purchase invoice of a customer
    const allReturnPurchaseInvoice = suppliersAllInvoice.purchaseInvoice.map(
      (invoice) => {
        return invoice.returnPurchaseInvoice;
      }
    );
    // calculate total return purchase invoice amount
    const TotalReturnPurchaseInvoice = allReturnPurchaseInvoice.reduce(
      (acc, invoice) => {
        const returnPurchaseInvoiceTotalAmount = invoice.reduce(
          (acc, invoice) => {
            return acc + invoice.totalAmount;
          },
          0
        );
        return acc + returnPurchaseInvoiceTotalAmount;
      },
      0
    );

    // get all purchaseInvoice id
    const allPurchaseInvoiceId = suppliersAllInvoice.purchaseInvoice.map(
      (purchaseInvoice) => {
        return purchaseInvoice.id;
      }
    );
    // get all transactions related to purchaseInvoice
    const allPurchaseTransaction = await prisma.transaction.findMany({
      where: {
        type: "purchase",
        relatedId: {
          in: allPurchaseInvoiceId,
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
    // get all transactions related to return purchaseInvoice
    const allReturnPurchaseTransaction = await prisma.transaction.findMany({
      where: {
        type: "purchase_return",
        relatedId: {
          in: allPurchaseInvoiceId,
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
    // calculate the discount earned amount at the time of make the payment
    const discountEarned = await prisma.transaction.findMany({
      where: {
        type: "purchase",
        relatedId: {
          in: allPurchaseInvoiceId,
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
    const totalPaidAmount = allPurchaseTransaction.reduce((acc, cur) => {
      return acc + cur.amount;
    }, 0);
    const paidAmountReturn = allReturnPurchaseTransaction.reduce((acc, cur) => {
      return acc + cur.amount;
    }, 0);
    const totalDiscountEarned = discountEarned.reduce((acc, cur) => {
      return acc + cur.amount;
    }, 0);
    //get all transactions related to purchaseInvoiceId
    const allTransaction = await prisma.transaction.findMany({
      where: {
        relatedId: {
          in: allPurchaseInvoiceId,
        },
        type: {
          in: ["purchase", "purchase_return"],
        }
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

    const dueAmount =
      parseFloat(allPurchaseInvoiceTotalAmount._sum.totalAmount) -
      parseFloat(allPurchaseInvoiceTotalAmount._sum.discount) -
      parseFloat(totalPaidAmount) -
      parseFloat(totalDiscountEarned) -
      parseFloat(TotalReturnPurchaseInvoice) +
      parseFloat(paidAmountReturn);

    // include due_amount in singleSupplier
    singleSupplier.dueAmount = dueAmount ? dueAmount : 0;
    singleSupplier.allReturnPurchaseInvoice = allReturnPurchaseInvoice.flat();
    singleSupplier.allTransaction = allTransaction;

    //==================== UPDATE supplier's purchase invoice information START====================
    // async is used for not blocking the main thread
    const updatedInvoices = singleSupplier.purchaseInvoice.map(async (item) => {
      const paidAmount = allPurchaseTransaction
        .filter((transaction) => transaction.relatedId === item.id)
        .reduce((acc, curr) => acc + curr.amount, 0);
      const paidAmountReturn = allReturnPurchaseTransaction
        .filter((transaction) => transaction.relatedId === item.id)
        .reduce((acc, curr) => acc + curr.amount, 0);
      const singleDiscountEarned = discountEarned
        .filter((transaction) => transaction.relatedId === item.id)
        .reduce((acc, curr) => acc + curr.amount, 0);
      const returnAmount = allReturnPurchaseInvoice
        .flat()
        .filter(
          (returnPurchaseInvoice) =>
            returnPurchaseInvoice.purchaseInvoiceId === item.id
        )
        .reduce((acc, curr) => acc + curr.totalAmount, 0);
      return {
        ...item,
        paidAmount: paidAmount,
        discount: item.discount + singleDiscountEarned,
        dueAmount:
          item.totalAmount -
          item.discount -
          paidAmount -
          returnAmount +
          paidAmountReturn -
          singleDiscountEarned,
      };
    });
    singleSupplier.purchaseInvoice = await Promise.all(updatedInvoices);
    //==================== UPDATE supplier's purchase invoice information END====================
    return res.status(200).json(singleSupplier);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateSingleSupplier = async (req, res) => {
  try {
    const updatedSupplier = await prisma.supplier.update({
      where: {
        id: parseInt(req.params.id),
      },
      data: req.body,
    });
    return res.status(200).json(updatedSupplier);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const deleteSingleSupplier = async (req, res) => {
  try {
    // delete a single supplier
    const deletedSupplier = await prisma.supplier.update({
      where: {
        id: parseInt(req.params.id),
      },
      data: {
        status: req.body.status,
      },
    });
    return res.status(200).json(deletedSupplier);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createSingleSupplier,
  getAllSupplier,
  getSingleSupplier,
  updateSingleSupplier,
  deleteSingleSupplier,
};
