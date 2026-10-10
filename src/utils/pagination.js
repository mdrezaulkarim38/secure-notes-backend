function getPagination(query) {
  let page = parseInt(query.page) || 1;
  let limit = parseInt(query.limit) || 10;
  if (page < 1) page = 1;
  if (limit < 1) limit = 10;
  if (limit > 100) limit = 100;
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}
module.exports = { getPagination };
