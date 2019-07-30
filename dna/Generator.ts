import { buildSchema } from "graphql"
import * as fsRead from "fs-readfile-promise"
import { writeFile, readdirSync } from "fs"
import { Shield, Private, Auto, Custom, Live } from "./decorators"
 
class Generator  {
     
    dna = {
        graphql: {
            input: {
                path: "./src/dna/",
                content: ""
            },
            output: {
                path: "./generated/datamodel.prisma",
                content: ""
            },
        },
        ts: {
            output : {
                path: "./generated/server.ts",
                content: ""
            }
        }
    }

    addTypes = `
import { Prisma } from './prisma-client'

export interface Context {
  prisma: Prisma
  request: any
  userId: string | null
}`

    decorators = []

    constructor (options){
        this.decorators = [new Shield(), new Private(), new Live(), new Auto(), new Custom()]
    }

    async gen() {
        await this.loadFile()
        this.iterator()
        this.buildFile()
        writeFile(this.dna.ts.output.path, this.dna.ts.output.content,() => { console.log("DNA TS generated")})
        writeFile(this.dna.graphql.output.path, this.dna.graphql.output.content,() => { console.log("DNA GraphQL generated")})
        writeFile("./generated/types.ts", this.addTypes,() => { console.log("DNA Additional Types generated")})
    }

    iterator(){
        const stringSchema = this.dna.graphql.input.content
        const stringTypes = stringSchema.match(/(type.*{.*(\n.*)*?\n})/gm)
        this.decorators.forEach( decorator => {
            stringTypes.forEach( stringType => {
                this.typeLoop(stringType, decorator)
            })
        })
        this.scalarIterator()
        this.inputIterator()
    }

    typeLoop(stringType: string, decorator: any){
        if(stringType.match(/(?<=type\s)(.*)(?=\s{)/gm).length !== 1) throw new Error("the type \""+stringType+"\" is invalid")
        let typeName = stringType.split("\n")[0].replace(/(@.*\))|(@.*)|(type)|({)/g,"").trim()
        let fullType = stringType.split("\n")[0]
        let typeValue = null
        let typeMatch = fullType.match(new RegExp("(?<=" + decorator.identifier + "\\()[A-z(), ]*(?=\\))", "g"))
        if(typeMatch && typeMatch.length > 0){
            typeValue = typeMatch[0]
        }
        if(!typeValue && fullType.indexOf(decorator.identifier) !== -1) typeValue = true
        decorator.handleType({
            type: typeName,
            value: typeValue,
            decorators: this.getDecorators(stringType)
        })
        const stringFields = stringType.match(/^\s.*/gm)
        stringFields.forEach( stringField => {
           this.fieldLoop(typeName, stringField, decorator)
        })
    }

    getGraphQLArgs(stringField){
        let graphqlArgs = []
        if(stringField.match(/(?<=\()(.*)(?=\):)/g)){
            graphqlArgs = stringField.match(/(?<=\()(.*)(?=\):)/g)[0]
                .replace(/\s/g,"")
                .split(",")
                .map( arg => {
                    return { 
                        name: arg.split(":")[0],
                        type: arg.split(":")[1]
                    }
                })
        }
        return graphqlArgs
    }

    getFieldValue(stringField, decorator){
        let fieldValue = null
        const fieldMatch = stringField.match(new RegExp("(?<=" + decorator.identifier + "\\()[A-z(), ]*(?=\\))", "g"))
        let fieldTargetType = stringField.replace(/\(.*\)(?=: )/g,"").match(/(?<=: )([A-z!]*)/)[0]
        let isList = fieldTargetType.length === fieldTargetType.replace(/\[|\]/g,"").length ? false : true
        fieldTargetType = fieldTargetType.replace(/\[|\]/g,"")
        if(fieldMatch && fieldMatch.length > 0){
            fieldValue = fieldMatch[0]
        }
        if(!fieldValue && stringField.indexOf(decorator.identifier) !== -1) fieldValue = true
        return {fieldValue, isList, fieldTargetType}
    }

    fieldLoop(type, stringField, decorator){
        const fieldName = stringField
            .trim().split(/\(|:/)[0]
            .replace(/\(.*\)/,"")
            .trim()
        const {fieldValue, isList, fieldTargetType} = this.getFieldValue(stringField, decorator)
        let graphqlArgs = this.getGraphQLArgs(stringField)
        decorator.handleField({
            type,
            field: fieldName,
            value: fieldValue,
            fieldType: fieldTargetType,
            decorators: this.getDecorators(stringField),
            isList,
            args: graphqlArgs
        })
    }

    inputIterator(){
        const stringInputs = this.dna.graphql.input.content.match(/(input.*{.*(\n.*)*?\n})/gm)
        if(stringInputs){
            stringInputs.forEach( stringInput => {
                let stringFields = stringInput.match(/(?<=input.*{\n).*(\n.*)*?\n(?=})/g)[0].split("\n").filter(stringField => stringField !== "")
                const inputName = stringInput.match(/(?<=input )[A-z]*(?= {)/g)[0]
                let fields = stringFields.map( stringField => {
                    const field = stringField.trim().split(":")
                    return {
                        name: field[0].trim(),
                        targetType: field[1].trim()
                    }
                })
                this.decorators.forEach( decorator => decorator.handleInput({ name: inputName, fields }))
            })
        }
    }

    scalarIterator (){
        const scalars = this.dna.graphql.input.content.match(/(?<=\nscalar ).*/g)
        if(scalars){
            scalars.forEach(scalar => {
                this.decorators.forEach( decorator => {
                    decorator.handleScalar({name: scalar})
                })
            })
        } 
    }

    getDecorators(txt: string){
        const match = txt.split("\n")[0].match(/((?<=@)[a-zA-Z]*(?=\())|((?<=@)[a-zA-Z]*(?= ))|((?<=@)[a-zA-Z]*(?=))/g)
        if(match){
            return match.map(val => "@"+val)
        } else {
            return []
        }
    }

    buildFile(){
        let _imports = ""
        let _body = ""
        let schema = this.dna.graphql.input.content
        this.decorators.forEach( decorator => {
            const { imports, body } = decorator.buildFile()
            _imports += imports
            _body += body
        })
        let file = _imports + "\n" + _body
        this.decorators.forEach( decorator => {
            file = decorator.postBuild(file)
            schema = decorator.postSchema(schema)
            schema = schema.replace(new RegExp("("+decorator.identifier+"\\(.*\\))|("+decorator.identifier+")","g"),"")
        })
        this.dna.graphql.output.content = this.clean(schema)
        this.dna.ts.output.content = file
    }

    async loadFile() {
        const files = readdirSync(this.dna.graphql.input.path)
        const contents = await Promise.all(files.map(async (name)=> {
            return await fsRead(this.dna.graphql.input.path+name,"utf8")
        }))
        this.dna.graphql.input.content = contents.join("\n\n")
    }

    clean(schema) {
        return schema.replace(/(type Query.*{.*(\n.*)*?\n})/gm,"")
            .replace(/(type Mutation.*{.*(\n.*)*?\n})/gm,"")
            .replace(/@relation/gm,"@relation(link: INLINE)")
            .replace(/\n\n/gm,"")
    }

}

// Launch the generator
new Generator({}).gen()