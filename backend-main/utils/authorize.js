var { expressjwt: jwt } = require("express-jwt");
require("dotenv").config();
const secret = process.env.JWT_SECRET;

function authorize(permission) {
  return [
    // authenticate JWT token and attach user to request object (req.auth)
    jwt({ secret, algorithms: ["HS256"] }),
    // authorize based on user permission
    (req, res, next) => {
      // console.log(permission, "PERMISSION");
      // console.log(req.auth.permissions, "AUTH PERMISSIONSS ====>");
      if (permission && !req.auth.permissions.includes(permission)) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      next();
    },
  ];
}

module.exports = authorize;
