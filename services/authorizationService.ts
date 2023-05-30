const jwt = require("jsonwebtoken");

// verify roles
const ROLES = {
  GI_ADMIN: "GI_ADMIN",
  INSPECTOR: "INSPECTOR",
  ICS_MANAGER: "ICS_MANAGER",
  UNAUTHORIZED: "ROLE_UNAUTHORIZED",
  AUTHORIZED: "AUTHORIZED",
  FARMER: "FARMER",
  COLLECTION_CENTER: "COLLECTION_CENTER_PERSON",
  COOPERATIVE: "COOPERATIVE_PERSON",
  FACTORY: "FACTORY_PERSON",
  UNION: "UNION_PERSON",
  ADMIN: "ROLE_ADMIN",
};

const verifyRoles = (roles, ROLE) => {
  console.log(ROLE);
  if (roles.includes(`${ROLES}.${ROLE}`)) {
    return true;
  }
  return false;
};

const isRoleAdmin = (roles) => {
  if (roles.includes(ROLES.ADMIN)) {
    return true;
  }
  return false;
};

// JWT Verification
const authorization = (ROLE) => {
  return (req, res, next) => {
    const { authorization } = req.headers;
    if (!authorization) {
      return res.sendStatus(403);
    }
    const token = authorization.split(" ")[1];
    try {
      const data = jwt.verify(token, process.env.JWT_SECRET);

      const roles = data.roles;

      req.locals = data;

      // if role is admin then allow access to all routes
      if (isRoleAdmin(roles)) {
        return next();
      }

      // if role is not admin then check for permitted role
      if (!verifyRoles(roles, ROLE)) {
        return res.sendStatus(403);
      }
      return next();
    } catch {
      return res.sendStatus(403);
    }
  };
};

export { authorization };
