export default {
	
	otherText: async ( parent, args, ctx) => {
		return "Un texte static"
	},

	otherAge: async ( parent, { text }, ctx) => {
		return 12
	},

	otherPrice: async ( parent, { text }, ctx) => {
		return 12.4
	}
}
