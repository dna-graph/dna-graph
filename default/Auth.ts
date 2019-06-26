/**
    Authentification System
    Implementation: Need to be imported in the Mutation
    Description: Allow to enable a auhtentifcation system based on virtual tokens (not stored in DB)
**/

import { verify } from 'jsonwebtoken'
import { stringArg, idArg, mutationType } from 'nexus'
import { hash, compare } from 'bcryptjs'
import { sign } from 'jsonwebtoken'
import { Context } from '@generated/types'

export const APP_SECRET = 'appsecret321'

/*
    Add to Mutation type in dna.graphql:
        signup(name: String, email: String, password: String): String @custom
        login(email: String, password: String): String @custom

    Import the Auth util in ./resolvers/index.ts:
        import DefaultAuth from "../utils/Auth"

    Change your exports Mutation and add the AuthPayload:
        Mutation: {...DefaultAuth, ...Mutation}
*/

export default {
    signup: async (parent, { name, email, password }, ctx) => {
        const hashedPassword = await hash(password, 10)
        const user = await ctx.prisma.createUser({
            name,
            email,
            password: hashedPassword,
        })
        return sign({ userId: user.id }, process.env.APP_SECRET)
    },

    login: async (parent, { email, password }, context) => {
        const user = await context.prisma.user({ email })
        if (!user) {
            throw new Error(`No user found for email: ${email}`)
        }
        const passwordValid = await compare(password, user.password)
        if (!passwordValid) {
            throw new Error('Invalid password')
        }
        return sign({ userId: user.id }, process.env.APP_SECRET)
    },
}
