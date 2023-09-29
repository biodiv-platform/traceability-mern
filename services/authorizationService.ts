import jwt_decode from 'jwt-decode'

// verify roles
const ROLES = {
  GI_ADMIN: 'GI_ADMIN',
  INSPECTOR: 'INSPECTOR',
  ICS_MANAGER: 'ICS_MANAGER',
  UNAUTHORIZED: 'ROLE_UNAUTHORIZED',
  AUTHORIZED: 'AUTHORIZED',
  FARMER: 'FARMER',
  COLLECTION_CENTER: 'COLLECTION_CENTER_PERSON',
  COOPERATIVE: 'COOPERATIVE_PERSON',
  FACTORY: 'FACTORY_PERSON',
  UNION: 'UNION_PERSON',
  ADMIN: 'ROLE_ADMIN'
}

const verifyRoles = (roles, ROLE): boolean => {
  // eslint-disable-next-line
  if (roles.includes(`${ROLES}[${ROLE}]`)) {
    return true
  }
  return false
}

const isRoleAdmin = (roles): boolean => {
  if (roles.includes(ROLES.ADMIN)) {
    return true
  }
  return false
}

// JWT Verification
const authorization = (ROLE) => {
  return (req, res, next) => {
    const { authorization } = req.headers
    if (!authorization) {
      return res.sendStatus(403)
    }
    const token = authorization.split(' ')[1]
    try {
      const data: any = jwt_decode(token)

      const roles = data?.roles

      req.locals = data

      // if role is admin then allow access to all routes
      if (isRoleAdmin(roles)) {
        return next()
      }

      // if role is not admin then check for permitted role
      if (verifyRoles(roles, ROLE)) {
        return res.sendStatus(403)
      }
      return next()
    } catch {
      return res.sendStatus(403)
    }
  }
}

// function tp restrict request method based on role

const restriction = (...ROLES) => {
  return (req, res, next) => {
    const { authorization } = req.headers
    if (!authorization) {
      return res.sendStatus(403)
    }

    const roles = req.locals.roles

    // if role is admin then allow access to all routes
    if (isRoleAdmin(roles)) {
      return next()
    }

    // if role is not admin then check for permitted role
    for (let i = 0; i < roles.length; i++) {
      if (!ROLES.includes(roles[i])) {
        return res.sendStatus(403)
      }
    }
    return next()
  }
}

export { authorization, restriction }
