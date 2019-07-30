# DNA Graph: GraphQL Backend with 1 File

## What is this ?
`DNA Graph` is a full `GraphQL` backend generator based on one file: the DNA (`dna.graphql`)

## Features
`DNA Graph` introduce special decorators to auto-generate the backend :

* `@auto`: Auto generate `GraphQL CRUD` `Mutation` & `Query` for a `type`
* `@private`: Hide a `field` or a `type` to the front `GraphQL Server`
* `@live`: Enable `Subscription` for the tagged `type` 
* `@shield`: Add custom security rules to `type` or `field`
* `@custom`: Define custom resolvers for custom code

## Start

**First of all you need to fork this repo to use DNA Server and receive update**

### Strucuture

* `/dna`: Core of the Generator, include each `decorators`
* `/src/fakes`: Fake ojects
* `/src/resolvers`: Custom code for types and fields
* `/src/shields`: Custom code for shields
* `/src/dna/`: `GraphQL` files that define your dna

### Commands

* `make start`: Generate and start the project, `GraphQL Playground` available on `http://localhost:4000`
* `make stop`: Stop the project
* `make down`: Down the project (delete the database)
* `make generate`: Generate/Re-Generate the project
* `make update`: Update the project based on the DNA after you launch a `make start`
* `make logs`: Access to server logs
* `make fake`: Launch the faker server
* `make example`: Similar to `make fake` but **use only**

## Example

> /src/dna/index.graphql

```graphql
type Query @shield(all) {
    users: [User] @shield(isAdmin)
}

type Mutation @shield(all) {
    deleteUser: User @shield(isAdmin)
    # This override the default security rule of @auto(create) 
    createUser: User @shield(not(isAuth))
}

type User @shield(or(isAdmin, isSelf)) @live @auto(create, get, gets, update, updateMany) {
    id: ID! @id
    createdAt: DateTime! @createdAt
    updatedAt: DateTime! @updatedAt
    name: String 
    age: Float
    notes: [String] @shield(isAdmin)
    posts: [Post] @relation(link: INLINE)
    secureData: [String] @private
}

type Post @shield(isOwner) {
    id: ID! @id
    content: String
}
```

## Decorators
*Decorators is the fuel of your DNA, with decorators you can describe how works your backend: CRUD, Realtime, Security, Custom code etc...*

## Prisma Decorators
`DNA Graph` is based on `Prisma`, you can use all directives of the `Prisma Datamodel` spec: [Prisma Datamodel Doc](https://www.prisma.io/docs/1.31/releases-and-maintenance/features-in-preview/datamodel-v11-b6a7/)

### @shield: Security
The `@shield` is based on `graphql-shield` package: [https://github.com/maticzav/graphql-shield](https://github.com/maticzav/graphql-shield)

`@shield` works on:

* `type`: Secure a type access for all `fields`
* `field`: Define a security rule for a field

When you define a `@shield` on a `type` or a `field` ou need to implement it in `/src/shields/index.ts` with the same name.

**IMPORTANT: A `@shield` function can be executed before and after the object get, when it append before (parent is undefined, on Mutation for example) your security must be based on `args`, in an after use case (parent is defined) you security must be based on `parent`**

Ex:

> dna.graphql

```graphql
type User @shield(isSelf) {
	id: ID! @id
	name: String
}
```
Then we need to define and export a function named `isSelf` in the `/src/shields/index.ts`

> /src/shields/index.ts
 
```js
import { rule } from "graphql-shield"
import { Context } from "@generated/types"
import { getWhere } from "../utils/Where"

// rule() and cache is managed by graphql-shield for more information visit: https://github.com/maticzav/graphql-shield
export const isSelf = rule({cache: "strict"})(async (parent, args, ctx:Context, info) => {
	// Check if the user is connected
	if(!ctx.userId) throw new Error("You need to be connected")
	
	// When parent exist it seems that the security occur after the get of the object
	if(parent && parent.id === ctx.userId) return true
	
	// A variant check for subscription shield
	if(parent && parent && parent.node.id === ctx.userId) return true
	
	// When parent is undefined the security occur before the get so we need to check the args of the query
	const where = getWhere(args, ctx)
	if(!parent && where && where.id === ctx.userId) return true
	
	// Always return false by default for security reasons
	return false
})
```

### @auto: CRUD operations
With `@auto` you can choose wich CRUD operation you want to expose to final clients

`@auto` works on:

* `type`: Define CRUD operations

Allowed operations are:

* `get`: Get one object, DNA under the hood will generate `Query` field like `user(...): User` for a `UserType` 
* `gets`: Get mutiple objects (pagination included), DNA under the hood will generate `Query` field like `users(...): [User]` and `usersConnection: UserConnection`
* `create`: Create an object, DNA under the hood will generate `Mutation` field like `createUser(...): User`
* `update`: Update an object, DNA under the hood will generate `Mutation` field like `update(...): User`
* `updateMany`: Update multiple objects, DNA under the hood will generate `Mutation` field like `updateManyUsers(...): [User]`
* `upsertUser(...): User`: Upsert an object, DNA under the hood will generate `Mutation` field like `updateUser(...): User`
* `delete`: Delete one object, DNA under the hood will generate `Mutation` field like `deleteUser(...): User` 
* `deleteMany`: Delete many objects, DNA under the hood will generate `Mutation` field like `deleteManyUsers(...): [User]`

When you use:

* `@auto`: All CRUD will be created
* `@auto(get, update)`: Only mentionned CRUD operations will be included

Ex:

> dna.graphql
 
```graphql
type User @shield(isSelf) @auto(get, update) {
	id: ID! @id
	name: String
}
```
```graphql
type User @shield(isSelf) @auto {
	id: ID! @id
	name: String
}
```

Tricks: You can define a security `@shield` on specific CRUD operation, you need to add the specials types `Mutation` and `Query` to your DNA
> Note: The `all` `@shield` must be implemented in `/src/shields` and always return `true`

> dna.graphql
 
```graphql
type User @shield(isSelf) @auto(get, update, create) {
	id: ID! @id
	name: String
}

type Mutation @shield(all) {
	createUser: User @shield(isAdmin)
	updateUser: User @shield(or(isSelf, isAdmin))
}

type Query @shield(all) {
	user: User @shield(or(isSelf, isAdmin))
}
```

### @private: For backend stuff
With `@private` you can hide fields to final `GraphQL Server`

`@private` works on:

* `type`: Hide a full type and all his CRUD operations from clients
* `field`: Hide the field and all his CRUD operations from clients


Here the `SecureData` is totally not reachable by clients

> dna.graphql
 
```graphql
type User @auto @shield(or(isAdmin, isSelf)) {
	id: ID! @id
	name: String
	secureData: [SecureData] @private
}

type SecureData @private {
	id: ID! @id
	content: String
}
```


### @live: Realtime data
If you want to listen data changes from a `type` for realtime stuff (like Notification) you can use the `@live`
`@live` works on:

* `type`: Enable a `GraphQL Subscription` on the type with a query engine

**Note: For use the `@live` security you need to specify a `@shield` on the `type`. `@live` use this shield to authorize and manage connections**

> dna.graphql
 
```graphql
type User @auto @shield(or(isAdmin, isSelf)) @live {
	id: ID! @id
	name: String
	secureData: [SecureData] @private
}
```



### @custom: Custom DNA & Code
You need custom logic like:

* custom `field` on a `type`: To modify data, get extra data fom another API etc...
* custom `type`: Create virtual `type` or get a full `type` from another API
* custom Mutation: To modify data with custom logic
* custom Query: To return data with custom logic

`@custom` works on:

* `type`: Define a custom type (you need to implement all resolvers)
* `field`: Define a custom field (you need to implement the resolver of this field)

For each `@custom` you need to implement the `GraphQL Resolver` in the `/src/resolvers`. It's important to use the same names in the exports.

Here we will implement a custom `signUp` method with a virtual `type` (not stored in db) `AuthPayload`

> dna.graphql
 
```graphql
type Mutation @shield(all) {
	signup(name: String, data: SignupInput): AuthPayload @custom
}

input SignupInput {
	email: String!
	password: String!
}

type AuthPayload @custom {
	token: String
}

type User @auto(update, get) @shield(or(isAdmin, isSelf)) {
	id: ID! @id
	name: String
	secureData: [SecureData] @private
}

type SecureData @private {
	id: ID! @id
	content: String
}
```

> /src/resolvers/index.ts

```js
import Mutation from "./Mutation"
import AuthPayload from "./AuthPayload"

export default {
	AuthPayload,
	Mutation
}
```

> /src/resolvers/Mutation.ts

```js
export default {
    signup: async (parent, { name, input: { email, password }}, ctx) => {
        const hashedPassword = await hash(password, 10)
        const user = await ctx.prisma.createUser({
            name,
            email,
            password: hashedPassword,
        })
        return {token: sign({ userId: user.id }, process.env.APP_SECRET)}
    }
}
```

> /src/resolvers/AuthPayload.ts

```js
export default {
	token: signup: async (parent, args, ctx) => {
		// Default resolver, parent come from `signup` resolver 
		// Custom code here
		return parent.token
	}
}
```
## Faker
`DNA Graph` support fake mode, you can define fake data for development purpose (ex: front developper).
You can define fake data in `src/fakes/index.ts`

Launch the faker with: `make fake`

> /src/fakes/index.ts

```js
export default {
	
	// Set all `id` fields to this value by default
	id: ["AZertY12345"],
	
	// Define fake data for a particular type
	User : {
	
		// Override the default `id` fake data
		id: ["66463gsg"],
		email : ["x2030aigle@gmail.com","antoine@boby.io"]
	},
	
	// Set default values
	createdAt: (new Date()).toISOString(),
	updatedAt: (new Date()).toISOString()
}
```

## Default Systems
You can find in the `/default` folder many files with default logic inside.

Some of this default files are imported in the `/src` folder to make setup easy (for example the `/src/utils/Context.ts`)
You can define your own logic if you want. To avoid bugs use the default files as a temple for your custom systems.

## Techs
`DNA Graph` is based on:

* NodeJS
* GrapQL
* Prisma
* GraphQL Shield
* Nexus
* MongoDB


