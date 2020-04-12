const { ApolloServer, gql } = require('apollo-server-lambda')
const Airtable = require('airtable');

Airtable.configure({ apiKey: 'keydVeD210bV4LfwK' });

const base = Airtable.base('appUfMV0Mfw6l4Wqx');
const table = base('PeriodicTable');

const womp = (r) => {
  const rarr = rarr || [];
  if (r) {
    rarr.push(r);
  } else {
    return rarr.map((r) => r.fields);
  }
};
const getRecords = async () => {
  await table.select().eachPage((records, fetchNextPage) => {
    records.forEach((record) => {
      womp(record);
    });

    fetchNextPage();
  }, (err) => {
    if (err) {
      return err;
    }
  });
};

const records = async () => {
  await getRecords();
  return womp();
};

const typeDefs = gql`
  type Element {
    AtomicNumber: Int!
    Description: String
  }

  type Query {
    elements: [Element]
  }
`;
const resolvers = {
  Query: {
    elements: async () => {
      return await records();
    }
  }
};

const server = new ApolloServer({
  typeDefs,
  resolvers
});


exports.handler = server.createHandler({
  cors: {
    origin: true,
    methods: ['post', 'get', 'put', 'patch']
  }
});