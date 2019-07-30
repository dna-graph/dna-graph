sleep 5

npm run generate
npm run prisma-generate
npm run prisma-deploy

exec "$@"
