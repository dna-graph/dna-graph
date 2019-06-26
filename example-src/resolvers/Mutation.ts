import { Context } from "@generated/types"

export default {
    switchBusiness: async ( parent, { name }: any, ctx: Context) => {
        if(name){
            return "Yes "+name+" tu gère"
        } else {
            return "Je n'ai pas ton nom"
        }
    },

    createCustomType: async ( parent, { name }: any, ctx: Context) => {
        return {}
    },

    viewer: async ( parent, args, ctx: Context) => {
        return ctx.prisma.user({id: ctx.userId})
    },
}