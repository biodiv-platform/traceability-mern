import axios from 'axios'
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

    try {
      const token = authorization.split(' ')[1]
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

const authenticateCronJob = (req, res, next): any => {
  const { authorization } = req.headers
  if (!authorization) {
    return res.sendStatus(403)
  }
  try {
    const token = authorization.split(' ')[1]
    const data: any = jwt_decode(token)
    if (data?.id !== process.env.CRON_USER_ID) {
      return res.sendStatus(403)
    }
    req.locals = data
    return next()
  } catch {
    return res.sendStatus(403)
  }
}

const authorizationForChangeRequest = () => {
  return async (req, res, next) => {
    const { authorization } = req.headers

    if (!authorization) {
      return res.sendStatus(403)
    }

    try {
      const { data } = await axios.get(
        `${process.env.ENTITIES_BASE_API}/entities-api/api/user/me`,
        {
          headers: {
            Authorization: authorization
          }
        }
      )

      req.locals = {
        userId: data.user.id,
        unionCode: data.unionCode
      }

      return next()
    } catch (error) {
      console.error('Authorization error:', error)
      return res.sendStatus(403)
    }
  }
}

export default authorization

export { authorization, authenticateCronJob, authorizationForChangeRequest }
