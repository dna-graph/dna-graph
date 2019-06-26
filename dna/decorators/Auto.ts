import { IDecorator } from "../types"

export default class Auto implements IDecorator {

    identifier = "@auto"
    schema = {}
    defaultDecorators = {}
    file = {
        imports : `
import { ApolloServer, gql } from 'apollo-server'
import { makePrismaSchema, prismaObjectType, prismaInputObjectType } from 'nexus-prisma'
import * as path from 'path'
import datamodelInfo from './nexus-prisma'
import { prisma, Prisma } from './prisma-client'
import { verify } from 'jsonwebtoken'
import ContextBuilder from "../src/utils/Context"`,

        body: ``,

        schema: `
/*dna-@custom-custom-inputs*/
/*dna-@custom-custom-types*/
const schema = makePrismaSchema({
    types: [
        Query,
        Mutation/*dna-@private*//*dna-@custom-inputs-import*//*dna-@custom-types-import*//*dna-@live-import*/
    ],
    prisma: {
        datamodelInfo,
        client: prisma,
    },
    outputs: {
        schema: path.join(__dirname, './schema.graphql'),
        typegen: path.join(__dirname, './nexus.ts'),
    },
    nonNullDefaults: {
        input: false,
        output: false,
    },
    typegenAutoConfig: {
        sources: [
            {
                source: path.join(__dirname, './types.ts'),
                alias: 'types',
            },
        ],
        contextType: 'types.Context',
    },
})`,

        server: `
export default new ApolloServer({
    schema: applyMiddleware(schema, shield(dnaShield)),
    // @ts-ignore
    context: ContextBuilder
})`,
    }

    postBuild(file:string){
        return file
    }

    postSchema(schema:string){
        return schema
    }

    handleScalar({name}){
    }

    handleInput({name, fields}){
    }

    handleType({type, value, decorators}) {
        if(value) this.schema[type] = value
    }

    handleField({type, field, value, decorators, fieldType}) {
    }

    buildFile(file: string) {
        const queryParams = []
        const mutationParams = []
        Object.keys(this.schema).forEach(type => {
            if(typeof this.schema[type] === "string"){
                this.schema[type].split(",").forEach(rule => {
                    const cleanRule = rule.trim()
                    const queryName = type.charAt(0).toLowerCase() + type.slice(1)
                    if(cleanRule === "get"){
                        queryParams.push("'"+queryName+"'")
                    } else if(cleanRule === "gets") {
                        queryParams.push("'"+queryName + "s'")
                        queryParams.push("'"+queryName+ "sConnection'")
                    } else {
                        if(rule.indexOf("Many")!== -1){
                            mutationParams.push("'"+rule.trim()+type+"s'")
                        } else {
                            mutationParams.push("'"+rule.trim()+type+"'")
                        }
                    }
                })
            } else {
                const queryName = type.charAt(0).toLowerCase() + type.slice(1)
                queryParams.push("'"+queryName+"'")
                queryParams.push("'"+queryName + "s'")
                queryParams.push("'"+queryName+ "sConnection'")
                mutationParams.push("'create"+type+"'")
                mutationParams.push("'update"+type+"'")
                mutationParams.push("'delete"+type+"'")
                mutationParams.push("'updateMany"+type+"s'")
                mutationParams.push("'deleteMany"+type+"s'")
            }
        })
        this.file.body = `
const Query = prismaObjectType({
    name: 'Query',
    definition: (t) => {
        t.prismaFields([`+ queryParams.join(",") +`])
        /*dna-@custom-Query*/
    }
})
const Mutation = prismaObjectType({
    name: 'Mutation',
    definition: (t) => {
        t.prismaFields([`+ mutationParams.join(",") +`])
        /*dna-@custom-Mutation*/
    }
})`
        return {
            imports: this.file.imports,
            body: this.file.body + this.file.schema + this.file.server
        }
    }
}