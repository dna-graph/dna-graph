import { IDecorator } from "../types"

export default class Live implements IDecorator {

    identifier = "@live"
    schema = {}
    file = {
        imports : ``,
        body: ``
    }

    template = `
const {{type}}Subscription = subscriptionField("{{lowerType}}", {
    type: '{{type}}SubscriptionPayload', // Use prisma's subscription type as output
    args: { where: arg({type: "{{type}}SubscriptionWhereInput"})},
    subscribe: async (parent, {where}, ctx) => {
        const security = await dnaShield.Subscription.{{lowerType}}.resolve(parent,{where}, {...ctx, isSub: true,_shield: {cache: {}}}, null, {debug: false})
        if(!security) throw "Not Authorised"
        return ctx.prisma.$subscribe.{{lowerType}}(where) as any // Cast to any because of typings mismatch
    },
    resolve: (payload) => {
        return payload
    },
})
`

    postSchema(schema:string){
        return schema
    }

    postBuild(file:string) {
        file = file.replace("/*dna-@live-import*/",",\n        "+Object.keys(this.schema).map(type => type+"Subscription").join(",\n        "))
        return file
    }

    handleScalar({name}){

    }

    handleType({type, value, decorators}) {
        if(value){
            if(decorators.indexOf("@private") !== -1) throw new Error("Security breach: You can't use @private with @live on type "+type)
            this.schema[type] = true
        }
    }

    handleInput({name, fields}){
    }

    handleField({type, field, value, decorators, fieldType, isList, args}) {
    }

    buildFile(file: string) {
        Object.keys(this.schema).forEach( type => {
            this.file.body += this.template.replace(/{{type}}/g,type)
                .replace(/{{lowerType}}/g,type.charAt(0).toLowerCase() + type.slice(1))
        })
        return {
            imports: this.file.imports,
            body: this.file.body
        }
    }
}