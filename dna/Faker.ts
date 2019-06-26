import * as fsRead from "fs-readfile-promise"
import { writeFile } from "fs"
import Fakes from "@src/fakes"

class Faker {

	schema = ""
	types = {}
	fields = {}

	constructor(){
		this.genFakedSchema()
	}

	async genFakedSchema() {	

		this.schema = await fsRead("./generated/schema.graphql","utf8")

		// Need Refacto
		Object.keys(Fakes).forEach( key => {
			if(typeof Fakes[key] === "string"){
				this.fields[key] = [Fakes[key]]
			} else if(Array.isArray(Fakes[key])) {
				this.fields[key] = Fakes[key]
			} else if(typeof Fakes[key] === "object") {
				this.types[key] = {}
				Object.keys(Fakes[key]).forEach( field => {
					if(typeof Fakes[key][field] === "string"){
						this.types[key][field] = [Fakes[key][field]]
					} else if(Array.isArray(Fakes[key][field])) {
						this.types[key][field] = Fakes[key][field]
					} else if(Fakes[key][field] === "function"){
						const r = Fakes[key][field]()
						if(typeof r === "string"){
							this.types[key][field] = [r]
						} else if(Array.isArray(r)) {
							this.types[key][field] = r
						}
					}
				})
			} else if(typeof Fakes[key] === "function"){
				const r = Fakes[key]()
				if(typeof r === "string"){
					this.fields[key] = [r]
				} else if(Array.isArray(r)) {
					this.fields[key] = r
				}
			}
		})
		this.genTypes()
		this.write()
	}

	genTypes(){
		const stringTypes = this.schema.match(/(?<=type\s)(.*)(?=\s{)/gm)
		stringTypes.forEach( type => {
			const match = this.schema.match(new RegExp("(type "+type+" {.*(\n.*)*?\n})","gm"))
			if(match){
				let stringType = match[0]
				if(this.types[type]){
					Object.keys(this.types[type]).forEach( field => {
						stringType = this.replace(stringType, field, this.types[type][field])
					})
				}
				Object.keys(this.fields).forEach( field => {
					stringType = this.replace(stringType, field, this.fields[field])
				})
				this.schema = this.schema.replace(new RegExp("(type "+type+" {.*(\n.*)*?\n})","gm"), stringType)
			}
		})
	}

	replace(type, field, examples){
		examples = examples.map(example => "\""+example+"\"")
		const match = type.match(new RegExp("(?<="+field+".*)(@examples)","g"))
		if(match) {
			return type
		} else {
			return type.replace(new RegExp("(?<="+field+".*)(\n)","g")," @examples(values:["+examples.join(",")+"])\n") 
		}
	}

	write(){
		writeFile("./generated/faker.graphql", this.schema,() => { console.log("Faker file generated")})
	}
}

new Faker()