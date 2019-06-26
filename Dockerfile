FROM node:12-alpine

COPY . /srv/app

WORKDIR /srv/app

RUN npm i

CMD npm run start