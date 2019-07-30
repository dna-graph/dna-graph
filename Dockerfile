FROM node:12-alpine

COPY . /srv/app

WORKDIR /srv/app

RUN npm i && chmod +x entrypoint.sh

ENTRYPOINT ["sh", "entrypoint.sh"]

CMD npm run start
