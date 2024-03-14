'use strict';
const AWS = require('aws-sdk');
// const { v4 } = require('uuid')

// const UUID = v4()
// const DATE = new Date().toISOString()
const TABLE_NAME = "UsersTable"
const DYNAMODB = new AWS.DynamoDB.DocumentClient();

// module.exports.register = async (event) => {
//   const { username } = JSON.parse(event.body);

//   if (!username) {
//     return {
//       statusCode: 400,
//       body: JSON.stringify(
//         {
//           error: 'Validate the form fiels',
//         },
//         null,
//         2
//       ),
//     }
//   }

//   await DYNAMODB.put({
//     TableName: TABLE_NAME,
//     Item: {
//       connectionId: "-",
//       username,
//       createdAt: DATE
//     }
//   }).promise()

//   return {
//     statusCode: 200,
//     body: JSON.stringify(
//       {
//         message: 'Your register executed successfully!!',
//       },
//       null,
//       2
//     ),
//   }
// };

module.exports.login = async (event) => {
  const { username } = JSON.parse(event.body);

  const listUsers = await DYNAMODB
    .scan({
      TableName: TABLE_NAME,
    })
    .promise();

    
  const user = listUsers.Items.find((user) => user.username === username )

  if (!user) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: "User not found, register new!" }),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true, contact: user.username }),
  };
}