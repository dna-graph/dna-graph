
export const getWhere = (args, ctx) => {
	if(ctx.isSub){
		if(args && args.where && args.where.node){
			return args.where.node
		}
	} else {
		if(args && args.where){
			return args.where
		}
	}
	return null
}