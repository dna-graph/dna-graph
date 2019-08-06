# @shield: Security
The `@shield` is based on `graphql-shield` package: [https://github.com/maticzav/graphql-shield](https://github.com/maticzav/graphql-shield)

`@shield` works on:

* `type`: Secure a type access for all `fields`
* `field`: Define a security rule for a field

When you define a `@shield` on a `type` or a `field` ou need to implement it in `/src/shields/index.ts` with the same name and follow the `IDNAShield`.

```js
interface IDNAShield {
	// This function triggered everytime and before onQuery, onMutation, onSubscription, onNode
	onAll(context?: Context): Promise<boolean | undefined>
	// This function triggered when the security involed before the Query
	onQuery(where:any?, context?: Context, info?: any): Promise<boolean | undefined>
	// This function triggered when the security involed before the Mutation
	onMutation(nodeBeforeUpdate?:any, data?: any, context?: Context?, info?: any): Promise<boolean | undefined>
	// This function triggered when the security involed before the Subscription
	onSubscription(where?:any, context?: Context, info?: any): Promise<boolean | undefined>
	// This function triggered when the security involed before sending response, parent defined
	onNode(node?: any, args?: any, context?: Context, info?: any): Promise<boolean | undefined>
	
	// NOTE: If onNode, onQuery, onMutation, onSubscription return undefined, return false or throw an error the request denied
}
```

Ex:

> dna.graphql

```graphql
type User @shield(isSelf) {
	id: ID! @id
	name: String
}
```
Then we need to define and export a class named `isSelf` in the `/src/shields/index.ts`

> /src/shields/index.ts
 
```js
import Context from "@default/Context"
// rule() and cache is managed by graphql-shield for more information visit: https://github.com/maticzav/graphql-shield
export class isSelf implements IDNAShield {

	async onAll(context: Context) {
		if(context.userId) return true
		throw "You need to be connected"
	}

	async onQuery(where, context: Context) {
		if(where && where.id === context.userId) return true
	}

	async onMutation(nodeBeforeUpdate, data) {
		if(nodeBeforeUpdate.id === context.userId) return true
	}

	async onSubscription(where) {
		if(where.node.id === context.userId) return true
	}

	async onNode(node) {
		if(node.id === context.userId) return true
	}
}
```