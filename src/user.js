'use strict';
const AWS = require('aws-sdk');

const TABLE_NAME = "UsersTable"
const DYNAMODB = new AWS.DynamoDB.DocumentClient();

module.exports.getUsers = async () => {
  const listUsers = await DYNAMODB
    .scan({
      TableName: TABLE_NAME,
    })
    .promise();

  return {
    statusCode: 200,
    body: JSON.stringify(
      {
        users: listUsers.Items || [],
      },
      null,
      2
    ),
  }
}