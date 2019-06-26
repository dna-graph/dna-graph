/**
    Context System
    Implementation: Need to be exported in /src/utils/Context.ts
    Description: This Context builder return the context and can handle http & ws authentification method, works well with Auth System
**/

import { prisma, Prisma } from '@generated/prisma-client'
import { verify } from 'jsonwebtoken'

export default ({req, connection}) => {
    let Authorization = ""
    if(connection){
        Authorization = connection.context.Authorization
    } else {
        Authorization = req.headers.authorization
    }
    let userId = null;
    if (Authorization) {
        const verifiedToken = verify(Authorization, process.env.APP_SECRET)
        userId = verifiedToken && verifiedToken.userId
    }
    return { userId, prisma }
}