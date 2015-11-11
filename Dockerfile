FROM node:latest

RUN apt-get update

RUN apt-get install -y nodejs build-essential npm git git-core

ADD http://fumasa.org/molduras/start.sh /tmp/

RUN chmod +x /tmp/start.sh

CMD sh /tmp/start.sh