# Start the server (generation included)
start:
	@make generate && docker-compose up -d && sleep 5 && make deploy
# Down server
down:
	@docker-compose down
# Restart server
restart:
	@make down && make start
# Stop server
stop:
	@docker-compose stop
# Build server
build:
	@docker-compose build --no-cache
# Deploy Prisma
deploy:
	@docker-compose run --rm server npm run prisma-deploy
# Genertate the DNA
gendna:
	@docker-compose run --rm server npm run generate
# Install NodeJS Package: make install p=express
install:
	@docker-compose run --rm server npm i $1 --save
# Generate all the project
generate:
	@make gendna && docker-compose run --rm server npm run prisma-generate
# Update Server Prisma
update:
	@make generate && make deploy
# Access to logs
logs:
	@docker-compose logs -f server
# Access to logs
prisma-logs:
	@docker-compose logs -f prisma
# Run the Faker
fake:
	@make start && make down && make example
example:
	@docker-compose run --rm server npm run fake-generate && docker run -p=9002:9002 -v=${PWD}:/workdir apisguru/graphql-faker generated/faker.graphql
# Test
test:
	@docker-compose run --rm server npm run test 
