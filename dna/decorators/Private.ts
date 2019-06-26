import { IDecorator } from "../types"

export default class Private implements IDecorator {

    identifier = "@private"
    schema = {}
    defaultDecorators = {}
    file = {
        imports : ``,
        body: ``,
        schema: ``
    }
    customSchema = {}
    privateSchema = {}
    scalars = {}
    nativeFields = ["String","Boolean","Float","ID","Int"]
    nativeParams = {
        String: ["","_not","_in","_not_in","_lt","_lte","_gt","_gte","_contains","_not_contains","_starts_with","_not_starts_with","_ends_with","_not_ends_with"],
        Boolean: ["","_not"],
        Float: ["","_not","_in","_not_in","_lt","_lte","_gt","_gte"],
        ID: ["","_not","_in","_not_in","_lt","_lte","_gt","_gte","_contains","_not_contains","_starts_with","_not_starts_with","_ends_with","_not_ends_with"],
        Int: ["","_not","_in","_not_in","_lt","_lte","_gt","_gte"],
        Scalar: ["","_not","_in","_not_in","_lt","_lte","_gt","_gte","_contains","_not_contains","_starts_with","_not_starts_with","_ends_with","_not_ends_with"],
        Type: ["_some"]
    }

    actions = ["Create","Update","UpdateManyMutation","Where","CreateWithout","UpdateWithout"]

    withoutInputs = {}

    customInputs = []

    inputTemplate = `
export const {{typeName}}{{action}}Input = prismaInputObjectType({
    name: "{{typeName}}{{action}}Input",
    definition(t) {
        // @ts-ignore
        t.prismaFields({{fields}})
    },
})
`

    template = `
const {{typeName}} = prismaObjectType({
    name: "{{typeName}}",
    definition(t) {
        // @ts-ignore
        t.prismaFields({{fields}});
        /*dna-@custom-{{typeName}}*/
    },
})`

    postBuild(file:string){
        const types = []
        Object.keys(this.schema).forEach(type => types.push(type))
        return file.replace("/*dna-@private*/",",\n        "+[...types,...this.customInputs].join(",\n        "))
    }

    postSchema(schema:string){
        return schema
    }

    handleType({type, value, decorators}) {
        if(type !== "Mutation" && type !== "Query" && decorators.indexOf("@custom") === -1){
            if(!value){
                this.schema[type] = {}
            } else {
                 this.privateSchema[type] = {}
            }
        } else if(decorators.indexOf("@custom") !== -1 && value) {
            this.customSchema[type] = true
            console.log("@private is useless on the custom type "+type)
        }
    }

    handleScalar({name}){
        this.scalars[name] = true
    }

    handleInput({name, fields}){
    }

    handleField({type, field, value, decorators, fieldType, isList}) {
        if(type !== "Mutation" && type !== "Query"){
            if(value === true){
                if(this.privateSchema[type] || this.customSchema[type]){
                    console.log("@private on field "+field+" of type "+type+" is useless")
                } else {
                    this.privateSchema[type] = {}
                }
                this.privateSchema[type][field] = fieldType
            } else {
                if(this.schema[type] && decorators.indexOf("@custom") === -1){
                    this.schema[type][field] = fieldType
                    if(isList && decorators.indexOf("@relation") === -1){
                        if(!this.withoutInputs[type]) this.withoutInputs[type] = {}
                        this.withoutInputs[type][field] = true
                    }
                }
            }
        }
    }

    securityCheck(){
        Object.keys(this.schema).forEach(type => {
            Object.keys(this.schema[type]).forEach( field => {
                if(this.privateSchema[this.schema[type][field]] && Object.keys(this.privateSchema[this.schema[type][field]]).length === 0) {
                    throw new Error("Security breach: you are trying to use the private type "+this.schema[type][field]+" on type "+type+" field "+field)
                }
            })
        }) 
    }

    buildFile(file: string) {
        this.securityCheck()
        Object.keys(this.schema).forEach(type => {
            const fields = []
            if(this.privateSchema[type]){
                Object.keys(this.privateSchema[type]).forEach( field => fields.push('"'+field+'"'))
                this.file.body += "\n"+this.template
                    .replace(/{{typeName}}/g,type)
                    .replace(/{{fields}}/g,"{filter:[" + fields.join(",") + "]}")
                this.actions.forEach( action => {
                    let otherFields = []
                    if(action === "Where"){
                        Object.keys(this.privateSchema[type]).forEach(field => {
                            const targetType = this.privateSchema[type][field]
                            if(this.nativeFields.indexOf(targetType) !== -1){
                                this.nativeParams[targetType].forEach(param => {
                                    otherFields.push("\""+field + param +"\"")
                                })
                            } else if(this.scalars[targetType]){
                                this.nativeParams.Scalar.forEach(param => {
                                    otherFields.push("\""+field + param +"\"")
                                })
                            } else {
                                this.nativeParams.Type.forEach(param => {
                                    otherFields.push("\""+field + param +"\"")
                                }) 
                            }
                        })
                    }
                    if(action.indexOf("Without") !== -1 && this.withoutInputs[type]){
                        const end = "UpdateWithout" === action ? "Data" : ""
                        Object.keys(this.withoutInputs[type]).forEach(field => {
                            if(fields.length){
                                const formatedField = field.charAt(0).toUpperCase() + field.slice(1)
                                this.file.body += "\n"+this.inputTemplate
                                .replace(/{{typeName}}/g,type)
                                .replace(/{{fields}}/g,"{filter:[" + fields.join(",") + "]}")
                                .replace(/{{action}}/g,action+formatedField+end)
                                this.customInputs.push(type+action+formatedField+end+"Input")
                            }
                        })
                    } else if(action.indexOf("Without") === -1){
                        this.file.body += "\n"+this.inputTemplate
                            .replace(/{{typeName}}/g,type)
                            .replace(/{{fields}}/g,"{filter:[" + [...fields,...otherFields].join(",") + "]}")
                            .replace(/{{action}}/g,action)
                        this.customInputs.push(type+action+"Input")
                    }
                })
            } else {
                this.file.body += "\n"+this.template.replace(/{{typeName}}/g,type).replace(/{{fields}}/g,"[\"*\"]")
            }
        })
        return {
            imports: this.file.imports,
            body: this.file.body + this.file.schema
        }
    }
}