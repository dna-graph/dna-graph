import { IDecorator } from "../types"

export default class Shield implements IDecorator {

    identifier = "@shield"
    schema = {}
    defaultDecorators = {}
    subscriptionTypes = {}
    privateTypes = {}
    file = {
        imports : `
import { shield, and, or, not } from "graphql-shield"
import { applyMiddleware } from "graphql-middleware";
`,
        body: "const dnaShield = {\n"
    }

    postSchema(schema:string){
        return schema
    }

    handleScalar({name}){
    }

    handleInput({name, fields}){
    }
    
    postBuild(file:string){
        const rg = /(?<=const server = new ApolloServer\({\n\s\s\s\s)(schema)(?=,)/g
        const re = "schema: applyMiddleware(schema, shield(dnaShield))"
        return file.replace(rg,re)
    }

    handleType({type, value, decorators}) {
        if(value){
            if(decorators.indexOf("@private") !== -1){
                throw new Error("You can't define a @shield on private type "+type);   
            }
            this.defaultDecorators[type] = value
        }
        if(decorators.indexOf("@live") !== -1){
            if(!value) throw new Error("For security purpose a @shield is needed on type "+type+" when you use @live")
            this.subscriptionTypes[type] = true
        }
        if(decorators.indexOf("@private") > -1){
            this.privateTypes[type] = true
        } else {
            this.schema[type] = {}
        }
    }

    handleField({type, field, value, decorators, fieldType}) {
        if(value){
            if(decorators.indexOf("@private") !== -1){
                throw new Error("You can't define a @shield on private field "+type);   
            }
            this.schema[type][field] = value
        } else if(this.defaultDecorators[type]) {
            if(decorators.indexOf("@private") === -1){
                this.schema[type][field] = this.defaultDecorators[type]
            }
        } else {
            if(!this.privateTypes[type]){
                throw new Error("No default " + this.identifier + " found for type " + type + " define a @shield on "+field+ " or add a default @shield to the type")
            }
        }
    }

    extractRules(rule: string, importedRules: any){
        let stringRules = rule.replace(/(and\()|(or\()|(not\()|(,)|(\))|(\s)/g," ")
            .replace(/\s\s+/g, ' ')
            .trim()
            .split(" ")
        stringRules.forEach(rule => importedRules[rule] = true)
        return importedRules
    }

    buildFile(file: string) {
        let importedRules = {}
        Object.keys(this.schema).forEach( typeKey => {
            this.file.body += "    " + typeKey + ": {\n"
            Object.keys(this.schema[typeKey]).forEach( fieldKey => {
                this.file.body += "        " + fieldKey + ": " + this.schema[typeKey][fieldKey] + ",\n"
                let stringRules = this.schema[typeKey][fieldKey]
                importedRules = this.extractRules(this.schema[typeKey][fieldKey], importedRules)
            })
            this.file.body += "    },\n"
        })
        if(Object.keys(this.subscriptionTypes).length){
            this.file.body += "    Subscription: {\n"
            Object.keys(this.subscriptionTypes).forEach(type => {
                this.file.body += "        " + type.charAt(0).toLowerCase() + type.slice(1) + ": "+this.defaultDecorators[type]+",\n"
            })
            this.file.body += "    },\n"
        }
        this.file.body += "}"
        this.file.imports += "import {\n"
        Object.keys(importedRules).forEach( rule => {
            this.file.imports += "    " + rule + ",\n"
        })
        this.file.imports += "} from \"../src/shields\"\n"
        return {
            imports: this.file.imports,
            body: this.file.body
        }
    }
}