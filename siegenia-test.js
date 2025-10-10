const SiegeniaDevice = require("./lib/siegenia.js");
const Mapper = require("./lib/mapper.js");

const dev = new SiegeniaDevice({
  wsProtocol: "ws",
  ip: "127.0.0.1",
  port: 8080,
  logger: console.log,
});

dev.on("connected", () => {
  console.log("DEV: CONNECTED");

  dev.loginUser("user", "blubb", (err, status, data) =>
    logger(err, status, data, "login"),
  );
  dev.loginToken("my-token", (err, status, data) =>
    logger(err, status, data, "login"),
  );
  dev.logout((err, status, data) => logger(err, status, data, "logout"));
  dev.getDeviceState((err, status, data) =>
    logger(err, status, data, "getDeviceState"),
  );
  dev.resetDevice((err, status, data) =>
    logger(err, status, data, "resetDevice"),
  );
  dev.rebootDevice((err, status, data) =>
    logger(err, status, data, "rebootDevice"),
  );
  dev.renewCert((err, status, data) => logger(err, status, data, "renewCert"));
  dev.getDeviceInfo((err, status, data) =>
    logger(err, status, data, "getDevice"),
  );
  dev.getDeviceParams((err, status, data) =>
    logger(err, status, data, "getDeviceParams"),
  );
  dev.getDeviceDetails((err, status, data) =>
    logger(err, status, data, "getDeviceDetails"),
  );

  dev.setDeviceParams(
    { devicestate: { deviceactive: true } },
    (err, status, data) => logger(err, status, data, "setDeviceParams"),
  );
});
dev.on("closed", (code, reason) => {
  console.log(`DEV: CLOSED ${code} / ${reason}`);
});
dev.on("error", (error) => {
  console.log(`DEV: ERROR ${error}`);
});
dev.on("reconnected", () => {
  console.log("DEV: RECONNECT");
});
dev.on("data", (status, data, command) => {
  console.log(`DEV: DATA ${command} / ${status} / ${JSON.stringify(data)}`);
  if (data) {
    console.log(
      `      ${JSON.stringify(Mapper.mapToStates(command, 1, data))}`,
    );
  }
});

dev.connect();

/**
 * @param err
 * @param status
 * @param data
 * @param command
 */
function logger(err, status, data, command) {
  console.log(`RESPONSE: ${command} / ${status} / ${JSON.stringify(data)}`);
  if (data) {
    console.log(
      `      ${JSON.stringify(Mapper.mapToStates(command, 5, data))}`,
    );

    const objs = Mapper.mapToObjects(command, 5, data);
    console.log(`      ${JSON.stringify(objs)}`);
    for (const obj in objs) {
      if (!objs.hasOwnProperty(obj)) {
        continue;
      }
      if (objs[obj].write === false) {
        continue;
      }
      console.log(
        `Remap Field ${obj} : ${JSON.stringify(
          Mapper.mapValueForWrite(obj, objs[obj].value, objs[obj].native),
        )}`,
      );
    }
  }
}
