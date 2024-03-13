'use strict';
const { v4 } = require('uuid');
const AWS = require('aws-sdk');
const bcrypt = require("bcrypt");

const ID = v4();
const ITERATIONS = 12;
const TABLE_NAME = "Users"
const DATE = new Date().getTime()
const DYNAMODB = new AWS.DynamoDB.DocumentClient();

module.exports.hashPassword = async (password) => {
    const hash = await bcrypt.hash(password, ITERATIONS);
    return hash;
  };
  
module.exports.matchPassword = async (password, hash) => {
  const match = await bcrypt.compare(password, hash);
  return match;
};

module.exports.register = async (event) => {
  
  const { name, phone, password } = JSON.parse(event.body);
  const hashpass = await this.hashPassword(password);

  if (!name || !phone || !password) {
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

  const newUser = {
    id: ID,
    name,
    phone,
    password: hashpass,
    createdAt: DATE
  }

  await DYNAMODB.put({
    TableName: TABLE_NAME,
    Item: newUser
  }).promise()

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
  const { phone, password } = JSON.parse(event.body);

  const { Item } = await DYNAMODB.get({
    TableName: TABLE_NAME,
    Key: { phone }
  })
    .promise();

  if (!Item) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: "User not found" }),
    };
  }

  const { name, password: hashedPassword } = Item;
  const matchedPassword = await this.matchPassword(password, hashedPassword);

  if (matchedPassword) {
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, contact: name }),
    };
  } else {
    return {
      statusCode: 401,
      body: JSON.stringify({ success: false, error: "Incorrect password" }),
    };
  }
}