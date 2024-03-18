'use strict';
const { TABLES_NAMES, DYNAMODBCLIENT } = require("./utils/const");

module.exports.getUsers = async () => {
  const listUsers = await DYNAMODBCLIENT
    .scan({
      TableName: TABLES_NAMES.USER,
    });

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