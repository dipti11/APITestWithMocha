# APIDemoProject

Running the test cases on local machine.


$ docker network create lalamove-sample-api || true

$ docker rm -f lalamove-sample-api-db

$ docker run -d --net=lalamove-sample-api --name lalamove-sample-api-db lalamove/lalamove-sample-api-db:1.0

$ docker rm -f lalamove-sample-api

$ docker run -d --net=lalamove-sample-api --name lalamove-sample-api -p 51544:8000 lalamove/lalamove-sample-api:1.0

$ curl -X GET -H "Content-Type: application/json; charset=utf-8" http://localhost:51544/ping # you are successful if you get {"msg":"pong"}
{"msg":"pong"}

When the above steps are successful then directly run 'npm test' command in console.
