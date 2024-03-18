const { ApiGatewayManagementApi } = require("@aws-sdk/client-apigatewaymanagementapi");
const { DynamoDBDocument } = require("@aws-sdk/lib-dynamodb");
const { DynamoDB } = require("@aws-sdk/client-dynamodb");
const util = require('util');

const TABLES_NAMES = {
  USER: "UsersTables",
  MESSAGE: "MessagesTables",
  CONNECTION: "ConnectionsTables"
}

const DYNAMODBCLIENT = DynamoDBDocument.from(new DynamoDB());

const API_GATEWAY = new ApiGatewayManagementApi({
  endpoint: util.format(util.format('https://%s', process.env.WSSAPIGATEWAYENDPOINT))
});

const RESPONSE_OK = {
  statusCode: 200,
  body: "SUCCESS CUSTOM REQUEST",
};

const RESPONSE_FORBIDDEN = {
  statusCode: 403,
  body: "FAILED CUSTOM REQUEST",
};

module.exports = {
  TABLES_NAMES,
  DYNAMODBCLIENT,
  API_GATEWAY,
  RESPONSE_OK,
  RESPONSE_FORBIDDEN
}