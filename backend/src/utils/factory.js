function getFactoryId(req) {
  const factoryId = req.admin?.factoryId;
  if (!factoryId) {
    throw new Error('Factory context missing from session');
  }
  return factoryId;
}

module.exports = { getFactoryId };
