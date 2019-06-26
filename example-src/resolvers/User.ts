export default {
	upperCaseName: async ( parent, args, ctx) => {
		return parent.name.toUpperCase()
	},

	nameWith: async ( parent, { text }, ctx) => {
		return parent.name + " " +text
	}
}
