// const AWS = require("aws-sdk");
// const { v4 } = require('uuid');

// const TABLE_NAMES = {
//   USERS: "UserTable",
//   MESSAGES: "Messages"
// }

// const DYNAMODB = new AWS.DynamoDB.DocumentClient();

// const API_GATEWAY = new AWS.ApiGatewayManagementApi({
//   endpoint: process.env.API_GATEWAY_KEY,
// });

// const responseOK = {
//   statusCode: 200,
//   body: "",
// };

// const responseForbidden = {
//   statusCode: 403,
//   body: "",
// };

// module.exports.handler = async (event) => {

//   const connectionId = event.requestContext.connectionId;
//   const routeKey = event.requestContext.routeKey;

//   try {
//     switch (routeKey) {
//       case "$connect":
//         return handleConnect(connectionId, event.queryStringParameters);
//       case "$disconnect":
//         return handleDisconnect(connectionId);
//       case "getClients":
//         return handleGetClients(connectionId);
//       case "sendMessage":
//         return handleSendMessage(
//           await getClient(connectionId),
//           parseSendMessageBody(event.body),
//         );
//       case "getMessages":
//         return handleGetMessages(
//           await getClient(connectionId),
//           parseGetMessageBody(event.body),
//         );
//       default:
//         return responseForbidden;
//     }
//   } catch (e) {
//     if (e) {
//       await postToConnection(
//         connectionId,
//         JSON.stringify({ type: "error", message: e.message }),
//       );
//       return responseOK;
//     }

//     throw e;
//   }
// };

// const handleConnect = async (connectionId, queryParameters) => {
//   if (!queryParameters || !queryParameters["name"]) {
//     return responseForbidden;
//   }

//   const existingConnectionId = await getConnectionIdByNickname(
//     queryParameters["name"],
//   );
//   if (
//     existingConnectionId &&
//     (await postToConnection(
//       existingConnectionId,
//       JSON.stringify({ type: "ping" }),
//     ))
//   ) {
//     return responseForbidden;
//   }

//   await DYNAMODB
//     .put({
//       TableName: TABLE_NAMES.USERS,
//       Item: {
//         connectionId,
//         name: queryParameters["name"],
//       },
//     })
//     .promise();

//   await notifyClientChange(connectionId);

//   return responseOK;
// };

// const notifyClientChange = async (excludedConnectionId) => {
//   const clients = await getUsers();

//   await Promise.all(
//     clients.map(async (c) => {
//       if (excludedConnectionId === c.connectionId) {
//         return;
//       }

//       await postToConnection(
//         c.connectionId,
//         JSON.stringify({ type: "clients", value: clients }),
//       );
//     }),
//   );
// };

// const postToConnection = async (connectionId, messageBody) => {
//   try {
//     await API_GATEWAY
//       .postToConnection({
//         ConnectionId: connectionId,
//         Data: messageBody,
//       })
//       .promise();

//     return true;
//   } catch (e) {
//     if (isConnectionNotExistError(e)) {
//       await DYNAMODB
//         .delete({
//           TableName: TABLE_NAMES.USERS,
//           Key: {
//             connectionId: connectionId,
//           },
//         })
//         .promise();

//       return false;
//     } else {
//       throw e;
//     }
//   }
// };

// const isConnectionNotExistError = (e) =>
//   (e).statusCode === 410;

// const handleDisconnect = async (connectionId) => {
//   await DYNAMODB
//     .delete({
//       TableName: TABLE_NAMES.USERS,
//       Key: {
//         connectionId,
//       },
//     })
//     .promise();

//   await notifyClientChange(connectionId);

//   return responseOK;
// };

// const handleGetClients = async (connectionId) => {
//   await postToConnection(
//     connectionId,
//     JSON.stringify({
//       type: "clients",
//       value: await getAllClients(),
//     }),
//   );

//   return responseOK;
// };

// const handleSendMessage = async (client, body) => {
//   const nicknameToNickname = getNicknameToNickname([
//     client.nickname,
//     body.recipientNickname,
//   ]);

//   await DYNAMODB
//     .put({
//       TableName: TABLE_NAMES.MESSAGES,
//       Item: {
//         messageId: v4(),
//         nicknameToNickname,
//         message: body.message,
//         sender: client.nickname,
//         createdAt: new Date().getTime(),
//       },
//     })
//     .promise();

//   const recipientConnectionId = await getConnectionIdByNickname(
//     body.recipientNickname,
//   );

//   if (recipientConnectionId) {
//     await API_GATEWAY
//       .postToConnection({
//         ConnectionId: recipientConnectionId,
//         Data: JSON.stringify({
//           type: "message",
//           value: {
//             sender: client.nickname,
//             message: body.message,
//           },
//         }),
//       })
//       .promise();
//   }

//   return responseOK;
// };

// const getClient = async (connectionId) => {
//   const output = await DYNAMODB
//     .get({
//       TableName: TABLE_NAMES.USERS,
//       Key: {
//         connectionId,
//       },
//     })
//     .promise();

//   if (!output.Item) {
//     throw new HandlerError("client does not exist");
//   }

//   return output.Item;
// };

// const parseSendMessageBody = (body) => {
//   const sendMsgBody = JSON.parse(body || "{}");

//   if (!sendMsgBody || !sendMsgBody.recipientNickname || !sendMsgBody.message) {
//     throw new HandlerError("invalid SendMessageBody");
//   }

//   return sendMsgBody;
// };

// const getNicknameToNickname = (nicknames) =>
//   nicknames.sort().join("#");

// const getConnectionIdByNickname = async (
//   nickname,
// ) => {
//   const output = await DYNAMODB
//     .query({
//       TableName: TABLE_NAMES.USERS,
//       IndexName: "NicknameIndex",
//       KeyConditionExpression: "#nickname = :nickname",
//       ExpressionAttributeNames: {
//         "#nickname": "nickname",
//       },
//       ExpressionAttributeValues: {
//         ":nickname": nickname,
//       },
//     })
//     .promise();

//   return output.Items && output.Items.length > 0
//     ? output.Items[0].connectionId
//     : undefined;
// };

// const handleGetMessages = async (client, body) => {
//   const output = await DYNAMODB
//     .query({
//       TableName: TABLE_NAMES.MESSAGES,
//       IndexName: "NicknameToNicknameIndex",
//       KeyConditionExpression: "#nicknameToNickname = :nicknameToNickname",
//       ExpressionAttributeNames: {
//         "#nicknameToNickname": "nicknameToNickname",
//       },
//       ExpressionAttributeValues: {
//         ":nicknameToNickname": getNicknameToNickname([
//           client.nickname,
//           body.targetNickname,
//         ]),
//       },
//       Limit: body.limit,
//       ExclusiveStartKey: body.startKey,
//       ScanIndexForward: false,
//     })
//     .promise();

//   await postToConnection(
//     client.connectionId,
//     JSON.stringify({
//       type: "messages",
//       value: {
//         messages: output.Items && output.Items.length > 0 ? output.Items : [],
//         lastEvaluatedKey: output.LastEvaluatedKey,
//       },
//     }),
//   );

//   return responseOK;
// };

// const parseGetMessageBody = (body) => {
//   const getMessagesBody = JSON.parse(body || "{}");

//   if (
//     !getMessagesBody ||
//     !getMessagesBody.targetNickname ||
//     !getMessagesBody.limit
//   ) {
//     throw new HandlerError("invalid GetMessageBody");
//   }

//   return getMessagesBody;
// };