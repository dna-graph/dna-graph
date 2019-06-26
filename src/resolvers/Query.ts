import { Context } from "@generated/types"

export default {

    viewer: async ( parent, args, ctx: Context) => {
        return ctx.prisma.user({id: ctx.userId})
    },
    
}