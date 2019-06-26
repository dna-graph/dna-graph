import { IDecorator } from "../types"

export default class Custom implements IDecorator {

    identifier = "@custom"
    schema = {}
    customTypes = {}
    defaultDecorators = {}
    inputs = {}
    file = {
        imports : `
import { idArg, stringArg, floatArg, intArg, arg, inputObjectType, objectType, subscriptionField } from "nexus"
import CustomResolvers from "../src/resolvers"
        `,
        body: ``
    }

    nativeFields = ["String","Boolean","Float","ID","Int"]

    template = {
        type: `
const {{type}} = objectType({
    name: "{{type}}",
    definition(t) {
        {{fields}}
    },
});
`,
        field: `
        t{{isList}}.{{fieldType}}("{{field}}", {
            {{isCustomType}}
            {{arg}}
            resolve: CustomResolvers.{{type}}.{{field}},
        });
`,
        arg: `args: {{args}},`,
        input: `
const {{input}} = inputObjectType({
    name: "{{input}}",
    definition(t) {
        {{definitions}}
    },
});
`,
        inputField: `
    t{{isList}}.{{fieldType}}("{{field}}", {
        {{isCustomType}}
        {{isRequired}}
    });
`,
    }

    postSchema(schema:string){
        return schema
            .replace(/(type.*@custom.*{.*(\n.*)*?\n})/g,"")
            .replace(/\n.*@custom.*/g,"")
            .replace(/(input.*{.*(\n.*)*?\n})/g,"")
    }

    postBuild(file:string) {
        let customTypesCode = ""
        Object.keys(this.schema).forEach(type => {
            let fieldsCode = ""
            Object.keys(this.schema[type]).forEach(field => {
                fieldsCode += this.schema[type][field]
            })
            if(this.customTypes[type]){
               customTypesCode += this.template.type.replace(/{{type}}/g, type)
                   .replace(/{{fields}}/g,fieldsCode)
            } else {
                file = file.replace("/*dna-@custom-"+type+"*/",fieldsCode)
            }
        })
        let code = ""
        Object.keys(this.inputs).forEach( input => {
            code += this.template.input.replace(/{{input}}/g,input).replace(/{{definitions}}/g,this.getDefinitions(this.inputs[input]))
        })
        file = file.replace("/*dna-@custom-custom-inputs*/", code)
        file = file.replace("/*dna-@custom-inputs-import*/",",\n        "+Object.keys(this.inputs).join(",\n        "))
        file = file.replace("/*dna-@custom-custom-types*/", customTypesCode)
        file = file.replace("/*dna-@custom-types-import*/",",\n        "+Object.keys(this.customTypes).join(",\n        "))
        return file
    }

    handleScalar({name}){

    }

    handleType({type, value, decorators}) {
        if(value){
            this.customTypes[type] = true
        }
    }

    handleInput({name, fields}){
        this.inputs[name] = fields
    }

    handleField({type, field, value, decorators, fieldType, isList, args}) {
        if(value === true || this.customTypes[type]){
            let isCustomType = false
            if(!this.schema[type]) this.schema[type] = {}
            let code = this.template.field
                .replace(/{{field}}/g,field)
                .replace(/{{type}}/g,type)
            if(this.nativeFields.indexOf(fieldType) !== -1){
                code = code.replace(/{{fieldType}}/g,fieldType.toLowerCase())
            } else {
                isCustomType = true
                code = code.replace(/{{fieldType}}/g,"field")
            }
            isList ? code = code.replace(/{{isList}}/g,".list") : code = code.replace(/{{isList}}/g,"")
            if(args.length) {
                const codeArgs = []
                args.forEach( arg => {
                    if(this.nativeFields.indexOf(arg.type.replace("!","")) !== -1){
                        const option = arg.type.indexOf("!") !== -1 ? "Arg({required: true})" : "Arg()"
                        codeArgs.push(arg.name+": "+arg.type.replace("!","").toLowerCase()+option)
                    } else {
                        const option = arg.type.indexOf("!") !== -1 ? "arg(type: {{input}},required: true})" : "arg({type: {{input}}})"
                        codeArgs.push(arg.name+": "+option.replace(/{{input}}/g, "\""+arg.type+"\""))
                    }
                })
                code = code.replace(/{{arg}}/g, this.template.arg.replace(/{{args}}/g,"{"+codeArgs.join(", ")+"}"))
            } else {
                code = code.replace(/{{arg}}/g,"")
            }
            if(isCustomType){
                code = code.replace(/{{isCustomType}}/g,"type: \""+fieldType+"\",")
            } else {
                code = code.replace(/{{isCustomType}}/g,"")
            }
            this.schema[type][field] = code
        }
    }

    getDefinitions(fields: any[]){
        let generalCode = ""
        fields.forEach(field =>{
            let code = this.template.inputField.replace(/{{field}}/g,field.name)
            const fieldType = field.targetType.replace(/\[|\]|\!/g,"")
            const isList = field.targetType.indexOf("[") === 0
            const isRequired = field.targetType.indexOf("!") > 0
            let isCustomType = false
            if(this.nativeFields.indexOf(fieldType) !== -1){
                code = code.replace(/{{fieldType}}/g,fieldType.toLowerCase())
            } else {
                isCustomType = true
                code = code.replace(/{{fieldType}}/g,"field")
            }
            isList ? code = code.replace(/{{isList}}/g,".list") : code = code.replace(/{{isList}}/g,"")
            if(isCustomType){
                code = code.replace(/{{isCustomType}}/g,"type: \""+fieldType+"\",")
            } else {
                code = code.replace(/{{isCustomType}}/g,"")
            }
            if(isRequired){
                code = code.replace(/{{isRequired}}/g,"required: true,")
            } else {
                code = code.replace(/{{isRequired}}/g,"required: false,")
            }
            generalCode += code
        })
        return generalCode
    }

    buildFile(file: string) {
        return {
            imports: this.file.imports,
            body: this.file.body
        }
    }
}