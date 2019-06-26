import { rule } from "graphql-shield"
import {Context} from "@generated/types"
import { getWhere } from "../utils/Where"
/*
You can choose from three different cache options.

no_cache - prevents rules from being cached.
contextual - use when rule only relies on ctx parameter.
strict - use when rule relies on parent or args parameter as well.
*/

export const isSelf = rule({cache: "strict"})(async (parent, args, ctx:Context, info) => {
    if(!ctx.userId) throw new Error("You need to be connected")
    if(parent && parent.id === ctx.userId) return true
    if(parent && parent.node && parent.node.id === ctx.userId) return true
    const where = getWhere(args, ctx)
    if(!parent && where && where.id === ctx.userId) return true
    return false
})

export const isAuth = rule()(async (parent, args, ctx:Context, info) => {
    if(ctx.userId) return true
    return false
})

export const all = rule()(async () => {
    return true
})
