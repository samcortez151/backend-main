
const { getObjectSignedUrl } = require("../../utils/s3");
const prisma = require("../../utils/prisma");
const { getPagination } = require("../../utils/query");

BigInt.prototype.toJSON = function () {
  const int = Number.parseInt(this.toString());
  return int ?? this.toString();
};

const createSingleCompany = async (req, res) => {
    try {
        // create single product_brand from an object
        const createCompany = await prisma.companies.create({
            data: {
                name: req.body.name,
                logo: req.body.logo,
                tagLine: req.body.tagLine,
                address: req.body.address,
                phone: req.body.phone,
                email: req.body.email,
                hsn : req.body.hsn,
                pan : req.body.pan,
                cin : req.body.cin,
                gstIn: req.body.gstIn,
                website: req.body.website,
                footer: req.body.footer,
                billLimit : req.body.billLimit,
            },
        });
        return res.status(201).json(createCompany);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const getAllCompanies= async (req, res) => {
  if (req.query.query === "all") {
    try {
      // get all product_brand
      const getAllCompanies = await prisma.companies.findMany({
        orderBy: {
          id: "asc",
        }
      });
      return res.status(200).json(getAllCompanies);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  } else if (req.query.query === "search") {
    try {
      const allCompanies = await prisma.companies.findMany({
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
      return res.status(200).json(allCompanies);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  } 
//   else if (req.query.status === "true") {
//     const { skip, limit } = getPagination(req.query);
//     try {
//       // get all product_brand paginated
//       const getAllCompanies = await prisma.companies.findMany({
//         where: {
//           status: true,
//         },
//         orderBy: {
//           id: "asc",
//         },
//         include: {
//           product: true,
//         },
//         skip: parseInt(skip),
//         take: parseInt(limit),
//       });

//       const aggregations = await prisma.companies.aggregate({
//         _count: {
//           id: true,
//         },
//         where: {
//           status: true,
//         },
//       });
//       return res.status(200).json({getAllCompanies, totalCompanies: aggregations._count.id});
//     } catch (error) {
//       return res.status(500).json({ message: error.message });
//     }
//   } else if (req.query.status === "false") {
//     const { skip, limit } = getPagination(req.query);
//     try {
//       // get all product_brand paginated
//       const getAllCompanies = await prisma.companies.findMany({
//         where: {
//           status: false,
//         },
//         orderBy: {
//           id: "asc",
//         },
//         include: {
//           product: true,
//         },
//         skip: parseInt(skip),
//         take: parseInt(limit),
//       });
//       const aggregations = await prisma.companies.aggregate({
//         _count: {
//           id: true,
//         },
//         where: {
//           status: false,
//         },
//       });
//       return res.status(200).json({getAllCompanies,totalCompanies:aggregations._count.id});
//     } catch (error) {
//       return res.status(500).json({ message: error.message });
//     }
//   } 
  else {
    const { skip, limit } = getPagination(req.query);
    try {
      // get all product_brand paginated
      const getAllCompanies = await prisma.companies.findMany({
        orderBy: {
          id: "asc",
        },
        skip: parseInt(skip),
        take: parseInt(limit),
      });

      const aggregations = await prisma.companies.aggregate({
        _count: {
          id: true,
        },
        // where: {
        //   status: false,
        // },
      });
      return res.status(200).json({getAllCompanies,totalCompanies:aggregations._count.id});
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }
};

const getSingleCompanies = async (req, res) => {
  try {
    const singleCompanies = await prisma.companies.findUnique({
      where: {
        id: parseInt(req.params.id),
      }
    });
    //adding image url to product_brand
      // if (singleCompanies.logo) {
      //   singleCompanies.logo = await getObjectSignedUrl(singleCompanies.logo);
      // }
    // }
    return res.status(200).json(singleCompanies);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateSingleCompanies = async (req, res) => {
  try {
    const updatedCompanies = await prisma.companies.update({
      where: {
        id: parseInt(req.params.id),
      },
      data: req.body
    });
    return res.status(200).json(updatedCompanies);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const deleteSingleCompanies = async (req, res) => {
  try {
    const deletedCompanies = await prisma.companies.delete({
      where: {
        id: parseInt(req.params.id),
      }
    });
    return res.status(200).json(deletedCompanies);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
    createSingleCompany,
    getAllCompanies,
    getSingleCompanies,
    updateSingleCompanies,
    deleteSingleCompanies
};
