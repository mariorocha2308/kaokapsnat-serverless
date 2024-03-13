'use strict';
const AWS = require('aws-sdk');

const TABLE_NAME = "Users"
const DYNAMODB = new AWS.DynamoDB.DocumentClient();

module.exports.getUsers = async () => {
  const listUsers = await DYNAMODB
    .scan({
      TableName: TABLE_NAME,
    })
    .promise();

  return {
    statusCode: 400,
    body: JSON.stringify(
      {
        users: listUsers.Items || [],
      },
      null,
      2
    ),
  }
}