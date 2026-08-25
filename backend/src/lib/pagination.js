// Mimics Spring Data's Page<T> JSON shape, since the frontend has two
// different consumption patterns that both need to be satisfied at once:
// some admin tables read `content`/`totalElements` directly, while
// UserReservationsPage destructures `content`/`totalPages`/`pageable.pageNumber`.
const parsePageParams = (query, { defaultSize = 20, allowedSortFields = ["id"] } = {}) => {
  const page = Math.max(0, parseInt(query.page, 10) || 0);
  const size = Math.max(1, parseInt(query.size, 10) || defaultSize);
  const direction = String(query.direction || "ASC").toUpperCase() === "DESC" ? "desc" : "asc";
  const sortField = allowedSortFields.includes(query.sort) ? query.sort : allowedSortFields[0];

  return { page, size, direction, sortField };
};

const buildPageResponse = ({ content, totalElements, page, size, sortField }) => {
  const totalPages = size > 0 ? Math.ceil(totalElements / size) : 0;
  const sortMeta = { sorted: !!sortField, unsorted: !sortField, empty: !sortField };

  return {
    content,
    pageable: {
      pageNumber: page,
      pageSize: size,
      sort: sortMeta,
      offset: page * size,
      paged: true,
      unpaged: false,
    },
    totalElements,
    totalPages,
    last: page >= totalPages - 1,
    first: page === 0,
    size,
    number: page,
    numberOfElements: content.length,
    sort: sortMeta,
    empty: content.length === 0,
  };
};

module.exports = { parsePageParams, buildPageResponse };
