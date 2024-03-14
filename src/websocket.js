'use strict';
const AWS = require("aws-sdk");
const { v4 } = require('uuid');
const { getUsers } = require('./user')

const TABLE_NAMES = {
  USERS: "UsersTable",
  MESSAGES: "MessagesTable"
}

const DYNAMODB = new AWS.DynamoDB.DocumentClient();

const API_GATEWAY = new AWS.ApiGatewayManagementApi({
  endpoint: process.env.WSSAPIGATEWAYENDPOINT
});

const responseOK = {
  statusCode: 200,
  body: "",
};

const responseForbidden = {
  statusCode: 403,
  body: "",
};

module.exports.handler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const routeKey = event.requestContext.routeKey;

  try {
    switch (routeKey) {
      case "$connect":
        return handleConnect(connectionId, event.queryStringParameters);
      case "$disconnect":
        return handleDisconnect(connectionId);
      case "getContacts":
        return handleGetContacts(connectionId);
      case "sendMessage":
        return handleSendMessage(
            await getContact(connectionId),
            parseSendMessageBody(event.body),
          );
        case "getMessages":
          return handleGetMessages(
              await getContact(connectionId),
              parseGetMessageBody(event.body),
            );
      default:
        return {
          statusCode: 403,
          body: "Error in switch routeKey",
        };
    }
  } catch (e) {
    if (e) {
      await postToConnection(
        connectionId,
        JSON.stringify({ type: "error", message: e.message }),
      );
      return responseOK;
    }

    throw e;
  }
};

const handleConnect = async (queryParameters) => {
  if (!queryParameters || !queryParameters["username"]) {
    return {
      statusCode: 404,
      body: "$connect need query parameter ?username=value",
    };
  }

  const existingConnectionId = await getConnectionIdByUsername(queryParameters["username"]);
  if ( existingConnectionId &&
    (await postToConnection(
      existingConnectionId,
      JSON.stringify({ type: "ping" }),
    ))
  ) {
    return responseForbidden;
  }

  await DYNAMODB
    .put({
      TableName: TABLE_NAMES.USERS,
      Item: {
        connectionId,
        username: queryParameters["username"],
      },
    })
    .promise();

  await notifyContactChange(connectionId);

  return responseOK;
};

const notifyContactChange = async (excludedConnectionId) => {
  const contacts = await getUsers();

  await Promise.all(
    contacts.map(async (c) => {
      if (excludedConnectionId === c.connectionId) {
        return;
      }

      await postToConnection(
        c.connectionId,
        JSON.stringify({ type: "contacts", value: contacts }),
      );
    }),
  );
};

const postToConnection = async (connectionId, messageBody) => {
  try {
    await API_GATEWAY
      .postToConnection({
        ConnectionId: connectionId,
        Data: messageBody,
      })
      .promise();

    return true;
  } catch (e) {
    if (isConnectionNotExistError(e)) {
      await DYNAMODB
        .delete({
          TableName: TABLE_NAMES.USERS,
          Key: {
            connectionId,
          },
        })
        .promise();

      return false;
    } else {
      throw e;
    }
  }
};

const isConnectionNotExistError = (e) =>
  (e).statusCode === 410;

const handleDisconnect = async (connectionId) => {
  await DYNAMODB
    .delete({
      TableName: TABLE_NAMES.USERS,
      Key: {
        connectionId,
      },
    })
    .promise();

  await notifyContactChange(connectionId);

  return responseOK;
};

const handleGetContacts = async (connectionId) => {
  await postToConnection(
    connectionId,
    JSON.stringify({
      type: "contacts",
      value: await getUsers(),
    }),
  );

  return responseOK;
};

const handleSendMessage = async (client, body) => {
  const usernameTousername = getUsernameToUsername([
    client.username,
    body.recipientUsername,
  ]);

  await DYNAMODB
    .put({
      TableName: TABLE_NAMES.MESSAGES,
      Item: {
        messageId: v4(),
        usernameToUsername: usernameTousername,
        message: body.message,
        sender: client.username,
        createdAt: new Date().toISOString(),
      },
    })
    .promise();

  const recipientConnectionId = await getConnectionIdByUsername(
    body.recipientUsername,
  );

  if (recipientConnectionId) {
    await API_GATEWAY
      .postToConnection({
        ConnectionId: recipientConnectionId,
        Data: JSON.stringify({
          type: "message",
          value: {
            sender: client.username,
            message: body.message,
          },
        }),
      })
      .promise();
  }

  return responseOK;
};

const getContact = async (connectionId) => {
  const output = await DYNAMODB
    .get({
      TableName: TABLE_NAMES.USERS,
      Key: {
        connectionId,
      },
    })
    .promise();

  if (!output.Item) {
    throw new HandlerError("client does not exist");
  }

  return output.Item;
};

const parseSendMessageBody = (body) => {
  const sendMsgBody = JSON.parse(body || "{}");

  if (!sendMsgBody || !sendMsgBody.recipientUserame || !sendMsgBody.message) {
    throw new HandlerError("invalid SendMessageBody");
  }

  return sendMsgBody;
};

const getUsernameToUsername = (names) =>
  names.sort().join("#");

const getConnectionIdByUsername = async (username) => {
  const output = await DYNAMODB
    .query({
      TableName: TABLE_NAMES.USERS,
      IndexName: "UsernameIndex",
      KeyConditionExpression: "#username = :username",
      ExpressionAttributeNames: {
        "#username": "username",
      },
      ExpressionAttributeValues: {
        ":username": username,
      },
    })
    .promise();
  
  return output.Items && output.Items.length > 0
    ? output.Items[0].connectionId
    : undefined;
};

const handleGetMessages = async (client, body) => {
  const output = await DYNAMODB
    .query({
      TableName: TABLE_NAMES.MESSAGES,
      IndexName: "UsernameToUsernameIndex",
      KeyConditionExpression: "#usernameToUsername = :usernameToUsername",
      ExpressionAttributeNames: {
        "#usernameToUsername": "usernameToUsername",
      },
      ExpressionAttributeValues: {
        ":usernameToUsername": getUsernameToUsername([
          client.username,
          body.targetName,
        ]),
      },
      Limit: body.limit,
      ExclusiveStartKey: body.startKey,
      ScanIndexForward: false,
    })
    .promise();

  await postToConnection(
    client.id,
    JSON.stringify({
      type: "messages",
      value: {
        messages: output.Items && output.Items.length > 0 ? output.Items : [],
        lastEvaluatedKey: output.LastEvaluatedKey,
      },
    }),
  );

  return responseOK;
};

const parseGetMessageBody = (body) => {
  const getMessagesBody = JSON.parse(body || "{}");

  if (
    !getMessagesBody ||
    !getMessagesBody.targetName ||
    !getMessagesBody.limit
  ) {
    throw new HandlerError("invalid GetMessageBody");
  }

  return getMessagesBody;
};