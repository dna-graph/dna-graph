import Mutation from "./Mutation"
import DefaultAuth from "../utils/Auth"
import Query from "./Query"

export default {
	Mutation: {...DefaultAuth, ...Mutation},
	Query
}