'use strict';
const { v4 } = require('uuid');
const { DYNAMODBCLIENT, TABLES_NAMES } = require("./utils/const");
const { hashPassword, matchPassword } = require("./utils/helpers");
const DATE = new Date().toISOString()

module.exports.register = async (event) => {

  const UID = v4()
  const { username, phone, password } = JSON.parse(event.body);
  const hashpass = await hashPassword(password);

  if (!username || !phone || !password) {
    return {
      statusCode: 400,
      body: JSON.stringify(
        {
          error: 'Validate the form fiels',
        },
        null,
        2
      ),
    }
  }

  await DYNAMODBCLIENT.put({
    TableName: TABLES_NAMES.USER,
    Item: {
      uid: UID,
      username,
      phone,
      password: hashpass,
      createdAt: DATE 
  }})

  return {
    statusCode: 200,
    body: JSON.stringify(
      {
        message: 'Your register executed successfully!!',
      },
      null,
      2
    ),
  }
};

module.exports.login = async (event) => {
  const { username, password } = JSON.parse(event.body);

  const { Items } = await DYNAMODBCLIENT
    .query({
      TableName: TABLES_NAMES.USER,
      IndexName: "UsernameIndex",
      KeyConditionExpression: "#username = :username",
      ExpressionAttributeNames: {
        "#username": "username",
      },
      ExpressionAttributeValues: {
        ":username": username
      },
      ScanIndexForward: false
    })

  if (!Items.length) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: "User not found" }),
    };
  }

  const { password: hashedPassword } = Items[0];
  const matchedPassword = await matchPassword(password, hashedPassword);

  if (matchedPassword) {
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        contact: { 
          username: Items[0].username, 
          uid: Items[0].uid
        } 
      }),
    };
  } else {
    return {
      statusCode: 401,
      body: JSON.stringify({ success: false, error: "Incorrect password" }),
    };
  }
}