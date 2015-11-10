FROM ubuntu:14.04

RUN apt-get update

RUN apt-get install -y nodejs npm git git-core

ADD start.sh /tmp/

RUN chmod +x /tmp/start.sh

RUN sh /tmp/start.sh