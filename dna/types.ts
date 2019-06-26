export interface IHandleTypeArgs {
    type: string
    value: string | boolean
    decorators: string[]
}

export interface IHandleFieldArgs {
    type: string
    value: string | boolean
    decorators: string[]
    field: string
    fieldType: string
    isList: boolean
    args: GraphQLArg[]
}

export interface GraphQLArg {
    name: string
    type: string
}

export interface IBuildFileResult {
    imports: string
    body: string
}

export interface IDecorator {
    identifier: string
    postSchema(schema:string): string
    postBuild(file:string): string
    handleType(args:IHandleTypeArgs): void
    handleField(args: IHandleFieldArgs): void   
    buildFile(file:string): IBuildFileResult
}