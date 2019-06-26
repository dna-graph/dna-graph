import { rule } from "graphql-shield"
import {Context} from "@generated/types"
import { getWhere } from "../utils/Where"
/*
You can choose from three different cache options.

no_cache - prevents rules from being cached.
contextual - use when rule only relies on ctx parameter.
strict - use when rule relies on parent or args parameter as well.
*/

export const isOwner = rule({cache: "strict"})(async (parent, args, ctx:Context, info) => {
    if(!ctx.userId) throw new Error("You need to be connected")
    if(parent.id === ctx.userId || parent.node.id === ctx.userId) return true
    return false
})

export const isSelf = rule({cache: "strict"})(async (parent, args, ctx:Context, info) => {
    if(!ctx.userId) throw new Error("You need to be connected")
    if(parent && parent.id === ctx.userId) return true
    const where = getWhere(args, ctx)
	console.log(where)
    if(!parent && where && where.id === ctx.userId) return true
    return false
})

export const isAuthenticated = rule()(async () => {
    return true
})

export const isEditor = rule()(async () => {
    return true
})

export const all = rule()(async () => {
    return true
})

export const isAdmin = rule()(async () => {
    return false
})