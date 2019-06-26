import User from "./User"
import Mutation from "./Mutation"
import CustomType from "./CustomType"
import DefaultAuth from "../utils/Auth"
import Query from "./Query"

export default {
	User,
	Mutation: {...DefaultAuth, ...Mutation},
	CustomType,
	Query
}