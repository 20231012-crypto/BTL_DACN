// Run a JSON mutation through one transaction and send its result after COMMIT.
export function transactionJson(store, handler) {
  return async (req, res) => {
    let status = 200;
    let payload;
    const response = {
      status(code) {
        status = code;
        return response;
      },
      json(body) {
        payload = body;
        return response;
      },
    };
    await store.transaction(() => handler(req, response));
    return res.status(status).json(payload);
  };
}
