// const Airtable = require('airtable');

// Airtable.configure({ apiKey: 'keydVeD210bV4LfwK' });

// const base = Airtable.base('appUfMV0Mfw6l4Wqx');
// const table = base('PeriodicTable');

// exports.handler = function handler(event, context, callback) {
//   const allRecords = [];
//   table.select().eachPage((records, fetchNextPage) => {
//     records.forEach((record) => {
//       allRecords.push(record);
//     });

//     fetchNextPage();
//   }, (err) => {
//     if (err) {
//       callback(err);
//     } else {
//       const body = JSON.stringify({ records: allRecords });
//       const response = {
//         statusCode: 200,
//         body,
//         headers: {
//           'content-type': 'application/json',
//           'cache-control': 'Cache-Control: max-age=300, public'
//         }
//       };
//       callback(null, response);
//     }
//   });
// };
