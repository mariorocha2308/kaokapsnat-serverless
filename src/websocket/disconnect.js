const { RESPONSE_OK, TABLES_NAMES, DYNAMODBCLIENT } = require("../utils/const");
const { notifyContactChange } = require("./helpers");

const handleDisconnect = async (connectionId) => {

  await DYNAMODBCLIENT
  .delete({
    TableName: TABLES_NAMES.CONNECTION,
    Key: {
      connId: connectionId,
    },
  })

  await notifyContactChange(connectionId);

  return RESPONSE_OK;
};

module.exports = { handleDisconnect }